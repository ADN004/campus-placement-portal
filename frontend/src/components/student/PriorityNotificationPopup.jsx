import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell } from 'lucide-react';
import { studentAPI } from '../../services/api';
import PromptShell from './PromptShell';

/**
 * The popup a High or Urgent notification gets.
 *
 * Officers have always been able to mark a notification High or Urgent, and the
 * compose screen has always told them it would "show as a popup alert when
 * students login". It never did: `priority` was written to the notifications
 * table and read by nothing on the student side, so High behaved exactly like
 * Normal and Urgent's only real effect was the email. This is the popup that
 * claim was describing.
 *
 * No new endpoint. `/students/notifications` already selects `n.*`, so priority
 * and is_read arrive with every notification; the unread High and Urgent ones
 * are simply picked out of what the student was going to fetch anyway.
 *
 * One at a time, newest first. "Got it" marks that one read and moves to the
 * next; closing without acknowledging leaves it unread, so it comes back — that
 * is the whole point of marking something urgent, and the footnote says so
 * rather than leaving the student to work it out.
 */

const PRIORITY = {
  urgent: {
    tone: 'bad',
    icon: AlertCircle,
    eyebrow: 'Urgent — from your placement cell',
  },
  high: {
    tone: 'teal',
    icon: Bell,
    eyebrow: 'Important — from your placement cell',
  },
};

export default function PriorityNotificationPopup({ suppressed = false }) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await studentAPI.getNotifications();
        const all = response.data.data || [];
        const pending = all.filter(
          (n) => !n.is_read && (n.priority === 'urgent' || n.priority === 'high')
        );
        // Urgent ahead of High; within a priority the endpoint already orders
        // newest first, and Array.prototype.sort is stable, so that holds.
        pending.sort((a, b) => {
          if (a.priority === b.priority) return 0;
          return a.priority === 'urgent' ? -1 : 1;
        });
        if (!cancelled) setQueue(pending);
      } catch {
        // A failed fetch just means no popup. The notifications page is still
        // there, and nothing else on the dashboard depends on this.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue[index];

  const handleAcknowledge = useCallback(async () => {
    if (!current || working) return;
    setWorking(true);
    try {
      await studentAPI.markNotificationRead(current.id);
    } catch {
      // Marking it read is best-effort: if the call fails the notification
      // simply stays unread and shows again, which is the safe direction.
    }
    setWorking(false);
    setIndex((i) => i + 1);
  }, [current, working]);

  const handleClose = () => setDismissed(true);

  const handleSeeAll = () => {
    setDismissed(true);
    navigate('/student/notifications');
  };

  if (suppressed || dismissed || !current) return null;

  const remaining = queue.length - index - 1;
  const skin = PRIORITY[current.priority] || PRIORITY.high;

  return (
    <PromptShell
      onClose={handleClose}
      labelledBy="priority-notification-title"
      title={current.title}
      eyebrow={skin.eyebrow}
      icon={skin.icon}
      tone={skin.tone}
      primary={{
        label: remaining > 0 ? `Got it (${remaining} more)` : 'Got it',
        onClick: handleAcknowledge,
        disabled: working,
      }}
      secondary={{ label: 'See all notifications', onClick: handleSeeAll }}
      footNote="Closing without acknowledging keeps this unread, so it will show again."
    >
      <p className="text-spc-sm text-spc-body leading-relaxed whitespace-pre-wrap break-words">
        {current.message}
      </p>
      {current.created_at && (
        <p className="text-spc-xs text-spc-muted mt-4">
          Sent {new Date(current.created_at).toLocaleString('en-IN')}
        </p>
      )}
    </PromptShell>
  );
}

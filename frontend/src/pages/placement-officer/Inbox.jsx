import { useState, useEffect, useCallback } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import InboxPage from './inbox/InboxPage';
import { Panel, Bar } from '../../components/officer/OfficerUI';

/**
 * Inbox — container.
 *
 * Owns the state and the API calls; InboxPage draws it. Read state is updated
 * locally as well as on the server so pressing "mark read" does not require a
 * round trip before the dot disappears — the list is short and the server is
 * the authority on the next load.
 */

function InboxSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-6 w-40" />
      </div>
      <Panel>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3 border-b border-spc-line last:border-b-0 space-y-2">
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-24" />
          </div>
        ))}
      </Panel>
    </div>
  );
}

export default function Inbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const deviceType = useDeviceType();
  const showSkeleton = useSkeletonLoading(loading);

  const fetchInbox = useCallback(async () => {
    try {
      const response = await placementOfficerAPI.getInbox();
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to load inbox:', error);
      toast.error('Could not load your notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleMarkRead = async (id) => {
    // Moved locally first, then confirmed. If the call fails the item goes back
    // to unread rather than being left looking read when the server disagrees.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await placementOfficerAPI.markInboxRead(id);
    } catch (error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
      toast.error('Could not mark that as read');
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const before = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await placementOfficerAPI.markInboxAllRead();
    } catch (error) {
      setNotifications(before);
      toast.error('Could not mark them all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  if (showSkeleton) return <InboxSkeleton />;

  return (
    <InboxPage
      layout={deviceType}
      notifications={notifications}
      unreadCount={notifications.filter((n) => !n.is_read).length}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      markingAll={markingAll}
    />
  );
}

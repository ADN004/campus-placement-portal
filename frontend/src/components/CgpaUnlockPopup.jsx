import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import { GraduationCap, Clock } from 'lucide-react';
import PromptShell from './student/PromptShell';

export default function CgpaUnlockPopup() {
  const [show, setShow] = useState(false);
  const [unlockEnd, setUnlockEnd] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    checkUnlockStatus();
  }, []);

  useEffect(() => {
    if (!unlockEnd) return;
    const update = () => {
      const now = new Date();
      const end = new Date(unlockEnd);
      const diff = end - now;
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${hours}h remaining`);
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${mins}m remaining`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [unlockEnd]);

  const checkUnlockStatus = async () => {
    try {
      const response = await studentAPI.getCgpaLockStatus();
      const data = response.data.data;
      if (!data.is_locked && data.unlock_window_id) {
        const dismissKey = `cgpa_unlock_seen_${data.unlock_window_id}`;
        if (!localStorage.getItem(dismissKey)) {
          setUnlockEnd(data.unlock_end);
          setShow(true);
        }
      }
    } catch {
      // Silently fail - not critical
    }
  };

  const handleDismiss = () => {
    // Find the unlock window ID from the API response and mark as seen
    studentAPI.getCgpaLockStatus().then(res => {
      const data = res.data.data;
      if (data.unlock_window_id) {
        localStorage.setItem(`cgpa_unlock_seen_${data.unlock_window_id}`, 'true');
      }
    }).catch(() => {});
    setShow(false);
  };

  if (!show) return null;

  return (
    <PromptShell
      onClose={handleDismiss}
      labelledBy="cgpa-unlock-title"
      title="Your CGPA is open for editing"
      eyebrow="For a limited time"
      icon={GraduationCap}
      primary={{ label: 'Got it', onClick: handleDismiss }}
    >
      <p className="text-spc-sm text-spc-body leading-relaxed">
        Your semester CGPA fields are unlocked. If any of your grades need
        correcting, update them on your Profile now.
      </p>

      <div className="mt-4 flex items-center gap-2.5 rounded-spc bg-spc-warn-bg border border-spc-warn/25 px-3.5 py-3">
        <Clock size={17} className="text-spc-warn flex-shrink-0" />
        <span className="text-spc-sm font-bold text-spc-warn">{timeRemaining}</span>
      </div>

      <p className="text-spc-xs text-spc-muted mt-3">
        The fields lock again once the window closes.
      </p>
    </PromptShell>
  );
}

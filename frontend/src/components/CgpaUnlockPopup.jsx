import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import { GraduationCap, X, Clock } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-sm w-full overflow-hidden">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-white" size={18} />
            <span className="text-white font-bold text-sm">CGPA Update Notice</span>
          </div>
          <button onClick={handleDismiss} className="text-white/80 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-gray-800 font-semibold text-sm leading-relaxed">
            Your semester CGPA fields are now open for editing. Update your grades in your Profile if needed.
          </p>

          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Clock size={16} className="text-amber-600 flex-shrink-0" />
            <span className="text-amber-800 text-xs font-bold">{timeRemaining}</span>
          </div>

          <p className="text-gray-500 text-xs mt-3">
            Fields will be locked again after the window closes.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

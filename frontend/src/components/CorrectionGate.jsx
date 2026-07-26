import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Modal from './Modal';

/**
 * Blocking gate for students with an outstanding "send back for correction".
 *
 * While a correction is open, the student is locked out of every page EXCEPT
 * their Profile (where the fix — including a required photo re-upload — is
 * done). This makes it impossible to keep using the portal without completing
 * it. Fails open: if the status can't be read, nothing is blocked.
 */
export default function CorrectionGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [correction, setCorrection] = useState(null);

  const onProfile = location.pathname.startsWith('/student/profile');

  useEffect(() => {
    let active = true;
    studentAPI
      .getCorrectionStatus()
      .then((res) => { if (active) setCorrection(res.data?.data || null); })
      .catch(() => { if (active) setCorrection(null); }); // fail open
    return () => { active = false; };
  }, [location.pathname]);

  // Nothing to block, or they're already on the page where they fix it
  if (!correction?.correction_requested || onProfile) return null;

  return (
    <Modal
      labelledBy="correction-gate-title"
      closeOnEscape={false}
      overlayClassName="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-t-8 border-red-600 overflow-hidden"
    >
        <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
          <AlertTriangle className="text-white shrink-0" size={28} />
          <h2 id="correction-gate-title" className="text-xl font-bold text-white">Action required before you can continue</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-3">
            Your placement officer has asked you to correct something. You need to fix it before you
            can use the rest of the portal.
          </p>
          {correction.correction_note && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 font-medium mb-2">
              {correction.correction_note}
            </div>
          )}
          {correction.correction_photo_required && (
            <p className="text-sm font-bold text-red-700 mb-2">
              Your photo was removed — you must upload a new one on your Profile page.
            </p>
          )}
          <button
            onClick={() => navigate('/student/profile')}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Go to my Profile to fix this
            <ArrowRight size={18} />
          </button>
        </div>
    </Modal>
  );
}

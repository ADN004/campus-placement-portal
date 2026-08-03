import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { AlertTriangle, Camera } from 'lucide-react';
import PromptShell from './student/PromptShell';

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
    <PromptShell
      labelledBy="correction-gate-title"
      title="Something needs fixing first"
      eyebrow="From your placement officer"
      icon={AlertTriangle}
      tone="bad"
      dismissible={false}
      primary={{ label: 'Go to my Profile and fix it', onClick: () => navigate('/student/profile') }}
    >
      <p className="text-spc-sm text-spc-body leading-relaxed">
        Your placement officer has asked you to correct something in your
        details. The rest of the portal stays closed until it&apos;s done.
      </p>

      {correction.correction_note && (
        <blockquote className="mt-4 rounded-spc bg-spc-bad-bg border-l-4 border-spc-bad px-4 py-3">
          <p className="text-spc-label font-bold uppercase text-spc-bad mb-1">What they said</p>
          <p className="text-spc-sm font-semibold text-spc-ink">{correction.correction_note}</p>
        </blockquote>
      )}

      {correction.correction_photo_required && (
        <div className="mt-3 flex items-start gap-2.5 rounded-spc bg-spc-warn-bg border border-spc-warn/25 px-3.5 py-3">
          <Camera size={17} className="text-spc-warn flex-shrink-0 mt-0.5" />
          <p className="text-spc-sm font-semibold text-spc-warn">
            Your photo was removed — upload a new one on your Profile page.
          </p>
        </div>
      )}
    </PromptShell>
  );
}

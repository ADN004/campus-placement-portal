import { useNavigate } from 'react-router-dom';
import { Check, UserSquare } from 'lucide-react';
import PromptShell from './student/PromptShell';

const BENEFITS = [
  'Apply to jobs that ask for extra details',
  'Get matched with better openings',
  'Stand out to recruiters',
  'Improve your shortlisting chances',
];

export default function ExtendedProfilePromptModal({ onClose, profileCompletion }) {
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    navigate('/student/extended-profile');
    onClose();
  };

  const pct = Math.max(0, Math.min(100, Number(profileCompletion) || 0));

  return (
    <PromptShell
      onClose={onClose}
      labelledBy="extended-profile-prompt-title"
      title="Finish your extended profile"
      eyebrow="A few minutes now saves you later"
      icon={UserSquare}
      closeOnBackdrop
      primary={{ label: 'Complete it now', onClick: handleGoToProfile }}
      secondary={{ label: 'Not now', onClick: onClose }}
      footNote="You can finish it any time from Extended Profile in the menu."
    >
      <div className="rounded-spc bg-spc-surface-2 border border-spc-line p-4">
        <div className="flex items-end justify-between gap-3 mb-2.5">
          <span className="text-spc-label font-bold uppercase text-spc-muted">Filled in so far</span>
          <span className="text-spc-h1 font-extrabold text-spc-teal leading-none">{pct}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full bg-spc-line overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Extended profile completion"
        >
          <div
            className="h-full rounded-full bg-spc-teal transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-spc-ok-bg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={12} className="text-spc-ok" strokeWidth={3} />
            </span>
            <span className="text-spc-sm text-spc-body">{benefit}</span>
          </li>
        ))}
      </ul>
    </PromptShell>
  );
}

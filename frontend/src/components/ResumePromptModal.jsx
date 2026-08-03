import { useNavigate } from 'react-router-dom';
import { Check, FileText } from 'lucide-react';
import PromptShell from './student/PromptShell';

const BENEFITS = [
  'Your resume is ready the moment you apply',
  'Show your skills, projects and experience',
  'Officers and admins can download it',
  'Look prepared next to everyone else',
];

export default function ResumePromptModal({ onClose }) {
  const navigate = useNavigate();

  const handleGoToResume = () => {
    navigate('/student/resume');
    onClose();
  };

  return (
    <PromptShell
      onClose={onClose}
      labelledBy="resume-prompt-title"
      title="Build your resume"
      eyebrow="It takes one sitting"
      icon={FileText}
      closeOnBackdrop
      primary={{ label: 'Build it now', onClick: handleGoToResume }}
      secondary={{ label: 'Not now', onClick: onClose }}
      footNote="You can build it any time from My Resume in the menu."
    >
      <ul className="space-y-2.5">
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

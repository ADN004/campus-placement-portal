import { Linkedin } from 'lucide-react';
import { SUPPORT_LINKEDIN_URL } from '../constants/support';

/**
 * A way to reach a person when the portal cannot reach the student.
 *
 * Verification links and password resets both go by email, and a student who
 * is not receiving email has no other route — officers cannot reset a student's
 * password, only the forgot-password mail can. Without something like this,
 * being locked out is the end of the road rather than the start of a
 * conversation.
 *
 * The wording is passed in rather than fixed, because the reason for reaching
 * out differs by screen: on the login page it is "can't get in", on the
 * verification banner it is "the mail never came". A single generic "contact
 * support" would tell a student nothing about whether it applies to them.
 *
 * `variant` picks the palette instead of the caller restyling it. The sign-in
 * screens are on plain Tailwind and the in-app student screens are on the
 * design-system tokens; one hard-coded set of colours would be wrong on one of
 * them. `as` chooses between a quiet line of text and something that reads as a
 * button, which is what the verification banner needs to sit beside its
 * existing two.
 */
export default function SupportContact({
  message = 'Trouble signing in or not receiving our emails?',
  cta = 'Message me on LinkedIn',
  variant = 'auth',
  as = 'text',
  className = '',
}) {
  const student = variant === 'student';

  if (as === 'button') {
    return (
      <a
        href={SUPPORT_LINKEDIN_URL}
        target="_blank"
        // noreferrer alongside noopener: the tab must not be able to reach back
        // into this one, and the referrer is nobody else's business.
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5
          text-spc-sm font-bold rounded-spc-sm transition-colors
          ${student
            ? 'bg-spc-surface text-spc-ink border border-spc-line-strong hover:bg-spc-surface-2'
            : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'}
          ${className}`}
      >
        <Linkedin size={16} aria-hidden="true" />
        <span>{cta}</span>
      </a>
    );
  }

  return (
    <p className={`text-xs leading-relaxed ${student ? 'text-spc-muted' : 'text-gray-500'} ${className}`}>
      {message}{' '}
      <a
        href={SUPPORT_LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-bold underline underline-offset-2 inline-flex items-center gap-1
          ${student ? 'text-spc-accent' : 'text-blue-600 hover:text-blue-800'}`}
      >
        <Linkedin size={13} aria-hidden="true" />
        {cta}
      </a>
    </p>
  );
}

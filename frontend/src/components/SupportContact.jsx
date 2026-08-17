import { Linkedin } from 'lucide-react';
import { SUPPORT_LINKEDIN_URL } from '../constants/support';

/**
 * A way to reach a person when the portal cannot reach the student.
 *
 * Verification links and password resets both go by email, and a student who is
 * not receiving email has no other route — officers cannot reset a student's
 * password, only the forgot-password mail can. Without something like this,
 * being locked out is the end of the road rather than the start of a
 * conversation.
 *
 * The wording is passed in rather than fixed, because the reason for reaching
 * out differs by screen: on the sign-in page it is "can't get in", on the
 * verification banner it is "the mail never came". A single generic "contact
 * support" would tell a student nothing about whether it applies to them.
 *
 * `as` chooses between a quiet line of text and a button. Where this is the
 * student's last resort it should look like something to press, not like small
 * print they can skim past.
 *
 * `variant` picks the palette rather than the caller restyling it, because the
 * three places it appears are on genuinely different grounds: a dark landing
 * page, a white sign-in card, and the in-app student screens on the design
 * system's tokens. One hard-coded set of colours would be wrong on two of them.
 */

const BUTTON_STYLES = {
  // In-app student screens: the design system's surface and border tokens.
  student: 'bg-spc-surface text-spc-ink border border-spc-line-strong hover:bg-spc-surface-2',
  // The white sign-in card: quiet enough not to compete with "Login".
  auth: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
  // The dark landing page, where a solid white button would shout. Matches the
  // translucent cards already on that background.
  dark: 'bg-white/[0.06] text-slate-200 border border-white/[0.12] hover:bg-white/[0.1] hover:text-white',
};

const TEXT_STYLES = {
  student: { body: 'text-spc-muted', link: 'text-spc-accent' },
  auth: { body: 'text-gray-500', link: 'text-blue-600 hover:text-blue-800' },
  dark: { body: 'text-slate-500', link: 'text-indigo-300 hover:text-indigo-200' },
};

export default function SupportContact({
  message = 'Trouble signing in or not receiving our emails?',
  cta = 'Message me on LinkedIn',
  variant = 'auth',
  as = 'text',
  className = '',
}) {
  const common = {
    href: SUPPORT_LINKEDIN_URL,
    target: '_blank',
    // noreferrer alongside noopener: the new tab must not be able to reach back
    // into this one, and the referrer is nobody else's business.
    rel: 'noopener noreferrer',
  };

  if (as === 'button') {
    return (
      <div className={className}>
        {message && (
          <p className={`text-xs mb-2 ${TEXT_STYLES[variant].body}`}>{message}</p>
        )}
        <a
          {...common}
          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5
            text-sm font-semibold rounded-xl transition-colors ${BUTTON_STYLES[variant]}`}
        >
          <Linkedin size={16} aria-hidden="true" />
          <span>{cta}</span>
        </a>
      </div>
    );
  }

  return (
    <p className={`text-xs leading-relaxed ${TEXT_STYLES[variant].body} ${className}`}>
      {message}{' '}
      <a
        {...common}
        className={`font-bold underline underline-offset-2 inline-flex items-center gap-1
          ${TEXT_STYLES[variant].link}`}
      >
        <Linkedin size={13} aria-hidden="true" />
        {cta}
      </a>
    </p>
  );
}

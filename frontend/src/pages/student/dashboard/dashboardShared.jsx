import { CheckCircle, XCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Pieces shared by the three StudentDashboard presenters.
 *
 * Everything here is presentation only. The data these render — profile rows,
 * status values, dates — is passed down unchanged from the container.
 */

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ------------------------------------------------- email verification box */

/**
 * "Last sent 3:45 pm", or with the date if it wasn't today. Returns null when
 * the timestamp is missing or unparseable, so the caller can omit the line.
 */
function formatSentAt(iso) {
  if (!iso) return null;
  const sent = new Date(iso);
  if (Number.isNaN(sent.getTime())) return null;
  const time = sent.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const isToday = sent.toDateString() === new Date().toDateString();
  return isToday ? `Last sent ${time}` : `Last sent ${formatDate(iso)}, ${time}`;
}

/**
 * The email-verification notice, shared by all three presenters so the wording
 * can never drift between devices. Only the button layout differs by variant.
 *
 * `last_verification_email_sent_at` and `verification_emails_remaining_today`
 * already come back from GET /students/verification-status — the UI just wasn't
 * showing them. Surfacing the send time matters because it tells a student the
 * mail definitely left our side, which points them at the real cause: a full
 * mailbox silently rejects new mail, and that is invisible from in here.
 */
export function VerificationNotice({
  email,
  verificationStatus,
  resending,
  onResend,
  onUpdateEmail,
  variant = 'mobile',
}) {
  const sentAt = formatSentAt(verificationStatus?.last_verification_email_sent_at);
  const remaining = verificationStatus?.verification_emails_remaining_today;
  const atCap = verificationStatus && !verificationStatus.can_resend;

  const pad = variant === 'desktop' ? 'p-6' : variant === 'tablet' ? 'p-5' : 'p-4';
  const titleSize = variant === 'desktop' ? 'text-spc-h1' : variant === 'tablet' ? 'text-spc-h2' : 'text-spc-h3';
  const bodySize = variant === 'mobile' ? 'text-spc-xs' : 'text-spc-sm';
  const buttons =
    variant === 'mobile' ? 'flex-col' : 'flex-row flex-wrap items-center';
  const buttonWidth = variant === 'mobile' ? 'w-full' : '';

  return (
    <div className={`rounded-spc bg-spc-warn-bg ${pad}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="text-spc-warn flex-shrink-0 mt-0.5" size={variant === 'mobile' ? 20 : 23} />
        <div className="min-w-0 flex-1">
          <h2 className={`${titleSize} font-bold text-spc-ink`}>Verify your email address</h2>
          <p className={`${bodySize} text-spc-body mt-1`}>
            We&apos;ve sent a verification link to{' '}
            <span className="font-bold break-all">{email}</span>.
          </p>

          {(sentAt || typeof remaining === 'number') && (
            <p className="text-xs text-spc-muted font-semibold mt-1.5">
              {sentAt}
              {sentAt && typeof remaining === 'number' && ' · '}
              {typeof remaining === 'number' && `${remaining} of 5 sends left today`}
            </p>
          )}
        </div>
      </div>

      <div className={`flex gap-2.5 mt-4 ${buttons}`}>
        <button
          onClick={onResend}
          disabled={resending || !verificationStatus?.can_resend}
          className={`${buttonWidth} min-h-[48px] rounded-spc-sm bg-spc-teal text-spc-on-teal
            text-spc-sm font-bold px-5 hover:opacity-95 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {resending ? 'Sending…' : 'Resend verification email'}
        </button>
        <button
          onClick={onUpdateEmail}
          className={`${buttonWidth} min-h-[48px] rounded-spc-sm bg-spc-surface text-spc-ink
            border border-spc-line-strong text-spc-sm font-bold px-5
            hover:bg-spc-surface-2 transition-colors`}
        >
          Update email address
        </button>
      </div>

      {atCap && (
        <p className="text-xs text-spc-body mt-3 bg-spc-surface/70 rounded-spc-sm p-2.5">
          Maximum verification emails sent for today (
          {verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
        </p>
      )}

      {/* The actual troubleshooting. Ordered by how often each one is the
          cause, and every line ends in something the student can do. */}
      <div className="mt-4 pt-4 border-t border-spc-warn/20">
        <p className="text-spc-label font-bold uppercase text-spc-warn">Not arriving?</p>
        <ul className="mt-2 space-y-1.5 text-xs text-spc-body">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-spc-warn font-bold">·</span>
            <span>Check your spam or junk folder — it often lands there first.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-spc-warn font-bold">·</span>
            <span>
              <span className="font-bold">Is your mailbox full?</span> A mailbox that is out of
              storage rejects new mail silently, so nothing arrives and no warning is shown. Free up
              space and resend, or switch to a different address.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-spc-warn font-bold">·</span>
            <span>Wrong address? Update it above and we&apos;ll send a fresh link.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ status */

const STATUS_META = {
  pending: { label: 'Pending', Icon: Clock, classes: 'bg-spc-warn-bg text-spc-warn' },
  shortlisted: { label: 'Shortlisted', Icon: CheckCircle, classes: 'bg-spc-ok-bg text-spc-ok' },
  rejected: { label: 'Rejected', Icon: XCircle, classes: 'bg-spc-bad-bg text-spc-bad' },
};

/**
 * Status chip. `size="md"` is for the desktop table row, `size="sm"` for cards.
 * Colour comes from the semantic tokens, each measured against its own tint:
 * pending 5.57:1, shortlisted 6.49:1, rejected 6.11:1.
 */
export function StatusPill({ status, size = 'sm' }) {
  const dims =
    size === 'md'
      ? 'text-spc-xs px-3 py-1.5 gap-1.5'
      : 'text-xs px-2.5 py-1.5 gap-1.5';
  const meta = STATUS_META[status];

  if (!meta) {
    return (
      <span className={`inline-flex items-center rounded-spc-sm font-bold bg-spc-surface-2 text-spc-body ${dims}`}>
        {status}
      </span>
    );
  }

  const { label, Icon, classes } = meta;
  return (
    <span className={`inline-flex items-center rounded-spc-sm font-bold ${classes} ${dims}`}>
      <Icon size={size === 'md' ? 15 : 13} />
      <span>{label}</span>
    </span>
  );
}

/* ----------------------------------------------------------------- profile */

// Profile rows in one place, so the mobile list, the tablet panel and the
// desktop grid can never drift apart.
export function buildProfileRows(profile) {
  return [
    { label: 'PRN', value: profile.prn },
    { label: 'Email', value: profile.email, verified: profile.email_verified },
    { label: 'Mobile', value: profile.mobile_number },
    { label: 'College', value: profile.college_name },
    { label: 'Region', value: profile.region_name },
    { label: 'Branch', value: profile.branch },
    {
      label: 'Programme CGPA',
      value: profile.programme_cgpa,
      highlight: profile.programme_cgpa >= 7 ? 'green' : 'red',
    },
    {
      label: 'Backlogs',
      value: profile.backlog_count || 0,
      highlight: profile.backlog_count > 0 ? 'red' : 'green',
    },
    {
      label: 'Status',
      value: profile.is_blacklisted
        ? 'Blacklisted'
        : profile.registration_status === 'approved'
        ? 'Active'
        : profile.registration_status,
      highlight: profile.is_blacklisted
        ? 'red'
        : profile.registration_status === 'approved'
        ? 'green'
        : 'yellow',
    },
  ];
}

export const HIGHLIGHT_TEXT = {
  green: 'text-spc-ok font-bold',
  red: 'text-spc-bad font-bold',
  yellow: 'text-spc-warn font-bold',
};

export function VerifiedChip({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 bg-spc-ok-bg text-spc-ok text-xs font-bold px-2 py-0.5 rounded-full">
      <CheckCircle size={12} />
      <span>Verified</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-spc-bad-bg text-spc-bad text-xs font-bold px-2 py-0.5 rounded-full">
      <XCircle size={12} />
      <span>Not verified</span>
    </span>
  );
}

/* ------------------------------------------------------------------- stats */

/**
 * The one stat tile that carries the teal fill. Programme CGPA is the only
 * card the container builds without a `link`, so keying off that keeps the
 * choice correct even if the order of the array changes.
 */
export function isFeaturedStat(stat) {
  return !stat.link;
}

/* -------------------------------------------------------------- primitives */

/** Section heading with an optional "View all" link. */
export function SectionTitle({ title, to, linkLabel = 'View all', size = 'md' }) {
  const heading = size === 'lg' ? 'text-spc-h1-lg' : 'text-spc-h1';
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <h2 className={`${heading} font-extrabold text-spc-ink`}>{title}</h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-0.5 text-spc-xs font-bold text-spc-teal
            min-h-[44px] px-1 -mr-1 hover:underline underline-offset-4"
        >
          <span>{linkLabel}</span>
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

/** Small uppercase label — the 12px floor, never smaller. */
export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`text-spc-label font-bold uppercase text-spc-muted ${className}`}>
      {children}
    </p>
  );
}

/** The three facts on a job card: location, package, deadline. */
export function JobFacts({ job, className = '' }) {
  if (!job.location && !job.salary_package && !job.application_deadline) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {job.location && <Fact>{job.location}</Fact>}
      {job.salary_package && <Fact strong>{job.salary_package} LPA</Fact>}
      {job.application_deadline && <Fact>{formatDate(job.application_deadline)}</Fact>}
    </div>
  );
}

function Fact({ children, strong }) {
  return (
    <span
      className={`inline-flex items-center rounded-spc-sm px-2.5 py-1.5 text-xs font-semibold
        ${strong ? 'bg-spc-teal-soft text-spc-teal' : 'bg-spc-surface-2 text-spc-body'}`}
    >
      {children}
    </span>
  );
}

/** Eligibility / applied chips on a job card. */
export function JobBadges({ job }) {
  return (
    <div className="flex flex-wrap gap-2">
      {job.has_applied && (
        <span className="inline-flex items-center rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1">
          Applied
        </span>
      )}
      {job.is_eligible ? (
        <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-xs font-bold px-2.5 py-1">
          <CheckCircle size={12} />
          <span>Eligible</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-warn-bg text-spc-warn text-xs font-bold px-2.5 py-1">
          <XCircle size={12} />
          <span>Check eligibility</span>
        </span>
      )}
    </div>
  );
}

import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
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

import { CheckCircle, XCircle, Clock } from 'lucide-react';

/**
 * Pieces shared by the three StudentDashboard presenters.
 *
 * `fadeUp`, `formatDate` and `getStatusBadge` are moved here verbatim from the
 * original StudentDashboard.jsx so the desktop presenter renders byte-identical
 * output. `STATUS_META` / `StatusPill` are new and used only by the mobile and
 * tablet layouts, where the desktop badge is too large for a card.
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

export function getStatusBadge(status) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-lg border border-yellow-200">
          <Clock size={16} />
          <span>Pending</span>
        </span>
      );
    case 'shortlisted':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg border border-green-200">
          <CheckCircle size={16} />
          <span>Shortlisted</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-red-100 text-red-800 text-sm font-bold px-4 py-2 rounded-lg border border-red-200">
          <XCircle size={16} />
          <span>Rejected</span>
        </span>
      );
    default:
      return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-4 py-2 rounded-lg border border-gray-200">{status}</span>;
  }
}

// Same labels and colours as getStatusBadge, sized for a card instead of a
// table cell. Mobile/tablet only.
const STATUS_META = {
  pending: { label: 'Pending', Icon: Clock, classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  shortlisted: { label: 'Shortlisted', Icon: CheckCircle, classes: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', Icon: XCircle, classes: 'bg-red-100 text-red-800 border-red-200' },
};

export function StatusPill({ status }) {
  const meta = STATUS_META[status];

  if (!meta) {
    return (
      <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-gray-200">
        {status}
      </span>
    );
  }

  const { label, Icon, classes } = meta;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${classes}`}>
      <Icon size={13} />
      <span>{label}</span>
    </span>
  );
}

// Profile rows, in the same order as the desktop profile grid. Shared by the
// mobile list and the tablet side panel so the two can never drift apart.
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
  green: 'text-green-600 font-bold',
  red: 'text-red-600 font-bold',
  yellow: 'text-yellow-600 font-bold',
};

export function VerifiedChip({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-green-300">
      <CheckCircle size={11} />
      <span>Verified</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-300">
      <XCircle size={11} />
      <span>Not Verified</span>
    </span>
  );
}

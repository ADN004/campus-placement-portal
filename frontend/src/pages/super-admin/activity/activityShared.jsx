/**
 * How an activity log reads.
 *
 * Two vocabularies the page has to speak: the action that happened, and who did
 * it. Both arrived as `badge badge-*` classes from the legacy sheet; here they
 * are one of the three status colours or plain ink, on Console's rule that
 * colour means something and nothing else gets to be coloured.
 */

/**
 * Actions worth colouring, and nothing else.
 *
 * Something being *created* or *approved* is green, something *deleted*,
 * *rejected* or *blacklisted* is red, something *changed* is amber. A login is
 * neither — it is the most common row in the table and colouring it would drown
 * the ones that matter.
 */
const ACTION_TONE = {
  STUDENT_APPROVED: 'ok',
  STUDENT_WHITELISTED: 'ok',
  JOB_CREATED: 'ok',
  JOB_APPROVED: 'ok',
  PRN_RANGE_ADDED: 'ok',
  OFFICER_CREATED: 'ok',
  WHITELIST_REQUEST_APPROVED: 'ok',
  ACTIVATE_SUPER_ADMIN: 'ok',
  CREATE_SUPER_ADMIN: 'ok',

  STUDENT_REJECTED: 'bad',
  STUDENT_BLACKLISTED: 'bad',
  JOB_REJECTED: 'bad',
  JOB_DELETED: 'bad',
  PRN_RANGE_DELETED: 'bad',
  WHITELIST_REQUEST_REJECTED: 'bad',
  DELETE_SUPER_ADMIN: 'bad',

  JOB_UPDATED: 'warn',
  OFFICER_UPDATED: 'warn',
  PASSWORD_CHANGED: 'warn',
  DEACTIVATE_SUPER_ADMIN: 'warn',
};

export function ActionMark({ actionType }) {
  const tone = ACTION_TONE[actionType];
  const colour = tone === 'ok' ? 'text-spc-ok'
    : tone === 'bad' ? 'text-spc-bad'
      : tone === 'warn' ? 'text-spc-warn' : 'text-spc-ink';
  return (
    <span className={`text-spc-xs font-semibold ${colour}`}>
      {actionType?.replace(/_/g, ' ') || '—'}
    </span>
  );
}

/**
 * The role, in words.
 *
 * It arrives as either `super_admin` or `Super Admin` depending on where the row
 * was written, so both are handled — the original did the same and it is not
 * cosmetic: half the rows would otherwise print an underscore.
 */
export function RoleMark({ role }) {
  if (!role) return <span className="text-spc-xs text-spc-body">—</span>;
  const display = String(role)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return <span className="text-spc-xs text-spc-body">{display}</span>;
}

/** A log entry is a moment, down to the second. */
export function formatMoment(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Metadata comes as an object, as JSON text, or as something else entirely. */
export function readableMetadata(metadata) {
  try {
    if (typeof metadata === 'string') {
      try {
        return JSON.stringify(JSON.parse(metadata), null, 2);
      } catch {
        return metadata;
      }
    }
    if (typeof metadata === 'object') return JSON.stringify(metadata, null, 2);
    return String(metadata);
  } catch {
    return 'Unable to display metadata';
  }
}

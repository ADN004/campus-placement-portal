import { normalizeApplicationStatus, APPLICATION_STATUS_LABELS } from './applicationStatus';

/**
 * Format a status for display.
 *
 * Application statuses come from the shared vocabulary, so 'submitted' -- the
 * retired spelling of under_review, still legal in the database for rollback
 * safety -- reads as the state it actually is rather than as a fifth one. The
 * registration statuses below it are a different vocabulary that happens to
 * share this formatter, and are left exactly as they were.
 */
export const formatStatus = (status) => {
  if (!status) return '';

  const normalized = normalizeApplicationStatus(status);
  if (APPLICATION_STATUS_LABELS[normalized]) {
    return APPLICATION_STATUS_LABELS[normalized];
  }

  const statusMap = {
    'pending': 'Pending',
    'approved': 'Approved',
  };

  return statusMap[status] || status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

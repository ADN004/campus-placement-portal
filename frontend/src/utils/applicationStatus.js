/**
 * What an application's status means, in one place, for all three roles.
 *
 * There were four statuses and five names for them. 'submitted' and
 * 'under_review' were one state written two ways -- an application arrived as
 * the first and only ever became the second because an officer pressed a button
 * that told the student nothing they did not already know. Migration 020 moved
 * every row onto 'under_review' and stopped anything writing the old spelling,
 * but the value stays legal in the database so that rolling back to an older
 * image cannot fail every insert. So every reader has to treat the two as one,
 * and that is what normalizeApplicationStatus is for.
 *
 * `status_source` is the other half. 'rejected' used to mean three unrelated
 * things -- an officer said no, the student never met the criteria, or the round
 * moved past them -- and a student cannot act sensibly on a word that vague.
 * The source is what separates them.
 */

/** The four states an application can actually be in. */
export const APPLICATION_STATUSES = [
  'under_review',
  'shortlisted',
  'selected',
  'rejected',
];

/** Retired spellings, mapped to the state they really are. */
const ALIASES = { submitted: 'under_review' };

export const normalizeApplicationStatus = (status) =>
  ALIASES[status] || status || 'under_review';

export const APPLICATION_STATUS_LABELS = {
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  selected: 'Selected',
  rejected: 'Rejected',
};

export const applicationStatusLabel = (status) =>
  APPLICATION_STATUS_LABELS[normalizeApplicationStatus(status)] ||
  String(status || '').replace(/_/g, ' ');

/**
 * Why an application holds the status it holds.
 *
 * Only shown where it changes what the reader should do. A student who was
 * never eligible needs to fix their profile; one the round moved past has
 * nothing to fix, and telling them the same word for both is how somebody
 * spends a week chasing a problem that was never theirs.
 */
export const STATUS_SOURCE_LABELS = {
  student_apply: 'You applied',
  eligibility_fail: 'Did not meet the criteria',
  officer: 'Decided by the placement cell',
  manual_addition: 'Added by the placement cell',
  system_cascade: 'Round closed',
  reverted: 'Corrected by the placement cell',
};

/**
 * The sentence a student reads under a rejected application. Only the two that
 * are genuinely different get their own; everything else falls through to the
 * ordinary wording.
 */
export const REJECTION_EXPLANATIONS = {
  eligibility_fail:
    'Your profile did not meet this job’s criteria when you applied.',
  system_cascade:
    'This round has closed and you were not shortlisted to go forward.',
};

export default {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  STATUS_SOURCE_LABELS,
  REJECTION_EXPLANATIONS,
  normalizeApplicationStatus,
  applicationStatusLabel,
};

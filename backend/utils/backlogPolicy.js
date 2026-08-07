/**
 * How a student's backlog total is computed, in one place.
 *
 * The authoritative figure is the sum of the six per-semester columns. That is
 * what job eligibility uses to decide whether a student may apply
 * (enhancedApplicationController builds the same total and compares it against
 * a job's max_backlogs), and it is what the officer's student table displays.
 *
 * The `students.backlog_count` column is a VARCHAR holding things like '0' or
 * '3'. The student filters used to query it instead, in three different and
 * all-wrong ways:
 *
 *   - `backlog_count = 'All cleared'` for the zero case. Nothing in the
 *     codebase ever writes that string, so "0 backlogs" matched no one — on a
 *     dev copy that was 0 rows returned where 8,416 students qualified.
 *   - `backlog_count = $1` for every other value, behind a control labelled
 *     "Maximum Backlogs". An exact match, so asking for at most 2 hid everyone
 *     with 0 or 1.
 *   - `backlog_count <= $1` with a numeric parameter against a VARCHAR column,
 *     which is either a type error or a string comparison where '10' <= '5'.
 *
 * Using the semester sum everywhere makes the filter, the number on screen and
 * the eligibility rule agree. Keep every call site on this constant so the four
 * of them cannot drift apart again.
 */
export const TOTAL_BACKLOGS_SQL = `(
  COALESCE(s.backlogs_sem1, 0) + COALESCE(s.backlogs_sem2, 0) +
  COALESCE(s.backlogs_sem3, 0) + COALESCE(s.backlogs_sem4, 0) +
  COALESCE(s.backlogs_sem5, 0) + COALESCE(s.backlogs_sem6, 0)
)`;

/**
 * Parse a "maximum backlogs" filter value.
 * Returns null when the filter is absent or not a usable number, so the caller
 * can skip the clause rather than build one around NaN.
 */
export function parseMaxBacklogs(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? null : n;
}

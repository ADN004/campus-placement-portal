/**
 * The order every list of students is read in, on this side of the wire.
 *
 * The mirror of `backend/utils/studentOrder.js`. The server already returns
 * rosters in this order; the pages that filter in the browser re-sort what is
 * left, and if the two rules differ the same list comes out one way on load and
 * another after a filter is touched.
 *
 * The rule: **branch, then PRN ascending** — college first on super-admin
 * lists, which span sixty of them.
 *
 * Branch is compared on letters and digits alone, so "Bio-Medical Engineering"
 * and "Biomedical Engineering" are one group rather than two. This is the same
 * comparison the branch filters and exports already use.
 *
 * Lateral entrants need no rule of their own: a PRN carries its admission year
 * at the front, so someone who joined a year later has a higher number and
 * lands after the regular intake of their branch on ascending order alone.
 *
 * PRN compares by length first, so numbers compare as numbers even if the
 * format ever varies. With today's fixed-width PRNs it changes nothing.
 */
const normalizeBranch = (value) =>
  String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

export function compareStudents(a, b, { byCollege = false } = {}) {
  if (byCollege) {
    const college = String(a.college_name || '').localeCompare(String(b.college_name || ''));
    if (college !== 0) return college;
  }

  const branch = normalizeBranch(a.branch).localeCompare(normalizeBranch(b.branch));
  if (branch !== 0) return branch;

  const left = String(a.prn || '');
  const right = String(b.prn || '');
  if (left.length !== right.length) return left.length - right.length;
  return left.localeCompare(right);
}

/** Sorts a copy, so a filtered array can be ordered without disturbing state. */
export const sortStudents = (students, options) =>
  [...(students || [])].sort((a, b) => compareStudents(a, b, options));

/**
 * Comparing branch names that are written inconsistently.
 *
 * The same branch reaches us as "Computer Engineering", "computer engineering"
 * and "Electronics & Communication" against "Electronics and Communication",
 * depending on who typed it and when. Every comparison has to go through this
 * or the same branch fails to match itself.
 *
 * It lived as a private copy in studentController and again in
 * enhancedApplicationController. A third copy was about to be added for the
 * check that decides whether editing a job's branch list removes anyone — and
 * that one has to agree with the eligibility check exactly, because a
 * normalisation that drifted apart would let a real removal through while both
 * halves looked correct on their own.
 */

export const normalizeBranch = (b) => {
  if (!b) return '';
  // '&' becomes the word first, so "Electrical & Electronics" and "Electrical
  // and Electronics" agree before anything is stripped.
  const spelled = String(b).toLowerCase().replace(/&/g, 'and');
  // Then every separator goes: hyphens, dots, brackets, spaces. A student
  // registered as "Bio-Medical Engineering" was being refused a job open to
  // "Biomedical Engineering", told their branch "is not in the allowed list"
  // while that list was displayed right underneath containing it. Comparing on
  // letters and digits alone makes the two the same branch, which they are.
  return spelled.replace(/[^a-z0-9]+/g, '');
};

/**
 * The same rule as a SQL expression, for the one place that filters in the
 * database rather than in JavaScript.
 *
 * Kept beside its twin so the two cannot drift: a student found eligible by one
 * and not the other is the sort of disagreement nobody would think to look for.
 */
export const NORMALIZED_BRANCH_SQL = (column) =>
  `regexp_replace(replace(lower(${column}), '&', 'and'), '[^a-z0-9]', '', 'g')`;

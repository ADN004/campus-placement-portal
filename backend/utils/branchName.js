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

export const normalizeBranch = (b) =>
  b?.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim() || '';

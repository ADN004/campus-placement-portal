/**
 * When are two branch names the same branch?
 *
 * The mirror of `backend/utils/branchName.js`, and it has to stay the mirror.
 * That rule is what decides whether a student is found: eligibility, the branch
 * filters and every export compare on letters and digits alone, with `&` read
 * as "and". So "Civil-Engineering", "Civil Engineering" and "civil engineering"
 * are one branch there, and anything the browser considers different but the
 * database considers the same lets a duplicate through.
 *
 * This is not academic. Two spellings of one branch on production made **1,556
 * students invisible to branch filters**: a job posted for "Civil Engineering"
 * simply never reached anyone recorded as "Civil-Engineering". No error, no
 * warning — the students just never saw it.
 *
 * The matching was fixed everywhere afterwards. This is the other half: the
 * places where a second spelling can be created in the first place.
 */

/** The comparison key: letters and digits only, `&` spelled out. */
export function normalizeBranch(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * The entry in `list` that is the same branch as `name`, or null.
 *
 * Returns the existing spelling rather than a boolean, so the caller can show
 * it — "this college already has Civil-Engineering" is useful; "duplicate" is
 * not.
 */
export function findSameBranch(list, name) {
  const key = normalizeBranch(name);
  if (!key) return null;
  return (list || []).find((item) => normalizeBranch(item) === key) || null;
}

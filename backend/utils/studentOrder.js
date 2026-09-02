import { NORMALIZED_BRANCH_SQL } from './branchName.js';

/**
 * The order every list of students is read in.
 *
 * One rule, in one place, because a roster that is sorted differently on the
 * screen, in the PDF and in the spreadsheet is three documents nobody can check
 * against each other. Lists used to come back in whatever order the rows were
 * created — registration order on the student pages, application order on the
 * exports — which is to say the order people happened to act in.
 *
 * The rule: **branch, then PRN ascending.**
 *
 * Branch is compared on letters and digits alone, the same way the filters and
 * exports already compare it, so "Bio-Medical Engineering" and "Biomedical
 * Engineering" are one group rather than two separated by everything in
 * between. The displayed spelling still varies — that is a data problem — but
 * the students sit together.
 *
 * Lateral-entry students need no rule of their own. A PRN carries its admission
 * year at the front, so a student who joined a year later has a higher number
 * and ascending order already places them after the regular intake of their
 * branch. 2301150399 then 2401150351, and the next branch starts after that.
 *
 * PRN is sorted by length first so that numbers compare as numbers even if the
 * format ever varies. With today's fixed-width PRNs this changes nothing; with
 * a shorter one it stops "999" sorting after "1000".
 *
 * @param {object}  options
 * @param {string}  options.student  alias of the students table
 * @param {?string} options.college  alias of the colleges table; when given,
 *   college is the outer grouping — a super-admin list spans 60 of them and a
 *   college's students have to stay together to be read or handed over.
 * @param {?string} options.region   alias of the regions table, outside college.
 */
export const studentOrderSql = ({ student = 's', college = null, region = null } = {}) => {
  const parts = [];
  if (region) parts.push(`${region}.region_name ASC`);
  if (college) parts.push(`${college}.college_name ASC`);
  parts.push(`${NORMALIZED_BRANCH_SQL(`${student}.branch`)} ASC`);
  parts.push(`LENGTH(${student}.prn) ASC`, `${student}.prn ASC`);
  return parts.join(', ');
};

/** The same rule for rows already in hand — exports that sort in JavaScript. */
export const compareStudents = (a, b, { college = false } = {}) => {
  const norm = (v) => String(v || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
  if (college) {
    const byCollege = String(a.college_name || '').localeCompare(String(b.college_name || ''));
    if (byCollege !== 0) return byCollege;
  }
  const byBranch = norm(a.branch).localeCompare(norm(b.branch));
  if (byBranch !== 0) return byBranch;
  const pa = String(a.prn || '');
  const pb = String(b.prn || '');
  if (pa.length !== pb.length) return pa.length - pb.length;
  return pa.localeCompare(pb);
};

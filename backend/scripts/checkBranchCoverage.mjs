#!/usr/bin/env node
/**
 * Does every branch a job can be offered to actually exist at a college?
 *
 * The job form ticks from a constant. Students register from their own
 * college's list. Nothing has ever held the two together, and a name in the
 * constant that no college uses is not a harmless spare option -- it is a
 * plausible one. An officer ticks it, it matches nobody, and no screen
 * anywhere says so.
 *
 * That is not hypothetical. "Computer Science and Engineering" sat in the list
 * and at no college: Kerala polytechnics call the subject "Computer
 * Engineering". On job 25 -- Pie Infotech, "Associate Software Developer (For
 * CS)" -- an officer ticked it instead of Computer Engineering and 1,851
 * computer students could not apply to a drive that had asked for them by
 * name. The job looked correctly configured from every angle.
 *
 * So this compares the two lists against a live database and reports both
 * directions:
 *
 *   - in the constant, offered by no college  -> a trap, like the above
 *   - offered by a college, not in the constant -> those students cannot be
 *     targeted by any job at all
 *
 * Needs a database, which is why it lives here rather than in the repo's
 * scripts/ directory with the static checkers. Only backend/ and database/ are
 * copied into the image, so a checker at the repo root cannot be run against
 * production at all -- which is exactly where this one has to run.
 *
 *   docker compose -f docker-compose.hub.yml exec backend  *     node scripts/checkBranchCoverage.mjs
 *
 * Or locally:  node backend/scripts/checkBranchCoverage.mjs
 */

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

import { query, closePool } from '../config/database.js';
import { KERALA_POLYTECHNIC_BRANCHES } from '../constants/branches.js';
import { normalizeBranch } from '../utils/branchName.js';

let problems = 0;

try {
  const offeredRows = await query(`
    SELECT DISTINCT jsonb_array_elements_text(branches::jsonb) AS name
      FROM colleges
     WHERE branches IS NOT NULL AND is_active = TRUE`);

  const studentRows = await query(`
    SELECT branch, COUNT(*)::int AS n
      FROM students
     WHERE branch IS NOT NULL AND branch <> ''
     GROUP BY branch`);

  // Normalised both sides: the same branch is written "Electrical &
  // Electronics" at seventeen colleges and "Electrical and Electronics" in the
  // constant, and those are one branch, not two.
  const offered = new Map();
  offeredRows.rows.forEach((r) => offered.set(normalizeBranch(r.name), r.name));

  const students = new Map();
  studentRows.rows.forEach((r) => {
    const k = normalizeBranch(r.branch);
    students.set(k, (students.get(k) || 0) + r.n);
  });

  const inConstant = new Map(
    KERALA_POLYTECHNIC_BRANCHES.map((b) => [normalizeBranch(b), b])
  );

  /* --------------------------- traps: offerable, but matching nobody */

  const traps = [...inConstant].filter(([k]) => !offered.has(k));
  if (traps.length) {
    problems += traps.length;
    console.log(`${RED}FAIL${OFF} ${traps.length} branch(es) can be ticked on a job and exist at no college`);
    console.log(`${DIM}       an officer picks one, it matches nobody, and nothing says so${OFF}`);
    traps.forEach(([k, label]) =>
      console.log(`       ${label}   ${DIM}(${students.get(k) || 0} students)${OFF}`));
  }

  /* ------------------ unreachable: real students no job can target */

  const unreachable = [...offered].filter(([k]) => !inConstant.has(k));
  if (unreachable.length) {
    problems += unreachable.length;
    console.log(`${RED}FAIL${OFF} ${unreachable.length} branch(es) offered by a college are missing from the job form`);
    console.log(`${DIM}       no job can target these students at all${OFF}`);
    unreachable.forEach(([k, label]) =>
      console.log(`       ${label}   ${DIM}(${students.get(k) || 0} students)${OFF}`));
  }

  /* ------------------------------ offered, but nobody registered yet */

  const empty = [...inConstant].filter(([k]) => offered.has(k) && !students.get(k));
  if (empty.length) {
    console.log('');
    console.log(`${YELLOW}note${OFF} ${empty.length} branch(es) a college offers with nobody registered yet`);
    console.log(`${DIM}       not a fault -- a new branch, or one nobody has joined${OFF}`);
    empty.forEach(([, label]) => console.log(`${DIM}       ${label}${OFF}`));
  }

  if (problems === 0) {
    console.log(
      `${GREEN} ok ${OFF} every offerable branch exists at a college, and every college branch is offerable`
      + `  ${DIM}(${inConstant.size} in the list, ${offered.size} offered)${OFF}`
    );
  }
} catch (error) {
  console.error('Could not check branch coverage:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}

if (problems > 0) process.exitCode = 1;

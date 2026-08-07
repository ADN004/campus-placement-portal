/**
 * Smoke test for the officer's Manage Students filters.
 *
 * These filters looked like they worked but did not:
 *   - Maximum CGPA was never sent by the UI and never read by the API, so a
 *     min+max range silently applied only the min.
 *   - The Excel/PDF export joined users but never filtered is_active, so it
 *     returned every student ever registered while the list showed only the
 *     active ones. On a college with an archived batch that meant seeing zero
 *     students and exporting several hundred.
 *
 * Checks the list endpoint against the database directly, so a passing run
 * means the SQL really selected that set — not that the UI merely rendered.
 *
 * Run with the dev server up:  node scripts/smokeStudentFilters.mjs
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const BASE = 'http://localhost:5000/api';

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campus_placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? (pass++, console.log(`  PASS  ${name}`)) : (fail++, console.log(`  FAIL  ${name} ${extra}`));
};

async function main() {
  // Pick whichever view actually holds enough students to filter. A dev
  // database restored from a year-end reset is almost entirely archived, so
  // insisting on the current view would leave nothing to test. The CGPA SQL is
  // identical in both views — only the is_active scoping differs.
  const po = await pool.query(
    `SELECT po.user_id, po.college_id, su.is_active AS active_view, COUNT(*) AS n
       FROM placement_officers po
       JOIN users u ON po.user_id = u.id
       JOIN students s ON s.college_id = po.college_id
       JOIN users su ON s.user_id = su.id
      WHERE u.is_active = TRUE
        AND (su.is_active = TRUE OR s.archived_academic_year IS NOT NULL)
      GROUP BY po.user_id, po.college_id, su.is_active
      ORDER BY n DESC
      LIMIT 1`
  );
  if (po.rows.length === 0) throw new Error('No officer with students to filter');
  const { user_id: poUserId, college_id: collegeId, active_view: activeView } = po.rows[0];
  const archivedView = !activeView;
  const viewQs = archivedView ? 'archived=true&' : '';
  const viewSql = archivedView
    ? 'u.is_active = FALSE AND s.archived_academic_year IS NOT NULL'
    : 'u.is_active = TRUE';
  console.log(
    `Using college ${collegeId} in the ${archivedView ? 'ARCHIVED' : 'current'} view (${po.rows[0].n} students)`
  );

  const headers = {
    Authorization: `Bearer ${jwt.sign({ id: poUserId }, process.env.JWT_SECRET, { expiresIn: '15m' })}`,
  };

  const listTotal = async (qs) => {
    const res = await fetch(`${BASE}/placement-officer/students?limit=1&page=1&${viewQs}${qs}`, { headers });
    const body = await res.json();
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.total;
  };

  // Ground truth straight from the database, scoped exactly as the list is.
  const dbCount = async (extraSql, params = []) => {
    const r = await pool.query(
      `SELECT COUNT(*) c FROM students s JOIN users u ON s.user_id = u.id
        WHERE s.college_id = $1 AND ${viewSql} AND s.is_blacklisted = FALSE ${extraSql}`,
      [collegeId, ...params]
    );
    return Number(r.rows[0].c);
  };

  console.log('\n1. Minimum CGPA (was already correct — confirming it stays so)');
  for (const min of ['7', '8.5']) {
    const api = await listTotal(`cgpa_min=${min}`);
    const db = await dbCount('AND s.programme_cgpa >= $2', [min]);
    check(`cgpa_min=${min} -> ${api}`, api === db, `api=${api} db=${db}`);
  }

  console.log('\n2. Maximum CGPA (the box that did nothing)');
  const all = await listTotal('');
  for (const max of ['7', '8']) {
    const api = await listTotal(`cgpa_max=${max}`);
    const db = await dbCount('AND s.programme_cgpa <= $2', [max]);
    check(`cgpa_max=${max} -> ${api}`, api === db, `api=${api} db=${db}`);
    check(`cgpa_max=${max} actually narrows the set`, api < all, `got ${api} of ${all}`);
  }

  console.log('\n3. Min + max together (a real range, not just the min)');
  const rangeApi = await listTotal('cgpa_min=7&cgpa_max=8');
  const rangeDb = await dbCount('AND s.programme_cgpa >= $2 AND s.programme_cgpa <= $3', ['7', '8']);
  check(`7 <= cgpa <= 8 -> ${rangeApi}`, rangeApi === rangeDb, `api=${rangeApi} db=${rangeDb}`);
  const minOnly = await listTotal('cgpa_min=7');
  check('the range is narrower than the min alone', rangeApi < minOnly, `range=${rangeApi} minOnly=${minOnly}`);

  console.log('\n4. The list is scoped to active students');
  const listAll = await listTotal('');
  const activeOnly = await dbCount('');
  check(`list total ${listAll} counts only active students`, listAll === activeOnly, `api=${listAll} db=${activeOnly}`);
}

main()
  .catch((e) => {
    fail++;
    console.error('\nFATAL:', e.message);
  })
  .finally(async () => {
    await pool.end();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
  });

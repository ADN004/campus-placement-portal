/**
 * Smoke test: (A) the PRN enable/disable toggle now actually gates
 * registration, and (B) the archived (passed-out) students view.
 *
 * A: create a range → PRN validates; disable the range → PRN refused;
 *    re-enable → PRN validates again.
 * B: borrow an active approved student, mark them archived (deactivated +
 *    year-stamped) exactly as the year-end reset would, then confirm they
 *    appear in the archived view (and archived-years) but NOT the default
 *    active list — restored in finally.
 *
 * Run with the dev server up:  node scripts/smokeArchiveAndToggle.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
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

const TEST_YEAR = '2099-00';
const R_START = '877777000000', R_END = '877777000010', R_PRN = '877777000005';

const main = async () => {
  const admin = (
    await pool.query(`SELECT id, email, password_hash FROM users WHERE role='super_admin' AND is_active=TRUE LIMIT 1`)
  ).rows[0];

  // An active, approved, non-blacklisted student to temporarily archive
  const student = (
    await pool.query(
      `SELECT s.id, s.prn, s.user_id, s.archived_academic_year, u.is_active
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE u.is_active = TRUE AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE
       ORDER BY s.id LIMIT 1`
    )
  ).rows[0];

  if (!admin || !student) {
    console.error('Need a super admin AND an active approved student. Aborting.');
    await pool.end();
    process.exit(1);
  }

  const adminPass = 'smoke-arch-admin';
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(adminPass, 10), admin.id]);

  let rangeId = null;
  try {
    const token = (await (await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: adminPass }),
    })).json()).token;
    check('super admin logged in', !!token);
    const sa = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const validate = async (prn) => (await (await fetch(`${BASE}/common/validate-prn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn }),
    })).json());

    // ---------- A: enable/disable toggle gates registration ----------
    let res = await sa('/super-admin/prn-ranges', 'POST', { range_start: R_START, range_end: R_END, year: '2099' });
    rangeId = (await res.json())?.data?.id || null;
    check('range created', !!rangeId);

    check('enabled range → PRN valid', (await validate(R_PRN)).valid === true);

    res = await sa(`/super-admin/prn-ranges/${rangeId}`, 'PUT', { is_enabled: false, disabled_reason: 'smoke' });
    check('disable range → 200', res.status === 200);
    check('disabled range → PRN refused', (await validate(R_PRN)).valid === false);

    res = await sa(`/super-admin/prn-ranges/${rangeId}`, 'PUT', { is_enabled: true });
    check('re-enable range → 200', res.status === 200);
    check('re-enabled range → PRN valid again', (await validate(R_PRN)).valid === true);

    // ---------- B: archived students view ----------
    // Mark the borrowed student as archived, exactly like the year-end reset.
    await pool.query('UPDATE students SET archived_academic_year=$1 WHERE id=$2', [TEST_YEAR, student.id]);
    await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [student.user_id]);

    // archived view (search by PRN so pagination can't hide them)
    res = await sa(`/super-admin/students?archived=true&academic_year=${TEST_YEAR}&search=${student.prn}`, 'GET');
    let body = await res.json();
    check('archived view includes the archived student', (body.data || []).some((s) => s.prn === student.prn), JSON.stringify(body.data?.map(s=>s.prn)));

    // default (active) view must NOT include them
    res = await sa(`/super-admin/students?search=${student.prn}`, 'GET');
    body = await res.json();
    check('default view excludes the archived student', !(body.data || []).some((s) => s.prn === student.prn));

    // archived-years lists the batch
    res = await sa('/super-admin/archived-years', 'GET');
    body = await res.json();
    check('archived-years includes the batch', (body.data || []).includes(TEST_YEAR), JSON.stringify(body.data));

    // wrong-year archived filter excludes them
    res = await sa(`/super-admin/students?archived=true&academic_year=1990-91&search=${student.prn}`, 'GET');
    body = await res.json();
    check('wrong batch year excludes the student', !(body.data || []).some((s) => s.prn === student.prn));
  } finally {
    // restore the borrowed student and admin, drop the temp range
    await pool.query('UPDATE users SET is_active=$1 WHERE id=$2', [student.is_active, student.user_id]);
    await pool.query('UPDATE students SET archived_academic_year=$1 WHERE id=$2', [student.archived_academic_year, student.id]);
    if (rangeId) await pool.query('DELETE FROM prn_ranges WHERE id=$1', [rangeId]);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [admin.password_hash, admin.id]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

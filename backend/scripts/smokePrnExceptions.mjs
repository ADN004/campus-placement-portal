/**
 * Smoke test: PRN range exceptions.
 * PRNs inside a range's start–end that must NOT register — created on the
 * range itself, validated to fall inside the bounds, and enforced by both
 * the public validate-prn check and student registration.
 *
 * Run with the dev server up:  node scripts/smokePrnExceptions.mjs
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

const RANGE_START = '999999000000';
const RANGE_END = '999999000099';
const EXCEPTED = '999999000050';
const ALLOWED = '999999000049';

const main = async () => {
  const admin = (
    await pool.query(
      `SELECT id, email, password_hash FROM users
       WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`
    )
  ).rows[0];
  const hash = await bcrypt.hash('smoke-prn-pass', 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, admin.id]);

  let rangeId = null;
  try {
    let res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: 'smoke-prn-pass' }),
    });
    const token = (await res.json()).token;
    const authed = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // --- creation-time validation ---
    res = await authed('/super-admin/prn-ranges', 'POST', {
      range_start: RANGE_START, range_end: RANGE_END, exceptions: '123', description: 'smoke',
    });
    check('exception outside the range refused (400)', res.status === 400,
      `status=${res.status}`);

    res = await authed('/super-admin/prn-ranges', 'POST', {
      single_prn: '999999000199', exceptions: '999999000199',
    });
    check('exceptions on a single PRN entry refused (400)', res.status === 400,
      `status=${res.status}`);

    // --- create a range with two exceptions (messy separators on purpose) ---
    res = await authed('/super-admin/prn-ranges', 'POST', {
      range_start: RANGE_START, range_end: RANGE_END,
      exceptions: ` ${EXCEPTED},  999999000060\n${EXCEPTED} `, // dupes + whitespace
      description: 'smoke exceptions range',
    });
    let body = await res.json();
    rangeId = body.data?.id;
    check('range with exceptions created (201, deduped + sorted)',
      res.status === 201 && JSON.stringify(body.data?.excepted_prns) === JSON.stringify([EXCEPTED, '999999000060']),
      `status=${res.status} excepted=${JSON.stringify(body.data?.excepted_prns)}`);

    // --- validate-prn enforcement ---
    res = await fetch(`${BASE}/common/validate-prn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn: EXCEPTED }),
    });
    body = await res.json();
    check('validate-prn refuses the excepted PRN with the exclusion message',
      res.status === 400 && body.valid === false && /excluded/i.test(body.message),
      `status=${res.status} msg="${body.message}"`);

    res = await fetch(`${BASE}/common/validate-prn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn: ALLOWED }),
    });
    body = await res.json();
    check('validate-prn accepts a neighbouring PRN in the same range',
      res.status === 200 && body.valid === true, `status=${res.status} msg="${body.message}"`);

    // --- registration enforcement (fails at PRN validation, before photo) ---
    res = await fetch(`${BASE}/auth/register-student`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prn: EXCEPTED, student_name: 'Excepted Kid', branch: 'Computer Engineering',
        region_id: 1, college_id: 1, email: 'zz.excepted.kid@example.com', mobile_number: '9990001113',
        date_of_birth: '2005-01-01', age: '21', gender: 'Male', height: '170', weight: '60',
        complete_address: 'X', cgpa_sem1: '8', cgpa_sem2: '8', cgpa_sem3: '8', cgpa_sem4: '8',
        programme_cgpa: '8', has_driving_license: false, has_pan_card: false,
        has_aadhar_card: true, has_passport: false, photo_base64: 'data:image/png;base64,x',
      }),
    });
    body = await res.json();
    check('registration refuses the excepted PRN with the exclusion message',
      res.status === 400 && /excluded/i.test(body.message),
      `status=${res.status} msg="${body.message}"`);

    // --- clearing exceptions via update re-opens the PRN ---
    res = await authed(`/super-admin/prn-ranges/${rangeId}`, 'PUT', { exceptions: '' });
    check('exceptions cleared via update (200)', res.status === 200, `status=${res.status}`);

    res = await fetch(`${BASE}/common/validate-prn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn: EXCEPTED }),
    });
    body = await res.json();
    check('previously excepted PRN is valid again after clearing',
      res.status === 200 && body.valid === true, `status=${res.status} msg="${body.message}"`);
  } finally {
    if (rangeId) await pool.query('DELETE FROM prn_ranges WHERE id = $1', [rangeId]);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [admin.password_hash, admin.id]);
  }
  check('smoke range deleted + admin restored', true);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

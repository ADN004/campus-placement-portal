/**
 * Smoke test: per-college registration / PRN-range locks.
 *
 * The super admin can freeze (a) new student registration and (b) a college's
 * placement officer from adding/editing PRN ranges. This exercises both locks
 * end to end: SA lock/unlock endpoints, the PO add-range 403, the public
 * getColleges registration_locked flag, and the registerStudent 403 — then
 * proves unlock restores everything.
 *
 * Borrows the SA + one PO account (bcrypt-swaps their password, restores in
 * finally) and always clears the test college's locks so it never leaves a
 * real college frozen.
 *
 * Run with the dev server up:  node scripts/smokeCollegeLocks.mjs
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

const login = async (identifier, password) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identifier, password }),
  });
  const body = await res.json();
  return body?.token || null;
};

const main = async () => {
  // Make sure the table exists even on a not-yet-migrated local DB
  await pool.query(`
    CREATE TABLE IF NOT EXISTS college_locks (
      id SERIAL PRIMARY KEY,
      college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
      lock_type VARCHAR(30) NOT NULL CHECK (lock_type IN ('registration', 'prn_ranges')),
      locked_by INTEGER NOT NULL REFERENCES users(id),
      reason TEXT,
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (college_id, lock_type)
    );
  `);

  const admin = (
    await pool.query(`SELECT id, email, password_hash FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`)
  ).rows[0];

  // A PO with a college — that college is our test subject
  const po = (
    await pool.query(
      `SELECT u.id AS user_id, u.email, u.password_hash, po.college_id
       FROM placement_officers po JOIN users u ON po.user_id = u.id
       WHERE po.is_active = TRUE AND po.college_id IS NOT NULL
       ORDER BY po.id LIMIT 1`
    )
  ).rows[0];

  if (!admin || !po) {
    console.error('Need an active super admin AND an active placement officer with a college. Aborting.');
    await pool.end();
    process.exit(1);
  }

  const collegeId = po.college_id;
  const college = (
    await pool.query('SELECT id, college_name, region_id FROM colleges WHERE id = $1', [collegeId])
  ).rows[0];

  const adminPass = 'smoke-lock-admin';
  const poPass = 'smoke-lock-po';
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(adminPass, 10), admin.id]);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(poPass, 10), po.user_id]);

  let saRangeId = null;
  try {
    // Clean slate for the test college
    await pool.query('DELETE FROM college_locks WHERE college_id = $1', [collegeId]);

    const adminToken = await login(admin.email, adminPass);
    check('super admin logged in', !!adminToken);
    const sa = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: body ? JSON.stringify(body) : undefined,
    });

    // --- baseline: college unlocked ---
    let res = await sa('/super-admin/college-locks', 'GET');
    let body = await res.json();
    let row = body.data.find((c) => c.college_id === collegeId);
    check('locks listing includes test college', !!row);
    check('baseline: registration open', row?.registration.locked === false);
    check('baseline: prn_ranges open', row?.prn_ranges.locked === false);

    // --- lock prn_ranges ---
    res = await sa('/super-admin/college-locks', 'POST', { college_id: collegeId, lock_type: 'prn_ranges', reason: 'smoke' });
    check('lock prn_ranges → 200', res.status === 200);
    res = await sa('/super-admin/college-locks', 'GET');
    body = await res.json();
    row = body.data.find((c) => c.college_id === collegeId);
    check('prn_ranges now locked', row?.prn_ranges.locked === true);
    check('registration still open (independent locks)', row?.registration.locked === false);

    // --- PO blocked from adding a range ---
    const poToken = await login(po.email, poPass);
    check('placement officer logged in', !!poToken);
    const poReq = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${poToken}` },
      body: body ? JSON.stringify(body) : undefined,
    });

    res = await poReq('/placement-officer/prn-ranges', 'POST', { start_prn: '888888000000', end_prn: '888888000010', year: '2099' });
    body = await res.json();
    check('PO add range blocked → 403', res.status === 403, `got ${res.status}`);
    check('PO block message mentions lock', /locked by the Super Admin/i.test(body.message || ''), body.message);

    res = await poReq('/placement-officer/prn-ranges', 'GET');
    body = await res.json();
    check('PO getPRNRanges reports prn_ranges_locked', body.prn_ranges_locked === true);

    // --- lock registration ---
    res = await sa('/super-admin/college-locks', 'POST', { college_id: collegeId, lock_type: 'registration', reason: 'deadline passed' });
    check('lock registration → 200', res.status === 200);

    // public getColleges reflects the registration lock
    res = await fetch(`${BASE}/common/colleges?region_id=${college.region_id}`);
    body = await res.json();
    const pub = body.data.find((c) => c.id === collegeId);
    check('public getColleges: registration_locked = true', pub?.registration_locked === true);

    // registering for this college is refused (lock check runs before PRN validation)
    res = await fetch(`${BASE}/auth/register-student`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prn: '888888000005', student_name: 'Smoke Locked', branch: 'CS',
        region_id: college.region_id, college_id: collegeId,
        email: 'zz.smoke.locked@example.com', mobile_number: '9990001199',
        date_of_birth: '2004-01-01', age: 20, gender: 'male', height: 170, weight: 60,
        cgpa_sem1: 8, cgpa_sem2: 8, cgpa_sem3: 8, cgpa_sem4: 8, programme_cgpa: 8,
        complete_address: 'x', has_driving_license: false, has_pan_card: false,
        has_aadhar_card: true, has_passport: false, photo_base64: 'data:image/png;base64,x',
      }),
    });
    body = await res.json();
    check('register blocked when locked → 403', res.status === 403, `got ${res.status}`);
    check('register block message mentions contact PO', /placement officer/i.test(body.message || ''), body.message);

    // --- allow-list: a specific PRN may register despite the lock ---
    const ALLOWED = '888888000005';
    // create a global SA range so the allowed PRN is range-valid
    res = await sa('/super-admin/prn-ranges', 'POST', { range_start: '888888000000', range_end: '888888000010', year: '2099' });
    body = await res.json();
    saRangeId = body?.data?.id || null;
    check('temp SA range created', !!saRangeId, JSON.stringify(body));

    // while locked & not allowed → validate-prn refuses with lock signal
    const validate = (prn) => fetch(`${BASE}/common/validate-prn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn, college_id: collegeId }),
    });
    res = await validate(ALLOWED);
    body = await res.json();
    check('validate-prn: locked+not-allowed → valid false', body.valid === false && body.registration_locked === true, JSON.stringify(body));

    // add it to the allow-list
    res = await sa(`/super-admin/college-locks/${collegeId}/allowed-prns`, 'PUT', { allowed_prns: `${ALLOWED}` });
    check('set allowed PRNs → 200', res.status === 200);
    res = await sa('/super-admin/college-locks', 'GET');
    body = await res.json();
    let row2 = body.data.find((c) => c.college_id === collegeId);
    check('listing shows allowed_prns', (row2?.registration.allowed_prns || []).includes(ALLOWED));

    // now the allowed PRN validates true (bypasses the lock, still range-valid)
    res = await validate(ALLOWED);
    body = await res.json();
    check('validate-prn: allowed PRN → valid true', body.valid === true, JSON.stringify(body));

    // a different, non-allowed PRN in the same range is still blocked
    res = await validate('888888000006');
    body = await res.json();
    check('validate-prn: other PRN still blocked', body.valid === false && body.registration_locked === true);

    // clearing the allow-list re-blocks the PRN
    res = await sa(`/super-admin/college-locks/${collegeId}/allowed-prns`, 'PUT', { allowed_prns: '' });
    check('clear allowed PRNs → 200', res.status === 200);
    res = await validate(ALLOWED);
    body = await res.json();
    check('validate-prn: after clear → blocked again', body.valid === false);

    // allow-list on a non-locked college is rejected
    res = await sa('/super-admin/college-locks/999999/allowed-prns', 'PUT', { allowed_prns: '123' });
    check('allowed PRNs on non-locked college → 400', res.status === 400);

    // non-numeric allowed PRN rejected
    res = await sa(`/super-admin/college-locks/${collegeId}/allowed-prns`, 'PUT', { allowed_prns: 'abc' });
    check('non-numeric allowed PRN → 400', res.status === 400);

    // --- unlock both, verify restore ---
    res = await sa(`/super-admin/college-locks/${collegeId}/prn_ranges`, 'DELETE');
    check('unlock prn_ranges → 200', res.status === 200);
    res = await sa(`/super-admin/college-locks/${collegeId}/registration`, 'DELETE');
    check('unlock registration → 200', res.status === 200);

    res = await poReq('/placement-officer/prn-ranges', 'GET');
    body = await res.json();
    check('after unlock: prn_ranges_locked = false', body.prn_ranges_locked === false);

    res = await fetch(`${BASE}/common/colleges?region_id=${college.region_id}`);
    body = await res.json();
    const pub2 = body.data.find((c) => c.id === collegeId);
    check('after unlock: registration_locked = false', pub2?.registration_locked === false);

    // --- lock-all convenience ---
    res = await sa('/super-admin/college-locks', 'POST', { college_id: 'all', lock_type: 'registration', reason: 'bulk smoke' });
    body = await res.json();
    check('lock ALL registration → 200', res.status === 200 && body.locked_count >= 1);
    res = await sa('/super-admin/college-locks/all/registration', 'DELETE');
    body = await res.json();
    check('unlock ALL registration → 200', res.status === 200 && body.unlocked_count >= 1);

    // bad lock_type rejected
    res = await sa('/super-admin/college-locks', 'POST', { college_id: collegeId, lock_type: 'nonsense' });
    check('invalid lock_type → 400', res.status === 400);
  } finally {
    // NEVER leave the test college (or any) locked, and drop the temp range
    await pool.query('DELETE FROM college_locks WHERE college_id = $1', [collegeId]);
    await pool.query(`DELETE FROM college_locks WHERE reason IN ('bulk smoke')`);
    if (saRangeId) await pool.query('DELETE FROM prn_ranges WHERE id = $1', [saRangeId]);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [admin.password_hash, admin.id]);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [po.password_hash, po.user_id]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

/**
 * Smoke test: suspend / reactivate a placement officer.
 *
 * Suspension is reversible and deliberately different from Remove:
 *   - login is disabled and existing sessions are revoked immediately
 *   - placement_officers.is_active stays TRUE, so the officer keeps holding
 *     their college's seat — a replacement cannot be appointed until they are
 *     reactivated or removed
 *   - no placement_officer_history row is written (that is Remove's job)
 *
 * Everything it touches is restored in finally.
 *
 * Run with the dev server up:  node scripts/smokeOfficerSuspend.mjs
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

const main = async () => {
  const admin = (
    await pool.query(`SELECT id, email, password_hash FROM users WHERE role='super_admin' AND is_active=TRUE LIMIT 1`)
  ).rows[0];
  const officer = (
    await pool.query(
      `SELECT po.id, po.user_id, po.college_id, po.officer_name, po.is_active AS po_active,
              u.email, u.password_hash, u.is_active AS user_active, u.tokens_valid_from
       FROM placement_officers po JOIN users u ON po.user_id = u.id
       WHERE po.is_active = TRUE AND u.is_active = TRUE ORDER BY po.id LIMIT 1`
    )
  ).rows[0];

  if (!admin || !officer) {
    console.error('Need a super admin and one active placement officer. Aborting.');
    await pool.end();
    process.exit(1);
  }

  const adminPass = 'smoke-susp-admin';
  const officerPass = 'smoke-susp-officer';
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(adminPass, 10), admin.id]);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(officerPass, 10), officer.user_id]);

  const historyHighWater = (await pool.query('SELECT COALESCE(MAX(id),0) AS m FROM placement_officer_history')).rows[0].m;

  try {
    const login = async (email, password) =>
      (await (await fetch(`${BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })).json());

    const adminToken = (await login(admin.email, adminPass)).token;
    check('super admin logged in', !!adminToken);
    const sa = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: body ? JSON.stringify(body) : undefined,
    });

    // officer can sign in before suspension, and we keep that token
    const officerLogin = await login(officer.email, officerPass);
    const officerToken = officerLogin.token;
    check('officer can sign in before suspension', !!officerToken);

    // --- suspend ---
    let res = await sa(`/super-admin/placement-officers/${officer.id}/active`, 'PUT', { is_active: false, reason: 'smoke' });
    check('suspend → 200', res.status === 200, String(res.status));

    const afterSuspend = (
      await pool.query(
        `SELECT po.is_active AS po_active, u.is_active AS user_active, u.tokens_valid_from
         FROM placement_officers po JOIN users u ON po.user_id=u.id WHERE po.id=$1`, [officer.id]
      )
    ).rows[0];
    check('login disabled (users.is_active FALSE)', afterSuspend.user_active === false);
    check('SEAT HELD: officer row still active', afterSuspend.po_active === true);
    check('tokens revoked (tokens_valid_from set)', !!afterSuspend.tokens_valid_from);

    // the pre-suspension token must no longer work
    res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${officerToken}` } });
    check('existing session killed (old token rejected)', res.status === 401, `got ${res.status}`);

    // and they cannot sign in again
    const blocked = await login(officer.email, officerPass);
    check('suspended officer cannot log in', !blocked.token, JSON.stringify(blocked).slice(0, 120));

    // no history row written (that is Remove's job)
    const hist = (await pool.query('SELECT COUNT(*) n FROM placement_officer_history WHERE id > $1', [historyHighWater])).rows[0].n;
    check('no history row written for a suspension', Number(hist) === 0);

    // listing reports the third state
    res = await sa('/super-admin/placement-officers', 'GET');
    let body = await res.json();
    const row = body.data.find((o) => o.id === officer.id);
    check('listing shows officer_status = suspended', row?.officer_status === 'suspended', row?.officer_status);

    // --- the seat is genuinely held: appointing a replacement is refused ---
    res = await sa('/super-admin/placement-officers', 'POST', {
      college_id: officer.college_id, officer_name: 'Smoke Replacement', phone_number: '999999777',
    });
    body = await res.json();
    check('replacement refused while suspended → 409', res.status === 409, `got ${res.status}`);
    check('refusal explains reactivate-or-remove', /reactivate|remove/i.test(body.message || ''), body.message);

    // --- reactivate ---
    res = await sa(`/super-admin/placement-officers/${officer.id}/active`, 'PUT', { is_active: true });
    check('reactivate → 200', res.status === 200, String(res.status));

    const afterReactivate = (
      await pool.query('SELECT is_active FROM users WHERE id=$1', [officer.user_id])
    ).rows[0];
    check('login re-enabled', afterReactivate.is_active === true);

    const relogin = await login(officer.email, officerPass);
    check('officer can sign in again after reactivation', !!relogin.token);

    res = await sa('/super-admin/placement-officers', 'GET');
    body = await res.json();
    const row2 = body.data.find((o) => o.id === officer.id);
    check('listing back to officer_status = active', row2?.officer_status === 'active', row2?.officer_status);
  } finally {
    await pool.query(
      'UPDATE users SET is_active=$1, tokens_valid_from=$2, password_hash=$3 WHERE id=$4',
      [officer.user_active, officer.tokens_valid_from, officer.password_hash, officer.user_id]
    );
    await pool.query('UPDATE placement_officers SET is_active=$1 WHERE id=$2', [officer.po_active, officer.id]);
    await pool.query('DELETE FROM placement_officer_history WHERE id > $1', [historyHighWater]);
    await pool.query("DELETE FROM users WHERE email = '999999777'");
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

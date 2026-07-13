/**
 * Smoke test for the env-gated mode-switch testing tool.
 *
 * Run in two phases against a local dev server:
 *   node scripts/smokeModeSwitch.mjs disabled   (server started WITHOUT ENABLE_MODE_SWITCH)
 *   node scripts/smokeModeSwitch.mjs enabled    (server started WITH ENABLE_MODE_SWITCH=true)
 *
 * The enabled phase performs a full switch → restore round trip and verifies
 * the restored active-college set is identical to the original.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const phase = process.argv[2];
if (!['disabled', 'enabled'].includes(phase)) {
  console.error('Usage: node scripts/smokeModeSwitch.mjs <disabled|enabled>');
  process.exit(2);
}

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
  const adminRow = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1"
  );
  const token = jwt.sign({ id: adminRow.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const activeBefore = (
    await pool.query('SELECT id FROM colleges WHERE is_active = TRUE ORDER BY id')
  ).rows.map((r) => r.id);

  if (phase === 'disabled') {
    let res = await fetch(`${BASE}/super-admin/portal-settings`, { headers: auth });
    let body = await res.json();
    check('portal-settings reports tool unavailable', body.data.mode_switch_available === false,
      JSON.stringify(body.data));

    res = await fetch(`${BASE}/super-admin/mode-switch/single`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ keep_college_id: activeBefore[0], confirm_code: 'ANYTHING' }),
    });
    check('switch endpoint REFUSED without env var (403)', res.status === 403, `status=${res.status}`);

    res = await fetch(`${BASE}/super-admin/mode-switch/restore`, { method: 'POST', headers: auth });
    check('restore endpoint REFUSED without env var (403)', res.status === 403, `status=${res.status}`);
  }

  if (phase === 'enabled') {
    const keep = (
      await pool.query(
        `SELECT c.id, c.college_code FROM colleges c
         JOIN placement_officers po ON po.college_id = c.id AND po.is_active = TRUE
         WHERE c.is_active = TRUE LIMIT 1`
      )
    ).rows[0];

    let res = await fetch(`${BASE}/super-admin/portal-settings`, { headers: auth });
    let body = await res.json();
    check('portal-settings reports tool available', body.data.mode_switch_available === true);
    check('no snapshot initially', body.data.mode_switch_snapshot === null,
      JSON.stringify(body.data.mode_switch_snapshot));

    // Wrong confirmation code refused
    res = await fetch(`${BASE}/super-admin/mode-switch/single`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ keep_college_id: keep.id, confirm_code: 'WRONG_CODE' }),
    });
    check('wrong confirm code refused (400)', res.status === 400, `status=${res.status}`);

    // Real switch
    res = await fetch(`${BASE}/super-admin/mode-switch/single`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ keep_college_id: keep.id, confirm_code: keep.college_code }),
    });
    body = await res.json();
    check('switch succeeds with correct code', res.status === 200, `status=${res.status} ${body.message || ''}`);

    res = await fetch(`${BASE}/common/portal-info`);
    body = await res.json();
    check('portal flips to single-college mode', body.data.single_college === true);

    // Double-switch refused
    res = await fetch(`${BASE}/super-admin/mode-switch/single`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ keep_college_id: keep.id, confirm_code: keep.college_code }),
    });
    check('second switch refused while snapshot exists (400)', res.status === 400, `status=${res.status}`);

    res = await fetch(`${BASE}/super-admin/portal-settings`, { headers: auth });
    body = await res.json();
    check('snapshot visible in portal-settings',
      body.data.mode_switch_snapshot?.kept_college_id === keep.id,
      JSON.stringify(body.data.mode_switch_snapshot || {}));

    // Restore
    res = await fetch(`${BASE}/super-admin/mode-switch/restore`, { method: 'POST', headers: auth });
    body = await res.json();
    check('restore succeeds', res.status === 200, `status=${res.status} ${body.message || ''}`);

    const activeAfter = (
      await pool.query('SELECT id FROM colleges WHERE is_active = TRUE ORDER BY id')
    ).rows.map((r) => r.id);
    check('active college set restored EXACTLY',
      JSON.stringify(activeAfter) === JSON.stringify(activeBefore),
      `before=${activeBefore.length} after=${activeAfter.length}`);

    const snapshotLeft = await pool.query(
      "SELECT COUNT(*) FROM portal_settings WHERE setting_key = 'mode_switch_snapshot'"
    );
    check('snapshot cleaned up', snapshotLeft.rows[0].count === '0');

    res = await fetch(`${BASE}/super-admin/mode-switch/restore`, { method: 'POST', headers: auth });
    check('second restore refused — nothing to restore (400)', res.status === 400, `status=${res.status}`);
  }

  console.log(`\n[${phase}] ${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

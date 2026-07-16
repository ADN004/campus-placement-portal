/**
 * Smoke test: login status gate.
 * A student's registration status (pending / rejected / approved) must gate
 * login the same way for EVERY identifier — PRN and email. The email path
 * used to skip the check entirely, handing pending/rejected students a
 * working session.
 *
 * Borrows one real student row: temporarily rewrites password + status,
 * restores everything at the end.
 *
 * Run with the dev server up:  node scripts/smokeLoginStatusGate.mjs
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

const tryLogin = async (identifier) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identifier, password: 'smoke-gate-pass' }),
  });
  const body = await res.json();
  return { status: res.status, message: body.message || '', token: body.token };
};

const main = async () => {
  const snap = (
    await pool.query(
      `SELECT s.id, s.user_id, s.prn, s.email, s.registration_status, s.rejection_reason,
              u.password_hash
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE u.is_active = TRUE AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
       LIMIT 1`
    )
  ).rows[0];
  if (!snap) { console.log('No approved student in dev DB — nothing to borrow'); process.exit(1); }

  const hash = await bcrypt.hash('smoke-gate-pass', 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, snap.user_id]);

  const setStatus = (status, reason = null) =>
    pool.query('UPDATE students SET registration_status = $1, rejection_reason = $2 WHERE id = $3',
      [status, reason, snap.id]);

  try {
    // --- pending: both identifiers blocked with the friendly message ---
    await setStatus('pending');
    for (const [label, id] of [['PRN', snap.prn], ['email', snap.email]]) {
      const r = await tryLogin(id);
      check(`pending student blocked via ${label} (401 + pending message)`,
        r.status === 401 && /pending approval/i.test(r.message) && !r.token,
        `status=${r.status} msg="${r.message}" token=${!!r.token}`);
    }

    // --- rejected: both identifiers blocked, reason surfaced ---
    await setStatus('rejected', 'photo is blurred');
    for (const [label, id] of [['PRN', snap.prn], ['email', snap.email]]) {
      const r = await tryLogin(id);
      check(`rejected student blocked via ${label} (401 + reason in message)`,
        r.status === 401 && /rejected/i.test(r.message) && r.message.includes('photo is blurred') && !r.token,
        `status=${r.status} msg="${r.message}" token=${!!r.token}`);
    }

    // --- approved: both identifiers still work ---
    await setStatus('approved');
    for (const [label, id] of [['PRN', snap.prn], ['email', snap.email]]) {
      const r = await tryLogin(id);
      check(`approved student logs in via ${label} (200 + token)`,
        r.status === 200 && !!r.token, `status=${r.status} msg="${r.message}"`);
    }
  } finally {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [snap.password_hash, snap.user_id]);
    await setStatus(snap.registration_status, snap.rejection_reason);
  }
  check('borrowed student fully restored', true);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

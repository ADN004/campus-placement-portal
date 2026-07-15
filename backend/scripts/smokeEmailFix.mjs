/**
 * Smoke test for the student email correction feature.
 * Borrows a real approved student from the local dev DB, snapshots every
 * field it touches, runs the full rule matrix, and restores everything.
 *
 * Run with the dev server up:  node scripts/smokeEmailFix.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
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

const clearCooldown = (studentId) =>
  pool.query(
    "UPDATE students SET last_verification_email_sent_at = NOW() - INTERVAL '10 minutes' WHERE id = $1",
    [studentId]
  );

const main = async () => {
  // --- Borrow an approved, active student ---
  const studentResult = await pool.query(
    `SELECT s.id, s.user_id, s.prn, s.college_id, s.email, s.email_verified,
            s.email_verified_at, s.email_verification_token,
            s.last_verification_email_sent_at, s.verification_email_sent_count,
            u.email AS user_email, u.password_hash, u.is_active
     FROM students s JOIN users u ON s.user_id = u.id
     WHERE s.registration_status = 'approved' AND u.is_active = TRUE
     LIMIT 1`
  );
  if (studentResult.rows.length === 0) throw new Error('No approved student in dev DB');
  const snap = studentResult.rows[0];
  console.log(`Borrowing student PRN ${snap.prn} (restored at the end)\n`);

  const restore = async () => {
    await pool.query('UPDATE users SET email = $1, password_hash = $2 WHERE id = $3', [
      snap.user_email, snap.password_hash, snap.user_id,
    ]);
    await pool.query(
      `UPDATE students SET email = $1, email_verified = $2, email_verified_at = $3,
        email_verification_token = $4, last_verification_email_sent_at = $5,
        verification_email_sent_count = $6 WHERE id = $7`,
      [snap.email, snap.email_verified, snap.email_verified_at, snap.email_verification_token,
       snap.last_verification_email_sent_at, snap.verification_email_sent_count, snap.id]
    );
    await pool.query(
      "DELETE FROM activity_logs WHERE action_type = 'UPDATE_STUDENT_EMAIL' AND created_at > NOW() - INTERVAL '10 minutes'"
    );
  };

  try {
    // Known password + no cooldown
    const hash = await bcrypt.hash('smoke-test-pass', 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, snap.user_id]);
    await clearCooldown(snap.id);

    // Student login (by PRN)
    let res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: snap.prn, password: 'smoke-test-pass' }),
    });
    let body = await res.json();
    check('student can log in', res.status === 200, `status=${res.status}`);
    const studentAuth = { Authorization: `Bearer ${body.token}`, 'Content-Type': 'application/json' };

    // (a) Change own email
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT', headers: studentAuth,
      body: JSON.stringify({ email: 'ZZ.EmailFix.Test@Example.com' }),
    });
    body = await res.json();
    check('student changes own email (200)', res.status === 200, `status=${res.status} ${body.message || ''}`);

    const dbCheck = await pool.query(
      `SELECT s.email, s.email_verified, s.email_verification_token, u.email AS user_email
       FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [snap.id]
    );
    const after = dbCheck.rows[0];
    check('  email lowercased + synced to users table',
      after.email === 'zz.emailfix.test@example.com' && after.user_email === after.email,
      JSON.stringify(after.email));
    check('  verification reset (unverified, new token)',
      after.email_verified === false && after.email_verification_token !== snap.email_verification_token);

    // (b) Same email again → 400
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT', headers: studentAuth,
      body: JSON.stringify({ email: 'zz.emailfix.test@example.com' }),
    });
    check('same email rejected (400)', res.status === 400, `status=${res.status}`);

    // (c) Different email within cooldown → 429
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT', headers: studentAuth,
      body: JSON.stringify({ email: 'zz.other@example.com' }),
    });
    check('cooldown enforced (429)', res.status === 429, `status=${res.status}`);

    // (d) Another account's email → 400
    await clearCooldown(snap.id);
    const otherUser = await pool.query('SELECT email FROM users WHERE id != $1 LIMIT 1', [snap.user_id]);
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT', headers: studentAuth,
      body: JSON.stringify({ email: otherUser.rows[0].email }),
    });
    check('email of another account rejected (400)', res.status === 400, `status=${res.status}`);

    // (e) Super admin changes it
    const adminRow = await pool.query("SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1");
    const adminAuth = {
      Authorization: `Bearer ${jwt.sign({ id: adminRow.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '10m' })}`,
      'Content-Type': 'application/json',
    };
    await clearCooldown(snap.id);
    res = await fetch(`${BASE}/super-admin/students/${snap.id}/email`, {
      method: 'PUT', headers: adminAuth,
      body: JSON.stringify({ email: 'zz.emailfix.staff@example.com' }),
    });
    body = await res.json();
    check('super admin changes student email (200)', res.status === 200, `status=${res.status} ${body.message || ''}`);

    // (f) PO of a DIFFERENT college → 403; own college → 200
    const wrongPo = await pool.query(
      `SELECT user_id FROM placement_officers WHERE is_active = TRUE AND college_id != $1 LIMIT 1`,
      [snap.college_id]
    );
    const rightPo = await pool.query(
      `SELECT user_id FROM placement_officers WHERE is_active = TRUE AND college_id = $1 LIMIT 1`,
      [snap.college_id]
    );
    if (wrongPo.rows.length > 0) {
      const poAuth = {
        Authorization: `Bearer ${jwt.sign({ id: wrongPo.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '10m' })}`,
        'Content-Type': 'application/json',
      };
      res = await fetch(`${BASE}/placement-officer/students/${snap.id}/email`, {
        method: 'PUT', headers: poAuth,
        body: JSON.stringify({ email: 'zz.wrongpo@example.com' }),
      });
      check("PO of ANOTHER college refused (403)", res.status === 403, `status=${res.status}`);
    }
    if (rightPo.rows.length > 0) {
      await clearCooldown(snap.id);
      const poAuth = {
        Authorization: `Bearer ${jwt.sign({ id: rightPo.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '10m' })}`,
        'Content-Type': 'application/json',
      };
      res = await fetch(`${BASE}/placement-officer/students/${snap.id}/email`, {
        method: 'PUT', headers: poAuth,
        body: JSON.stringify({ email: 'zz.rightpo@example.com' }),
      });
      body = await res.json();
      check('PO of OWN college changes email (200)', res.status === 200, `status=${res.status} ${body.message || ''}`);
    }

    // (g) Non-student on the self-service route → 403
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT', headers: adminAuth,
      body: JSON.stringify({ email: 'zz.admin@example.com' }),
    });
    check('non-student refused on self-service route (403)', res.status === 403, `status=${res.status}`);
  } finally {
    await restore();
  }

  const restored = await pool.query(
    'SELECT s.email, u.email AS user_email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
    [snap.id]
  );
  check('borrowed student fully restored',
    restored.rows[0].email === snap.email && restored.rows[0].user_email === snap.user_email);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch(async (e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

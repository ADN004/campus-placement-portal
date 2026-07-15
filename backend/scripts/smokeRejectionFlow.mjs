/**
 * Smoke test for the rejection → re-registration flow.
 * Registers a synthetic student via the REAL registration API, rejects them
 * as their PO (with and without reason), verifies the honest login message,
 * re-registers over the rejected PRN, and checks all regressions.
 * Cleans up everything it created (DB rows + cloudinary photo).
 *
 * Run with the dev server up:  node scripts/smokeRejectionFlow.mjs
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { deleteImage } from '../config/cloudinary.js';

const BASE = 'http://localhost:5000/api';
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

const registerPayload = (prn, email, collegeId, regionId, name) => ({
  prn,
  student_name: name,
  branch: 'Computer Engineering',
  region_id: regionId,
  college_id: collegeId,
  email,
  mobile_number: '9998887771',
  date_of_birth: '2005-01-15',
  age: '21',
  gender: 'Male',
  height: '170',
  weight: '60',
  complete_address: 'Smoke Test Street, Test City',
  cgpa_sem1: '8.0',
  cgpa_sem2: '8.1',
  cgpa_sem3: '8.2',
  cgpa_sem4: '8.3',
  programme_cgpa: '8.2',
  has_driving_license: false,
  has_pan_card: false,
  has_aadhar_card: true,
  has_passport: false,
  backlogs_sem1: '0', backlogs_sem2: '0', backlogs_sem3: '0',
  backlogs_sem4: '0', backlogs_sem5: '0', backlogs_sem6: '0',
  photo_base64: PNG,
});

const register = async (payload) => {
  const res = await fetch(`${BASE}/auth/register-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
};

const login = async (prn) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: prn, password: '123' }),
  });
  return { status: res.status, body: await res.json() };
};

const validatePrn = async (prn) => {
  const res = await fetch(`${BASE}/common/validate-prn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prn }),
  });
  return { status: res.status, body: await res.json() };
};

const main = async () => {
  // --- Setup: college with an active PO, and an unused PRN in an active range ---
  const poRow = await pool.query(
    `SELECT po.user_id, po.college_id, c.region_id
     FROM placement_officers po JOIN colleges c ON po.college_id = c.id
     WHERE po.is_active = TRUE LIMIT 1`
  );
  const { user_id: poUserId, college_id: collegeId, region_id: regionId } = poRow.rows[0];
  const poAuth = {
    Authorization: `Bearer ${jwt.sign({ id: poUserId }, process.env.JWT_SECRET, { expiresIn: '15m' })}`,
    'Content-Type': 'application/json',
  };

  const range = (
    await pool.query(
      `SELECT range_start, range_end FROM prn_ranges
       WHERE is_active = TRUE AND range_start IS NOT NULL
         AND range_start ~ '^[0-9]+$' LIMIT 1`
    )
  ).rows[0];
  let prn = null;
  for (let i = parseInt(range.range_end); i >= parseInt(range.range_start); i--) {
    const used = await pool.query('SELECT 1 FROM students WHERE prn = $1', [String(i)]);
    if (used.rows.length === 0) { prn = String(i); break; }
  }
  if (!prn) throw new Error('No unused PRN found in active range');
  console.log(`Using PRN ${prn}, college ${collegeId} (all test data removed at the end)\n`);

  const cleanup = async () => {
    const rows = await pool.query('SELECT id, user_id, photo_cloudinary_id FROM students WHERE prn = $1', [prn]);
    for (const row of rows.rows) {
      if (row.photo_cloudinary_id) { try { await deleteImage(row.photo_cloudinary_id); } catch {} }
      await pool.query('DELETE FROM students WHERE id = $1', [row.id]);
      await pool.query('DELETE FROM activity_logs WHERE user_id = $1', [row.user_id]);
      await pool.query('DELETE FROM users WHERE id = $1', [row.user_id]);
    }
    await pool.query(
      "DELETE FROM activity_logs WHERE action_type IN ('REJECT_STUDENT','BULK_REJECT_STUDENTS') AND created_at > NOW() - INTERVAL '10 minutes' AND action_description LIKE $1",
      [`%${prn}%`]
    );
  };

  try {
    // 1. Fresh registration
    let r = await register(registerPayload(prn, `zz.reject.v1.${prn}@example.com`, collegeId, regionId, 'Smoke Reject V1'));
    check('fresh registration succeeds (201)', r.status === 201, `status=${r.status} ${r.body.message || ''}`);

    // 2. PRN now blocked for others
    r = await validatePrn(prn);
    check('validate-prn blocks a pending PRN', r.status === 400 && r.body.valid === false);

    const v1 = (await pool.query('SELECT id, user_id FROM students WHERE prn = $1', [prn])).rows[0];

    // 3. PO rejects WITH a reason
    let res = await fetch(`${BASE}/placement-officer/students/${v1.id}/reject`, {
      method: 'PUT', headers: poAuth, body: JSON.stringify({ reason: 'Photo is blurred' }),
    });
    check('PO rejects with reason (200)', res.status === 200, `status=${res.status}`);

    const afterReject = (
      await pool.query('SELECT registration_status, rejection_reason, rejected_at FROM students WHERE id = $1', [v1.id])
    ).rows[0];
    check('  reason + timestamp stored',
      afterReject.registration_status === 'rejected' &&
      afterReject.rejection_reason === 'Photo is blurred' &&
      afterReject.rejected_at !== null);

    // 4. Rejecting again refused (not pending anymore)
    res = await fetch(`${BASE}/placement-officer/students/${v1.id}/reject`, {
      method: 'PUT', headers: poAuth, body: JSON.stringify({}),
    });
    check('re-rejecting a rejected student refused (400)', res.status === 400, `status=${res.status}`);

    // 5. Honest login message with reason
    r = await login(prn);
    check('login blocked with HONEST rejected message + reason',
      r.status === 401 && /rejected/i.test(r.body.message) && r.body.message.includes('Photo is blurred'),
      r.body.message);

    // 6. validate-prn now allows re-registration and flags it
    r = await validatePrn(prn);
    check('validate-prn allows rejected PRN + flags previous_rejected',
      r.status === 200 && r.body.valid === true && r.body.previous_rejected === true,
      JSON.stringify(r.body));

    // 7. Re-register with the SAME email (self-conflict must be exempt)
    r = await register(registerPayload(prn, `zz.reject.v1.${prn}@example.com`, collegeId, regionId, 'Smoke Reject V2'));
    check('re-registration over rejected PRN succeeds (201)', r.status === 201, `status=${r.status} ${r.body.message || ''}`);
    check('  response mentions replacement', /replaced|corrected/i.test(r.body.message), r.body.message);

    const v2 = (
      await pool.query('SELECT id, user_id, registration_status, rejection_reason, student_name FROM students WHERE prn = $1', [prn])
    ).rows;
    check('  exactly one student row remains', v2.length === 1);
    check('  back to pending, reason cleared, user account reused',
      v2[0].registration_status === 'pending' &&
      v2[0].rejection_reason === null &&
      v2[0].user_id === v1.user_id &&
      v2[0].student_name === 'Smoke Reject V2');

    // 8. Reject WITHOUT reason, then check message has no reason clause
    res = await fetch(`${BASE}/placement-officer/students/${v2[0].id}/reject`, {
      method: 'PUT', headers: poAuth, body: JSON.stringify({}),
    });
    check('PO rejects without reason (200)', res.status === 200, `status=${res.status}`);
    r = await login(prn);
    check('login message honest, no reason clause',
      r.status === 401 && /rejected/i.test(r.body.message) && !r.body.message.includes(':'),
      r.body.message);

    // 9. Re-register with a DIFFERENT email
    r = await register(registerPayload(prn, `zz.reject.v3.${prn}@example.com`, collegeId, regionId, 'Smoke Reject V3'));
    check('re-registration with a new email succeeds (201)', r.status === 201, `status=${r.status} ${r.body.message || ''}`);
    const v3user = (
      await pool.query('SELECT u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.prn = $1', [prn])
    ).rows[0];
    check('  login email updated on the reused user account',
      v3user.email === `zz.reject.v3.${prn}@example.com`, v3user.email);

    // 10. Regressions: approved PRNs and taken emails still block
    const approved = (
      await pool.query("SELECT prn FROM students WHERE registration_status = 'approved' LIMIT 1")
    ).rows[0];
    r = await register(registerPayload(approved.prn, 'zz.hijack@example.com', collegeId, regionId, 'Hijack Attempt'));
    check('approved PRN still blocked (400)', r.status === 400, `status=${r.status}`);

    const otherEmail = (
      await pool.query("SELECT email FROM students WHERE registration_status = 'approved' LIMIT 1")
    ).rows[0].email;
    res = await fetch(`${BASE}/placement-officer/students/${(await pool.query('SELECT id FROM students WHERE prn = $1', [prn])).rows[0].id}/reject`, {
      method: 'PUT', headers: poAuth, body: JSON.stringify({}),
    });
    r = await register(registerPayload(prn, otherEmail, collegeId, regionId, 'Email Thief'));
    check("another student's email still blocked on re-registration (400)", r.status === 400, `status=${r.status}`);
  } finally {
    await cleanup();
  }

  const leftovers = await pool.query('SELECT 1 FROM students WHERE prn = $1', [prn]);
  check('all test data cleaned up', leftovers.rows.length === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch(async (e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

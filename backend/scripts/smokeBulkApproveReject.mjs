/**
 * Smoke test for the atomic bulk approve/reject endpoints.
 *
 * The officer UI used to run a bulk action as N parallel single-student PUTs.
 * It now calls PUT /placement-officer/students/bulk-approve|bulk-reject, which
 * validate every student against the officer's college up front and write
 * inside a transaction. This checks the swap did not lose anything:
 *
 *   1. bulk approve applies to every selected student
 *   2. bulk approve still sends the verification email — the single-student
 *      path always did, and the bulk controller originally did not
 *   3. a selection containing non-pending students reports the REAL count
 *      (the old code always claimed the whole selection succeeded)
 *   4. a cross-college student is refused 403 and NOTHING is written
 *   5. bulk reject applies, stores the batch reason, and reports its count
 *
 * Emails are logged, not delivered, while EMAIL_MODE=log.
 * Creates and removes its own fixtures.
 *
 * Run with the dev server up:  node scripts/smokeBulkApproveReject.mjs
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

const createdUserIds = [];

/** Insert a pending student straight into the DB, ready to be approved. */
async function makePendingStudent(collegeId, regionId, tag) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `smoke.bulk.${tag}.${stamp}@example.invalid`;
  const prn = `SMK${tag}${stamp}`.slice(0, 20);

  const u = await pool.query(
    `INSERT INTO users (email, password_hash, role, is_active)
     VALUES ($1, 'x-smoke-not-a-real-hash', 'student', TRUE) RETURNING id`,
    [email]
  );
  const userId = u.rows[0].id;
  createdUserIds.push(userId);

  const s = await pool.query(
    `INSERT INTO students
       (user_id, prn, student_name, region_id, college_id, email, mobile_number,
        programme_cgpa, date_of_birth, backlog_count, branch,
        registration_status, email_verified, email_verification_token)
     VALUES ($1,$2,$3,$4,$5,$6,'9990000000',8.00,'2005-01-15',0,
             'Computer Engineering','pending',FALSE,$7)
     RETURNING id`,
    [userId, prn, `Smoke Bulk ${tag}`, regionId, collegeId, email, `tok-${stamp}`]
  );
  return { studentId: s.rows[0].id, userId, prn, email };
}

const authHeaders = (poUserId) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${jwt.sign({ id: poUserId }, process.env.JWT_SECRET, { expiresIn: '15m' })}`,
});

async function main() {
  // An active officer, plus a college that is NOT theirs for the 403 case.
  const po = await pool.query(
    `SELECT po.user_id, po.college_id, c.region_id
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       JOIN users u ON po.user_id = u.id
      WHERE u.is_active = TRUE
      LIMIT 1`
  );
  if (po.rows.length === 0) throw new Error('No active placement officer found');
  const { user_id: poUserId, college_id: collegeId, region_id: regionId } = po.rows[0];

  const other = await pool.query(
    `SELECT id, region_id FROM colleges WHERE id <> $1 LIMIT 1`,
    [collegeId]
  );
  if (other.rows.length === 0) throw new Error('Need a second college');
  const otherCollege = other.rows[0];

  const headers = authHeaders(poUserId);

  // ---------------------------------------------------------------- approve
  console.log('\n1. Bulk approve — all selected students are pending');
  const a1 = await makePendingStudent(collegeId, regionId, 'a1');
  const a2 = await makePendingStudent(collegeId, regionId, 'a2');
  const a3 = await makePendingStudent(collegeId, regionId, 'a3');

  let res = await fetch(`${BASE}/placement-officer/students/bulk-approve`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ studentIds: [a1.studentId, a2.studentId, a3.studentId] }),
  });
  let body = await res.json();
  check('200 OK', res.status === 200, `got ${res.status}`);
  check('approvedCount = 3', body.data?.approvedCount === 3, `got ${body.data?.approvedCount}`);

  let rows = await pool.query(
    `SELECT registration_status, approved_by, last_verification_email_sent_at,
            verification_email_sent_count
       FROM students WHERE id = ANY($1::int[]) ORDER BY id`,
    [[a1.studentId, a2.studentId, a3.studentId]]
  );
  check('all 3 approved in DB', rows.rows.every((r) => r.registration_status === 'approved'));
  check('approved_by recorded', rows.rows.every((r) => r.approved_by === poUserId));

  // The regression this fix exists to prevent: the single-student endpoint
  // always emailed the verification link, the bulk one did not.
  check(
    'verification email sent to all 3',
    rows.rows.every((r) => r.last_verification_email_sent_at !== null),
    `sent_at values: ${rows.rows.map((r) => r.last_verification_email_sent_at).join(' | ')}`
  );
  check(
    'send counter incremented',
    rows.rows.every((r) => r.verification_email_sent_count === 1),
    `counts: ${rows.rows.map((r) => r.verification_email_sent_count).join(',')}`
  );

  // ------------------------------------------------------- partial reporting
  console.log('\n2. Bulk approve — selection contains an already-approved student');
  const b1 = await makePendingStudent(collegeId, regionId, 'b1');
  const b2 = await makePendingStudent(collegeId, regionId, 'b2');
  await pool.query(
    `UPDATE students SET registration_status = 'approved' WHERE id = $1`,
    [b1.studentId]
  );

  res = await fetch(`${BASE}/placement-officer/students/bulk-approve`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ studentIds: [b1.studentId, b2.studentId] }),
  });
  body = await res.json();
  check('200 OK', res.status === 200, `got ${res.status}`);
  check(
    'approvedCount = 1 of 2 selected',
    body.data?.approvedCount === 1,
    `got ${body.data?.approvedCount} — the UI reports this number, not the selection size`
  );

  // ----------------------------------------------------------- cross-college
  console.log('\n3. Bulk approve — one student belongs to another college');
  const c1 = await makePendingStudent(collegeId, regionId, 'c1');
  const foreign = await makePendingStudent(otherCollege.id, otherCollege.region_id, 'cx');

  res = await fetch(`${BASE}/placement-officer/students/bulk-approve`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ studentIds: [c1.studentId, foreign.studentId] }),
  });
  body = await res.json();
  check('403 refused', res.status === 403, `got ${res.status}`);

  rows = await pool.query(
    `SELECT id, registration_status FROM students WHERE id = ANY($1::int[])`,
    [[c1.studentId, foreign.studentId]]
  );
  check(
    'nothing written — own-college student still pending',
    rows.rows.every((r) => r.registration_status === 'pending'),
    JSON.stringify(rows.rows)
  );

  // ----------------------------------------------------------------- reject
  console.log('\n4. Bulk reject — with a batch reason');
  const d1 = await makePendingStudent(collegeId, regionId, 'd1');
  const d2 = await makePendingStudent(collegeId, regionId, 'd2');
  const REASON = 'Smoke test: incomplete documents';

  res = await fetch(`${BASE}/placement-officer/students/bulk-reject`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ studentIds: [d1.studentId, d2.studentId], reason: REASON }),
  });
  body = await res.json();
  check('200 OK', res.status === 200, `got ${res.status}`);
  check('rejectedCount = 2', body.data?.rejectedCount === 2, `got ${body.data?.rejectedCount}`);

  rows = await pool.query(
    `SELECT registration_status, rejection_reason FROM students WHERE id = ANY($1::int[])`,
    [[d1.studentId, d2.studentId]]
  );
  check('both rejected in DB', rows.rows.every((r) => r.registration_status === 'rejected'));
  check('batch reason stored', rows.rows.every((r) => r.rejection_reason === REASON),
    JSON.stringify(rows.rows.map((r) => r.rejection_reason)));

  // ------------------------------------------------------------- validation
  console.log('\n5. Empty selection is refused');
  res = await fetch(`${BASE}/placement-officer/students/bulk-approve`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ studentIds: [] }),
  });
  check('400 on empty array', res.status === 400, `got ${res.status}`);
}

main()
  .catch((e) => {
    fail++;
    console.error('\nFATAL:', e.message);
  })
  .finally(async () => {
    if (createdUserIds.length > 0) {
      // students rows cascade from users
      await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
      console.log(`\nCleaned up ${createdUserIds.length} fixture users.`);
    }
    await pool.end();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
  });

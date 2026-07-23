/**
 * Smoke test: verification-email send quota.
 *
 * The counter used to be a lifetime total that was never reset, so once a
 * student had ever received 5 verification emails they were throttled to one
 * per day forever — and the public resend route never checked the cap at all.
 * It now means "sent today", restarts each calendar day, and both resend
 * routes enforce it.
 *
 * Borrows one student (forced to approved + unverified), restored in finally.
 * Runs against the dev server, where APP_ENV != production keeps email in
 * safe mode — nothing is actually delivered.
 *
 * Run with the dev server up:  node scripts/smokeVerificationQuota.mjs
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

const countOf = async (id) =>
  (await pool.query('SELECT verification_email_sent_count AS c FROM students WHERE id=$1', [id])).rows[0].c;

const main = async () => {
  const student = (
    await pool.query(
      `SELECT s.id, s.user_id, s.email, s.email_verified, s.registration_status,
              s.verification_email_sent_count, s.last_verification_email_sent_at,
              u.password_hash, u.is_active
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE u.is_active = TRUE ORDER BY s.id LIMIT 1`
    )
  ).rows[0];

  if (!student) {
    console.error('Need at least one active student. Aborting.');
    await pool.end();
    process.exit(1);
  }

  const studentPass = 'smoke-verif-pass';

  // Force the borrowed student into "approved but unverified" with a clean tally
  await pool.query(
    `UPDATE students SET email_verified=FALSE, registration_status='approved',
       verification_email_sent_count=0, last_verification_email_sent_at=NULL WHERE id=$1`,
    [student.id]
  );
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [
    await bcrypt.hash(studentPass, 10), student.user_id,
  ]);

  try {
    const resendPublic = () => fetch(`${BASE}/auth/resend-verification`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student.email }),
    });

    // --- 5 per day allowed on the public route (previously uncapped) ---
    let allOk = true;
    for (let i = 1; i <= 5; i++) {
      const res = await resendPublic();
      if (res.status !== 200) { allOk = false; console.log(`    send #${i} → ${res.status}`); }
    }
    check('public resend: first 5 of the day accepted', allOk);
    check('counter reflects 5 sent today', String(await countOf(student.id)) === '5');

    // --- 6th is refused ---
    let res = await resendPublic();
    let body = await res.json();
    check('public resend: 6th refused → 429', res.status === 429, `got ${res.status}`);
    check('refusal explains the daily cap', /today/i.test(body.message || ''), body.message);
    check('counter not incremented past 5', String(await countOf(student.id)) === '5');

    // --- authenticated status endpoint agrees ---
    const token = (await (await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student.email, password: studentPass }),
    })).json()).token;
    check('student logged in', !!token);
    res = await fetch(`${BASE}/students/verification-status`, { headers: { Authorization: `Bearer ${token}` } });
    body = (await res.json()).data;
    check('status: can_resend false at the cap', body?.can_resend === false, JSON.stringify(body));
    check('status: 0 remaining today', body?.verification_emails_remaining_today === 0, JSON.stringify(body));

    // --- a new day restarts the tally (backdate the last send) ---
    await pool.query(
      `UPDATE students SET last_verification_email_sent_at = CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE id=$1`,
      [student.id]
    );
    res = await resendPublic();
    check('new day: resend accepted again', res.status === 200, `got ${res.status}`);
    check('new day: counter restarted at 1 (not 6)', String(await countOf(student.id)) === '1');

    res = await fetch(`${BASE}/students/verification-status`, { headers: { Authorization: `Bearer ${token}` } });
    body = (await res.json()).data;
    check('status: can_resend true again', body?.can_resend === true);
    check('status: 4 remaining today', body?.verification_emails_remaining_today === 4, JSON.stringify(body));
  } finally {
    await pool.query(
      `UPDATE students SET email_verified=$1, registration_status=$2,
         verification_email_sent_count=$3, last_verification_email_sent_at=$4 WHERE id=$5`,
      [student.email_verified, student.registration_status,
       student.verification_email_sent_count, student.last_verification_email_sent_at, student.id]
    );
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [student.password_hash, student.user_id]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

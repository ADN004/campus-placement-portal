/**
 * Smoke test: disposable/temporary email blocking.
 * Unit-checks the policy util, then verifies both live endpoints refuse
 * disposable domains (registration + email correction).
 *
 * Run with the dev server up:  node scripts/smokeDisposableEmail.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { isDisposableEmail } from '../utils/emailPolicy.js';

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
  // --- Unit checks on the policy itself ---
  check('mailinator.com blocked', isDisposableEmail('kid@mailinator.com'));
  check('subdomain trick blocked (x.mailinator.com)', isDisposableEmail('kid@abc.mailinator.com'));
  check('yopmail.com blocked', isDisposableEmail('kid@yopmail.com'));
  check('temp-mail.org blocked', isDisposableEmail('kid@temp-mail.org'));
  check('10minutemail.com blocked', isDisposableEmail('kid@10minutemail.com'));
  check('gmail.com allowed', !isDisposableEmail('student@gmail.com'));
  check('college domain allowed', !isDisposableEmail('placement@gptcpalakkad.ac.in'));
  check('yahoo.com allowed', !isDisposableEmail('student@yahoo.com'));
  check('rediffmail.com allowed', !isDisposableEmail('officer@rediffmail.com'));
  check('garbage input safe', !isDisposableEmail('not-an-email') && !isDisposableEmail(null));

  // --- Live: registration refuses a disposable email ---
  // (the disposable check runs before PRN/photo work, so a minimal payload
  //  with all required fields is enough)
  const payload = {
    prn: '999999999999', student_name: 'Temp Mail Kid', branch: 'Computer Engineering',
    region_id: 1, college_id: 1, email: 'smartass@mailinator.com', mobile_number: '9990001112',
    date_of_birth: '2005-01-01', age: '21', gender: 'Male', height: '170', weight: '60',
    complete_address: 'X', cgpa_sem1: '8', cgpa_sem2: '8', cgpa_sem3: '8', cgpa_sem4: '8',
    programme_cgpa: '8', has_driving_license: false, has_pan_card: false,
    has_aadhar_card: true, has_passport: false, photo_base64: 'data:image/png;base64,x',
  };
  let res = await fetch(`${BASE}/auth/register-student`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  let body = await res.json();
  check('registration refuses disposable email (400 + clear message)',
    res.status === 400 && /temporary|disposable/i.test(body.message), `status=${res.status} ${body.message}`);

  // --- Live: email correction refuses a disposable email ---
  const snap = (
    await pool.query(
      `SELECT s.id, s.user_id, s.prn, u.password_hash FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.registration_status = 'approved' AND u.is_active = TRUE LIMIT 1`
    )
  ).rows[0];
  const hash = await bcrypt.hash('smoke-test-pass', 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, snap.user_id]);
  try {
    res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: snap.prn, password: 'smoke-test-pass' }),
    });
    const token = (await res.json()).token;
    res = await fetch(`${BASE}/auth/student-email`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sneaky@yopmail.com' }),
    });
    body = await res.json();
    check('email correction refuses disposable email (400)',
      res.status === 400 && /temporary|disposable/i.test(body.message), `status=${res.status} ${body.message}`);
  } finally {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [snap.password_hash, snap.user_id]);
  }
  check('borrowed student password restored', true);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

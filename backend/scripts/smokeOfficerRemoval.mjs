/**
 * Smoke test: removing/replacing a placement officer more than once.
 *
 * placement_officers used to carry UNIQUE(college_id, is_active), which capped
 * a college at ONE inactive officer as well as one active one. Removing a
 * second officer (or appointing a second replacement) therefore failed with
 * "duplicate key value violates unique constraint
 * placement_officers_college_id_is_active_key". Migration 009 replaces it with
 * a partial unique index on (college_id) WHERE is_active — so a college may
 * accumulate any number of retired officers but still only one serving one.
 *
 * Reproduces the production case: a college that already has retired officers,
 * then removes its sitting officer through the real HTTP endpoint. Everything
 * it touches is restored in finally.
 *
 * Run with the dev server up:  node scripts/smokeOfficerRemoval.mjs
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
      `SELECT po.id, po.college_id, po.user_id, po.officer_name, po.is_active, u.is_active AS user_active
       FROM placement_officers po JOIN users u ON po.user_id = u.id
       WHERE po.is_active = TRUE ORDER BY po.id LIMIT 1`
    )
  ).rows[0];

  if (!admin || !officer) {
    console.error('Need a super admin and one active placement officer. Aborting.');
    await pool.end();
    process.exit(1);
  }

  const collegeId = officer.college_id;
  const adminPass = 'smoke-officer-admin';
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(adminPass, 10), admin.id]);

  const retiredUserIds = [];
  const historyHighWater = (await pool.query('SELECT COALESCE(MAX(id),0) AS m FROM placement_officer_history')).rows[0].m;

  try {
    // --- stack up two RETIRED officers on this college (the old constraint
    //     allowed at most one, so the 2nd insert used to fail outright) ---
    for (let i = 1; i <= 2; i++) {
      const u = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'placement_officer', FALSE) RETURNING id`,
        [`zz.smoke.retired${i}@example.com`, 'x']
      );
      retiredUserIds.push(u.rows[0].id);
      await pool.query(
        `INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, is_active)
         VALUES ($1, $2, $3, $4, FALSE)`,
        [u.rows[0].id, collegeId, `Smoke Retired ${i}`, `99999900${i}`]
      );
    }
    const retiredCount = (
      await pool.query('SELECT COUNT(*) n FROM placement_officers WHERE college_id=$1 AND is_active=FALSE', [collegeId])
    ).rows[0].n;
    check('college can hold multiple retired officers', Number(retiredCount) >= 2, `got ${retiredCount}`);

    // --- the real rule still holds: only one ACTIVE officer per college ---
    let secondActiveRejected = false;
    try {
      const u = await pool.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ('zz.smoke.second.active@example.com', 'x', 'placement_officer', TRUE) RETURNING id`
      );
      retiredUserIds.push(u.rows[0].id);
      await pool.query(
        `INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, is_active)
         VALUES ($1, $2, 'Smoke Second Active', '999999099', TRUE)`,
        [u.rows[0].id, collegeId]
      );
    } catch (e) {
      secondActiveRejected = /unique|duplicate/i.test(e.message);
    }
    check('a SECOND active officer is still rejected', secondActiveRejected);

    // --- the production scenario: remove the sitting officer via the real API ---
    const token = (await (await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: adminPass }),
    })).json()).token;
    check('super admin logged in', !!token);

    const res = await fetch(`${BASE}/super-admin/placement-officers/${officer.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    check('remove sitting officer → 200 (used to be a duplicate-key 500)', res.status === 200, JSON.stringify(body));

    const after = (
      await pool.query(
        `SELECT po.is_active AS po_active, u.is_active AS user_active
         FROM placement_officers po JOIN users u ON po.user_id = u.id WHERE po.id=$1`,
        [officer.id]
      )
    ).rows[0];
    check('officer row deactivated (not deleted)', after.po_active === false);
    check('officer login blocked (user deactivated)', after.user_active === false);

    const hist = (
      await pool.query('SELECT COUNT(*) n FROM placement_officer_history WHERE id > $1 AND college_id = $2', [historyHighWater, collegeId])
    ).rows[0].n;
    check('tenure written to officer history', Number(hist) >= 1);

    // college now has 3+ retired officers and no active one — appointing a
    // replacement is what used to break next
    const nowRetired = (
      await pool.query('SELECT COUNT(*) n FROM placement_officers WHERE college_id=$1 AND is_active=FALSE', [collegeId])
    ).rows[0].n;
    check('college now holds 3+ retired officers', Number(nowRetired) >= 3, `got ${nowRetired}`);
  } finally {
    // restore the borrowed officer + admin, drop everything the test created
    await pool.query('UPDATE placement_officers SET is_active=$1 WHERE id=$2', [officer.is_active, officer.id]);
    await pool.query('UPDATE users SET is_active=$1 WHERE id=$2', [officer.user_active, officer.user_id]);
    await pool.query('DELETE FROM placement_officer_history WHERE id > $1', [historyHighWater]);
    if (retiredUserIds.length) {
      // placement_officers.user_id cascades on user delete
      await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [retiredUserIds]);
    }
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

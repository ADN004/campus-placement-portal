/**
 * Smoke test: a phone number is unique among SERVING officers only.
 *
 * placement_officers.phone_number used to be table-wide UNIQUE. Since Remove is
 * a soft delete, a retired officer kept their number forever, so re-appointing
 * that person (or reusing a shared office number) failed with a duplicate-key
 * error. Migration 010 makes the uniqueness a partial index over active rows.
 *
 * Asserts:
 *   - a retired officer + a NEW active officer may share a phone number
 *   - two ACTIVE officers may NOT share a phone number
 *
 * Uses throwaway region/colleges so the one-active-officer-per-college index
 * can't interfere with what we're actually testing (the phone index). All test
 * data is removed in finally. No dev server needed.
 *
 * Run:  node scripts/smokeOfficerPhoneReuse.mjs
 */
import 'dotenv/config';
import pg from 'pg';

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

const PHONE = '9999988888';
const TAG = 'ZZ_SMOKE_PHONE';

const main = async () => {
  const userIds = [];
  let regionId, collegeA, collegeB;

  const makeUser = async (active) => {
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, 'x', 'placement_officer', $2) RETURNING id`,
      [`zz.smoke.phone.${userIds.length}@example.com`, active]
    );
    userIds.push(r.rows[0].id);
    return r.rows[0].id;
  };
  const makeOfficer = (userId, collegeId, name, active) =>
    pool.query(
      `INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, collegeId, name, PHONE, active]
    );

  try {
    // Throwaway region + two colleges (each with no officers of their own)
    regionId = (await pool.query(`INSERT INTO regions (region_name, region_code) VALUES ('${TAG}_R', '${TAG}_R') RETURNING id`)).rows[0].id;
    collegeA = (await pool.query(
      `INSERT INTO colleges (college_name, college_code, region_id) VALUES ('${TAG}_A', '${TAG}_A', $1) RETURNING id`, [regionId]
    )).rows[0].id;
    collegeB = (await pool.query(
      `INSERT INTO colleges (college_name, college_code, region_id) VALUES ('${TAG}_B', '${TAG}_B', $1) RETURNING id`, [regionId]
    )).rows[0].id;

    // A retired officer at college A holding the number
    await makeOfficer(await makeUser(false), collegeA, 'Retired Holder', false);
    check('retired officer created with the phone', true);

    // Re-appointment / reuse: a NEW active officer with the SAME number — used to fail
    let reappointOk = true, reErr = '';
    try {
      await makeOfficer(await makeUser(true), collegeA, 'Returning Person', true);
    } catch (e) { reappointOk = false; reErr = e.message; }
    check("active officer may reuse a retired officer's number", reappointOk, reErr);

    // Two ACTIVE officers sharing a number is still rejected (different college,
    // so only the phone index can be the thing that trips)
    let secondActiveRejected = false, secondErr = '';
    try {
      await makeOfficer(await makeUser(true), collegeB, 'Second Active Same Phone', true);
    } catch (e) { secondErr = e.message; secondActiveRejected = /unique|duplicate/i.test(e.message); }
    check('two ACTIVE officers cannot share a number', secondActiveRejected, secondErr);
    check('...and it is the phone index that blocks it', /phone/i.test(secondErr), secondErr);
  } finally {
    await pool.query('DELETE FROM placement_officers WHERE phone_number = $1', [PHONE]);
    if (userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
    if (collegeA) await pool.query('DELETE FROM colleges WHERE id = ANY($1::int[])', [[collegeA, collegeB].filter(Boolean)]);
    if (regionId) await pool.query('DELETE FROM regions WHERE id = $1', [regionId]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

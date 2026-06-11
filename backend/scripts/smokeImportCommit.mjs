/**
 * Temporary smoke test: real bulk-import COMMIT on the local dev DB.
 * Creates ZZ_CMT college + officer (phone 9999999955), verifies the officer
 * can actually LOG IN with the default password, then deletes everything.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import ExcelJS from 'exceljs';

const BASE = 'http://localhost:5000/api';
const PHONE = '9999999955';
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

const cleanup = async () => {
  await pool.query(
    `DELETE FROM placement_officers WHERE college_id IN (SELECT id FROM colleges WHERE college_code = 'ZZ_CMT')`
  );
  await pool.query(`DELETE FROM colleges WHERE college_code = 'ZZ_CMT'`);
  await pool.query(`DELETE FROM activity_logs WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [PHONE]);
  await pool.query(`DELETE FROM users WHERE email = $1`, [PHONE]);
};

const main = async () => {
  await cleanup(); // in case of a previous crashed run

  const adminResult = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1"
  );
  const token = jwt.sign({ id: adminResult.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const auth = { Authorization: `Bearer ${token}` };

  const regionResult = await pool.query('SELECT region_name FROM regions LIMIT 1');
  const regionName = regionResult.rows[0].region_name;

  // Build a clean import file
  const wb = new ExcelJS.Workbook();
  const cSheet = wb.addWorksheet('Colleges');
  cSheet.addRow(['college_name', 'college_code', 'region', 'branches', 'sort_order']);
  cSheet.addRow(['ZZ Commit Test College', 'ZZ_CMT', regionName, 'Branch X', '995']);
  const oSheet = wb.addWorksheet('Officers');
  oSheet.addRow(['college_code', 'officer_name', 'phone_number', 'designation', 'officer_email', 'college_email']);
  oSheet.addRow(['ZZ_CMT', 'Commit Test Officer', PHONE, 'Lecturer', 'commit@test.com', 'col@test.com']);
  const fileBuf = await wb.xlsx.writeBuffer();

  const form = new FormData();
  form.append('file', new Blob([fileBuf]), 'commit-test.xlsx');
  form.append('mode', 'commit');
  form.append('officer_conflict', 'skip');

  let res = await fetch(`${BASE}/super-admin/import/data`, { method: 'POST', headers: auth, body: form });
  let body = await res.json();
  check('commit succeeds', res.status === 200 && body.success, `status=${res.status} ${body.message || ''}`);
  check('  1 college + 1 officer created', body.data?.summary.colleges.ok === 1 && body.data?.summary.officers.ok === 1);

  const collegeCheck = await pool.query(
    `SELECT c.branches, po.officer_name FROM colleges c
     JOIN placement_officers po ON po.college_id = c.id AND po.is_active = TRUE
     WHERE c.college_code = 'ZZ_CMT'`
  );
  check('college + active officer in DB', collegeCheck.rows.length === 1);
  check(
    '  branches parsed from comma list',
    JSON.stringify(collegeCheck.rows[0]?.branches) === '["Branch X"]',
    JSON.stringify(collegeCheck.rows[0]?.branches)
  );

  // The real test: can the imported officer log in with the default password?
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PHONE, password: '123' }),
  });
  body = await res.json();
  check(
    'imported officer can LOG IN with phone + default password',
    res.status === 200 && body.success && body.user?.role === 'placement_officer',
    `status=${res.status} ${body.message || ''}`
  );

  // Re-import same file with skip policy → everything skipped, nothing duplicated
  const form2 = new FormData();
  form2.append('file', new Blob([fileBuf]), 'commit-test.xlsx');
  form2.append('mode', 'commit');
  form2.append('officer_conflict', 'skip');
  res = await fetch(`${BASE}/super-admin/import/data`, { method: 'POST', headers: auth, body: form2 });
  body = await res.json();
  check('re-import refused as nothing-to-do (400)', res.status === 400, `status=${res.status} ${body.message || ''}`);

  await cleanup();
  const after = await pool.query(`SELECT COUNT(*) FROM users WHERE email = $1`, [PHONE]);
  check('cleanup removed test data', after.rows[0].count === '0');

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch(async (e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  await cleanup().catch(() => {});
  process.exit(1);
});

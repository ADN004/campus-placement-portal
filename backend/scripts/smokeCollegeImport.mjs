/**
 * Temporary smoke test for the college management + bulk import feature.
 * Runs against the local dev server on :5000 using a real super admin token.
 * Safe: only creates a throwaway ZZ_TEST college (deleted at the end) and
 * runs the import in validate (dry-run) mode.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import ExcelJS from 'exceljs';

const BASE = 'http://localhost:5000/api/super-admin';
const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campus_placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
};

const main = async () => {
  // --- Auth: real super admin token ---
  const adminResult = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1"
  );
  if (adminResult.rows.length === 0) throw new Error('No active super admin in dev DB');
  const token = jwt.sign({ id: adminResult.rows[0].id }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
  const auth = { Authorization: `Bearer ${token}` };

  // --- 1. List endpoints ---
  let res = await fetch(`${BASE}/colleges`, { headers: auth });
  let body = await res.json();
  check('GET /colleges returns list', res.status === 200 && Array.isArray(body.data), `status=${res.status}`);
  const collegeCountBefore = body.count;
  const existingCollege = body.data.find((c) => parseInt(c.active_officer_count) > 0);

  res = await fetch(`${BASE}/regions`, { headers: auth });
  body = await res.json();
  check('GET /regions returns list', res.status === 200 && Array.isArray(body.data), `status=${res.status}`);
  const someRegion = body.data[0];

  // --- 2. College CRUD ---
  res = await fetch(`${BASE}/colleges`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      college_name: 'ZZ Smoke Test College',
      college_code: 'ZZ_TEST',
      region_id: someRegion.id,
      branches: ['Test Branch'],
      sort_order: 998,
    }),
  });
  body = await res.json();
  check('POST /colleges creates', res.status === 201 && body.data?.college_code === 'ZZ_TEST', `status=${res.status} ${body.message}`);
  const testCollegeId = body.data?.id;

  res = await fetch(`${BASE}/colleges`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ college_name: 'zz smoke test college', college_code: 'OTHER', region_id: someRegion.id }),
  });
  check('POST /colleges rejects duplicate name', res.status === 400);

  res = await fetch(`${BASE}/colleges/${testCollegeId}`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ college_name: 'ZZ Smoke Test College Renamed', sort_order: 997 }),
  });
  body = await res.json();
  check('PUT /colleges/:id updates', res.status === 200 && body.data?.college_name === 'ZZ Smoke Test College Renamed', `status=${res.status}`);

  res = await fetch(`${BASE}/colleges/${testCollegeId}/toggle-active`, { method: 'PUT', headers: auth });
  body = await res.json();
  check('PUT toggle-active deactivates', res.status === 200 && body.data?.is_active === false, `status=${res.status}`);

  // --- 3. Region guard ---
  res = await fetch(`${BASE}/regions/${someRegion.id}`, { method: 'DELETE', headers: auth });
  check('DELETE region with colleges refused (409)', res.status === 409, `status=${res.status}`);

  // --- 4. Template download ---
  res = await fetch(`${BASE}/import/template`, { headers: auth });
  const buf = Buffer.from(await res.arrayBuffer());
  check(
    'GET /import/template returns xlsx',
    res.status === 200 && res.headers.get('content-type')?.includes('spreadsheetml') && buf.length > 5000,
    `status=${res.status} bytes=${buf.length}`
  );
  const templateWb = new ExcelJS.Workbook();
  await templateWb.xlsx.load(buf);
  check(
    'Template has all 5 sheets',
    ['Instructions', 'Colleges', 'Officers', 'Regions', 'Existing Colleges'].every((s) => templateWb.getWorksheet(s))
  );

  // --- 5. Import validate (dry run) ---
  const wb = new ExcelJS.Workbook();
  const cSheet = wb.addWorksheet('Colleges');
  cSheet.addRow(['college_name', 'college_code', 'region', 'branches', 'sort_order']);
  cSheet.addRow(['ZZ Import College', 'ZZ_IMP', someRegion.region_name, 'Branch A, Branch B', '996']); // ok
  cSheet.addRow(['ZZ Bad Region College', 'ZZ_BAD', 'No Such Region', '', '']); // error
  const oSheet = wb.addWorksheet('Officers');
  oSheet.addRow(['college_code', 'officer_name', 'phone_number', 'designation', 'officer_email', 'college_email']);
  oSheet.addRow(['ZZ_IMP', 'New Officer', '9999999901', 'Lecturer', 'a@b.com', 'c@d.com']); // ok (new college in file)
  if (existingCollege) {
    oSheet.addRow([existingCollege.college_code, 'Conflict Officer', '9999999902', '', '', '']); // skip (has officer)
  }
  oSheet.addRow(['NO_SUCH', 'Ghost Officer', 'abc', '', 'bad-email', '']); // error
  const fileBuf = await wb.xlsx.writeBuffer();

  const form = new FormData();
  form.append('file', new Blob([fileBuf]), 'test-import.xlsx');
  form.append('mode', 'validate');
  form.append('officer_conflict', 'skip');
  res = await fetch(`${BASE}/import/data`, { method: 'POST', headers: auth, body: form });
  body = await res.json();
  const s = body.data?.summary;
  check('POST /import/data validate runs', res.status === 200 && !!s, `status=${res.status} ${body.message || ''}`);
  check('  colleges: 1 ok / 1 error', s?.colleges.ok === 1 && s?.colleges.errors === 1, JSON.stringify(s?.colleges));
  check(
    `  officers: 1 ok / ${existingCollege ? '1 skip / ' : ''}1 error`,
    s?.officers.ok === 1 && s?.officers.errors === 1 && (!existingCollege || s?.officers.skipped === 1),
    JSON.stringify(s?.officers)
  );

  const dbCheck = await pool.query("SELECT COUNT(*) FROM colleges WHERE college_code = 'ZZ_IMP'");
  check('  dry run wrote nothing to DB', dbCheck.rows[0].count === '0');

  // --- 6. Commit refused when errors exist ---
  form.set('mode', 'commit');
  res = await fetch(`${BASE}/import/data`, { method: 'POST', headers: auth, body: form });
  check('commit refused while errors exist (400)', res.status === 400, `status=${res.status}`);

  // --- 7. Cleanup: delete the CRUD test college ---
  res = await fetch(`${BASE}/colleges/${testCollegeId}`, { method: 'DELETE', headers: auth });
  check('DELETE /colleges/:id removes unused college', res.status === 200, `status=${res.status}`);

  res = await fetch(`${BASE}/colleges`, { headers: auth });
  body = await res.json();
  check('college count back to baseline', body.count === collegeCountBefore, `${body.count} vs ${collegeCountBefore}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

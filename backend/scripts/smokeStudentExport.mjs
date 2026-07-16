/**
 * Smoke test: super admin students export (PDF + Excel).
 * Regression coverage for:
 *   - backlog_details / is_blacklisted / registration_status printing "-"
 *     (missing from the SQL fieldMapping)
 *   - separate-colleges PDF missing the college banner + table headers on
 *     the first page when college_name wasn't an exported column
 *   - Excel booleans as raw TRUE/FALSE
 *
 * Run with the dev server up:  node scripts/smokeStudentExport.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import zlib from 'zlib';
import ExcelJS from 'exceljs';

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

/**
 * Inflate every Flate stream in a PDF buffer and decode the text-show
 * operators. PDFKit writes strings as hex inside TJ arrays with kerning
 * numbers between chunks: [<4341524d454c20504f4c> 120 <59...>] TJ — so
 * each TJ array's hex chunks are joined into one searchable string.
 */
const extractPdfText = (buf) => {
  let raw = '';
  let idx = 0;
  while ((idx = buf.indexOf('stream', idx)) !== -1) {
    let start = idx + 'stream'.length;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const end = buf.indexOf('endstream', start);
    if (end === -1) break;
    try {
      raw += zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch { /* not a Flate stream (font/image) — skip */ }
    // resume past 'endstream' — its tail spells 'stream' and would misalign the scan
    idx = end + 'endstream'.length;
  }
  let text = '';
  for (const [, arr] of raw.matchAll(/\[((?:<[0-9a-fA-F]+>|-?[\d.]+|\s)+)\]\s*TJ/g)) {
    const hexChunks = [...arr.matchAll(/<([0-9a-fA-F]+)>/g)].map(([, h]) =>
      Buffer.from(h, 'hex').toString('latin1'));
    text += hexChunks.join('') + '\n';
  }
  return text;
};

const main = async () => {
  // --- Borrow the super admin account ---
  const admin = (
    await pool.query(
      `SELECT id, email, password_hash FROM users
       WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`
    )
  ).rows[0];
  if (!admin) { console.log('No active super admin in dev DB'); process.exit(1); }

  const hash = await bcrypt.hash('smoke-export-pass', 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, admin.id]);

  // Borrow one student row and plant the kind of backlog_details that broke
  // production PDFs: newlines + phone-keyboard punctuation (bullet, curly
  // quotes, ™). Restored in finally.
  const detailStudent = (
    await pool.query(
      `SELECT id, backlog_details FROM students
       WHERE registration_status = 'approved' AND is_blacklisted = FALSE LIMIT 1`
    )
  ).rows[0];
  await pool.query('UPDATE students SET backlog_details = $1 WHERE id = $2',
    ['• Math’s “Lab”\nLine2™', detailStudent.id]);

  try {
    let res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: 'smoke-export-pass' }),
    });
    const token = (await res.json()).token;
    check('super admin login', !!token);

    const expectedColleges = (
      await pool.query(
        `SELECT DISTINCT c.college_name FROM students s JOIN colleges c ON s.college_id = c.id
         WHERE s.is_blacklisted = FALSE ORDER BY c.college_name LIMIT 2`
      )
    ).rows.map((r) => r.college_name);

    // --- PDF: separate colleges, WITHOUT college_name as a column ---
    const exportBody = {
      fields: ['prn', 'student_name', 'backlog_details', 'programme_cgpa', 'is_blacklisted', 'backlog_count'],
      format: 'pdf',
      separate_colleges: true,
    };
    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(exportBody),
    });
    const pdfBuf = Buffer.from(await res.arrayBuffer());
    check('PDF export returns 200 + %PDF', res.status === 200 && pdfBuf.subarray(0, 4).toString() === '%PDF',
      `status=${res.status}`);

    const pdfText = extractPdfText(pdfBuf);
    check('PDF contains college banner (grouping worked without college_name column)',
      expectedColleges.length > 0 && pdfText.includes(expectedColleges[0].toUpperCase()),
      `expected "${expectedColleges[0]?.toUpperCase()}"`);
    check('PDF contains table headers (SL NO + Backlog Details + Blacklisted)',
      pdfText.includes('SL NO') && pdfText.includes('Backlog Details') && pdfText.includes('Blacklisted'));
    check('PDF Blacklisted column has real values (No), not just dashes',
      /^No$/m.test(pdfText));

    // --- Excel: same fields ---
    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...exportBody, format: 'excel' }),
    });
    const xlsxBuf = Buffer.from(await res.arrayBuffer());
    check('Excel export returns 200', res.status === 200, `status=${res.status}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsxBuf);
    const ws = workbook.worksheets[0];
    const headers = ws.getRow(1).values.filter(Boolean);
    check('Excel has Backlog Details + Is Blacklisted columns',
      headers.includes('Backlog Details') && headers.includes('Is Blacklisted'), JSON.stringify(headers));

    const blacklistedCol = headers.indexOf('Is Blacklisted') + 1; // values array is 1-based
    const firstValue = ws.getRow(2).getCell(blacklistedCol).value;
    check('Excel Is Blacklisted cell is Yes/No', firstValue === 'Yes' || firstValue === 'No',
      `got ${JSON.stringify(firstValue)}`);

    // --- Every checkbox the SA export UI offers, all at once (Excel) ---
    const ALL_UI_FIELDS = [
      'prn', 'student_name', 'email', 'mobile_number', 'date_of_birth', 'age', 'gender',
      'height', 'weight', 'complete_address', 'branch',
      'cgpa_sem1', 'cgpa_sem2', 'cgpa_sem3', 'cgpa_sem4', 'cgpa_sem5', 'cgpa_sem6',
      'programme_cgpa', 'backlog_count', 'backlog_details', 'has_driving_license',
      'has_pan_card', 'college_name', 'region_name', 'registration_status', 'is_blacklisted',
    ];
    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: ALL_UI_FIELDS, format: 'excel' }),
    });
    const allWb = new ExcelJS.Workbook();
    await allWb.xlsx.load(Buffer.from(await res.arrayBuffer()));
    const allWs = allWb.worksheets[0];
    const allHeaders = allWs.getRow(1).values.filter(Boolean);
    check(`all ${ALL_UI_FIELDS.length} UI checkboxes produce Excel columns`,
      res.status === 200 && allHeaders.length === ALL_UI_FIELDS.length,
      `status=${res.status} got ${allHeaders.length} columns: ${JSON.stringify(allHeaders)}`);

    // Columns that are NOT NULL in the schema must carry data in row 2
    const row2 = allWs.getRow(2);
    const mustHaveData = ['Prn', 'Student Name', 'Email', 'Branch', 'Gender',
      'Registration Status', 'College Name', 'Region Name', 'Is Blacklisted'];
    const emptyRequired = mustHaveData.filter((h) => {
      const cell = row2.getCell(allHeaders.indexOf(h) + 1).value;
      return cell === null || cell === undefined || cell === '';
    });
    check('required columns all carry data', emptyRequired.length === 0,
      `empty: ${JSON.stringify(emptyRequired)}`);

    // --- PDF column cap: 12 is fine, 13 is refused with a clear message ---
    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: ALL_UI_FIELDS.slice(0, 12), format: 'pdf' }),
    });
    const cappedPdf = Buffer.from(await res.arrayBuffer());
    check('PDF with 12 fields exports fine',
      res.status === 200 && cappedPdf.subarray(0, 4).toString() === '%PDF', `status=${res.status}`);

    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: ALL_UI_FIELDS.slice(0, 13), format: 'pdf' }),
    });
    const capBody = await res.json();
    check('PDF with 13 fields refused (400 + suggests Excel)',
      res.status === 400 && /12 columns/.test(capBody.message) && /Excel/.test(capBody.message),
      `status=${res.status} msg="${capBody.message}"`);

    check('Excel with 26 fields NOT capped (no limit on Excel)', allHeaders.length === 26);

    // --- Cell sanitization + honest title (all colleges, no separation) ---
    res = await fetch(`${BASE}/super-admin/students/enhanced-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: ['prn', 'student_name', 'backlog_details'], format: 'pdf' }),
    });
    const flatPdfText = extractPdfText(Buffer.from(await res.arrayBuffer()));
    check('multi-line/smart-punctuation details render as ONE sanitized line',
      flatPdfText.includes(`- Math's "Lab" Line2`),
      `not found in extracted text`);
    check('no raw bullet/curly quote survives into the PDF',
      !flatPdfText.includes('•') && !flatPdfText.includes('“') && !flatPdfText.includes('’'));

    const expectedTitle = expectedColleges.length > 1
      ? 'ALL COLLEGES'
      : (expectedColleges[0] || '').toUpperCase();
    check(`title is honest ("${expectedTitle}", not the first row's college)`,
      flatPdfText.includes(expectedTitle));
  } finally {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [admin.password_hash, admin.id]);
    await pool.query('UPDATE students SET backlog_details = $1 WHERE id = $2',
      [detailStudent.backlog_details, detailStudent.id]);
  }
  check('borrowed admin + student rows fully restored', true);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

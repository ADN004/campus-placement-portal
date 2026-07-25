/**
 * Smoke test: "send back for correction" for approved students.
 *
 * A PO/SA flags an approved student for correction (optionally taking their
 * photo down). The student stays approved, edits the flagged details, uploads
 * a new photo if required, and clears the flag — no re-approval.
 *
 * Uses throwaway approved students (one at the PO's college, one elsewhere) so
 * no real student is touched; a real 1x1 PNG is uploaded to Cloudinary and
 * deleted again in finally.
 *
 * Run with the dev server up:  node scripts/smokeStudentCorrection.mjs
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { deleteImage } from '../config/cloudinary.js';

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

// 1x1 transparent PNG
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const login = async (id, pw) =>
  (await (await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: id, password: pw }),
  })).json());

const dbGet = async (id, cols) =>
  (await pool.query(`SELECT ${cols} FROM students WHERE id=$1`, [id])).rows[0];

const main = async () => {
  const admin = (await pool.query(`SELECT id,email,password_hash FROM users WHERE role='super_admin' AND is_active=TRUE LIMIT 1`)).rows[0];
  const officer = (await pool.query(
    `SELECT po.user_id, po.college_id, u.email, u.password_hash FROM placement_officers po JOIN users u ON po.user_id=u.id
     WHERE po.is_active=TRUE AND u.is_active=TRUE ORDER BY po.id LIMIT 1`)).rows[0];
  if (!admin || !officer) { console.error('Need SA + active PO. Aborting.'); await pool.end(); process.exit(1); }

  const otherCollege = (await pool.query('SELECT id FROM colleges WHERE id <> $1 LIMIT 1', [officer.college_id])).rows[0].id;
  const regionOf = async (cid) => (await pool.query('SELECT region_id FROM colleges WHERE id=$1', [cid])).rows[0].region_id;

  const adminPass = 'smoke-corr-admin', poPass = 'smoke-corr-po', stuPass = 'smoke-corr-stu';
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(adminPass, 10), admin.id]);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(poPass, 10), officer.user_id]);

  const created = []; // {userId, studentId, prn}
  const mkStudent = async (collegeId, tag) => {
    const prn = `8888${Date.now().toString().slice(-8)}${created.length}`;
    const u = await pool.query(
      `INSERT INTO users (email,password_hash,role,is_active) VALUES ($1,$2,'student',TRUE) RETURNING id`,
      [`zz.smoke.corr.${tag}@example.com`, await bcrypt.hash(stuPass, 10)]);
    const s = await pool.query(
      `INSERT INTO students (user_id,prn,region_id,college_id,email,mobile_number,date_of_birth,programme_cgpa,backlog_count,
         student_name,branch,gender,registration_status,photo_url,photo_cloudinary_id)
       VALUES ($1,$2,$3,$4,$5,'9990001111','2004-01-01',8.0,'All cleared','Original Name','Original Branch','Male','approved',NULL,NULL)
       RETURNING id`,
      [u.rows[0].id, prn, await regionOf(collegeId), collegeId, `zz.smoke.corr.${tag}@example.com`]);
    created.push({ userId: u.rows[0].id, studentId: s.rows[0].id, prn });
    return { userId: u.rows[0].id, studentId: s.rows[0].id, prn };
  };

  let photoIdToClean = null;
  try {
    const A = await mkStudent(officer.college_id, 'a');   // PO's college
    const B = await mkStudent(otherCollege, 'b');          // different college

    const poToken = (await login(officer.email, poPass)).token;
    check('PO logged in', !!poToken);
    const po = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${poToken}` },
      body: body ? JSON.stringify(body) : undefined });

    // --- guards ---
    let res = await po(`/placement-officer/students/${B.studentId}/request-correction`, 'POST', { note: 'x', require_photo: false });
    check('PO cannot correct another college\'s student → 403', res.status === 403, String(res.status));

    res = await po(`/placement-officer/students/${A.studentId}/request-correction`, 'POST', { require_photo: true });
    check('missing note → 400', res.status === 400);

    // --- request correction with photo takedown ---
    res = await po(`/placement-officer/students/${A.studentId}/request-correction`, 'POST',
      { note: 'Your branch is wrong and the photo is inappropriate — please fix both.', require_photo: true });
    check('request correction (photo) → 200', res.status === 200, String(res.status));
    let a = await dbGet(A.studentId, 'correction_requested, correction_photo_required, correction_note, photo_url, photo_cloudinary_id');
    check('correction_requested set', a.correction_requested === true);
    check('correction_photo_required set', a.correction_photo_required === true);
    check('photo taken down (nulled)', a.photo_url === null && a.photo_cloudinary_id === null);

    // --- student side ---
    const stuToken = (await login(A.prn, stuPass)).token;
    check('student A logged in (still approved)', !!stuToken);
    const stu = (path, method, body) => fetch(`${BASE}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stuToken}` },
      body: body ? JSON.stringify(body) : undefined });

    res = await stu('/students/correction-status', 'GET');
    let body = (await res.json()).data;
    check('status shows the note + photo required', body.correction_requested === true && body.correction_photo_required === true && /branch/i.test(body.correction_note));

    res = await stu('/students/correction/resolve', 'POST');
    check('resolve blocked until photo uploaded → 400', res.status === 400);

    // edit a core field while correction is active
    res = await stu('/students/profile', 'PUT', { student_name: 'Corrected Name', branch: 'Corrected Branch' });
    check('core-field edit allowed during correction → 200', res.status === 200, String(res.status));
    a = await dbGet(A.studentId, 'student_name, branch');
    check('name + branch actually changed', a.student_name === 'Corrected Name' && a.branch === 'Corrected Branch', JSON.stringify(a));

    // upload a new photo (guard first: wrong flag path is covered by B which never had a correction)
    res = await stu('/students/photo', 'POST', { photo_base64: TINY_PNG });
    check('photo re-upload → 200', res.status === 200, String(res.status));
    a = await dbGet(A.studentId, 'photo_url, photo_cloudinary_id, correction_photo_required');
    photoIdToClean = a.photo_cloudinary_id;
    check('photo set + requirement cleared', !!a.photo_url && a.correction_photo_required === false);

    // student B never had a correction — photo endpoint must refuse
    const bToken = (await login(B.prn, stuPass)).token;
    res = await fetch(`${BASE}/students/photo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bToken}` },
      body: JSON.stringify({ photo_base64: TINY_PNG }) });
    check('photo upload refused without a correction → 400', res.status === 400);

    // now resolve
    res = await stu('/students/correction/resolve', 'POST');
    check('resolve after photo → 200', res.status === 200, String(res.status));
    a = await dbGet(A.studentId, 'correction_requested, correction_note');
    check('correction cleared', a.correction_requested === false && a.correction_note === null);

    // core fields locked again once correction is done
    res = await stu('/students/profile', 'PUT', { student_name: 'Should Not Change' });
    a = await dbGet(A.studentId, 'student_name');
    check('core-field edit ignored after correction cleared', a.student_name === 'Corrected Name', a.student_name);

    // --- SA side + non-approved guard ---
    const saToken = (await login(admin.email, adminPass)).token;
    res = await fetch(`${BASE}/super-admin/students/${A.studentId}/request-correction`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ note: 'SA asks: fix your address', require_photo: false }) });
    check('SA can request correction → 200', res.status === 200, String(res.status));

    await pool.query("UPDATE students SET registration_status='pending' WHERE id=$1", [A.studentId]);
    res = await po(`/placement-officer/students/${A.studentId}/request-correction`, 'POST', { note: 'x', require_photo: false });
    check('correction refused for non-approved student → 400', res.status === 400);
  } finally {
    // Restore the borrowed accounts FIRST — nothing below may throw before this
    // runs, or the real SA/PO would be left on the smoke password.
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [admin.password_hash, admin.id]).catch((e) => console.error('restore admin:', e.message));
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [officer.password_hash, officer.user_id]).catch((e) => console.error('restore officer:', e.message));
    if (photoIdToClean) { try { await deleteImage(photoIdToClean); } catch { /* ignore */ } }
    // Throwaway users generate activity_logs (login etc.) which FK-reference
    // users — clear those before deleting the user, or the delete fails.
    const ids = created.map((c) => c.userId);
    if (ids.length) {
      await pool.query('DELETE FROM activity_logs WHERE user_id = ANY($1::int[])', [ids]).catch((e) => console.error('clear logs:', e.message));
      await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids]).catch((e) => console.error('delete users:', e.message)); // cascades students
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch((e) => { console.error('SMOKE TEST CRASHED:', e.message); process.exit(1); });

/**
 * Smoke test for single-college mode (portal settings + adaptive job flows).
 * Runs against the local dev server on :5000.
 *
 * Temporarily deactivates all but one college to simulate a single-college
 * deployment, exercises every new behavior, then RESTORES everything:
 * college active flags, portal settings, and all test jobs/requests.
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

const jobPayload = (title) => ({
  job_title: title,
  company_name: 'ZZ Smoke Co',
  job_description: 'Smoke test job',
  application_deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  application_form_url: 'https://example.com/apply',
  target_type: 'college',
});

const main = async () => {
  // --- Tokens ---
  const adminRow = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1"
  );
  const adminToken = jwt.sign({ id: adminRow.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const adminAuth = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // An active officer whose college we will keep active
  const officerRow = await pool.query(
    `SELECT po.user_id, po.college_id FROM placement_officers po
     JOIN colleges c ON po.college_id = c.id
     JOIN users u ON po.user_id = u.id
     WHERE po.is_active = TRUE AND c.is_active = TRUE AND u.is_active = TRUE LIMIT 1`
  );
  if (officerRow.rows.length === 0) throw new Error('No active officer in dev DB');
  const keepCollegeId = officerRow.rows[0].college_id;
  const officerToken = jwt.sign({ id: officerRow.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const officerAuth = { Authorization: `Bearer ${officerToken}`, 'Content-Type': 'application/json' };

  // ============ MULTI-COLLEGE MODE (current state) ============
  let res = await fetch(`${BASE}/common/portal-info`);
  let body = await res.json();
  check('portal-info public, multi-college mode', res.status === 200 && body.data.single_college === false,
    `status=${res.status} ${JSON.stringify(body.data || {})}`);

  res = await fetch(`${BASE}/super-admin/portal-settings`, {
    method: 'PUT', headers: adminAuth,
    body: JSON.stringify({ single_college_require_job_approval: true }),
  });
  check('enabling approval policy REFUSED in multi-college mode (400)', res.status === 400, `status=${res.status}`);

  // ============ SIMULATE SINGLE-COLLEGE MODE ============
  const snapshot = await pool.query(
    'SELECT id FROM colleges WHERE is_active = TRUE AND id != $1', [keepCollegeId]
  );
  const deactivatedIds = snapshot.rows.map((r) => r.id);
  await pool.query('UPDATE colleges SET is_active = FALSE WHERE id = ANY($1::int[])', [deactivatedIds]);
  console.log(`  (simulating: deactivated ${deactivatedIds.length} colleges, keeping #${keepCollegeId})`);

  const cleanupIds = { jobs: [], requests: [] };
  try {
    res = await fetch(`${BASE}/common/portal-info`);
    body = await res.json();
    check('portal-info flips to single-college mode', body.data.single_college === true && body.data.active_colleges === 1);

    // Default behavior unchanged: own-college post auto-approves
    res = await fetch(`${BASE}/placement-officer/job-requests`, {
      method: 'POST', headers: officerAuth, body: JSON.stringify(jobPayload('ZZ Single Default')),
    });
    body = await res.json();
    check('toggle OFF (default): officer post auto-approved', res.status === 201 && body.auto_approved === true,
      `status=${res.status} ${body.message || ''}`);
    if (body.data?.id) cleanupIds.requests.push(body.data.id);

    // Enable the approval policy
    res = await fetch(`${BASE}/super-admin/portal-settings`, {
      method: 'PUT', headers: adminAuth,
      body: JSON.stringify({ single_college_require_job_approval: true }),
    });
    check('enabling approval policy allowed in single-college mode', res.status === 200, `status=${res.status}`);

    res = await fetch(`${BASE}/common/portal-info`);
    body = await res.json();
    check('portal-info reports approval requirement', body.data.single_college_require_job_approval === true);

    // Officer post now goes to the pending queue
    res = await fetch(`${BASE}/placement-officer/job-requests`, {
      method: 'POST', headers: officerAuth, body: JSON.stringify(jobPayload('ZZ Single Pending')),
    });
    body = await res.json();
    check('toggle ON: officer post requires approval (pending)', res.status === 201 && body.auto_approved === false,
      `status=${res.status} ${body.message || ''}`);
    const pendingRequestId = body.data?.id;
    if (pendingRequestId) cleanupIds.requests.push(pendingRequestId);

    const pendingRow = await pool.query('SELECT status, target_colleges FROM job_requests WHERE id = $1', [pendingRequestId]);
    check('  pending request pinned to own college',
      pendingRow.rows[0]?.status === 'pending' &&
      JSON.stringify(pendingRow.rows[0]?.target_colleges) === JSON.stringify([keepCollegeId]),
      JSON.stringify(pendingRow.rows[0] || {}));

    // Super admin approves it through the normal queue → becomes a job
    res = await fetch(`${BASE}/super-admin/jobs/requests/${pendingRequestId}/approve`, {
      method: 'PUT', headers: adminAuth,
    });
    body = await res.json();
    check('pending request approved via existing queue', res.status === 200, `status=${res.status} ${body.message || ''}`);

    // Super admin job with target "all" gets pinned to the single college
    res = await fetch(`${BASE}/super-admin/jobs`, {
      method: 'POST', headers: adminAuth,
      body: JSON.stringify({
        title: 'ZZ Pinned Job', company_name: 'ZZ Smoke Co', description: 'Smoke',
        application_form_url: 'https://example.com/apply',
        application_deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        target_type: 'all',
      }),
    });
    body = await res.json();
    check('super admin "all" job pinned to the single college',
      res.status === 201 && body.data.target_type === 'college' &&
      JSON.stringify(body.data.target_colleges) === JSON.stringify([keepCollegeId]),
      `status=${res.status} type=${body.data?.target_type} colleges=${JSON.stringify(body.data?.target_colleges)}`);
    if (body.data?.id) cleanupIds.jobs.push(body.data.id);

    // Disable policy again → auto-approval returns
    res = await fetch(`${BASE}/super-admin/portal-settings`, {
      method: 'PUT', headers: adminAuth,
      body: JSON.stringify({ single_college_require_job_approval: false }),
    });
    check('policy can be disabled again', res.status === 200, `status=${res.status}`);

    res = await fetch(`${BASE}/placement-officer/job-requests`, {
      method: 'POST', headers: officerAuth, body: JSON.stringify(jobPayload('ZZ Single Back To Auto')),
    });
    body = await res.json();
    check('toggle OFF again: officer post auto-approved', res.status === 201 && body.auto_approved === true,
      `status=${res.status}`);
    if (body.data?.id) cleanupIds.requests.push(body.data.id);
  } finally {
    // ============ RESTORE EVERYTHING ============
    await pool.query('UPDATE colleges SET is_active = TRUE WHERE id = ANY($1::int[])', [deactivatedIds]);
    await pool.query("DELETE FROM portal_settings WHERE setting_key = 'single_college_require_job_approval'");
    if (cleanupIds.requests.length > 0) {
      await pool.query('DELETE FROM jobs WHERE source_job_request_id = ANY($1::int[])', [cleanupIds.requests]);
      await pool.query('DELETE FROM job_request_requirement_templates WHERE job_request_id = ANY($1::int[])', [cleanupIds.requests]);
      await pool.query('DELETE FROM job_requests WHERE id = ANY($1::int[])', [cleanupIds.requests]);
    }
    if (cleanupIds.jobs.length > 0) {
      await pool.query('DELETE FROM jobs WHERE id = ANY($1::int[])', [cleanupIds.jobs]);
    }
  }

  // Verify restoration
  res = await fetch(`${BASE}/common/portal-info`);
  body = await res.json();
  check('multi-college mode restored', body.data.single_college === false,
    JSON.stringify(body.data || {}));
  const leftovers = await pool.query(
    "SELECT COUNT(*) FROM jobs WHERE company_name = 'ZZ Smoke Co'"
  );
  check('all test jobs cleaned up', leftovers.rows[0].count === '0', `${leftovers.rows[0].count} left`);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
};

main().catch(async (e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  process.exit(1);
});

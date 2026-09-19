#!/usr/bin/env node
/**
 * Does every shape of logActivity call actually write a row?
 *
 * activity_logs.entity_id is an integer and action_description is NOT NULL, and
 * logActivity swallows its own errors -- so a call that gets the argument order
 * wrong does not fail the action that made it. It just quietly writes nothing.
 * Production logged "invalid input syntax for type integer" on every bulk
 * status update while the update itself succeeded, which is exactly the shape
 * of bug that survives for months: the feature works, and the audit trail an
 * administrator will one day go looking for was never there.
 *
 * So every call shape in the codebase is exercised against the real table and
 * the row is read back.
 *
 * Runs against a scratch database, not your real one:
 *   DB_NAME=spc_log_check node backend/scripts/smokeActivityLog.mjs
 */
import { query, closePool } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const OFF = '\x1b[0m';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`${GREEN} ok ${OFF} ${label}`);
  else {
    failures += 1;
    console.log(`${RED}FAIL${OFF} ${label}${detail ? `\n       ${detail}` : ''}`);
  }
};

if ((process.env.DB_NAME || '') === 'campus_placement_portal') {
  console.error('Refusing to run against campus_placement_portal.');
  process.exit(1);
}

/** A stand-in for an Express request, matched by shape rather than by type. */
const fakeReq = {
  ip: '203.0.113.9',
  method: 'POST',
  headers: {},
  get: (h) => (h === 'user-agent' ? 'smoke-test' : null),
};

const lastRow = async () => {
  const r = await query(
    `SELECT action_type, action_description, entity_type, entity_id, metadata,
            ip_address, user_agent
       FROM activity_logs ORDER BY id DESC LIMIT 1`
  );
  return r.rows[0] || null;
};

const countRows = async () => {
  const r = await query('SELECT COUNT(*)::int AS n FROM activity_logs');
  return r.rows[0].n;
};

async function main() {
  await query('TRUNCATE activity_logs, users RESTART IDENTITY CASCADE');
  const u = await query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ('log@t.local','x','super_admin') RETURNING id`
  );
  const userId = u.rows[0].id;

  /* ------------------------------------------- the shape that was failing */

  // logActivity(user, 'UPDATE', 'job_applications', 42, { ... })
  // actionDescription is omitted, so everything after it shifts left and the
  // metadata object lands in the integer entity_id column.
  await logActivity(userId, 'UPDATE', 'job_applications', 42, {
    action: 'bulk_update_application_status',
    new_status: 'under_review',
    batch_id: '3f282afa-d40f-4e54-8863-04c88b5fa5dd',
  });

  let row = await lastRow();
  check('the short form writes a row at all', row !== null,
    'nothing was written — the insert was rejected and swallowed');

  check('the id lands in entity_id, not the metadata object',
    row?.entity_id === 42, `entity_id = ${JSON.stringify(row?.entity_id)}`);

  check('the entity type is the table name',
    row?.entity_type === 'job_applications', `entity_type = ${row?.entity_type}`);

  check('the description falls back to the metadata action',
    row?.action_description === 'bulk_update_application_status',
    `action_description = ${row?.action_description}`);

  check('the metadata survives intact',
    row?.metadata?.batch_id === '3f282afa-d40f-4e54-8863-04c88b5fa5dd',
    JSON.stringify(row?.metadata));

  /* ------------------------------------------------ short form, null id */

  // logActivity(user, 'CREATE', 'notifications', null, { ... })
  await logActivity(userId, 'CREATE', 'notifications', null, {
    action: 'send_application_notifications', count: 5,
  });
  row = await lastRow();
  check('a short-form call with no id stores a null id, not a failure',
    row?.entity_type === 'notifications' && row?.entity_id === null
      && row?.metadata?.count === 5,
    JSON.stringify(row));

  /* -------------------------------------------- short form carrying a req */

  // logActivity(user, 'UPDATE', 'job_cascade_schedule', 7, { ... }, req)
  await logActivity(userId, 'UPDATE', 'job_cascade_schedule', 7,
    { action: 'cancel_round_closure', job_id: 3 }, fakeReq);
  row = await lastRow();
  check('a short-form call still records the request address',
    row?.entity_id === 7 && row?.ip_address === '203.0.113.9'
      && row?.user_agent === 'smoke-test',
    JSON.stringify(row));

  /* ------------------------------------------------- the documented order */

  await logActivity(userId, 'DELETE', 'removed a student', 'students', 11,
    fakeReq, { action: 'remove', prn: 'P1' });
  row = await lastRow();
  check('the documented argument order is unchanged',
    row?.action_type === 'DELETE'
      && row?.action_description === 'removed a student'
      && row?.entity_type === 'students'
      && row?.entity_id === 11
      && row?.metadata?.prn === 'P1'
      && row?.ip_address === '203.0.113.9',
    JSON.stringify(row));

  /* ------------------------------ the historical req/metadata swap, still */

  await logActivity(userId, 'UPDATE', 'swapped args', 'students', 12,
    { action: 'swap', prn: 'P2' }, fakeReq);
  row = await lastRow();
  check('the older req/metadata swap is still healed',
    row?.entity_id === 12 && row?.metadata?.prn === 'P2'
      && row?.ip_address === '203.0.113.9',
    JSON.stringify(row));

  /* ---------------------------------------------------- nothing is lost */

  check('every call wrote exactly one row', (await countRows()) === 5,
    `${await countRows()} rows for 5 calls`);

  console.log('');
  if (failures) {
    console.log(`${RED}${failures} check(s) failed${OFF}`);
    process.exitCode = 1;
  } else {
    console.log(`${GREEN}all checks passed${OFF}`);
  }
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await closePool();
}

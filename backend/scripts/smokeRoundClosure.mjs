#!/usr/bin/env node
/**
 * Does closing a round actually do what it says?
 *
 * The cascade rejects people automatically, which puts it in a small class of
 * features where a bug is not a wrong number on a screen but a student told
 * they are out of a job they were still in the running for. So it is exercised
 * end to end against real tables rather than reasoned about.
 *
 * Nine checks, each stating what would be wrong in production if it failed:
 *
 *   1. An application starts at under_review, not 'submitted'.
 *   2. Shortlisting opens a countdown, and does not reject anybody yet.
 *   3. The countdown is not due before the grace period is up.
 *   4. Further marking pushes the date back.
 *   5. A sweep before the due date changes nothing.
 *   6. A sweep after it rejects exactly the people left behind, and nobody else.
 *   7. Those people get told, once, in the portal.
 *   8. Undo puts every one of them back where they were.
 *   9. A joint college's officer cannot reach another college's students.
 *
 * Runs against a scratch database, not your real one:
 *   DB_NAME=spc_lifecycle_check node backend/scripts/smokeRoundClosure.mjs
 */
import { query, getClient, closePool } from '../config/database.js';
import {
  applyStatusChange, syncCascadeForJob, runDueCascades, undoBatch,
  cascadeTargets, getCascadeConfig, outstandingColleges, isRevert,
} from '../utils/applicationLifecycle.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) {
    console.log(`${GREEN} ok ${OFF} ${label}`);
  } else {
    failures += 1;
    console.log(`${RED}FAIL${OFF} ${label}${detail ? `\n       ${detail}` : ''}`);
  }
};

if ((process.env.DB_NAME || '') === 'campus_placement_portal') {
  console.error('Refusing to run against campus_placement_portal. Set DB_NAME to a scratch database.');
  process.exit(1);
}

/* ------------------------------------------------------------------ setup */

async function reset() {
  // Truncate rather than drop: the schema under test is the one being verified.
  await query(`TRUNCATE
    application_status_events, job_cascade_schedule, notification_recipients,
    notifications, job_applications, job_drives, jobs, students,
    placement_officers, colleges, regions, users RESTART IDENTITY CASCADE`);
}

async function seed() {
  const region = await query(
    `INSERT INTO regions (region_name, region_code) VALUES ('TEST REGION','TR') RETURNING id`
  );
  const regionId = region.rows[0].id;

  const colleges = [];
  for (const [name, code] of [['Host College', 'HC'], ['Joint College', 'JC']]) {
    const r = await query(
      `INSERT INTO colleges (college_name, college_code, region_id) VALUES ($1,$2,$3) RETURNING id`,
      [name, code, regionId]
    );
    colleges.push(r.rows[0].id);
  }

  const admin = await query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ('admin@test.local','x','super_admin') RETURNING id`
  );
  const adminId = admin.rows[0].id;

  // One officer per college, so the joint-college scoping check has somebody
  // real to be scoped.
  const officers = [];
  for (let i = 0; i < colleges.length; i += 1) {
    const u = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,'x','placement_officer') RETURNING id`,
      [`officer${i}@test.local`]
    );
    const po = await query(
      `INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [u.rows[0].id, colleges[i], `Officer ${i}`, `900000000${i}`]
    );
    officers.push({ userId: u.rows[0].id, officerId: po.rows[0].id, collegeId: colleges[i] });
  }

  const job = await query(
    `INSERT INTO jobs (job_title, company_name, job_description, application_form_url,
       application_start_date, application_deadline, created_by, placement_officer_id)
     VALUES ('Test Role','Test Co','desc','https://example.com',
       CURRENT_DATE - 30, CURRENT_DATE - 1, $1, $2)
     RETURNING id`,
    [adminId, officers[0].officerId]
  );
  const jobId = job.rows[0].id;

  // Six students, three per college.
  const students = [];
  for (let i = 0; i < 6; i += 1) {
    const collegeId = colleges[i < 3 ? 0 : 1];
    const u = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1,'x','student') RETURNING id`,
      [`student${i}@test.local`]
    );
    const s = await query(
      `INSERT INTO students (user_id, prn, region_id, college_id, email, mobile_number,
         date_of_birth, programme_cgpa, backlog_count, student_name)
       VALUES ($1,$2,$3,$4,$5,$6,'2004-01-01',8.0,'0',$7) RETURNING id`,
      [u.rows[0].id, `PRN${1000 + i}`, regionId, collegeId,
        `student${i}@test.local`, `98000000${i}`, `Student ${i}`]
    );
    const a = await query(
      `INSERT INTO job_applications (job_id, student_id, application_status, status_source)
       VALUES ($1,$2,'under_review','student_apply') RETURNING id`,
      [jobId, s.rows[0].id]
    );
    students.push({ studentId: s.rows[0].id, applicationId: a.rows[0].id, collegeId });
  }

  return { jobId, adminId, officers, colleges, students };
}

const statusOf = async (applicationId) => {
  const r = await query(
    'SELECT application_status, status_source FROM job_applications WHERE id = $1',
    [applicationId]
  );
  return r.rows[0];
};

const inTransaction = async (fn) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ tests */

async function main() {
  await reset();
  const { jobId, adminId, officers, students } = await seed();
  const { days } = await getCascadeConfig();

  console.log(`${DIM}grace period: ${days} days${OFF}\n`);

  // 1 -- an application starts where it should
  const first = await statusOf(students[0].applicationId);
  check(
    'a new application is under_review, not the retired "submitted"',
    first.application_status === 'under_review',
    `got "${first.application_status}"`
  );

  // 2 -- shortlisting opens a countdown and rejects nobody yet.
  //
  // Students 0 and 1 are at the host college. The countdown that opens must be
  // for that college alone: the joint college's officer has not decided
  // anything, and closing their round on the host's work would reject students
  // nobody ever judged.
  await inTransaction(async (client) => {
    const changed = await applyStatusChange(client, {
      applicationIds: [students[0].applicationId, students[1].applicationId],
      status: 'shortlisted',
      source: 'officer',
      actorUserId: officers[0].userId,
    });
    await syncCascadeForJob(client, {
      jobId,
      scopeCollegeIds: changed.map((r) => r.college_id),
      actorUserId: officers[0].userId,
      statuses: ['shortlisted'],
    });
  });

  let schedules = await query(
    `SELECT * FROM job_cascade_schedule WHERE job_id = $1 AND executed_at IS NULL`,
    [jobId]
  );
  check(
    'shortlisting opens exactly one countdown',
    schedules.rows.length === 1 && schedules.rows[0].stage === 'shortlist',
    `got ${schedules.rows.length} row(s)`
  );
  check(
    'the countdown covers only the college that was actually marked',
    schedules.rows[0]?.scope_college_id === officers[0].collegeId,
    `scoped to college ${schedules.rows[0]?.scope_college_id}, expected ${officers[0].collegeId}`
  );

  const untouched = await statusOf(students[2].applicationId);
  check(
    'the people left behind are not rejected on the spot',
    untouched.application_status === 'under_review',
    `got "${untouched.application_status}"`
  );

  // 3 -- the countdown honours the grace period
  const due = new Date(schedules.rows[0].due_at);
  const daysOut = Math.round((due - new Date()) / 86400000);
  check(
    `the countdown is ~${days} days out, not immediate`,
    daysOut >= days - 1 && daysOut <= days + 1,
    `due in ${daysOut} days`
  );

  // 4 -- more marking pushes it back
  await query(
    `UPDATE job_cascade_schedule SET due_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
      WHERE job_id = $1 AND executed_at IS NULL`,
    [jobId]
  );
  await inTransaction(async (client) => {
    const changed = await applyStatusChange(client, {
      applicationIds: [students[2].applicationId],
      status: 'rejected',
      source: 'officer',
      actorUserId: officers[0].userId,
    });
    await syncCascadeForJob(client, {
      jobId,
      scopeCollegeIds: changed.map((r) => r.college_id),
      actorUserId: officers[0].userId,
      statuses: ['rejected'],
    });
  });
  schedules = await query(
    `SELECT due_at FROM job_cascade_schedule WHERE job_id = $1 AND executed_at IS NULL`,
    [jobId]
  );
  const pushedDays = Math.round((new Date(schedules.rows[0].due_at) - new Date()) / 86400000);
  check(
    'any further marking pushes the countdown back to a full period',
    pushedDays >= days - 1,
    `due in ${pushedDays} days after more activity`
  );

  // 5 -- a sweep before the date does nothing
  const before = await runDueCascades();
  check(
    'a sweep before the due date changes nothing',
    (before.affected || 0) === 0,
    `closed ${before.affected}`
  );

  // 6 -- the joint college is untouched by the host's work
  //
  // The host has now marked all three of their own students. The joint
  // college's three are still under review and its officer has done nothing, so
  // there is no countdown for them and a due sweep must leave them alone.
  const outstanding = await outstandingColleges(query, { jobId });
  check(
    'a college nobody has marked is reported as outstanding, not closed',
    outstanding.length === 1
      && outstanding[0].college_id === officers[1].collegeId
      && outstanding[0].waiting === 3,
    `got ${JSON.stringify(outstanding.map((o) => [o.college_id, o.waiting]))}`
  );

  await query(
    `UPDATE job_cascade_schedule SET due_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
      WHERE job_id = $1 AND executed_at IS NULL`,
    [jobId]
  );
  const hostSweep = await runDueCascades();
  check(
    'the host’s round closing does not reach the joint college',
    (hostSweep.affected || 0) === 0
      && (await statusOf(students[3].applicationId)).application_status === 'under_review',
    `closed ${hostSweep.affected}, student 3 is "${(await statusOf(students[3].applicationId)).application_status}"`
  );

  // 7 -- the joint college's own officer closes their own round
  await inTransaction(async (client) => {
    const changed = await applyStatusChange(client, {
      applicationIds: [students[3].applicationId],
      status: 'shortlisted',
      source: 'officer',
      actorUserId: officers[1].userId,
    });
    await syncCascadeForJob(client, {
      jobId,
      scopeCollegeIds: changed.map((r) => r.college_id),
      actorUserId: officers[1].userId,
      statuses: ['shortlisted'],
    });
  });
  await query(
    `UPDATE job_cascade_schedule SET due_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
      WHERE job_id = $1 AND executed_at IS NULL`,
    [jobId]
  );

  // Students 4 and 5 are the joint college's remainder; 3 was just shortlisted.
  const expected = [students[4], students[5]].map((s) => s.applicationId);
  const after = await runDueCascades();
  check(
    'the joint college’s own marking closes its own round, and only its own',
    after.affected === expected.length,
    `closed ${after.affected}, expected ${expected.length}`
  );

  const shortlistedStill = await statusOf(students[0].applicationId);
  check(
    'the shortlisted are left alone by their own round closing',
    shortlistedStill.application_status === 'shortlisted',
    `got "${shortlistedStill.application_status}"`
  );

  const closed = await statusOf(expected[0]);
  check(
    'a closed application says the round closed it, not that an officer did',
    closed.application_status === 'rejected' && closed.status_source === 'system_cascade',
    `got "${closed.application_status}" / "${closed.status_source}"`
  );

  // 7 -- they are told, once
  const notified = await query(
    `SELECT COUNT(*)::int AS n FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
      WHERE n.notification_type = 'rejection'`
  );
  check(
    'everyone closed is told once, in one notification',
    notified.rows[0].n === expected.length,
    `${notified.rows[0].n} recipient row(s) for ${expected.length} student(s)`
  );

  // 8 -- undo puts them back
  // The one that actually closed somebody. Several schedules run now -- the
  // host college's found nobody left and the joint college's closed two -- and
  // picking whichever came back first would undo an empty batch.
  const batch = await query(
    `SELECT executed_batch_id FROM job_cascade_schedule
      WHERE job_id = $1 AND executed_at IS NOT NULL AND affected_count > 0
      ORDER BY executed_at DESC LIMIT 1`,
    [jobId]
  );
  const undone = await inTransaction((client) =>
    undoBatch(client, { batchId: batch.rows[0].executed_batch_id, actorUserId: adminId })
  );
  const restored = await statusOf(expected[0]);
  check(
    'undo puts every closed application back where it was',
    undone.reverted === expected.length && restored.application_status === 'under_review',
    `reverted ${undone.reverted}, first is now "${restored.application_status}"`
  );

  const stillScheduled = await query(
    `SELECT COUNT(*)::int AS n FROM job_cascade_schedule
      WHERE job_id = $1 AND cancelled_at IS NULL AND executed_at IS NULL`,
    [jobId]
  );
  check(
    'an undone closure does not simply run again tomorrow',
    stillScheduled.rows[0].n === 0,
    `${stillScheduled.rows[0].n} countdown(s) still live`
  );

  // 9 -- a joint college's officer reaches only their own students
  const jointScoped = await cascadeTargets(query, {
    jobId,
    stage: 'shortlist',
    scopeCollegeId: officers[1].collegeId,
  });
  const leaked = jointScoped.filter((t) => t.college_id !== officers[1].collegeId);
  check(
    'a joint college’s countdown can only ever reach that college',
    jointScoped.length > 0 && leaked.length === 0,
    `${jointScoped.length} target(s), ${leaked.length} from another college`
  );

  // 10 -- a drive still to come holds the countdown open past it
  await query(
    `INSERT INTO job_drives (job_id, drive_date, drive_time, drive_location, created_by)
     VALUES ($1, CURRENT_DATE + 20, '10:00', 'Test Hall', $2)`,
    [jobId, adminId]
  );
  await query('UPDATE job_cascade_schedule SET cancelled_at = CURRENT_TIMESTAMP WHERE job_id = $1', [jobId]);
  await inTransaction((client) =>
    syncCascadeForJob(client, {
      jobId,
      scopeCollegeIds: [officers[0].collegeId],
      actorUserId: officers[0].userId,
      statuses: ['shortlisted'],
    })
  );
  const withDrive = await query(
    `SELECT due_at FROM job_cascade_schedule
      WHERE job_id = $1 AND cancelled_at IS NULL AND executed_at IS NULL`,
    [jobId]
  );
  const driveOutDays = Math.round((new Date(withDrive.rows[0].due_at) - new Date()) / 86400000);
  check(
    'a drive still to come holds the countdown open until after it',
    driveOutDays >= 20 + days - 1,
    `due in ${driveOutDays} days, drive is 20 days out plus a ${days}-day period`
  );

  // 11 -- the Super Admin puts a historical marking back
  //
  // The case the Undo banner cannot reach: a student marked selected long
  // before any of this existed, with no batch id to undo. Moving them back is
  // an ordinary status write, and it has to record itself as a correction
  // rather than as a fresh decision.
  check(
    'moving backwards is recognised as a revert, forwards is not',
    isRevert('selected', 'shortlisted')
      && isRevert('rejected', 'under_review')
      && isRevert('shortlisted', 'under_review')
      && !isRevert('under_review', 'shortlisted')
      && !isRevert('shortlisted', 'selected'),
    'rank comparison is wrong'
  );

  const historical = students[0].applicationId;
  await query(
    `UPDATE job_applications SET application_status = 'selected', status_source = 'officer'
      WHERE id = $1`,
    [historical]
  );
  await inTransaction((client) =>
    applyStatusChange(client, {
      applicationIds: [historical],
      status: 'under_review',
      source: 'officer',
      actorUserId: adminId,
    })
  );
  const put_back = await statusOf(historical);
  check(
    'a marking with no batch can still be put back, and reads as a correction',
    put_back.application_status === 'under_review' && put_back.status_source === 'reverted',
    `got "${put_back.application_status}" / "${put_back.status_source}"`
  );

  // A forward move through the same path must NOT be labelled a correction.
  await inTransaction((client) =>
    applyStatusChange(client, {
      applicationIds: [historical],
      status: 'shortlisted',
      source: 'officer',
      actorUserId: adminId,
    })
  );
  const forward = await statusOf(historical);
  check(
    'moving somebody onwards still reads as a decision',
    forward.status_source === 'officer',
    `got "${forward.status_source}"`
  );

  // 12 -- the host may write to a joint college on their own job
  //
  // The college picker lets a host open another college's list and mark
  // somebody there. The authorisation behind the save has to agree, or the page
  // offers a button that always fails. Checked against the same query the
  // controller uses rather than through HTTP, so it tests the rule itself.
  const permitted = async (officer, ids) => {
    const r = await query(
      `SELECT ja.id
         FROM job_applications ja
         JOIN students s ON s.id = ja.student_id
         JOIN jobs j ON j.id = ja.job_id
        WHERE ja.id = ANY($1)
          AND (s.college_id = $2 OR j.placement_officer_id = $3)`,
      [ids, officer.collegeId, officer.officerId]
    );
    return r.rows.length;
  };

  const jointIds = [students[3].applicationId, students[4].applicationId];
  check(
    'the host may act on a joint college’s students on their own job',
    (await permitted(officers[0], jointIds)) === jointIds.length,
    'host was refused students at a college on the job they posted'
  );

  const hostIds = [students[0].applicationId, students[1].applicationId];
  check(
    'a joint college’s officer may not act on the host college’s students',
    (await permitted(officers[1], hostIds)) === 0,
    'a non-host reached students outside their own college'
  );

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
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closePool();
}

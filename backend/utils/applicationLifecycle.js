import crypto from 'crypto';
import { query, getClient } from '../config/database.js';
import { getPortalSetting } from './portalMode.js';

/**
 * The application lifecycle: what the statuses mean, and how a round closes.
 *
 * An application moves under_review -> shortlisted -> selected, and may fall to
 * rejected from any of them. Two of those transitions used to be done entirely
 * by hand, one student at a time, which meant that in practice they were not
 * done at all: an officer shortlisted the eight people they wanted and left the
 * other two hundred sitting at 'under_review' forever. Those two hundred were
 * rejected in fact and 'under review' on their screen, which is the portal
 * lying to the people with the least power in it.
 *
 * So closing a round is automatic, but deferred and visible. Shortlisting
 * somebody sets a due date on the job; the page shows it and says who it will
 * catch; any further marking pushes it back; when it falls due with nobody
 * having touched the job since, everyone left behind is rejected in one batch
 * that can be undone whole.
 *
 * Nothing here ever decides *who* goes forward. It only concludes, after
 * somebody has stopped deciding, that the people not chosen were not chosen.
 */

/* ------------------------------------------------------------- vocabulary */

export const APPLICATION_STATUSES = [
  'under_review',
  'shortlisted',
  'rejected',
  'selected',
];

/**
 * 'submitted' was the old name for the state an application is in the moment it
 * is created. Migration 020 moved every row off it and the default with them,
 * but the value stays legal in the CHECK constraint so that rolling back to an
 * image that still writes it does not fail every insert. Readers treat the two
 * as one state; writers only ever use 'under_review'.
 */
export const LEGACY_STATUS_ALIASES = { submitted: 'under_review' };

/** Statuses a caller may ask for, including the legacy spelling. */
export const ACCEPTED_STATUS_INPUTS = [
  ...APPLICATION_STATUSES,
  ...Object.keys(LEGACY_STATUS_ALIASES),
];

export const normalizeStatus = (status) =>
  LEGACY_STATUS_ALIASES[status] || status;

/** Both spellings of the opening state, for SQL that filters on it. */
export const OPEN_STATUSES = ['under_review', 'submitted'];

/**
 * Marking somebody at these statuses closes the round below them.
 * Nothing else starts a cascade -- rejecting one person says nothing about
 * anybody else, and neither does putting someone back to under_review.
 */
export const STAGE_FOR_STATUS = {
  shortlisted: 'shortlist',
  selected: 'select',
};

/** Who each stage drops, when it finally runs. */
export const STAGE_DROPS = {
  shortlist: OPEN_STATUSES,
  select: ['shortlisted'],
};

export const STAGE_LABELS = {
  shortlist: 'shortlisting',
  select: 'final selection',
};

/**
 * How far along each status is, so a move backwards can be recognised.
 *
 * 'rejected' ranks last because it is terminal rather than because it is
 * furthest along: coming back from it is always a correction, whichever status
 * it returns to.
 */
export const STATUS_RANK = {
  under_review: 0,
  shortlisted: 1,
  selected: 2,
  rejected: 3,
};

/** Is this move putting somebody back to an earlier stage? */
export const isRevert = (from, to) =>
  STATUS_RANK[normalizeStatus(to)] < STATUS_RANK[normalizeStatus(from)];

/* ---------------------------------------------------------------- settings */

const DEFAULT_CASCADE_DAYS = 5;

/**
 * How long the grace period is and whether the sweep runs at all.
 *
 * Both are Super-Admin-editable rather than constants: the right number of days
 * is a judgement about how fast sixty colleges actually respond, and a rule
 * that rejects people automatically should have an off switch that does not
 * need a deploy. Defaults reproduce the shipped behaviour if the settings rows
 * are missing.
 */
export const getCascadeConfig = async () => {
  const [rawDays, rawEnabled] = await Promise.all([
    getPortalSetting('application_cascade_days'),
    getPortalSetting('application_cascade_enabled'),
  ]);

  const days = Number(rawDays);
  return {
    days: Number.isFinite(days) && days > 0 ? Math.floor(days) : DEFAULT_CASCADE_DAYS,
    // Unset means on; only an explicit false switches it off.
    enabled: rawEnabled !== false,
  };
};

/* ------------------------------------------------------------ status writes */

export const newBatchId = () => crypto.randomUUID();

/**
 * Set a status on a set of applications and record why.
 *
 * Every status write in the system goes through here, so that
 * application_status_events is a complete history rather than a mostly
 * complete one. Rows already at the target status are skipped rather than
 * rewritten -- re-clicking "Shortlist" on someone already shortlisted should
 * not manufacture an event or reset anybody's clock.
 *
 * @returns {Promise<Array>} the rows that actually changed
 */
export const applyStatusChange = async (
  client,
  { applicationIds, status, source, actorUserId = null, batchId = null, reason = null }
) => {
  if (!applicationIds || applicationIds.length === 0) return [];

  const target = normalizeStatus(status);

  // Read first so the event can record what it was. FOR UPDATE because two
  // officers on the same job would otherwise interleave and write events that
  // disagree with the row.
  const before = await client.query(
    `SELECT ja.id, ja.application_status, ja.job_id, ja.student_id, s.college_id
       FROM job_applications ja
       JOIN students s ON s.id = ja.student_id
      WHERE ja.id = ANY($1)
      FOR UPDATE OF ja`,
    [applicationIds]
  );

  const changing = before.rows.filter(
    (r) => normalizeStatus(r.application_status) !== target
  );
  if (changing.length === 0) return [];

  const ids = changing.map((r) => r.id);

  /*
   * The source, decided per row rather than once for the call.
   *
   * A human moving somebody backwards -- selected back to shortlisted, or
   * rejected back to under review -- is correcting a mistake, not making a
   * decision, and the two should not read the same in the history. One click
   * can do both at once (a mixed selection moved to under_review reverts the
   * shortlisted and advances nobody), so it cannot be settled for the batch.
   *
   * Only inferred for deliberate human marking. A cascade, an eligibility
   * failure or an explicit undo already says exactly what it is.
   */
  const sourceFor = (row) =>
    (source === 'officer' && isRevert(row.application_status, target))
      ? 'reverted'
      : source;
  const sources = changing.map(sourceFor);

  const updated = await client.query(
    `UPDATE job_applications ja
        SET application_status = $1,
            status_source = v.source,
            reviewed_by = COALESCE($2, ja.reviewed_by),
            reviewed_at = CURRENT_TIMESTAMP,
            review_notes = COALESCE($3, ja.review_notes),
            updated_at = CURRENT_TIMESTAMP
       FROM UNNEST($4::int[], $5::varchar[]) AS v(id, source)
      WHERE ja.id = v.id
      RETURNING ja.id, ja.job_id, ja.student_id, ja.application_status, ja.status_source`,
    [target, actorUserId, reason, ids, sources]
  );

  // The college each changed row belongs to, carried back on the result.
  // Callers need it to decide which colleges' rounds this marking closes, and
  // re-reading the rows to find out would race with a second officer.
  const collegeById = new Map(changing.map((r) => [r.id, r.college_id]));
  updated.rows.forEach((row) => { row.college_id = collegeById.get(row.id) ?? null; });

  // One multi-row insert: a cascade can touch several hundred applications and
  // a statement each would hold the transaction open for the whole sweep.
  await client.query(
    `INSERT INTO application_status_events
       (application_id, from_status, to_status, source, actor_user_id, batch_id, reason)
     SELECT * FROM UNNEST(
       $1::int[], $2::varchar[], $3::varchar[], $4::varchar[], $5::int[], $6::uuid[], $7::text[]
     )`,
    [
      ids,
      changing.map((r) => r.application_status),
      ids.map(() => target),
      sources,
      ids.map(() => actorUserId),
      ids.map(() => batchId),
      ids.map(() => reason),
    ]
  );

  return updated.rows;
};

/* ------------------------------------------------------------- the schedule */

/**
 * When this job's next round should close.
 *
 * The grace period runs from the last human action, except that a drive still
 * in the future pushes it out: shortlisting a week before the drive and then
 * going quiet is normal, and rejecting the rest of the list before anybody has
 * even attended would be plainly wrong. A drive already past does not hold
 * anything up, and a job with no drive recorded starts the clock immediately --
 * most jobs never get a drive entered here, and a rule that silently never
 * fires for them is worse than no rule.
 */
const computeDueAt = async (client, jobId, days) => {
  const result = await client.query(
    `SELECT MAX((jd.drive_date + jd.drive_time)::timestamp) AS last_drive
       FROM job_drives jd
      WHERE jd.job_id = $1`,
    [jobId]
  );

  const lastDrive = result.rows[0]?.last_drive || null;
  const base = lastDrive && lastDrive > new Date() ? new Date(lastDrive) : new Date();
  base.setDate(base.getDate() + days);
  return base;
};

/**
 * Record that a human acted on this job, and open or push back the countdowns.
 *
 * Called after every status write a person makes. Two things happen:
 *   - live schedules for this job and these colleges have their clocks reset,
 *     because somebody is plainly still working through the list;
 *   - if this write was a shortlist or a selection, each college involved gets
 *     a schedule for the matching stage if it does not have one.
 *
 * `scopeCollegeIds` are the colleges of the students actually marked, not the
 * colleges on screen. A job runs at sixty colleges and each one's round is a
 * separate decision made by a different person, so a countdown is opened per
 * college and only where somebody has in fact decided something. A college
 * whose officer has never marked anybody gets no countdown and nobody there is
 * rejected automatically -- their round genuinely has not happened, and closing
 * it on the strength of another college's work would reject people on a
 * decision nobody made about them.
 *
 * The caller is responsible for having checked that this actor may reach these
 * colleges; the list is narrowed to what they can see before it arrives here.
 */
export const syncCascadeForJob = async (
  client,
  { jobId, scopeCollegeIds = [], actorUserId = null, statuses = [] }
) => {
  const { days, enabled } = await getCascadeConfig();
  if (!enabled) return [];

  // NULL means the whole job. Only the historical backfill opens one of those;
  // an empty list here would otherwise silently become a statewide cascade.
  const scopes = scopeCollegeIds.length > 0 ? [...new Set(scopeCollegeIds)] : [];
  if (scopes.length === 0) return [];

  const dueAt = await computeDueAt(client, jobId, days);

  // Somebody is working: push every live countdown on these colleges back.
  await client.query(
    `UPDATE job_cascade_schedule
        SET last_activity_at = CURRENT_TIMESTAMP,
            due_at = $3
      WHERE job_id = $1
        AND scope_college_id = ANY($2::int[])
        AND cancelled_at IS NULL
        AND executed_at IS NULL`,
    [jobId, scopes, dueAt]
  );

  const stages = [
    ...new Set(
      statuses
        .map((s) => STAGE_FOR_STATUS[normalizeStatus(s)])
        .filter(Boolean)
    ),
  ];

  const opened = [];
  for (const stage of stages) {
    for (const collegeId of scopes) {
      const result = await client.query(
        `INSERT INTO job_cascade_schedule
           (job_id, stage, scope_college_id, due_at, last_activity_at, triggered_by)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
         ON CONFLICT (job_id, stage, COALESCE(scope_college_id, 0))
           WHERE cancelled_at IS NULL AND executed_at IS NULL
         DO UPDATE SET due_at = EXCLUDED.due_at,
                       last_activity_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [jobId, stage, collegeId, dueAt, actorUserId]
      );
      opened.push(result.rows[0]);
    }
  }

  return opened;
};

/**
 * Colleges on this job where nobody has decided anything.
 *
 * Students still under review, and no countdown open for them -- so nothing
 * will close their round and nobody is coming. Surfaced to the host officer and
 * the Super Admin as a list to chase, which is the honest alternative to
 * rejecting those students on somebody else's decision.
 */
export const outstandingColleges = async (runner, { jobId }) => {
  const result = await runner(
    `SELECT s.college_id,
            c.college_name,
            COUNT(*)::int AS waiting
       FROM job_applications ja
       JOIN students s ON s.id = ja.student_id
       LEFT JOIN colleges c ON c.id = s.college_id
      WHERE ja.job_id = $1
        AND ja.application_status = ANY($2)
        AND NOT EXISTS (
          SELECT 1 FROM job_cascade_schedule cs
           WHERE cs.job_id = ja.job_id
             AND cs.cancelled_at IS NULL
             AND cs.executed_at IS NULL
             AND (cs.scope_college_id IS NULL OR cs.scope_college_id = s.college_id)
        )
        -- A college where somebody has already been shortlisted is being
        -- worked on, whatever the countdown says; only colleges nobody has
        -- touched at all belong on a list of things to chase.
        AND NOT EXISTS (
          SELECT 1 FROM job_applications ja2
           JOIN students s2 ON s2.id = ja2.student_id
          WHERE ja2.job_id = ja.job_id
            AND s2.college_id = s.college_id
            AND ja2.application_status IN ('shortlisted', 'selected')
        )
      GROUP BY s.college_id, c.college_name
      ORDER BY c.college_name NULLS LAST`,
    [jobId, OPEN_STATUSES]
  );
  return result.rows;
};

/**
 * Who a cascade would drop if it ran now.
 *
 * The same query the sweep uses, so the count an officer is shown on the page
 * and the people actually rejected can never be two different sets.
 */
export const cascadeTargets = async (runner, { jobId, stage, scopeCollegeId = null }) => {
  const from = STAGE_DROPS[stage];
  if (!from) return [];

  const result = await runner(
    `SELECT ja.id AS application_id,
            ja.application_status,
            s.id AS student_id,
            s.student_name,
            s.prn,
            s.email,
            s.college_id,
            c.college_name,
            u.id AS user_id
       FROM job_applications ja
       JOIN students s ON s.id = ja.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN colleges c ON c.id = s.college_id
      WHERE ja.job_id = $1
        AND ja.application_status = ANY($2)
        AND ($3::int IS NULL OR s.college_id = $3)
      ORDER BY c.college_name NULLS LAST, s.student_name`,
    [jobId, from, scopeCollegeId]
  );

  return result.rows;
};

/** Live countdowns on a job, with the count each one currently holds. */
export const liveCascadesForJob = async (runner, { jobId, scopeCollegeId = null }) => {
  const result = await runner(
    `SELECT cs.*, c.college_name AS scope_college_name
       FROM job_cascade_schedule cs
       LEFT JOIN colleges c ON c.id = cs.scope_college_id
      WHERE cs.job_id = $1
        AND cs.cancelled_at IS NULL
        AND cs.executed_at IS NULL
        AND ($2::int IS NULL OR cs.scope_college_id IS NULL OR cs.scope_college_id = $2)
      ORDER BY cs.due_at`,
    [jobId, scopeCollegeId]
  );

  const out = [];
  for (const row of result.rows) {
    const targets = await cascadeTargets(runner, {
      jobId: row.job_id,
      stage: row.stage,
      scopeCollegeId: row.scope_college_id,
    });
    out.push({ ...row, pending_count: targets.length });
  }
  return out;
};

/* ------------------------------------------------------------- the notice */

const CASCADE_NOTICE = {
  shortlist: {
    title: (company) => `Application update — ${company}`,
    message: (title, company) =>
      `Thank you for applying for the ${title} position at ${company}. ` +
      `You have not been shortlisted for the next round on this occasion. ` +
      `Your application is now closed.`,
  },
  select: {
    title: (company) => `Application update — ${company}`,
    message: (title, company) =>
      `Thank you for taking part in the selection process for the ${title} ` +
      `position at ${company}. You have not been selected on this occasion. ` +
      `Your application is now closed.`,
  },
};

/**
 * One notification, many recipients.
 *
 * Deliberately in-app only and with no email: a cascade can close three hundred
 * applications at once, and three hundred rejection emails leaving in one burst
 * would exhaust the day's sending quota and read, to anyone watching the mail
 * logs, exactly like a compromised account.
 */
const notifyCascade = async (client, { stage, job, recipients, createdBy }) => {
  if (recipients.length === 0 || !createdBy) return;

  const notice = CASCADE_NOTICE[stage];
  const inserted = await client.query(
    `INSERT INTO notifications
       (title, message, notification_type, priority, created_by, target_type, is_active)
     VALUES ($1, $2, 'rejection', 'normal', $3, 'specific_students', TRUE)
     RETURNING id`,
    [notice.title(job.company_name), notice.message(job.job_title, job.company_name), createdBy]
  );

  const notificationId = inserted.rows[0].id;

  await client.query(
    `INSERT INTO notification_recipients (notification_id, user_id, is_read)
     SELECT $1, u, FALSE FROM UNNEST($2::int[]) AS u
     ON CONFLICT (notification_id, user_id) DO NOTHING`,
    [notificationId, recipients.map((r) => r.user_id)]
  );
};

/* ------------------------------------------------------------ the execution */

/**
 * Run one scheduled cascade inside an open transaction.
 * Returns what it did, or would have done under `dryRun`.
 */
export const executeCascade = async (client, schedule, { dryRun = false } = {}) => {
  const jobResult = await client.query(
    `SELECT id, job_title, company_name FROM jobs WHERE id = $1`,
    [schedule.job_id]
  );
  const job = jobResult.rows[0];
  if (!job) return { schedule_id: schedule.id, affected: 0, skipped: 'job missing' };

  const targets = await cascadeTargets(client.query.bind(client), {
    jobId: schedule.job_id,
    stage: schedule.stage,
    scopeCollegeId: schedule.scope_college_id,
  });

  if (dryRun) {
    return { schedule_id: schedule.id, job_id: job.id, stage: schedule.stage, affected: targets.length, targets };
  }

  const batchId = newBatchId();

  if (targets.length > 0) {
    await applyStatusChange(client, {
      applicationIds: targets.map((t) => t.application_id),
      status: 'rejected',
      source: 'system_cascade',
      // Attributed to whoever's marking started the countdown. The system did
      // not decide this; their shortlisting did, and the audit trail should say
      // so rather than pointing at a machine.
      actorUserId: schedule.triggered_by,
      batchId,
      reason: `Round closed automatically: ${STAGE_LABELS[schedule.stage]} completed`,
    });

    await notifyCascade(client, {
      stage: schedule.stage,
      job,
      recipients: targets,
      createdBy: schedule.triggered_by,
    });
  }

  await client.query(
    `UPDATE job_cascade_schedule
        SET executed_at = CURRENT_TIMESTAMP,
            executed_batch_id = $2,
            affected_count = $3
      WHERE id = $1`,
    [schedule.id, batchId, targets.length]
  );

  return {
    schedule_id: schedule.id,
    job_id: job.id,
    stage: schedule.stage,
    batch_id: batchId,
    affected: targets.length,
  };
};

/**
 * The nightly sweep.
 *
 * Asks "what is overdue right now" rather than "what became overdue since the
 * last run". The scheduler is an in-process timer that restarts with the
 * container, so a deploy at the wrong hour skips a night; phrased this way a
 * missed night costs nothing and the next run catches everything up.
 *
 * Each schedule commits in its own transaction: one job with a broken row must
 * not roll back the cascades that already succeeded.
 */
export const runDueCascades = async ({ dryRun = false, limit = 500 } = {}) => {
  const { enabled } = await getCascadeConfig();
  if (!enabled) {
    return { ran: false, reason: 'disabled', results: [] };
  }

  const due = await query(
    `SELECT * FROM job_cascade_schedule
      WHERE cancelled_at IS NULL
        AND executed_at IS NULL
        AND due_at <= CURRENT_TIMESTAMP
      ORDER BY due_at
      LIMIT $1`,
    [limit]
  );

  const results = [];
  for (const schedule of due.rows) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      results.push(await executeCascade(client, schedule, { dryRun }));
      if (dryRun) await client.query('ROLLBACK');
      else await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`Cascade failed for schedule ${schedule.id}:`, error);
      results.push({ schedule_id: schedule.id, error: error.message });
    } finally {
      client.release();
    }
  }

  const affected = results.reduce((n, r) => n + (r.affected || 0), 0);
  if (results.length > 0) {
    console.log(
      `${dryRun ? '[dry run] ' : ''}Application cascade: ${results.length} schedule(s), ${affected} application(s) closed`
    );
  }

  return { ran: true, dryRun, results, affected };
};

/* ------------------------------------------------------------------ undo */

/**
 * Put a whole batch back where it was.
 *
 * The reason the events table exists. A cascade that fired on the wrong job, or
 * a bulk click on the wrong selection, is one call to undo -- and because each
 * event carries the status it moved away from, "back where it was" means each
 * application's own previous status rather than one status for all of them.
 */
export const undoBatch = async (client, { batchId, actorUserId, reason = null }) => {
  const events = await client.query(
    `SELECT application_id, from_status
       FROM application_status_events
      WHERE batch_id = $1
      ORDER BY id`,
    [batchId]
  );

  if (events.rows.length === 0) return { reverted: 0 };

  const undoId = newBatchId();
  let reverted = 0;

  // Grouped by the status being restored so each distinct previous status is
  // one statement rather than one per application.
  const byStatus = new Map();
  for (const e of events.rows) {
    const from = normalizeStatus(e.from_status) || 'under_review';
    if (!byStatus.has(from)) byStatus.set(from, []);
    byStatus.get(from).push(e.application_id);
  }

  for (const [status, ids] of byStatus) {
    const rows = await applyStatusChange(client, {
      applicationIds: ids,
      status,
      source: 'reverted',
      actorUserId,
      batchId: undoId,
      reason: reason || `Undo of batch ${batchId}`,
    });
    reverted += rows.length;
  }

  // A cascade that has been undone must not simply run again tomorrow.
  await client.query(
    `UPDATE job_cascade_schedule
        SET cancelled_at = CURRENT_TIMESTAMP,
            cancelled_by = $2
      WHERE executed_batch_id = $1`,
    [batchId, actorUserId]
  );

  return { reverted, undo_batch_id: undoId };
};

export default {
  APPLICATION_STATUSES,
  ACCEPTED_STATUS_INPUTS,
  OPEN_STATUSES,
  STAGE_FOR_STATUS,
  STAGE_DROPS,
  STAGE_LABELS,
  normalizeStatus,
  getCascadeConfig,
  newBatchId,
  applyStatusChange,
  syncCascadeForJob,
  outstandingColleges,
  cascadeTargets,
  liveCascadesForJob,
  executeCascade,
  runDueCascades,
  undoBatch,
};

#!/usr/bin/env node
/**
 * Close the rounds that were abandoned before any of this existed.
 *
 * Years of jobs are sitting with eight people shortlisted and two hundred still
 * reading "Under review" on their own screen. Those two hundred were rejected
 * in fact a long time ago; the portal simply never said so. This finds them and
 * queues a closure for each.
 *
 * Three things keep it from being the sort of script that ruins an evening:
 *
 *   1. It does nothing without --commit. The default run only counts.
 *   2. It only touches rounds that have actually gone quiet -- no status change
 *      on the job for longer than the grace period. A job somebody shortlisted
 *      this morning is left alone; the ordinary countdown has it.
 *   3. Everything it does shares one batch id, printed at the end, and
 *      --undo <batch> puts every application back to the status it held.
 *
 * Usage
 *   node backend/scripts/backfillRoundClosures.mjs                 # count only
 *   node backend/scripts/backfillRoundClosures.mjs --commit        # queue them
 *   node backend/scripts/backfillRoundClosures.mjs --commit --run  # and run now
 *   node backend/scripts/backfillRoundClosures.mjs --undo <batch>  # put back
 */
import { query, getClient, closePool } from '../config/database.js';
import {
  getCascadeConfig, cascadeTargets, executeCascade, undoBatch, newBatchId,
  OPEN_STATUSES,
} from '../utils/applicationLifecycle.js';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
};

const COMMIT = has('--commit');
const RUN = has('--run');
const UNDO = valueOf('--undo');

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* --------------------------------------------------------------- the undo */

async function undo(batchId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await undoBatch(client, {
      batchId,
      actorUserId: null,
      reason: 'Backfill reversed by backfillRoundClosures.mjs',
    });
    await client.query('COMMIT');
    console.log(`Put back ${plural(result.reverted, 'application', 'applications')}.`);
    if (result.reverted === 0) {
      console.log('Nothing matched that batch id — check the value and try again.');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------ the backfill */

/**
 * Rounds that were left open and have since gone quiet.
 *
 * A job qualifies for a stage when somebody reached the stage above, somebody
 * else is still waiting below it, and nothing has moved for longer than the
 * grace period. Scoped to the whole job: a historical job's decisions cannot be
 * attributed to one college after the fact, and for a drive whose deadline
 * passed months ago "the round is over" is true everywhere.
 */
async function findAbandonedRounds(graceDays) {
  const result = await query(
    `SELECT j.id AS job_id,
            j.job_title,
            j.company_name,
            COALESCE(po.user_id, (
              SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE
               ORDER BY id LIMIT 1
            )) AS actor_user_id,
            COUNT(*) FILTER (WHERE ja.application_status = 'shortlisted') AS shortlisted,
            COUNT(*) FILTER (WHERE ja.application_status = 'selected') AS selected,
            COUNT(*) FILTER (WHERE ja.application_status = ANY($1)) AS still_open,
            MAX(GREATEST(ja.reviewed_at, ja.updated_at)) AS last_touched
       FROM jobs j
       JOIN job_applications ja ON ja.job_id = j.id
       LEFT JOIN placement_officers po ON po.id = j.placement_officer_id
      GROUP BY j.id, j.job_title, j.company_name, po.user_id
     HAVING MAX(GREATEST(ja.reviewed_at, ja.updated_at))
              < CURRENT_TIMESTAMP - ($2 || ' days')::INTERVAL
      ORDER BY j.id`,
    [OPEN_STATUSES, String(graceDays)]
  );

  const rounds = [];
  for (const row of result.rows) {
    // Somebody was shortlisted and people are still waiting below them.
    if (Number(row.shortlisted) > 0 && Number(row.still_open) > 0) {
      rounds.push({ ...row, stage: 'shortlist' });
    }
    // Somebody was selected and people are still shortlisted.
    if (Number(row.selected) > 0 && Number(row.shortlisted) > 0) {
      rounds.push({ ...row, stage: 'select' });
    }
  }
  return rounds;
}

async function backfill() {
  const { days, enabled } = await getCascadeConfig();

  console.log(`Grace period: ${days} days. Round closure is ${enabled ? 'on' : 'OFF'}.`);
  if (!enabled && COMMIT && RUN) {
    console.log('Refusing --run while round closure is switched off.');
    return;
  }

  const rounds = await findAbandonedRounds(days);
  if (rounds.length === 0) {
    console.log('No abandoned rounds found. Nothing to do.');
    return;
  }

  // Count first, always, whether or not this run will write anything. A number
  // this large should be read before it is acted on.
  let total = 0;
  const detail = [];
  for (const round of rounds) {
    // Skip rounds that already have a schedule -- a rerun of this script must
    // not queue the same closure twice.
    const existing = await query(
      `SELECT 1 FROM job_cascade_schedule
        WHERE job_id = $1 AND stage = $2 AND scope_college_id IS NULL
          AND cancelled_at IS NULL AND executed_at IS NULL`,
      [round.job_id, round.stage]
    );
    if (existing.rows.length > 0) continue;

    const targets = await cascadeTargets(query, {
      jobId: round.job_id,
      stage: round.stage,
      scopeCollegeId: null,
    });
    if (targets.length === 0) continue;

    total += targets.length;
    detail.push({ ...round, count: targets.length });
  }

  if (detail.length === 0) {
    console.log('Every abandoned round already has a closure queued. Nothing to do.');
    return;
  }

  console.log('');
  for (const d of detail) {
    console.log(
      `  job ${String(d.job_id).padStart(4)}  ${d.stage.padEnd(9)}  ` +
      `${String(d.count).padStart(4)} to close   ${d.company_name} — ${d.job_title}`
    );
  }
  console.log('');
  console.log(
    `${plural(detail.length, 'round', 'rounds')} across ` +
    `${new Set(detail.map((d) => d.job_id)).size} job(s), ` +
    `${plural(total, 'application', 'applications')} would be rejected.`
  );

  if (!COMMIT) {
    console.log('');
    console.log('Dry run — nothing written. Re-run with --commit to queue these.');
    return;
  }

  const batchId = newBatchId();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const d of detail) {
      await client.query(
        `INSERT INTO job_cascade_schedule
           (job_id, stage, scope_college_id, due_at, last_activity_at, triggered_by)
         VALUES ($1, $2, NULL, CURRENT_TIMESTAMP, $3, $4)`,
        [d.job_id, d.stage, d.last_touched, d.actor_user_id]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  console.log('');
  console.log(`Queued ${plural(detail.length, 'closure', 'closures')}, due immediately.`);

  if (!RUN) {
    console.log('They will run on the next nightly sweep, or now with --run.');
    return;
  }

  // Run them here rather than waiting, but one transaction each so a single
  // bad job cannot roll back the ones that already worked.
  const due = await query(
    `SELECT * FROM job_cascade_schedule
      WHERE cancelled_at IS NULL AND executed_at IS NULL AND due_at <= CURRENT_TIMESTAMP
      ORDER BY id`
  );

  const batches = [];
  let closed = 0;
  for (const schedule of due.rows) {
    const runner = await getClient();
    try {
      await runner.query('BEGIN');
      const result = await executeCascade(runner, schedule, { dryRun: false });
      await runner.query('COMMIT');
      closed += result.affected || 0;
      if (result.batch_id) batches.push(result.batch_id);
    } catch (error) {
      await runner.query('ROLLBACK').catch(() => {});
      console.error(`  failed on schedule ${schedule.id}: ${error.message}`);
    } finally {
      runner.release();
    }
  }

  console.log(`Closed ${plural(closed, 'application', 'applications')}.`);
  console.log('');
  console.log('To put all of it back, run each of these:');
  for (const b of batches) {
    console.log(`  node backend/scripts/backfillRoundClosures.mjs --undo ${b}`);
  }
  // Printed even when unused, so the id is in the operator's scrollback either
  // way rather than only discoverable from the database afterwards.
  console.log('');
  console.log(`(queue batch marker: ${batchId})`);
}

/* ------------------------------------------------------------------- main */

try {
  if (UNDO) await undo(UNDO);
  else await backfill();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closePool();
}

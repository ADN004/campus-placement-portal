import { query, getClient } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import {
  getCascadeConfig, liveCascadesForJob, cascadeTargets, executeCascade, undoBatch,
  outstandingColleges,
} from '../utils/applicationLifecycle.js';

/**
 * Managing a round that is about to close.
 *
 * One controller for both roles rather than the usual pair, because the only
 * thing that differs between them is how far they are allowed to reach, and
 * that is four lines. The pair would have been two copies of the same eighty,
 * which is how the notify handler ended up correct in one role and broken in
 * the other for a month.
 *
 * Authorisation is not "is this person an officer" — the route already settled
 * that — but "does this countdown belong to something they can see". A joint
 * college's officer can see their own college's countdown on a job somebody
 * else posted, and must not be able to touch the whole-job one beside it.
 */

/* ------------------------------------------------------------------- scope */

/**
 * What this user is allowed to reach on this job.
 *
 * Returns { scopeCollegeId, canManageAll }. A Super Admin and the officer who
 * posted the job reach everything; any other officer reaches their own college
 * and nothing else. Mirrors the rule the applicants list already enforces, so
 * a countdown can never cover students who are not on that person's screen.
 */
const resolveScope = async (user, jobId) => {
  if (user.role === 'super_admin') {
    return { scopeCollegeId: null, canManageAll: true };
  }

  const officer = await query(
    'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
    [user.id]
  );
  if (officer.rows.length === 0) {
    const error = new Error('Placement officer profile not found');
    error.status = 403;
    throw error;
  }

  const job = await query('SELECT placement_officer_id FROM jobs WHERE id = $1', [jobId]);
  if (job.rows.length === 0) {
    const error = new Error('Job not found');
    error.status = 404;
    throw error;
  }

  const isHost = job.rows[0].placement_officer_id === officer.rows[0].id;
  return {
    scopeCollegeId: isHost ? null : officer.rows[0].college_id,
    canManageAll: isHost,
  };
};

/** Load one schedule and refuse it if the caller's scope does not cover it. */
const loadSchedule = async (user, scheduleId) => {
  const result = await query('SELECT * FROM job_cascade_schedule WHERE id = $1', [scheduleId]);
  if (result.rows.length === 0) {
    const error = new Error('Scheduled closure not found');
    error.status = 404;
    throw error;
  }

  const schedule = result.rows[0];
  const { scopeCollegeId, canManageAll } = await resolveScope(user, schedule.job_id);

  // A whole-job countdown is only touchable by someone who can see the whole
  // job. Otherwise one college's officer could call off a closure covering
  // fifty-nine colleges they have no standing in.
  const permitted = canManageAll || schedule.scope_college_id === scopeCollegeId;
  if (!permitted) {
    const error = new Error('This scheduled closure is outside your college');
    error.status = 403;
    throw error;
  }

  return schedule;
};

const fail = (res, error, fallback) => {
  const status = error.status || 500;
  if (status === 500) console.error(`${fallback}:`, error);
  return res.status(status).json({
    success: false,
    message: status === 500 ? fallback : error.message,
  });
};

/* ------------------------------------------------------------------ read */

// @desc    Live round closures on a job, and the grace period in force
// @route   GET /api/(super-admin|placement-officer)/jobs/:jobId/round-closures
export const getRoundClosures = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { scopeCollegeId, canManageAll } = await resolveScope(req.user, jobId);
    const config = await getCascadeConfig();

    const cascades = await liveCascadesForJob(query, { jobId, scopeCollegeId });

    /*
     * Colleges where nobody has decided anything.
     *
     * Only for whoever can act on the whole job. A round closes per college and
     * only where somebody has actually marked somebody, which is what keeps a
     * student from being rejected on a decision another college made -- but it
     * also means a college whose officer never engaged simply sits there, with
     * nothing coming. That is the honest outcome and a silent one, so the
     * person who can chase it is told.
     */
    const outstanding = canManageAll
      ? await outstandingColleges(query, { jobId })
      : [];

    res.status(200).json({
      success: true,
      data: {
        cascades: cascades.map((c) => ({
          ...c,
          // The panel hides its buttons rather than offering actions that will
          // come back 403.
          can_manage: canManageAll || c.scope_college_id === scopeCollegeId,
        })),
        outstanding_colleges: outstanding,
        grace_days: config.days,
        enabled: config.enabled,
      },
    });
  } catch (error) {
    return fail(res, error, 'Error fetching scheduled closures');
  }
};

// @desc    Exactly who a closure would reject if it ran now
// @route   GET /api/(super-admin|placement-officer)/round-closures/:id/preview
export const previewRoundClosure = async (req, res) => {
  try {
    const schedule = await loadSchedule(req.user, req.params.id);
    const targets = await cascadeTargets(query, {
      jobId: schedule.job_id,
      stage: schedule.stage,
      scopeCollegeId: schedule.scope_college_id,
    });

    res.status(200).json({
      success: true,
      data: { schedule, count: targets.length, students: targets },
    });
  } catch (error) {
    return fail(res, error, 'Error previewing scheduled closure');
  }
};

/* ----------------------------------------------------------------- write */

// @desc    Push a closure back by another full grace period
// @route   POST /api/(super-admin|placement-officer)/round-closures/:id/extend
export const extendRoundClosure = async (req, res) => {
  try {
    const schedule = await loadSchedule(req.user, req.params.id);
    if (schedule.executed_at || schedule.cancelled_at) {
      return res.status(409).json({
        success: false,
        message: 'This closure has already run or been called off',
      });
    }

    const { days } = await getCascadeConfig();
    // From now rather than from the existing due date: the point of asking for
    // longer is to get the full period again, and extending an already-overdue
    // one from its own date would grant nothing.
    const updated = await query(
      `UPDATE job_cascade_schedule
          SET due_at = CURRENT_TIMESTAMP + ($2 || ' days')::INTERVAL,
              last_activity_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
      [schedule.id, String(days)]
    );

    await logActivity(
      req.user.id, 'UPDATE', 'job_cascade_schedule', schedule.id,
      { action: 'extend_round_closure', job_id: schedule.job_id, days }, req
    );

    res.status(200).json({
      success: true,
      message: `Closure pushed back by ${days} days`,
      data: updated.rows[0],
    });
  } catch (error) {
    return fail(res, error, 'Error extending scheduled closure');
  }
};

// @desc    Call a closure off entirely
// @route   POST /api/(super-admin|placement-officer)/round-closures/:id/cancel
export const cancelRoundClosure = async (req, res) => {
  try {
    const schedule = await loadSchedule(req.user, req.params.id);
    if (schedule.executed_at) {
      return res.status(409).json({
        success: false,
        message: 'This closure has already run — undo it instead',
      });
    }

    const updated = await query(
      `UPDATE job_cascade_schedule
          SET cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $2
        WHERE id = $1 AND cancelled_at IS NULL
        RETURNING *`,
      [schedule.id, req.user.id]
    );

    await logActivity(
      req.user.id, 'UPDATE', 'job_cascade_schedule', schedule.id,
      { action: 'cancel_round_closure', job_id: schedule.job_id }, req
    );

    res.status(200).json({
      success: true,
      message: 'These applications will be left as they are',
      data: updated.rows[0] || schedule,
    });
  } catch (error) {
    return fail(res, error, 'Error cancelling scheduled closure');
  }
};

// @desc    Run a closure immediately instead of waiting for it
// @route   POST /api/(super-admin|placement-officer)/round-closures/:id/run
export const runRoundClosure = async (req, res) => {
  const client = await getClient();
  try {
    const schedule = await loadSchedule(req.user, req.params.id);
    if (schedule.executed_at || schedule.cancelled_at) {
      return res.status(409).json({
        success: false,
        message: 'This closure has already run or been called off',
      });
    }

    await client.query('BEGIN');
    // Attributed to whoever asked for it now, not to whoever started the clock.
    const result = await executeCascade(
      client,
      { ...schedule, triggered_by: req.user.id },
      { dryRun: false }
    );
    await client.query('COMMIT');

    await logActivity(
      req.user.id, 'UPDATE', 'job_cascade_schedule', schedule.id,
      { action: 'run_round_closure', job_id: schedule.job_id, affected: result.affected }, req
    );

    res.status(200).json({
      success: true,
      message: `${result.affected} ${result.affected === 1 ? 'application' : 'applications'} closed`,
      data: result,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return fail(res, error, 'Error running scheduled closure');
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ undo */

// @desc    Put a whole batch of status changes back where it was
// @route   POST /api/(super-admin|placement-officer)/applications/undo/:batchId
export const undoStatusBatch = async (req, res) => {
  const client = await getClient();
  try {
    const { batchId } = req.params;

    // Which jobs the batch touched, so the caller's reach can be checked
    // against each of them rather than assumed from the batch id alone.
    const scopeCheck = await query(
      `SELECT DISTINCT ja.job_id, s.college_id
         FROM application_status_events e
         JOIN job_applications ja ON ja.id = e.application_id
         JOIN students s ON s.id = ja.student_id
        WHERE e.batch_id = $1`,
      [batchId]
    );

    if (scopeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nothing to undo — that batch was not found',
      });
    }

    for (const row of scopeCheck.rows) {
      const { scopeCollegeId, canManageAll } = await resolveScope(req.user, row.job_id);
      if (!canManageAll && row.college_id !== scopeCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'That batch covers students outside your college',
        });
      }
    }

    await client.query('BEGIN');
    const result = await undoBatch(client, {
      batchId,
      actorUserId: req.user.id,
      reason: req.body?.reason || null,
    });
    await client.query('COMMIT');

    await logActivity(
      req.user.id, 'UPDATE', 'job_applications', null,
      { action: 'undo_status_batch', batch_id: batchId, reverted: result.reverted }, req
    );

    res.status(200).json({
      success: true,
      message: `${result.reverted} ${result.reverted === 1 ? 'application' : 'applications'} put back`,
      data: result,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return fail(res, error, 'Error undoing status change');
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------------- history */

// @desc    Everything that has ever happened to one application
// @route   GET /api/(super-admin|placement-officer)/applications/:applicationId/history
export const getApplicationHistory = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const app = await query(
      `SELECT ja.id, ja.job_id, s.college_id
         FROM job_applications ja
         JOIN students s ON s.id = ja.student_id
        WHERE ja.id = $1`,
      [applicationId]
    );
    if (app.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const { scopeCollegeId, canManageAll } = await resolveScope(req.user, app.rows[0].job_id);
    if (!canManageAll && app.rows[0].college_id !== scopeCollegeId) {
      return res.status(403).json({
        success: false,
        message: 'That application is outside your college',
      });
    }

    const events = await query(
      // users carries no name of its own — officers keep theirs on their own
      // row and the Super Admin has only an email — so the name is taken from
      // whichever profile exists and falls back to the address.
      `SELECT e.id, e.from_status, e.to_status, e.source, e.reason, e.batch_id, e.created_at,
              COALESCE(po.officer_name, u.email) AS actor_name,
              u.role AS actor_role
         FROM application_status_events e
         LEFT JOIN users u ON u.id = e.actor_user_id
         LEFT JOIN placement_officers po ON po.user_id = u.id
        WHERE e.application_id = $1
        ORDER BY e.created_at, e.id`,
      [applicationId]
    );

    res.status(200).json({ success: true, data: events.rows });
  } catch (error) {
    return fail(res, error, 'Error fetching application history');
  }
};

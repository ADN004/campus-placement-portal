/**
 * Reading and writing a job's drive slots.
 *
 * driveSchedule.js formats a drive; this stores one. Kept apart because that
 * file is pure — it is imported by code that has no database — and mixing
 * persistence into it would drag a connection into every caller that only
 * wanted to print a date.
 *
 * A composer sends the job's whole list, and this applies it as a difference
 * rather than replacing the rows wholesale. That matters for one reason: the
 * calendar invitation keys each event on its slot's row id, so deleting and
 * reinserting would hand every student a second set of entries beside the ones
 * they already have instead of updating them in place.
 */

import { MAX_DRIVE_SLOTS } from './driveSchedule.js';

export { MAX_DRIVE_SLOTS };

/** A job's slots, earliest first — the order every screen shows them in. */
export const readDriveSlots = async (jobId, run) => {
  const result = await run(
    `SELECT * FROM job_drives
      WHERE job_id = $1
      ORDER BY drive_date, drive_time, id`,
    [jobId]
  );
  return result.rows;
};

/**
 * Accepts the composer's list, or rejects it with a reason a person can act on.
 *
 * Returns `{ slots }` when the shape is good and `{ error }` when it is not, so
 * the caller decides the status code — both roles want the same rules and
 * neither wants this throwing through their own error handling.
 */
export const validateDriveSlots = (body) => {
  /*
   * The single-slot shape the endpoints took before is still accepted. A
   * frontend rolled back to the previous image sends flat fields, and refusing
   * it would break scheduling for the length of the rollback.
   */
  const raw = Array.isArray(body?.slots) && body.slots.length > 0
    ? body.slots
    : [{
      drive_date: body?.drive_date,
      drive_time: body?.drive_time,
      drive_location: body?.drive_location,
      additional_instructions: body?.additional_instructions,
    }];

  if (raw.length > MAX_DRIVE_SLOTS) {
    return { error: `A drive can be held at up to ${MAX_DRIVE_SLOTS} venues.` };
  }

  const slots = [];
  for (let i = 0; i < raw.length; i += 1) {
    const s = raw[i] || {};
    const date = String(s.drive_date ?? '').trim();
    const time = String(s.drive_time ?? '').trim();
    const location = String(s.drive_location ?? '').trim();
    if (!date || !time || !location) {
      return {
        error: raw.length === 1
          ? 'Please give the date, time and venue.'
          : `Venue ${i + 1} needs a date, a time and a place.`,
      };
    }
    slots.push({
      id: Number.isInteger(s.id) ? s.id : null,
      drive_date: date,
      drive_time: time,
      drive_location: location,
      additional_instructions: String(s.additional_instructions ?? '').trim() || null,
      has_custom_instructions: s.has_custom_instructions === true,
    });
  }
  return { slots };
};

/**
 * Applies a job's list of slots.
 *
 * Rows the composer sent back with their id are updated, ones without an id are
 * new, and rows it did not send were removed by the officer. `notified_at` is
 * deliberately left alone on an update: it records when students were last
 * told, which editing a venue does not change — and a new row's NULL is exactly
 * what marks it as a venue nobody has been told about yet.
 *
 * Runs inside the caller's transaction. A half-applied list would leave a job
 * showing two venues when the officer entered three.
 */
export const saveDriveSlots = async ({ jobId, slots, userId }, client) => {
  const run = client.query.bind(client);

  const existing = await run('SELECT id FROM job_drives WHERE job_id = $1', [jobId]);
  const existingIds = new Set(existing.rows.map((r) => r.id));
  const keptIds = new Set();

  for (const slot of slots) {
    if (slot.id && existingIds.has(slot.id)) {
      keptIds.add(slot.id);
      await run(
        `UPDATE job_drives
            SET drive_date = $1,
                drive_time = $2,
                drive_location = $3,
                additional_instructions = $4,
                has_custom_instructions = $5,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $6 AND job_id = $7`,
        [slot.drive_date, slot.drive_time, slot.drive_location,
          slot.additional_instructions, slot.has_custom_instructions, slot.id, jobId]
      );
    } else {
      await run(
        `INSERT INTO job_drives
           (job_id, drive_date, drive_time, drive_location,
            additional_instructions, has_custom_instructions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [jobId, slot.drive_date, slot.drive_time, slot.drive_location,
          slot.additional_instructions, slot.has_custom_instructions, userId]
      );
    }
  }

  const removed = [...existingIds].filter((id) => !keptIds.has(id));
  if (removed.length > 0) {
    await run('DELETE FROM job_drives WHERE job_id = $1 AND id = ANY($2::int[])', [jobId, removed]);
  }

  return readDriveSlots(jobId, run);
};

/**
 * Whether the students already told about this drive are now holding a message
 * that no longer matches it.
 *
 * True only when they were told at all — a drive nobody has been notified about
 * needs a first notification, not a correction, and the composer should not
 * nag about one. After that it is true if any venue has never been announced,
 * or any was edited since the announcement went out.
 */
export const driveNeedsRenotify = (rows) => {
  const wasNotified = rows.some((r) => r.notified_at);
  if (!wasNotified) return false;
  return rows.some((r) => !r.notified_at || new Date(r.updated_at) > new Date(r.notified_at));
};

/**
 * A job's drive, joined without multiplying the row it is joined to.
 *
 * `LEFT JOIN job_drives ON jd.job_id = j.id` was exactly one row while a job
 * could only have one venue. A job with three now returns three copies of
 * whatever it was joined to — three of every job on the student's list, three
 * of every application. This returns one row instead: the earliest venue in the
 * flat columns every existing reader already uses, and the whole list beside it
 * as `drive_slots`.
 *
 * `alias` is the jobs table's alias at the call site — `j` on all three of them
 * today, but naming it keeps the snippet honest if a fourth differs.
 */
export const driveSlotsLateralSql = (alias = 'j') => `
  LEFT JOIN LATERAL (
    SELECT d.id, d.drive_date, d.drive_time, d.drive_location,
           d.additional_instructions, d.notified_at,
           (SELECT jsonb_agg(jsonb_build_object(
                     'id', x.id,
                     'drive_date', x.drive_date,
                     'drive_time', x.drive_time,
                     'drive_location', x.drive_location,
                     'additional_instructions', x.additional_instructions)
                   ORDER BY x.drive_date, x.drive_time, x.id)
              FROM job_drives x WHERE x.job_id = ${alias}.id) AS drive_slots
      FROM job_drives d
     WHERE d.job_id = ${alias}.id
     ORDER BY d.drive_date, d.drive_time, d.id
     LIMIT 1
  ) jd ON TRUE`;

/** Stamps the whole job's slots as announced, at one moment. */
export const markDriveNotified = async (jobId, run) => {
  await run(
    'UPDATE job_drives SET notified_at = CURRENT_TIMESTAMP WHERE job_id = $1',
    [jobId]
  );
};

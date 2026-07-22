import { query } from '../config/database.js';

/**
 * Per-college locks set by the super admin (deadline control).
 *
 * Two independent lock types:
 *   'registration' — blocks NEW student registration for that college.
 *                    Already-approved students keep logging in; only the
 *                    register flow is refused (see registerStudent).
 *   'prn_ranges'   — blocks that college's placement officer from adding,
 *                    editing or deleting PRN ranges. The super admin is
 *                    never blocked (they are the unlock path).
 *
 * Presence of a row in college_locks = locked. Unlock deletes the row.
 *
 * Every helper degrades gracefully: if the college_locks table does not
 * exist yet (migration 005 not applied) or a query fails, callers are told
 * "not locked" — so a deploy that lands before its migration never blocks a
 * student or officer by accident.
 */

export const LOCK_TYPES = ['registration', 'prn_ranges'];

/** True when (college, lockType) is currently locked. Defaults to false on error. */
export const isCollegeLocked = async (collegeId, lockType) => {
  if (!collegeId) return false;
  try {
    const result = await query(
      'SELECT 1 FROM college_locks WHERE college_id = $1 AND lock_type = $2 LIMIT 1',
      [collegeId, lockType]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('college lock check failed, defaulting to unlocked:', error.message);
    return false;
  }
};

/**
 * All active locks, joined with who locked them and when.
 * Returns [] on error. Shape: { college_id, lock_type, reason, locked_at,
 * locked_by, locked_by_name }.
 */
export const getAllCollegeLocks = async () => {
  try {
    const result = await query(
      `SELECT cl.college_id, cl.lock_type, cl.reason, cl.allowed_prns, cl.locked_at, cl.locked_by,
              sa.name AS locked_by_name, u.email AS locked_by_email
       FROM college_locks cl
       LEFT JOIN users u ON cl.locked_by = u.id
       LEFT JOIN super_admins sa ON sa.user_id = cl.locked_by`
    );
    return result.rows;
  } catch (error) {
    console.error('failed to read college locks:', error.message);
    return [];
  }
};

/** Lock (college, lockType). Idempotent — re-locking refreshes reason/actor. */
export const setCollegeLock = async (collegeId, lockType, userId, reason) => {
  await query(
    `INSERT INTO college_locks (college_id, lock_type, locked_by, reason, locked_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (college_id, lock_type)
     DO UPDATE SET locked_by = $3, reason = $4, locked_at = CURRENT_TIMESTAMP`,
    [collegeId, lockType, userId, reason || null]
  );
};

/** Unlock (college, lockType). No-op if it wasn't locked. */
export const clearCollegeLock = async (collegeId, lockType) => {
  await query(
    'DELETE FROM college_locks WHERE college_id = $1 AND lock_type = $2',
    [collegeId, lockType]
  );
};

/**
 * Registration-lock state for a college, including its allow-list.
 * { locked: bool, allowedPrns: string[] }. Defaults to unlocked on error.
 */
export const getRegistrationLock = async (collegeId) => {
  if (!collegeId) return { locked: false, allowedPrns: [] };
  try {
    const result = await query(
      `SELECT allowed_prns FROM college_locks
       WHERE college_id = $1 AND lock_type = 'registration' LIMIT 1`,
      [collegeId]
    );
    if (result.rows.length === 0) return { locked: false, allowedPrns: [] };
    const allowed = result.rows[0].allowed_prns;
    return { locked: true, allowedPrns: Array.isArray(allowed) ? allowed : [] };
  } catch (error) {
    console.error('registration lock check failed, defaulting to unlocked:', error.message);
    return { locked: false, allowedPrns: [] };
  }
};

/**
 * True when a college's registration is locked AND this PRN is not on the
 * allow-list — i.e. this PRN should be refused. `prn` must already be trimmed.
 */
export const isRegistrationBlocked = async (collegeId, prn) => {
  const { locked, allowedPrns } = await getRegistrationLock(collegeId);
  return locked && !allowedPrns.includes(prn);
};

/**
 * Normalize a raw allow-list input (array, or a string separated by
 * commas/spaces/newlines) into deduped, trimmed, numeric-only PRN strings.
 * Returns { prns } (sorted) or { error } with a user-facing message.
 */
export const parseAllowedPrns = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { prns: [] };

  const parts = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[\s,;]+/);
  const prns = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];

  if (prns.length === 0) return { prns: [] };
  if (prns.length > 500) {
    return { error: 'Too many allowed PRNs (max 500) — consider unlocking the college instead' };
  }
  const nonNumeric = prns.filter((p) => !/^\d+$/.test(p));
  if (nonNumeric.length > 0) {
    return { error: `Allowed PRNs must be numbers only: ${nonNumeric.join(', ')}` };
  }
  return { prns: prns.sort() };
};

/**
 * Replace the allow-list on a college's registration lock. Requires the
 * college to currently be registration-locked (there is nothing to allow past
 * otherwise). Returns true if updated, false if the college wasn't locked.
 */
export const setRegistrationAllowedPrns = async (collegeId, prns) => {
  const result = await query(
    `UPDATE college_locks SET allowed_prns = $2::jsonb
     WHERE college_id = $1 AND lock_type = 'registration'`,
    [collegeId, JSON.stringify(prns)]
  );
  return result.rowCount > 0;
};

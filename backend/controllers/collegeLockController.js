import { query } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import {
  LOCK_TYPES,
  getAllCollegeLocks,
  setCollegeLock,
  clearCollegeLock,
  parseAllowedPrns,
  setRegistrationAllowedPrns,
} from '../utils/collegeLocks.js';

/**
 * Super-admin control of per-college registration / PRN-range locks.
 *
 * Two lock types (see utils/collegeLocks.js): 'registration' freezes new
 * student registration for a college; 'prn_ranges' stops that college's
 * placement officer from adding/editing/deleting PRN ranges. The super admin
 * is never blocked by either — they are the unlock path.
 */

// @desc    List every active college with its two lock states
// @route   GET /api/super-admin/college-locks
// @access  Private (Super Admin)
export const getCollegeLocks = async (req, res) => {
  try {
    const collegesResult = await query(
      `SELECT c.id, c.college_name, r.region_name
       FROM colleges c
       JOIN regions r ON c.region_id = r.id
       WHERE c.is_active = TRUE
       ORDER BY c.college_name`
    );

    const locks = await getAllCollegeLocks();
    // index locks by "collegeId:lockType" for O(1) lookup
    const lockMap = new Map(
      locks.map((l) => [`${l.college_id}:${l.lock_type}`, l])
    );

    const buildLock = (collegeId, lockType) => {
      const l = lockMap.get(`${collegeId}:${lockType}`);
      if (!l) return { locked: false };
      const base = {
        locked: true,
        reason: l.reason,
        locked_at: l.locked_at,
        locked_by_name: l.locked_by_name,
        locked_by_email: l.locked_by_email,
      };
      // Only registration locks carry an allow-list
      if (lockType === 'registration') {
        base.allowed_prns = Array.isArray(l.allowed_prns) ? l.allowed_prns : [];
      }
      return base;
    };

    const data = collegesResult.rows.map((c) => ({
      college_id: c.id,
      college_name: c.college_name,
      region_name: c.region_name,
      registration: buildLock(c.id, 'registration'),
      prn_ranges: buildLock(c.id, 'prn_ranges'),
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get college locks error:', error);
    res.status(500).json({ success: false, message: 'Error fetching college locks', error: error.message });
  }
};

// @desc    Lock a college (or all colleges) for a given lock type
// @route   POST /api/super-admin/college-locks
// @access  Private (Super Admin)
// @body    { college_id: number | 'all', lock_type: 'registration' | 'prn_ranges', reason? }
export const lockCollege = async (req, res) => {
  try {
    const { college_id, lock_type, reason } = req.body;

    if (!LOCK_TYPES.includes(lock_type)) {
      return res.status(400).json({
        success: false,
        message: `lock_type must be one of: ${LOCK_TYPES.join(', ')}`,
      });
    }

    const collegeIds = await resolveCollegeIds(college_id);
    if (collegeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No matching active college(s) to lock' });
    }

    for (const id of collegeIds) {
      await setCollegeLock(id, lock_type, req.user.id, reason);
    }

    await logActivity(
      req.user.id,
      'lock_college',
      `Locked ${lock_type} for ${college_id === 'all' ? 'all colleges' : `college ${college_id}`}${reason ? ` — ${reason}` : ''}`,
      'college_lock',
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: `Locked ${lock_type} for ${collegeIds.length} college(s)`,
      locked_count: collegeIds.length,
    });
  } catch (error) {
    console.error('Lock college error:', error);
    res.status(500).json({ success: false, message: 'Error locking college', error: error.message });
  }
};

// @desc    Unlock a college (or all colleges) for a given lock type
// @route   DELETE /api/super-admin/college-locks/:collegeId/:lockType
// @access  Private (Super Admin)  (collegeId may be 'all')
export const unlockCollege = async (req, res) => {
  try {
    const { collegeId, lockType } = req.params;

    if (!LOCK_TYPES.includes(lockType)) {
      return res.status(400).json({
        success: false,
        message: `lockType must be one of: ${LOCK_TYPES.join(', ')}`,
      });
    }

    const collegeIds = await resolveCollegeIds(collegeId);

    for (const id of collegeIds) {
      await clearCollegeLock(id, lockType);
    }

    await logActivity(
      req.user.id,
      'unlock_college',
      `Unlocked ${lockType} for ${collegeId === 'all' ? 'all colleges' : `college ${collegeId}`}`,
      'college_lock',
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: `Unlocked ${lockType} for ${collegeIds.length} college(s)`,
      unlocked_count: collegeIds.length,
    });
  } catch (error) {
    console.error('Unlock college error:', error);
    res.status(500).json({ success: false, message: 'Error unlocking college', error: error.message });
  }
};

// @desc    Replace the allow-list of PRNs that may register despite a
//          college's registration lock
// @route   PUT /api/super-admin/college-locks/:collegeId/allowed-prns
// @access  Private (Super Admin)
// @body    { allowed_prns: string | string[] }
export const setAllowedPrns = async (req, res) => {
  try {
    const collegeId = parseInt(req.params.collegeId);
    if (Number.isNaN(collegeId)) {
      return res.status(400).json({ success: false, message: 'Invalid college id' });
    }

    const parsed = parseAllowedPrns(req.body.allowed_prns);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const updated = await setRegistrationAllowedPrns(collegeId, parsed.prns);
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'This college is not registration-locked. Lock it first, then add allowed PRNs.',
      });
    }

    await logActivity(
      req.user.id,
      'set_registration_allowed_prns',
      `Set ${parsed.prns.length} allowed PRN(s) for college ${collegeId}'s registration lock`,
      'college_lock',
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: `Saved ${parsed.prns.length} allowed PRN(s)`,
      allowed_prns: parsed.prns,
    });
  } catch (error) {
    console.error('Set allowed PRNs error:', error);
    res.status(500).json({ success: false, message: 'Error saving allowed PRNs', error: error.message });
  }
};

/** Resolve a college_id param ('all' or a numeric id) to a list of active college ids. */
async function resolveCollegeIds(collegeId) {
  if (collegeId === 'all') {
    const result = await query('SELECT id FROM colleges WHERE is_active = TRUE');
    return result.rows.map((r) => r.id);
  }
  const id = parseInt(collegeId);
  return Number.isNaN(id) ? [] : [id];
}

import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import { generateStudentPDF } from '../utils/pdfGenerator.js';
import { deleteImage, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if PRN falls within a given range
 * Handles both numeric and string comparisons
 */
const isPRNInRange = (prn, start, end) => {
  // Handle numeric comparison
  if (!isNaN(prn) && !isNaN(start) && !isNaN(end)) {
    const prnNum = parseInt(prn);
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    return prnNum >= startNum && prnNum <= endNum;
  }

  // Handle string comparison
  return prn >= start && prn <= end;
};

/**
 * Deactivate students whose PRN matches the given range
 * Sets is_active to FALSE in users table
 *
 * @param {Object} range - PRN range object with single_prn or range_start/range_end
 * @param {number} adminId - ID of the admin performing the action
 * @returns {number} Count of deactivated students
 */
const deactivateStudentsInRange = async (range, adminId) => {
  try {
    let studentsToDeactivate = [];

    if (range.single_prn) {
      // Handle single PRN
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1`,
        [range.single_prn]
      );
      studentsToDeactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s`
      );

      studentsToDeactivate = studentsResult.rows.filter(student =>
        isPRNInRange(student.prn, range.range_start, range.range_end)
      );
    }

    if (studentsToDeactivate.length === 0) {
      return 0;
    }

    // Deactivate users for these students
    const userIds = studentsToDeactivate.map(s => s.user_id);
    await query(
      `UPDATE users SET is_active = FALSE WHERE id = ANY($1::int[])`,
      [userIds]
    );

    // Log activity for each deactivated student
    for (const student of studentsToDeactivate) {
      await logActivity(
        adminId,
        'DEACTIVATE_STUDENT_VIA_PRN_RANGE',
        `Deactivated student PRN: ${student.prn} due to PRN range disable`,
        'student',
        student.id,
        { prn: student.prn, range_id: range.id }
      );
    }

    return studentsToDeactivate.length;
  } catch (error) {
    console.error('Error deactivating students in range:', error);
    throw error;
  }
};

/**
 * Delete students and their associated data whose PRN matches the given range
 * This is a hard delete - removes all records from database
 *
 * @param {Object} range - PRN range object with single_prn or range_start/range_end
 * @param {number} adminId - ID of the admin performing the action
 * @returns {number} Count of deleted students
 */
const deleteStudentsInRange = async (range, adminId) => {
  try {
    let studentsToDelete = [];

    if (range.single_prn) {
      // Handle single PRN
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1`,
        [range.single_prn]
      );
      studentsToDelete = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s`
      );

      studentsToDelete = studentsResult.rows.filter(student =>
        isPRNInRange(student.prn, range.range_start, range.range_end)
      );
    }

    if (studentsToDelete.length === 0) {
      return 0;
    }

    // Log activity for each student before deletion
    for (const student of studentsToDelete) {
      await logActivity(
        adminId,
        'DELETE_STUDENT_VIA_PRN_RANGE',
        `Deleted student PRN: ${student.prn} due to PRN range deletion`,
        'student',
        student.id,
        { prn: student.prn, range_id: range.id }
      );
    }

    // Delete users (CASCADE will handle students, job_applications, etc.)
    const userIds = studentsToDelete.map(s => s.user_id);
    await query(
      `DELETE FROM users WHERE id = ANY($1::int[])`,
      [userIds]
    );

    return studentsToDelete.length;
  } catch (error) {
    console.error('Error deleting students in range:', error);
    throw error;
  }
};

/**
 * Reactivate students whose PRN matches active ranges
 * Called when a PRN range is enabled
 *
 * @param {Object} range - PRN range object with single_prn or range_start/range_end
 * @param {number} adminId - ID of the admin performing the action
 * @returns {number} Count of reactivated students
 */
const reactivateStudentsInRange = async (range, adminId) => {
  try {
    let studentsToReactivate = [];

    if (range.single_prn) {
      // Handle single PRN
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1`,
        [range.single_prn]
      );
      studentsToReactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s`
      );

      studentsToReactivate = studentsResult.rows.filter(student =>
        isPRNInRange(student.prn, range.range_start, range.range_end)
      );
    }

    if (studentsToReactivate.length === 0) {
      return 0;
    }

    // Reactivate users for these students
    const userIds = studentsToReactivate.map(s => s.user_id);
    await query(
      `UPDATE users SET is_active = TRUE WHERE id = ANY($1::int[])`,
      [userIds]
    );

    // Log activity for each reactivated student
    for (const student of studentsToReactivate) {
      await logActivity(
        adminId,
        'REACTIVATE_STUDENT_VIA_PRN_RANGE',
        `Reactivated student PRN: ${student.prn} due to PRN range enable`,
        'student',
        student.id,
        { prn: student.prn, range_id: range.id }
      );
    }

    return studentsToReactivate.length;
  } catch (error) {
    console.error('Error reactivating students in range:', error);
    throw error;
  }
};

// ========================================
// PRN MANAGEMENT
// ========================================

// @desc    Get all PRN ranges
// @route   GET /api/super-admin/prn-ranges
// @access  Private (Super Admin)
export const getPRNRanges = async (req, res) => {
  try {
    const rangesResult = await query(
      `SELECT pr.*,
              u.email as added_by_email,
              c.college_name,
              c.college_code
       FROM prn_ranges pr
       LEFT JOIN users u ON pr.added_by = u.id
       LEFT JOIN colleges c ON pr.college_id = c.id
       ORDER BY pr.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: rangesResult.rows.length,
      data: rangesResult.rows,
    });
  } catch (error) {
    console.error('Get PRN ranges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PRN ranges',
      error: error.message,
    });
  }
};

// @desc    Add PRN range or single PRN
// @route   POST /api/super-admin/prn-ranges
// @access  Private (Super Admin)
export const addPRNRange = async (req, res) => {
  try {
    const { range_start, range_end, single_prn, description, year } = req.body;

    // Validate input
    if ((!range_start || !range_end) && !single_prn) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a range (start and end) or a single PRN',
      });
    }

    if ((range_start || range_end) && single_prn) {
      return res.status(400).json({
        success: false,
        message: 'Cannot provide both range and single PRN',
      });
    }

    const result = await query(
      `INSERT INTO prn_ranges (range_start, range_end, single_prn, description, year, added_by, created_by_role, college_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'super_admin', NULL)
       RETURNING *`,
      [range_start || null, range_end || null, single_prn || null, description, year || null, req.user.id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'ADD_PRN_RANGE',
      single_prn
        ? `Added single PRN: ${single_prn}`
        : `Added PRN range: ${range_start}-${range_end}`,
      'prn_range',
      result.rows[0].id,
      { range_start, range_end, single_prn, year },
      req
    );

    res.status(201).json({
      success: true,
      message: 'PRN range added successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding PRN range',
      error: error.message,
    });
  }
};

// @desc    Update PRN range
// @route   PUT /api/super-admin/prn-ranges/:id
// @access  Private (Super Admin)
export const updatePRNRange = async (req, res) => {
  try {
    const { is_active, is_enabled, description, disabled_reason, year, range_start, range_end, single_prn } = req.body;
    const rangeId = req.params.id;

    // Get the current range data before updating
    const currentRangeResult = await query(
      'SELECT * FROM prn_ranges WHERE id = $1',
      [rangeId]
    );

    if (currentRangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const currentRange = currentRangeResult.rows[0];

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
    }

    if (is_enabled !== undefined) {
      paramCount++;
      updates.push(`is_enabled = $${paramCount}`);
      params.push(is_enabled);

      // If disabling, set disabled_date and disabled_by
      if (is_enabled === false) {
        paramCount++;
        updates.push(`disabled_date = $${paramCount}`);
        params.push(new Date());

        paramCount++;
        updates.push(`disabled_by = $${paramCount}`);
        params.push(req.user.id);

        if (disabled_reason) {
          paramCount++;
          updates.push(`disabled_reason = $${paramCount}`);
          params.push(disabled_reason);
        }
      } else {
        // If enabling, clear disabled fields
        updates.push(`disabled_date = NULL, disabled_by = NULL, disabled_reason = NULL`);
      }
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (year !== undefined) {
      paramCount++;
      updates.push(`year = $${paramCount}`);
      params.push(year || null);
    }

    if (range_start !== undefined) {
      paramCount++;
      updates.push(`range_start = $${paramCount}`);
      params.push(range_start || null);
    }

    if (range_end !== undefined) {
      paramCount++;
      updates.push(`range_end = $${paramCount}`);
      params.push(range_end || null);
    }

    if (single_prn !== undefined) {
      paramCount++;
      updates.push(`single_prn = $${paramCount}`);
      params.push(single_prn || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    paramCount++;
    params.push(rangeId);

    const result = await query(
      `UPDATE prn_ranges
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    const updatedRange = result.rows[0];

    // Handle student activation/deactivation based on range status
    let affectedStudentsCount = 0;
    let studentAction = '';

    // Determine if we need to deactivate or reactivate students
    const wasActive = currentRange.is_active && currentRange.is_enabled;
    const isNowActive = updatedRange.is_active && updatedRange.is_enabled;

    if (wasActive && !isNowActive) {
      // Range was disabled - deactivate students
      affectedStudentsCount = await deactivateStudentsInRange(updatedRange, req.user.id);
      studentAction = 'deactivated';
    } else if (!wasActive && isNowActive) {
      // Range was enabled - reactivate students
      affectedStudentsCount = await reactivateStudentsInRange(updatedRange, req.user.id);
      studentAction = 'reactivated';
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PRN_RANGE',
      `Updated PRN range ID: ${rangeId}${is_enabled !== undefined ? (is_enabled ? ' (Enabled)' : ' (Disabled)') : ''}${affectedStudentsCount > 0 ? ` - ${affectedStudentsCount} students ${studentAction}` : ''}`,
      'prn_range',
      rangeId,
      { is_active, is_enabled, description, disabled_reason, affectedStudentsCount },
      req
    );

    res.status(200).json({
      success: true,
      message: `PRN range updated successfully${affectedStudentsCount > 0 ? `. ${affectedStudentsCount} students ${studentAction}` : ''}`,
      data: updatedRange,
      affectedStudents: affectedStudentsCount,
    });
  } catch (error) {
    console.error('Update PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PRN range',
      error: error.message,
    });
  }
};

// @desc    Delete PRN range
// @route   DELETE /api/super-admin/prn-ranges/:id
// @access  Private (Super Admin)
export const deletePRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    // Get the range data before deletion
    const rangeResult = await query('SELECT * FROM prn_ranges WHERE id = $1', [rangeId]);

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const rangeToDelete = rangeResult.rows[0];

    // Delete all students in this range
    const deletedStudentsCount = await deleteStudentsInRange(rangeToDelete, req.user.id);

    // Delete the PRN range
    await query('DELETE FROM prn_ranges WHERE id = $1', [rangeId]);

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_PRN_RANGE',
      `Deleted PRN range ID: ${rangeId}${deletedStudentsCount > 0 ? ` - ${deletedStudentsCount} students deleted` : ''}`,
      'prn_range',
      rangeId,
      { ...rangeToDelete, deletedStudentsCount },
      req
    );

    res.status(200).json({
      success: true,
      message: `PRN range deleted successfully${deletedStudentsCount > 0 ? `. ${deletedStudentsCount} students and their records permanently deleted` : ''}`,
      deletedStudents: deletedStudentsCount,
    });
  } catch (error) {
    console.error('Delete PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PRN range',
      error: error.message,
    });
  }
};

// ========================================
// PLACEMENT OFFICER MANAGEMENT
// ========================================

// @desc    Get all placement officers
// @route   GET /api/super-admin/placement-officers
// @access  Private (Super Admin)
export const getPlacementOfficers = async (req, res) => {
  try {
    const officersResult = await query(
      `SELECT po.*, c.college_name, r.id as region_id, r.region_name, u.email,
              u.is_active as status, u.last_login,
              appointed_by_user.email as appointed_by_email
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       JOIN users u ON po.user_id = u.id
       LEFT JOIN users appointed_by_user ON po.appointed_by = appointed_by_user.id
       ORDER BY c.college_name`
    );

    res.status(200).json({
      success: true,
      count: officersResult.rows.length,
      data: officersResult.rows,
    });
  } catch (error) {
    console.error('Get placement officers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching placement officers',
      error: error.message,
    });
  }
};

// @desc    Get placement officer history for a college
// @route   GET /api/super-admin/placement-officers/history/:collegeId
// @access  Private (Super Admin)
export const getOfficerHistory = async (req, res) => {
  try {
    const collegeId = req.params.collegeId;

    const historyResult = await query(
      `SELECT poh.*, removed_by_user.email as removed_by_email
       FROM placement_officer_history poh
       LEFT JOIN users removed_by_user ON poh.removed_by = removed_by_user.id
       WHERE poh.college_id = $1
       ORDER BY poh.removed_date DESC`,
      [collegeId]
    );

    res.status(200).json({
      success: true,
      count: historyResult.rows.length,
      data: historyResult.rows,
    });
  } catch (error) {
    console.error('Get officer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching officer history',
      error: error.message,
    });
  }
};

// @desc    Add/Change placement officer for a college
// @route   POST /api/super-admin/placement-officers
// @access  Private (Super Admin)
export const addPlacementOfficer = async (req, res) => {
  try {
    const { college_id, officer_name, phone_number, designation, officer_email, college_email } =
      req.body;

    // Validation
    if (!college_id || !officer_name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college, officer name, and phone number',
      });
    }

    await transaction(async (client) => {
      // Check if college already has an active officer
      const existingOfficerResult = await client.query(
        'SELECT * FROM placement_officers WHERE college_id = $1 AND is_active = TRUE',
        [college_id]
      );

      if (existingOfficerResult.rows.length > 0) {
        // Move existing officer to history
        const existingOfficer = existingOfficerResult.rows[0];

        await client.query(
          `INSERT INTO placement_officer_history
           (college_id, officer_name, phone_number, designation, officer_email, appointed_date, removed_by, removal_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            existingOfficer.college_id,
            existingOfficer.officer_name,
            existingOfficer.phone_number,
            existingOfficer.designation,
            existingOfficer.officer_email,
            existingOfficer.appointed_date,
            req.user.id,
            'Replaced by new officer',
          ]
        );

        // Deactivate old officer
        await client.query(
          'UPDATE placement_officers SET is_active = FALSE WHERE id = $1',
          [existingOfficer.id]
        );

        // Deactivate old user account
        await client.query('UPDATE users SET is_active = FALSE WHERE id = $1', [
          existingOfficer.user_id,
        ]);
      }

      // Hash default password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);

      // Create new user account
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'placement_officer')
         RETURNING id`,
        [phone_number, hashedPassword]
      );

      const userId = userResult.rows[0].id;

      // Create new placement officer
      await client.query(
        `INSERT INTO placement_officers
         (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email, appointed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, college_id, officer_name, phone_number, designation, officer_email, college_email, req.user.id]
      );
    });

    // Log activity
    await logActivity(
      req.user.id,
      'ADD_PLACEMENT_OFFICER',
      `Added placement officer ${officer_name} for college ID ${college_id}`,
      'placement_officer',
      null,
      { college_id, officer_name, phone_number },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Placement officer added successfully',
    });
  } catch (error) {
    console.error('Add placement officer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding placement officer',
      error: error.message,
    });
  }
};

// @desc    Update placement officer phone number
// @route   PUT /api/super-admin/placement-officers/:id
// @access  Private (Super Admin)
export const updatePlacementOfficer = async (req, res) => {
  try {
    const officerId = req.params.id;
    const { phone_number, designation, officer_email } = req.body;

    const result = await query(
      `UPDATE placement_officers
       SET phone_number = COALESCE($1, phone_number),
           designation = COALESCE($2, designation),
           officer_email = COALESCE($3, officer_email)
       WHERE id = $4
       RETURNING *`,
      [phone_number, designation, officer_email, officerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PLACEMENT_OFFICER',
      `Updated placement officer ID: ${officerId}`,
      'placement_officer',
      officerId,
      { phone_number, designation, officer_email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Placement officer updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update placement officer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating placement officer',
      error: error.message,
    });
  }
};

// @desc    Reset placement officer password to default (123)
// @route   PUT /api/super-admin/placement-officers/:id/reset-password
// @access  Private (Super Admin)
export const resetPlacementOfficerPassword = async (req, res) => {
  try {
    const officerId = req.params.id;

    // Get officer details
    const officerResult = await query(
      'SELECT * FROM placement_officers WHERE id = $1',
      [officerId]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer not found',
      });
    }

    const officer = officerResult.rows[0];

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123', salt);

    // Update user password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, officer.user_id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'RESET_PLACEMENT_OFFICER_PASSWORD',
      `Reset password for placement officer ${officer.officer_name} (ID: ${officerId})`,
      'placement_officer',
      officerId,
      { officer_name: officer.officer_name, college_id: officer.college_id },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Placement officer password reset to default (123) successfully',
    });
  } catch (error) {
    console.error('Reset placement officer password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting placement officer password',
      error: error.message,
    });
  }
};

// @desc    Remove/Deactivate placement officer
// @route   DELETE /api/super-admin/placement-officers/:id
// @access  Private (Super Admin)
export const deletePlacementOfficer = async (req, res) => {
  try {
    const officerId = req.params.id;

    await transaction(async (client) => {
      // Get officer details before deletion
      const officerResult = await client.query(
        'SELECT * FROM placement_officers WHERE id = $1',
        [officerId]
      );

      if (officerResult.rows.length === 0) {
        throw new Error('Placement officer not found');
      }

      const officer = officerResult.rows[0];

      // Move to history
      await client.query(
        `INSERT INTO placement_officer_history
         (college_id, officer_name, phone_number, designation, officer_email, appointed_date, removed_by, removal_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          officer.college_id,
          officer.officer_name,
          officer.phone_number,
          officer.designation,
          officer.officer_email,
          officer.appointed_date,
          req.user.id,
          'Manually removed by super admin',
        ]
      );

      // Deactivate officer
      await client.query(
        'UPDATE placement_officers SET is_active = FALSE WHERE id = $1',
        [officerId]
      );

      // Deactivate user account
      await client.query(
        'UPDATE users SET is_active = FALSE WHERE id = $1',
        [officer.user_id]
      );

      // Log activity
      await logActivity(
        req.user.id,
        'DELETE_PLACEMENT_OFFICER',
        `Removed placement officer ${officer.officer_name} (ID: ${officerId})`,
        'placement_officer',
        officerId,
        { officer_name: officer.officer_name, college_id: officer.college_id },
        req
      );
    });

    res.status(200).json({
      success: true,
      message: 'Placement officer removed successfully',
    });
  } catch (error) {
    console.error('Delete placement officer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing placement officer',
    });
  }
};

// @desc    Clear officer history for a college
// @route   DELETE /api/super-admin/placement-officers/history/:collegeId
// @access  Private (Super Admin)
export const clearOfficerHistory = async (req, res) => {
  try {
    const collegeId = req.params.collegeId;

    const result = await query(
      'DELETE FROM placement_officer_history WHERE college_id = $1',
      [collegeId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'CLEAR_OFFICER_HISTORY',
      `Cleared officer history for college ID: ${collegeId}`,
      'placement_officer_history',
      null,
      { college_id: collegeId, deleted_count: result.rowCount },
      req
    );

    res.status(200).json({
      success: true,
      message: `Successfully cleared ${result.rowCount} history record(s)`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error('Clear officer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing officer history',
      error: error.message,
    });
  }
};

// ========================================
// JOB MANAGEMENT
// ========================================

// @desc    Create job posting
// @route   POST /api/super-admin/jobs
// @access  Private (Super Admin)
export const createJob = async (req, res) => {
  try {
    const {
      title,
      company_name,
      description,
      location,
      no_of_vacancies,
      salary_package,
      application_form_url,
      application_deadline,
      min_cgpa,
      max_backlogs,
      allowed_branches,
      target_type,
      target_regions,
      target_colleges,
    } = req.body;

    // Validation
    if (
      !title ||
      !company_name ||
      !description ||
      !application_deadline
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (title, company, description, deadline)',
      });
    }

    const result = await transaction(async (client) => {
      // Create job
      const jobResult = await client.query(
        `INSERT INTO jobs
         (job_title, company_name, job_description, job_location, no_of_vacancies, salary_package,
          application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs, allowed_branches,
          target_type, target_regions, target_colleges, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11, $12, $13, $14, $15, TRUE)
         RETURNING *`,
        [
          title,
          company_name,
          description,
          location || null,
          no_of_vacancies ? parseInt(no_of_vacancies) : null,
          salary_package || null,
          application_form_url,
          application_deadline,
          min_cgpa || null,
          max_backlogs !== undefined && max_backlogs !== '' ? max_backlogs : null,
          allowed_branches ? (typeof allowed_branches === 'string' ? allowed_branches : JSON.stringify(allowed_branches)) : null,
          target_type || 'all',
          target_regions ? (typeof target_regions === 'string' ? target_regions : JSON.stringify(target_regions)) : null,
          target_colleges ? (typeof target_colleges === 'string' ? target_colleges : JSON.stringify(target_colleges)) : null,
          req.user.id,
        ]
      );

      return jobResult.rows[0];
    });

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE_JOB',
      `Created job posting: ${title} at ${company_name}`,
      'job',
      result.id,
      { title, company_name },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message,
    });
  }
};

// @desc    Get all jobs (excluding soft-deleted)
// @route   GET /api/super-admin/jobs
// @access  Private (Super Admin)
export const getJobs = async (req, res) => {
  try {
    const jobsResult = await query(
      `SELECT j.*, u.email as created_by_email,
              COUNT(DISTINCT ja.id) as applications_count
       FROM jobs j
       LEFT JOIN users u ON j.created_by = u.id
       LEFT JOIN job_applications ja ON j.id = ja.job_id
       WHERE j.deleted_at IS NULL
       GROUP BY j.id, u.email
       ORDER BY j.created_at DESC`
    );

    // Map field names and parse JSONB fields to arrays
    const jobs = jobsResult.rows.map((job) => ({
      ...job,
      // Map database field names to frontend expected names
      title: job.job_title,
      description: job.job_description,
      location: job.job_location,
      // Parse JSONB fields to arrays
      allowed_branches: job.allowed_branches
        ? (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : job.allowed_branches)
        : [],
      target_regions: job.target_regions
        ? (typeof job.target_regions === 'string' ? JSON.parse(job.target_regions) : job.target_regions)
        : [],
      target_colleges: job.target_colleges
        ? (typeof job.target_colleges === 'string' ? JSON.parse(job.target_colleges) : job.target_colleges)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message,
    });
  }
};

// @desc    Update job
// @route   PUT /api/super-admin/jobs/:id
// @access  Private (Super Admin)
export const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      title,
      company_name,
      description,
      location,
      no_of_vacancies,
      salary_package,
      application_form_url,
      application_deadline,
      min_cgpa,
      max_backlogs,
      allowed_branches,
      target_type,
      target_regions,
      target_colleges,
      is_active,
    } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`job_title = $${paramCount++}`);
      values.push(title);
    }
    if (company_name !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(company_name);
    }
    if (description !== undefined) {
      updates.push(`job_description = $${paramCount++}`);
      values.push(description);
    }
    if (location !== undefined) {
      updates.push(`job_location = $${paramCount++}`);
      values.push(location);
    }
    if (no_of_vacancies !== undefined) {
      updates.push(`no_of_vacancies = $${paramCount++}`);
      values.push(no_of_vacancies ? parseInt(no_of_vacancies) : null);
    }
    if (salary_package !== undefined) {
      updates.push(`salary_package = $${paramCount++}`);
      values.push(salary_package);
    }
    if (application_form_url !== undefined) {
      updates.push(`application_form_url = $${paramCount++}`);
      values.push(application_form_url);
    }
    if (application_deadline !== undefined) {
      updates.push(`application_deadline = $${paramCount++}`);
      values.push(application_deadline);
    }
    if (min_cgpa !== undefined) {
      updates.push(`min_cgpa = $${paramCount++}`);
      values.push(min_cgpa || null);
    }
    if (max_backlogs !== undefined) {
      updates.push(`max_backlogs = $${paramCount++}`);
      values.push(max_backlogs !== '' ? max_backlogs : null);
    }
    if (allowed_branches !== undefined) {
      updates.push(`allowed_branches = $${paramCount++}`);
      values.push(allowed_branches ? (typeof allowed_branches === 'string' ? allowed_branches : JSON.stringify(allowed_branches)) : null);
    }
    if (target_type !== undefined) {
      updates.push(`target_type = $${paramCount++}`);
      values.push(target_type);
    }
    if (target_regions !== undefined) {
      updates.push(`target_regions = $${paramCount++}`);
      values.push(target_regions ? (typeof target_regions === 'string' ? target_regions : JSON.stringify(target_regions)) : null);
    }
    if (target_colleges !== undefined) {
      updates.push(`target_colleges = $${paramCount++}`);
      values.push(target_colleges ? (typeof target_colleges === 'string' ? target_colleges : JSON.stringify(target_colleges)) : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    values.push(jobId);
    const result = await query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Convert JSONB fields to strings for response
    const updatedJob = {
      ...result.rows[0],
      allowed_branches: result.rows[0].allowed_branches ? (typeof result.rows[0].allowed_branches === 'string' ? result.rows[0].allowed_branches : JSON.stringify(result.rows[0].allowed_branches)) : null,
      target_regions: result.rows[0].target_regions ? (typeof result.rows[0].target_regions === 'string' ? result.rows[0].target_regions : JSON.stringify(result.rows[0].target_regions)) : null,
      target_colleges: result.rows[0].target_colleges ? (typeof result.rows[0].target_colleges === 'string' ? result.rows[0].target_colleges : JSON.stringify(result.rows[0].target_colleges)) : null,
    };

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_JOB',
      `Updated job: ${updatedJob.job_title} at ${updatedJob.company_name}`,
      'job',
      jobId,
      req.body,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob,
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message,
    });
  }
};

// @desc    Delete job (soft delete)
// @route   DELETE /api/super-admin/jobs/:id
// @access  Private (Super Admin)
export const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    // Get job details before deletion for activity log
    const jobResult = await query('SELECT * FROM jobs WHERE id = $1 AND deleted_at IS NULL', [jobId]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobResult.rows[0];

    // Soft delete the job
    await query(
      'UPDATE jobs SET is_deleted = TRUE, is_active = FALSE, deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
      [req.user.id, jobId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'SOFT_DELETE_JOB',
      `Soft deleted job: ${job.job_title} at ${job.company_name}`,
      'job',
      jobId,
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job moved to deleted history',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message,
    });
  }
};

// @desc    Toggle job status (activate/deactivate)
// @route   PUT /api/super-admin/jobs/:id/toggle-status
// @access  Private (Super Admin)
export const toggleJobStatus = async (req, res) => {
  try {
    const jobId = req.params.id;

    // Get current job status
    const jobResult = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobResult.rows[0];
    const newStatus = !job.is_active;

    // Toggle the status
    await query(
      'UPDATE jobs SET is_active = $1 WHERE id = $2',
      [newStatus, jobId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'TOGGLE_JOB_STATUS',
      `${newStatus ? 'Activated' : 'Deactivated'} job: ${job.job_title} at ${job.company_name}`,
      'job',
      jobId,
      { old_status: job.is_active, new_status: newStatus },
      req
    );

    res.status(200).json({
      success: true,
      message: `Job ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus },
    });
  } catch (error) {
    console.error('Toggle job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling job status',
      error: error.message,
    });
  }
};

// ========================================
// WHITELIST REQUESTS
// ========================================

// @desc    Get all whitelist requests
// @route   GET /api/super-admin/whitelist-requests
// @access  Private (Super Admin)
export const getWhitelistRequests = async (req, res) => {
  try {
    const requestsResult = await query(
      `SELECT wr.*,
              wr.request_reason as whitelist_reason,
              s.prn as student_prn,
              s.student_name,
              s.email as student_email,
              s.branch as student_branch,
              s.blacklist_reason,
              s.blacklisted_date as blacklisted_at,
              c.college_name,
              r.region_name,
              po.officer_name,
              po.officer_email,
              po.phone_number as officer_phone,
              blacklister.email as blacklisted_by_name,
              reviewer.email as reviewed_by_name,
              wr.reviewed_date as reviewed_at
       FROM whitelist_requests wr
       JOIN students s ON wr.student_id = s.id
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       JOIN placement_officers po ON wr.requested_by = po.user_id
       LEFT JOIN users blacklister ON s.blacklisted_by = blacklister.id
       LEFT JOIN users reviewer ON wr.reviewed_by = reviewer.id
       ORDER BY wr.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: requestsResult.rows.length,
      data: requestsResult.rows,
    });
  } catch (error) {
    console.error('Get whitelist requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching whitelist requests',
      error: error.message,
    });
  }
};

// @desc    Approve whitelist request
// @route   PUT /api/super-admin/whitelist-requests/:id/approve
// @access  Private (Super Admin)
export const approveWhitelistRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { review_comment } = req.body;

    await transaction(async (client) => {
      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM whitelist_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Whitelist request not found');
      }

      const request = requestResult.rows[0];

      // Update request status
      await client.query(
        `UPDATE whitelist_requests
         SET status = 'approved', reviewed_by = $1, review_comment = $2, reviewed_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [req.user.id, review_comment, requestId]
      );

      // Remove blacklist from student
      await client.query(
        `UPDATE students
         SET is_blacklisted = FALSE, blacklist_reason = NULL
         WHERE id = $1`,
        [request.student_id]
      );
    });

    // Log activity
    await logActivity(
      req.user.id,
      'APPROVE_WHITELIST',
      `Approved whitelist request ID: ${requestId}`,
      'whitelist_request',
      requestId,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Whitelist request approved successfully',
    });
  } catch (error) {
    console.error('Approve whitelist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving whitelist request',
      error: error.message,
    });
  }
};

// @desc    Reject whitelist request
// @route   PUT /api/super-admin/whitelist-requests/:id/reject
// @access  Private (Super Admin)
export const rejectWhitelistRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { review_comment } = req.body;

    await query(
      `UPDATE whitelist_requests
       SET status = 'rejected', reviewed_by = $1, review_comment = $2, reviewed_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [req.user.id, review_comment, requestId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'REJECT_WHITELIST',
      `Rejected whitelist request ID: ${requestId}`,
      'whitelist_request',
      requestId,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Whitelist request rejected successfully',
    });
  } catch (error) {
    console.error('Reject whitelist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting whitelist request',
      error: error.message,
    });
  }
};

// ========================================
// ACTIVITY LOGS
// ========================================

// @desc    Get activity logs
// @route   GET /api/super-admin/activity-logs
// @access  Private (Super Admin)
export const getActivityLogs = async (req, res) => {
  try {
    const {
      limit = 50,
      page = 1,
      user_id,
      action_type,
      user_role,
      search,
      date_from,
      date_to,
      export: exportCsv
    } = req.query;

    // Parse limit and page as integers
    const limitInt = parseInt(limit) || 50;
    const pageInt = parseInt(page) || 1;

    let queryText = `
      SELECT al.*, u.email as user_email, u.role as user_role,
             COALESCE(po.officer_name, s.student_name, u.email) as user_name
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN placement_officers po ON u.id = po.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filter by user_id
    if (user_id) {
      paramCount++;
      queryText += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
    }

    // Filter by action_type
    if (action_type) {
      paramCount++;
      queryText += ` AND al.action_type = $${paramCount}`;
      params.push(action_type);
    }

    // Filter by user_role (convert display name to database value)
    if (user_role) {
      paramCount++;
      queryText += ` AND u.role = $${paramCount}`;
      const roleMap = {
        'Super Admin': 'super_admin',
        'Placement Officer': 'placement_officer',
        'Student': 'student'
      };
      params.push(roleMap[user_role] || user_role);
    }

    // Filter by search (email or action_type)
    if (search) {
      paramCount++;
      queryText += ` AND (u.email ILIKE $${paramCount} OR al.action_type ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Filter by date_from
    if (date_from) {
      paramCount++;
      queryText += ` AND al.created_at >= $${paramCount}`;
      params.push(date_from);
    }

    // Filter by date_to
    if (date_to) {
      paramCount++;
      queryText += ` AND al.created_at <= $${paramCount}::date + interval '1 day'`;
      params.push(date_to);
    }

    // If CSV or PDF export is requested
    if (exportCsv === 'csv' || exportCsv === 'pdf') {
      queryText += ` ORDER BY al.created_at DESC`;
      const logsResult = await query(queryText, params);

      // Generate CSV
      if (exportCsv === 'csv') {
        const csvRows = [];
        csvRows.push(['Timestamp', 'User Info', 'User Role', 'Action Type'].join(','));

        logsResult.rows.forEach(log => {
          const userInfo = log.user_email || log.user_phone || '';
          csvRows.push([
            log.created_at,
            userInfo,
            log.user_role || '',
            log.action_type || ''
          ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
        return res.send(csv);
      }

      // Generate PDF
      if (exportCsv === 'pdf') {
        const { generateActivityLogsPDF } = await import('../utils/pdfGenerator.js');
        return await generateActivityLogsPDF(logsResult.rows, {}, res);
      }
    }

    // Count total for pagination - rebuild query instead of replace
    let countQueryText = `
      SELECT COUNT(*) as total
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN placement_officers po ON u.id = po.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE 1=1
    `;

    // Apply same filters
    let countParamNum = 0;
    if (user_id) {
      countParamNum++;
      countQueryText += ` AND al.user_id = $${countParamNum}`;
    }
    if (action_type) {
      countParamNum++;
      countQueryText += ` AND al.action_type = $${countParamNum}`;
    }
    if (user_role) {
      countParamNum++;
      countQueryText += ` AND u.role = $${countParamNum}`;
    }
    if (search) {
      countParamNum++;
      countQueryText += ` AND (u.email ILIKE $${countParamNum} OR al.action_type ILIKE $${countParamNum})`;
    }
    if (date_from) {
      countParamNum++;
      countQueryText += ` AND al.created_at >= $${countParamNum}`;
    }
    if (date_to) {
      countParamNum++;
      countQueryText += ` AND al.created_at <= $${countParamNum}::date + interval '1 day'`;
    }

    const countResult = await query(countQueryText, params);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitInt);

    // Add pagination
    const offset = (pageInt - 1) * limitInt;
    paramCount++;
    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
    params.push(limitInt);
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const logsResult = await query(queryText, params);

    res.status(200).json({
      success: true,
      count: logsResult.rows.length,
      total: total,
      currentPage: pageInt,
      totalPages: totalPages,
      data: logsResult.rows,
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message,
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/super-admin/dashboard
// @access  Private (Super Admin)
export const getDashboard = async (req, res) => {
  try {
    const totalStudents = await query(
      'SELECT COUNT(*) as count FROM students s JOIN users u ON s.user_id = u.id WHERE u.is_active = TRUE'
    );
    const approvedStudents = await query(
      "SELECT COUNT(*) as count FROM students s JOIN users u ON s.user_id = u.id WHERE u.is_active = TRUE AND s.registration_status = 'approved'"
    );
    const pendingStudents = await query(
      "SELECT COUNT(*) as count FROM students s JOIN users u ON s.user_id = u.id WHERE u.is_active = TRUE AND s.registration_status = 'pending'"
    );
    const blacklistedStudents = await query(
      'SELECT COUNT(*) as count FROM students s JOIN users u ON s.user_id = u.id WHERE u.is_active = TRUE AND s.is_blacklisted = TRUE'
    );
    const totalJobs = await query('SELECT COUNT(*) as count FROM jobs');
    const activeJobs = await query(
      'SELECT COUNT(*) as count FROM jobs WHERE is_active = TRUE'
    );
    const totalColleges = await query('SELECT COUNT(*) as count FROM colleges');
    const totalOfficers = await query('SELECT COUNT(*) as count FROM placement_officers WHERE is_active = TRUE');
    const activePrnRanges = await query('SELECT COUNT(*) as count FROM prn_ranges WHERE is_active = TRUE');
    const pendingWhitelistRequests = await query(
      "SELECT COUNT(*) as count FROM whitelist_requests WHERE status = 'pending'"
    );
    const recentActivitiesCount = await query(
      'SELECT COUNT(*) as count FROM activity_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL \'7 days\''
    );

    res.status(200).json({
      success: true,
      data: {
        // Snake case for frontend compatibility
        total_students: parseInt(totalStudents.rows[0].count),
        approved_students: parseInt(approvedStudents.rows[0].count),
        pending_students: parseInt(pendingStudents.rows[0].count),
        blacklisted_students: parseInt(blacklistedStudents.rows[0].count),
        total_jobs: parseInt(totalJobs.rows[0].count),
        active_jobs: parseInt(activeJobs.rows[0].count),
        total_colleges: parseInt(totalColleges.rows[0].count),
        total_officers: parseInt(totalOfficers.rows[0].count),
        active_prn_ranges: parseInt(activePrnRanges.rows[0].count),
        pending_whitelist_requests: parseInt(pendingWhitelistRequests.rows[0].count),
        recent_activities_count: parseInt(recentActivitiesCount.rows[0].count),
        // Also include camelCase for backward compatibility
        totalStudents: parseInt(totalStudents.rows[0].count),
        approvedStudents: parseInt(approvedStudents.rows[0].count),
        pendingStudents: parseInt(pendingStudents.rows[0].count),
        blacklistedStudents: parseInt(blacklistedStudents.rows[0].count),
        activeJobs: parseInt(activeJobs.rows[0].count),
        pendingWhitelistRequests: parseInt(pendingWhitelistRequests.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

// @desc    Get super admin profile
// @route   GET /api/super-admin/profile
// @access  Private (Super Admin)
export const getProfile = async (req, res) => {
  try {
    const profileResult = await query(
      `SELECT sa.*, u.email, u.last_login
       FROM super_admins sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: profileResult.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Update super admin profile
// @route   PUT /api/super-admin/profile
// @access  Private (Super Admin)
export const updateProfile = async (req, res) => {
  try {
    const { name, phone_number } = req.body;

    // Validation
    if (!name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits',
      });
    }

    // Update profile
    const result = await query(
      `UPDATE super_admins
       SET name = $1, phone_number = $2
       WHERE user_id = $3
       RETURNING *`,
      [name, phone_number, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'PROFILE_UPDATE',
      'Updated profile information',
      'super_admin',
      result.rows[0].id,
      { name, phone_number },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// @desc    Get all students (for job eligibility checking and management)
// @route   GET /api/super-admin/students?status=approved&search=...&page=1&limit=100
// @access  Private (Super Admin)
export const getAllStudents = async (req, res) => {
  try {
    const {
      status,
      college_id,
      region_id,
      cgpa_min,
      backlog,
      search,
      page = 1,
      limit = 100,
      dob_from,
      dob_to,
      height_min,
      height_max,
      weight_min,
      weight_max,
      has_driving_license,
      has_pan_card,
      has_aadhar_card,
      has_passport,
      districts
    } = req.query;

    // Parse pagination params
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const offset = (pageNum - 1) * limitNum;

    // Build query with proper blacklist filtering
    let queryText = `
      SELECT s.id, s.prn, s.student_name as name, s.email, s.mobile_number,
             s.date_of_birth, s.age, s.gender, s.branch, s.programme_cgpa,
             s.backlog_count, s.registration_status, s.is_blacklisted,
             s.photo_url, s.created_at, s.college_id, s.region_id,
             c.college_name, r.region_name, u.email as user_email, u.is_active as user_is_active,
             COALESCE(ep.height_cm, s.height) as height,
             COALESCE(ep.weight_kg, s.weight) as weight,
             ep.district
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE u.is_active = TRUE
    `;
    const params = [];
    let paramCount = 0;

    // CRITICAL FIX: Filter based on status and blacklist
    // - If status is 'blacklisted', show only blacklisted students
    // - Otherwise, exclude blacklisted students from the list
    // - Only show students whose user account is active (not deactivated by PRN range disable)
    if (status === 'blacklisted') {
      queryText += ` AND s.is_blacklisted = TRUE`;
    } else if (status === 'approved') {
      queryText += ` AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`;
    } else if (status === 'pending') {
      queryText += ` AND s.registration_status = 'pending' AND s.is_blacklisted = FALSE`;
    } else if (status === 'rejected') {
      queryText += ` AND s.registration_status = 'rejected' AND s.is_blacklisted = FALSE`;
    } else {
      // Default: Show all non-blacklisted students
      queryText += ` AND s.is_blacklisted = FALSE`;
    }

    // Additional filters
    if (college_id) {
      paramCount++;
      queryText += ` AND s.college_id = $${paramCount}`;
      params.push(college_id);
    }

    if (region_id) {
      paramCount++;
      queryText += ` AND s.region_id = $${paramCount}`;
      params.push(region_id);
    }

    if (cgpa_min) {
      paramCount++;
      queryText += ` AND s.programme_cgpa >= $${paramCount}`;
      params.push(cgpa_min);
    }

    if (backlog !== undefined) {
      if (backlog === '0') {
        queryText += ` AND s.backlog_count = 'All cleared'`;
      } else {
        paramCount++;
        queryText += ` AND s.backlog_count = $${paramCount}`;
        params.push(backlog);
      }
    }

    // Add branch filter
    const { branch } = req.query;
    if (branch) {
      paramCount++;
      queryText += ` AND s.branch = $${paramCount}`;
      params.push(branch);
    }

    // DOB filters
    if (dob_from) {
      paramCount++;
      queryText += ` AND s.date_of_birth >= $${paramCount}`;
      params.push(dob_from);
    }
    if (dob_to) {
      paramCount++;
      queryText += ` AND s.date_of_birth <= $${paramCount}`;
      params.push(dob_to);
    }

    // Height filters
    if (height_min) {
      paramCount++;
      queryText += ` AND COALESCE(ep.height_cm, s.height) >= $${paramCount} AND COALESCE(ep.height_cm, s.height) IS NOT NULL`;
      params.push(parseInt(height_min));
    }
    if (height_max) {
      paramCount++;
      queryText += ` AND COALESCE(ep.height_cm, s.height) <= $${paramCount} AND COALESCE(ep.height_cm, s.height) IS NOT NULL`;
      params.push(parseInt(height_max));
    }

    // Weight filters
    if (weight_min) {
      paramCount++;
      queryText += ` AND COALESCE(ep.weight_kg, s.weight) >= $${paramCount} AND COALESCE(ep.weight_kg, s.weight) IS NOT NULL`;
      params.push(parseFloat(weight_min));
    }
    if (weight_max) {
      paramCount++;
      queryText += ` AND COALESCE(ep.weight_kg, s.weight) <= $${paramCount} AND COALESCE(ep.weight_kg, s.weight) IS NOT NULL`;
      params.push(parseFloat(weight_max));
    }

    // Document filters
    if (has_driving_license === 'yes') {
      queryText += ` AND s.has_driving_license = TRUE`;
    } else if (has_driving_license === 'no') {
      queryText += ` AND (s.has_driving_license = FALSE OR s.has_driving_license IS NULL)`;
    }

    if (has_pan_card === 'yes') {
      queryText += ` AND s.has_pan_card = TRUE`;
    } else if (has_pan_card === 'no') {
      queryText += ` AND (s.has_pan_card = FALSE OR s.has_pan_card IS NULL)`;
    }

    if (has_aadhar_card === 'yes') {
      queryText += ` AND COALESCE(ep.has_aadhar_card, FALSE) = TRUE`;
    } else if (has_aadhar_card === 'no') {
      queryText += ` AND COALESCE(ep.has_aadhar_card, FALSE) = FALSE`;
    }

    if (has_passport === 'yes') {
      queryText += ` AND COALESCE(ep.has_passport, FALSE) = TRUE`;
    } else if (has_passport === 'no') {
      queryText += ` AND COALESCE(ep.has_passport, FALSE) = FALSE`;
    }

    // District filter (multi-select)
    if (districts) {
      const districtArray = districts.split(',').map(d => d.trim()).filter(d => d);
      if (districtArray.length > 0) {
        paramCount++;
        queryText += ` AND ep.district = ANY($${paramCount})`;
        params.push(districtArray);
      }
    }

    if (search) {
      paramCount++;
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.student_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.mobile_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count for pagination
    const countQuery = queryText.replace(
      /SELECT[\s\S]+?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add pagination
    queryText += ' ORDER BY s.created_at DESC';
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    params.push(limitNum);
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const studentsResult = await query(queryText, params);

    res.status(200).json({
      success: true,
      count: studentsResult.rows.length,
      total: total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: studentsResult.rows,
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// @desc    Search student by PRN
// @route   GET /api/super-admin/students/search/:prn
// @access  Private (Super Admin)
export const searchStudentByPRN = async (req, res) => {
  try {
    const { prn } = req.params;

    if (!prn) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a PRN to search',
      });
    }

    const studentResult = await query(
      `SELECT s.*, s.student_name as name,
              c.college_name,
              c.college_code,
              r.region_name,
              u.email as user_email,
              blacklister.email as blacklisted_by_email
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users blacklister ON s.blacklisted_by = blacklister.id
       WHERE s.prn ILIKE $1`,
      [prn]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found with this PRN',
      });
    }

    res.status(200).json({
      success: true,
      data: studentResult.rows[0],
    });
  } catch (error) {
    console.error('Search student by PRN error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching student',
      error: error.message,
    });
  }
};

// @desc    Blacklist student (Super Admin)
// @route   PUT /api/super-admin/students/:id/blacklist
// @access  Private (Super Admin)
export const blacklistStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Blacklist reason is required',
      });
    }

    // Check if student exists
    const studentCheck = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if already blacklisted
    if (studentCheck.rows[0].is_blacklisted) {
      return res.status(400).json({
        success: false,
        message: 'Student is already blacklisted',
      });
    }

    // Blacklist the student
    const result = await query(
      `UPDATE students
       SET is_blacklisted = TRUE,
           blacklist_reason = $1,
           blacklisted_date = CURRENT_TIMESTAMP,
           blacklisted_by = $2
       WHERE id = $3
       RETURNING *`,
      [reason, req.user.id, studentId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'BLACKLIST_STUDENT',
      `Blacklisted student PRN: ${result.rows[0].prn}`,
      'student',
      studentId,
      { reason },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student blacklisted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Blacklist student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blacklisting student',
      error: error.message,
    });
  }
};

// @desc    Remove student from blacklist (Super Admin)
// @route   PUT /api/super-admin/students/:id/whitelist
// @access  Private (Super Admin)
export const whitelistStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Check if student exists
    const studentCheck = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if student is blacklisted
    if (!studentCheck.rows[0].is_blacklisted) {
      return res.status(400).json({
        success: false,
        message: 'Student is not blacklisted',
      });
    }

    // Remove from blacklist
    const result = await query(
      `UPDATE students
       SET is_blacklisted = FALSE,
           blacklist_reason = NULL,
           blacklisted_date = NULL,
           blacklisted_by = NULL
       WHERE id = $1
       RETURNING *`,
      [studentId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'WHITELIST_STUDENT',
      `Removed student from blacklist PRN: ${result.rows[0].prn}`,
      'student',
      studentId,
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student removed from blacklist successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Whitelist student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from blacklist',
      error: error.message,
    });
  }
};

// @desc    Delete student completely from database
// @route   DELETE /api/super-admin/students/:id
// @access  Private (Super Admin)
export const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get student details before deletion
    const studentResult = await query(
      'SELECT s.*, s.student_name as name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = studentResult.rows[0];
    const userId = student.user_id;

    // Delete photo from Cloudinary if exists
    if (student.photo_cloudinary_id) {
      try {
        // Delete the image file
        await deleteImage(student.photo_cloudinary_id);
        console.log(`✅ Deleted photo for student ${student.prn} from Cloudinary`);

        // Extract and delete the folder
        const folderPath = extractFolderPath(student.photo_cloudinary_id);
        if (folderPath) {
          await deleteFolderOnly(folderPath);
          console.log(`✅ Deleted folder ${folderPath} from Cloudinary`);
        }
      } catch (cloudinaryError) {
        console.error(`⚠️ Error deleting Cloudinary assets for student ${student.prn}:`, cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete student and related user in transaction
    await transaction(async (client) => {
      // Delete job applications first (foreign key constraint)
      await client.query('DELETE FROM job_applications WHERE student_id = $1', [studentId]);

      // Delete whitelist requests
      await client.query('DELETE FROM whitelist_requests WHERE student_id = $1', [studentId]);

      // Delete notification recipients
      await client.query('DELETE FROM notification_recipients WHERE user_id = $1', [userId]);

      // Delete activity logs
      await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);

      // Delete student profile
      await client.query('DELETE FROM students WHERE id = $1', [studentId]);

      // Delete user account
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    // Log activity
    await logActivity(
      req.user.id,
      'STUDENT_DELETE',
      `Deleted student: ${student.prn} - ${student.name}`,
      'student',
      studentId,
      { prn: student.prn, email: student.email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
};

// @desc    Get students who have applied to a specific job (across all colleges)
// @route   GET /api/super-admin/jobs/:jobId/applicants
// @access  Private (Super Admin)
export const getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get all students who have applied to this job across all colleges
    const applicantsResult = await query(
      `SELECT
        s.id, s.prn, s.student_name as name, s.email, s.mobile_number, s.branch,
        s.programme_cgpa as cgpa,
        s.backlog_count, s.date_of_birth, s.college_id, s.registration_status, s.region_id,
        c.college_name,
        r.region_name,
        ja.id as application_id, ja.applied_date, ja.application_status,
        j.job_title, j.company_name, j.min_cgpa, j.max_backlogs, j.allowed_branches
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN regions r ON s.region_id = r.id
      WHERE ja.job_id = $1
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
      ORDER BY ja.applied_date DESC`,
      [jobId]
    );

    // Parse allowed_branches if it's a string
    const applicants = applicantsResult.rows.map((applicant) => ({
      ...applicant,
      allowed_branches: applicant.allowed_branches
        ? (typeof applicant.allowed_branches === 'string'
            ? JSON.parse(applicant.allowed_branches)
            : applicant.allowed_branches)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: applicants.length,
      data: applicants,
    });
  } catch (error) {
    console.error('Get job applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job applicants',
      error: error.message,
    });
  }
};

// ========================================
// JOB REQUESTS MANAGEMENT
// ========================================

// @desc    Get pending job requests from placement officers
// @route   GET /api/super-admin/jobs/pending-requests
// @access  Private (Super Admin)
export const getPendingJobRequests = async (req, res) => {
  try {
    const jobRequestsResult = await query(
      `SELECT jr.*,
              po.officer_name,
              c.college_name,
              r.region_name,
              jrrt.requires_academic_extended,
              jrrt.requires_physical_details,
              jrrt.requires_family_details,
              jrrt.requires_personal_details,
              jrrt.requires_document_verification,
              jrrt.requires_education_preferences,
              jrrt.specific_field_requirements,
              jrrt.custom_fields
       FROM job_requests jr
       JOIN placement_officers po ON jr.placement_officer_id = po.id
       JOIN colleges c ON jr.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       LEFT JOIN job_request_requirement_templates jrrt ON jr.id = jrrt.job_request_id
       WHERE jr.status = 'pending'
       ORDER BY jr.created_at DESC`
    );

    // Map field names and parse JSON fields safely
    const jobRequests = jobRequestsResult.rows.map((request) => ({
      ...request,
      // Map database field names to frontend expected names
      title: request.job_title,
      description: request.job_description,
      location: request.location,
      // Parse JSONB fields to arrays
      allowed_branches: request.allowed_branches
        ? (typeof request.allowed_branches === 'string' ? JSON.parse(request.allowed_branches) : request.allowed_branches)
        : [],
      target_regions: request.target_regions
        ? (typeof request.target_regions === 'string' ? JSON.parse(request.target_regions) : request.target_regions)
        : [],
      target_colleges: request.target_colleges
        ? (typeof request.target_colleges === 'string' ? JSON.parse(request.target_colleges) : request.target_colleges)
        : [],
      // Parse requirements JSONB fields
      specific_field_requirements: request.specific_field_requirements
        ? (typeof request.specific_field_requirements === 'string' ? JSON.parse(request.specific_field_requirements) : request.specific_field_requirements)
        : {},
      custom_fields: request.custom_fields
        ? (typeof request.custom_fields === 'string' ? JSON.parse(request.custom_fields) : request.custom_fields)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: jobRequests.length,
      data: jobRequests,
    });
  } catch (error) {
    console.error('Get pending job requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending job requests',
      error: error.message,
    });
  }
};

// @desc    Approve job request and create job
// @route   PUT /api/super-admin/jobs/requests/:id/approve
// @access  Private (Super Admin)
export const approveJobRequest = async (req, res) => {
  let jobRequest; // Declare outside try block for error logging

  try {
    const { id } = req.params;

    // Get job request details
    const jobRequestResult = await query(
      'SELECT * FROM job_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (jobRequestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or already processed',
      });
    }

    jobRequest = jobRequestResult.rows[0];

    // Determine target type - convert from job_requests format to jobs format
    let targetType = 'all';
    let targetRegions = jobRequest.target_regions;
    let targetColleges = jobRequest.target_colleges;

    if (jobRequest.target_type === 'specific') {
      if (targetRegions && (Array.isArray(targetRegions) ? targetRegions.length > 0 : true)) {
        targetType = 'region';
      } else if (targetColleges && (Array.isArray(targetColleges) ? targetColleges.length > 0 : true)) {
        targetType = 'college';
      }
    } else if (jobRequest.target_type === 'college' || jobRequest.target_type === 'region') {
      targetType = jobRequest.target_type;
    }

    // Create job from job request using transaction
    const result = await transaction(async (client) => {
      // Create the job
      const jobResult = await client.query(
        `INSERT INTO jobs
         (job_title, company_name, job_description, job_location, no_of_vacancies, salary_package,
          application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs,
          allowed_branches, target_type, target_regions, target_colleges, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14::jsonb, $15, TRUE)
         RETURNING *`,
        [
          jobRequest.job_title,
          jobRequest.company_name,
          jobRequest.job_description,
          jobRequest.location || null,
          jobRequest.no_of_vacancies || null,
          jobRequest.salary_range || null,
          jobRequest.application_form_url,
          jobRequest.application_deadline,
          jobRequest.min_cgpa || null,
          jobRequest.max_backlogs !== null && jobRequest.max_backlogs !== undefined ? jobRequest.max_backlogs : null,
          jobRequest.allowed_branches ? JSON.stringify(jobRequest.allowed_branches) : null,
          targetType,
          targetRegions ? JSON.stringify(targetRegions) : null,
          targetColleges ? JSON.stringify(targetColleges) : null,
          req.user.id,
        ]
      );

      // Copy job request requirements to job requirements (if they exist)
      const requirementsResult = await client.query(
        `SELECT * FROM job_request_requirement_templates WHERE job_request_id = $1`,
        [id]
      );

      if (requirementsResult.rows.length > 0) {
        const requirements = requirementsResult.rows[0];
        await client.query(
          `INSERT INTO job_requirement_templates (
            job_id, min_cgpa, max_backlogs, allowed_branches,
            requires_academic_extended, requires_physical_details,
            requires_family_details, requires_personal_details,
            requires_document_verification, requires_education_preferences,
            specific_field_requirements, custom_fields
          ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
          [
            jobResult.rows[0].id,
            requirements.min_cgpa,
            requirements.max_backlogs,
            requirements.allowed_branches ? JSON.stringify(requirements.allowed_branches) : null,
            requirements.requires_academic_extended,
            requirements.requires_physical_details,
            requirements.requires_family_details,
            requirements.requires_personal_details,
            requirements.requires_document_verification,
            requirements.requires_education_preferences,
            requirements.specific_field_requirements ? JSON.stringify(requirements.specific_field_requirements) : null,
            requirements.custom_fields ? JSON.stringify(requirements.custom_fields) : null
          ]
        );
      }

      // Update job request status
      await client.query(
        `UPDATE job_requests
         SET status = $1, reviewed_by = $2, reviewed_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['approved', req.user.id, id]
      );

      return jobResult.rows[0];
    });

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_APPROVE',
      `Approved job request and created job: ${jobRequest.company_name} - ${jobRequest.job_title}`,
      'job',
      result.id,
      { job_request_id: id },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job request approved and job created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Approve job request error:', error);
    console.error('Error stack:', error.stack);
    console.error('Job request data:', jobRequest);
    res.status(500).json({
      success: false,
      message: 'Error approving job request',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Reject job request
// @route   PUT /api/super-admin/jobs/requests/:id/reject
// @access  Private (Super Admin)
export const rejectJobRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_comment } = req.body;

    // Update job request status
    const result = await query(
      `UPDATE job_requests
       SET status = $1, reviewed_by = $2, review_comment = $3, reviewed_date = CURRENT_TIMESTAMP
       WHERE id = $4 AND status = $5
       RETURNING *`,
      ['rejected', req.user.id, review_comment || 'Rejected by Super Admin', id, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or already processed',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_REJECT',
      `Rejected job request: ${result.rows[0].company_name} - ${result.rows[0].job_title}`,
      'job_request',
      id,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job request rejected successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Reject job request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting job request',
      error: error.message,
    });
  }
};

// ========================================
// SUPER ADMIN MANAGEMENT
// ========================================

// @desc    Get all super admins
// @route   GET /api/super-admin/admins
// @access  Private (Super Admin)
export const getSuperAdmins = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, is_active, last_login, created_at, updated_at
       FROM users
       WHERE role = 'super_admin'
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get super admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching super admins',
      error: error.message,
    });
  }
};

// @desc    Create new super admin
// @route   POST /api/super-admin/admins
// @access  Private (Super Admin)
export const createSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create super admin
    const result = await query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, is_active, created_at`,
      [email, passwordHash, 'super_admin', true]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE_SUPER_ADMIN',
      `Created new super admin: ${email}`,
      'user',
      result.rows[0].id,
      { email },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create super admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating super admin',
      error: error.message,
    });
  }
};

// @desc    Deactivate super admin
// @route   PUT /api/super-admin/admins/:id/deactivate
// @access  Private (Super Admin)
export const deactivateSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    // Check if user exists and is a super admin
    const userCheck = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'super_admin']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
    }

    if (!userCheck.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Super admin is already deactivated',
      });
    }

    // Deactivate super admin
    const result = await query(
      `UPDATE users
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, is_active, updated_at`,
      [id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'DEACTIVATE_SUPER_ADMIN',
      `Deactivated super admin: ${userCheck.rows[0].email}`,
      'user',
      id,
      { email: userCheck.rows[0].email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Super admin deactivated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Deactivate super admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating super admin',
      error: error.message,
    });
  }
};

// @desc    Activate super admin
// @route   PUT /api/super-admin/admins/:id/activate
// @access  Private (Super Admin)
export const activateSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and is a super admin
    const userCheck = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'super_admin']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
    }

    if (userCheck.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Super admin is already active',
      });
    }

    // Activate super admin
    const result = await query(
      `UPDATE users
       SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, is_active, updated_at`,
      [id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'ACTIVATE_SUPER_ADMIN',
      `Activated super admin: ${userCheck.rows[0].email}`,
      'user',
      id,
      { email: userCheck.rows[0].email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Super admin activated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Activate super admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating super admin',
      error: error.message,
    });
  }
};

// @desc    Delete super admin
// @route   DELETE /api/super-admin/admins/:id
// @access  Private (Super Admin)
export const deleteSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Check if user exists and is a super admin
    const userCheck = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1 AND role = $2',
      [id, 'super_admin']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
    }

    // Only allow deletion of inactive super admins
    if (userCheck.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active super admin. Please deactivate first.',
      });
    }

    // Delete from super_admins table first (foreign key constraint)
    await query('DELETE FROM super_admins WHERE user_id = $1', [id]);

    // Delete from users table
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_SUPER_ADMIN',
      `Deleted super admin: ${userCheck.rows[0].email}`,
      'user',
      id,
      { email: userCheck.rows[0].email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Super admin deleted successfully',
    });
  } catch (error) {
    console.error('Delete super admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting super admin',
      error: error.message,
    });
  }
};

// ========================================
// NOTIFICATION MANAGEMENT (Super Admin)
// ========================================

// @desc    Get all colleges with student counts for notification targeting
// @route   GET /api/super-admin/colleges-for-notifications
// @access  Private (Super Admin)
export const getCollegesForNotifications = async (req, res) => {
  try {
    const collegesResult = await query(
      `SELECT c.id, c.college_name, c.college_code, r.region_name,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT s.branch) as branch_count
       FROM colleges c
       JOIN regions r ON c.region_id = r.id
       LEFT JOIN students s ON c.id = s.college_id
         AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
       WHERE c.is_active = TRUE
       GROUP BY c.id, c.college_name, c.college_code, r.region_name
       ORDER BY c.college_name ASC`
    );

    res.status(200).json({
      success: true,
      count: collegesResult.rows.length,
      data: collegesResult.rows,
    });
  } catch (error) {
    console.error('Get colleges for notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges',
      error: error.message,
    });
  }
};

// @desc    Get branches for specific colleges
// @route   POST /api/super-admin/branches-for-colleges
// @access  Private (Super Admin)
export const getBranchesForColleges = async (req, res) => {
  try {
    const { college_ids } = req.body;

    if (!college_ids || !Array.isArray(college_ids) || college_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college IDs',
      });
    }

    const branchesResult = await query(
      `SELECT s.college_id, c.college_name, s.branch, COUNT(s.id) as student_count
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       WHERE s.college_id = ANY($1::int[])
         AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
         AND s.branch IS NOT NULL
       GROUP BY s.college_id, c.college_name, s.branch
       ORDER BY c.college_name ASC, s.branch ASC`,
      [college_ids]
    );

    res.status(200).json({
      success: true,
      count: branchesResult.rows.length,
      data: branchesResult.rows,
    });
  } catch (error) {
    console.error('Get branches for colleges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message,
    });
  }
};

// @desc    Send notification to students (with college and branch filtering)
// @route   POST /api/super-admin/send-notification
// @access  Private (Super Admin)
export const sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      priority = 'normal',
      target_colleges = [], // Empty means all colleges
      target_branches = {} // { college_id: [branches] } - Empty object means all branches
    } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message',
      });
    }

    if (!title.trim() || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and message cannot be empty',
      });
    }

    // Build student query with college and branch filtering
    let studentQuery = `
      SELECT s.id, s.user_id, s.email, s.student_name, s.branch, s.college_id, c.college_name
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      WHERE s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
    `;
    const params = [];
    let paramCount = 0;

    // Add college filtering if specific colleges are selected
    if (target_colleges && target_colleges.length > 0) {
      paramCount++;
      params.push(target_colleges);
      studentQuery += ` AND s.college_id = ANY($${paramCount}::int[])`;
    }

    // Add branch filtering if specific branches are selected
    if (target_branches && Object.keys(target_branches).length > 0) {
      // Build complex OR condition for branches per college
      const branchConditions = [];
      Object.entries(target_branches).forEach(([collegeId, branches]) => {
        if (branches && branches.length > 0) {
          paramCount++;
          params.push(parseInt(collegeId));
          paramCount++;
          params.push(branches);
          branchConditions.push(`(s.college_id = $${paramCount - 1} AND s.branch = ANY($${paramCount}))`);
        }
      });

      if (branchConditions.length > 0) {
        studentQuery += ` AND (${branchConditions.join(' OR ')})`;
      }
    }

    // Get all eligible students
    const studentsResult = await query(studentQuery, params);
    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible students found for the selected criteria',
      });
    }

    // Send notification in transaction
    let notificationId;
    await transaction(async (client) => {
      // Create notification with priority
      const notificationResult = await client.query(
        `INSERT INTO notifications (title, message, created_by, target_type, priority)
         VALUES ($1, $2, $3, 'specific_colleges', $4)
         RETURNING id`,
        [title.trim(), message.trim(), req.user.id, priority]
      );

      notificationId = notificationResult.rows[0].id;

      // Add target colleges
      const targetCollegeIds = target_colleges.length > 0
        ? target_colleges
        : [...new Set(students.map(s => s.college_id))];

      for (const collegeId of targetCollegeIds) {
        await client.query(
          `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
           VALUES ($1, 'college', $2)`,
          [notificationId, collegeId]
        );
      }

      // Batch insert recipients for performance
      if (students.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize);
          const values = batch.map((_, idx) => `($1, $${idx + 2})`).join(', ');
          const recipientParams = [notificationId, ...batch.map(s => s.user_id)];

          await client.query(
            `INSERT INTO notification_recipients (notification_id, user_id)
             VALUES ${values}`,
            recipientParams
          );
        }
      }
    });

    // Async email sending for urgent notifications
    if (priority === 'urgent') {
      const { sendNotificationEmail } = await import('../config/emailService.js');

      setImmediate(async () => {
        try {
          console.log(`📧 [SUPER ADMIN] Sending urgent notification emails to ${students.length} students...`);

          const emailBatchSize = 50;
          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < students.length; i += emailBatchSize) {
            const batch = students.slice(i, i + emailBatchSize);

            const emailPromises = batch.map(async (student) => {
              try {
                if (student.email) {
                  const emailSubject = `[URGENT] ${title} - State Placement Cell`;
                  const emailContent = `
                    <h2>Hello ${student.student_name},</h2>
                    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #991b1b; font-weight: 600;">
                        🚨 URGENT NOTIFICATION FROM STATE PLACEMENT CELL
                      </p>
                    </div>
                    <h3 style="color: #1f2937;">${title}</h3>
                    <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                    <div style="background-color: #f3f4f6; padding: 12px; margin-top: 20px; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>From:</strong> State Placement Cell - ${student.college_name}
                      </p>
                    </div>
                    <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                      Please check your student portal for more details.
                    </p>
                  `;

                  await sendNotificationEmail(student.email, emailSubject, emailContent);
                  successCount++;
                }
              } catch (emailError) {
                console.error(`❌ Failed to send email to ${student.email}:`, emailError.message);
                failCount++;
              }
            });

            await Promise.allSettled(emailPromises);

            if (i + emailBatchSize < students.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          console.log(`✅ [SUPER ADMIN] Email sending completed: ${successCount} successful, ${failCount} failed`);
        } catch (error) {
          console.error('❌ [SUPER ADMIN] Error in async email sending:', error);
        }
      });
    }

    // Log activity
    const collegeInfo = target_colleges.length > 0
      ? `${target_colleges.length} college(s)`
      : 'all colleges';
    const branchInfo = Object.keys(target_branches).length > 0
      ? `specific branches`
      : 'all branches';

    await logActivity(
      req.user.id,
      'SEND_NOTIFICATION_SUPER_ADMIN',
      `Sent ${priority} notification to ${students.length} student(s) (${collegeInfo}, ${branchInfo}): ${title}`,
      'notification',
      notificationId,
      {
        title,
        priority,
        target_colleges,
        target_branches,
        recipient_count: students.length,
        email_sent: priority === 'urgent'
      },
      req
    );

    res.status(201).json({
      success: true,
      message: `Notification sent successfully to ${students.length} student(s)${priority === 'urgent' ? '. Urgent emails are being sent in the background.' : ''}`,
      data: {
        notification_id: notificationId,
        recipient_count: students.length,
        priority,
        email_notification_sent: priority === 'urgent',
        target_colleges: target_colleges.length > 0 ? target_colleges : 'All colleges',
        target_branches: Object.keys(target_branches).length > 0 ? target_branches : 'All branches'
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message,
    });
  }
};

// @desc    Custom export students with field selection
// @route   POST /api/super-admin/students/custom-export
// @access  Private (Super Admin)
export const customExportStudents = async (req, res) => {
  try {
    const { college_id, departments, fields, format = 'excel',
            company_name, drive_date, include_signature,
            cgpa_min, cgpa_max, backlog_count, search, status, region_id } = req.body;

    if (!fields || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one field to export',
      });
    }

    // Define available fields mapping
    const fieldMapping = {
      prn: 's.prn',
      student_name: 's.student_name',
      email: 's.email',
      mobile_number: 's.mobile_number',
      age: 's.age',
      gender: 's.gender',
      height: 's.height',
      weight: 's.weight',
      date_of_birth: 's.date_of_birth',
      branch: 's.branch',
      programme_cgpa: 's.programme_cgpa',
      cgpa_sem1: 's.cgpa_sem1',
      cgpa_sem2: 's.cgpa_sem2',
      cgpa_sem3: 's.cgpa_sem3',
      cgpa_sem4: 's.cgpa_sem4',
      cgpa_sem5: 's.cgpa_sem5',
      cgpa_sem6: 's.cgpa_sem6',
      backlog_count: 's.backlog_count',
      backlog_details: 's.backlog_details',
      complete_address: 's.complete_address',
      has_driving_license: 's.has_driving_license',
      has_pan_card: 's.has_pan_card',
      registration_status: 's.registration_status',
      is_blacklisted: 's.is_blacklisted',
      blacklist_reason: 's.blacklist_reason',
      college_name: 'c.college_name',
      region_name: 'r.region_name',
    };

    // Validate and build SELECT clause
    const selectFields = [];
    const columnHeaders = {};

    for (const field of fields) {
      if (fieldMapping[field]) {
        selectFields.push(`${fieldMapping[field]} AS ${field}`);
        // Create human-readable headers
        columnHeaders[field] = field
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    if (selectFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields selected',
      });
    }

    // Build query with filters
    let queryText = `
      SELECT ${selectFields.join(', ')}
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filter by region if specified
    if (region_id) {
      queryText += ` AND s.region_id = $${paramCount}`;
      params.push(region_id);
      paramCount++;
    }

    // Filter by college if specified
    if (college_id) {
      queryText += ` AND s.college_id = $${paramCount}`;
      params.push(college_id);
      paramCount++;
    }

    // Filter by departments if specified
    if (departments && departments.length > 0) {
      queryText += ` AND s.branch = ANY($${paramCount})`;
      params.push(departments);
      paramCount++;
    }

    // Filter by status
    if (status === 'blacklisted') {
      queryText += ` AND s.is_blacklisted = TRUE`;
    } else if (status === 'approved') {
      queryText += ` AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`;
    } else if (status === 'pending') {
      queryText += ` AND s.registration_status = 'pending' AND s.is_blacklisted = FALSE`;
    } else if (status === 'rejected') {
      queryText += ` AND s.registration_status = 'rejected' AND s.is_blacklisted = FALSE`;
    } else if (!status || status === 'all') {
      // Default: Show all non-blacklisted students
      queryText += ` AND s.is_blacklisted = FALSE`;
    }

    // Filter by minimum CGPA
    if (cgpa_min) {
      queryText += ` AND s.programme_cgpa >= $${paramCount}`;
      params.push(parseFloat(cgpa_min));
      paramCount++;
    }

    // Filter by maximum CGPA
    if (cgpa_max) {
      queryText += ` AND s.programme_cgpa <= $${paramCount}`;
      params.push(parseFloat(cgpa_max));
      paramCount++;
    }

    // Filter by backlog count
    if (backlog_count !== undefined && backlog_count !== '') {
      queryText += ` AND s.backlog_count = $${paramCount}`;
      params.push(parseInt(backlog_count));
      paramCount++;
    }

    // Filter by search query
    if (search && search.trim()) {
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.student_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.mobile_number ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    // Sort by college first, then branch, then PRN for organized export
    queryText += ' ORDER BY c.college_name, s.branch, s.prn';

    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;

    // Branch based on export format
    if (format === 'pdf') {
      // Determine college name for header
      const collegeName = students.length > 0 && students[0].college_name
        ? students[0].college_name
        : 'Multiple Colleges';

      return generateStudentPDF(students, {
        selectedFields: fields,
        collegeName: collegeName,
        companyName: company_name || null,
        driveDate: drive_date || null,
        includeSignature: include_signature === true,
      }, res);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Export');

    // Define columns based on selected fields
    worksheet.columns = fields.map(field => ({
      header: columnHeaders[field],
      key: field,
      width: 15,
    }));

    // Add rows
    worksheet.addRows(students);

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students-custom-export-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity
    await logActivity(
      req.user.id,
      'CUSTOM_EXPORT',
      `Exported ${students.length} students to ${format.toUpperCase()} with custom fields`,
      'student',
      null,
      {
        college_id,
        departments,
        fields,
        format,
        count: students.length
      },
      req
    );
  } catch (error) {
    console.error('Custom export students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

// @desc    Get available districts from extended profiles
// @route   GET /api/super-admin/districts
// @access  Private (Super Admin)
export const getAvailableDistricts = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT district
       FROM student_extended_profiles
       WHERE district IS NOT NULL AND district != ''
       ORDER BY district`
    );

    res.json({
      success: true,
      districts: result.rows.map(r => r.district)
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
};

// ========================================
// ADMIN NOTIFICATIONS (Auto-approved jobs, etc.)
// ========================================

// @desc    Get admin notifications (job auto-approvals, system alerts, etc.)
// @route   GET /api/super-admin/admin-notifications
// @access  Private (Super Admin)
export const getAdminNotifications = async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only = false, type } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (unread_only === 'true') {
      whereClause += ` AND an.is_read = FALSE`;
    }

    if (type) {
      whereClause += ` AND an.notification_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const notificationsResult = await query(
      `SELECT an.*,
              c.college_name,
              c.college_code,
              u.email as created_by_email,
              j.job_title,
              j.company_name as job_company
       FROM admin_notifications an
       LEFT JOIN colleges c ON an.created_by_college_id = c.id
       LEFT JOIN users u ON an.created_by_user_id = u.id
       LEFT JOIN jobs j ON an.related_entity_type = 'job' AND an.related_entity_id = j.id
       ${whereClause}
       ORDER BY an.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get unread count
    const unreadResult = await query(
      `SELECT COUNT(*) as unread_count FROM admin_notifications WHERE is_read = FALSE`
    );

    res.json({
      success: true,
      data: notificationsResult.rows,
      unread_count: parseInt(unreadResult.rows[0].unread_count),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notificationsResult.rows.length
      }
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin notifications',
      error: error.message
    });
  }
};

// @desc    Mark admin notification as read
// @route   PUT /api/super-admin/admin-notifications/:id/read
// @access  Private (Super Admin)
export const markAdminNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE admin_notifications
       SET is_read = TRUE, read_by = $1, read_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

// @desc    Mark all admin notifications as read
// @route   PUT /api/super-admin/admin-notifications/mark-all-read
// @access  Private (Super Admin)
export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    const result = await query(
      `UPDATE admin_notifications
       SET is_read = TRUE, read_by = $1, read_at = CURRENT_TIMESTAMP
       WHERE is_read = FALSE
       RETURNING id`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: `${result.rows.length} notification(s) marked as read`,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
};

// @desc    Get unread admin notification count
// @route   GET /api/super-admin/admin-notifications/unread-count
// @access  Private (Super Admin)
export const getAdminNotificationUnreadCount = async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = FALSE`
    );

    res.json({
      success: true,
      unread_count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

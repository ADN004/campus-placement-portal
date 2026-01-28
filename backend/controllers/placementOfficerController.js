import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import ExcelJS from 'exceljs';
import { sendVerificationEmail } from '../config/emailService.js';
import { generateStudentPDF } from '../utils/pdfGenerator.js';
import { BRANCH_SHORT_NAMES } from '../constants/branches.js';

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
 * Deactivate students whose PRN matches the given range (college-scoped)
 * Sets is_active to FALSE in users table
 */
const deactivateStudentsInRange = async (range, officerId, collegeId) => {
  try {
    let studentsToDeactivate = [];

    if (range.single_prn) {
      // Handle single PRN - only from this college
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1 AND s.college_id = $2`,
        [range.single_prn, collegeId]
      );
      studentsToDeactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students from this college and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.college_id = $1`,
        [collegeId]
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
        officerId,
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
 * Delete students whose PRN matches the given range (college-scoped)
 * This is a hard delete - removes all records from database
 */
const deleteStudentsInRange = async (range, officerId, collegeId) => {
  try {
    let studentsToDelete = [];

    if (range.single_prn) {
      // Handle single PRN - only from this college
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1 AND s.college_id = $2`,
        [range.single_prn, collegeId]
      );
      studentsToDelete = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students from this college and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.college_id = $1`,
        [collegeId]
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
        officerId,
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
 * Reactivate students whose PRN matches active ranges (college-scoped)
 * Called when a PRN range is enabled
 */
const reactivateStudentsInRange = async (range, officerId, collegeId) => {
  try {
    let studentsToReactivate = [];

    if (range.single_prn) {
      // Handle single PRN - only from this college
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.prn = $1 AND s.college_id = $2`,
        [range.single_prn, collegeId]
      );
      studentsToReactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students from this college and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id FROM students s WHERE s.college_id = $1`,
        [collegeId]
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
        officerId,
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

// @desc    Get branches available in officer's college
// @route   GET /api/placement-officer/branches
// @access  Private (Placement Officer)
export const getCollegeBranches = async (req, res) => {
  try {
    // Get officer's college with name for logging
    const officerResult = await query(
      `SELECT po.college_id, c.college_name
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id: collegeId, college_name: collegeName } = officerResult.rows[0];

    console.log(`📊 [BRANCHES] Officer requesting branches for: ${collegeName} (ID: ${collegeId})`);

    // Get distinct branches from students in THIS COLLEGE ONLY
    const branchesResult = await query(
      `SELECT DISTINCT s.branch, COUNT(s.id) as student_count
       FROM students s
       WHERE s.college_id = $1
         AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
         AND s.branch IS NOT NULL
       GROUP BY s.branch
       ORDER BY s.branch ASC`,
      [collegeId]
    );

    console.log(`📊 [BRANCHES] Found ${branchesResult.rows.length} branches in ${collegeName}`);
    if (branchesResult.rows.length <= 5) {
      console.log(`📊 [BRANCHES] Details:`, branchesResult.rows.map(b => `${b.branch}: ${b.student_count} students`));
    }

    res.status(200).json({
      success: true,
      count: branchesResult.rows.length,
      data: branchesResult.rows,
      _debug: {
        college_id: collegeId,
        college_name: collegeName,
        user_id: req.user.id
      }
    });
  } catch (error) {
    console.error('Get college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching college branches',
      error: error.message,
    });
  }
};

// @desc    Get placement officer dashboard
// @route   GET /api/placement-officer/dashboard
// @access  Private (Placement Officer)
export const getDashboard = async (req, res) => {
  try {
    // Get officer details
    const officerResult = await query(
      `SELECT po.*, c.college_name, r.region_name
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get total students count
    const totalCount = await query(
      `SELECT COUNT(*) as count FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.college_id = $1 AND u.is_active = TRUE`,
      [officer.college_id]
    );

    // Get students count by status
    const pendingCount = await query(
      `SELECT COUNT(*) as count FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.college_id = $1 AND u.is_active = TRUE AND s.registration_status = 'pending'`,
      [officer.college_id]
    );

    const approvedCount = await query(
      `SELECT COUNT(*) as count FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.college_id = $1 AND u.is_active = TRUE AND s.registration_status = 'approved'`,
      [officer.college_id]
    );

    const blacklistedCount = await query(
      `SELECT COUNT(*) as count FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.college_id = $1 AND u.is_active = TRUE AND s.is_blacklisted = TRUE`,
      [officer.college_id]
    );

    // Get active jobs count
    const activeJobsCount = await query(
      `SELECT COUNT(*) as count FROM jobs
       WHERE is_active = TRUE AND application_deadline > CURRENT_TIMESTAMP`
    );

    res.status(200).json({
      success: true,
      data: {
        college_name: officer.college_name,
        region_name: officer.region_name,
        total_students: parseInt(totalCount.rows[0].count),
        pending_students: parseInt(pendingCount.rows[0].count),
        approved_students: parseInt(approvedCount.rows[0].count),
        blacklisted_students: parseInt(blacklistedCount.rows[0].count),
        active_jobs: parseInt(activeJobsCount.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get PO dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

// @desc    Get students from officer's college
// @route   GET /api/placement-officer/students
// @access  Private (Placement Officer)
export const getStudents = async (req, res) => {
  try {
    const { status, cgpa_min, backlog, search, page = '1', limit = '100',
            dob_from, dob_to, height_min, height_max, weight_min, weight_max,
            has_driving_license, has_pan_card, has_aadhar_card, has_passport, districts } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Build query
    let queryText = `
      SELECT s.*, u.email as user_email, c.college_name, r.region_name,
             COALESCE(ep.height_cm, s.height) as height,
             COALESCE(ep.weight_kg, s.weight) as weight,
             ep.district
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE s.college_id = $1 AND u.is_active = TRUE
    `;
    const params = [collegeId];
    let paramCount = 1;

    // CRITICAL FIX: Filter based on status and blacklist
    // - If no status or status is not 'blacklisted', exclude blacklisted students
    // - If status is 'blacklisted', show only blacklisted students
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

    // Get total count before pagination
    const countQuery = queryText.replace(
      /SELECT s\.\*, u\.email as user_email, c\.college_name, r\.region_name,\s*COALESCE\(ep\.height_cm, s\.height\) as height,\s*COALESCE\(ep\.weight_kg, s\.weight\) as weight,\s*ep\.district/,
      'SELECT COUNT(DISTINCT s.id) as total'
    );
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalCount / limitNum);

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
      total: totalCount,
      page: pageNum,
      totalPages: totalPages,
      data: studentsResult.rows,
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// @desc    Approve student registration
// @route   PUT /api/placement-officer/students/:id/approve
// @access  Private (Placement Officer)
export const approveStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Verify student belongs to officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    const studentResult = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = studentResult.rows[0];

    if (student.college_id !== officerResult.rows[0].college_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve students from your college',
      });
    }

    // Update student status
    await query(
      `UPDATE students
       SET registration_status = 'approved',
           approved_by = $1,
           approved_date = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, studentId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'APPROVE_STUDENT',
      `Approved student registration for PRN ${student.prn}`,
      'student',
      studentId,
      { prn: student.prn },
      req
    );

    // Send email verification link
    if (student.email && student.email_verification_token && !student.email_verified) {
      try {
        // Update timestamp before sending email
        await query(
          `UPDATE students
           SET last_verification_email_sent_at = CURRENT_TIMESTAMP,
               verification_email_sent_count = verification_email_sent_count + 1
           WHERE id = $1`,
          [studentId]
        );

        await sendVerificationEmail(
          student.email,
          student.email_verification_token,
          student.student_name
        );
        console.log(`✅ Verification email sent to ${student.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send verification email to ${student.email}:`, emailError);
        // Don't fail the approval if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Student approved successfully. Verification email sent to student.',
    });
  } catch (error) {
    console.error('Approve student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving student',
      error: error.message,
    });
  }
};

// @desc    Reject student registration
// @route   PUT /api/placement-officer/students/:id/reject
// @access  Private (Placement Officer)
export const rejectStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Verify student belongs to officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    const studentResult = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = studentResult.rows[0];

    if (student.college_id !== officerResult.rows[0].college_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject students from your college',
      });
    }

    // Update student status
    await query(
      `UPDATE students SET registration_status = 'rejected' WHERE id = $1`,
      [studentId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'REJECT_STUDENT',
      `Rejected student registration for PRN ${student.prn}`,
      'student',
      studentId,
      { prn: student.prn },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student rejected successfully',
    });
  } catch (error) {
    console.error('Reject student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting student',
      error: error.message,
    });
  }
};

// @desc    Bulk approve student registrations
// @route   PUT /api/placement-officer/students/bulk-approve
// @access  Private (Placement Officer)
export const bulkApproveStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of student IDs',
      });
    }

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Verify all students belong to officer's college and are pending
    const studentsResult = await query(
      `SELECT id, prn, college_id, registration_status
       FROM students
       WHERE id = ANY($1::int[])`,
      [studentIds]
    );

    // Validate students
    const invalidStudents = studentsResult.rows.filter(
      (s) => s.college_id !== collegeId
    );

    if (invalidStudents.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve students from your college',
      });
    }

    // Approve all students in transaction
    const result = await transaction(async (client) => {
      const approvedResult = await client.query(
        `UPDATE students
         SET registration_status = 'approved',
             approved_by = $1,
             approved_date = CURRENT_TIMESTAMP
         WHERE id = ANY($2::int[])
           AND registration_status = 'pending'
         RETURNING id, prn`,
        [req.user.id, studentIds]
      );

      return approvedResult.rows;
    });

    // Log activity for each approved student
    for (const student of result) {
      await logActivity(
        req.user.id,
        'BULK_APPROVE_STUDENTS',
        `Bulk approved student PRN: ${student.prn}`,
        'student',
        student.id,
        { prn: student.prn },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully approved ${result.length} student(s)`,
      data: {
        approvedCount: result.length,
        approvedStudents: result,
      },
    });
  } catch (error) {
    console.error('Bulk approve students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk approving students',
      error: error.message,
    });
  }
};

// @desc    Bulk reject student registrations
// @route   PUT /api/placement-officer/students/bulk-reject
// @access  Private (Placement Officer)
export const bulkRejectStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of student IDs',
      });
    }

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Verify all students belong to officer's college
    const studentsResult = await query(
      `SELECT id, prn, college_id, registration_status
       FROM students
       WHERE id = ANY($1::int[])`,
      [studentIds]
    );

    // Validate students
    const invalidStudents = studentsResult.rows.filter(
      (s) => s.college_id !== collegeId
    );

    if (invalidStudents.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject students from your college',
      });
    }

    // Reject all students in transaction
    const result = await transaction(async (client) => {
      const rejectedResult = await client.query(
        `UPDATE students
         SET registration_status = 'rejected'
         WHERE id = ANY($1::int[])
           AND registration_status = 'pending'
         RETURNING id, prn`,
        [studentIds]
      );

      return rejectedResult.rows;
    });

    // Log activity for each rejected student
    for (const student of result) {
      await logActivity(
        req.user.id,
        'BULK_REJECT_STUDENTS',
        `Bulk rejected student PRN: ${student.prn}`,
        'student',
        student.id,
        { prn: student.prn },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully rejected ${result.length} student(s)`,
      data: {
        rejectedCount: result.length,
        rejectedStudents: result,
      },
    });
  } catch (error) {
    console.error('Bulk reject students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk rejecting students',
      error: error.message,
    });
  }
};

// @desc    Blacklist student
// @route   PUT /api/placement-officer/students/:id/blacklist
// @access  Private (Placement Officer)
export const blacklistStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for blacklisting',
      });
    }

    // Verify student belongs to officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    const studentResult = await query(
      'SELECT * FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = studentResult.rows[0];

    if (student.college_id !== officerResult.rows[0].college_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only blacklist students from your college',
      });
    }

    // Blacklist student
    await query(
      `UPDATE students
       SET is_blacklisted = TRUE, blacklist_reason = $1,
           blacklisted_date = CURRENT_TIMESTAMP, blacklisted_by = $2
       WHERE id = $3`,
      [reason, req.user.id, studentId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'BLACKLIST_STUDENT',
      `Blacklisted student PRN ${student.prn}`,
      'student',
      studentId,
      { prn: student.prn, reason },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student blacklisted successfully',
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

// @desc    Request whitelist for blacklisted student
// @route   POST /api/placement-officer/students/:id/whitelist-request
// @access  Private (Placement Officer)
export const requestWhitelist = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for whitelist request',
      });
    }

    // Verify student
    const studentResult = await query(
      'SELECT * FROM students WHERE id = $1 AND is_blacklisted = TRUE',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blacklisted student not found',
      });
    }

    // Create whitelist request
    await query(
      `INSERT INTO whitelist_requests (student_id, requested_by, request_reason)
       VALUES ($1, $2, $3)`,
      [studentId, req.user.id, reason]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'WHITELIST_REQUEST',
      `Requested whitelist for student PRN ${studentResult.rows[0].prn}`,
      'student',
      studentId,
      { prn: studentResult.rows[0].prn, reason },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Whitelist request submitted successfully',
    });
  } catch (error) {
    console.error('Request whitelist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting whitelist request',
      error: error.message,
    });
  }
};

// @desc    Send notification to college students (with branch filtering and email support)
// @route   POST /api/placement-officer/send-notification
// @access  Private (Placement Officer)
export const sendNotification = async (req, res) => {
  try {
    const { title, message, priority = 'normal', target_branches = [] } = req.body;

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

    // Get officer's college and details
    const officerResult = await query(
      `SELECT po.college_id, c.college_name
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id: collegeId, college_name: collegeName } = officerResult.rows[0];

    // Build student query with branch filtering
    let studentQuery = `
      SELECT s.id, s.user_id, s.email, s.student_name, s.branch
      FROM students s
      WHERE s.college_id = $1
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
    `;
    const params = [collegeId];

    // Add branch filtering if specific branches are selected
    if (target_branches && target_branches.length > 0) {
      params.push(target_branches);
      studentQuery += ` AND s.branch = ANY($2)`;
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

      // Add target college
      await client.query(
        `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
         VALUES ($1, 'college', $2)`,
        [notificationId, collegeId]
      );

      // Batch insert recipients for performance (PostgreSQL supports VALUES with multiple rows)
      if (students.length > 0) {
        const batchSize = 500; // Process in batches of 500
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

    // Async email sending for urgent notifications (non-blocking)
    if (priority === 'urgent') {
      // Import email service dynamically to avoid circular dependencies
      const { sendNotificationEmail } = await import('../config/emailService.js');

      // Send emails asynchronously in batches to avoid overwhelming the email server
      setImmediate(async () => {
        try {
          console.log(`📧 Sending urgent notification emails to ${students.length} students...`);

          const emailBatchSize = 50; // Send 50 emails at a time
          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < students.length; i += emailBatchSize) {
            const batch = students.slice(i, i + emailBatchSize);

            // Send emails in parallel within the batch
            const emailPromises = batch.map(async (student) => {
              try {
                if (student.email) {
                  const emailSubject = `[URGENT] ${title} - ${collegeName}`;
                  const emailContent = `
                    <h2>Hello ${student.student_name},</h2>
                    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #991b1b; font-weight: 600;">
                        🚨 URGENT NOTIFICATION
                      </p>
                    </div>
                    <h3 style="color: #1f2937;">${title}</h3>
                    <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                    <div style="background-color: #f3f4f6; padding: 12px; margin-top: 20px; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>From:</strong> ${collegeName} Placement Cell
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

            // Small delay between batches to avoid rate limiting
            if (i + emailBatchSize < students.length) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
          }

          console.log(`✅ Email sending completed: ${successCount} successful, ${failCount} failed`);
        } catch (error) {
          console.error('❌ Error in async email sending:', error);
        }
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'SEND_NOTIFICATION',
      `Sent ${priority} notification to ${students.length} student(s)${target_branches.length > 0 ? ` (Branches: ${target_branches.join(', ')})` : ''}: ${title}`,
      'notification',
      notificationId,
      {
        title,
        collegeId,
        priority,
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
        target_branches: target_branches.length > 0 ? target_branches : 'All branches'
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

// @desc    Download student report (PDF/Excel)
// @route   GET /api/placement-officer/students/export
// @access  Private (Placement Officer)
export const exportStudents = async (req, res) => {
  try {
    const { format = 'excel', company_name, drive_date, include_signature, separate_colleges, use_short_names,
            dob_from, dob_to, height_min, height_max, weight_min, weight_max,
            has_driving_license, has_pan_card, has_aadhar_card, has_passport, districts, ...filters } = req.query;

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Build query with filters
    let queryText = `
      SELECT s.prn, s.student_name, s.email, s.mobile_number, s.programme_cgpa, s.date_of_birth,
             s.backlog_count, s.registration_status, s.is_blacklisted,
             COALESCE(ep.height_cm, s.height) as height,
             COALESCE(ep.weight_kg, s.weight) as weight,
             s.branch, ep.district,
             c.college_name, r.region_name
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE s.college_id = $1
    `;
    const params = [collegeId];
    let paramCount = 1;

    // Apply status filter
    const { status, search, branch, cgpa_min, backlog } = filters;

    if (status === 'pending') {
      queryText += ` AND s.registration_status = 'pending'`;
    } else if (status === 'approved') {
      queryText += ` AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`;
    } else if (status === 'rejected') {
      queryText += ` AND s.registration_status = 'rejected'`;
    } else if (status === 'blacklisted') {
      queryText += ` AND s.is_blacklisted = TRUE`;
    }

    // Apply search filter
    if (search) {
      paramCount++;
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.student_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Apply branch filter
    if (branch) {
      paramCount++;
      queryText += ` AND s.branch = $${paramCount}`;
      params.push(branch);
    }

    // Apply CGPA filter
    if (cgpa_min) {
      paramCount++;
      queryText += ` AND s.programme_cgpa >= $${paramCount}`;
      params.push(parseFloat(cgpa_min));
    }

    // Apply backlog filter
    if (backlog !== undefined && backlog !== '') {
      paramCount++;
      queryText += ` AND s.backlog_count = $${paramCount}`;
      params.push(parseInt(backlog));
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

    queryText += ' ORDER BY s.branch, s.prn';

    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;

    if (format === 'pdf') {
      const collegeName = students.length > 0 ? students[0].college_name : '';

      return generateStudentPDF(students, {
        selectedFields: null, // null = use default fields
        collegeName: collegeName,
        companyName: company_name || null,
        driveDate: drive_date || null,
        includeSignature: include_signature === 'true',
        separateColleges: separate_colleges === 'true',
        useShortNames: use_short_names === 'true',
      }, res);
    } else {
      return exportToExcel(students, res, use_short_names === 'true');
    }
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

// Helper: Export to Excel
const exportToExcel = async (students, res, useShortNames = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define columns
  worksheet.columns = [
    { header: 'PRN', key: 'prn', width: 15 },
    { header: 'Name', key: 'student_name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Mobile', key: 'mobile_number', width: 15 },
    { header: 'Branch', key: 'branch', width: useShortNames ? 10 : 40 },
    { header: 'CGPA', key: 'programme_cgpa', width: 10 },
    { header: 'DOB', key: 'date_of_birth', width: 12 },
    { header: 'Height (cm)', key: 'height', width: 12 },
    { header: 'Weight (kg)', key: 'weight', width: 12 },
    { header: 'Backlogs', key: 'backlog_count', width: 15 },
    { header: 'Status', key: 'registration_status', width: 15 },
    { header: 'Blacklisted', key: 'is_blacklisted', width: 12 },
  ];

  // Process students data to use short names if requested
  const processedStudents = students.map(student => ({
    ...student,
    branch: useShortNames && student.branch ? (BRANCH_SHORT_NAMES[student.branch] || student.branch) : student.branch
  }));

  // Add rows
  worksheet.addRows(processedStudents);

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=students-report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};

// @desc    Get placement officer profile
// @route   GET /api/placement-officer/profile
// @access  Private (Placement Officer)
export const getProfile = async (req, res) => {
  try {
    const profileResult = await query(
      `SELECT po.*, c.college_name, c.logo_url, c.logo_uploaded_at, r.region_name, u.email, u.last_login
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       JOIN users u ON po.user_id = u.id
       WHERE po.user_id = $1`,
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

// @desc    Update placement officer profile
// @route   PUT /api/placement-officer/profile
// @access  Private (Placement Officer)
export const updateProfile = async (req, res) => {
  try {
    const { officer_name, email } = req.body;

    // Validation
    if (!officer_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
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

    // Check if email is already in use by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use',
      });
    }

    // Update placement officer name
    const result = await query(
      `UPDATE placement_officers
       SET officer_name = $1
       WHERE user_id = $2
       RETURNING *`,
      [officer_name, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Update email in users table
    await query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [email, req.user.id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'PROFILE_UPDATE',
      'Updated profile information',
      'placement_officer',
      result.rows[0].id,
      { officer_name, email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { ...result.rows[0], email },
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

// @desc    Get all jobs for placement officer (to view eligible students)
// @route   GET /api/placement-officer/jobs
// @access  Private (Placement Officer)
export const getJobs = async (req, res) => {
  try {
    // Get officer details
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get college region for filtering
    const collegeResult = await query(
      'SELECT region_id FROM colleges WHERE id = $1',
      [officer.college_id]
    );
    const regionId = collegeResult.rows[0]?.region_id;

    // Get all active jobs that are accessible to this college/region
    const jobsResult = await query(
      `SELECT j.*
       FROM jobs j
       WHERE j.is_active = TRUE
       AND (
         j.target_type = 'all'
         OR (j.target_type = 'region' AND j.target_regions IS NOT NULL AND j.target_regions::jsonb @> $1::jsonb)
         OR (j.target_type = 'college' AND j.target_colleges IS NOT NULL AND j.target_colleges::jsonb @> $2::jsonb)
         OR (j.target_type = 'specific' AND (
           (j.target_regions IS NOT NULL AND j.target_regions::jsonb @> $1::jsonb)
           OR
           (j.target_colleges IS NOT NULL AND j.target_colleges::jsonb @> $2::jsonb)
         ))
       )
       ORDER BY j.created_at DESC`,
      [JSON.stringify([regionId]), JSON.stringify([officer.college_id])]
    );

    // Parse JSON fields
    const jobs = jobsResult.rows.map((job) => ({
      ...job,
      allowed_branches: job.allowed_branches ? (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : job.allowed_branches) : [],
      target_regions: job.target_regions ? (typeof job.target_regions === 'string' ? JSON.parse(job.target_regions) : job.target_regions) : [],
      target_colleges: job.target_colleges ? (typeof job.target_colleges === 'string' ? JSON.parse(job.target_colleges) : job.target_colleges) : [],
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

// @desc    Create a job request
// @route   POST /api/placement-officer/job-requests
// @access  Private (Placement Officer)
export const createJobRequest = async (req, res) => {
  try {
    const {
      job_title,
      company_name,
      job_description,
      job_type,
      location,
      salary_range,
      application_deadline,
      application_form_url,
      min_cgpa,
      max_backlogs,
      allowed_branches,
      target_type,
      target_regions,
      target_colleges,
      // Extended requirements (for auto-approval)
      requires_academic_extended,
      requires_physical_details,
      requires_family_details,
      requires_personal_details,
      requires_document_verification,
      requires_education_preferences,
      specific_field_requirements,
      custom_fields,
    } = req.body;

    // Get placement officer details with college info
    const officerResult = await query(
      `SELECT po.id, po.college_id, c.college_name, c.region_id
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Validate required fields - check for empty strings and trim whitespace
    if (!job_title?.trim() || !company_name?.trim() || !job_description?.trim() ||
        !application_deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: job title, company name, description, and deadline',
      });
    }

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value) => (value && value.trim() !== '' ? value.trim() : null);
    const toNumberOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // Check if this is an "own college only" job (auto-approval eligible)
    const isOwnCollegeOnly = target_type === 'college' &&
      (!target_regions || target_regions.length === 0) &&
      (!target_colleges || target_colleges.length === 0);

    if (isOwnCollegeOnly) {
      // AUTO-APPROVAL: Create job directly for own college
      const result = await transaction(async (client) => {
        // Create job request with auto_approved status
        const jobRequestResult = await client.query(
          `INSERT INTO job_requests (
            placement_officer_id, college_id, job_title, company_name, job_description,
            job_type, location, salary_range, application_deadline, application_form_url,
            min_cgpa, max_backlogs, allowed_branches, target_type, target_regions, target_colleges,
            status, reviewed_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            officer.id,
            officer.college_id,
            job_title.trim(),
            company_name.trim(),
            job_description.trim(),
            job_type || 'Full-time',
            toNullIfEmpty(location),
            toNullIfEmpty(salary_range),
            application_deadline,
            application_form_url.trim(),
            toNumberOrNull(min_cgpa),
            toNumberOrNull(max_backlogs),
            allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
            'specific',
            null, // No target regions for own college
            JSON.stringify([officer.college_id]), // Target only own college
            'auto_approved',
          ]
        );

        const jobRequest = jobRequestResult.rows[0];

        // Create the job directly
        const jobResult = await client.query(
          `INSERT INTO jobs
           (job_title, company_name, job_description, job_location, job_type, salary_package,
            application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs,
            allowed_branches, target_type, target_regions, target_colleges, created_by, is_active,
            placement_officer_id, is_auto_approved, source_job_request_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14::jsonb, $15, TRUE, $16, TRUE, $17)
           RETURNING *`,
          [
            job_title.trim(),
            company_name.trim(),
            job_description.trim(),
            toNullIfEmpty(location),
            job_type || 'Full-time',
            toNullIfEmpty(salary_range),
            application_form_url.trim(),
            application_deadline,
            toNumberOrNull(min_cgpa),
            toNumberOrNull(max_backlogs),
            allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
            'college', // Target type is college
            null, // No target regions
            JSON.stringify([officer.college_id]), // Target only own college
            req.user.id,
            officer.id,
            jobRequest.id,
          ]
        );

        const job = jobResult.rows[0];

        // Create job requirement template if extended requirements provided
        if (requires_academic_extended || requires_physical_details || requires_family_details ||
            requires_personal_details || requires_document_verification || requires_education_preferences ||
            specific_field_requirements || custom_fields) {
          // Save to job_request_requirement_templates
          await client.query(
            `INSERT INTO job_request_requirement_templates (
              job_request_id, min_cgpa, max_backlogs, allowed_branches,
              requires_academic_extended, requires_physical_details,
              requires_family_details, requires_personal_details,
              requires_document_verification, requires_education_preferences,
              specific_field_requirements, custom_fields
            ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
            [
              jobRequest.id,
              toNumberOrNull(min_cgpa),
              toNumberOrNull(max_backlogs),
              allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
              requires_academic_extended || false,
              requires_physical_details || false,
              requires_family_details || false,
              requires_personal_details || false,
              requires_document_verification || false,
              requires_education_preferences || false,
              specific_field_requirements ? JSON.stringify(specific_field_requirements) : null,
              custom_fields && custom_fields.length > 0 ? JSON.stringify(custom_fields) : null,
            ]
          );

          // Copy to job_requirement_templates
          await client.query(
            `INSERT INTO job_requirement_templates (
              job_id, min_cgpa, max_backlogs, allowed_branches,
              requires_academic_extended, requires_physical_details,
              requires_family_details, requires_personal_details,
              requires_document_verification, requires_education_preferences,
              specific_field_requirements, custom_fields
            ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
            [
              job.id,
              toNumberOrNull(min_cgpa),
              toNumberOrNull(max_backlogs),
              allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
              requires_academic_extended || false,
              requires_physical_details || false,
              requires_family_details || false,
              requires_personal_details || false,
              requires_document_verification || false,
              requires_education_preferences || false,
              specific_field_requirements ? JSON.stringify(specific_field_requirements) : null,
              custom_fields && custom_fields.length > 0 ? JSON.stringify(custom_fields) : null,
            ]
          );
        }

        // Create notification for super admin
        await client.query(
          `INSERT INTO admin_notifications (
            notification_type, title, message, related_entity_type, related_entity_id,
            created_by_user_id, created_by_college_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'job_auto_approved',
            `New Job Posted: ${company_name} - ${job_title}`,
            `${officer.college_name} has posted a new job for their college students. Company: ${company_name}, Position: ${job_title}`,
            'job',
            job.id,
            req.user.id,
            officer.college_id,
          ]
        );

        return { jobRequest, job };
      });

      // Log activity
      await logActivity(
        req.user.id,
        'JOB_AUTO_APPROVED',
        `Auto-approved and created job for own college: ${company_name} - ${job_title}`,
        'job',
        result.job.id,
        { job_request_id: result.jobRequest.id },
        req
      );

      return res.status(201).json({
        success: true,
        message: 'Job created successfully for your college (auto-approved)',
        data: result.jobRequest,
        job: result.job,
        auto_approved: true,
      });
    }

    // STANDARD FLOW: Create job request pending super admin approval
    const jobRequestResult = await query(
      `INSERT INTO job_requests (
        placement_officer_id, college_id, job_title, company_name, job_description,
        job_type, location, salary_range, application_deadline, application_form_url,
        min_cgpa, max_backlogs, allowed_branches, target_type, target_regions, target_colleges,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        officer.id,
        officer.college_id,
        job_title.trim(),
        company_name.trim(),
        job_description.trim(),
        job_type || 'Full-time',
        toNullIfEmpty(location),
        toNullIfEmpty(salary_range),
        application_deadline,
        application_form_url.trim(),
        toNumberOrNull(min_cgpa),
        toNumberOrNull(max_backlogs),
        allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
        'specific',
        target_regions && target_regions.length > 0 ? JSON.stringify(target_regions) : null,
        target_colleges && target_colleges.length > 0 ? JSON.stringify(target_colleges) : null,
        'pending',
      ]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_CREATE',
      `Created job request for ${company_name} - ${job_title}`,
      'job_request',
      jobRequestResult.rows[0].id,
      null,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Job request submitted successfully. Awaiting super admin approval.',
      data: jobRequestResult.rows[0],
      auto_approved: false,
    });
  } catch (error) {
    console.error('Create job request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job request',
      error: error.message,
    });
  }
};

// @desc    Get job requests for placement officer
// @route   GET /api/placement-officer/job-requests
// @access  Private (Placement Officer)
export const getJobRequests = async (req, res) => {
  try {
    // Get placement officer details
    const officerResult = await query(
      'SELECT id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get job requests with job existence check
    const jobRequestsResult = await query(
      `SELECT jr.*,
              reviewer.email as reviewed_by_email,
              CASE
                WHEN jr.status = 'approved' THEN
                  EXISTS(
                    SELECT 1 FROM jobs j
                    WHERE j.job_title = jr.job_title
                    AND j.company_name = jr.company_name
                    AND j.created_at >= jr.reviewed_date
                    AND j.created_at <= jr.reviewed_date + INTERVAL '5 minutes'
                  )
                ELSE NULL
              END as job_exists
       FROM job_requests jr
       LEFT JOIN users reviewer ON jr.reviewed_by = reviewer.id
       WHERE jr.placement_officer_id = $1
       ORDER BY jr.created_at DESC`,
      [officer.id]
    );

    // Parse JSON fields safely
    const jobRequests = jobRequestsResult.rows.map((request) => ({
      ...request,
      allowed_branches: request.allowed_branches
        ? (typeof request.allowed_branches === 'string' ? JSON.parse(request.allowed_branches) : request.allowed_branches)
        : [],
      target_regions: request.target_regions
        ? (typeof request.target_regions === 'string' ? JSON.parse(request.target_regions) : request.target_regions)
        : [],
      target_colleges: request.target_colleges
        ? (typeof request.target_colleges === 'string' ? JSON.parse(request.target_colleges) : request.target_colleges)
        : [],
      job_deleted: request.status === 'approved' && request.job_exists === false,
    }));

    res.status(200).json({
      success: true,
      count: jobRequests.length,
      data: jobRequests,
    });
  } catch (error) {
    console.error('Get job requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job requests',
      error: error.message,
    });
  }
};

// @desc    Get students who have applied to a specific job
// @route   GET /api/placement-officer/jobs/:jobId/applicants
// @access  Private (Placement Officer)
export const getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get placement officer details
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Get students from officer's college who have applied to this job
    // Including extended profile fields for filtering
    const applicantsResult = await query(
      `SELECT
        s.id, s.prn, s.student_name as name, s.email, s.mobile_number, s.branch,
        s.programme_cgpa as cgpa, s.backlog_count, s.date_of_birth, s.college_id,
        s.registration_status, s.gender, s.age,
        c.college_name,
        ja.id as application_id, ja.applied_date, ja.application_status,
        ja.placement_package, ja.joining_date, ja.placement_location,
        j.job_title, j.company_name, j.min_cgpa, j.max_backlogs, j.allowed_branches,
        sep.sslc_marks, sep.sslc_year, sep.sslc_board,
        sep.twelfth_marks, sep.twelfth_year, sep.twelfth_board,
        sep.height_cm, sep.weight_kg, sep.physically_handicapped, sep.handicap_details,
        sep.district, sep.permanent_address, sep.interests_hobbies,
        sep.father_name, sep.father_occupation, sep.father_annual_income,
        sep.mother_name, sep.mother_occupation, sep.mother_annual_income,
        sep.siblings_count, sep.siblings_details,
        sep.has_aadhar_card, sep.aadhar_number,
        sep.has_passport, sep.passport_number,
        COALESCE(sep.has_pan_card, s.has_pan_card) as has_pan_card,
        sep.pan_number,
        s.has_driving_license,
        sep.interested_in_btech, sep.interested_in_mtech, sep.preferred_study_mode,
        sep.additional_certifications, sep.achievements, sep.extracurricular,
        sep.profile_completion_percentage
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN student_extended_profiles sep ON s.id = sep.student_id
      WHERE ja.job_id = $1
        AND s.college_id = $2
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
      ORDER BY ja.applied_date DESC`,
      [jobId, collegeId]
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
// PRN RANGE MANAGEMENT (Placement Officer)
// ========================================

// @desc    Get PRN ranges for placement officer's college
// @route   GET /api/placement-officer/prn-ranges
// @access  Private (Placement Officer)
export const getPRNRanges = async (req, res) => {
  try {
    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get PRN ranges for this college (both super admin and placement officer created)
    const rangesResult = await query(
      `SELECT pr.*,
              u.email as added_by_email,
              c.college_name,
              pr.created_by_role as created_by
       FROM prn_ranges pr
       LEFT JOIN users u ON pr.added_by = u.id
       LEFT JOIN colleges c ON pr.college_id = c.id
       WHERE pr.college_id = $1 OR pr.created_by_role = 'super_admin'
       ORDER BY pr.created_at DESC`,
      [officer.college_id]
    );

    // Map database field names to frontend expected names
    const mappedData = rangesResult.rows.map(range => ({
      ...range,
      start_prn: range.range_start,
      end_prn: range.range_end,
    }));

    res.status(200).json({
      success: true,
      count: mappedData.length,
      data: mappedData,
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

// @desc    Add PRN range or single PRN (for placement officer's college only)
// @route   POST /api/placement-officer/prn-ranges
// @access  Private (Placement Officer)
export const addPRNRange = async (req, res) => {
  try {
    // Map frontend field names to database field names
    const { start_prn, end_prn, single_prn, description, year } = req.body;
    const range_start = start_prn;
    const range_end = end_prn;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

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
       VALUES ($1, $2, $3, $4, $5, $6, 'placement_officer', $7)
       RETURNING *`,
      [
        range_start || null,
        range_end || null,
        single_prn || null,
        description || null,
        year || null,
        req.user.id,
        officer.college_id,
      ]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'ADD_PRN_RANGE',
      `Added PRN range: ${single_prn || `${range_start} to ${range_end}`}`,
      'prn_range',
      result.rows[0].id,
      result.rows[0],
      req
    );

    // Map response data to frontend expected format
    const responseData = {
      ...result.rows[0],
      start_prn: result.rows[0].range_start,
      end_prn: result.rows[0].range_end,
      created_by: result.rows[0].created_by_role,
    };

    res.status(201).json({
      success: true,
      message: 'PRN range added successfully',
      data: responseData,
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

// @desc    Update PRN range (placement officer can only update their own ranges)
// @route   PUT /api/placement-officer/prn-ranges/:id
// @access  Private (Placement Officer)
export const updatePRNRange = async (req, res) => {
  try {
    // Map frontend field names to database field names
    const { start_prn, end_prn, is_active, is_enabled, description, disabled_reason, year } = req.body;
    const range_start = start_prn;
    const range_end = end_prn;

    const rangeId = req.params.id;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Check if the range exists and belongs to this placement officer
    const rangeCheck = await query(
      `SELECT * FROM prn_ranges
       WHERE id = $1 AND created_by_role = 'placement_officer'
       AND college_id = $2 AND added_by = $3`,
      [rangeId, officer.college_id, req.user.id]
    );

    if (rangeCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only update PRN ranges that you created',
      });
    }

    const currentRange = rangeCheck.rows[0];

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (range_start !== undefined) {
      paramCount++;
      updates.push(`range_start = $${paramCount}`);
      params.push(range_start);
    }

    if (range_end !== undefined) {
      paramCount++;
      updates.push(`range_end = $${paramCount}`);
      params.push(range_end);
    }

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
      params.push(year);
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
    const wasActive = currentRange.is_active && (currentRange.is_enabled !== false);
    const isNowActive = updatedRange.is_active && (updatedRange.is_enabled !== false);

    if (wasActive && !isNowActive) {
      // Range was disabled - deactivate students (only from this college)
      affectedStudentsCount = await deactivateStudentsInRange(updatedRange, req.user.id, officer.college_id);
      studentAction = 'deactivated';
    } else if (!wasActive && isNowActive) {
      // Range was enabled - reactivate students (only from this college)
      affectedStudentsCount = await reactivateStudentsInRange(updatedRange, req.user.id, officer.college_id);
      studentAction = 'reactivated';
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PRN_RANGE',
      `Updated PRN range ID: ${rangeId}${affectedStudentsCount > 0 ? ` - ${affectedStudentsCount} students ${studentAction}` : ''}`,
      'prn_range',
      rangeId,
      { range_start, range_end, is_active, is_enabled, description, disabled_reason, year, affectedStudentsCount },
      req
    );

    // Map response data to frontend expected format
    const responseData = {
      ...updatedRange,
      start_prn: updatedRange.range_start,
      end_prn: updatedRange.range_end,
      created_by: updatedRange.created_by_role,
    };

    res.status(200).json({
      success: true,
      message: `PRN range updated successfully${affectedStudentsCount > 0 ? `. ${affectedStudentsCount} students ${studentAction}` : ''}`,
      data: responseData,
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

// @desc    Delete PRN range (placement officer can only delete their own ranges)
// @route   DELETE /api/placement-officer/prn-ranges/:id
// @access  Private (Placement Officer)
export const deletePRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Check if the range exists and belongs to this placement officer
    const rangeCheck = await query(
      `SELECT * FROM prn_ranges
       WHERE id = $1 AND created_by_role = 'placement_officer'
       AND college_id = $2 AND added_by = $3`,
      [rangeId, officer.college_id, req.user.id]
    );

    if (rangeCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete PRN ranges that you created. Super admin ranges cannot be deleted.',
      });
    }

    const rangeToDelete = rangeCheck.rows[0];

    // Delete all students in this range (only from this college)
    const deletedStudentsCount = await deleteStudentsInRange(rangeToDelete, req.user.id, officer.college_id);

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

// @desc    Get students by PRN range (college-scoped for placement officer)
// @route   GET /api/placement-officer/prn-ranges/:id/students
// @access  Private (Placement Officer)
export const getStudentsByPRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get PRN range details
    const rangeResult = await query(
      'SELECT * FROM prn_ranges WHERE id = $1',
      [rangeId]
    );

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const range = rangeResult.rows[0];

    // Check if placement officer has access to this range
    // They can view students from super admin ranges OR their own college ranges
    if (range.created_by_role === 'placement_officer' && range.college_id !== officer.college_id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this PRN range',
      });
    }

    let studentsResult;

    // Query students based on range type, scoped to placement officer's college
    if (range.single_prn) {
      // Single PRN
      studentsResult = await query(
        `SELECT s.*, c.college_name, r.region_name
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn = $1 AND s.college_id = $2
         ORDER BY s.prn`,
        [range.single_prn, officer.college_id]
      );
    } else {
      // PRN Range
      studentsResult = await query(
        `SELECT s.*, c.college_name, r.region_name
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn >= $1 AND s.prn <= $2 AND s.college_id = $3
         ORDER BY s.prn`,
        [range.range_start, range.range_end, officer.college_id]
      );
    }

    res.status(200).json({
      success: true,
      count: studentsResult.rows.length,
      data: studentsResult.rows,
      range: {
        type: range.single_prn ? 'single' : 'range',
        value: range.single_prn || `${range.range_start} - ${range.range_end}`,
        is_enabled: range.is_enabled,
      },
    });
  } catch (error) {
    console.error('Get students by PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// @desc    Export students by PRN range to Excel (college-scoped for placement officer)
// @route   GET /api/placement-officer/prn-ranges/:id/students/export
// @access  Private (Placement Officer)
export const exportStudentsByPRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Get PRN range details
    const rangeResult = await query(
      'SELECT * FROM prn_ranges WHERE id = $1',
      [rangeId]
    );

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const range = rangeResult.rows[0];

    // Check if placement officer has access to this range
    if (range.created_by_role === 'placement_officer' && range.college_id !== officer.college_id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this PRN range',
      });
    }

    let studentsResult;

    // Query students based on range type, scoped to placement officer's college
    if (range.single_prn) {
      // Single PRN
      studentsResult = await query(
        `SELECT s.prn, s.student_name as name, s.email, s.mobile_number,
                s.date_of_birth, s.age, s.gender, s.branch,
                s.programme_cgpa, s.backlog_count, s.registration_status,
                s.is_blacklisted, c.college_name, r.region_name,
                s.has_driving_license, s.has_pan_card, s.created_at
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn = $1 AND s.college_id = $2
         ORDER BY s.prn`,
        [range.single_prn, officer.college_id]
      );
    } else {
      // PRN Range
      studentsResult = await query(
        `SELECT s.prn, s.student_name as name, s.email, s.mobile_number,
                s.date_of_birth, s.age, s.gender, s.branch,
                s.programme_cgpa, s.backlog_count, s.registration_status,
                s.is_blacklisted, c.college_name, r.region_name,
                s.has_driving_license, s.has_pan_card, s.created_at
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn >= $1 AND s.prn <= $2 AND s.college_id = $3
         ORDER BY s.prn`,
        [range.range_start, range.range_end, officer.college_id]
      );
    }

    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this PRN range for your college',
      });
    }

    // Create Excel workbook
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Add headers
    worksheet.columns = [
      { header: 'PRN', key: 'prn', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile', key: 'mobile_number', width: 15 },
      { header: 'DOB', key: 'date_of_birth', width: 12 },
      { header: 'Age', key: 'age', width: 8 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Branch', key: 'branch', width: 30 },
      { header: 'College', key: 'college_name', width: 40 },
      { header: 'Region', key: 'region_name', width: 20 },
      { header: 'CGPA', key: 'programme_cgpa', width: 10 },
      { header: 'Backlogs', key: 'backlog_count', width: 10 },
      { header: 'Status', key: 'registration_status', width: 15 },
      { header: 'Blacklisted', key: 'is_blacklisted', width: 12 },
      { header: 'Driving License', key: 'has_driving_license', width: 15 },
      { header: 'PAN Card', key: 'has_pan_card', width: 12 },
      { header: 'Registered On', key: 'created_at', width: 18 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    students.forEach((student) => {
      worksheet.addRow({
        ...student,
        date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
        is_blacklisted: student.is_blacklisted ? 'Yes' : 'No',
        has_driving_license: student.has_driving_license ? 'Yes' : 'No',
        has_pan_card: student.has_pan_card ? 'Yes' : 'No',
        created_at: student.created_at ? new Date(student.created_at).toLocaleDateString() : '',
      });
    });

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const rangeLabel = range.single_prn
      ? range.single_prn
      : `${range.range_start}_${range.range_end}`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_prn_range_${rangeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Log activity
    await logActivity(
      req.user.id,
      'EXPORT_PRN_RANGE_STUDENTS',
      `Exported ${students.length} students from PRN range: ${range.single_prn || `${range.range_start}-${range.range_end}`}`,
      'prn_range',
      rangeId,
      { format: 'excel', studentCount: students.length },
      req
    );

    res.send(buffer);
  } catch (error) {
    console.error('Export students by PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

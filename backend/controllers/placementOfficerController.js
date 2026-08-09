import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import { deleteImage, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';
import ExcelJS from 'exceljs';
import { sendVerificationEmail, sendRegistrationRejectedEmail } from '../config/emailService.js';
import { buildVerificationDetails } from '../utils/studentEmailDetails.js';
import { generateStudentPDF } from '../utils/pdfGenerator.js';
import { BRANCH_SHORT_NAMES } from '../constants/branches.js';
import { singleCollegeJobApprovalRequired } from '../utils/portalMode.js';
import { parseExceptedPrns, prnMatchesRange } from '../utils/prnExceptions.js';
import { isCollegeLocked } from '../utils/collegeLocks.js';
import { DAY_AWARE_COUNT_SQL } from '../utils/verificationEmailPolicy.js';
import { TOTAL_BACKLOGS_SQL, parseMaxBacklogs } from '../utils/backlogPolicy.js';
import { ACTIVE_STUDENT_ACCOUNT_SQL } from '../utils/notificationAudience.js';

// How many notification emails a bulk action sends at once. A bulk batch can
// be 50+ students; sending strictly one at a time can outrun the proxy read
// timeout and report a failure for work that fully succeeded, while sending
// all of them at once would hammer the SMTP relay.
const BULK_EMAIL_CONCURRENCY = 5;

// Shared refusal when a college's PRN-range management is locked by the SA.
const PRN_RANGE_LOCK_MESSAGE =
  'Adding or editing PRN ranges is currently locked by the Super Admin. Please contact them to unlock it for your college.';

// ========================================
// HELPER FUNCTIONS
// ========================================

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
        `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.prn = $1 AND s.college_id = $2`,
        [range.single_prn, collegeId]
      );
      studentsToDeactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students from this college and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.college_id = $1`,
        [collegeId]
      );

      studentsToDeactivate = studentsResult.rows.filter(student =>
        prnMatchesRange(student.prn, range)
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
 * Students a range covers, in the officer's college.
 *
 * Extracted so the count shown before a deletion and the deletion itself cannot
 * disagree. They must come from one function: the officer is now asked to type
 * DELETE against a specific number of student accounts, and a number produced by
 * a different rule than the one doing the deleting is worse than no number.
 *
 * The membership test itself is prnMatchesRange, shared with the page's count,
 * the students list, its export and both roles. This comment used to record
 * that getStudentsByPRNRange answered the same question differently — SQL
 * string bounds rather than numeric, and neither honouring excepted PRNs — and
 * that the divergence was left alone. It is not left alone any more.
 */
const findStudentsInRange = async (range, collegeId) => {
  if (range.single_prn) {
    // Handle single PRN - only from this college
    const studentsResult = await query(
      `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.prn = $1 AND s.college_id = $2`,
      [range.single_prn, collegeId]
    );
    return studentsResult.rows;
  }
  if (range.range_start && range.range_end) {
    // Handle range - get all students from this college and filter
    const studentsResult = await query(
      `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.college_id = $1`,
      [collegeId]
    );
    return studentsResult.rows.filter((student) => prnMatchesRange(student.prn, range));
  }
  return [];
};

/**
 * Delete students whose PRN matches the given range (college-scoped)
 * This is a hard delete - removes all records from database
 */
const deleteStudentsInRange = async (range, officerId, collegeId) => {
  try {
    const studentsToDelete = await findStudentsInRange(range, collegeId);

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

    const userIds = studentsToDelete.map(s => s.user_id);

    /*
     * Their activity log has to go first. activity_logs.user_id references
     * users with NO ACTION, not CASCADE, so a student who has ever done
     * anything logged — signing in is enough — made the DELETE below fail on a
     * foreign key. The officer got a raw Postgres string in a 500 and nothing
     * was deleted at all: not the students, not even the range. Since real
     * students do sign in, deleting a range with anyone in it mostly did not
     * work.
     *
     * The Super Admin's delete-student already clears these first; this path
     * never did.
     *
     * Both deletes go in one transaction. Separately, a failure on the second
     * would leave the activity log wiped for accounts that then survived —
     * destroying the audit trail of students who are still there.
     */
    await transaction(async (client) => {
      await client.query(`DELETE FROM activity_logs WHERE user_id = ANY($1::int[])`, [userIds]);
      // CASCADE handles students, job_applications, extended profiles, resumes,
      // whitelist requests and notification recipients.
      await client.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [userIds]);
    });

    /*
     * Their photos go too. CASCADE only reaches the database, so this was the
     * one path that deleted students and left their photographs in Cloudinary
     * for good — with the rows gone, nothing remembered the public IDs, so
     * nobody could ever find them again. The Super Admin's own delete-student
     * already does this; this was simply missed.
     *
     * Best-effort and after the rows: a storage hiccup must not undo a deletion
     * the officer has confirmed, and the photo of a student who no longer
     * exists is the smaller problem of the two.
     */
    for (const student of studentsToDelete) {
      if (!student.photo_cloudinary_id) continue;
      try {
        await deleteImage(student.photo_cloudinary_id);
        const folderPath = extractFolderPath(student.photo_cloudinary_id);
        if (folderPath) await deleteFolderOnly(folderPath);
      } catch (photoError) {
        console.error(
          `Photo cleanup failed for deleted student ${student.prn} (non-fatal):`,
          photoError.message
        );
      }
    }

    return studentsToDelete.length;
  } catch (error) {
    console.error('Error deleting students in range:', error);
    throw error;
  }
};

/**
 * Reactivate students whose PRN matches active ranges (college-scoped)
 * Called when a PRN range is enabled
 *
 * Students the year-end reset archived are never reactivated, whatever range
 * covers them. Enabling a closed range is refused a layer up, but this is the
 * rule that actually matters: a passed-out batch coming back to life is the
 * damage, and it should not depend on every future caller remembering to check
 * which range they were handed.
 */
const reactivateStudentsInRange = async (range, officerId, collegeId) => {
  try {
    let studentsToReactivate = [];

    if (range.single_prn) {
      // Handle single PRN - only from this college
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.prn = $1 AND s.college_id = $2
           AND s.archived_academic_year IS NULL`,
        [range.single_prn, collegeId]
      );
      studentsToReactivate = studentsResult.rows;
    } else if (range.range_start && range.range_end) {
      // Handle range - get all students from this college and filter
      const studentsResult = await query(
        `SELECT s.id, s.prn, s.user_id, s.photo_cloudinary_id
         FROM students s WHERE s.college_id = $1
           AND s.archived_academic_year IS NULL`,
        [collegeId]
      );

      studentsToReactivate = studentsResult.rows.filter(student =>
        prnMatchesRange(student.prn, range)
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

    // Get distinct branches from students in THIS COLLEGE ONLY.
    // Same audience rule as sendNotification below, so the count an officer
    // reads before sending is the count that actually receives it.
    const branchesResult = await query(
      `SELECT DISTINCT s.branch, COUNT(s.id) as student_count
       FROM students s
       WHERE s.college_id = $1
         AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
         AND ${ACTIVE_STUDENT_ACCOUNT_SQL}
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

    // Single query to get all dashboard counts instead of 5 separate queries
    const counts = await query(
      `SELECT
        (SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id WHERE s.college_id = $1 AND u.is_active = TRUE) as total_students,
        (SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id WHERE s.college_id = $1 AND u.is_active = TRUE AND s.registration_status = 'pending') as pending_students,
        (SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id WHERE s.college_id = $1 AND u.is_active = TRUE AND s.registration_status = 'approved') as approved_students,
        (SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id WHERE s.college_id = $1 AND u.is_active = TRUE AND s.is_blacklisted = TRUE) as blacklisted_students,
        (SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND application_deadline > CURRENT_TIMESTAMP) as active_jobs`,
      [officer.college_id]
    );

    const d = counts.rows[0];

    res.status(200).json({
      success: true,
      data: {
        college_name: officer.college_name,
        region_name: officer.region_name,
        total_students: parseInt(d.total_students),
        pending_students: parseInt(d.pending_students),
        approved_students: parseInt(d.approved_students),
        blacklisted_students: parseInt(d.blacklisted_students),
        active_jobs: parseInt(d.active_jobs),
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
// @desc    Distinct passed-out batch years for this officer's college
// @route   GET /api/placement-officer/archived-years
// @access  Private (Placement Officer)
export const getArchivedAcademicYears = async (req, res) => {
  try {
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (officerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement officer profile not found' });
    }
    const result = await query(
      `SELECT DISTINCT archived_academic_year AS year
       FROM students
       WHERE college_id = $1 AND archived_academic_year IS NOT NULL
       ORDER BY year DESC`,
      [officerResult.rows[0].college_id]
    );
    res.status(200).json({ success: true, data: result.rows.map((r) => r.year) });
  } catch (error) {
    console.error('Get archived years error (PO):', error);
    res.status(500).json({ success: false, message: 'Error fetching archived years', error: error.message });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { status, cgpa_min, cgpa_max, backlog, search, page = '1', limit = '100',
            dob_from, dob_to, height_min, height_max, weight_min, weight_max,
            has_driving_license, has_pan_card, has_aadhar_card, has_passport, districts,
            archived, academic_year } = req.query;

    // Archived view: passed-out students of this college, deactivated by the
    // year-end reset. Default (not set) keeps the original active-only behavior.
    const showArchived = archived === 'true' || archived === true;

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
      SELECT s.*, s.student_name as name, u.email as user_email, c.college_name, r.region_name,
             COALESCE(ep.height_cm, s.height) as height,
             COALESCE(ep.weight_kg, s.weight) as weight,
             ep.district
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE s.college_id = $1 AND u.is_active = ${showArchived ? 'FALSE' : 'TRUE'}
    `;
    const params = [collegeId];
    let paramCount = 1;

    // Archived view = genuinely passed-out (year-stamped) students only, never
    // accounts deactivated for other reasons (e.g. a disabled PRN range).
    if (showArchived) {
      queryText += ` AND s.archived_academic_year IS NOT NULL`;
    }

    // Passed-out batch filter (archived view only)
    if (showArchived && academic_year) {
      paramCount++;
      queryText += ` AND s.archived_academic_year = $${paramCount}`;
      params.push(academic_year);
    }

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

    // The Maximum CGPA box has always existed in the officer's filter panel, but
    // its value was never sent and this endpoint never read it, so setting a
    // maximum did nothing at all — a min+max range only ever applied the min.
    if (cgpa_max) {
      paramCount++;
      queryText += ` AND s.programme_cgpa <= $${paramCount}`;
      params.push(cgpa_max);
    }

    // "Maximum backlogs" now behaves as a maximum, against the semester sum the
    // table displays and job eligibility uses. See utils/backlogPolicy.
    const maxBacklogs = parseMaxBacklogs(backlog);
    if (maxBacklogs !== null) {
      paramCount++;
      queryText += ` AND ${TOTAL_BACKLOGS_SQL} <= $${paramCount}`;
      params.push(maxBacklogs);
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
      /SELECT s\.\*.*?ep\.district/s,
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
        // Update timestamp before sending email. Day-aware so the approval
        // email counts toward today's tally without inflating a lifetime
        // total — approval itself is never blocked by the student's quota.
        await query(
          `UPDATE students
           SET last_verification_email_sent_at = CURRENT_TIMESTAMP,
               verification_email_sent_count = ${DAY_AWARE_COUNT_SQL}
           WHERE id = $1`,
          [studentId]
        );

        const verificationDetails = await buildVerificationDetails(student);
        await sendVerificationEmail(
          student.email,
          student.email_verification_token,
          student.student_name,
          verificationDetails
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

    // Only pending registrations can be rejected. This also guarantees a
    // rejected student never has dependent records (they could never log
    // in), which keeps re-registration (replace) safe.
    if (student.registration_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending registrations can be rejected (this one is ${student.registration_status})`,
      });
    }

    // Optional reason — stored, shown at the student's next login attempt,
    // and included in the notification email
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 500)
        : null;

    // Update student status
    await query(
      `UPDATE students
       SET registration_status = 'rejected',
           rejection_reason = $1,
           rejected_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason, studentId]
    );

    // Best-effort notification — the registered email may itself be the
    // problem (typos), so a failure here must never fail the rejection
    try {
      await sendRegistrationRejectedEmail(student.email, student.student_name, reason);
    } catch (emailError) {
      console.error('Rejection email failed (non-fatal):', emailError.message);
    }

    // Log activity
    await logActivity(
      req.user.id,
      'REJECT_STUDENT',
      `Rejected student registration for PRN ${student.prn}${reason ? ` (reason: ${reason})` : ''}`,
      'student',
      studentId,
      { prn: student.prn, reason },
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
         RETURNING id, prn, email, student_name, email_verification_token,
                   email_verified, college_id, branch, created_at`,
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

    // Verification emails — parity with the single-student approve path, which
    // sends the student their verification link at the moment of approval.
    // Without this a bulk-approved student is approved but never told, and
    // never receives the link they need to verify. Best-effort per student: the
    // approval is already committed, so a bad address must never undo it.
    //
    // Sent in small concurrent batches rather than strictly one at a time —
    // 50 sequential SMTP sends can outrun the proxy read timeout, which would
    // show the officer a failure for an approval that fully succeeded.
    const pendingVerification = result.filter(
      (s) => s.email && s.email_verification_token && !s.email_verified
    );

    for (let i = 0; i < pendingVerification.length; i += BULK_EMAIL_CONCURRENCY) {
      const batch = pendingVerification.slice(i, i + BULK_EMAIL_CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (student) => {
          try {
            // Timestamp before sending, day-aware, exactly as approveStudent
            // does: the approval email counts toward today's tally without
            // inflating a lifetime total.
            await query(
              `UPDATE students
               SET last_verification_email_sent_at = CURRENT_TIMESTAMP,
                   verification_email_sent_count = ${DAY_AWARE_COUNT_SQL}
               WHERE id = $1`,
              [student.id]
            );

            const verificationDetails = await buildVerificationDetails(student);
            await sendVerificationEmail(
              student.email,
              student.email_verification_token,
              student.student_name,
              verificationDetails
            );
          } catch (emailError) {
            console.error(
              `❌ Verification email failed for PRN ${student.prn} (non-fatal):`,
              emailError.message
            );
          }
        })
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

    // Optional reason applied to the whole batch
    const bulkReason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 500)
        : null;

    // Reject all students in transaction
    const result = await transaction(async (client) => {
      const rejectedResult = await client.query(
        `UPDATE students
         SET registration_status = 'rejected',
             rejection_reason = $2,
             rejected_at = CURRENT_TIMESTAMP
         WHERE id = ANY($1::int[])
           AND registration_status = 'pending'
         RETURNING id, prn, email, student_name`,
        [studentIds, bulkReason]
      );

      return rejectedResult.rows;
    });

    // Best-effort notifications — never fail the rejection over email issues.
    // Batched for the same reason as bulk approve: this endpoint is reachable
    // from the UI now, so it has to survive a 50-student batch.
    for (let i = 0; i < result.length; i += BULK_EMAIL_CONCURRENCY) {
      const batch = result.slice(i, i + BULK_EMAIL_CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (student) => {
          try {
            await sendRegistrationRejectedEmail(student.email, student.student_name, bulkReason);
          } catch (emailError) {
            console.error(`Rejection email failed for PRN ${student.prn} (non-fatal):`, emailError.message);
          }
        })
      );
    }

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

    // Build student query with branch filtering.
    // The account must be active: a deactivated student cannot sign in, so
    // notifying them is a row nobody reads and, at Urgent, an email nobody can
    // act on. See utils/notificationAudience.js.
    let studentQuery = `
      SELECT s.id, s.user_id, s.email, s.student_name, s.branch
      FROM students s
      WHERE s.college_id = $1
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
        AND ${ACTIVE_STUDENT_ACCOUNT_SQL}
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
            has_driving_license, has_pan_card, has_aadhar_card, has_passport, districts,
            archived, academic_year, ...filters } = req.query;

    // Match the list exactly. This query previously joined users but never
    // filtered on is_active, so an export returned every student ever
    // registered — including passed-out batches and accounts deactivated by a
    // disabled PRN range — while the screen showed only the active ones. On a
    // college whose batch has been archived that meant seeing 0 students and
    // exporting several hundred.
    const showArchived = archived === 'true' || archived === true;

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
    const { status, search, branch, cgpa_min, cgpa_max, backlog } = filters;

    // Same scoping rule the list uses: current students are active accounts,
    // the archived view is the deactivated, year-stamped ones.
    queryText += ` AND u.is_active = ${showArchived ? 'FALSE' : 'TRUE'}`;
    if (showArchived) {
      queryText += ` AND s.archived_academic_year IS NOT NULL`;
      if (academic_year) {
        paramCount++;
        queryText += ` AND s.archived_academic_year = $${paramCount}`;
        params.push(academic_year);
      }
    }

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

    if (cgpa_max) {
      paramCount++;
      queryText += ` AND s.programme_cgpa <= $${paramCount}`;
      params.push(parseFloat(cgpa_max));
    }

    // Apply backlog filter
    const maxBacklogsExport = parseMaxBacklogs(backlog);
    if (maxBacklogsExport !== null) {
      paramCount++;
      queryText += ` AND ${TOTAL_BACKLOGS_SQL} <= $${paramCount}`;
      params.push(maxBacklogsExport);
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

    // Validation - only name is required, email is optional
    if (!officer_name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide officer name',
      });
    }

    // Validate email format only if provided
    const officerEmail = email && email.trim() ? email.trim() : null;
    if (officerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(officerEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
    }

    // Update placement officer name and officer_email
    const result = await query(
      `UPDATE placement_officers
       SET officer_name = $1, officer_email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING *`,
      [officer_name, officerEmail, req.user.id]
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
      'placement_officer',
      result.rows[0].id,
      { officer_name, officer_email: officerEmail },
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
      no_of_vacancies,
      location,
      salary_range,
      application_deadline,
      application_form_url,
      min_cgpa,
      max_backlogs,
      backlog_max_semester,
      allowed_backlog_semesters,
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

    // The student job list only returns rows with application_deadline >=
    // CURRENT_DATE, so a past deadline produces a job nobody can ever see while
    // the officer is told it was created. Refuse it here as well as in the
    // form, since the form check is only a convenience.
    const deadlineDate = new Date(application_deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline is not a valid date',
      });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (deadlineDate < startOfToday) {
      return res.status(400).json({
        success: false,
        message: 'The application deadline must be today or later — students cannot see a job whose deadline has already passed',
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

    // Single-college deployments can require super admin approval for
    // own-college posts (portal setting). Multi-college: always auto-approved.
    const approvalRequired = isOwnCollegeOnly && (await singleCollegeJobApprovalRequired());

    if (isOwnCollegeOnly && !approvalRequired) {
      // AUTO-APPROVAL: Create job directly for own college
      const result = await transaction(async (client) => {
        // Create job request with auto_approved status
        const jobRequestResult = await client.query(
          `INSERT INTO job_requests (
            placement_officer_id, college_id, job_title, company_name, job_description,
            no_of_vacancies, location, salary_range, application_deadline, application_form_url,
            min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches, target_type, target_regions, target_colleges,
            status, reviewed_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            officer.id,
            officer.college_id,
            job_title.trim(),
            company_name.trim(),
            job_description.trim(),
            toNumberOrNull(no_of_vacancies),
            toNullIfEmpty(location),
            toNullIfEmpty(salary_range),
            application_deadline,
            (application_form_url || '').trim(),
            toNumberOrNull(min_cgpa),
            toNumberOrNull(max_backlogs),
            backlog_max_semester || null,
            JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
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
           (job_title, company_name, job_description, job_location, no_of_vacancies, salary_package,
            application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters,
            allowed_branches, target_type, target_regions, target_colleges, created_by, is_active,
            placement_officer_id, is_auto_approved, source_job_request_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15::jsonb, $16::jsonb, $17, TRUE, $18, TRUE, $19)
           RETURNING *`,
          [
            job_title.trim(),
            company_name.trim(),
            job_description.trim(),
            toNullIfEmpty(location),
            toNumberOrNull(no_of_vacancies),
            toNullIfEmpty(salary_range),
            (application_form_url || '').trim(),
            application_deadline,
            toNumberOrNull(min_cgpa),
            toNumberOrNull(max_backlogs),
            backlog_max_semester || null,
            JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
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
              job_request_id, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
              requires_academic_extended, requires_physical_details,
              requires_family_details, requires_personal_details,
              requires_document_verification, requires_education_preferences,
              specific_field_requirements, custom_fields
            ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)`,
            [
              jobRequest.id,
              toNumberOrNull(min_cgpa),
              toNumberOrNull(max_backlogs),
              backlog_max_semester || null,
              JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
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
              job_id, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
              requires_academic_extended, requires_physical_details,
              requires_family_details, requires_personal_details,
              requires_document_verification, requires_education_preferences,
              specific_field_requirements, custom_fields
            ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)`,
            [
              job.id,
              toNumberOrNull(min_cgpa),
              toNumberOrNull(max_backlogs),
              backlog_max_semester || null,
              JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
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
    // Auto-include PO's own college in target_colleges so their students are always eligible
    let finalTargetColleges = target_colleges && target_colleges.length > 0 ? [...target_colleges] : [];
    if (!finalTargetColleges.map(Number).includes(Number(officer.college_id))) {
      finalTargetColleges.push(officer.college_id);
    }

    const jobRequestResult = await query(
      `INSERT INTO job_requests (
        placement_officer_id, college_id, job_title, company_name, job_description,
        no_of_vacancies, location, salary_range, application_deadline, application_form_url,
        min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches, target_type, target_regions, target_colleges,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        officer.id,
        officer.college_id,
        job_title.trim(),
        company_name.trim(),
        job_description.trim(),
        toNumberOrNull(no_of_vacancies),
        toNullIfEmpty(location),
        toNullIfEmpty(salary_range),
        application_deadline,
        (application_form_url || '').trim(),
        toNumberOrNull(min_cgpa),
        toNumberOrNull(max_backlogs),
        backlog_max_semester || null,
        JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
        allowed_branches && allowed_branches.length > 0 ? JSON.stringify(allowed_branches) : null,
        'specific',
        target_regions && target_regions.length > 0 ? JSON.stringify(target_regions) : null,
        finalTargetColleges.length > 0 ? JSON.stringify(finalTargetColleges) : null,
        'pending',
      ]
    );

    // Own-college posts rerouted here by the approval policy keep their
    // extended requirements, so approveJobRequest copies them to the job
    // (multi-college requests are unaffected: they never send these fields)
    if (approvalRequired && (requires_academic_extended || requires_physical_details ||
        requires_family_details || requires_personal_details || requires_document_verification ||
        requires_education_preferences || specific_field_requirements ||
        (custom_fields && custom_fields.length > 0))) {
      await query(
        `INSERT INTO job_request_requirement_templates (
          job_request_id, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
          requires_academic_extended, requires_physical_details,
          requires_family_details, requires_personal_details,
          requires_document_verification, requires_education_preferences,
          specific_field_requirements, custom_fields
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)`,
        [
          jobRequestResult.rows[0].id,
          toNumberOrNull(min_cgpa),
          toNumberOrNull(max_backlogs),
          backlog_max_semester || null,
          JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
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

    // Get job requests with job existence check and live deadline from jobs table
    const jobRequestsResult = await query(
      `SELECT jr.*,
              reviewer.email as reviewed_by_email,
              COALESCE(j.application_deadline, jr.application_deadline) as application_deadline,
              j.id as linked_job_id,
              CASE
                WHEN jr.status IN ('approved', 'auto_approved') THEN (j.id IS NOT NULL)
                ELSE NULL
              END as job_exists
       FROM job_requests jr
       LEFT JOIN jobs j ON j.source_job_request_id = jr.id
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

// @desc    Update a job created by this placement officer
// @route   PUT /api/placement-officer/jobs/:id
// @access  Private (Placement Officer - own jobs only)
export const updateJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;

    // Get officer details
    const officerResult = await query(
      'SELECT id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (officerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement officer profile not found' });
    }
    const officer = officerResult.rows[0];

    // Ownership check
    const jobCheck = await query('SELECT placement_officer_id, is_auto_approved FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (jobCheck.rows[0].placement_officer_id !== officer.id) {
      return res.status(403).json({ success: false, message: 'You can only edit jobs you created' });
    }

    // A cross-college job needed super admin approval to go live, so it needs
    // super admin sign-off to change too. Only own-college jobs are
    // auto-approved (is_auto_approved = TRUE) and remain freely editable by the
    // officer. A job the officer created but that is NOT auto-approved went
    // through the SA approval queue (it targeted other colleges, or
    // single-college approval was enabled) — the super admin owns edits to it
    // and can change it directly, so block the officer from silently editing an
    // approved posting out from under that approval.
    if (!jobCheck.rows[0].is_auto_approved) {
      return res.status(403).json({
        success: false,
        message: 'This job covers other colleges and was approved by the Super Admin. Contact the Super Admin to make changes.',
      });
    }

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
      allowed_backlog_semesters,
      allowed_branches,
      is_active,
    } = req.body;

    /*
     * Eligibility is frozen once anyone has applied. Nothing else is.
     *
     * min_cgpa, max_backlogs, allowed_backlog_semesters and allowed_branches
     * decide who may apply, and changing one afterwards leaves the data
     * contradicting itself: a student who applied at min_cgpa 6.0 is still
     * sitting in the applicant list when the bar moves to 7.0, and a student
     * from a branch that gets unticked is still in it too — while every
     * eligibility view, every "eligible but not applied" export and every
     * re-check now says they never qualified. The list and the criteria
     * disagree and nothing on screen can explain why.
     *
     * Company, package, location, deadline, title, description, vacancies and
     * the form link stay editable, deliberately. Changing them contradicts
     * nothing — it updates information — and companies revise all of them
     * routinely. Locking them would leave an officer unable to correct a
     * package that is genuinely wrong, and students reading something false is
     * worse than students reading something that changed. Keeping a posting
     * accurate is what the edit screen is for.
     *
     * Before the first application none of this applies: there is nobody to
     * contradict, so every field including eligibility stays editable, which is
     * the case those fields are actually needed for.
     */
    const ELIGIBILITY = { min_cgpa, max_backlogs, allowed_backlog_semesters, allowed_branches };
    const changingEligibility = Object.entries(ELIGIBILITY)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);

    if (changingEligibility.length > 0) {
      const applied = await query(
        'SELECT COUNT(*)::int AS n FROM job_applications WHERE job_id = $1',
        [jobId]
      );
      const n = applied.rows[0].n;
      if (n > 0) {
        return res.status(409).json({
          success: false,
          message:
            `${n} student${n === 1 ? ' has' : 's have'} already applied, so who is eligible cannot be ` +
            'changed — they applied under the current rules. Everything else about the job, including ' +
            'the company, package, location and deadline, can still be edited.',
          locked_fields: changingEligibility,
          applicant_count: n,
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    // Unpublishing: the officer's only way to take a live job down once students
    // have applied, since deleting it would cascade their applications away.
    if (is_active !== undefined) { updates.push(`is_active = $${paramCount}`); values.push(Boolean(is_active)); paramCount++; }
    if (title !== undefined) { updates.push(`job_title = $${paramCount}`); values.push(title); paramCount++; }
    if (company_name !== undefined) { updates.push(`company_name = $${paramCount}`); values.push(company_name); paramCount++; }
    if (description !== undefined) { updates.push(`job_description = $${paramCount}`); values.push(description); paramCount++; }
    if (location !== undefined) { updates.push(`job_location = $${paramCount}`); values.push(location); paramCount++; }
    if (no_of_vacancies !== undefined) { updates.push(`no_of_vacancies = $${paramCount}`); values.push(no_of_vacancies); paramCount++; }
    if (salary_package !== undefined) { updates.push(`salary_package = $${paramCount}`); values.push(salary_package); paramCount++; }
    if (application_form_url !== undefined) { updates.push(`application_form_url = $${paramCount}`); values.push(application_form_url); paramCount++; }
    if (application_deadline !== undefined) { updates.push(`application_deadline = $${paramCount}`); values.push(application_deadline); paramCount++; }
    if (min_cgpa !== undefined) { updates.push(`min_cgpa = $${paramCount}`); values.push(min_cgpa || null); paramCount++; }
    if (max_backlogs !== undefined) { updates.push(`max_backlogs = $${paramCount}`); values.push(max_backlogs !== '' ? max_backlogs : null); paramCount++; }
    if (allowed_backlog_semesters !== undefined) { updates.push(`allowed_backlog_semesters = $${paramCount}::jsonb`); values.push(JSON.stringify(allowed_backlog_semesters || [])); paramCount++; }
    if (allowed_branches !== undefined) { updates.push(`allowed_branches = $${paramCount}`); values.push(JSON.stringify(allowed_branches || [])); paramCount++; }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(jobId);

    const result = await query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Sync allowed_branches to job_requirement_templates if it was changed
    if (allowed_branches !== undefined) {
      await query(
        `UPDATE job_requirement_templates SET allowed_branches = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2`,
        [JSON.stringify(allowed_branches || []), jobId]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('PO updateJob error:', error);
    res.status(500).json({ success: false, message: 'Error updating job', error: error.message });
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
    const collegeId = officer.college_id;

    // Check if this PO is the host (creator) of this job
    const jobResult = await query(
      'SELECT placement_officer_id, target_colleges FROM jobs WHERE id = $1',
      [jobId]
    );

    const isHost = jobResult.rows.length > 0 && jobResult.rows[0].placement_officer_id === officer.id;

    // Host PO sees all colleges' applicants; non-host PO sees only their own college
    const collegeFilter = isHost ? '' : 'AND s.college_id = $2';
    const queryParams = isHost ? [jobId] : [jobId, collegeId];

    /*
     * Every application on this job, including those from students who have
     * since been blacklisted or had their approval revoked.
     *
     * Applying already requires an approved, non-blacklisted account
     * (checkStudentApproval), so these are people who applied legitimately and
     * whose standing changed afterwards. Filtering them out here left the
     * placement statistics — which count every application — reporting a number
     * the officer could not reconcile against the list, with one applicant that
     * could never be opened or acted on. Worse, an officer building a shortlist
     * had no way to notice that someone on it had since been barred.
     *
     * They come back flagged instead, for the page to mark. The exports still
     * leave them out, which is the safe default for a file that goes to a
     * company.
     *
     * Sorted by: college_name → branch → PRN (grouping same college, same
     * branch, with PRN order)
     */
    const applicantsResult = await query(
      `SELECT
        s.id, s.prn, s.student_name as name, s.email, s.mobile_number, s.branch,
        s.programme_cgpa as cgpa, s.backlog_count, s.date_of_birth, s.college_id,
        s.registration_status, s.is_blacklisted, s.gender, s.age,
        c.college_name,
        ja.id as application_id, ja.applied_date, ja.application_status,
        ja.created_by_officer,
        ja.placement_package, ja.joining_date, ja.placement_location,
        j.job_title, j.company_name, j.min_cgpa, j.max_backlogs, j.allowed_branches,
        sep.sslc_marks, sep.sslc_year, sep.sslc_board,
        sep.twelfth_marks, sep.twelfth_year, sep.twelfth_board,
        sep.height_cm, sep.weight_kg, sep.physically_handicapped, sep.handicap_details,
        sep.district, sep.permanent_address, sep.interests_hobbies,
        sep.father_name, sep.father_occupation, sep.father_annual_income,
        sep.mother_name, sep.mother_occupation, sep.mother_annual_income,
        sep.siblings_count, sep.siblings_details,
        sep.has_aadhar_card,
        sep.has_passport,
        COALESCE(sep.has_pan_card, s.has_pan_card) as has_pan_card,
        s.has_driving_license,
        sep.interested_in_btech, sep.interested_in_mtech, sep.preferred_study_mode,
        sep.additional_certifications, sep.achievements, sep.extracurricular,
        sep.profile_completion_percentage,
        EXISTS (
          SELECT 1 FROM job_applications ja_other
          WHERE ja_other.student_id = s.id
          AND ja_other.application_status = 'selected'
          AND ja_other.job_id != ja.job_id
        ) as is_already_placed,
        (SELECT json_agg(json_build_object(
          'job_title', j_placed.job_title,
          'company_name', j_placed.company_name,
          'placement_package', ja_placed.placement_package
        ))
        FROM job_applications ja_placed
        JOIN jobs j_placed ON ja_placed.job_id = j_placed.id
        WHERE ja_placed.student_id = s.id
        AND ja_placed.application_status = 'selected'
        AND ja_placed.job_id != ja.job_id
        ) as previous_placements
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN student_extended_profiles sep ON s.id = sep.student_id
      WHERE ja.job_id = $1
        ${collegeFilter}
      ORDER BY c.college_name ASC, s.branch ASC, s.prn ASC`,
      queryParams
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
      is_host: isHost,
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

    // PRN ranges for THIS college only — whoever created them.
    //
    // This used to read `WHERE pr.college_id = $1 OR pr.created_by_role =
    // 'super_admin'`, and that OR was a cross-college disclosure: every range
    // the Super Admin had ever created, for any college in the state, was
    // returned to every placement officer. A PRN is a student identifier, so
    // one college's officer could read another college's PRN blocks straight
    // out of this response.
    //
    // Scoped to the officer's own college. In practice that excludes every
    // Super-Admin range, because the table's own constraint
    // (check_prn_range_creator_college) requires a super_admin row to have
    // college_id IS NULL and a placement_officer row to have one set — so a
    // Super-Admin range is never recorded against a college even when the PRN
    // block it covers plainly belongs to one. That is exactly why they leaked:
    // college-less did not mean college-neutral.
    //
    // Consequence worth knowing: those ranges still govern registration.
    // commonController.validatePRN checks a PRN against every active range with
    // no college filter at all, so a Super-Admin range can still admit a student
    // to this college while the officer can no longer see it here.
    const rangesResult = await query(
      `SELECT pr.*,
              u.email as added_by_email,
              c.college_name,
              pr.created_by_role as created_by
       FROM prn_ranges pr
       LEFT JOIN users u ON pr.added_by = u.id
       LEFT JOIN colleges c ON pr.college_id = c.id
       WHERE pr.college_id = $1
       ORDER BY pr.created_at DESC`,
      [officer.college_id]
    );

    /*
     * How many students each range actually covers.
     *
     * "How many does this cover?" is the first question an officer has about a
     * range and the page could not answer it — they had to open each one.
     *
     * One pass over the college's PRNs, not one query per range. The obvious
     * shape is a count query inside the map, but a college can hold a hundred
     * ranges and each of those queries scans its whole student list: a hundred
     * scans to draw one page. Read the PRNs once and count in memory instead —
     * a college's roll is thousands, not millions, and this is a page load.
     *
     * Counted with prnMatchesRange, the same rule the disable and delete paths
     * use, so the number here and the students an action reaches are the same
     * set. A count produced by its own logic is worse than no count.
     */
    const prnRows = await query(
      'SELECT prn FROM students WHERE college_id = $1',
      [officer.college_id]
    );
    const collegePrns = prnRows.rows.map((r) => r.prn);

    // Map database field names to frontend expected names
    const mappedData = rangesResult.rows.map(range => ({
      ...range,
      start_prn: range.single_prn || range.range_start,
      end_prn: range.single_prn ? null : range.range_end,
      single_prn: range.single_prn || null,
      student_count: collegePrns.filter((prn) => prnMatchesRange(prn, range)).length,
    }));

    res.status(200).json({
      success: true,
      count: mappedData.length,
      data: mappedData,
      // Lets the page show a banner and disable add/edit when the SA has
      // frozen PRN-range management for this college.
      prn_ranges_locked: await isCollegeLocked(officer.college_id, 'prn_ranges'),
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

    // Refuse if the SA has locked PRN-range management for this college
    if (await isCollegeLocked(officer.college_id, 'prn_ranges')) {
      return res.status(403).json({ success: false, message: PRN_RANGE_LOCK_MESSAGE });
    }

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

    // PRNs inside the range that must NOT register (multiple allowed)
    const exceptions = parseExceptedPrns(req.body.exceptions, range_start, range_end);
    if (exceptions.error) {
      return res.status(400).json({ success: false, message: exceptions.error });
    }

    const result = await query(
      `INSERT INTO prn_ranges (range_start, range_end, single_prn, description, excepted_prns, year, added_by, created_by_role, college_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'placement_officer', $8)
       RETURNING *`,
      [
        range_start || null,
        range_end || null,
        single_prn || null,
        description || null,
        JSON.stringify(exceptions.prns),
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
    const { start_prn, end_prn, single_prn, is_active, is_enabled, description, disabled_reason, year } = req.body;
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

    // Refuse if the SA has locked PRN-range management for this college
    if (await isCollegeLocked(officer.college_id, 'prn_ranges')) {
      return res.status(403).json({ success: false, message: PRN_RANGE_LOCK_MESSAGE });
    }

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

    /*
     * A range the year-end reset closed stays closed.
     *
     * Enabling one calls reactivateStudentsInRange, which flips is_active back
     * on for everyone whose PRN falls inside it — so pressing Enable on last
     * year's range brought a whole passed-out batch back: able to sign in,
     * counted as current students, back in eligibility lists and exports, while
     * still stamped with the year they were archived in. The endpoint reported
     * it as a success ("N students reactivated").
     *
     * Next year's intake gets its own range, which is what happens in practice
     * anyway. Everything else about a closed range is still editable — only
     * bringing it back to life is refused.
     */
    if (currentRange.closed_for_year && req.body.is_enabled === true) {
      return res.status(409).json({
        success: false,
        message:
          `This range was closed by the ${currentRange.closed_for_year} year-end reset. `
          + 'It cannot be reopened — doing so would restore the accounts of students who have '
          + 'passed out. Add a new range for the current intake instead.',
        closed_for_year: currentRange.closed_for_year,
      });
    }

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

    if (single_prn !== undefined) {
      paramCount++;
      updates.push(`single_prn = $${paramCount}`);
      params.push(single_prn || null);
    }

    if (req.body.exceptions !== undefined) {
      // Validate against the bounds the range will have AFTER this update
      const finalStart = range_start !== undefined ? range_start : currentRange.range_start;
      const finalEnd = range_end !== undefined ? range_end : currentRange.range_end;
      const exceptions = parseExceptedPrns(req.body.exceptions, finalStart, finalEnd);
      if (exceptions.error) {
        return res.status(400).json({ success: false, message: exceptions.error });
      }
      paramCount++;
      updates.push(`excepted_prns = $${paramCount}::jsonb`);
      params.push(JSON.stringify(exceptions.prns));
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

    // Refuse if the SA has locked PRN-range management for this college
    if (await isCollegeLocked(officer.college_id, 'prn_ranges')) {
      return res.status(403).json({ success: false, message: PRN_RANGE_LOCK_MESSAGE });
    }

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

    /*
     * A closed range loses only its own record.
     *
     * Deleting a range takes its students with it, which is right for a live
     * one: the case it exists for is a PRN block typed wrongly, with people
     * registered against it by mistake. It is exactly wrong for a range the
     * year-end reset closed, where those students are a batch that graduated
     * and whose records are deliberately kept for reference and export.
     *
     * Blocking the delete instead was the other obvious answer and a bad one —
     * closed ranges accumulate every year and an officer needs to be able to
     * tidy them away. So the range goes and the graduates stay.
     */
    const deletedStudentsCount = rangeToDelete.closed_for_year
      ? 0
      : await deleteStudentsInRange(rangeToDelete, req.user.id, officer.college_id);

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
/**
 * What deleting this range would destroy.
 *
 * Deleting a PRN range deletes every student it covers — their account, their
 * login and their job applications — and until now nothing said so before the
 * fact. The dialog asks the officer to type DELETE against this number, so it is
 * counted with findStudentsInRange, the same function the deletion uses.
 *
 * @route   GET /api/placement-officer/prn-ranges/:id/delete-impact
 * @access  Private (Placement Officer)
 */
export const getPRNRangeDeleteImpact = async (req, res) => {
  try {
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (officerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement officer profile not found' });
    }
    const officer = officerResult.rows[0];

    const rangeResult = await query('SELECT * FROM prn_ranges WHERE id = $1', [req.params.id]);
    if (rangeResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'PRN range not found' });
    }
    const range = rangeResult.rows[0];

    // Same ownership rule as deletion: an officer only sees the impact of a
    // range that is theirs to delete.
    if (range.created_by_role === 'super_admin' || range.college_id !== officer.college_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only check ranges belonging to your college',
      });
    }

    const students = await findStudentsInRange(range, officer.college_id);

    /*
     * A closed range deletes nobody, so it reports nobody. The count is still
     * useful the other way round — "42 students from that intake keep their
     * records" is what makes it obvious this is a tidy-up and not a purge.
     */
    if (range.closed_for_year) {
      return res.status(200).json({
        success: true,
        closed_for_year: range.closed_for_year,
        student_count: 0,
        application_count: 0,
        kept_count: students.length,
      });
    }

    const applications = students.length
      ? (await query(
          'SELECT COUNT(*)::int AS n FROM job_applications WHERE student_id = ANY($1::int[])',
          [students.map((s) => s.id)]
        )).rows[0].n
      : 0;

    res.status(200).json({
      success: true,
      closed_for_year: null,
      student_count: students.length,
      application_count: applications,
    });
  } catch (error) {
    console.error('PRN range delete impact error:', error);
    res.status(500).json({ success: false, message: 'Error checking the range', error: error.message });
  }
};

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

    /*
     * The same rule as the count on the page and as disable and delete.
     *
     * This used to select `WHERE s.prn >= $1 AND s.prn <= $2`, which is a
     * string comparison, and it ignored excepted_prns. So this list, the
     * count beside it, and the students a delete actually removed were three
     * different sets. String bounds also disagree with numeric ones the moment
     * PRNs differ in length — '5000' is inside 999–10000 as a number and
     * outside it as text — and an excepted PRN appeared here as a member of
     * the very range it had been carved out of.
     *
     * Filtered in JS against the college's roll rather than in SQL, because
     * neither the numeric comparison nor the exception list expresses cleanly
     * in the WHERE clause, and because being consistent with the destructive
     * paths matters more here than saving a scan of one college's students.
     */
    const studentsResult = await query(
      `SELECT s.*, s.student_name as name, c.college_name, r.region_name
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.college_id = $1
       ORDER BY s.prn`,
      [officer.college_id]
    );
    const students = studentsResult.rows.filter((s) => prnMatchesRange(s.prn, range));

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
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
    const format = req.query.format || 'excel'; // 'excel' (default) or 'pdf'

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

    /*
     * The export is the students list in another format, so it has to be the
     * same students. It carried its own copy of the string-bounds query, which
     * meant the file an officer downloaded could hold a PRN the page had just
     * told them was excepted from the range.
     */
    const studentsResult = await query(
      `SELECT s.prn, s.student_name as name, s.email, s.mobile_number,
              s.date_of_birth, s.age, s.gender, s.branch,
              s.programme_cgpa, s.backlog_count,
              c.college_name, r.region_name, s.created_at
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.college_id = $1
       ORDER BY s.prn`,
      [officer.college_id]
    );
    const students = studentsResult.rows.filter((s) => prnMatchesRange(s.prn, range));

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this PRN range for your college',
      });
    }

    // Generate PDF if requested
    if (format === 'pdf') {
      const { generatePRNRangeStudentsPDF } = await import('../utils/pdfGenerator.js');
      const rangeInfo = range.single_prn
        ? `PRN: ${range.single_prn}`
        : `PRN Range: ${range.range_start} - ${range.range_end}`;

      // Log before generating: the generator writes straight to the response
      await logActivity(
        req.user.id,
        'EXPORT_PRN_RANGE_STUDENTS',
        `Exported ${students.length} students as PDF from PRN range: ${range.single_prn || `${range.range_start}-${range.range_end}`}`,
        'prn_range',
        rangeId,
        req,
        { format: 'pdf', studentCount: students.length }
      );

      return await generatePRNRangeStudentsPDF(students, { rangeInfo }, res);
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
        date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        created_at: student.created_at ? new Date(student.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
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

// @desc    Notifications this officer has sent
// @route   GET /api/placement-officer/sent-notifications
// @access  Private (Placement Officer)
//
// Scoped by `created_by = req.user.id`, so an officer sees their own sends and
// nothing else. The recipient and read counts come from notification_recipients
// rather than being stored on the notification, and the branch list is derived
// from the students who actually received it — the send does not record which
// branches were targeted, and the recipients are the truthful answer anyway.
export const getSentNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         n.id,
         n.title,
         n.message,
         n.priority,
         n.created_at,
         stats.recipient_count,
         stats.read_count,
         stats.branches
       FROM notifications n
       JOIN LATERAL (
         SELECT
           COUNT(*)::int AS recipient_count,
           COUNT(*) FILTER (WHERE nr.is_read)::int AS read_count,
           ARRAY_AGG(DISTINCT s.branch) FILTER (WHERE s.branch IS NOT NULL) AS branches
         FROM notification_recipients nr
         LEFT JOIN students s ON s.user_id = nr.user_id
         WHERE nr.notification_id = n.id
       ) stats ON TRUE
       WHERE n.created_by = $1
       ORDER BY n.created_at DESC
       -- An active officer sends several a week, so a year is in the hundreds.
       -- 100 is a bounded response the page can search within; the page says so
       -- when it is showing a capped list rather than everything.
       LIMIT 100`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map((row) => ({
        ...row,
        branches: row.branches || [],
      })),
    });
  } catch (error) {
    console.error('Get sent notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sent notifications',
      error: error.message,
    });
  }
};

// @desc    Districts the officer's own students actually live in
// @route   GET /api/placement-officer/districts
// @access  Private (Placement Officer)
//
// The Manage Students district filter used to call /super-admin/districts,
// which is behind the super-admin guard — so for a placement officer it always
// returned 403 and the dropdown rendered with zero options. The filter has
// never worked for this role; it just failed quietly in the console.
//
// Scoped to this college rather than the state, for the same reason
// /branches is: an officer filtering their own students has no use for a
// district none of their students live in, and no business seeing the
// statewide spread.
export const getAvailableDistricts = async (req, res) => {
  try {
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

    const result = await query(
      `SELECT DISTINCT sep.district
       FROM student_extended_profiles sep
       JOIN students s ON s.id = sep.student_id
       WHERE s.college_id = $1
         AND sep.district IS NOT NULL
         AND sep.district <> ''
       ORDER BY sep.district`,
      [officerResult.rows[0].college_id]
    );

    // `districts` is the key the super-admin endpoint uses and the key the
    // page already reads; keeping it means only the URL changes.
    res.status(200).json({
      success: true,
      districts: result.rows.map((r) => r.district),
    });
  } catch (error) {
    console.error('Get available districts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message,
    });
  }
};

// @desc    All five status-tab counts in one query
// @route   GET /api/placement-officer/students/counts
// @access  Private (Placement Officer)
//
// Manage Students used to fire five separate /students calls to fill the tab
// counts — one per status, each with limit=1 purely to read `total`. Every one
// of them ran the full filtered query server-side and threw the rows away, and
// they were the slowest requests on the page. Measured in a browser against
// staging, that page took 4.6s to settle while every other officer route was
// 1.2-2.6s.
//
// The joins and the base WHERE are copied from getStudents deliberately, not
// simplified. `JOIN regions r` looks redundant for a count, but a student with
// a null region_id is excluded from getStudents' total, so dropping the join
// here would make these numbers disagree with the list they label.
//
// The counts deliberately ignore search and filters, exactly as the five calls
// they replace did: they are college-wide totals, so they do not move when the
// officer narrows the view.
export const getStudentCounts = async (req, res) => {
  try {
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

    const showArchived = req.query.archived === 'true' || req.query.archived === true;

    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE s.is_blacklisted = FALSE)::int AS all_count,
         COUNT(*) FILTER (WHERE s.registration_status = 'pending'  AND s.is_blacklisted = FALSE)::int AS pending,
         COUNT(*) FILTER (WHERE s.registration_status = 'approved' AND s.is_blacklisted = FALSE)::int AS approved,
         COUNT(*) FILTER (WHERE s.registration_status = 'rejected' AND s.is_blacklisted = FALSE)::int AS rejected,
         COUNT(*) FILTER (WHERE s.is_blacklisted = TRUE)::int AS blacklisted
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.college_id = $1 AND u.is_active = ${showArchived ? 'FALSE' : 'TRUE'}`,
      [officerResult.rows[0].college_id]
    );

    const row = result.rows[0];
    res.status(200).json({
      success: true,
      counts: {
        all: row.all_count,
        pending: row.pending,
        approved: row.approved,
        rejected: row.rejected,
        blacklisted: row.blacklisted,
      },
    });
  } catch (error) {
    console.error('Get student counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student counts',
      error: error.message,
    });
  }
};

// @desc    Delete a job the officer created
// @route   DELETE /api/placement-officer/jobs/:id
// @access  Private (Placement Officer)
//
// An own-college job request is auto-approved and published the moment it is
// submitted, and until now there was no way for the officer to take it back.
// A wrong company name, a wrong package, or a request made by mistake was live
// to every student in the college permanently, and the only route was asking a
// Super Admin.
//
// Soft delete, never a hard one. job_applications, job_drives,
// job_eligibility_criteria and job_requirement_templates all reference jobs.id
// ON DELETE CASCADE, so removing the row would silently take every student's
// application with it. is_deleted keeps the record and its history while taking
// the job out of every list.
//
// A job that already has applicants is not deletable at all: those students
// applied to something, and making it disappear leaves them with an application
// pointing at nothing. Unpublishing (PUT is_active=false) is the answer there,
// and the message says so.
export const deleteJob = async (req, res) => {
  try {
    const { id: jobId } = req.params;

    const officerResult = await query(
      'SELECT id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (officerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Placement officer profile not found' });
    }

    const jobCheck = await query(
      'SELECT placement_officer_id, is_auto_approved, is_deleted, job_title FROM jobs WHERE id = $1',
      [jobId]
    );
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    const job = jobCheck.rows[0];

    if (job.placement_officer_id !== officerResult.rows[0].id) {
      return res.status(403).json({ success: false, message: 'You can only delete jobs you created' });
    }

    // Same reasoning as updateJob: a cross-college job went through the Super
    // Admin's approval queue, so it is not the officer's to withdraw.
    if (!job.is_auto_approved) {
      return res.status(403).json({
        success: false,
        message: 'This job covers other colleges and was approved by the Super Admin. Contact the Super Admin to withdraw it.',
      });
    }

    if (job.is_deleted) {
      return res.status(200).json({ success: true, message: 'Job already deleted' });
    }

    const applied = await query(
      'SELECT COUNT(*)::int AS n FROM job_applications WHERE job_id = $1',
      [jobId]
    );
    if (applied.rows[0].n > 0) {
      return res.status(409).json({
        success: false,
        message:
          `${applied.rows[0].n} student${applied.rows[0].n === 1 ? ' has' : 's have'} already applied to this job, ` +
          'so it cannot be deleted — their applications would go with it. ' +
          'Unpublish it instead to take it off the students\' list while keeping the records.',
        applicant_count: applied.rows[0].n,
      });
    }

    await query(
      `UPDATE jobs
          SET is_deleted = TRUE, is_active = FALSE,
              deleted_at = CURRENT_TIMESTAMP, deleted_by = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [req.user.id, jobId]
    );

    await logActivity(
      req.user.id,
      'DELETE_JOB',
      `Deleted job: ${job.job_title}`,
      'job',
      jobId,
      { job_title: job.job_title },
      req
    );

    res.status(200).json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: 'Error deleting job', error: error.message });
  }
};

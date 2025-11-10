import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

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
      `SELECT COUNT(*) as count FROM students
       WHERE college_id = $1`,
      [officer.college_id]
    );

    // Get students count by status
    const pendingCount = await query(
      `SELECT COUNT(*) as count FROM students
       WHERE college_id = $1 AND registration_status = 'pending'`,
      [officer.college_id]
    );

    const approvedCount = await query(
      `SELECT COUNT(*) as count FROM students
       WHERE college_id = $1 AND registration_status = 'approved'`,
      [officer.college_id]
    );

    const blacklistedCount = await query(
      `SELECT COUNT(*) as count FROM students
       WHERE college_id = $1 AND is_blacklisted = TRUE`,
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
    const { status, cgpa_min, backlog, search } = req.query;

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
      SELECT s.*, u.email as user_email, c.college_name, r.region_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      WHERE s.college_id = $1
    `;
    const params = [collegeId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      queryText += ` AND s.registration_status = $${paramCount}`;
      params.push(status);
    }

    if (cgpa_min) {
      paramCount++;
      queryText += ` AND s.cgpa >= $${paramCount}`;
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

    if (search) {
      paramCount++;
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.name ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.mobile_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY s.created_at DESC';

    const studentsResult = await query(queryText, params);

    res.status(200).json({
      success: true,
      count: studentsResult.rows.length,
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
       SET registration_status = 'approved', approved_by = $1, approved_date = CURRENT_TIMESTAMP
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

    res.status(200).json({
      success: true,
      message: 'Student approved successfully',
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

// @desc    Send notification to college students
// @route   POST /api/placement-officer/send-notification
// @access  Private (Placement Officer)
export const sendNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message',
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

    // Send notification in transaction
    await transaction(async (client) => {
      // Create notification
      const notificationResult = await client.query(
        `INSERT INTO notifications (title, message, created_by, target_type)
         VALUES ($1, $2, $3, 'specific_colleges')
         RETURNING id`,
        [title, message, req.user.id]
      );

      const notificationId = notificationResult.rows[0].id;

      // Add target college
      await client.query(
        `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
         VALUES ($1, 'college', $2)`,
        [notificationId, collegeId]
      );

      // Get all approved students from college
      const studentsResult = await client.query(
        `SELECT user_id FROM students
         WHERE college_id = $1 AND registration_status = 'approved' AND is_blacklisted = FALSE`,
        [collegeId]
      );

      // Add recipients
      for (const student of studentsResult.rows) {
        await client.query(
          `INSERT INTO notification_recipients (notification_id, user_id)
           VALUES ($1, $2)`,
          [notificationId, student.user_id]
        );
      }
    });

    // Log activity
    await logActivity(
      req.user.id,
      'SEND_NOTIFICATION',
      `Sent notification to college students: ${title}`,
      'notification',
      null,
      { title, collegeId },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
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
    const { format = 'excel', ...filters } = req.query;

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

    // Get students with filters
    let queryText = `
      SELECT s.prn, s.email, s.mobile_number, s.cgpa, s.date_of_birth,
             s.backlog_count, s.registration_status, s.is_blacklisted,
             c.college_name, r.region_name
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      WHERE s.college_id = $1
    `;
    const params = [collegeId];

    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;

    if (format === 'pdf') {
      return exportToPDF(students, res);
    } else {
      return exportToExcel(students, res);
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

// Helper: Export to PDF
const exportToPDF = (students, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=students-report.pdf');
  doc.pipe(res);

  // Title
  doc.fontSize(18).text('Students Report', { align: 'center' });
  doc.moveDown();

  // Table headers
  doc.fontSize(10);
  students.forEach((student, index) => {
    doc.text(`${index + 1}. PRN: ${student.prn}`);
    doc.text(`   Email: ${student.email}`);
    doc.text(`   CGPA: ${student.cgpa} | Backlogs: ${student.backlog_count}`);
    doc.text(`   Status: ${student.registration_status}`);
    doc.moveDown();
  });

  doc.end();
};

// Helper: Export to Excel
const exportToExcel = async (students, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define columns
  worksheet.columns = [
    { header: 'PRN', key: 'prn', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Mobile', key: 'mobile_number', width: 15 },
    { header: 'CGPA', key: 'cgpa', width: 10 },
    { header: 'DOB', key: 'date_of_birth', width: 12 },
    { header: 'Backlogs', key: 'backlog_count', width: 15 },
    { header: 'Status', key: 'registration_status', width: 15 },
    { header: 'Blacklisted', key: 'is_blacklisted', width: 12 },
  ];

  // Add rows
  worksheet.addRows(students);

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
      `SELECT po.*, c.college_name, r.region_name, u.email, u.last_login
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
    } = req.body;

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

    // Validate required fields - check for empty strings and trim whitespace
    if (!job_title?.trim() || !company_name?.trim() || !job_description?.trim() ||
        !application_form_url?.trim() || !application_deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: job title, company name, description, application form URL, and deadline',
      });
    }

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value) => (value && value.trim() !== '' ? value.trim() : null);
    const toNumberOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // Create job request
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
        'specific', // Only 'all' or 'specific' allowed by check constraint
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
      message: 'Job request submitted successfully',
      data: jobRequestResult.rows[0],
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
    const applicantsResult = await query(
      `SELECT
        s.id, s.prn, s.name, s.email, s.mobile_number, s.branch, s.cgpa,
        s.backlog_count, s.date_of_birth, s.college_id, s.registration_status,
        c.college_name,
        ja.id as application_id, ja.applied_date, ja.application_status,
        j.job_title, j.company_name, j.min_cgpa, j.max_backlogs, j.allowed_branches
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
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

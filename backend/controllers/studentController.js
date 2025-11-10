import { query } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

// @desc    Get student dashboard data
// @route   GET /api/students/dashboard
// @access  Private (Student)
export const getDashboard = async (req, res) => {
  try {
    const studentResult = await query(
      `SELECT s.*, c.college_name, r.region_name
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const student = studentResult.rows[0];

    // Get application count
    const applicationsResult = await query(
      'SELECT COUNT(*) as count FROM job_applications WHERE student_id = $1',
      [student.id]
    );

    // Get eligible jobs count (all active jobs, regardless of deadline)
    const eligibleJobsResult = await query(
      `SELECT COUNT(DISTINCT j.id) as count
       FROM jobs j
       WHERE j.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM job_applications ja
         WHERE ja.job_id = j.id AND ja.student_id = $1
       )`,
      [student.id]
    );

    // Get unread notifications count
    const notificationsResult = await query(
      `SELECT COUNT(*) as count
       FROM notification_recipients nr
       WHERE nr.user_id = $1 AND nr.is_read = FALSE`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      data: {
        profile: student,
        stats: {
          applicationsCount: parseInt(applicationsResult.rows[0].count),
          eligibleJobsCount: parseInt(eligibleJobsResult.rows[0].count),
          unreadNotifications: parseInt(notificationsResult.rows[0].count),
        },
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

// @desc    Get all jobs for student (no eligibility filtering)
// @route   GET /api/students/all-jobs
// @access  Private (Student - Approved)
export const getEligibleJobs = async (req, res) => {
  try {
    // Get student details
    const studentResult = await query(
      `SELECT s.*, c.college_name, r.region_name
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const student = studentResult.rows[0];

    // Get all jobs (including past ones) with application status and eligibility check
    const jobsResult = await query(
      `SELECT j.*,
              CASE WHEN ja.id IS NOT NULL THEN TRUE ELSE FALSE END as has_applied,
              ja.application_status
       FROM jobs j
       LEFT JOIN job_applications ja ON j.id = ja.job_id AND ja.student_id = $1
       ORDER BY j.created_at DESC`,
      [student.id]
    );

    // Add eligibility status to each job (for display purposes only)
    const jobsWithEligibility = [];

    for (const job of jobsResult.rows) {
      const isEligible = await checkJobEligibility(job.id, student);

      // Check if deadline has passed
      const deadlinePassed = job.application_deadline ? new Date(job.application_deadline) < new Date() : false;
      const canApply = job.is_active && !deadlinePassed && !job.has_applied && isEligible;

      // Map database field names to frontend expected names and ensure proper data types
      const mappedJob = {
        ...job,
        // Map field names
        title: job.job_title,
        description: job.job_description,
        location: job.job_location,
        // Ensure JSONB fields are arrays, not strings
        allowed_branches: job.allowed_branches
          ? (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : job.allowed_branches)
          : [],
        target_regions: job.target_regions
          ? (typeof job.target_regions === 'string' ? JSON.parse(job.target_regions) : job.target_regions)
          : [],
        target_colleges: job.target_colleges
          ? (typeof job.target_colleges === 'string' ? JSON.parse(job.target_colleges) : job.target_colleges)
          : [],
        // Add application status flags
        is_eligible: isEligible,
        deadline_passed: deadlinePassed,
        can_apply: canApply,
        eligibility_message: isEligible ? 'You meet all eligibility criteria' : 'You may not meet all eligibility criteria',
      };

      jobsWithEligibility.push(mappedJob);
    }

    res.status(200).json({
      success: true,
      count: jobsWithEligibility.length,
      data: jobsWithEligibility,
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message,
    });
  }
};

// @desc    Apply for a job
// @route   POST /api/students/apply/:jobId
// @access  Private (Student - Approved)
export const applyForJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Get student details
    const studentResult = await query(
      'SELECT * FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const student = studentResult.rows[0];

    // Check if job exists and is active
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
      });
    }

    const job = jobResult.rows[0];

    // Check if deadline has passed
    if (new Date(job.application_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed',
      });
    }

    // Check if already applied
    const existingApplication = await query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND student_id = $2',
      [jobId, student.id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    // Note: Students can apply to any job regardless of eligibility
    // Placement officers will filter and report based on eligibility

    // Create application
    const applicationResult = await query(
      `INSERT INTO job_applications (job_id, student_id)
       VALUES ($1, $2)
       RETURNING *`,
      [jobId, student.id]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: applicationResult.rows[0],
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying for job',
      error: error.message,
    });
  }
};

// @desc    Get student's job applications
// @route   GET /api/students/my-applications
// @access  Private (Student)
export const getMyApplications = async (req, res) => {
  try {
    const studentResult = await query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const studentId = studentResult.rows[0].id;

    const applicationsResult = await query(
      `SELECT ja.id, ja.job_id, ja.student_id, ja.application_status as status,
              ja.applied_date as applied_at, ja.updated_at,
              j.job_title, j.company_name, j.application_deadline, j.application_form_url,
              j.description, j.location, j.salary_package, j.min_cgpa, j.max_backlogs, j.notes
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE ja.student_id = $1
       ORDER BY ja.applied_date DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      count: applicationsResult.rows.length,
      data: applicationsResult.rows,
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message,
    });
  }
};

// @desc    Get student notifications
// @route   GET /api/students/notifications
// @access  Private (Student)
export const getNotifications = async (req, res) => {
  try {
    const notificationsResult = await query(
      `SELECT n.*, nr.is_read, nr.read_at
       FROM notifications n
       JOIN notification_recipients nr ON n.id = nr.notification_id
       WHERE nr.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: notificationsResult.rows.length,
      data: notificationsResult.rows,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/students/notifications/:id/read
// @access  Private (Student)
export const markNotificationRead = async (req, res) => {
  try {
    await query(
      `UPDATE notification_recipients
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE notification_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private (Student)
export const getProfile = async (req, res) => {
  try {
    const profileResult = await query(
      `SELECT s.*, c.college_name, r.region_name, u.email, u.last_login
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: profileResult.rows[0],
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Update student profile
// @route   PUT /api/students/profile
// @access  Private (Student)
export const updateProfile = async (req, res) => {
  try {
    const { name, mobile_number, date_of_birth, cgpa, backlog_count, backlog_details } = req.body;

    // Validation
    if (!name || !mobile_number || !date_of_birth || !cgpa || backlog_count === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate mobile number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits',
      });
    }

    // Validate CGPA
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      return res.status(400).json({
        success: false,
        message: 'CGPA must be between 0 and 10',
      });
    }

    // Validate backlog count
    const backlogNum = parseInt(backlog_count);
    if (isNaN(backlogNum) || backlogNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Backlog count must be a non-negative number',
      });
    }

    // Update profile
    const result = await query(
      `UPDATE students
       SET name = $1, mobile_number = $2, date_of_birth = $3, cgpa = $4,
           backlog_count = $5, backlog_details = $6
       WHERE user_id = $7
       RETURNING *`,
      [name, mobile_number, date_of_birth, cgpa, backlog_count, backlog_details || null, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'PROFILE_UPDATE',
      'Student updated profile',
      'student',
      result.rows[0].id,
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// Helper function to check job eligibility
const checkJobEligibility = async (jobId, student) => {
  try {
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return false;
    }

    const job = jobResult.rows[0];

    // Check CGPA requirement
    if (job.min_cgpa && parseFloat(student.cgpa) < parseFloat(job.min_cgpa)) {
      return false;
    }

    // Check backlog requirement
    if (job.max_backlogs !== null && job.max_backlogs !== undefined) {
      const studentBacklogs = student.backlog_count === 'All cleared' ? 0 : parseInt(student.backlog_count) || 999;
      if (studentBacklogs > parseInt(job.max_backlogs)) {
        return false;
      }
    }

    // Check branch requirement
    if (job.allowed_branches) {
      const allowedBranches = typeof job.allowed_branches === 'string'
        ? JSON.parse(job.allowed_branches)
        : job.allowed_branches;
      if (allowedBranches && allowedBranches.length > 0 && !allowedBranches.includes(student.branch)) {
        return false;
      }
    }

    // Check target type (region/college filtering)
    if (job.target_type === 'region' && job.target_regions) {
      const targetRegions = typeof job.target_regions === 'string'
        ? JSON.parse(job.target_regions)
        : job.target_regions;
      if (targetRegions && targetRegions.length > 0 && !targetRegions.includes(student.region_id)) {
        return false;
      }
    }

    if (job.target_type === 'college' && job.target_colleges) {
      const targetColleges = typeof job.target_colleges === 'string'
        ? JSON.parse(job.target_colleges)
        : job.target_colleges;
      if (targetColleges && targetColleges.length > 0 && !targetColleges.includes(student.college_id)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Check eligibility error:', error);
    return false;
  }
};

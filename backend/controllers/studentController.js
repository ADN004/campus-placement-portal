import { query } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

// @desc    Get student dashboard data
// @route   GET /api/students/dashboard
// @access  Private (Student)
export const getDashboard = async (req, res) => {
  try {
    const studentResult = await query(
      `SELECT s.*, s.student_name as name, c.college_name, r.region_name
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

    // Get eligible jobs count (only active jobs with deadline not passed)
    const eligibleJobsResult = await query(
      `SELECT COUNT(DISTINCT j.id) as count
       FROM jobs j
       WHERE j.is_active = TRUE
       AND (j.application_deadline IS NULL OR j.application_deadline >= CURRENT_DATE)
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
      `SELECT s.*, s.student_name as name, c.college_name, r.region_name
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
      const eligibilityResult = await checkJobEligibility(job.id, student);
      const isEligible = eligibilityResult.isEligible;
      const eligibilityReason = eligibilityResult.reason;

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
        eligibility_reason: eligibilityReason,
        eligibility_message: eligibilityReason,
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
              j.job_description as description, j.job_location as location,
              j.salary_package, j.min_cgpa, j.max_backlogs
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
      `SELECT s.*, s.student_name as name, c.college_name, r.region_name, u.email, u.last_login
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
    const {
      mobile_number,
      height,
      weight,
      complete_address,
      has_driving_license,
      has_pan_card,
      cgpa_sem1,
      cgpa_sem2,
      cgpa_sem3,
      cgpa_sem4,
      cgpa_sem5,
      cgpa_sem6,
      backlogs_sem1,
      backlogs_sem2,
      backlogs_sem3,
      backlogs_sem4,
      backlogs_sem5,
      backlogs_sem6,
      backlog_count,
      backlog_details
    } = req.body;

    // Get current student data first
    const currentStudentResult = await query(
      'SELECT * FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (currentStudentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const currentStudent = currentStudentResult.rows[0];

    // Check CGPA lock for approved students
    const hasCgpaChange = cgpa_sem1 !== undefined || cgpa_sem2 !== undefined ||
      cgpa_sem3 !== undefined || cgpa_sem4 !== undefined ||
      cgpa_sem5 !== undefined || cgpa_sem6 !== undefined;

    if (hasCgpaChange && currentStudent.registration_status === 'approved') {
      // Check for active unlock window
      const unlockResult = await query(
        `SELECT id, unlock_end FROM cgpa_unlock_windows
         WHERE (college_id = $1 OR college_id IS NULL)
         AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
         ORDER BY unlock_end DESC LIMIT 1`,
        [currentStudent.college_id]
      );

      if (unlockResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'CGPA editing is currently locked. Please contact your placement officer.',
        });
      }
    }

    // Check backlog lock for approved students
    const hasBacklogChange = backlogs_sem1 !== undefined || backlogs_sem2 !== undefined ||
      backlogs_sem3 !== undefined || backlogs_sem4 !== undefined ||
      backlogs_sem5 !== undefined || backlogs_sem6 !== undefined ||
      backlog_count !== undefined || backlog_details !== undefined;

    if (hasBacklogChange && currentStudent.registration_status === 'approved') {
      const backlogUnlockResult = await query(
        `SELECT id, unlock_end FROM backlog_unlock_windows
         WHERE (college_id = $1 OR college_id IS NULL)
         AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
         ORDER BY unlock_end DESC LIMIT 1`,
        [currentStudent.college_id]
      );

      if (backlogUnlockResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Backlog editing is currently locked. Please contact your placement officer.',
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Mobile number validation and update
    if (mobile_number !== undefined) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(mobile_number)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be 10 digits',
        });
      }
      updateFields.push(`mobile_number = $${paramCount}`);
      updateValues.push(mobile_number);
      paramCount++;
    }

    // Height validation and update
    if (height !== undefined) {
      const heightNum = parseInt(height);
      if (isNaN(heightNum) || heightNum < 140 || heightNum > 220) {
        return res.status(400).json({
          success: false,
          message: 'Height must be between 140 and 220 cm',
        });
      }
      updateFields.push(`height = $${paramCount}`);
      updateValues.push(heightNum);
      paramCount++;
    }

    // Weight validation and update
    if (weight !== undefined) {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum < 30 || weightNum > 150) {
        return res.status(400).json({
          success: false,
          message: 'Weight must be between 30 and 150 kg',
        });
      }
      updateFields.push(`weight = $${paramCount}`);
      updateValues.push(weightNum);
      paramCount++;
    }

    // Complete address update
    if (complete_address !== undefined) {
      updateFields.push(`complete_address = $${paramCount}`);
      updateValues.push(complete_address);
      paramCount++;
    }

    // Has driving license update
    if (has_driving_license !== undefined) {
      updateFields.push(`has_driving_license = $${paramCount}`);
      updateValues.push(has_driving_license);
      paramCount++;
    }

    // Has PAN card update
    if (has_pan_card !== undefined) {
      updateFields.push(`has_pan_card = $${paramCount}`);
      updateValues.push(has_pan_card);
      paramCount++;
    }

    // Semester CGPA updates with validation
    const semesterCGPAs = {
      cgpa_sem1: currentStudent.cgpa_sem1,
      cgpa_sem2: currentStudent.cgpa_sem2,
      cgpa_sem3: currentStudent.cgpa_sem3,
      cgpa_sem4: currentStudent.cgpa_sem4,
      cgpa_sem5: currentStudent.cgpa_sem5,
      cgpa_sem6: currentStudent.cgpa_sem6,
    };

    let needsRecalculation = false;

    // Validate and update sem1 CGPA
    if (cgpa_sem1 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem1);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 1 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem1 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem1 = cgpaNum;
      needsRecalculation = true;
    }

    // Validate and update sem2 CGPA
    if (cgpa_sem2 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem2);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 2 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem2 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem2 = cgpaNum;
      needsRecalculation = true;
    }

    // Validate and update sem3 CGPA
    if (cgpa_sem3 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem3);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 3 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem3 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem3 = cgpaNum;
      needsRecalculation = true;
    }

    // Validate and update sem4 CGPA
    if (cgpa_sem4 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem4);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 4 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem4 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem4 = cgpaNum;
      needsRecalculation = true;
    }

    // Validate and update sem5 CGPA
    if (cgpa_sem5 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem5);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 5 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem5 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem5 = cgpaNum;
      needsRecalculation = true;
    }

    // Validate and update sem6 CGPA
    if (cgpa_sem6 !== undefined) {
      const cgpaNum = parseFloat(cgpa_sem6);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        return res.status(400).json({
          success: false,
          message: 'Semester 6 CGPA must be between 0 and 10',
        });
      }
      updateFields.push(`cgpa_sem6 = $${paramCount}`);
      updateValues.push(cgpaNum);
      paramCount++;
      semesterCGPAs.cgpa_sem6 = cgpaNum;
      needsRecalculation = true;
    }

    // Auto-recalculate programme_cgpa from all semesters (1-6), excluding zeros and nulls
    // This supports lateral entry students who skip sem1/sem2 by entering 0
    if (needsRecalculation) {
      const validSemesters = [];
      for (let i = 1; i <= 6; i++) {
        const val = semesterCGPAs[`cgpa_sem${i}`];
        if (val !== null && val !== undefined) {
          const num = parseFloat(val);
          if (!isNaN(num) && num > 0) {
            validSemesters.push(num);
          }
        }
      }

      if (validSemesters.length > 0) {
        const programmeCGPA = validSemesters.reduce((a, b) => a + b, 0) / validSemesters.length;
        updateFields.push(`programme_cgpa = $${paramCount}`);
        updateValues.push(parseFloat(programmeCGPA.toFixed(2)));
        paramCount++;
      }
    }

    // Per-semester backlog updates
    const semBacklogFields = { backlogs_sem1, backlogs_sem2, backlogs_sem3, backlogs_sem4, backlogs_sem5, backlogs_sem6 };
    let hasPerSemBacklogs = false;
    for (const [field, value] of Object.entries(semBacklogFields)) {
      if (value !== undefined) {
        const num = parseInt(value);
        if (isNaN(num) || num < 0 || num > 10) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a number between 0 and 10`,
          });
        }
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(num);
        paramCount++;
        hasPerSemBacklogs = true;
      }
    }

    // Auto-compute backlog_count from per-semester values if any were provided
    if (hasPerSemBacklogs) {
      // Get current student data to compute total
      const currentData = await query(
        'SELECT backlogs_sem1, backlogs_sem2, backlogs_sem3, backlogs_sem4, backlogs_sem5, backlogs_sem6 FROM students WHERE user_id = $1',
        [req.user.id]
      );
      const current = currentData.rows[0] || {};
      const totalBacklogs =
        (backlogs_sem1 !== undefined ? parseInt(backlogs_sem1) : (current.backlogs_sem1 || 0)) +
        (backlogs_sem2 !== undefined ? parseInt(backlogs_sem2) : (current.backlogs_sem2 || 0)) +
        (backlogs_sem3 !== undefined ? parseInt(backlogs_sem3) : (current.backlogs_sem3 || 0)) +
        (backlogs_sem4 !== undefined ? parseInt(backlogs_sem4) : (current.backlogs_sem4 || 0)) +
        (backlogs_sem5 !== undefined ? parseInt(backlogs_sem5) : (current.backlogs_sem5 || 0)) +
        (backlogs_sem6 !== undefined ? parseInt(backlogs_sem6) : (current.backlogs_sem6 || 0));
      updateFields.push(`backlog_count = $${paramCount}`);
      updateValues.push(String(totalBacklogs));
      paramCount++;
    } else if (backlog_count !== undefined) {
      // Legacy support: direct backlog_count update
      const backlogNum = parseInt(backlog_count);
      if (isNaN(backlogNum) || backlogNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Backlog count must be a non-negative number',
        });
      }
      updateFields.push(`backlog_count = $${paramCount}`);
      updateValues.push(backlogNum);
      paramCount++;
    }

    // Backlog details update
    if (backlog_details !== undefined) {
      updateFields.push(`backlog_details = $${paramCount}`);
      updateValues.push(backlog_details || null);
      paramCount++;
    }

    // Check if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    // Build and execute update query
    updateValues.push(req.user.id);
    const updateQuery = `
      UPDATE students
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

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

// Normalize branch name for comparison: lowercase, & → and, collapse spaces
const normalizeBranch = (b) => b?.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim() || '';

// Helper function to check job eligibility
const checkJobEligibility = async (jobId, student) => {
  try {
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return { isEligible: false, reason: 'Job not found' };
    }

    const job = jobResult.rows[0];

    // Get student extended profile for advanced validation
    const extendedProfileResult = await query(
      `SELECT * FROM student_extended_profiles WHERE student_id = $1`,
      [student.id]
    );

    const extendedProfile = extendedProfileResult.rows.length > 0 ? extendedProfileResult.rows[0] : {};

    // Get job requirement templates for specific field requirements
    const requirementsResult = await query(
      `SELECT specific_field_requirements FROM job_requirement_templates WHERE job_id = $1`,
      [jobId]
    );

    const requirements = requirementsResult.rows.length > 0 ? requirementsResult.rows[0] : null;

    // Check CGPA requirement
    const studentCgpa = student.programme_cgpa || student.cgpa;
    if (job.min_cgpa && studentCgpa && parseFloat(studentCgpa) < parseFloat(job.min_cgpa)) {
      return { isEligible: false, reason: `Your CGPA (${studentCgpa}) is below the minimum requirement (${job.min_cgpa})` };
    }

    // Check backlog requirement using per-semester data
    if (job.max_backlogs !== null && job.max_backlogs !== undefined) {
      const semBacklogs = [
        student.backlogs_sem1 || 0, student.backlogs_sem2 || 0,
        student.backlogs_sem3 || 0, student.backlogs_sem4 || 0,
        student.backlogs_sem5 || 0, student.backlogs_sem6 || 0,
      ];
      const totalBacklogs = semBacklogs.reduce((a, b) => a + b, 0);

      const allowedSems = Array.isArray(job.allowed_backlog_semesters)
        ? job.allowed_backlog_semesters.map(Number).filter(n => n >= 1 && n <= 6)
        : [];

      if (allowedSems.length > 0) {
        // New: specific semester whitelist
        const nonAllowed = [1, 2, 3, 4, 5, 6].filter(s => !allowedSems.includes(s));
        const backlogsInNonAllowed = nonAllowed.reduce((sum, s) => sum + (semBacklogs[s - 1] || 0), 0);
        if (backlogsInNonAllowed > 0) {
          const badSems = nonAllowed.filter(s => semBacklogs[s - 1] > 0);
          return { isEligible: false, reason: `You have backlogs in Semester(s) ${badSems.join(', ')} which are not permitted. Only Semester(s) ${allowedSems.join(', ')} are allowed` };
        }
        const backlogsInAllowed = allowedSems.reduce((sum, s) => sum + (semBacklogs[s - 1] || 0), 0);
        if (backlogsInAllowed > parseInt(job.max_backlogs)) {
          return { isEligible: false, reason: `You have ${backlogsInAllowed} backlogs in allowed semesters (${allowedSems.join(', ')}), maximum allowed is ${job.max_backlogs}` };
        }
      } else if (job.backlog_max_semester) {
        // Legacy: range-based check
        const withinRange = semBacklogs.slice(0, job.backlog_max_semester).reduce((a, b) => a + b, 0);
        const afterRange = semBacklogs.slice(job.backlog_max_semester).reduce((a, b) => a + b, 0);
        if (afterRange > 0) {
          return { isEligible: false, reason: `You have backlogs in semesters after Sem ${job.backlog_max_semester}. Only backlogs within Sem 1-${job.backlog_max_semester} are allowed` };
        }
        if (withinRange > parseInt(job.max_backlogs)) {
          return { isEligible: false, reason: `You have ${withinRange} backlogs within Sem 1-${job.backlog_max_semester}, maximum allowed is ${job.max_backlogs}` };
        }
      } else {
        if (totalBacklogs > parseInt(job.max_backlogs)) {
          return { isEligible: false, reason: `You have ${totalBacklogs} backlogs, maximum allowed is ${job.max_backlogs}` };
        }
      }
    }

    // Check height requirement
    if (job.min_height !== null && job.min_height !== undefined && student.height) {
      if (parseInt(student.height) < parseInt(job.min_height)) {
        return { isEligible: false, reason: `Your height (${student.height}cm) is below minimum (${job.min_height}cm)` };
      }
    }

    if (job.max_height !== null && job.max_height !== undefined && student.height) {
      if (parseInt(student.height) > parseInt(job.max_height)) {
        return { isEligible: false, reason: `Your height (${student.height}cm) exceeds maximum (${job.max_height}cm)` };
      }
    }

    // Check weight requirement
    if (job.min_weight !== null && job.min_weight !== undefined && student.weight) {
      if (parseFloat(student.weight) < parseFloat(job.min_weight)) {
        return { isEligible: false, reason: `Your weight (${student.weight}kg) is below minimum (${job.min_weight}kg)` };
      }
    }

    if (job.max_weight !== null && job.max_weight !== undefined && student.weight) {
      if (parseFloat(student.weight) > parseFloat(job.max_weight)) {
        return { isEligible: false, reason: `Your weight (${student.weight}kg) exceeds maximum (${job.max_weight}kg)` };
      }
    }

    // Check branch requirement
    if (job.allowed_branches) {
      const allowedBranches = typeof job.allowed_branches === 'string'
        ? JSON.parse(job.allowed_branches)
        : job.allowed_branches;
      if (allowedBranches && allowedBranches.length > 0) {
        const studentBranchNorm = normalizeBranch(student.branch);
        const isMatch = allowedBranches.some(b => normalizeBranch(b) === studentBranchNorm);
        if (!isMatch) {
          return { isEligible: false, reason: `Your branch (${student.branch}) is not in the allowed list: ${allowedBranches.join(', ')}` };
        }
      }
    }

    // Check target type (region/college filtering)
    // Use Number() coercion to avoid type mismatch between JSONB values and PostgreSQL integers
    if ((job.target_type === 'region' || job.target_type === 'specific') && job.target_regions) {
      const targetRegions = (typeof job.target_regions === 'string'
        ? JSON.parse(job.target_regions)
        : job.target_regions).map(Number);
      if (targetRegions.length > 0 && !targetRegions.includes(Number(student.region_id))) {
        // For 'specific' type, also check colleges before declaring ineligible
        if (job.target_type !== 'specific' || !job.target_colleges) {
          return { isEligible: false, reason: 'This job is not available for your region' };
        }
        // For 'specific', fall through to college check
        const targetColleges = (typeof job.target_colleges === 'string'
          ? JSON.parse(job.target_colleges)
          : job.target_colleges).map(Number);
        if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
          return { isEligible: false, reason: 'This job is not available for your college' };
        }
      }
    }

    if (job.target_type === 'college' && job.target_colleges) {
      const targetColleges = (typeof job.target_colleges === 'string'
        ? JSON.parse(job.target_colleges)
        : job.target_colleges).map(Number);
      if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
        return { isEligible: false, reason: 'This job is not available for your college' };
      }
    }

    // For 'specific' type with only colleges (no regions), check colleges
    if (job.target_type === 'specific' && !job.target_regions && job.target_colleges) {
      const targetColleges = (typeof job.target_colleges === 'string'
        ? JSON.parse(job.target_colleges)
        : job.target_colleges).map(Number);
      if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
        return { isEligible: false, reason: 'This job is not available for your college' };
      }
    }

    // Check specific field requirements from job_requirement_templates (Advanced Configuration)
    if (requirements && requirements.specific_field_requirements) {
      const fieldReqs = requirements.specific_field_requirements;

      for (const [fieldName, fieldReq] of Object.entries(fieldReqs)) {
        // Get student value from either student or extendedProfile
        const studentValue = extendedProfile[fieldName] || student[fieldName];

        // Only check minimum requirements if student has filled the field
        // If they haven't filled it yet, they can fill it during application
        if (fieldReq.min && studentValue !== null && studentValue !== undefined && studentValue !== '') {
          const numericValue = parseFloat(studentValue);
          if (!isNaN(numericValue) && numericValue < fieldReq.min) {
            const fieldLabel = fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return {
              isEligible: false,
              reason: `Your ${fieldLabel} (${studentValue}) does not meet the minimum requirement (${fieldReq.min})`
            };
          }
        }
      }
    }

    return { isEligible: true, reason: 'You meet all eligibility criteria' };
  } catch (error) {
    console.error('Check eligibility error:', error);
    return { isEligible: false, reason: 'Error checking eligibility' };
  }
};

// @desc    Get CGPA lock status for student
// @route   GET /api/students/cgpa-lock-status
// @access  Private (Student)
export const getCgpaLockStatus = async (req, res) => {
  try {
    const studentResult = await query(
      'SELECT id, college_id, registration_status FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Pending students can always edit
    if (student.registration_status !== 'approved') {
      return res.json({
        success: true,
        data: { is_locked: false, reason: 'pending_approval' },
      });
    }

    // Check for active unlock window
    const unlockResult = await query(
      `SELECT id, unlock_end, reason FROM cgpa_unlock_windows
       WHERE (college_id = $1 OR college_id IS NULL)
       AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
       ORDER BY unlock_end DESC LIMIT 1`,
      [student.college_id]
    );

    if (unlockResult.rows.length > 0) {
      const window = unlockResult.rows[0];
      return res.json({
        success: true,
        data: {
          is_locked: false,
          unlock_window_id: window.id,
          unlock_end: window.unlock_end,
          unlock_reason: window.reason,
        },
      });
    }

    return res.json({
      success: true,
      data: { is_locked: true },
    });
  } catch (error) {
    console.error('Get CGPA lock status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching CGPA lock status' });
  }
};

// @desc    Get backlog lock status for student
// @route   GET /api/students/backlog-lock-status
// @access  Private (Student)
export const getBacklogLockStatus = async (req, res) => {
  try {
    const studentResult = await query(
      'SELECT id, college_id, registration_status FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Pending students can always edit
    if (student.registration_status !== 'approved') {
      return res.json({
        success: true,
        data: { is_locked: false, reason: 'pending_approval' },
      });
    }

    // Check for active unlock window
    const unlockResult = await query(
      `SELECT id, unlock_end, reason FROM backlog_unlock_windows
       WHERE (college_id = $1 OR college_id IS NULL)
       AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
       ORDER BY unlock_end DESC LIMIT 1`,
      [student.college_id]
    );

    if (unlockResult.rows.length > 0) {
      const window = unlockResult.rows[0];
      return res.json({
        success: true,
        data: {
          is_locked: false,
          unlock_window_id: window.id,
          unlock_end: window.unlock_end,
          unlock_reason: window.reason,
        },
      });
    }

    return res.json({
      success: true,
      data: { is_locked: true },
    });
  } catch (error) {
    console.error('Get backlog lock status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching backlog lock status' });
  }
};

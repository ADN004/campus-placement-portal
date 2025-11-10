import bcrypt from 'bcrypt';
import { query, transaction } from '../config/database.js';
import { sendTokenResponse } from '../middleware/auth.js';
import logActivity from '../middleware/activityLogger.js';

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/PRN and password',
      });
    }

    let user = null;
    let isStudent = false;

    // Check if input is numeric (could be PRN or phone number)
    const isNumeric = /^\d+$/.test(email);

    if (isNumeric) {
      // First, try to find student by PRN
      const studentResult = await query(
        `SELECT u.*, s.registration_status
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.prn = $1`,
        [email]
      );

      if (studentResult.rows.length > 0) {
        // Found a student with this PRN
        isStudent = true;

        // Check if student is approved
        if (studentResult.rows[0].registration_status !== 'approved') {
          return res.status(401).json({
            success: false,
            message: 'Your registration is pending approval from your placement officer',
          });
        }

        user = studentResult.rows[0];
      } else {
        // Not a student PRN, try as phone number for PO/Admin
        const result = await query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      }
    } else {
      // Input is not numeric, search by email
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    }

    // If no user found anywhere
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
      user.id,
    ]);

    // Log activity
    await logActivity(
      user.id,
      'LOGIN',
      `User ${email} logged in`,
      'user',
      user.id,
      { role: user.role },
      req
    );

    // Send token response
    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let userDetails = { ...req.user };

    // Get role-specific details
    if (userRole === 'student') {
      const studentResult = await query(
        `SELECT s.*, c.college_name, r.region_name
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.user_id = $1`,
        [userId]
      );
      if (studentResult.rows.length > 0) {
        userDetails.profile = studentResult.rows[0];
      }
    } else if (userRole === 'placement_officer') {
      const officerResult = await query(
        `SELECT po.*, c.college_name, r.region_name
         FROM placement_officers po
         JOIN colleges c ON po.college_id = c.id
         JOIN regions r ON c.region_id = r.id
         WHERE po.user_id = $1`,
        [userId]
      );
      if (officerResult.rows.length > 0) {
        userDetails.profile = officerResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message,
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    await logActivity(
      req.user.id,
      'LOGOUT',
      `User logged out`,
      'user',
      req.user.id,
      null,
      req
    );

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one number',
      });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    // Get user with password
    const result = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      hashedPassword,
      req.user.id,
    ]);

    // Log activity
    await logActivity(
      req.user.id,
      'PASSWORD_CHANGE',
      'User changed password',
      'user',
      req.user.id,
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};

// @desc    Register student
// @route   POST /api/auth/register-student
// @access  Public
export const registerStudent = async (req, res) => {
  try {
    const {
      prn,
      name,
      branch,
      region_id,
      college_id,
      email,
      mobile_number,
      cgpa,
      date_of_birth,
      backlog_count,
      backlog_details,
    } = req.body;

    // Validation
    if (
      !prn ||
      !name ||
      !branch ||
      !region_id ||
      !college_id ||
      !email ||
      !mobile_number ||
      !cgpa ||
      !date_of_birth ||
      !backlog_count
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate PRN against active ranges
    const prnValidation = await validatePRN(prn);
    if (!prnValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'PRN is not in the valid range for registration',
      });
    }

    // Check if PRN or email already exists
    const existingStudent = await query(
      'SELECT id FROM students WHERE prn = $1 OR email = $2',
      [prn, email]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student with this PRN or email already exists',
      });
    }

    // Create user account and student profile in a transaction
    const result = await transaction(async (client) => {
      // Hash default password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);

      // Create user account
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'student')
         RETURNING id`,
        [email, hashedPassword]
      );

      const userId = userResult.rows[0].id;

      // Create student profile
      const studentResult = await client.query(
        `INSERT INTO students
         (user_id, prn, name, branch, region_id, college_id, email, mobile_number, cgpa, date_of_birth, backlog_count, backlog_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          userId,
          prn,
          name,
          branch,
          region_id,
          college_id,
          email,
          mobile_number,
          cgpa,
          date_of_birth,
          backlog_count,
          backlog_details,
        ]
      );

      return { userId, studentId: studentResult.rows[0].id };
    });

    res.status(201).json({
      success: true,
      message:
        'Registration successful! Your account is pending approval from your placement officer.',
      data: result,
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message,
    });
  }
};

// Helper function to validate PRN
const validatePRN = async (prn) => {
  try {
    // Get all active PRN ranges
    const rangesResult = await query(
      'SELECT range_start, range_end, single_prn FROM prn_ranges WHERE is_active = TRUE'
    );

    const ranges = rangesResult.rows;

    if (ranges.length === 0) {
      return { valid: false, message: 'No active PRN ranges found' };
    }

    // Check single PRNs
    const singlePRNs = ranges.filter((r) => r.single_prn !== null);
    if (singlePRNs.some((r) => r.single_prn === prn)) {
      return { valid: true };
    }

    // Check PRN ranges
    const rangesPRNs = ranges.filter((r) => r.range_start !== null);
    for (const range of rangesPRNs) {
      if (isPRNInRange(prn, range.range_start, range.range_end)) {
        return { valid: true };
      }
    }

    return { valid: false, message: 'PRN not in valid range' };
  } catch (error) {
    console.error('PRN validation error:', error);
    return { valid: false, message: 'Error validating PRN' };
  }
};

// Helper function to check if PRN is in range
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

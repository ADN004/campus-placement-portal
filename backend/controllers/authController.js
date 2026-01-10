/**
 * Authentication Controller
 * Handles user authentication, registration, and email verification
 *
 * @module controllers/authController
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query, transaction } from '../config/database.js';
import { sendTokenResponse } from '../middleware/auth.js';
import logActivity from '../middleware/activityLogger.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';

// ============================================================================
// Constants
// ============================================================================

const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_STUDENT_PASSWORD = '123';
const BCRYPT_SALT_ROUNDS = 10;
const MAX_PHOTO_SIZE_MB = 0.5; // 500KB max photo size
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024; // 524288 bytes (500KB)

// ============================================================================
// Authentication Endpoints
// ============================================================================

/**
 * Login user (Student, Placement Officer, or Super Admin)
 * Students can login with PRN or email
 * Officers and Admins login with email
 *
 * @route   POST /api/auth/login
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {string} req.body.email - Email/PRN for login
 * @param   {string} req.body.password - User password
 * @param   {Object} res - Express response object
 * @returns {Object} Success status and JWT token in cookie
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
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

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log login activity
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
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

/**
 * Get current logged in user details
 * Includes role-specific profile information
 *
 * @route   GET /api/auth/me
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} req.user - Authenticated user from middleware
 * @param   {Object} res - Express response object
 * @returns {Object} User details with profile information
 */
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
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message,
    });
  }
};

/**
 * Logout user and clear authentication cookie
 *
 * @route   GET /api/auth/logout
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {Object} req.user - Authenticated user from middleware
 * @param   {Object} res - Express response object
 * @returns {Object} Success status
 */
export const logout = async (req, res) => {
  try {
    // Log logout activity
    await logActivity(
      req.user.id,
      'LOGOUT',
      'User logged out',
      'user',
      req.user.id,
      null,
      req
    );

    // Clear authentication cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};

// ============================================================================
// Password Management
// ============================================================================

/**
 * Change user password
 * Validates password strength and updates password hash
 *
 * @route   PUT /api/auth/change-password
 * @access  Private
 * @param   {Object} req - Express request object
 * @param   {string} req.body.currentPassword - Current password
 * @param   {string} req.body.newPassword - New password
 * @param   {Object} res - Express response object
 * @returns {Object} Success status
 * @throws  {Error} If password validation fails
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
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

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    // Log password change activity
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
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};

// ============================================================================
// Student Registration
// ============================================================================

/**
 * Register a new student
 * Creates user account and student profile with photo upload to Cloudinary
 *
 * @route   POST /api/auth/register-student
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {Object} req.body - Student registration data
 * @param   {Object} res - Express response object
 * @returns {Object} Registration success status
 * @throws  {Error} If registration fails or PRN validation fails
 */
export const registerStudent = async (req, res) => {
  try {
    const {
      prn,
      student_name,
      branch,
      region_id,
      college_id,
      email,
      mobile_number,
      date_of_birth,
      age,
      gender,
      height,
      weight,
      cgpa_sem1,
      cgpa_sem2,
      cgpa_sem3,
      cgpa_sem4,
      programme_cgpa,
      complete_address,
      has_driving_license,
      has_pan_card,
      has_aadhar_card,
      has_passport,
      photo_base64,
      backlog_count,
      backlog_details,
    } = req.body;

    // Validate required fields
    if (
      !prn ||
      !student_name ||
      !branch ||
      !region_id ||
      !college_id ||
      !email ||
      !mobile_number ||
      !date_of_birth ||
      !age ||
      !gender ||
      !height ||
      !weight ||
      !cgpa_sem1 ||
      !cgpa_sem2 ||
      !cgpa_sem3 ||
      !cgpa_sem4 ||
      !programme_cgpa ||
      !complete_address ||
      has_driving_license === undefined ||
      has_pan_card === undefined ||
      has_aadhar_card === undefined ||
      has_passport === undefined ||
      !photo_base64 ||
      backlog_count === undefined
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

    // Check if PRN already exists
    const existingPRN = await query(
      'SELECT id, email, student_name FROM students WHERE prn = $1',
      [prn]
    );

    if (existingPRN.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A student with PRN ${prn} is already registered. If this is you, please contact your placement officer.`,
      });
    }

    // Check if email already exists - emails are permanently bound to PRNs
    const existingEmail = await query(
      'SELECT id, prn, student_name, email_verified FROM students WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      const existing = existingEmail.rows[0];
      return res.status(400).json({
        success: false,
        message: `This email (${email}) is already registered to PRN ${existing.prn}. Each email can only be used with one PRN. Please use a different email address or contact your placement officer if you believe this is an error.`,
      });
    }

    // Also check users table for orphaned email records
    const existingUser = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already registered in the system but not linked to any student. Please contact support to resolve this issue.',
      });
    }

    // Validate photo size (max 1MB)
    const photoValidation = validateImageSize(photo_base64);
    if (!photoValidation.valid) {
      return res.status(400).json({
        success: false,
        message: photoValidation.message,
      });
    }

    // Upload photo to Cloudinary
    // Organize photos by PRN: students/{prn}/photo_{timestamp}
    let photoUrl = null;
    let photoCloudinaryId = null;

    try {
      const folderPath = `students/${prn}`;
      const publicId = `photo_${Date.now()}`;

      console.log('📤 Uploading student photo to folder:', folderPath);
      console.log('📤 Public ID:', publicId);

      const uploadResult = await uploadImage(
        photo_base64,
        folderPath,
        publicId
      );

      console.log('✅ Student photo upload successful! Full public ID:', uploadResult.publicId);

      photoUrl = uploadResult.url;
      photoCloudinaryId = uploadResult.publicId;
    } catch (uploadError) {
      console.error('❌ Student photo upload error:', uploadError);
      return res.status(400).json({
        success: false,
        message: 'Failed to upload photo. Please try again.',
        error: uploadError.message,
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user account and student profile in a transaction
    try {
      const result = await transaction(async (client) => {
        // Hash default password
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, salt);

        // Create user account
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, role)
           VALUES ($1, $2, 'student')
           RETURNING id`,
          [email, hashedPassword]
        );

        const userId = userResult.rows[0].id;

        // Create student profile with all fields
        const studentResult = await client.query(
          `INSERT INTO students
           (user_id, prn, name, student_name, branch, region_id, college_id, email, mobile_number,
            date_of_birth, age, gender, height, weight,
            cgpa_sem1, cgpa_sem2, cgpa_sem3, cgpa_sem4, cgpa_sem5, cgpa_sem6, programme_cgpa,
            complete_address, has_driving_license, has_pan_card, has_aadhar_card, has_passport,
            photo_url, photo_cloudinary_id, email_verification_token,
            backlog_count, backlog_details)
           VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 0, 0, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
           RETURNING id`,
          [
            userId,
            prn,
            student_name,
            branch,
            region_id,
            college_id,
            email,
            mobile_number,
            date_of_birth,
            age,
            gender,
            height,
            weight,
            cgpa_sem1,
            cgpa_sem2,
            cgpa_sem3,
            cgpa_sem4,
            programme_cgpa,
            complete_address,
            has_driving_license,
            has_pan_card,
            has_aadhar_card,
            has_passport,
            photoUrl,
            photoCloudinaryId,
            emailVerificationToken,
            backlog_count,
            backlog_details || null,
          ]
        );

        const studentId = studentResult.rows[0].id;

        // Auto-save registration data to extended profile
        // Note: extended profile uses height_cm and weight_kg, not height and weight
        await client.query(
          `INSERT INTO student_extended_profiles
           (student_id, height_cm, weight_kg, has_driving_license, has_pan_card, has_aadhar_card, has_passport,
            profile_completion_percentage, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_TIMESTAMP)
           ON CONFLICT (student_id) DO UPDATE SET
           height_cm = EXCLUDED.height_cm,
           weight_kg = EXCLUDED.weight_kg,
           has_driving_license = EXCLUDED.has_driving_license,
           has_pan_card = EXCLUDED.has_pan_card,
           has_aadhar_card = EXCLUDED.has_aadhar_card,
           has_passport = EXCLUDED.has_passport,
           last_updated = CURRENT_TIMESTAMP`,
          [
            studentId,
            height,
            weight,
            has_driving_license,
            has_pan_card,
            has_aadhar_card,
            has_passport,
          ]
        );

        return { userId, studentId };
      });

      res.status(201).json({
        success: true,
        message:
          'Registration successful! Your account is pending approval from your placement officer. You will receive an email verification link after approval.',
        data: result,
      });
    } catch (transactionError) {
      // Clean up uploaded image if database transaction fails
      if (photoCloudinaryId) {
        try {
          await deleteImage(photoCloudinaryId);
        } catch (deleteError) {
          // Log error but don't throw
        }
      }
      throw transactionError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message,
    });
  }
};

// ============================================================================
// Email Verification
// ============================================================================

/**
 * Verify student email using verification token
 *
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {string} req.params.token - Email verification token
 * @param   {Object} res - Express response object
 * @returns {Object} Verification success status
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    // Find student with this token
    const studentResult = await query(
      'SELECT id, email, email_verified, student_name, last_verification_email_sent_at FROM students WHERE email_verification_token = $1',
      [token]
    );

    if (studentResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. The link may have been used already or has expired after 24 hours.',
        code: 'TOKEN_INVALID',
      });
    }

    const student = studentResult.rows[0];

    // Check if already verified
    if (student.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'This email address has already been verified. You can login to your account.',
        code: 'ALREADY_VERIFIED',
        data: {
          email: student.email,
        },
      });
    }

    // Check if token has expired (24 hours)
    const TOKEN_EXPIRY_HOURS = 24;
    if (student.last_verification_email_sent_at) {
      const sentAt = new Date(student.last_verification_email_sent_at);
      const now = new Date();
      const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

      if (hoursSinceSent > TOKEN_EXPIRY_HOURS) {
        return res.status(400).json({
          success: false,
          message: `Verification link has expired. Links are valid for ${TOKEN_EXPIRY_HOURS} hours. Please request a new verification email.`,
          code: 'TOKEN_EXPIRED',
          data: {
            email: student.email,
          },
        });
      }
    }

    // Update student as verified
    await query(
      `UPDATE students
       SET email_verified = TRUE,
           email_verified_at = CURRENT_TIMESTAMP,
           email_verification_token = NULL
       WHERE id = $1`,
      [student.id]
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      data: {
        email: student.email,
        name: student.student_name,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: error.message,
    });
  }
};

/**
 * Resend verification email to student
 * Only works for approved students who haven't verified yet
 *
 * @route   POST /api/auth/resend-verification
 * @access  Public
 * @param   {Object} req - Express request object
 * @param   {string} req.body.email - Student email address
 * @param   {Object} res - Express response object
 * @returns {Object} Success status
 */
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find student
    const studentResult = await query(
      `SELECT s.id, s.email, s.student_name, s.email_verified, s.registration_status, s.email_verification_token
       FROM students s
       WHERE s.email = $1`,
      [email]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    const student = studentResult.rows[0];

    // Check if already verified
    if (student.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Check if approved
    if (student.registration_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your account must be approved by placement officer before email verification',
      });
    }

    // Generate new verification token
    const newVerificationToken = crypto.randomBytes(32).toString('hex');

    // Update student with new token and timestamp
    await query(
      `UPDATE students
       SET email_verification_token = $1,
           last_verification_email_sent_at = CURRENT_TIMESTAMP,
           verification_email_sent_count = verification_email_sent_count + 1
       WHERE id = $2`,
      [newVerificationToken, student.id]
    );

    // Send verification email
    const { sendVerificationEmail } = await import('../config/emailService.js');

    try {
      await sendVerificationEmail(
        student.email,
        newVerificationToken,
        student.student_name
      );

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully! Please check your inbox.',
      });
    } catch (emailError) {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.',
        error: emailError.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resending verification email',
      error: error.message,
    });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate base64 image size
 * Base64 encoded images are ~33% larger than original binary
 *
 * @param   {string} base64String - Base64 encoded image string (with or without data URI prefix)
 * @returns {Object} Validation result with valid flag, message, and size in bytes
 */
const validateImageSize = (base64String) => {
  try {
    // Remove data URI prefix if present (data:image/png;base64,)
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    // Calculate actual file size from base64
    // Formula: size = (base64_length * 3) / 4
    // Subtract padding characters (=) from length
    const paddingCount = (base64Data.match(/=/g) || []).length;
    const actualSizeBytes = ((base64Data.length * 3) / 4) - paddingCount;

    const sizeMB = (actualSizeBytes / (1024 * 1024)).toFixed(2);

    if (actualSizeBytes > MAX_PHOTO_SIZE_BYTES) {
      return {
        valid: false,
        message: `Image size (${sizeMB} MB) exceeds maximum allowed size of ${MAX_PHOTO_SIZE_MB} MB`,
        sizeBytes: actualSizeBytes,
      };
    }

    return {
      valid: true,
      message: `Image size OK (${sizeMB} MB)`,
      sizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Invalid image format',
      sizeBytes: 0,
    };
  }
};

/**
 * Validate password strength requirements
 *
 * @param   {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and message
 */
const validatePasswordStrength = (password) => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  return { valid: true };
};

/**
 * Validate PRN against active PRN ranges
 *
 * @param   {string} prn - PRN to validate
 * @returns {Object} Validation result with valid flag and optional message
 */
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
    return { valid: false, message: 'Error validating PRN' };
  }
};

/**
 * Check if PRN falls within a given range
 * Handles both numeric and string comparisons
 *
 * @param   {string} prn - PRN to check
 * @param   {string} start - Range start value
 * @param   {string} end - Range end value
 * @returns {boolean} True if PRN is in range
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

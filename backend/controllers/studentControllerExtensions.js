import { query } from '../config/database.js';
import { sendVerificationEmail } from '../config/emailService.js';
import logActivity from '../middleware/activityLogger.js';
import crypto from 'crypto';

// ========================================
// EMAIL VERIFICATION RESEND
// ========================================

// @desc    Resend verification email
// @route   POST /api/students/resend-verification
// @access  Private (Student)
export const resendVerificationEmail = async (req, res) => {
  try {
    // Get student details
    const studentResult = await query(
      `SELECT s.*, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
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

    // Check if already verified
    if (student.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Your email is already verified',
      });
    }

    // Check rate limiting - max 5 emails per day
    if (student.verification_email_sent_count >= 5) {
      const lastSentDate = student.last_verification_email_sent_at
        ? new Date(student.last_verification_email_sent_at)
        : null;

      if (lastSentDate) {
        const today = new Date();
        const isSameDay =
          lastSentDate.getDate() === today.getDate() &&
          lastSentDate.getMonth() === today.getMonth() &&
          lastSentDate.getFullYear() === today.getFullYear();

        if (isSameDay) {
          return res.status(429).json({
            success: false,
            message: 'Maximum verification emails sent for today. Please try again tomorrow.',
          });
        }
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update student record
    await query(
      `UPDATE students
       SET email_verification_token = $1,
           verification_email_sent_count = verification_email_sent_count + 1,
           last_verification_email_sent_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [verificationToken, student.id]
    );

    // Send verification email
    try {
      await sendVerificationEmail(student.email, verificationToken, student.student_name);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Error sending verification email. Please try again later.',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'RESEND_VERIFICATION_EMAIL',
      `Resent verification email`,
      'student',
      student.id,
      { email: student.email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending verification email',
      error: error.message,
    });
  }
};

// @desc    Check verification status
// @route   GET /api/students/verification-status
// @access  Private (Student)
export const getVerificationStatus = async (req, res) => {
  try {
    const studentResult = await query(
      `SELECT email_verified, email_verified_at, verification_email_sent_count, last_verification_email_sent_at
       FROM students
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const student = studentResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        email_verified: student.email_verified,
        email_verified_at: student.email_verified_at,
        verification_email_sent_count: student.verification_email_sent_count || 0,
        last_verification_email_sent_at: student.last_verification_email_sent_at,
        can_resend: student.verification_email_sent_count < 5,
      },
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verification status',
      error: error.message,
    });
  }
};

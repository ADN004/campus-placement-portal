import crypto from 'crypto';
import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import { sendVerificationEmail } from '../config/emailService.js';
import { isDisposableEmail, DISPOSABLE_EMAIL_MESSAGE } from '../utils/emailPolicy.js';

/**
 * Student Email Correction
 *
 * Fixes the "registered with a typo'd / dead email" problem: verification
 * mails bounce and the student can never be reached. Two entry points share
 * one core:
 *
 *   PUT /api/auth/student-email                    (student fixes their own)
 *   PUT /api/placement-officer/students/:id/email  (PO, own college only)
 *   PUT /api/super-admin/students/:id/email        (super admin, any student)
 *
 * Changing the email always resets verification: a new token is generated
 * and (for approved students) a fresh verification email is sent to the new
 * address. Pending students just get the address corrected — the approval
 * flow sends their verification email as usual.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Validate + apply an email change for a student row.
 * Returns { status, body } for the route handlers to send.
 */
const changeStudentEmail = async (student, rawEmail, req, actorLabel) => {
  const newEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
    return { status: 400, body: { success: false, message: 'Please provide a valid email address' } };
  }

  if (isDisposableEmail(newEmail)) {
    return { status: 400, body: { success: false, message: DISPOSABLE_EMAIL_MESSAGE } };
  }

  if (newEmail === (student.email || '').toLowerCase()) {
    return {
      status: 400,
      body: { success: false, message: 'This is already the registered email address' },
    };
  }

  // Emails are unique across all accounts (students, officers, admins)
  const emailTaken = await query(
    `SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2
     UNION
     SELECT user_id FROM students WHERE LOWER(email) = $1 AND user_id != $2`,
    [newEmail, student.user_id]
  );
  if (emailTaken.rows.length > 0) {
    return {
      status: 400,
      body: { success: false, message: 'This email is already registered to another account' },
    };
  }

  // Throttle: at most one verification email per minute per student
  if (
    student.last_verification_email_sent_at &&
    Date.now() - new Date(student.last_verification_email_sent_at).getTime() < RESEND_COOLDOWN_MS
  ) {
    return {
      status: 429,
      body: {
        success: false,
        message: 'Please wait a minute before changing the email again',
      },
    };
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const isApproved = student.registration_status === 'approved';

  await transaction(async (client) => {
    await client.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, student.user_id]);
    await client.query(
      `UPDATE students
       SET email = $1,
           email_verified = FALSE,
           email_verified_at = NULL,
           email_verification_token = $2,
           last_verification_email_sent_at = ${isApproved ? 'CURRENT_TIMESTAMP' : 'last_verification_email_sent_at'},
           verification_email_sent_count = verification_email_sent_count + ${isApproved ? 1 : 0}
       WHERE id = $3`,
      [newEmail, newToken, student.id]
    );
  });

  // Send outside the transaction: the address change must survive even if
  // SMTP hiccups — the student can use "resend" afterwards.
  let emailSent = false;
  if (isApproved) {
    try {
      await sendVerificationEmail(newEmail, newToken, student.student_name);
      emailSent = true;
    } catch (emailError) {
      console.error('Verification email send failed after email change:', emailError.message);
    }
  }

  await logActivity(
    req.user.id,
    'UPDATE_STUDENT_EMAIL',
    `${actorLabel} changed email for PRN ${student.prn}: ${student.email} → ${newEmail}`,
    'student',
    student.id,
    req,
    { prn: student.prn, old_email: student.email, new_email: newEmail, email_sent: emailSent }
  );

  return {
    status: 200,
    body: {
      success: true,
      message: emailSent
        ? `Email updated — a fresh verification link was sent to ${newEmail}`
        : isApproved
          ? `Email updated to ${newEmail}, but the verification email could not be sent — use "Resend verification" in a minute`
          : `Email updated to ${newEmail} — the verification link will arrive after placement officer approval`,
      data: { email: newEmail, verification_email_sent: emailSent },
    },
  };
};

const STUDENT_FIELDS = `s.id, s.user_id, s.prn, s.student_name, s.email, s.email_verified,
                        s.registration_status, s.last_verification_email_sent_at, s.college_id`;

// @desc    Student corrects their own email (re-verification required)
// @route   PUT /api/auth/student-email
// @access  Private (Student)
export const updateOwnEmail = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can use this' });
    }

    const studentResult = await query(
      `SELECT ${STUDENT_FIELDS} FROM students s WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const result = await changeStudentEmail(studentResult.rows[0], req.body.email, req, 'Student');
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Update own email error:', error);
    res.status(500).json({ success: false, message: 'Error updating email' });
  }
};

// @desc    Staff (PO of the student's college, or super admin) corrects a
//          student's email and triggers re-verification
// @route   PUT /api/placement-officer/students/:id/email
// @route   PUT /api/super-admin/students/:id/email
// @access  Private (Placement Officer — own college only / Super Admin)
export const updateStudentEmailByStaff = async (req, res) => {
  try {
    const studentResult = await query(
      `SELECT ${STUDENT_FIELDS} FROM students s WHERE s.id = $1`,
      [req.params.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = studentResult.rows[0];

    if (req.user.role === 'placement_officer') {
      const officerResult = await query(
        'SELECT college_id FROM placement_officers WHERE user_id = $1 AND is_active = TRUE',
        [req.user.id]
      );
      if (
        officerResult.rows.length === 0 ||
        officerResult.rows[0].college_id !== student.college_id
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only update emails for students of your own college',
        });
      }
    }

    const actorLabel = req.user.role === 'super_admin' ? 'Super admin' : 'Placement officer';
    const result = await changeStudentEmail(student, req.body.email, req, actorLabel);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Staff update student email error:', error);
    res.status(500).json({ success: false, message: 'Error updating email' });
  }
};

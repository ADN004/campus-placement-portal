/**
 * Email Service Module
 *
 * This module handles all email functionality for the State Placement Cell.
 * Uses Nodemailer with Gmail SMTP or custom SMTP service.
 *
 * Features:
 * - Email verification for new students
 * - Password reset emails
 * - Generic notification emails
 * - HTML email templates with branding
 *
 * @module config/emailService
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// TRANSPORTER CONFIGURATION
// ============================================

/**
 * Nodemailer Transporter
 *
 * Configured with Gmail or custom SMTP service.
 * For Gmail: Use App Password, not regular password.
 * Enable 2FA and generate App Password at:
 * https://support.google.com/accounts/answer/185833
 */
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,  // Gmail App Password
  },
});

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Send Email Verification Link
 *
 * Sends a verification email to newly registered/approved students.
 * The verification link expires in 24 hours.
 *
 * @async
 * @function sendVerificationEmail
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Unique verification token
 * @param {string} studentName - Student's name for personalization
 * @returns {Promise<Object>} Email send result
 * @returns {boolean} return.success - Whether email was sent successfully
 * @returns {string} return.messageId - Email message ID from mail server
 * @throws {Error} If email fails to send
 *
 * @example
 * await sendVerificationEmail(
 *   'student@example.com',
 *   'abc123def456',
 *   'John Doe'
 * );
 */
export const sendVerificationEmail = async (email, verificationToken, studentName) => {
  // Construct verification URL using frontend URL (support both local and production)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - State Placement Cell',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            padding: 30px 20px;
            text-align: center;
            border-radius: 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #ffffff !important;
          }
          .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
          }
          .content h2 {
            color: #1a1a1a;
            font-size: 20px;
            margin-bottom: 20px;
          }
          .content p {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 16px;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
          }
          .button:hover {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            transform: translateY(-2px);
          }
          .link-box {
            word-break: break-all;
            background-color: #f7fafc;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            color: #4a5568;
            margin: 20px 0;
          }
          .note {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .note strong {
            color: #856404;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
            color: #6c757d;
            border-top: 1px solid #e0e0e0;
          }
          @media only screen and (max-width: 600px) {
            .content {
              padding: 25px 20px;
            }
            .button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>State Placement Cell</h1>
          </div>
          <div class="content">
            <h2>Hello ${studentName},</h2>
            <p>Welcome to the State Placement Cell! Your account has been approved by your placement officer.</p>
            <p>Please verify your email address to complete your registration and access all features.</p>
            <div class="button-container">
              <a href="${verificationUrl}" class="button" style="color: #ffffff !important;">Verify Email Address</a>
            </div>
            <p style="font-size: 14px; color: #718096;">Or copy and paste this link in your browser:</p>
            <div class="link-box">${verificationUrl}</div>
            <div class="note">
              <strong>Note:</strong> This link will expire in 24 hours for security reasons.
            </div>
            <p style="font-size: 14px; color: #718096;">If you didn't create this account, please ignore this email and the account will remain inactive.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; 2025 State Placement Cell. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Send Password Reset Email
 *
 * Sends a password reset link to users who requested it.
 * The reset link expires in 1 hour for security.
 *
 * @async
 * @function sendPasswordResetEmail
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Unique password reset token
 * @param {string} userName - User's name for personalization
 * @returns {Promise<Object>} Email send result
 * @returns {boolean} return.success - Whether email was sent successfully
 * @returns {string} return.messageId - Email message ID from mail server
 * @throws {Error} If email fails to send
 *
 * @example
 * await sendPasswordResetEmail(
 *   'user@example.com',
 *   'reset_token_xyz',
 *   'Jane Smith'
 * );
 */
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  // Construct password reset URL using frontend URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - State Placement Cell',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We received a request to reset your password for your State Placement Cell account.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background-color: #e9e9e9; padding: 10px; border-radius: 3px;">${resetUrl}</p>
            <p><strong>Note:</strong> This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 State Placement Cell. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// ============================================
// NOTIFICATION EMAILS
// ============================================

/**
 * Send Generic Notification Email
 *
 * Sends a customizable notification email for various purposes.
 * Used for announcements, updates, and custom notifications.
 *
 * @async
 * @function sendNotificationEmail
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} message - Email message content (can include HTML)
 * @returns {Promise<Object>} Email send result
 * @returns {boolean} return.success - Whether email was sent successfully
 * @returns {string} return.messageId - Email message ID from mail server
 * @throws {Error} If email fails to send
 *
 * @example
 * await sendNotificationEmail(
 *   'student@example.com',
 *   'Important Placement Drive Update',
 *   '<p>The placement drive scheduled for tomorrow has been moved to next week.</p>'
 * );
 */
export const sendNotificationEmail = async (email, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>State Placement Cell</h1>
          </div>
          <div class="content">
            ${message}
          </div>
          <div class="footer">
            <p>&copy; 2025 State Placement Cell. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send notification email: ${error.message}`);
  }
};

// ============================================
// PLACEMENT DRIVE & RESULT EMAILS
// ============================================

/**
 * Send Drive Schedule Notification Email
 *
 * Notifies students about upcoming placement drive with date, time, and location.
 *
 * @async
 * @function sendDriveScheduleEmail
 * @param {string} email - Student email address
 * @param {string} studentName - Student's name
 * @param {Object} jobDetails - Job information
 * @param {string} jobDetails.job_title - Job title
 * @param {string} jobDetails.company_name - Company name
 * @param {Object} driveDetails - Drive schedule information
 * @param {string} driveDetails.drive_date - Date of drive
 * @param {string} driveDetails.drive_time - Time of drive
 * @param {string} driveDetails.drive_location - Location of drive
 * @param {string} driveDetails.additional_instructions - Additional instructions
 * @returns {Promise<Object>} Email send result
 */
export const sendDriveScheduleEmail = async (email, studentName, jobDetails, driveDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Placement Drive Scheduled - ${jobDetails.company_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff !important;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #ffffff !important;
          }
          .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
          }
          .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .info-box h3 {
            margin: 0 0 15px 0;
            color: #1e40af;
            font-size: 18px;
          }
          .detail-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #374151;
            width: 140px;
            flex-shrink: 0;
          }
          .detail-value {
            color: #1f2937;
            flex: 1;
          }
          .note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
            color: #6c757d;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Placement Drive Scheduled</h1>
          </div>
          <div class="content">
            <h2>Hello ${studentName},</h2>
            <p>Great news! A placement drive has been scheduled for the following opportunity:</p>

            <div class="info-box">
              <h3>${jobDetails.company_name}</h3>
              <div class="detail-row">
                <div class="detail-label">Position:</div>
                <div class="detail-value">${jobDetails.job_title}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Date:</div>
                <div class="detail-value">${new Date(driveDetails.drive_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Time:</div>
                <div class="detail-value">${driveDetails.drive_time}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${driveDetails.drive_location}</div>
              </div>
            </div>

            ${driveDetails.additional_instructions ? `
              <div class="note">
                <strong>Important Instructions:</strong>
                <p style="margin: 10px 0 0 0;">${driveDetails.additional_instructions}</p>
              </div>
            ` : ''}

            <p><strong>Please make sure to:</strong></p>
            <ul>
              <li>Arrive at least 15 minutes before the scheduled time</li>
              <li>Bring multiple copies of your resume</li>
              <li>Carry your ID card and necessary documents</li>
              <li>Dress professionally</li>
            </ul>

            <p>Best of luck for the placement drive!</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; 2025 State Placement Cell. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Drive schedule email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send drive schedule email: ${error.message}`);
  }
};

/**
 * Send Selection Notification Email
 *
 * Congratulates students on being selected for a job position.
 *
 * @async
 * @function sendSelectionEmail
 * @param {string} email - Student email address
 * @param {string} studentName - Student's name
 * @param {Object} jobDetails - Job information
 * @param {Object} placementDetails - Placement details
 * @returns {Promise<Object>} Email send result
 */
export const sendSelectionEmail = async (email, studentName, jobDetails, placementDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Congratulations! Selected at ${jobDetails.company_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff !important;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            color: #ffffff !important;
          }
          .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
          }
          .success-box {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .detail-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #374151;
            width: 140px;
            flex-shrink: 0;
          }
          .detail-value {
            color: #1f2937;
            flex: 1;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
            color: #6c757d;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
          </div>
          <div class="content">
            <h2>Dear ${studentName},</h2>
            <p style="font-size: 18px; color: #059669; font-weight: 600;">
              We are delighted to inform you that you have been selected!
            </p>

            <div class="success-box">
              <h3 style="margin: 0 0 15px 0; color: #047857;">Placement Details</h3>
              <div class="detail-row">
                <div class="detail-label">Company:</div>
                <div class="detail-value"><strong>${jobDetails.company_name}</strong></div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Position:</div>
                <div class="detail-value">${jobDetails.job_title}</div>
              </div>
              ${placementDetails.placement_package ? `
                <div class="detail-row">
                  <div class="detail-label">Package:</div>
                  <div class="detail-value">${placementDetails.placement_package} LPA</div>
                </div>
              ` : ''}
              ${placementDetails.placement_location ? `
                <div class="detail-row">
                  <div class="detail-label">Location:</div>
                  <div class="detail-value">${placementDetails.placement_location}</div>
                </div>
              ` : ''}
              ${placementDetails.joining_date ? `
                <div class="detail-row">
                  <div class="detail-label">Joining Date:</div>
                  <div class="detail-value">${new Date(placementDetails.joining_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              ` : ''}
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>The placement officer will contact you with further details</li>
              <li>Prepare all required documents for onboarding</li>
              <li>Check your portal regularly for updates</li>
            </ul>

            <p>Congratulations once again on this achievement! We wish you all the best for your future endeavors.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; 2025 State Placement Cell. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Selection email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send selection email: ${error.message}`);
  }
};

/**
 * Send Rejection Notification Email
 *
 * Politely informs students that they were not selected.
 *
 * @async
 * @function sendRejectionEmail
 * @param {string} email - Student email address
 * @param {string} studentName - Student's name
 * @param {Object} jobDetails - Job information
 * @returns {Promise<Object>} Email send result
 */
export const sendRejectionEmail = async (email, studentName, jobDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Application Update - ${jobDetails.company_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: #ffffff !important;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #ffffff !important;
          }
          .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
          }
          .info-box {
            background-color: #f3f4f6;
            border-left: 4px solid #6366f1;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
            color: #6c757d;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2>Dear ${studentName},</h2>
            <p>Thank you for your interest in the ${jobDetails.job_title} position at ${jobDetails.company_name}.</p>

            <p>After careful consideration, we regret to inform you that you have not been selected for this particular opportunity at this time.</p>

            <div class="info-box">
              <p style="margin: 0;"><strong>Please note:</strong> This decision does not reflect on your abilities or potential. The selection process was highly competitive, and many qualified candidates applied.</p>
            </div>

            <p>We encourage you to:</p>
            <ul>
              <li>Continue applying for upcoming opportunities</li>
              <li>Work on enhancing your skills and resume</li>
              <li>Seek feedback from your placement officer</li>
              <li>Stay positive and keep preparing for future drives</li>
            </ul>

            <p>We wish you all the best in your future endeavors and hope you find the right opportunity soon.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; 2025 State Placement Cell. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Rejection email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send rejection email: ${error.message}`);
  }
};

/**
 * Send Shortlist Notification Email
 *
 * Informs students that they have been shortlisted for the next round.
 *
 * @async
 * @function sendShortlistEmail
 * @param {string} email - Student email address
 * @param {string} studentName - Student's name
 * @param {Object} jobDetails - Job information
 * @returns {Promise<Object>} Email send result
 */
export const sendShortlistEmail = async (email, studentName, jobDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Shortlisted for ${jobDetails.company_name} - ${jobDetails.job_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: #ffffff !important;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #ffffff !important;
          }
          .content {
            background-color: #ffffff;
            padding: 40px 30px;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
          }
          .success-box {
            background-color: #f5f3ff;
            border-left: 4px solid #8b5cf6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .footer {
            background-color: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            font-size: 13px;
            color: #6c757d;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Shortlisted!</h1>
          </div>
          <div class="content">
            <h2>Dear ${studentName},</h2>
            <p style="font-size: 18px; color: #7c3aed; font-weight: 600;">
              Congratulations! You have been shortlisted for the next round.
            </p>

            <div class="success-box">
              <p style="margin: 0 0 10px 0;"><strong>Position:</strong> ${jobDetails.job_title}</p>
              <p style="margin: 0;"><strong>Company:</strong> ${jobDetails.company_name}</p>
            </div>

            <p>Your application has progressed to the shortlisting stage. This is an excellent achievement!</p>

            <p><strong>What to expect next:</strong></p>
            <ul>
              <li>You will be notified about the placement drive schedule</li>
              <li>Prepare well for the interview rounds</li>
              <li>Review your resume and technical skills</li>
              <li>Check your portal regularly for updates</li>
            </ul>

            <p>Keep up the great work and best of luck for the upcoming rounds!</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">&copy; 2025 State Placement Cell. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Shortlist email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Failed to send shortlist email: ${error.message}`);
  }
};

// ============================================
// TRANSPORTER VERIFICATION
// ============================================

/**
 * Verify Email Configuration
 *
 * Tests the email transporter configuration on startup.
 * Logs success or error message.
 *
 * @async
 * @function verifyEmailConfiguration
 * @returns {Promise<boolean>} Whether configuration is valid
 */
export const verifyEmailConfiguration = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error.message);
    return false;
  }
};

// ============================================
// EXPORTS
// ============================================

export default transporter;

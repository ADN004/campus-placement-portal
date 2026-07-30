/**
 * Email Service Module
 *
 * Handles all transactional email for the State Placement Cell.
 * Uses Nodemailer with Gmail SMTP (or custom SMTP) in production; captures to
 * logs everywhere else.
 *
 * All messages share one cross-client-safe HTML shell (see renderEmail):
 *  - table-based layout with inline styles (Gmail / Outlook / Apple Mail safe)
 *  - solid-colour header with a CSS gradient as progressive enhancement
 *    (Outlook shows the solid colour, so the white title is never invisible)
 *  - a 🎓 emblem + wordmark header, or an image if EMAIL_LOGO_URL is set
 *  - a preheader line (the grey inbox preview text)
 *  - a "bulletproof" button and a consistent, dynamic-year footer
 *
 * Each email is split into a pure build*(...) => { subject, html } function
 * (renderable/testable without sending) and a thin send*(...) wrapper.
 *
 * @module config/emailService
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Banner / logo image files live here for CID embedding — drop e.g.
// welcome-header.png into backend/assets/email/ and it is used automatically.
const ASSET_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'email');

// ============================================
// TRANSPORTER CONFIGURATION
// ============================================

/**
 * Environment-aware email transport (fail-safe by design).
 *
 * Real SMTP delivery requires BOTH APP_ENV=production AND EMAIL_MODE=smtp.
 * In any other environment emails are composed normally but captured to the
 * application logs via nodemailer's jsonTransport instead of being delivered,
 * so a staging deploy can NEVER email a real student even with prod creds.
 */
const APP_ENV = process.env.APP_ENV || 'production';
const EMAIL_MODE = process.env.EMAIL_MODE || (APP_ENV === 'production' ? 'smtp' : 'log');
const isRealDeliveryEnabled = APP_ENV === 'production' && EMAIL_MODE === 'smtp';

const smtpTransporter = nodemailer.createTransport(
  isRealDeliveryEnabled
    ? {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // Gmail App Password
        },
      }
    : { jsonTransport: true } // composes the full message, delivers nowhere
);

const transporter = isRealDeliveryEnabled
  ? smtpTransporter
  : {
      sendMail: async (mailOptions) => {
        const info = await smtpTransporter.sendMail(mailOptions);
        console.log(
          `📧 [EMAIL SAFE MODE — APP_ENV=${APP_ENV}] Captured (NOT delivered) | to: ${mailOptions.to} | subject: ${mailOptions.subject}`
        );
        return info;
      },
      verify: () => smtpTransporter.verify(),
    };

if (!isRealDeliveryEnabled) {
  console.log(
    `📧 Email safe mode active (APP_ENV=${APP_ENV}, EMAIL_MODE=${EMAIL_MODE}) — emails are logged, never delivered`
  );
}

// ============================================
// SHARED, CROSS-CLIENT-SAFE TEMPLATE
// ============================================

const BRAND = {
  name: 'State Placement Cell',
  sub: 'Kerala Polytechnics',
  // Drop-in for a real logo later: set EMAIL_LOGO_URL to a hosted PNG/JPG and
  // it replaces the 🎓 emblem automatically.
  logoUrl: process.env.EMAIL_LOGO_URL || '',
  // FRONTEND_URL doubles as the "visit the portal" link target.
  siteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

const FONT = "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Accent palettes per message type (header + button gradient). */
const ACCENTS = {
  indigo: { from: '#4f46e5', to: '#4338ca', tintBg: '#eef2ff', tintBorder: '#6366f1' },
  red: { from: '#dc2626', to: '#b91c1c', tintBg: '#fef2f2', tintBorder: '#ef4444' },
  amber: { from: '#d97706', to: '#b45309', tintBg: '#fffbeb', tintBorder: '#f59e0b' },
  blue: { from: '#2563eb', to: '#1d4ed8', tintBg: '#eff6ff', tintBorder: '#3b82f6' },
  green: { from: '#059669', to: '#047857', tintBg: '#ecfdf5', tintBorder: '#10b981' },
  violet: { from: '#7c3aed', to: '#6d28d9', tintBg: '#f5f3ff', tintBorder: '#8b5cf6' },
  slate: { from: '#6366f1', to: '#4f46e5', tintBg: '#f8fafc', tintBorder: '#94a3b8' },
};

/** A bulletproof, gradient-with-solid-fallback button. */
function emailButton(url, label, accent) {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
          <tr>
            <td align="center" bgcolor="${accent.from}" style="border-radius:8px;background-color:${accent.from};background-image:linear-gradient(135deg,${accent.from} 0%,${accent.to} 100%);">
              <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
            </td>
          </tr>
        </table>`;
}

/** An accent-tinted callout box (notes, warnings, highlights). */
function emailCallout(html, accent) {
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
          <tr>
            <td style="background-color:${accent.tintBg};border-left:4px solid ${accent.tintBorder};border-radius:6px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:1.6;color:#334155;">${html}</td>
          </tr>
        </table>`;
}

/** A table-based (Outlook-safe) label/value detail list. Skips empty values. */
function emailDetailList(rows) {
  const body = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-family:${FONT};font-size:14px;font-weight:600;color:#64748b;width:150px;vertical-align:top;">${label}</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-family:${FONT};font-size:14px;color:#0f172a;">${value}</td>
            </tr>`
    )
    .join('');
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">${body}
        </table>`;
}

/** Turn an array of strings into a clean checklist. */
function emailList(items) {
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0;">
          ${items
            .map(
              (item) => `<tr>
            <td width="22" valign="top" style="font-family:${FONT};font-size:15px;color:#64748b;line-height:1.6;">•</td>
            <td style="font-family:${FONT};font-size:15px;color:#334155;line-height:1.6;padding-bottom:6px;">${item}</td>
          </tr>`
            )
            .join('')}
        </table>`;
}

/**
 * If a banner image file exists in ASSET_DIR, return a nodemailer attachment
 * descriptor for CID embedding; otherwise null (header falls back to the emblem
 * + wordmark). Drop e.g. welcome-header.png into backend/assets/email/.
 */
function bannerAttachment(baseName) {
  for (const ext of ['png', 'jpg', 'jpeg']) {
    const filename = `${baseName}.${ext}`;
    try {
      const filePath = path.join(ASSET_DIR, filename);
      if (fs.existsSync(filePath)) {
        return { filename, path: filePath, cid: baseName };
      }
    } catch {
      /* non-fatal — fall back to the emblem header */
    }
  }
  return null;
}

/**
 * A highlighted "account details" card: an uppercase title over label/value
 * rows. Any row whose value is empty is skipped.
 */
function emailAccountCard(title, rows, accent) {
  const body = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) => `
              <tr>
                <td style="padding:9px 0;border-bottom:1px solid #eceafb;font-family:${FONT};font-size:13px;font-weight:600;color:#6b7280;width:150px;vertical-align:top;">${label}</td>
                <td style="padding:9px 0;border-bottom:1px solid #eceafb;font-family:${FONT};font-size:14px;font-weight:600;color:#0f172a;">${value}</td>
              </tr>`
    )
    .join('');
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px;background-color:${accent.tintBg};border:1px solid ${accent.tintBorder}44;border-radius:10px;">
          <tr>
            <td style="padding:16px 18px 10px;">
              <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accent.from};margin-bottom:8px;">${title}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}
              </table>
            </td>
          </tr>
        </table>`;
}

/**
 * The shared shell. Wraps `bodyHtml` in the branded, cross-client-safe frame.
 * If `bannerCid` is given, a full-width banner image is the header (via CID);
 * otherwise the emblem + wordmark header is used. Poppins loads as a
 * progressive enhancement (Apple / iOS Mail); every other client uses the
 * inline system-font fallback.
 */
function renderEmail({ accent, preheader = '', heading, bodyHtml, bannerCid = null }) {
  const year = new Date().getFullYear();
  const emblem = BRAND.logoUrl
    ? `<img src="${BRAND.logoUrl}" width="56" height="56" alt="${BRAND.name}" style="display:block;margin:0 auto 8px;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-size:42px;line-height:42px;margin-bottom:4px;">🎓</div>`;

  const header = bannerCid
    ? `<tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <img src="cid:${bannerCid}" width="600" alt="${BRAND.name} — ${BRAND.sub}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>`
    : `<tr>
            <td align="center" bgcolor="${accent.from}" style="background-color:${accent.from};background-image:linear-gradient(135deg,${accent.from} 0%,${accent.to} 100%);padding:34px 24px;">
              ${emblem}
              <div style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:0.3px;color:#ffffff;">${BRAND.name}</div>
              <div style="font-family:${FONT};font-size:13px;color:#ffffff;opacity:0.9;margin-top:2px;">${BRAND.sub}</div>
            </td>
          </tr>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <title>${BRAND.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    body, table, td, div, p, a, h1 { font-family: ${FONT}; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${header}
          <tr>
            <td style="padding:36px 32px;font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;">
              ${heading ? `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:20px;font-weight:700;color:#0f172a;">${heading}</h1>` : ''}
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.6;color:#94a3b8;">
              <div style="font-weight:600;color:#64748b;">${BRAND.name} — ${BRAND.sub}</div>
              <div style="margin-top:4px;">This is an automated message. Please do not reply to this email.</div>
              <div style="margin-top:6px;">&copy; ${year} ${BRAND.name}. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders the shell and, when a matching banner image exists in ASSET_DIR,
 * attaches it (CID) too. Each build*() spreads this into its return:
 *   { subject, ...shell({ bannerName, accent, preheader, heading, bodyHtml }) }
 */
function shell({ bannerName, accent, preheader, heading, bodyHtml }) {
  const banner = bannerName ? bannerAttachment(bannerName) : null;
  return {
    attachments: banner ? [banner] : [],
    html: renderEmail({ accent, preheader, heading, bodyHtml, bannerCid: banner ? banner.cid : null }),
  };
}

/** Shared send helper: composes, sends, logs, and normalises the result. */
async function dispatch(kind, { to, subject, html, attachments }) {
  const mailOptions = { from: process.env.EMAIL_FROM, to, subject, html };
  if (attachments && attachments.length) mailOptions.attachments = attachments;
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ${kind} email sent:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email send error (${kind}):`, error);
    throw new Error(`Failed to send ${kind} email: ${error.message}`);
  }
}

const p = (html) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;">${html}</p>`;
const muted = (html) => `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:1.6;color:#94a3b8;">${html}</p>`;
const linkText = (url) =>
  `<p style="margin:0 0 4px;word-break:break-all;font-family:${FONT};font-size:13px;line-height:1.5;color:#4f46e5;">${url}</p>`;

// ============================================
// EMAIL BUILDERS + SENDERS
// ============================================

/**
 * Account verification (welcome) with a personalised "your account" card.
 * `details` may carry { prn, college, branch, email, registeredOn } — any
 * missing field is simply left out of the card.
 */
export function buildVerificationEmail(verificationUrl, studentName, details = {}) {
  const accent = ACCENTS.indigo;
  const registeredOn = details.registeredOn
    ? new Date(details.registeredOn).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  return {
    subject: 'Verify Your Account — State Placement Cell',
    ...shell({
      bannerName: 'welcome-header',
      accent,
      preheader: 'Your account is ready — verify your email to activate it.',
      heading: `Hi ${studentName},`,
      bodyHtml: `
              ${p('Your account at <strong>The State Placement Cell</strong> has been approved and created. Please review your details below and verify your email to activate your account.')}
              ${emailAccountCard('Your account', [
                ['Register No. (PRN)', details.prn],
                ['College', details.college],
                ['Branch', details.branch],
                ['Registered Email', details.email],
                ['Registered On', registeredOn],
              ], accent)}
              ${emailButton(verificationUrl, 'Verify My Account', accent)}
              ${muted('Button not working? Copy and paste this link into your browser:')}
              ${linkText(verificationUrl)}
              ${emailCallout('This link expires in 24 hours. If any detail above is incorrect, please contact your placement officer before verifying.', ACCENTS.amber)}`,
    }),
  };
}

export const sendVerificationEmail = async (email, verificationToken, studentName, details = {}) => {
  const verificationUrl = `${BRAND.siteUrl}/verify-email?token=${verificationToken}`;
  return dispatch('verification', {
    to: email,
    ...buildVerificationEmail(verificationUrl, studentName, { email, ...details }),
  });
};

/** Password reset. */
export function buildPasswordResetEmail(resetUrl, userName) {
  const accent = ACCENTS.red;
  return {
    subject: 'Reset Your Password — State Placement Cell',
    ...shell({
      bannerName: 'reset-header',
      accent,
      preheader: 'Reset the password for your State Placement Cell account.',
      heading: `Hello ${userName},`,
      bodyHtml: `
              ${p('We received a request to reset the password for your State Placement Cell account.')}
              ${p('Click the button below to choose a new password.')}
              ${emailButton(resetUrl, 'Reset Password', accent)}
              ${muted('Button not working? Copy and paste this link into your browser:')}
              ${linkText(resetUrl)}
              ${emailCallout('<strong>This link expires in 1 hour.</strong> If it lapses, just request a new reset.', ACCENTS.amber)}
              ${muted("If you didn't request this, you can ignore this email — your password won't change.")}`,
    }),
  };
}

export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${BRAND.siteUrl}/reset-password?token=${resetToken}`;
  return dispatch('password reset', { to: email, ...buildPasswordResetEmail(resetUrl, userName) });
};

/** Generic notification — `message` is caller-supplied inner HTML. */
export function buildNotificationEmail(subject, message) {
  const accent = ACCENTS.indigo;
  return {
    subject,
    ...shell({
      bannerName: 'notification-header',
      accent,
      preheader: typeof subject === 'string' ? subject : 'A new update from the State Placement Cell.',
      bodyHtml: `<div style="font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;">${message}</div>`,
    }),
  };
}

export const sendNotificationEmail = async (email, subject, message) => {
  return dispatch('notification', { to: email, ...buildNotificationEmail(subject, message) });
};

/** Registration rejected (a student's REGISTRATION, not a job application). */
export function buildRegistrationRejectedEmail(registerUrl, studentName, reason) {
  const accent = ACCENTS.red;
  return {
    subject: 'Registration Update — State Placement Cell',
    ...shell({
      bannerName: 'registration-rejected-header',
      accent,
      preheader: 'Your registration needs a change — you can register again.',
      heading: `Dear ${studentName},`,
      bodyHtml: `
              ${p('Your registration on the State Placement Cell portal was <strong>not approved</strong> by your placement officer.')}
              ${reason ? emailCallout(`<strong>Reason:</strong> ${reason}`, ACCENTS.red) : ''}
              ${p('Please register again with the corrected details — your PRN will be accepted for a fresh registration.')}
              ${emailButton(registerUrl, 'Register Again', ACCENTS.indigo)}
              ${muted('If you believe this was a mistake, please contact your college placement officer.')}`,
    }),
  };
}

export const sendRegistrationRejectedEmail = async (email, studentName, reason) => {
  return dispatch('registration rejected', {
    to: email,
    ...buildRegistrationRejectedEmail(`${BRAND.siteUrl}/register`, studentName, reason),
  });
};

/** Post-approval "please fix something" (send-back-for-correction). */
export function buildCorrectionRequestEmail(loginUrl, studentName, note, photoRequired) {
  const accent = ACCENTS.amber;
  return {
    subject: 'Action Needed: Correction Requested — State Placement Cell',
    ...shell({
      bannerName: 'correction-header',
      accent,
      preheader: 'Your placement officer asked you to correct something on your profile.',
      heading: `Dear ${studentName},`,
      bodyHtml: `
              ${p('Your placement officer has asked you to correct something on your profile. Your account is still active — just sign in and make the change.')}
              ${emailCallout(`<strong>What to fix:</strong> ${note}`, accent)}
              ${photoRequired ? p('<strong>Your photo has been removed and must be uploaded again.</strong>') : ''}
              ${p(`Once you've made the correction${photoRequired ? ' and uploaded a new photo' : ''}, click <strong>“I've made the corrections”</strong> on your dashboard.`)}
              ${emailButton(loginUrl, 'Sign In & Fix', ACCENTS.indigo)}
              ${muted("If you're unsure what to change, please contact your college placement officer.")}`,
    }),
  };
}

export const sendCorrectionRequestEmail = async (email, studentName, note, photoRequired) => {
  return dispatch('correction request', {
    to: email,
    ...buildCorrectionRequestEmail(`${BRAND.siteUrl}/login`, studentName, note, photoRequired),
  });
};

/** Placement drive scheduled. */
export function buildDriveScheduleEmail(studentName, jobDetails, driveDetails) {
  const accent = ACCENTS.blue;
  const driveDate = new Date(driveDetails.drive_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return {
    subject: `Placement Drive Scheduled — ${jobDetails.company_name}`,
    ...shell({
      bannerName: 'drive-header',
      accent,
      preheader: `${jobDetails.company_name} drive on ${driveDate}.`,
      heading: `Hello ${studentName},`,
      bodyHtml: `
              ${p('Good news — a placement drive has been scheduled for the following opportunity:')}
              ${emailCallout(
                `<div style="font-size:16px;font-weight:700;color:#1e40af;margin-bottom:6px;">${jobDetails.company_name}</div>` +
                  emailDetailList([
                    ['Position', jobDetails.job_title],
                    ['Date', driveDate],
                    ['Time', driveDetails.drive_time],
                    ['Location', driveDetails.drive_location],
                  ]),
                accent
              )}
              ${driveDetails.additional_instructions ? emailCallout(`<strong>Important instructions:</strong><br/>${driveDetails.additional_instructions}`, ACCENTS.amber) : ''}
              ${p('<strong>Please make sure to:</strong>')}
              ${emailList([
                'Arrive at least 15 minutes before the scheduled time',
                'Bring multiple copies of your resume',
                'Carry your ID card and required documents',
                'Dress professionally',
              ])}
              ${p('Best of luck for the drive!')}`,
    }),
  };
}

export const sendDriveScheduleEmail = async (email, studentName, jobDetails, driveDetails) => {
  return dispatch('drive schedule', { to: email, ...buildDriveScheduleEmail(studentName, jobDetails, driveDetails) });
};

/** Selected / placed. */
export function buildSelectionEmail(studentName, jobDetails, placementDetails) {
  const accent = ACCENTS.green;
  return {
    subject: `Congratulations! Selected at ${jobDetails.company_name}`,
    ...shell({
      bannerName: 'selected-header',
      accent,
      preheader: `You've been selected at ${jobDetails.company_name}!`,
      heading: `Dear ${studentName},`,
      bodyHtml: `
              <p style="margin:0 0 14px;font-family:${FONT};font-size:18px;font-weight:700;color:#047857;line-height:1.5;">🎉 We're delighted to tell you that you've been selected!</p>
              ${emailCallout(
                `<div style="font-size:16px;font-weight:700;color:#047857;margin-bottom:6px;">Placement Details</div>` +
                  emailDetailList([
                    ['Company', `<strong>${jobDetails.company_name}</strong>`],
                    ['Position', jobDetails.job_title],
                    ['Package', placementDetails.placement_package ? `${placementDetails.placement_package} LPA` : ''],
                    ['Location', placementDetails.placement_location],
                    [
                      'Joining Date',
                      placementDetails.joining_date
                        ? new Date(placementDetails.joining_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '',
                    ],
                  ]),
                accent
              )}
              ${p('<strong>Next steps:</strong>')}
              ${emailList([
                'Your placement officer will contact you with further details',
                'Prepare the documents required for onboarding',
                'Check the portal regularly for updates',
              ])}
              ${p('Congratulations once again — we wish you a great start to your career!')}`,
    }),
  };
}

export const sendSelectionEmail = async (email, studentName, jobDetails, placementDetails) => {
  return dispatch('selection', { to: email, ...buildSelectionEmail(studentName, jobDetails, placementDetails) });
};

/** Shortlisted for the next round. */
export function buildShortlistEmail(studentName, jobDetails) {
  const accent = ACCENTS.violet;
  return {
    subject: `Shortlisted for ${jobDetails.company_name} — ${jobDetails.job_title}`,
    ...shell({
      bannerName: 'shortlist-header',
      accent,
      preheader: `You've been shortlisted for ${jobDetails.company_name}.`,
      heading: `Dear ${studentName},`,
      bodyHtml: `
              <p style="margin:0 0 14px;font-family:${FONT};font-size:18px;font-weight:700;color:#6d28d9;line-height:1.5;">Congratulations! You've been shortlisted for the next round.</p>
              ${emailCallout(
                emailDetailList([
                  ['Position', jobDetails.job_title],
                  ['Company', jobDetails.company_name],
                ]),
                accent
              )}
              ${p('Your application has progressed to the shortlisting stage — an excellent achievement.')}
              ${p('<strong>What to expect next:</strong>')}
              ${emailList([
                "You'll be notified about the placement drive schedule",
                'Prepare well for the interview rounds',
                'Review your resume and technical skills',
                'Check the portal regularly for updates',
              ])}
              ${p('Keep it up, and best of luck for the upcoming rounds!')}`,
    }),
  };
}

export const sendShortlistEmail = async (email, studentName, jobDetails) => {
  return dispatch('shortlist', { to: email, ...buildShortlistEmail(studentName, jobDetails) });
};

/** Not selected for a job (application outcome). */
export function buildRejectionEmail(studentName, jobDetails) {
  const accent = ACCENTS.slate;
  return {
    subject: `Application Update — ${jobDetails.company_name}`,
    ...shell({
      bannerName: 'rejection-header',
      accent,
      preheader: `An update on your application to ${jobDetails.company_name}.`,
      heading: `Dear ${studentName},`,
      bodyHtml: `
              ${p(`Thank you for your interest in the ${jobDetails.job_title} position at ${jobDetails.company_name}.`)}
              ${p('After careful consideration, we regret to inform you that you have not been selected for this particular opportunity at this time.')}
              ${emailCallout('<strong>Please note:</strong> this decision does not reflect on your abilities. The process was highly competitive, with many strong candidates.', accent)}
              ${p('We encourage you to:')}
              ${emailList([
                'Keep applying for upcoming opportunities',
                'Continue improving your skills and resume',
                'Seek feedback from your placement officer',
                'Stay positive and keep preparing for future drives',
              ])}
              ${p('We wish you all the best — the right opportunity is on its way.')}`,
    }),
  };
}

export const sendRejectionEmail = async (email, studentName, jobDetails) => {
  return dispatch('rejection', { to: email, ...buildRejectionEmail(studentName, jobDetails) });
};

// ============================================
// TRANSPORTER VERIFICATION
// ============================================

/** Tests the transporter configuration on startup. */
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

export default transporter;

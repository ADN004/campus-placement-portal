import { query } from '../config/database.js';

/**
 * Build the "your account" fields shown in the verification/welcome email from
 * a student record. Resolves the college name from college_id when the record
 * doesn't already carry it. Any missing field is simply omitted from the email
 * card, and this never throws (email must not fail because of a detail lookup).
 *
 * Returns { prn, college, branch, registeredOn }. The recipient email is added
 * by sendVerificationEmail itself, so it isn't duplicated here.
 */
export async function buildVerificationDetails(student) {
  if (!student) return {};

  let college = student.college_name || null;
  if (!college && student.college_id) {
    try {
      const result = await query('SELECT college_name FROM colleges WHERE id = $1', [student.college_id]);
      college = result.rows[0]?.college_name || null;
    } catch {
      /* non-fatal — the card just omits the College row */
    }
  }

  return {
    prn: student.prn || null,
    college,
    branch: student.branch || null,
    registeredOn: student.created_at || null,
  };
}

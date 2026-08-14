/**
 * Telling the other colleges that they are on a joint posting.
 *
 * An officer can request a job for colleges other than their own. The Super
 * Admin approves it, the job goes live, and every targeted college's students
 * start seeing it — but nobody ever told those colleges' officers. They found
 * out when a student walked in asking about a company they had never heard of,
 * or they did not find out at all and their students sat out a drive they were
 * entitled to attend.
 *
 * This sends them one email when the job is approved. It is the only channel
 * available: officers have no inbox in the portal (they can send notifications,
 * not receive them), and `users.email` holds an officer's *login identifier*,
 * which is a phone number — mailing it would deliver nothing. The addresses
 * that actually reach a person are `officer_email`, then `college_email`.
 */

import { query } from '../config/database.js';
import { sendJointJobPostedEmail } from '../config/emailService.js';

/**
 * The officers of every college a job reaches, apart from the one that posted.
 *
 * The targeting rule here is copied from getJobs deliberately, rather than
 * simplified to "the colleges in target_colleges". A job stored as `region`
 * reaches colleges that are never named in target_colleges at all, and a notice
 * that disagreed with the eligibility query would either miss colleges whose
 * students can apply or promise a job to colleges whose students cannot see it.
 * Whoever the job is visible to is exactly who gets told about it.
 *
 * `excludeCollegeId` is the posting college: they requested it, so they know.
 */
export const participatingOfficers = async (job, excludeCollegeId) => {
  const regions = JSON.stringify(
    Array.isArray(job.target_regions) ? job.target_regions : []
  );
  const colleges = JSON.stringify(
    Array.isArray(job.target_colleges) ? job.target_colleges : []
  );

  const result = await query(
    `SELECT po.id,
            po.officer_name,
            c.id   AS college_id,
            c.college_name,
            COALESCE(po.officer_email, po.college_email) AS email
       FROM colleges c
       JOIN placement_officers po ON po.college_id = c.id AND po.is_active = TRUE
      WHERE c.id <> $1
        AND (
          $2 = 'all'
          OR ($2 = 'region'  AND $3::jsonb @> to_jsonb(c.region_id))
          OR ($2 = 'college' AND $4::jsonb @> to_jsonb(c.id))
          OR ($2 = 'specific' AND (
                $3::jsonb @> to_jsonb(c.region_id)
             OR $4::jsonb @> to_jsonb(c.id)
          ))
        )
      ORDER BY c.college_name`,
    [excludeCollegeId, job.target_type, regions, colleges]
  );

  return result.rows;
};

/**
 * Sends the notice, and never lets a mail failure disturb the approval.
 *
 * By the time this runs the job is committed and live. An SMTP timeout, a
 * bounced address or a college with nobody appointed must not turn a successful
 * approval into a 500 — the Super Admin would retry, and the second attempt
 * would fail differently because the request is no longer pending. Each
 * recipient is therefore sent independently and each failure is only recorded.
 *
 * Returns a summary so the caller can log what actually happened, including the
 * colleges that could not be reached at all: one of the sixty has neither an
 * officer address nor a college address on file, and silently dropping them
 * would look identical to a successful send.
 */
export const notifyParticipatingOfficers = async (job, postingCollegeId, postingCollegeName) => {
  const summary = { sent: 0, unreachable: [], failed: [] };

  let officers;
  try {
    officers = await participatingOfficers(job, postingCollegeId);
  } catch (error) {
    console.error('Joint job notice — could not resolve participating colleges:', error.message);
    return { ...summary, resolveFailed: true };
  }

  for (const officer of officers) {
    if (!officer.email) {
      summary.unreachable.push(officer.college_name);
      continue;
    }
    try {
      await sendJointJobPostedEmail(officer.email, officer.officer_name, postingCollegeName, job);
      summary.sent += 1;
    } catch (error) {
      summary.failed.push(`${officer.college_name} (${error.message})`);
    }
  }

  return summary;
};

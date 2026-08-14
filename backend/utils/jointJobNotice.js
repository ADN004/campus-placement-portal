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
 * The notice goes to the officer's inbox in the portal, always. Email is the
 * loud channel and is sent only when the officer who requested the job asked
 * for it — a joint posting can reach sixty colleges, and approving a routine
 * job should not put sixty messages in sixty mailboxes unless that was the
 * intent. Where email is used it goes to `officer_email`, then `college_email`;
 * `users.email` holds an officer's login identifier, which is a phone number,
 * so it would deliver nothing.
 */

import { query } from '../config/database.js';
import { sendJointJobPostedEmail } from '../config/emailService.js';
import { deliverToOfficers } from './officerInbox.js';

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
            po.user_id,
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

/** What the notice says, in the inbox. Kept beside the email so they agree. */
const inboxMessage = (job, postingCollegeName) => {
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;
  return (
    `${postingCollegeName} has posted ${job.job_title} at ${job.company_name}, `
    + 'and your college is included — it is now live for your eligible students.'
    + (deadline ? ` Applications close ${deadline} IST.` : '')
    + ` The drive is arranged by ${postingCollegeName}.`
  );
};

/**
 * Tells colleges that have just been added to a job that already existed.
 *
 * Widening a live posting has the same consequence as creating a joint one:
 * students at a college that was not on it yesterday can apply today, and
 * their officer has no way of knowing unless told. Without this the audience
 * could be extended to twenty colleges and every one of them would find out
 * from a student.
 *
 * Inbox only, deliberately. This runs on an edit rather than an approval,
 * edits are easy to repeat, and there is no requester here to have chosen the
 * email option — a Super Admin adjusting targeting twice in a minute should
 * not send two rounds of mail to sixty mailboxes.
 *
 * `collegeIds` is the newly added colleges alone, not the whole audience: the
 * ones that were already on the job were told when it was posted and do not
 * need telling again.
 */
export const notifyCollegesAdded = async (job, collegeIds, { createdBy = null } = {}) => {
  const ids = [...new Set((collegeIds || []).filter((id) => Number.isInteger(id)))];
  if (ids.length === 0) return { notified: 0 };

  const officers = await query(
    `SELECT po.user_id, c.college_name
       FROM colleges c
       JOIN placement_officers po ON po.college_id = c.id AND po.is_active = TRUE
      WHERE c.id = ANY($1)`,
    [ids]
  );
  if (officers.rows.length === 0) return { notified: 0 };

  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  await deliverToOfficers({
    userIds: officers.rows.map((row) => row.user_id),
    title: `Your college has been added to a posting — ${job.company_name}`,
    message:
      `${job.job_title} at ${job.company_name} has been opened to your college, and is now live `
      + 'for your eligible students.'
      + (deadline ? ` Applications close ${deadline} IST.` : ''),
    createdBy,
    type: 'joint_job_posted',
  });

  return { notified: officers.rows.length };
};

/**
 * Sends the notice, and never lets it disturb the approval.
 *
 * By the time this runs the job is committed and live. A failure here must not
 * turn a successful approval into a 500 — the Super Admin would retry, and the
 * second attempt would fail differently because the request is no longer
 * pending. The inbox write is one statement for everybody; the emails, when
 * asked for, are sent one at a time so a single bad address cannot take the
 * rest down with it.
 *
 * Returns a summary so the caller can log what actually happened, including the
 * colleges that could be reached in the portal but not by email: one of the
 * sixty has neither an officer address nor a college address on file, and
 * silently dropping them would look identical to a successful send.
 */
export const notifyParticipatingOfficers = async (
  job,
  postingCollegeId,
  postingCollegeName,
  { sendEmail = false, createdBy = null } = {}
) => {
  const summary = { notified: 0, emailed: 0, unreachableByEmail: [], failed: [] };

  let officers;
  try {
    officers = await participatingOfficers(job, postingCollegeId);
  } catch (error) {
    console.error('Joint job notice — could not resolve participating colleges:', error.message);
    return { ...summary, resolveFailed: true };
  }
  if (officers.length === 0) return summary;

  try {
    await deliverToOfficers({
      userIds: officers.map((officer) => officer.user_id),
      title: `Your college is on a joint posting — ${job.company_name}`,
      message: inboxMessage(job, postingCollegeName),
      createdBy,
      type: 'joint_job_posted',
    });
    summary.notified = officers.length;
  } catch (error) {
    summary.failed.push(`inbox delivery (${error.message})`);
  }

  if (!sendEmail) return summary;

  for (const officer of officers) {
    if (!officer.email) {
      summary.unreachableByEmail.push(officer.college_name);
      continue;
    }
    try {
      await sendJointJobPostedEmail(officer.email, officer.officer_name, postingCollegeName, job);
      summary.emailed += 1;
    } catch (error) {
      summary.failed.push(`${officer.college_name} (${error.message})`);
    }
  }

  return summary;
};

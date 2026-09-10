/**
 * A job's backlog rule, in words, in one place.
 *
 * Seven screens across the three roles printed this themselves — the student's
 * job list and their applications, the officer's job list and their own job
 * requests, the Console's job list, its job dialog and its review of an
 * officer's request. Each read `max_backlogs` and said "No backlogs" when it
 * was zero.
 *
 * That became wrong the moment a job could ask for no backlog *history*. Such a
 * job also stores max_backlogs = 0, so every one of those screens quietly
 * understated the requirement: a student saw "No backlogs", read it as "none
 * outstanding", and only discovered at the point of applying that the company
 * meant they must never have had one. Understating a requirement to the person
 * it excludes is the worst direction for it to be wrong in.
 *
 * So the sentence is written once and imported. `job` may be a job, a job
 * request, or an application row — all three carry the same column names.
 */

/**
 * @param {object} job  anything carrying max_backlogs, and optionally
 *                      requires_no_backlog_history, allowed_backlog_semesters
 *                      and the legacy backlog_max_semester.
 * @param {string|null} absent  what to say when the job sets no rule at all.
 * @returns {string|null}
 */
export function backlogRequirementText(job, absent = null) {
  if (!job) return absent;

  // Checked before the number, because a no-history job stores zero as well and
  // would otherwise read as the ordinary no-backlogs rule.
  if (job.requires_no_backlog_history) return 'No backlog history (never had one)';

  const max = job.max_backlogs;
  if (max === null || max === undefined || max === '') return absent;

  const n = Number(max);
  if (n === 0) return 'No backlogs';

  const semesters = Array.isArray(job.allowed_backlog_semesters)
    ? job.allowed_backlog_semesters
    : [];
  if (semesters.length > 0) {
    return `Max ${n}, in semester${semesters.length === 1 ? '' : 's'} ${semesters.join(', ')}`;
  }

  // The range rule nothing creates any more, still honoured on older jobs.
  if (job.backlog_max_semester) {
    return `Max ${n} within Sem 1–${job.backlog_max_semester}`;
  }

  return `Max ${n}`;
}

export default backlogRequirementText;

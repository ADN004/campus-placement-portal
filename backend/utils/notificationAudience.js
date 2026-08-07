/**
 * Who is allowed to receive a notification, in one place.
 *
 * Three conditions, and the third was missing everywhere:
 *
 *   - registration_status = 'approved'  — they finished registering
 *   - is_blacklisted = FALSE            — they have not been barred
 *   - their user account is active      — they can actually sign in
 *
 * Only the first two were ever checked. A student whose account has been
 * deactivated stays 'approved' and un-blacklisted, so they were still counted as
 * a recipient, still had a notification_recipients row written for them, and at
 * Urgent priority were still emailed — about a drive they cannot sign in to act
 * on. It also inflated the "Sending to N students" figure the composer shows
 * before pressing send.
 *
 * That state is not hypothetical: disabling a PRN range deactivates the account
 * of every student inside it, so it happens the first time an officer disables a
 * range, and again every time a batch finishes and is deactivated.
 *
 * Checked before adding this: on production 6332 of 6332 approved,
 * non-blacklisted students were active, and on staging 234 of 234 — so this
 * changes nothing about who is notified today. It is a guard for the first time
 * those two numbers diverge.
 *
 * Written as an EXISTS rather than a JOIN on purpose. Every call site below
 * already has its own FROM/JOIN shape, its own GROUP BY and its own positional
 * parameter numbering; an EXISTS drops into the WHERE (or an ON clause) without
 * disturbing any of them.
 *
 * Assumes the students table is aliased `s`, which all five call sites do.
 *
 * Call sites — the count and the send must always use the same rule, or the
 * composer promises a number it does not deliver:
 *   placementOfficerController.getCollegeBranches  (count, per branch)
 *   placementOfficerController.sendNotification    (send)
 *   superAdminController.getCollegesForNotifications (count, per college)
 *   superAdminController.getBranchesForColleges      (count, per branch)
 *   superAdminController.sendNotification            (send)
 */
export const ACTIVE_STUDENT_ACCOUNT_SQL = `EXISTS (
  SELECT 1 FROM users u_notif
  WHERE u_notif.id = s.user_id AND u_notif.is_active = TRUE
)`;

/**
 * The full audience predicate, for call sites that want all three conditions at
 * once rather than appending to their own.
 */
export const NOTIFIABLE_STUDENT_SQL = `s.registration_status = 'approved'
  AND s.is_blacklisted = FALSE
  AND ${ACTIVE_STUDENT_ACCOUNT_SQL}`;

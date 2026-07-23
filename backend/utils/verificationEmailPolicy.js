/**
 * Verification-email send policy.
 *
 * students.verification_email_sent_count records how many verification emails
 * have gone out TODAY — not a lifetime total. It was previously only ever
 * incremented and never reset, so once a student had ever received 5 emails
 * (approval counts toward it) they were throttled to one per day forever.
 * Every writer now uses the day-aware SQL below, so "5 per day" means what it
 * says and the tally starts over each calendar day.
 */

export const MAX_VERIFICATION_EMAILS_PER_DAY = 5;

/**
 * SQL fragment that increments the counter within the same day and restarts
 * it at 1 on a new day. Use together with
 * `last_verification_email_sent_at = CURRENT_TIMESTAMP`.
 */
export const DAY_AWARE_COUNT_SQL = `
  CASE
    WHEN last_verification_email_sent_at::date = CURRENT_DATE
      THEN verification_email_sent_count + 1
    ELSE 1
  END`;

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** How many verification emails this student has already had today. */
export const verificationSendsToday = (sentCount, lastSentAt) => {
  if (!lastSentAt) return 0;
  return isSameCalendarDay(new Date(lastSentAt), new Date()) ? (sentCount || 0) : 0;
};

/**
 * May another verification email be sent to this student right now?
 * Returns { allowed, sentToday, message }.
 */
export const checkVerificationQuota = (sentCount, lastSentAt) => {
  const sentToday = verificationSendsToday(sentCount, lastSentAt);
  if (sentToday >= MAX_VERIFICATION_EMAILS_PER_DAY) {
    return {
      allowed: false,
      sentToday,
      message: `You have already requested ${MAX_VERIFICATION_EMAILS_PER_DAY} verification emails today. Please check your inbox and spam folder — you can request another tomorrow.`,
    };
  }
  return { allowed: true, sentToday };
};

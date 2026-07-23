-- 008: Reset verification-email counters (semantics changed).
--
-- students.verification_email_sent_count used to be a lifetime total that was
-- never reset, while the resend check refused once it reached 5 and the last
-- send was the same day. The effect: any student who had ever received 5
-- verification emails (approval counts toward it) was throttled to ONE email
-- per day forever.
--
-- The counter now means "verification emails sent TODAY" and restarts each
-- calendar day. Existing values are lifetime totals and meaningless under the
-- new rule, so clear them — this also immediately unsticks anyone currently
-- throttled. Nothing else depends on the historical number.
-- Idempotent: safe to re-run.

UPDATE students
SET verification_email_sent_count = 0
WHERE verification_email_sent_count IS DISTINCT FROM 0;

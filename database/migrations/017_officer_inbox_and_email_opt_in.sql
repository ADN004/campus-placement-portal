-- Officers can now be told things, not only send them.
--
-- A job posted for several colleges reaches all of them, but only the officer
-- who requested it and the Super Admin who approved it ever knew it existed.
-- The other colleges found out when a student asked about a company they had
-- never heard of.
--
-- The notifications/notification_recipients pair already delivers per user and
-- officers already have user accounts, so no new table is needed to reach them.
-- What it lacked was a notification_type that says what these messages are, and
-- an index for "my unread ones", which is a query nothing ran before because
-- nobody was ever a recipient except students reading their own list.

-- 'job_posted' already exists and is what a joint-job notice is; the constraint
-- is widened only for the two officer-facing kinds that had nowhere to sit.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_notification_type_check') THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_notification_type_check;
  END IF;
  ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
    CHECK (notification_type IN (
      'general', 'job_posted', 'application_deadline', 'approval', 'rejection',
      -- your college was included on someone else's posting
      'joint_job_posted',
      -- a drive was scheduled on a job your college is part of
      'joint_drive_scheduled'
    ));
END $$;

-- The inbox reads one user's rows newest-first, and the badge counts the unread
-- ones. Without this both scan every recipient row in the table, which grows by
-- one row per student per broadcast.
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_unread
  ON notification_recipients (user_id, is_read, created_at DESC);

-- Whether the officer who requested a job also wants the other colleges emailed.
--
-- The inbox is always written; email is the loud channel and stays the
-- requester's choice, defaulting to off so approving a job cannot surprise
-- anyone with sixty messages.
ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN job_requests.notify_by_email IS
  'Requesting officer asked for the other targeted colleges to be emailed as well as sent an inbox notification. Inbox delivery happens regardless.';

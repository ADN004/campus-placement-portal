-- Some companies ask for no backlog history at all, not merely none now.
--
-- A student who failed a paper in Semester 2 and cleared it in Semester 4 has
-- zero backlogs by Semester 6, and every existing rule treats them as clean.
-- backlogs_sem1..6 hold what is outstanding today: they are set at registration
-- and edited afterwards, so clearing a backlog erases the fact that there ever
-- was one. The portal genuinely cannot tell that student from one who never
-- failed anything.
--
-- So the requirement is enforced in the two halves it actually has. Where the
-- portal already knows -- a student carrying backlogs right now -- it refuses.
-- Where it cannot know, it asks: the student declares, at the moment of
-- applying and per job, that they have never had one. That declaration is
-- stored on the application, so an officer verifying a shortlist can see who
-- claimed what and when, rather than a checkbox that vanished after the click.

-- On the job, beside max_backlogs. A job with this set also stores
-- max_backlogs = 0, so every reader that only understands the old rule still
-- refuses students with active backlogs rather than admitting everybody.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS requires_no_backlog_history BOOLEAN NOT NULL DEFAULT FALSE;

-- On the application, because it is an assertion about a person made at a
-- moment for a particular company, not a property of the student. FALSE on
-- every existing row is correct: nobody has been asked yet.
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS declared_no_backlog_history BOOLEAN NOT NULL DEFAULT FALSE;

-- An officer's job request carries it too, or the requirement would be lost at
-- the moment the Super Admin approves the request into a job.
ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS requires_no_backlog_history BOOLEAN NOT NULL DEFAULT FALSE;

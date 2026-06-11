-- Ensure colleges.sort_order exists (required by the Manage Colleges page,
-- bulk import, and officer list ordering).
--
-- Fresh installs already get this column from database/schema.sql; this
-- migration upgrades older databases that were created before the column
-- was added. Idempotent — safe to re-apply.

ALTER TABLE colleges ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 999;

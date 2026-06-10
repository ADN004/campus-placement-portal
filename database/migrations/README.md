# Database Migrations

Ordered, plain-SQL migrations applied by `backend/scripts/migrate.js` and
tracked in the `schema_migrations` table.

## Naming

```
001_short_description.sql
002_another_change.sql
```

Numeric prefix determines order. Never renumber or edit a migration after it
has been applied to any environment — add a new one instead.

## Rules

1. **Idempotent SQL only.** Fresh installs get the full `database/schema.sql`,
   which already contains every past migration. The runner will still execute
   all migration files once on a fresh database, so they must be harmless to
   re-apply:
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
   - `CREATE TABLE IF NOT EXISTS ...`
   - `CREATE INDEX IF NOT EXISTS ...`
   - `DROP ... IF EXISTS ...`
   - For data backfills, use `WHERE` guards or `ON CONFLICT DO NOTHING`.

2. **Update `schema.sql` in the same commit.** `schema.sql` stays the single
   source of truth for fresh installs; migrations exist to upgrade databases
   that are already running.

3. **Prefer additive changes.** Add the column, backfill, deploy code that
   uses it, and only drop the old column in a later migration once nothing
   references it. This keeps the *previous* app image compatible with the
   migrated schema, which is what makes image rollback safe in production.

## Staging-first workflow

```
write migration on develop
  -> deploy to staging        make staging-deploy TAG=staging-<sha>
  -> apply on staging         make staging-migrate
  -> verify (ideally against  make staging-refresh-from-prod first)
  -> merge develop into main
  -> backup production        make hub-db-backup   (hub-migrate does this too)
  -> apply on production      make hub-migrate
  -> deploy production        make hub-deploy TAG=main-<sha>
```

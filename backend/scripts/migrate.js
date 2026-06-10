/**
 * Database Migration Runner
 *
 * Lightweight, dependency-free migration system for a staging-first workflow.
 *
 * How it works:
 *   - Plain SQL files live in database/migrations/, named with an ordered
 *     numeric prefix: 001_add_x.sql, 002_create_y.sql, ...
 *   - Applied versions are tracked in the schema_migrations table.
 *   - Pending files are applied in order, each inside its own transaction.
 *
 * IMPORTANT RULES (see database/migrations/README.md):
 *   - Every migration MUST be idempotent (IF NOT EXISTS / IF EXISTS guards),
 *     because fresh installs get the full database/schema.sql which already
 *     contains all past migrations. On a fresh database the runner re-applies
 *     them harmlessly and records them as applied.
 *   - Every migration must ALSO be folded into database/schema.sql in the
 *     same commit, so fresh installs stay correct.
 *   - Prefer additive migrations (add column, backfill, drop later) so the
 *     previously deployed app image still works against the migrated schema.
 *     That is what keeps image rollback safe after a migration has run.
 *
 * Usage (inside the backend container):
 *   node scripts/migrate.js            apply all pending migrations
 *   node scripts/migrate.js --status   list applied/pending, change nothing
 *
 * @module scripts/migrate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same convention as seedDatabase.js: /app/scripts -> /database in the
// container, ../../database locally.
const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

const STATUS_ONLY = process.argv.includes('--status');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = listMigrationFiles();
    const appliedResult = await client.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = new Set(appliedResult.rows.map((r) => r.version));
    const pending = files.filter((f) => !applied.has(f));

    console.log(`📦 Migrations directory: ${MIGRATIONS_DIR}`);
    console.log(`   Applied: ${applied.size} | Pending: ${pending.length}`);

    if (STATUS_ONLY) {
      for (const f of files) {
        console.log(`   ${applied.has(f) ? '✅ applied' : '⏳ pending'}  ${f}`);
      }
      if (files.length === 0) {
        console.log('   (no migration files found)');
      }
      return;
    }

    if (pending.length === 0) {
      console.log('✅ Database is up to date — nothing to apply.');
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`\n▶ Applying ${file} ...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ ${file} applied`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ ${file} FAILED — rolled back. No further migrations were attempted.`);
        console.error(`   ${error.message}`);
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\n✅ ${pending.length} migration(s) applied successfully.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ Migration runner error:', error.message);
  process.exit(1);
});

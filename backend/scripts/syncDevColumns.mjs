/**
 * Dev-DB helper: add columns that exist in database/schema.sql but are
 * missing from the local database, for the given tables. Idempotent.
 * (The production/staging databases already have these — this exists only
 * to bring an old local dev database up to date.)
 */
import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';

const TABLES = ['jobs', 'job_requests', 'job_requirement_templates', 'job_request_requirement_templates'];
const NON_COLUMN = /^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|REFERENCES)/i;

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campus_placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const schema = fs.readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8');

const main = async () => {
  for (const table of TABLES) {
    const blockMatch = schema.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`, 'i'));
    if (!blockMatch) {
      console.log(`!! could not find CREATE TABLE ${table} in schema.sql`);
      continue;
    }

    const existing = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    const have = new Set(existing.rows.map((r) => r.column_name));

    // Split block into column definitions (top-level commas only — fine here
    // because defaults like '[]'::jsonb contain no commas)
    const lines = blockMatch[1]
      .split('\n')
      .map((l) => l.trim().replace(/,$/, '').replace(/--.*$/, '').trim())
      .filter((l) => l && !NON_COLUMN.test(l));

    for (const line of lines) {
      const colName = line.split(/\s+/)[0].replace(/"/g, '');
      if (!/^[a-z_][a-z0-9_]*$/i.test(colName) || have.has(colName)) continue;
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${line}`);
        console.log(`+ ${table}.${colName}`);
      } catch (e) {
        console.log(`!! ${table}.${colName}: ${e.message}`);
      }
    }
  }
  console.log('done');
  await pool.end();
};

main();

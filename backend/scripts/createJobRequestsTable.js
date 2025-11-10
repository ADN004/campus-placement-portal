import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createJobRequestsTable() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: Creating job_requests table...');

    // Start transaction
    await client.query('BEGIN');

    // Check if job_requests table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'job_requests'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✓ job_requests table already exists');
      await client.query('COMMIT');
      return;
    }

    // Read and execute the SQL migration file
    const sqlPath = join(__dirname, '..', 'migrations', 'create_job_requests_table.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('Creating job_requests table...');
    await client.query(sql);
    console.log('✓ job_requests table created');

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createJobRequestsTable()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

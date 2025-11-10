import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function addColumns() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: Adding name and branch columns to students table...');

    // Start transaction
    await client.query('BEGIN');

    // Check if name column exists
    const nameCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'name'
    `);

    if (nameCheck.rows.length === 0) {
      console.log('Adding name column...');
      await client.query('ALTER TABLE students ADD COLUMN name VARCHAR(255)');
      console.log('✓ Name column added');
    } else {
      console.log('✓ Name column already exists');
    }

    // Check if branch column exists
    const branchCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'branch'
    `);

    if (branchCheck.rows.length === 0) {
      console.log('Adding branch column...');
      await client.query('ALTER TABLE students ADD COLUMN branch VARCHAR(255)');
      console.log('✓ Branch column added');
    } else {
      console.log('✓ Branch column already exists');
    }

    // Update existing NULL values
    console.log('Updating existing records with default values...');
    await client.query(`UPDATE students SET name = 'Update Required' WHERE name IS NULL`);
    await client.query(`UPDATE students SET branch = 'Not Specified' WHERE branch IS NULL`);
    console.log('✓ Existing records updated');

    // Add NOT NULL constraints
    const nameNotNull = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'name'
    `);

    if (nameNotNull.rows.length > 0 && nameNotNull.rows[0].is_nullable === 'YES') {
      console.log('Adding NOT NULL constraint to name column...');
      await client.query('ALTER TABLE students ALTER COLUMN name SET NOT NULL');
      console.log('✓ NOT NULL constraint added to name');
    }

    const branchNotNull = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'branch'
    `);

    if (branchNotNull.rows.length > 0 && branchNotNull.rows[0].is_nullable === 'YES') {
      console.log('Adding NOT NULL constraint to branch column...');
      await client.query('ALTER TABLE students ALTER COLUMN branch SET NOT NULL');
      console.log('✓ NOT NULL constraint added to branch');
    }

    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)');
    console.log('✓ Indexes created');

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

addColumns()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

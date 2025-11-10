import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...\n');

    await client.query('BEGIN');

    // Read seed file
    const seedPath = path.join(__dirname, '../../database/seed-data.sql');
    let seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Hash passwords for users
    const salt = await bcrypt.genSalt(10);
    const officerPasswordHash = await bcrypt.hash('123', salt);
    const adminPasswordHash = await bcrypt.hash('y9eshszbrr', salt);

    // Replace placeholders with actual hashed passwords
    seedSQL = seedSQL.replace(/\$2b\$10\$placeholder/g, officerPasswordHash);
    seedSQL = seedSQL.replace(
      /\$2b\$10\$placeholder_hash_will_be_generated/g,
      adminPasswordHash
    );

    // Execute seed SQL
    await client.query(seedSQL);

    await client.query('COMMIT');

    console.log('✅ Database seeded successfully!\n');
    console.log('📋 Summary:');
    console.log('   - 5 Regions created');
    console.log('   - 60 Colleges created');
    console.log('   - 59 Placement Officers created');
    console.log('   - 1 Super Admin created (adityanche@gmail.com)\n');
    console.log('🔑 Default Credentials:');
    console.log('   Super Admin: adityanche@gmail.com / y9eshszbrr');
    console.log('   Placement Officers: <phone_number> / 123\n');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    client.release();
    await pool.end();
    process.exit(1);
  }
};

seedDatabase();

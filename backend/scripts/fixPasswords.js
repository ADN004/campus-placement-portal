import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const fixPasswords = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Fixing user passwords...\n');

    await client.query('BEGIN');

    // Hash passwords
    console.log('🔐 Hashing passwords...');
    const adminPasswordHash = await bcrypt.hash('y9eshszbrr', 10);
    const officerPasswordHash = await bcrypt.hash('123', 10);

    // Fix super admin password
    console.log('👑 Updating super admin password...');
    const adminResult = await client.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = 'adityanche@gmail.com' AND role = 'super_admin'
       RETURNING id, email`,
      [adminPasswordHash]
    );

    if (adminResult.rows.length > 0) {
      console.log('✅ Super admin password updated');
      console.log(`   Email: ${adminResult.rows[0].email}`);
    } else {
      console.log('⚠️  Super admin not found, creating...');
      await client.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ('adityanche@gmail.com', $1, 'super_admin', TRUE)`,
        [adminPasswordHash]
      );
      console.log('✅ Super admin created');
    }

    // Fix placement officer passwords
    console.log('\n👥 Updating placement officer passwords...');
    const officerResult = await client.query(
      `UPDATE users
       SET password_hash = $1
       WHERE role = 'placement_officer'
       RETURNING id`,
      [officerPasswordHash]
    );

    console.log(`✅ ${officerResult.rowCount} placement officer passwords updated`);

    await client.query('COMMIT');

    console.log('\n✨ Password fix completed successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  UPDATED CREDENTIALS');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('👑 SUPER ADMIN:');
    console.log('   Email: adityanche@gmail.com');
    console.log('   Password: y9eshszbrr');
    console.log('');
    console.log('👥 PLACEMENT OFFICERS:');
    console.log('   Username: 9497219788 (or any other phone)');
    console.log('   Password: 123');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing passwords:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

fixPasswords()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

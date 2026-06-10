/**
 * Staging Database Sanitizer
 *
 * Runs automatically as the final step of `make staging-refresh-from-prod`
 * (and manually via `make staging-db-sanitize`). After production data is
 * cloned into staging, this script ensures production credentials can no
 * longer be used against the staging environment:
 *
 *   1. Resets the password of EVERY non-super-admin account (students,
 *      placement officers) to a single known staging password
 *      (STAGING_SANITIZE_PASSWORD, default 'Staging@123').
 *      - Real users' production passwords stop working on staging.
 *      - Testers can log in as any real-shaped account with the known password.
 *   2. Creates (or resets) a dedicated staging super admin from
 *      SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in the staging environment,
 *      so day-to-day staging admin work never uses a production credential.
 *   3. DEACTIVATES every other super admin account (the ones cloned from
 *      production), so no production credential of any kind remains usable.
 *      This step is skipped if the dedicated staging admin could not be
 *      created — staging is never left without an active admin.
 *   4. Clears pending email verification tokens, so no token minted by
 *      production is honored by staging.
 *
 * ============================================================
 * MAINTENANCE CHECKLIST — read this when adding auth features
 * ============================================================
 * Goal: "No authentication credential copied from production remains valid
 * in staging." If you add ANY of the following to the application, you MUST
 * add a corresponding sanitization step to this script in the same change:
 *   - refresh-token / session tables            -> DELETE all rows
 *   - API keys / personal access tokens         -> DELETE or regenerate
 *   - remember-me / device tokens               -> DELETE all rows
 *   - password-reset token columns              -> set to NULL
 *   - OAuth client secrets stored in the DB     -> replace with staging values
 *   - any new *_token / *_secret / *_hash column on any table
 * Current coverage (verified 2026-06-10): users.password_hash and
 * students.email_verification_token are the ONLY auth credentials stored in
 * the database; sessions are stateless JWTs invalidated by staging's
 * different JWT_SECRET; there is no self-service password-reset flow.
 * ============================================================
 *
 * SAFETY: refuses to run when APP_ENV=production.
 *
 * Usage (inside the staging backend container):
 *   node scripts/sanitizeStagingDb.js
 *
 * @module scripts/sanitizeStagingDb
 */

import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const APP_ENV = process.env.APP_ENV || 'production';
const SANITIZE_PASSWORD = process.env.STAGING_SANITIZE_PASSWORD || 'Staging@123';
const STAGING_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const STAGING_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  if (APP_ENV === 'production') {
    console.error('❌ Refusing to run: APP_ENV=production. This script is for staging only.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Reset all non-super-admin passwords to the known staging password
    const passwordHash = await bcrypt.hash(SANITIZE_PASSWORD, 10);
    const reset = await client.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE role <> 'super_admin'`,
      [passwordHash]
    );

    // 2. Dedicated staging super admin (upsert from staging env)
    let adminAction = 'skipped (SUPER_ADMIN_EMAIL/PASSWORD not set in staging env)';
    let stagingAdminReady = false;
    if (STAGING_ADMIN_EMAIL && STAGING_ADMIN_PASSWORD) {
      const adminHash = await bcrypt.hash(STAGING_ADMIN_PASSWORD, 10);
      const existing = await client.query('SELECT id, role FROM users WHERE email = $1', [
        STAGING_ADMIN_EMAIL,
      ]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE users SET password_hash = $1, role = 'super_admin', is_active = TRUE,
                            updated_at = CURRENT_TIMESTAMP
           WHERE email = $2`,
          [adminHash, STAGING_ADMIN_EMAIL]
        );
        adminAction = `reset existing account ${STAGING_ADMIN_EMAIL}`;
      } else {
        const user = await client.query(
          `INSERT INTO users (email, password_hash, role, is_active)
           VALUES ($1, $2, 'super_admin', TRUE) RETURNING id`,
          [STAGING_ADMIN_EMAIL, adminHash]
        );
        await client.query(
          `INSERT INTO super_admins (user_id, name) VALUES ($1, 'Staging Administrator')
           ON CONFLICT (user_id) DO NOTHING`,
          [user.rows[0].id]
        );
        adminAction = `created ${STAGING_ADMIN_EMAIL}`;
      }
      stagingAdminReady = true;
    }

    // 3. Deactivate super admins cloned from production — but never leave
    //    staging without an active admin
    let deactivated = { rowCount: 0 };
    if (stagingAdminReady) {
      deactivated = await client.query(
        `UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE role = 'super_admin' AND email <> $1 AND is_active = TRUE`,
        [STAGING_ADMIN_EMAIL]
      );
    }

    // 4. Invalidate tokens minted by production
    const tokens = await client.query(
      `UPDATE students SET email_verification_token = NULL
       WHERE email_verification_token IS NOT NULL`
    );

    await client.query('COMMIT');

    console.log('✅ Staging database sanitized.');
    console.log(`   Non-admin passwords reset  : ${reset.rowCount} accounts -> known staging password`);
    console.log(`   Staging super admin        : ${adminAction}`);
    if (stagingAdminReady) {
      console.log(`   Prod super admins disabled : ${deactivated.rowCount}`);
    } else {
      console.log('   ⚠ Prod super admins NOT disabled (no staging admin configured — set');
      console.log('     SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in .env.staging and re-run)');
    }
    console.log(`   Verification tokens cleared: ${tokens.rowCount}`);
    console.log('');
    if (stagingAdminReady) {
      console.log('   No production credential remains usable on staging.');
    } else {
      console.log('   Production super admin credentials are STILL VALID on staging — fix the staging admin config.');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Sanitization failed (rolled back):', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

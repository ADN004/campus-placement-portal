import { query } from '../config/database.js';

/**
 * Portal mode helpers — single- vs multi-college deployments.
 *
 * The deployment "mode" is never configured; it is derived from the data:
 * a database with exactly one active college is a single-college deployment.
 * UI simplifications and the optional job-approval policy key off these
 * helpers, so adding a second college automatically restores the full
 * multi-college behavior everywhere.
 *
 * Every helper degrades gracefully: if the portal_settings table does not
 * exist yet (migration not applied) or a query fails, callers receive the
 * defaults that reproduce long-standing behavior.
 */

/** Count active colleges and regions. */
export const getPortalCounts = async () => {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM colleges WHERE is_active = TRUE) AS active_colleges,
       (SELECT COUNT(*) FROM regions) AS regions`
  );
  return {
    active_colleges: parseInt(result.rows[0].active_colleges),
    regions: parseInt(result.rows[0].regions),
  };
};

/** Read a portal setting; null when unset or when the table is missing. */
export const getPortalSetting = async (key) => {
  try {
    const result = await query(
      'SELECT setting_value FROM portal_settings WHERE setting_key = $1',
      [key]
    );
    return result.rows.length > 0 ? result.rows[0].setting_value : null;
  } catch (error) {
    // Table may not exist yet (pre-migration database) — behave as unset
    return null;
  }
};

/** Upsert a portal setting (value is stored as JSONB). */
export const setPortalSetting = async (key, value, userId) => {
  await query(
    `INSERT INTO portal_settings (setting_key, setting_value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = $2::jsonb, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), userId]
  );
};

/**
 * Is the mode-switch testing tool enabled for this deployment?
 * Gated by an env var so production deployments never expose it.
 * (Set ENABLE_MODE_SWITCH=true — intended for staging/test environments.)
 */
export const isModeSwitchEnabled = () => process.env.ENABLE_MODE_SWITCH === 'true';

/**
 * Does this deployment require super admin approval for an officer's
 * own-college job post?
 *
 * Only ever true in single-college mode with the setting explicitly enabled.
 * Multi-college deployments always keep the existing auto-approval behavior,
 * even if the setting row is somehow present.
 */
export const singleCollegeJobApprovalRequired = async () => {
  try {
    const counts = await getPortalCounts();
    if (counts.active_colleges !== 1) return false;
    return (await getPortalSetting('single_college_require_job_approval')) === true;
  } catch (error) {
    console.error('portalMode check failed, defaulting to auto-approval:', error.message);
    return false;
  }
};

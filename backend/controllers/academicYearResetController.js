/**
 * Academic Year Reset Controller
 *
 * Provides preview and execution of yearly system reset.
 * Wipes transactional data (jobs, applications, notifications) while
 * preserving structural data (colleges, officers, PRN ranges, student records).
 */

import { query, transaction } from '../config/database.js';
import { deleteMultipleImages, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';
import bcrypt from 'bcrypt';

/**
 * Safe count query — returns 0 if the table doesn't exist.
 */
const safeCount = async (tableName, whereClause = '') => {
  try {
    const sql = `SELECT COUNT(*) FROM ${tableName}${whereClause ? ' WHERE ' + whereClause : ''}`;
    const result = await query(sql);
    return parseInt(result.rows[0].count);
  } catch (err) {
    if (err.code === '42P01') return 0; // relation does not exist
    throw err;
  }
};

/**
 * Safe execute — silently skips if the table doesn't exist.
 */
const safeExec = async (client, sql) => {
  try {
    return await client.query(sql);
  } catch (err) {
    if (err.code === '42P01') return { rowCount: 0 }; // relation does not exist
    throw err;
  }
};

/**
 * GET /api/super-admin/academic-year-reset/preview
 * Returns counts of all data that will be affected by the reset.
 */
export const getResetPreview = async (req, res) => {
  try {
    const [
      jobs,
      jobApplications,
      jobDrives,
      jobRequests,
      notifications,
      adminNotifications,
      activityLogs,
      whitelistRequests,
      cgpaUnlockWindows,
      backlogUnlockWindows,
      deletedJobsHistory,
      studentPhotos,
      activePRNRanges,
      activeStudents,
    ] = await Promise.all([
      safeCount('jobs'),
      safeCount('job_applications'),
      safeCount('job_drives'),
      safeCount('job_requests'),
      safeCount('notifications'),
      safeCount('admin_notifications'),
      safeCount('activity_logs'),
      safeCount('whitelist_requests'),
      safeCount('cgpa_unlock_windows'),
      safeCount('backlog_unlock_windows'),
      safeCount('deleted_jobs_history'),
      safeCount('students', 'photo_cloudinary_id IS NOT NULL'),
      safeCount('prn_ranges', 'is_active = TRUE AND is_enabled = TRUE'),
      safeCount('users', "role = 'student' AND is_active = TRUE"),
    ]);

    res.status(200).json({
      success: true,
      message: 'Reset preview generated',
      data: {
        jobs,
        job_applications: jobApplications,
        job_drives: jobDrives,
        job_requests: jobRequests,
        notifications,
        admin_notifications: adminNotifications,
        activity_logs: activityLogs,
        whitelist_requests: whitelistRequests,
        cgpa_unlock_windows: cgpaUnlockWindows,
        backlog_unlock_windows: backlogUnlockWindows,
        deleted_jobs_history: deletedJobsHistory,
        student_photos: studentPhotos,
        active_prn_ranges: activePRNRanges,
        active_students: activeStudents,
      },
    });
  } catch (error) {
    console.error('Reset preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reset preview',
      error: error.message,
    });
  }
};

/**
 * POST /api/super-admin/academic-year-reset/execute
 * Executes the academic year reset with full validation.
 * Body: { academic_year: "2025-26", password: "admin-password" }
 */
export const performAcademicYearReset = async (req, res) => {
  try {
    const { academic_year, password } = req.body;

    // --- Validation ---
    if (!academic_year || !password) {
      return res.status(400).json({
        success: false,
        message: 'Academic year and password are required',
      });
    }

    const yearPattern = /^\d{4}-\d{2}$/;
    if (!yearPattern.test(academic_year)) {
      return res.status(400).json({
        success: false,
        message: 'Academic year must be in format YYYY-YY (e.g., 2025-26)',
      });
    }

    // --- Password verification ---
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Reset aborted.',
      });
    }

    // --- Collect Cloudinary IDs before transaction ---
    const photoResult = await query(
      'SELECT id, photo_cloudinary_id FROM students WHERE photo_cloudinary_id IS NOT NULL'
    );
    const cloudinaryIds = photoResult.rows.map(r => r.photo_cloudinary_id).filter(Boolean);

    // --- Database transaction ---
    const disabledReason = `Academic Year Reset ${academic_year}`;

    const resetCounts = await transaction(async (client) => {
      const counts = {};

      // Extend timeout for large datasets
      await client.query("SET LOCAL statement_timeout = '120000'");

      // 1. Disable all active PRN ranges
      const prnResult = await client.query(
        `UPDATE prn_ranges
         SET is_enabled = FALSE,
             disabled_reason = $1,
             disabled_date = CURRENT_TIMESTAMP,
             disabled_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE is_enabled = TRUE`,
        [disabledReason, req.user.id]
      );
      counts.prn_ranges_disabled = prnResult.rowCount;

      // 2. Deactivate all student user accounts
      const studentResult = await client.query(
        `UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE role = 'student' AND is_active = TRUE`
      );
      counts.students_deactivated = studentResult.rowCount;

      // 3. Delete jobs (cascades: job_drives, job_eligibility_criteria,
      //    job_requirement_templates, job_applications → job_applications_extended)
      const jobsResult = await client.query('DELETE FROM jobs');
      counts.jobs_deleted = jobsResult.rowCount;

      // 4. Delete job requests (cascades: job_request_requirement_templates)
      const jobRequestsResult = await client.query('DELETE FROM job_requests');
      counts.job_requests_deleted = jobRequestsResult.rowCount;

      // 5. Delete notifications (cascades: notification_recipients, notification_targets)
      const notificationsResult = await client.query('DELETE FROM notifications');
      counts.notifications_deleted = notificationsResult.rowCount;

      // 6. Clear admin notifications
      await client.query('TRUNCATE TABLE admin_notifications RESTART IDENTITY');
      counts.admin_notifications_cleared = true;

      // 7. Delete whitelist requests
      const whitelistResult = await client.query('DELETE FROM whitelist_requests');
      counts.whitelist_requests_deleted = whitelistResult.rowCount;

      // 8. Clear unlock windows (tables may not exist yet)
      const cgpaResult = await safeExec(client, 'TRUNCATE TABLE cgpa_unlock_windows RESTART IDENTITY');
      const backlogResult = await safeExec(client, 'TRUNCATE TABLE backlog_unlock_windows RESTART IDENTITY');
      counts.unlock_windows_cleared = cgpaResult.rowCount !== undefined || backlogResult.rowCount !== undefined;

      // 9. Clear deleted jobs history
      const historyResult = await client.query('DELETE FROM deleted_jobs_history');
      counts.deleted_jobs_history_cleared = historyResult.rowCount;

      // 10. Clear student photo references
      const photoUpdateResult = await client.query(
        `UPDATE students
         SET photo_url = NULL,
             photo_cloudinary_id = NULL,
             photo_deleted_at = CURRENT_TIMESTAMP,
             photo_deleted_by = $1
         WHERE photo_cloudinary_id IS NOT NULL`,
        [req.user.id]
      );
      counts.student_photos_cleared = photoUpdateResult.rowCount;

      // 11. Clear activity logs and insert reset log entry
      await client.query('DELETE FROM activity_logs');
      await client.query(
        `INSERT INTO activity_logs
         (user_id, action_type, action_description, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'ACADEMIC_YEAR_RESET',
          `Academic year reset completed for ${academic_year}`,
          'system',
          null,
          JSON.stringify({
            academic_year,
            counts,
            cloudinary_photos_queued: cloudinaryIds.length,
            completed_at: new Date().toISOString(),
          }),
        ]
      );

      return counts;
    });

    // --- Cloudinary cleanup (outside transaction, non-blocking) ---
    let cloudinaryResult = { deleted: 0, failed: 0, folders_deleted: 0 };

    if (cloudinaryIds.length > 0) {
      const batchSize = 100;
      const foldersToDelete = new Set();

      for (let i = 0; i < cloudinaryIds.length; i += batchSize) {
        const batch = cloudinaryIds.slice(i, i + batchSize);
        try {
          await deleteMultipleImages(batch);
          cloudinaryResult.deleted += batch.length;

          batch.forEach(publicId => {
            const folderPath = extractFolderPath(publicId);
            if (folderPath) foldersToDelete.add(folderPath);
          });
        } catch (err) {
          console.error(`Cloudinary batch ${Math.floor(i / batchSize) + 1} error:`, err);
          cloudinaryResult.failed += batch.length;
        }
      }

      for (const folderPath of foldersToDelete) {
        try {
          await deleteFolderOnly(folderPath);
          cloudinaryResult.folders_deleted++;
        } catch (err) {
          console.error(`Folder delete error (${folderPath}):`, err);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Academic year reset completed for ${academic_year}`,
      data: {
        db_reset: resetCounts,
        cloudinary_cleanup: cloudinaryResult,
      },
    });
  } catch (error) {
    console.error('Academic year reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Academic year reset failed. All database changes have been rolled back.',
      error: error.message,
    });
  }
};

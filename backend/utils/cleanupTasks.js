import { query } from '../config/database.js';
import { deleteMultipleImages, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';

/**
 * How long a refused registration keeps its photo.
 *
 * Long enough that an officer who rejected someone by mistake can still see the
 * photo while sorting it out, short enough that a refused application is not
 * holding a young person's photograph for a year.
 */
export const REJECTED_PHOTO_RETENTION_DAYS = 30;

/**
 * Delete activity logs older than 2 weeks
 * This helps keep the database clean and performant
 */
export const cleanupOldActivityLogs = async () => {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const result = await query(
      'DELETE FROM activity_logs WHERE created_at < $1',
      [twoWeeksAgo]
    );

    console.log(`✅ Cleaned up ${result.rowCount} activity logs older than 2 weeks`);
    return { success: true, deletedCount: result.rowCount };
  } catch (error) {
    console.error('❌ Error cleaning up activity logs:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete the photos of registrations that were refused over 30 days ago.
 *
 * A rejected registration used to keep its photo — and its name, date of birth,
 * address, mobile number and semester marks — indefinitely. Nothing removed it:
 * this job only pruned activity logs, and the one thing that clears student
 * photos is the academic-year reset, which is manual, annual, and clears
 * everyone's. A registration refused in July could sit until the following
 * June.
 *
 * Only the photo goes. The row stays, so the officer's Rejected tab still shows
 * what was refused and why, and the student can still re-register — that path
 * uploads a fresh photo anyway, and deletes whatever the old one was.
 *
 * The row is only cleared for photos Cloudinary confirms are gone. Clearing it
 * on a failed delete would lose the only reference to the asset and orphan it
 * permanently, which is the opposite of the point.
 */
export const cleanupRejectedRegistrationPhotos = async () => {
  try {
    /*
     * COALESCE because rejected_at was added later: rows refused before that
     * have no timestamp, and they are the oldest ones here, so falling back to
     * updated_at keeps them in scope rather than exempting them forever.
     */
    const due = await query(
      `SELECT id, photo_cloudinary_id
         FROM students
        WHERE registration_status = 'rejected'
          AND photo_cloudinary_id IS NOT NULL
          AND COALESCE(rejected_at, updated_at, created_at)
              < CURRENT_TIMESTAMP - ($1 || ' days')::interval`,
      [String(REJECTED_PHOTO_RETENTION_DAYS)]
    );

    if (due.rows.length === 0) {
      console.log('✅ No rejected-registration photos due for deletion');
      return { success: true, deletedCount: 0 };
    }

    let deleted = 0;
    // Chunked: delete_resources takes up to 100 public IDs per call.
    for (let i = 0; i < due.rows.length; i += 100) {
      const batch = due.rows.slice(i, i + 100);
      let outcome;
      try {
        outcome = await deleteMultipleImages(batch.map((r) => r.photo_cloudinary_id));
      } catch (batchError) {
        console.error('❌ Rejected-photo batch delete failed, leaving rows intact:', batchError.message);
        continue;
      }

      // 'deleted' | 'not_found' both mean the asset is not there any more.
      const gone = batch.filter((r) => {
        const state = outcome?.deleted?.[r.photo_cloudinary_id];
        return state === 'deleted' || state === 'not_found';
      });
      if (gone.length === 0) continue;

      await query(
        `UPDATE students
            SET photo_url = NULL,
                photo_cloudinary_id = NULL,
                photo_deleted_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])`,
        [gone.map((r) => r.id)]
      );
      deleted += gone.length;

      // The per-student folder is left empty behind the photo; tidy it away.
      for (const r of gone) {
        const folder = extractFolderPath(r.photo_cloudinary_id);
        if (folder) await deleteFolderOnly(folder).catch(() => {});
      }
    }

    console.log(
      `✅ Deleted ${deleted} photo(s) from registrations refused over ${REJECTED_PHOTO_RETENTION_DAYS} days ago`
    );
    return { success: true, deletedCount: deleted };
  } catch (error) {
    console.error('❌ Error cleaning up rejected-registration photos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run all cleanup tasks
 */
export const runCleanupTasks = async () => {
  console.log('🧹 Running scheduled cleanup tasks...');

  const results = {
    activityLogs: await cleanupOldActivityLogs(),
    rejectedPhotos: await cleanupRejectedRegistrationPhotos(),
  };

  console.log('✅ Cleanup tasks completed');
  return results;
};

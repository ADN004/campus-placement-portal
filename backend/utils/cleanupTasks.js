import { query } from '../config/database.js';

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
 * Run all cleanup tasks
 */
export const runCleanupTasks = async () => {
  console.log('🧹 Running scheduled cleanup tasks...');

  const results = {
    activityLogs: await cleanupOldActivityLogs(),
  };

  console.log('✅ Cleanup tasks completed');
  return results;
};

import { query } from '../config/database.js';
import { runDueCascades } from './applicationLifecycle.js';

/**
 * Daily age update job
 * Updates all student ages based on their date of birth
 * Should be run daily at midnight
 */
export const updateAllStudentAges = async () => {
  try {
    console.log('🔄 Running daily age update job...');

    // Call the database function that updates all ages
    const result = await query('SELECT update_all_student_ages() as updated_count');

    const updatedCount = result.rows[0]?.updated_count || 0;

    console.log(`✅ Age update completed: ${updatedCount} students updated`);

    return {
      success: true,
      updated_count: updatedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error updating student ages:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Refresh materialized views
 * Refreshes active_students_view for better performance
 */
export const refreshMaterializedViews = async () => {
  try {
    console.log('🔄 Refreshing materialized views...');

    await query('SELECT refresh_active_students_view()');

    console.log('✅ Materialized views refreshed');

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error refreshing materialized views:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Close the rounds that have gone quiet.
 *
 * Wraps the sweep so a failure here can never take the scheduler down with it:
 * these tasks run from a bare setInterval with nothing above them to catch a
 * rejected promise, and an unhandled one would stop every later run.
 */
export const closeDueRounds = async () => {
  try {
    console.log('🔄 Closing rounds that have gone quiet...');
    const result = await runDueCascades();
    if (!result.ran) {
      console.log('⏭️  Round closure is switched off — nothing done');
      return { success: true, skipped: true };
    }
    console.log(`✅ Round closure: ${result.affected} application(s) closed`);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Error closing rounds:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule daily cron jobs
 * Sets up daily tasks to run at midnight
 */
export const scheduleDailyCronJobs = () => {
  const scheduleTask = (task, taskName) => {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      0, // midnight hour
      0, // minute
      0 // second
    );
    const msToMidnight = night.getTime() - now.getTime();

    console.log(`⏰ Scheduling ${taskName} to run at midnight (in ${Math.round(msToMidnight / 1000 / 60)} minutes)`);

    setTimeout(() => {
      task();
      // Repeat every 24 hours
      setInterval(task, 24 * 60 * 60 * 1000);
    }, msToMidnight);
  };

  // Schedule age updates
  scheduleTask(updateAllStudentAges, 'age update job');

  // Schedule materialized view refresh
  scheduleTask(refreshMaterializedViews, 'materialized view refresh');

  // Close rounds nobody has touched for the grace period.
  //
  // Safe to run late, early, or twice: the sweep asks which closures are
  // overdue *now* rather than which fell due since it last ran, so a container
  // restart that skips a midnight costs nothing and the next run catches up.
  scheduleTask(closeDueRounds, 'round closure sweep');

  console.log('✅ Cron jobs scheduled successfully');
};

/**
 * Run all maintenance tasks immediately (for testing or manual trigger)
 */
export const runMaintenanceTasks = async () => {
  console.log('🔧 Running maintenance tasks...');

  const results = {
    age_update: await updateAllStudentAges(),
    view_refresh: await refreshMaterializedViews(),
    round_closure: await closeDueRounds(),
  };

  console.log('✅ Maintenance tasks completed');

  return results;
};

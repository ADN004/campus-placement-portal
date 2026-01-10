import { query } from '../config/database.js';

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
  };

  console.log('✅ Maintenance tasks completed');

  return results;
};

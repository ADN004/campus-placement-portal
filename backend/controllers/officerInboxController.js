/**
 * The placement officer's inbox.
 *
 * Deliberately the same shape as the student one (studentController's
 * getNotifications / markNotificationRead) reading the same two tables, so
 * there is one idea of what a notification is in this system rather than two
 * that drift apart. The only difference is who is asking.
 *
 * Every query is scoped by `nr.user_id = req.user.id`. An officer's own rows
 * are the only rows they can read or change: passing someone else's
 * notification id updates nothing rather than reading across colleges.
 */

import { query } from '../config/database.js';

// @desc    Notifications addressed to this officer
// @route   GET /api/placement-officer/inbox
// @access  Private (Placement Officer)
export const getInbox = async (req, res) => {
  try {
    /*
     * Capped at 50, like the student inbox. An officer who has been in place
     * for years would otherwise pull every notification ever addressed to them
     * on each page load, and the screen shows a reverse-chronological list
     * where nobody scrolls past the first few.
     */
    const result = await query(
      `SELECT n.id, n.title, n.message, n.notification_type, n.priority, n.created_at,
              nr.is_read, nr.read_at
         FROM notifications n
         JOIN notification_recipients nr ON n.id = nr.notification_id
        WHERE nr.user_id = $1 AND n.is_active = TRUE
        ORDER BY n.created_at DESC
        LIMIT 50`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Officer inbox error:', error);
    res.status(500).json({ success: false, message: 'Error fetching your notifications' });
  }
};

// @desc    How many are unread (drives the badge)
// @route   GET /api/placement-officer/inbox/unread-count
// @access  Private (Placement Officer)
export const getInboxUnreadCount = async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count
         FROM notification_recipients nr
         JOIN notifications n ON n.id = nr.notification_id
        WHERE nr.user_id = $1 AND nr.is_read = FALSE AND n.is_active = TRUE`,
      [req.user.id]
    );
    res.status(200).json({ success: true, count: result.rows[0].count });
  } catch (error) {
    console.error('Officer inbox unread count error:', error);
    /*
     * A badge is decoration. If counting fails the officer should still get
     * their dashboard, so this answers zero rather than an error the page would
     * have to handle.
     */
    res.status(200).json({ success: true, count: 0 });
  }
};

// @desc    Mark one as read
// @route   PUT /api/placement-officer/inbox/:id/read
// @access  Private (Placement Officer)
export const markInboxRead = async (req, res) => {
  try {
    const result = await query(
      `UPDATE notification_recipients
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1 AND user_id = $2 AND is_read = FALSE`,
      [req.params.id, req.user.id]
    );
    // Already read, or not addressed to them: either way there is nothing to do
    // and nothing went wrong, so this is not an error.
    res.status(200).json({ success: true, updated: result.rowCount });
  } catch (error) {
    console.error('Officer inbox mark read error:', error);
    res.status(500).json({ success: false, message: 'Error updating the notification' });
  }
};

// @desc    Mark everything as read
// @route   PUT /api/placement-officer/inbox/read-all
// @access  Private (Placement Officer)
export const markInboxAllRead = async (req, res) => {
  try {
    const result = await query(
      `UPDATE notification_recipients
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.status(200).json({ success: true, updated: result.rowCount });
  } catch (error) {
    console.error('Officer inbox mark all read error:', error);
    res.status(500).json({ success: false, message: 'Error updating your notifications' });
  }
};

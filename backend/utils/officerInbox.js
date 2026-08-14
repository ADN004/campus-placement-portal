/**
 * Delivering a message to placement officers inside the portal.
 *
 * Officers could send notifications but never receive them, so anything the
 * system needed to tell them had nowhere to go — which is why joint jobs were
 * announced by email or not at all. They have user accounts, and
 * notifications/notification_recipients already delivers per user account, so
 * the inbox is that pair read from the other end rather than a new mechanism.
 *
 * One `notifications` row per event with one `notification_recipients` row per
 * officer: the message is written once and its read state is tracked per
 * person, so one officer marking it read does not clear it for the rest.
 */

import { query as defaultQuery } from '../config/database.js';

/**
 * Writes one notification and addresses it to the given user accounts.
 *
 * `client` lets a caller enlist this in an open transaction; left out, it runs
 * on the pool. Callers already inside a transaction must pass their client, or
 * the insert lands outside it and survives a rollback.
 *
 * `createdBy` is a NOT NULL FK to users — the person whose action caused the
 * message, not the recipients.
 *
 * Returns the notification id, or null when there was nobody to tell. An empty
 * recipient list is normal (a job for one college has no other colleges to
 * notify) and must not write a notification nobody can read.
 */
export const deliverToOfficers = async (
  { userIds, title, message, createdBy, type = 'general', priority = 'normal' },
  client = null
) => {
  const run = client ? client.query.bind(client) : defaultQuery;

  const recipients = [...new Set((userIds || []).filter((id) => Number.isInteger(id)))];
  if (recipients.length === 0) return null;

  const notification = await run(
    `INSERT INTO notifications (title, message, notification_type, priority, created_by, target_type, is_active)
     VALUES ($1, $2, $3, $4, $5, 'specific_colleges', TRUE)
     RETURNING id`,
    [title, message, type, priority, createdBy]
  );
  const notificationId = notification.rows[0].id;

  /*
   * One statement for every recipient rather than a loop of inserts: sixty
   * colleges is sixty round trips otherwise, and inside a transaction that is
   * sixty chances to be holding a lock while the network is slow.
   */
  await run(
    `INSERT INTO notification_recipients (notification_id, user_id)
     SELECT $1, unnest($2::int[])
     ON CONFLICT (notification_id, user_id) DO NOTHING`,
    [notificationId, recipients]
  );

  return notificationId;
};

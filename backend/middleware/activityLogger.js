import { query } from '../config/database.js';

// True only for an Express request object: it exposes a .get() method plus
// at least one request-shaped field. Plain metadata objects (e.g. { prn, reason })
// never match, so this reliably tells the two apart.
const isExpressReq = (x) =>
  !!x &&
  typeof x === 'object' &&
  typeof x.get === 'function' &&
  ('headers' in x || 'method' in x || 'ip' in x);

/*
 * An entity id, or null.
 *
 * The absent cases are tested for before the numeric conversion, because
 * Number(null) and Number('') are both 0 and Number.isInteger(0) is true — so
 * a missing id would be stored as a row pointing at entity 0, which exists
 * nowhere and reads like a real reference.
 */
const asEntityId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

// Log activity to database.
//
// Documented signature:
//   logActivity(userId, actionType, actionDescription, entityType, entityId, req, metadata)
//
// Historically a large number of call sites passed the last two arguments in
// the opposite order — the metadata object where req belongs, and req (or
// nothing) where metadata belongs. That silently dropped ip_address/user_agent
// and either lost the metadata or stored a "circular references" placeholder.
//
// Rather than rewrite ~90 sensitive call sites, we sort the final two arguments
// by shape at runtime: whichever is an Express request becomes req, the other
// becomes metadata. This heals the old miscalls and is order-agnostic for
// future ones. New code should still follow the documented order.
export const logActivity = async (
  userId,
  actionType,
  actionDescription,
  entityType = null,
  entityId = null,
  arg6 = null,
  arg7 = null
) => {
  try {
    // Assign req vs metadata by shape, not by position.
    let req = null;
    let metadata = null;
    if (isExpressReq(arg6)) {
      req = arg6;
      metadata = arg7;
    } else if (isExpressReq(arg7)) {
      req = arg7;
      metadata = arg6;
    } else {
      // Neither argument is a request object — whichever is present is metadata.
      metadata = arg6 ?? arg7 ?? null;
    }

    /*
     * A second historical miscall: some sites omit actionDescription entirely,
     * so every argument after it arrives one position to the left.
     *
     *   logActivity(user, 'UPDATE', 'job_applications', 42, { ... })
     *
     * reads as actionDescription='job_applications', entityType=42,
     * entityId={...} — and entity_id is an integer column, so Postgres rejects
     * the whole insert with "invalid input syntax for type integer". The catch
     * below swallows it, so the action itself succeeds and the audit trail
     * silently loses the row. That is the worst shape for this particular bug:
     * nobody notices until they go looking for a record that was never written.
     *
     * Detected by entityId holding an object where an id belongs, and repaired
     * by shifting the arguments back. Same principle as the sort above, and for
     * the same reason: healing it here fixes every existing call site at once
     * rather than depending on nine of them being found and edited correctly.
     */
    if (entityId !== null && typeof entityId === 'object' && !isExpressReq(entityId)) {
      if (metadata === null || metadata === undefined) metadata = entityId;
      entityId = asEntityId(entityType);
      entityType = typeof actionDescription === 'string' ? actionDescription : null;
      // action_description is NOT NULL, so it always ends up with something:
      // the metadata's own `action` where there is one, else the action type.
      actionDescription = (metadata && typeof metadata.action === 'string')
        ? metadata.action
        : actionType;
    }

    // Extract only non-circular data from req object
    const ipAddress = req ? (req.ip || req.connection?.remoteAddress || null) : null;
    const userAgent = req ? req.get?.('user-agent') || null : null;

    // Safely stringify metadata, handling circular references
    let metadataString = null;
    if (metadata) {
      try {
        metadataString = JSON.stringify(metadata);
      } catch (err) {
        // If metadata has circular references, create a safe version
        console.warn('⚠️ Metadata contains circular references, creating safe version');
        metadataString = JSON.stringify({
          note: 'Original metadata contained circular references'
        });
      }
    }

    await query(
      `INSERT INTO activity_logs
       (user_id, action_type, action_description, entity_type, entity_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        actionType,
        // NOT NULL in the table, so never let a missing one fail the insert.
        actionDescription ?? actionType,
        entityType,
        // Anything that is not a whole number is not an id. Stored as NULL
        // rather than rejected, so a bad argument costs a column and not the
        // entire audit row.
        asEntityId(entityId),
        metadataString,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error('❌ Activity logging error:', error);
    // Don't throw error - logging should not break the main flow
  }
};

// Middleware to automatically log certain actions
export const autoLogActivity = (actionType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      // Only log successful operations
      if (data.success) {
        try {
          await logActivity(
            req.user?.id,
            actionType,
            `${req.method} ${req.originalUrl}`,
            null,
            null,
            { body: req.body, params: req.params },
            req
          );
        } catch (error) {
          console.error('Auto-logging error:', error);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

export default logActivity;

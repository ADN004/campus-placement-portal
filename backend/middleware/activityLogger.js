import { query } from '../config/database.js';

// True only for an Express request object: it exposes a .get() method plus
// at least one request-shaped field. Plain metadata objects (e.g. { prn, reason })
// never match, so this reliably tells the two apart.
const isExpressReq = (x) =>
  !!x &&
  typeof x === 'object' &&
  typeof x.get === 'function' &&
  ('headers' in x || 'method' in x || 'ip' in x);

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
        actionDescription,
        entityType,
        entityId,
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

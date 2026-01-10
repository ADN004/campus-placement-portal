import { query } from '../config/database.js';

// Log activity to database
export const logActivity = async (
  userId,
  actionType,
  actionDescription,
  entityType = null,
  entityId = null,
  req = null,
  metadata = null
) => {
  try {
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

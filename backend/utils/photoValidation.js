/**
 * Student photo validation — shared by registration and the post-approval
 * photo re-upload so both enforce the exact same size limit.
 */

export const MAX_PHOTO_SIZE_MB = 0.5; // 500 KB
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/**
 * Validate a base64-encoded image's decoded size against the limit.
 * Accepts a raw base64 string or a data URI (data:image/...;base64,....).
 */
export const validateImageSize = (base64String) => {
  try {
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    // Decoded size = base64_length * 3 / 4, minus '=' padding chars
    const paddingCount = (base64Data.match(/=/g) || []).length;
    const actualSizeBytes = ((base64Data.length * 3) / 4) - paddingCount;
    const sizeMB = (actualSizeBytes / (1024 * 1024)).toFixed(2);

    if (actualSizeBytes > MAX_PHOTO_SIZE_BYTES) {
      return {
        valid: false,
        message: `Image size (${sizeMB} MB) exceeds maximum allowed size of ${MAX_PHOTO_SIZE_MB} MB`,
        sizeBytes: actualSizeBytes,
      };
    }
    return { valid: true, message: `Image size OK (${sizeMB} MB)`, sizeBytes: actualSizeBytes };
  } catch (error) {
    return { valid: false, message: 'Invalid image format', sizeBytes: 0 };
  }
};

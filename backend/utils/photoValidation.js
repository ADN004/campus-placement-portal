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

/**
 * Formats that can survive into a PDF.
 *
 * PDFKit's doc.image() reads JPEG and PNG and nothing else — a GIF or WebP
 * throws "Unknown image format" at the point the document is drawn, not at the
 * point it was uploaded. For the college logo that means the upload succeeds
 * and the placement poster, which is what the logo is for, fails later with
 * nothing connecting the two.
 *
 * Sniffed from the bytes rather than trusted from the data-URI prefix, since
 * that prefix is whatever the client chose to write.
 */
export const PDF_SAFE_IMAGE_FORMATS = 'PNG or JPG';

export const validateImageFormat = (base64String) => {
  try {
    const data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
    const head = Buffer.from(data.slice(0, 32), 'base64');
    const isPng = head.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (isPng || isJpeg) return { valid: true, message: 'Image format OK' };

    const seen = head.subarray(0, 3).toString('latin1') === 'GIF'
      ? 'a GIF'
      : head.subarray(8, 12).toString('latin1') === 'WEBP'
        ? 'a WebP'
        : 'that format';
    return {
      valid: false,
      message: `Use a ${PDF_SAFE_IMAGE_FORMATS} image — ${seen} cannot be placed on the PDFs this is printed on.`,
    };
  } catch {
    return { valid: false, message: 'That file could not be read as an image.' };
  }
};

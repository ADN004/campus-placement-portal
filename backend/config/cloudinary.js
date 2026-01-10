/**
 * Cloudinary Configuration Module
 *
 * This module configures Cloudinary for image upload and management.
 * Used for student profile photos and placement officer photos.
 *
 * Features:
 * - Image upload with automatic optimization
 * - Image transformation (resize, quality, format)
 * - Single and bulk image deletion
 * - Folder management
 *
 * @module config/cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

/**
 * Configure Cloudinary with credentials from environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true  // Always use HTTPS URLs
});

// ============================================
// IMAGE UPLOAD FUNCTIONS
// ============================================

/**
 * Upload Image to Cloudinary
 *
 * Uploads an image with automatic optimization and transformation.
 * Images are automatically resized, quality-optimized, and format-converted.
 *
 * @async
 * @function uploadImage
 * @param {string} fileBuffer - Base64 encoded image string or file buffer
 * @param {string} [folder='students'] - Cloudinary folder name (students, placement_officers)
 * @param {string} [publicId=null] - Custom public ID for the image (optional)
 * @returns {Promise<Object>} Upload result object
 * @returns {string} return.url - Secure URL of uploaded image
 * @returns {string} return.publicId - Cloudinary public ID for future reference
 * @returns {number} return.width - Image width in pixels
 * @returns {number} return.height - Image height in pixels
 * @returns {string} return.format - Image format (jpg, png, etc.)
 * @throws {Error} If upload fails
 *
 * @example
 * const result = await uploadImage(base64Image, 'students');
 * console.log(result.url); // https://res.cloudinary.com/...
 *
 * @example
 * // Upload with custom public ID
 * const result = await uploadImage(base64Image, 'placement_officers', 'officer_123');
 */
export const uploadImage = async (fileBuffer, folder = 'students', publicId = null) => {
  try {
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      // Image transformations applied automatically
      transformation: [
        { width: 500, height: 500, crop: 'limit' },  // Max dimensions
        { quality: 'auto' },                          // Auto quality optimization
        { fetch_format: 'auto' }                      // Auto format selection (WebP, etc.)
      ]
    };

    // Add custom public ID if provided
    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// ============================================
// IMAGE DELETION FUNCTIONS
// ============================================

/**
 * Delete Single Image from Cloudinary
 *
 * Permanently deletes an image from Cloudinary using its public ID.
 *
 * @async
 * @function deleteImage
 * @param {string} publicId - Cloudinary public ID of the image to delete
 * @returns {Promise<Object>} Deletion result from Cloudinary
 * @returns {string} return.result - 'ok' if successful, 'not found' if image doesn't exist
 * @throws {Error} If deletion fails
 *
 * @example
 * await deleteImage('students/photo_abc123');
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Delete Multiple Images from Cloudinary
 *
 * Bulk deletion of images using an array of public IDs.
 * More efficient than deleting images one by one.
 *
 * @async
 * @function deleteMultipleImages
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Object>} Deletion result with details for each image
 * @returns {Object} return.deleted - Object with deleted image IDs
 * @returns {Object} return.deleted_counts - Count of successfully deleted images
 * @throws {Error} If bulk deletion fails
 *
 * @example
 * const ids = ['students/photo1', 'students/photo2', 'students/photo3'];
 * const result = await deleteMultipleImages(ids);
 * console.log(result.deleted_counts); // { original: 3, derived: 0 }
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary bulk delete error:', error);
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Delete All Images in a Folder
 *
 * Retrieves all images in a folder and deletes them.
 * Useful for batch cleanup operations (e.g., graduated batch photos).
 * Maximum 500 images per call.
 *
 * @async
 * @function deleteFolder
 * @param {string} folderPath - Folder path (e.g., 'students/2024')
 * @returns {Promise<Object>} Deletion result
 * @returns {number} return.deleted - Number of images deleted
 * @returns {string} return.message - Status message
 * @returns {Object} return.result - Detailed deletion result from Cloudinary
 * @throws {Error} If folder deletion fails
 *
 * @example
 * const result = await deleteFolder('students/graduated_2023');
 * console.log(`Deleted ${result.deleted} images`);
 */
export const deleteFolder = async (folderPath) => {
  try {
    // Fetch all resources in the folder (max 500)
    const resources = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500
    });

    if (resources.resources.length === 0) {
      return { deleted: 0, message: 'No images found in folder' };
    }

    // Extract public IDs
    const publicIds = resources.resources.map(resource => resource.public_id);

    // Delete all images in bulk
    const result = await deleteMultipleImages(publicIds);

    return {
      deleted: publicIds.length,
      result
    };
  } catch (error) {
    console.error('❌ Cloudinary folder delete error:', error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
};

/**
 * Delete Empty Folder from Cloudinary
 *
 * Deletes an empty folder from Cloudinary.
 * Use this after deleting all images from a folder to clean up the folder structure.
 *
 * @async
 * @function deleteFolderOnly
 * @param {string} folderPath - Folder path to delete (e.g., 'students/2301150323')
 * @returns {Promise<Object>} Deletion result from Cloudinary
 * @returns {string} return.result - 'ok' if successful
 * @throws {Error} If folder deletion fails
 *
 * @example
 * await deleteFolderOnly('students/2301150323');
 */
export const deleteFolderOnly = async (folderPath) => {
  try {
    const result = await cloudinary.api.delete_folder(folderPath);
    return result;
  } catch (error) {
    // Folder might not exist or already deleted - log but don't throw
    console.warn(`⚠️ Cloudinary folder delete warning for ${folderPath}:`, error.message);
    return { result: 'not_found', message: error.message };
  }
};

/**
 * Extract Folder Path from Cloudinary Public ID
 *
 * Extracts the immediate parent folder path from a Cloudinary public ID.
 * Only returns a folder path if there's a nested folder structure (3+ parts).
 *
 * Examples:
 * - 'students/2301150323_12345' → null (no subfolder, just file in students/)
 * - 'students/2301150323/photo_12345' → 'students/2301150323' (has subfolder)
 * - 'students/2301150323/profile/photo.jpg' → 'students/2301150323/profile' (nested)
 *
 * @function extractFolderPath
 * @param {string} publicId - Cloudinary public ID
 * @returns {string|null} Folder path or null if no subfolder exists
 *
 * @example
 * extractFolderPath('students/2301150323/photo_12345') // returns 'students/2301150323'
 * extractFolderPath('students/2301150323_12345') // returns null
 */
export const extractFolderPath = (publicId) => {
  if (!publicId) return null;

  // Split by '/' to get folder parts
  const parts = publicId.split('/');

  // If there are 3+ parts, there's a nested folder structure
  // Example: students/2301150323/photo_file
  // parts = ['students', '2301150323', 'photo_file']
  // We want to delete 'students/2301150323'
  if (parts.length >= 3) {
    // Remove the last part (filename) and join the rest to get the folder path
    return parts.slice(0, -1).join('/');
  }

  // If only 2 parts (e.g., 'students/photo_file'), no subfolder to delete
  return null;
};

// ============================================
// IMAGE INFORMATION FUNCTIONS
// ============================================

/**
 * Get Image Details from Cloudinary
 *
 * Retrieves metadata and details for a specific image.
 * Useful for verification and debugging.
 *
 * @async
 * @function getImageDetails
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise<Object>} Image details object
 * @returns {string} return.public_id - Public ID of the image
 * @returns {number} return.width - Image width in pixels
 * @returns {number} return.height - Image height in pixels
 * @returns {string} return.format - Image format
 * @returns {number} return.bytes - File size in bytes
 * @returns {string} return.created_at - Upload timestamp
 * @returns {string} return.secure_url - HTTPS URL of the image
 * @throws {Error} If image not found or retrieval fails
 *
 * @example
 * const details = await getImageDetails('students/photo_abc123');
 * console.log(`Image size: ${details.bytes} bytes`);
 */
export const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary get details error:', error);
    throw new Error(`Failed to get image details: ${error.message}`);
  }
};

// ============================================
// EXPORTS
// ============================================

export default cloudinary;

import { useState, useRef } from 'react';
import api from '../services/api';

const CollegeLogoUpload = ({ currentLogoUrl, onLogoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(currentLogoUrl || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 500KB)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      setError('Image size must be less than 500KB');
      return;
    }

    setError('');

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setPreview(base64String);

      // Upload to server
      await uploadLogo(base64String);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (base64Image) => {
    try {
      setUploading(true);
      setError('');

      const response = await api.post('/placement-officer/college/logo', {
        logo: base64Image,
      });

      if (response.data.success) {
        setPreview(response.data.data.logo_url);
        if (onLogoUpdate) {
          onLogoUpdate(response.data.data.logo_url);
        }
        alert('College logo uploaded successfully!');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      setError(error.response?.data?.message || 'Failed to upload logo');
      setPreview(currentLogoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the college logo?')) {
      return;
    }

    try {
      setDeleting(true);
      setError('');

      const response = await api.delete('/placement-officer/college/logo');

      if (response.data.success) {
        setPreview(null);
        if (onLogoUpdate) {
          onLogoUpdate(null);
        }
        alert('College logo deleted successfully!');
      }
    } catch (error) {
      console.error('Logo delete error:', error);
      setError(error.response?.data?.message || 'Failed to delete logo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">College Logo</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload your college logo to be displayed on placement posters and official documents.
        Maximum size: 500KB. Recommended: Square image (500x500px or larger).
      </p>

      {/* Logo Preview */}
      <div className="mb-4">
        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="College Logo"
              className="w-32 h-32 object-contain border-2 border-gray-300 rounded-lg bg-gray-50"
            />
            {(uploading || deleting) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : preview ? (
            'Change Logo'
          ) : (
            'Upload Logo'
          )}
        </button>

        {preview && (
          <button
            onClick={handleDelete}
            disabled={uploading || deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : (
              'Delete Logo'
            )}
          </button>
        )}
      </div>

      {/* Info Note */}
      {preview && (
        <p className="mt-3 text-sm text-green-600">
          ✓ Logo uploaded. It will appear on placement posters and official documents.
        </p>
      )}
    </div>
  );
};

export default CollegeLogoUpload;

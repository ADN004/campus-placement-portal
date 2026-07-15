import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Mail, Save } from 'lucide-react';
import GoogleEmailButton from './GoogleEmailButton';
import usePortalMode from '../hooks/usePortalMode';

/**
 * Update a student's email address (self-service or staff-assisted).
 *
 * Changing the email always restarts verification: the backend regenerates
 * the token and emails a fresh link to the new address. The Google account
 * picker is offered so the corrected address is typo-proof, with manual
 * entry always available.
 *
 * Props:
 *   currentEmail  — shown for reference
 *   studentName   — optional, shown in staff mode
 *   onSubmit      — async (email) => void; throws on failure (parent's API call)
 *   onClose       — close without changes
 */
export default function UpdateStudentEmailModal({ currentEmail, studentName, onSubmit, onClose }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const portalMode = usePortalMode();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter or choose the new email address');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed.toLowerCase());
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900">Update Email Address</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={submitting}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            {studentName && (
              <p className="font-medium text-gray-800 mb-1">{studentName}</p>
            )}
            <p>
              Current email: <span className="font-medium">{currentEmail}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              A fresh verification link will be sent to the new address.
            </p>
          </div>

          <div>
            <label htmlFor="new-student-email" className="block text-sm font-medium text-gray-700 mb-1">
              New email address
            </label>
            <input
              id="new-student-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correct.email@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={submitting}
            />
            <GoogleEmailButton
              clientId={portalMode.googleClientId}
              onEmail={({ email: googleEmail }) => setEmail(googleEmail)}
            />
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !email.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

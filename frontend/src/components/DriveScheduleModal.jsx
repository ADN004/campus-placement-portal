import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DriveScheduleModal = ({ isOpen, onClose, onSave, existingDrive, jobTitle }) => {
  const [formData, setFormData] = useState({
    drive_date: '',
    drive_time: '',
    drive_location: '',
    additional_instructions: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (existingDrive) {
        setFormData({
          drive_date: existingDrive.drive_date ? existingDrive.drive_date.split('T')[0] : '',
          drive_time: existingDrive.drive_time || '',
          drive_location: existingDrive.drive_location || '',
          additional_instructions: existingDrive.additional_instructions || '',
        });
      } else {
        setFormData({ drive_date: '', drive_time: '', drive_location: '', additional_instructions: '' });
      }
    }
  }, [isOpen, existingDrive]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingDrive ? 'Update' : 'Schedule'} Placement Drive
            </h2>
            <p className="text-sm text-gray-600 mt-1">{jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drive Date *
            </label>
            <input
              type="date"
              required
              value={formData.drive_date}
              onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drive Time *
            </label>
            <input
              type="time"
              required
              value={formData.drive_time}
              onChange={(e) => setFormData({ ...formData, drive_time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drive Location *
            </label>
            <input
              type="text"
              required
              value={formData.drive_location}
              onChange={(e) => setFormData({ ...formData, drive_location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Main Auditorium, College Campus"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Instructions (Optional)
            </label>
            <textarea
              rows={4}
              value={formData.additional_instructions}
              onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Bring resume copies, dress code, documents required..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {existingDrive ? 'Update' : 'Schedule'} Drive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriveScheduleModal;

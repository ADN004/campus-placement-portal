import React, { useState, useEffect } from 'react';

const PlacementDetailsForm = ({ isOpen, onClose, onSubmit, application }) => {
  const [formData, setFormData] = useState({
    placement_package: '',
    joining_date: '',
    placement_location: '',
    placement_notes: '',
  });

  useEffect(() => {
    if (application) {
      setFormData({
        placement_package: application.placement_package || '',
        joining_date: application.joining_date ? application.joining_date.split('T')[0] : '',
        placement_location: application.placement_location || '',
        placement_notes: application.placement_notes || '',
      });
    }
  }, [application]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(application.id, formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">Placement Details</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Package (LPA) *
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.placement_package}
            onChange={(e) => setFormData({ ...formData, placement_package: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., 5.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Joining Date *
          </label>
          <input
            type="date"
            required
            value={formData.joining_date}
            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <input
            type="text"
            required
            value={formData.placement_location}
            onChange={(e) => setFormData({ ...formData, placement_location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Bangalore, Karnataka"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.placement_notes}
            onChange={(e) => setFormData({ ...formData, placement_notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Additional placement details..."
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Save Placement Details
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default PlacementDetailsForm;

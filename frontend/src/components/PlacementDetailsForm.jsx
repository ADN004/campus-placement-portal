import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { X } from 'lucide-react';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogFooter,
} from './officer/OfficerDialog';
import {
  PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS,
} from './officer/OfficerUI';

/**
 * Record what a student was actually placed on.
 *
 * `variant="officer"` renders the Register treatment; every other caller gets
 * the original markup, class strings unchanged. State, validation and the
 * submit payload are identical in both.
 */
const PlacementDetailsForm = ({ isOpen, onClose, onSubmit, application, variant }) => {
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

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  if (variant === 'officer') {
    return (
      <Modal
        onClose={onClose}
        labelledBy="placement-details-title"
        overlayClassName={OFFICER_OVERLAY}
        panelClassName={officerPanel('sm')}
      >
        <OfficerDialogHeader
          onClose={onClose}
          id="placement-details-title"
          title="Placement details"
          subtitle={application?.student_name || undefined}
        />
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <FieldLabel htmlFor="placement-package">Package (LPA)</FieldLabel>
              <input
                id="placement-package"
                type="number"
                step="0.01"
                required
                value={formData.placement_package}
                onChange={set('placement_package')}
                className={FIELD_CLASS}
                placeholder="e.g. 5.5"
              />
            </div>
            <div>
              <FieldLabel htmlFor="placement-joining">Joining date</FieldLabel>
              <input
                id="placement-joining"
                type="date"
                required
                value={formData.joining_date}
                onChange={set('joining_date')}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <FieldLabel htmlFor="placement-location">Location</FieldLabel>
              <input
                id="placement-location"
                type="text"
                required
                value={formData.placement_location}
                onChange={set('placement_location')}
                className={FIELD_CLASS}
                placeholder="e.g. Bangalore, Karnataka"
              />
            </div>
            <div>
              <FieldLabel htmlFor="placement-notes">Notes</FieldLabel>
              <textarea
                id="placement-notes"
                rows={3}
                value={formData.placement_notes}
                onChange={set('placement_notes')}
                className={`${FIELD_CLASS} py-2 h-auto`}
                placeholder="Anything worth recording alongside the offer"
              />
              <p className="text-xs text-spc-muted mt-1">Optional.</p>
            </div>
          </div>
          <OfficerDialogFooter>
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit">Save details</PrimaryButton>
          </OfficerDialogFooter>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title="Placement Details"
      panelClassName="bg-white rounded-2xl p-6 border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl"
    >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Placement Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
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
    </Modal>
  );
};

export default PlacementDetailsForm;

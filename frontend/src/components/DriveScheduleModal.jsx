import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from './Modal';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogFooter,
} from './officer/OfficerDialog';
import {
  PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS,
} from './officer/OfficerUI';

/**
 * Schedule or update a placement drive.
 *
 * `variant="officer"` renders the Register treatment; every other caller gets
 * the original markup with its class strings unchanged. Same state, same
 * validation, same payload — including the `min` on the date, which is what
 * stops a drive being scheduled in the past.
 */
const DriveScheduleModal = ({ isOpen, onClose, onSave, existingDrive, jobTitle, variant }) => {
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

  const today = new Date().toISOString().split('T')[0];
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  if (variant === 'officer') {
    return (
      <Modal
        onClose={onClose}
        labelledBy="drive-schedule-title"
        overlayClassName={OFFICER_OVERLAY}
        panelClassName={officerPanel('lg', { scroll: true })}
      >
        <OfficerDialogHeader
          id="drive-schedule-title"
          title={existingDrive ? 'Update placement drive' : 'Schedule placement drive'}
          subtitle={jobTitle}
        />
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 space-y-4">
            <p className="text-spc-xs text-spc-body leading-snug">
              Students who applied to this job will see the date, time and place you enter here.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="drive-date">Date</FieldLabel>
                <input
                  id="drive-date"
                  type="date"
                  required
                  value={formData.drive_date}
                  onChange={set('drive_date')}
                  min={today}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <FieldLabel htmlFor="drive-time">Time</FieldLabel>
                <input
                  id="drive-time"
                  type="time"
                  required
                  value={formData.drive_time}
                  onChange={set('drive_time')}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="drive-location">Where</FieldLabel>
              <input
                id="drive-location"
                type="text"
                required
                value={formData.drive_location}
                onChange={set('drive_location')}
                className={FIELD_CLASS}
                placeholder="e.g. Main Auditorium, College Campus"
              />
            </div>
            <div>
              <FieldLabel htmlFor="drive-instructions">What to bring or know</FieldLabel>
              <textarea
                id="drive-instructions"
                rows={4}
                value={formData.additional_instructions}
                onChange={set('additional_instructions')}
                className={`${FIELD_CLASS} py-2 h-auto leading-relaxed`}
                placeholder="e.g. Bring two resume copies. Formal dress. Carry your ID card."
              />
              <p className="text-xs text-spc-muted mt-1">Optional.</p>
            </div>
          </div>
          <OfficerDialogFooter>
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit">
              {existingDrive ? 'Update drive' : 'Schedule drive'}
            </PrimaryButton>
          </OfficerDialogFooter>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy="drive-schedule-title"
      panelClassName="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-contain"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 id="drive-schedule-title" className="text-2xl font-bold text-gray-900">
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
    </Modal>
  );
};

export default DriveScheduleModal;

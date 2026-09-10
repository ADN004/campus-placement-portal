import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogFooter,
} from './officer/OfficerDialog';
import {
  PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
} from './officer/OfficerUI';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogFooter,
} from './admin/AdminDialog';
import {
  PrimaryButton as AdminPrimary, SecondaryButton as AdminSecondary,
  FieldLabel as AdminFieldLabel, FIELD_CLASS as ADMIN_FIELD_CLASS,
  CHECKBOX_CLASS as ADMIN_CHECKBOX_CLASS,
} from './admin/AdminUI';

/**
 * Schedule or update a placement drive, at one venue or at several.
 *
 * A drive the whole state applies to is not held in one hall: there are five
 * regions, and an officer publishes a venue in each. Which venue a given student
 * attends is settled off the portal, so this composer only asks where and when —
 * it never asks who, because nobody here knows.
 *
 * One venue looks exactly as it did before: no numbering, no remove button, one
 * set of instructions. The extra furniture appears only once a second venue
 * does, so the ordinary case is not taxed for the rare one.
 *
 * The two role branches are one branch. Officer and Console expose the same
 * dialog primitives under the same names, so the set is chosen once and the
 * markup written once — which is the point: a field added for one role cannot
 * then be missing from the other.
 */

/** Matches MAX_DRIVE_SLOTS on the server, which refuses a sixth. */
const MAX_VENUES = 5;

const OFFICER_UI = {
  overlay: OFFICER_OVERLAY,
  panel: officerPanel,
  Header: OfficerDialogHeader,
  Footer: OfficerDialogFooter,
  Primary: PrimaryButton,
  Secondary: SecondaryButton,
  Label: FieldLabel,
  field: FIELD_CLASS,
  checkbox: CHECKBOX_CLASS,
};

const ADMIN_UI = {
  overlay: ADMIN_OVERLAY,
  panel: adminPanel,
  Header: AdminDialogHeader,
  Footer: AdminDialogFooter,
  Primary: AdminPrimary,
  Secondary: AdminSecondary,
  Label: AdminFieldLabel,
  field: ADMIN_FIELD_CLASS,
  checkbox: ADMIN_CHECKBOX_CLASS,
};

const blankVenue = (key) => ({
  key,
  id: null,
  drive_date: '',
  drive_time: '',
  drive_location: '',
  additional_instructions: '',
  has_custom_instructions: false,
});

const DriveScheduleModal = ({
  isOpen, onClose, onSave, existingDrive, existingSlots, jobTitle, variant,
}) => {
  const [venues, setVenues] = useState([blankVenue(0)]);
  const [sharedInstructions, setSharedInstructions] = useState('');

  /*
   * A key per row, so React keeps the right inputs with the right venue when
   * one in the middle is removed. Not the row id: a venue that has never been
   * saved does not have one, and that is exactly when the mistake would show.
   */
  const nextKey = useRef(1);

  useEffect(() => {
    if (!isOpen) return;
    const source = (existingSlots && existingSlots.length > 0)
      ? existingSlots
      : (existingDrive ? [existingDrive] : []);

    if (source.length === 0) {
      setVenues([blankVenue(0)]);
      setSharedInstructions('');
      nextKey.current = 1;
      return;
    }

    setVenues(source.map((slot, i) => ({
      key: i,
      id: slot.id ?? null,
      drive_date: slot.drive_date ? String(slot.drive_date).split('T')[0] : '',
      drive_time: slot.drive_time || '',
      drive_location: slot.drive_location || '',
      additional_instructions: slot.additional_instructions || '',
      has_custom_instructions: slot.has_custom_instructions === true,
    })));
    nextKey.current = source.length;

    // The shared text is stored on every venue that uses it, so any of them can
    // be read back. Where all of them were overridden there is nothing shared.
    const onShared = source.find((slot) => slot.has_custom_instructions !== true);
    setSharedInstructions(onShared?.additional_instructions || '');
  }, [isOpen, existingDrive, existingSlots]);

  if (!isOpen) return null;

  const ui = variant === 'admin' ? ADMIN_UI : OFFICER_UI;
  const today = new Date().toISOString().split('T')[0];
  const many = venues.length > 1;
  const isEdit = Boolean(existingDrive || (existingSlots && existingSlots.length > 0));

  const setVenue = (key, changes) =>
    setVenues((prev) => prev.map((v) => (v.key === key ? { ...v, ...changes } : v)));

  const addVenue = () => {
    if (venues.length >= MAX_VENUES) return;
    const key = nextKey.current;
    nextKey.current += 1;
    setVenues((prev) => [...prev, blankVenue(key)]);
  };

  const removeVenue = (key) =>
    setVenues((prev) => (prev.length > 1 ? prev.filter((v) => v.key !== key) : prev));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      slots: venues.map((v) => ({
        // Sent back so the server updates that row rather than replacing it —
        // a replaced row is a new calendar entry in every student's calendar.
        ...(v.id ? { id: v.id } : {}),
        drive_date: v.drive_date,
        drive_time: v.drive_time,
        drive_location: v.drive_location,
        additional_instructions: v.has_custom_instructions
          ? v.additional_instructions
          : sharedInstructions,
        has_custom_instructions: v.has_custom_instructions,
      })),
    });
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="drive-schedule-title"
      overlayClassName={ui.overlay}
      panelClassName={ui.panel('lg', { scroll: true })}
    >
      <ui.Header
        onClose={onClose}
        id="drive-schedule-title"
        title={isEdit ? 'Update placement drive' : 'Schedule placement drive'}
        subtitle={jobTitle}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 space-y-4">
          <p className="text-spc-xs text-spc-body leading-snug">
            {many
              ? 'Students who applied to this job will see every venue below. Tell them '
                + 'separately which one to attend.'
              : 'Students who applied to this job will see the date, time and place you enter here.'}
          </p>

          {venues.map((venue, index) => (
            <div
              key={venue.key}
              className={many
                ? 'rounded-spc-panel border border-spc-line-strong p-4 space-y-4'
                : 'space-y-4'}
            >
              {/* Numbering and removal only exist once there is more than one. */}
              {many && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">
                    Venue {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeVenue(venue.key)}
                    className="inline-flex items-center gap-1.5 text-spc-xs font-bold
                      text-spc-bad hover:underline underline-offset-2 min-h-[44px] px-1"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <ui.Label htmlFor={`drive-date-${venue.key}`}>Date</ui.Label>
                  <input
                    id={`drive-date-${venue.key}`}
                    type="date"
                    required
                    value={venue.drive_date}
                    onChange={(e) => setVenue(venue.key, { drive_date: e.target.value })}
                    min={today}
                    className={ui.field}
                  />
                </div>
                <div>
                  <ui.Label htmlFor={`drive-time-${venue.key}`}>Time</ui.Label>
                  <input
                    id={`drive-time-${venue.key}`}
                    type="time"
                    required
                    value={venue.drive_time}
                    onChange={(e) => setVenue(venue.key, { drive_time: e.target.value })}
                    className={ui.field}
                  />
                </div>
              </div>

              <div>
                <ui.Label htmlFor={`drive-location-${venue.key}`}>Where</ui.Label>
                <input
                  id={`drive-location-${venue.key}`}
                  type="text"
                  required
                  value={venue.drive_location}
                  onChange={(e) => setVenue(venue.key, { drive_location: e.target.value })}
                  className={ui.field}
                  placeholder="e.g. Main Auditorium, College Campus"
                />
              </div>

              {/*
                * Collapsed by default: venues usually want the same instructions,
                * and an empty box beside each one would suggest otherwise.
                */}
              {many && (
                <div>
                  <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={venue.has_custom_instructions}
                      onChange={(e) => setVenue(venue.key, {
                        has_custom_instructions: e.target.checked,
                        additional_instructions: e.target.checked
                          ? (venue.additional_instructions || sharedInstructions)
                          : '',
                      })}
                      className={ui.checkbox}
                    />
                    <span className="text-spc-xs text-spc-ink">
                      Different instructions for this venue
                    </span>
                  </label>
                  {venue.has_custom_instructions && (
                    <textarea
                      rows={3}
                      value={venue.additional_instructions}
                      onChange={(e) => setVenue(venue.key, {
                        additional_instructions: e.target.value,
                      })}
                      className={`${ui.field} py-2 h-auto leading-relaxed`}
                      placeholder="What students coming to this venue need to know."
                      aria-label={`Instructions for venue ${index + 1}`}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          <div>
            <ui.Secondary
              type="button"
              onClick={addVenue}
              disabled={venues.length >= MAX_VENUES}
            >
              <Plus size={15} aria-hidden="true" />
              Add another venue
            </ui.Secondary>
            <p className="text-xs text-spc-muted mt-1.5">
              {venues.length >= MAX_VENUES
                ? `${MAX_VENUES} venues is the most one drive can have.`
                : `Optional — up to ${MAX_VENUES}, one per region.`}
            </p>
          </div>

          <div>
            <ui.Label htmlFor="drive-instructions">
              {many ? 'What to bring or know (all venues)' : 'What to bring or know'}
            </ui.Label>
            <textarea
              id="drive-instructions"
              rows={4}
              value={sharedInstructions}
              onChange={(e) => setSharedInstructions(e.target.value)}
              className={`${ui.field} py-2 h-auto leading-relaxed`}
              placeholder="e.g. Bring two resume copies. Formal dress. Carry your ID card."
            />
            <p className="text-xs text-spc-muted mt-1">
              {many
                ? 'Optional. Used for every venue except the ones you gave their own.'
                : 'Optional.'}
            </p>
          </div>
        </div>

        <ui.Footer>
          <ui.Secondary type="button" onClick={onClose}>Cancel</ui.Secondary>
          <ui.Primary type="submit">
            {isEdit ? 'Update drive' : 'Schedule drive'}
          </ui.Primary>
        </ui.Footer>
      </form>
    </Modal>
  );
};

export default DriveScheduleModal;

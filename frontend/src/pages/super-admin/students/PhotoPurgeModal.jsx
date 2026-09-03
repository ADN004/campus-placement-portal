import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/**
 * Delete student photographs in bulk.
 *
 * Three ways to name the students: a list of PRNs, a PRN range, or the dates the
 * photographs were uploaded. The three are exclusive — the payload carries only
 * the fields for the chosen one — so they are three modes rather than three
 * boxes that can be filled at once.
 *
 * The warning is not decoration. This removes the file from Cloudinary and the
 * row's reference to it; there is no copy to restore from. A second confirmation
 * follows on the way out, which is deliberate.
 */
const MODES = [
  ['single_prn', 'Named PRNs', 'One or more, comma-separated'],
  ['prn_range', 'PRN range', 'Everything between two PRNs'],
  ['date_range', 'Upload date', 'Everything uploaded between two dates'],
];

export default function PhotoPurgeModal({ mode, onMode, data, onChange, onConfirm, onClose, processing }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="photo-purge-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="photo-purge-title"
        title="Delete student photographs"
        subtitle="In bulk, by PRN or by upload date"
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-spc-xs text-spc-ink font-semibold">Permanent</p>
            <p className="text-spc-xs text-spc-body mt-0.5">
              The image files are removed from storage and from the student records. There is no
              copy to restore from — the students have to upload again.
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>Which students</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MODES.map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => onMode(value)}
                aria-pressed={mode === value}
                className={`flex flex-col gap-0.5 p-3 min-h-[44px] text-left rounded-spc-admin-sm border
                  transition-colors ${mode === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}
              >
                <span className="text-spc-sm font-bold text-spc-ink">{label}</span>
                <span className="text-spc-xs text-spc-body">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {mode === 'single_prn' && (
          <div>
            <FieldLabel htmlFor="purge-prn-list">PRNs</FieldLabel>
            <textarea
              id="purge-prn-list"
              rows="3"
              className={FIELD_CLASS}
              value={data.prn_list}
              onChange={(e) => onChange('prn_list', e.target.value)}
              placeholder="e.g. 2301150001, 2301150002, 2301150003"
            />
            <p className="text-spc-xs text-spc-body mt-1.5">
              Separate them with commas. Spaces around them are fine.
            </p>
          </div>
        )}

        {mode === 'prn_range' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="purge-prn-start">From PRN</FieldLabel>
              <input id="purge-prn-start" type="text" className={FIELD_CLASS}
                value={data.prn_range_start}
                onChange={(e) => onChange('prn_range_start', e.target.value)}
                placeholder="e.g. 2301150001" />
            </div>
            <div>
              <FieldLabel htmlFor="purge-prn-end">To PRN</FieldLabel>
              <input id="purge-prn-end" type="text" className={FIELD_CLASS}
                value={data.prn_range_end}
                onChange={(e) => onChange('prn_range_end', e.target.value)}
                placeholder="e.g. 2301150100" />
            </div>
            <p className="text-spc-xs text-spc-body sm:col-span-2">
              Both ends included. Every student whose PRN falls between them loses their photograph.
            </p>
          </div>
        )}

        {mode === 'date_range' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="purge-date-start">Uploaded on or after</FieldLabel>
              <input id="purge-date-start" type="date" className={FIELD_CLASS}
                value={data.date_start}
                onChange={(e) => onChange('date_start', e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="purge-date-end">Uploaded on or before</FieldLabel>
              <input id="purge-date-end" type="date" className={FIELD_CLASS}
                value={data.date_end}
                onChange={(e) => onChange('date_end', e.target.value)} />
            </div>
            <p className="text-spc-xs text-spc-body sm:col-span-2">
              Both days included. This is the date the photograph was uploaded, not the date the
              student registered.
            </p>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Deleting…' : 'Delete photographs'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

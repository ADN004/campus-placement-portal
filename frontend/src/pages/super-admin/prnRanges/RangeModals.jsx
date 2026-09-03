import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { getPassoutYearOptions } from '../../../utils/passoutYears';

/**
 * The three dialogs on the PRN Ranges page, on `components/Modal.jsx` — which
 * brings the focus trap, Escape, the scroll lock and focus restore the hand-
 * rolled overlays here did not have.
 *
 * Every field, every helper sentence and every validation rule is carried over
 * word for word. Only the shell changed.
 */

/** A range of PRNs, or the same dialog reopened to edit one. */
export function RangeDialog({ editing, formData, onChange, onSubmit, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="range-dialog-title"
      panelClassName={adminPanel('md', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="range-dialog-title"
        title={editing ? 'Edit PRN range' : 'Add PRN range'}
        subtitle="A span of PRNs allowed to register"
        onClose={onClose}
      />
      <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
        <AdminDialogBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="range-start">Range start *</FieldLabel>
              <input
                id="range-start"
                type="text"
                className={FIELD_CLASS}
                value={formData.range_start}
                onChange={(e) => onChange({ range_start: e.target.value })}
                placeholder="e.g., 2301150100"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="range-end">Range end *</FieldLabel>
              <input
                id="range-end"
                type="text"
                className={FIELD_CLASS}
                value={formData.range_end}
                onChange={(e) => onChange({ range_end: e.target.value })}
                placeholder="e.g., 2301150999"
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="range-year">Passout year (optional)</FieldLabel>
            <select
              id="range-year"
              className={FIELD_CLASS}
              value={formData.year}
              onChange={(e) => onChange({ year: e.target.value })}
            >
              <option value="">Select passout year</option>
              {getPassoutYearOptions(formData.year).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="range-exceptions">Excepted PRNs (optional)</FieldLabel>
            <input
              id="range-exceptions"
              type="text"
              className={FIELD_CLASS}
              value={formData.exceptions}
              onChange={(e) => onChange({ exceptions: e.target.value })}
              placeholder="PRNs inside this range that must NOT register — comma separated, e.g., 2301150105, 2301150110"
            />
            <p className="text-spc-xs text-spc-body mt-1.5">
              These PRNs are fully blocked from registering — no other range or single-PRN entry
              can override this. To re-allow one, remove it from this list.
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="range-description">Description (optional)</FieldLabel>
            <input
              id="range-description"
              type="text"
              className={FIELD_CLASS}
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="e.g., 2023 Batch Computer Engineering"
            />
          </div>
        </AdminDialogBody>
        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {editing ? 'Save changes' : 'Add range'}
          </PrimaryButton>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

/** One PRN on its own, for an admission that falls outside every range. */
export function SinglePrnDialog({ editing, formData, onChange, onSubmit, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="single-dialog-title"
      panelClassName={adminPanel('md', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="single-dialog-title"
        title={editing ? 'Edit single PRN' : 'Add single PRN'}
        subtitle="One PRN allowed to register on its own"
        onClose={onClose}
      />
      <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
        <AdminDialogBody className="space-y-4">
          <div>
            <FieldLabel htmlFor="single-prn">PRN *</FieldLabel>
            <input
              id="single-prn"
              type="text"
              className={FIELD_CLASS}
              value={formData.single_prn}
              onChange={(e) => onChange({ single_prn: e.target.value })}
              placeholder="e.g., 2301150323"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="single-year">Passout year (optional)</FieldLabel>
            <select
              id="single-year"
              className={FIELD_CLASS}
              value={formData.year}
              onChange={(e) => onChange({ year: e.target.value })}
            >
              <option value="">Select passout year</option>
              {getPassoutYearOptions(formData.year).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="single-description">Description (optional)</FieldLabel>
            <input
              id="single-description"
              type="text"
              className={FIELD_CLASS}
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="e.g., Special admission"
            />
          </div>
        </AdminDialogBody>
        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {editing ? 'Save changes' : 'Add PRN'}
          </PrimaryButton>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

/**
 * Disabling a range, which needs a reason.
 *
 * The consequence is spelled out because it is not obvious from the button:
 * every student whose PRN falls inside a disabled range is blocked from
 * registering while it stays disabled.
 */
export function DisableDialog({ range, reason, onReasonChange, onConfirm, onClose, submitting }) {
  const label = range.single_prn || `${range.range_start} to ${range.range_end}`;
  return (
    <Modal
      onClose={onClose}
      labelledBy="disable-dialog-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="disable-dialog-title"
        title="Disable this range"
        subtitle="A reason is required and is kept for the audit trail"
        onClose={onClose}
      />
      <div className="px-5 py-4 space-y-4">
        <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          <p className="text-spc-xs text-spc-body">PRN range</p>
          <p className="text-spc-sm font-bold text-spc-ink tabular-nums break-words">{label}</p>
        </div>

        <div>
          <FieldLabel htmlFor="disable-reason">Reason *</FieldLabel>
          <textarea
            id="disable-reason"
            rows="3"
            className={FIELD_CLASS}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Provide a detailed reason for disabling this PRN range..."
            required
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            This reason will be stored for future reference and audit purposes.
          </p>
        </div>

        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <p className="text-spc-xs text-spc-ink font-semibold">
            Students with PRNs in this range will not be able to register while it is disabled.
          </p>
        </div>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Disabling…' : 'Disable range'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

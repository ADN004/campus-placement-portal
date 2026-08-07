import Modal from '../../../components/Modal';
import { Download } from 'lucide-react';
import { OfficerDialogClose } from '../../../components/officer/OfficerDialog';
import { getPassoutYearOptions } from '../../../utils/passoutYears';
import {
  PrimaryButton, SecondaryButton, DangerButton, FieldLabel, FIELD_CLASS, EmptyState,
} from '../../../components/officer/OfficerUI';

const PANEL = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md';
const PANEL_WIDE =
  'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-2xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

function Dialog({ id, title, subtitle, onClose, children, wide = false }) {
  return (
    <Modal onClose={onClose} labelledBy={id}
      panelClassName={wide ? PANEL_WIDE : PANEL} overlayClassName={OVERLAY} closeOnBackdrop>
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
        <div className="min-w-0">
          <h2 id={id} className="text-spc-h2 font-bold text-spc-ink">{title}</h2>
          {subtitle && <p className="text-xs text-spc-muted mt-0.5">{subtitle}</p>}
        </div>
        <OfficerDialogClose onClose={onClose} />
      </div>
      {children}
    </Modal>
  );
}

/**
 * Passout year.
 *
 * A dropdown, not a text box. The redesign turned this into a free-text input
 * with a placeholder, which lost two things: the list of years staff are meant
 * to choose from (this year through five ahead, with the current one marked),
 * and any guarantee the value is a year at all. Both forms and the container's
 * validation treat this as required, so it is `required` here too.
 *
 * getPassoutYearOptions also folds in whatever year is already selected, so
 * editing an old range does not silently blank its year just because it has
 * fallen out of the default window.
 */
function PassoutYearSelect({ id, value, onChange }) {
  return (
    <select id={id} name="year" required className={FIELD_CLASS} value={value || ''} onChange={onChange}>
      <option value="">Select passout year</option>
      {getPassoutYearOptions(value).map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function Footer({ children }) {
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line flex-shrink-0">
      {children}
    </div>
  );
}

/** Add or edit a span of PRNs. */
export function RangeFormModal({ editing, formData, onChange, onSubmit, onClose }) {
  const set = (key, value) => onChange({ ...formData, [key]: value });
  return (
    <Dialog
      id="prn-range-title"
      title={editing ? 'Edit PRN range' : 'Add PRN range'}
      subtitle="Students whose PRN falls inside an enabled range may register."
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="prn-start">Start PRN</FieldLabel>
              <input id="prn-start" name="start_prn" type="text" required className={FIELD_CLASS}
                value={formData.start_prn} onChange={(e) => set('start_prn', e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="prn-end">End PRN</FieldLabel>
              <input id="prn-end" name="end_prn" type="text" required className={FIELD_CLASS}
                value={formData.end_prn} onChange={(e) => set('end_prn', e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="prn-year">Passout year</FieldLabel>
            <PassoutYearSelect id="prn-year" value={formData.year}
              onChange={(e) => set('year', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="prn-description">Description</FieldLabel>
            <input id="prn-description" name="description" type="text" className={FIELD_CLASS}
              value={formData.description} onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. 2023 intake, Computer Engineering" />
          </div>
          <div>
            <FieldLabel htmlFor="prn-exceptions">Excepted PRNs</FieldLabel>
            <input id="prn-exceptions" name="exceptions" type="text" className={FIELD_CLASS}
              value={formData.exceptions} onChange={(e) => set('exceptions', e.target.value)}
              placeholder="Comma-separated, e.g. 2301080428, 2301080431" />
            <p className="text-xs text-spc-muted mt-1">
              These stay out of the range even though they fall between its start and end.
            </p>
          </div>
        </div>
        <Footer>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit">{editing ? 'Update range' : 'Add range'}</PrimaryButton>
        </Footer>
      </form>
    </Dialog>
  );
}

/** Add or edit one specific PRN. */
export function SinglePrnModal({ editing, formData, onChange, onSubmit, onClose }) {
  const set = (key, value) => onChange({ ...formData, [key]: value });
  return (
    <Dialog
      id="prn-single-title"
      title={editing ? 'Edit single PRN' : 'Add a single PRN'}
      subtitle="For one student who falls outside every range."
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="px-5 py-4 space-y-4">
          <div>
            <FieldLabel htmlFor="prn-single">PRN</FieldLabel>
            <input id="prn-single" name="single_prn" type="text" required className={FIELD_CLASS}
              value={formData.single_prn} onChange={(e) => set('single_prn', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="prn-single-year">Passout year</FieldLabel>
            <PassoutYearSelect id="prn-single-year" value={formData.year}
              onChange={(e) => set('year', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="prn-single-description">Description</FieldLabel>
            <input id="prn-single-description" name="description" type="text" className={FIELD_CLASS}
              value={formData.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
        <Footer>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit">{editing ? 'Update PRN' : 'Add PRN'}</PrimaryButton>
        </Footer>
      </form>
    </Dialog>
  );
}

/**
 * Disabling a range deactivates the accounts of every student inside it, so the
 * dialog says so plainly and asks for a reason before it will proceed.
 */
export function DisableRangeModal({ range, reason, onReasonChange, onConfirm, onClose }) {
  const label = range.single_prn || `${range.start_prn} – ${range.end_prn}`;
  return (
    <Dialog id="prn-disable-title" title="Disable this PRN range" onClose={onClose}>
      <div className="px-5 py-4">
        <p className="text-spc-xs text-spc-body">
          Disabling <span className="font-bold text-spc-ink tabular-nums">{label}</span> deactivates
          the accounts of every student whose PRN falls inside it. They will not be able to sign in
          until it is enabled again.
        </p>
        <div className="mt-4">
          <FieldLabel htmlFor="prn-disable-reason">Reason</FieldLabel>
          <textarea id="prn-disable-reason" rows="3" className={`${FIELD_CLASS} py-2 h-auto`}
            value={reason} onChange={onReasonChange}
            placeholder="Why is this range being disabled?" />
        </div>
      </div>
      <Footer>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm}>Disable range</DangerButton>
      </Footer>
    </Dialog>
  );
}

/** The students a range covers, with the export the page already offered. */
export function RangeStudentsModal({
  range, students, loading, exporting, showExportMenu, onToggleExportMenu, onExport, onClose,
}) {
  const label = range.single_prn || `${range.start_prn} – ${range.end_prn}`;
  return (
    <Dialog id="prn-students-title" title="Students in this range" subtitle={label} onClose={onClose} wide>
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-spc-line flex-shrink-0">
        <p className="text-spc-xs text-spc-muted">
          <span className="tabular-nums font-bold text-spc-ink">{students.length}</span> student
          {students.length === 1 ? '' : 's'}
        </p>
        <div className="relative">
          <SecondaryButton onClick={onToggleExportMenu} disabled={exporting || students.length === 0}>
            <Download size={15} aria-hidden="true" />
            <span>{exporting ? 'Exporting…' : 'Export'}</span>
          </SecondaryButton>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleExportMenu} />
              <div role="menu" className="absolute right-0 mt-2 w-48 z-20 bg-spc-surface
                border border-spc-line-strong rounded-spc-panel overflow-hidden">
                {[['excel', 'Export as Excel'], ['pdf', 'Export as PDF']].map(([fmt, text], i) => (
                  <button key={fmt} role="menuitem" onClick={() => onExport(fmt)}
                    className={`w-full px-4 py-3 min-h-[48px] text-left text-spc-xs font-bold
                      text-spc-ink hover:bg-spc-surface-2 transition-colors
                      ${i > 0 ? 'border-t border-spc-line' : ''}`}>
                    {text}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto spc-scroll-contain">
        {loading ? (
          <EmptyState>Loading students…</EmptyState>
        ) : students.length === 0 ? (
          <EmptyState>No students have registered within this range yet.</EmptyState>
        ) : (
          <ul>
            {students.map((student) => (
              <li key={student.id} className="px-5 py-3 border-b border-spc-line last:border-b-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-spc-xs font-bold text-spc-ink tabular-nums flex-shrink-0">
                    {student.prn}
                  </span>
                  <span className="text-spc-sm font-bold text-spc-ink truncate">
                    {student.name || student.student_name || '–'}
                  </span>
                </div>
                <p className="text-xs text-spc-muted mt-0.5 truncate">{student.email}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Footer>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </Footer>
    </Dialog>
  );
}

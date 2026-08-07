import Modal from '../../../components/Modal';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  PrimaryButton, SecondaryButton, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, CheckRow,
} from '../../../components/officer/OfficerUI';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../../constants/branches';
import { OfficerDialogClose } from '../../../components/officer/OfficerDialog';

/**
 * The three dialogs that belong to JobEligibleStudents itself.
 *
 * Unlike the six on this page that are shared components (student details,
 * drive schedule, enhanced filters, placement details, PDF fields, manual add),
 * these are page-local, so they convert now rather than waiting for the shared
 * variant pass.
 *
 * All three go through components/Modal.jsx — focus trap, Escape, body scroll
 * lock, focus restore. The originals used a hand-rolled overlay plus a separate
 * ModalScrollLock component and trapped nothing.
 */

const PANEL = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md';
const PANEL_WIDE =
  'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-2xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

function Dialog({ id, title, subtitle, onClose, children, wide = false }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy={id}
      panelClassName={wide ? PANEL_WIDE : PANEL}
      overlayClassName={OVERLAY}
      closeOnBackdrop
    >
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

function Footer({ children }) {
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line flex-shrink-0">
      {children}
    </div>
  );
}

/* ---------------------------------------------------------- export options */

/** One export choice: icon, what it is, what you get. */
function ExportChoice({ icon: Icon, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left
        border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors"
    >
      <Icon size={18} className="text-spc-body flex-shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-spc-xs font-bold text-spc-ink">{title}</span>
        <span className="block text-xs text-spc-muted">{hint}</span>
      </span>
    </button>
  );
}

function GroupLabel({ children }) {
  return (
    <p className="px-4 pt-3 pb-1 text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
      {children}
    </p>
  );
}

export function ExportOptionsModal({
  isHost, jobCollegeCount, exportCollegeIds, onOpenCollegePicker,
  onExportExcel, onExportPdf, onEnhancedExport, onExportNotApplied,
  placedCount, includePlaced, onIncludePlacedChange,
  onClose,
}) {
  return (
    <Dialog id="export-options-title" title="Export options" onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto spc-scroll-contain">
        {isHost && jobCollegeCount > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-spc-line">
            <p className="text-spc-xs font-bold text-spc-ink">Filter by college</p>
            <SecondaryButton className="min-h-[40px] px-3" onClick={onOpenCollegePicker}>
              {exportCollegeIds.length === 0
                ? `All ${jobCollegeCount} colleges`
                : `${exportCollegeIds.length} / ${jobCollegeCount} selected`}
            </SecondaryButton>
          </div>
        )}

        <GroupLabel>Basic export</GroupLabel>
        <ExportChoice
          icon={FileSpreadsheet}
          title="Export as Excel"
          hint="Basic applicant list"
          onClick={onExportExcel}
        />
        <ExportChoice
          icon={FileText}
          title="Export as PDF"
          hint="Basic report format"
          onClick={onExportPdf}
        />

        <GroupLabel>Enhanced export</GroupLabel>
        <ExportChoice
          icon={FileText}
          title="Enhanced PDF"
          hint="Comprehensive report with field selection"
          onClick={onEnhancedExport}
        />

        <GroupLabel>Not-applied students</GroupLabel>
        <ExportChoice
          icon={FileText}
          title="Not-applied — PDF"
          hint={`Eligible students who haven't applied yet${isHost ? ', all colleges' : ''}`}
          onClick={onExportNotApplied}
        />

        {placedCount > 0 && (
          <div className="px-4 border-t border-spc-line">
            <CheckRow checked={includePlaced} onChange={onIncludePlacedChange}>
              <span className="font-bold text-spc-ink">Include already placed students.</span>{' '}
              {placedCount} student(s) already placed at other companies.
            </CheckRow>
          </div>
        )}
      </div>

      <Footer>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </Footer>
    </Dialog>
  );
}

/* --------------------------------------------------------- college picker */

export function CollegePickerModal({
  jobColleges, exportCollegeIds, onToggle, onSelectAll, onClear, onApply, onResetAndClose,
}) {
  return (
    <Dialog
      id="college-picker-title"
      title="Select colleges for export"
      subtitle="Leave all unchecked to export from every college"
      onClose={onResetAndClose}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-spc-xs font-bold text-spc-ink">
            <span className="tabular-nums">{jobColleges.length}</span> colleges in this drive
          </p>
          <div className="flex items-center gap-2">
            <SecondaryButton className="min-h-[36px] px-2" onClick={onSelectAll}>
              Select all
            </SecondaryButton>
            <SecondaryButton className="min-h-[36px] px-2" onClick={onClear}>
              Clear
            </SecondaryButton>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto spc-scroll-contain border border-spc-line rounded-spc-control">
          {jobColleges.map((college) => (
            <label
              key={college.id}
              className="flex items-center gap-3 px-3 min-h-[48px] cursor-pointer
                border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors"
            >
              <input
                type="checkbox"
                checked={exportCollegeIds.includes(Number(college.id))}
                onChange={() => onToggle(Number(college.id))}
                className={CHECKBOX_CLASS}
              />
              <span className="text-spc-xs text-spc-body min-w-0 break-words">
                {college.college_name}
              </span>
            </label>
          ))}
        </div>

        {exportCollegeIds.length > 0 && (
          <p className="text-xs text-spc-muted mt-2">
            <span className="tabular-nums font-bold text-spc-ink">{exportCollegeIds.length}</span>{' '}
            college(s) selected
          </p>
        )}
      </div>

      <Footer>
        <SecondaryButton onClick={onResetAndClose}>Reset &amp; close</SecondaryButton>
        <PrimaryButton onClick={onApply}>Apply</PrimaryButton>
      </Footer>
    </Dialog>
  );
}

/* -------------------------------------------------------------- edit job */

/**
 * Host-only job editor. Same fields, same validation cue (at least one branch),
 * same save handler as before.
 */
export function EditJobModal({ data, onChange, onSave, saving, onClose }) {
  const set = (key, value) => onChange({ ...data, [key]: value });
  const branches = data.allowed_branches || [];
  const semesters = data.allowed_backlog_semesters || [];

  return (
    <Dialog id="edit-job-title" title="Edit job" onClose={onClose} wide>
      <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="edit-title">Job title *</FieldLabel>
            <input id="edit-title" type="text" className={FIELD_CLASS}
              value={data.title || ''} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-company">Company name *</FieldLabel>
            <input id="edit-company" type="text" className={FIELD_CLASS}
              value={data.company_name || ''} onChange={(e) => set('company_name', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-location">Location</FieldLabel>
            <input id="edit-location" type="text" className={FIELD_CLASS}
              value={data.location || ''} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-package">Salary package</FieldLabel>
            <input id="edit-package" type="text" className={FIELD_CLASS} placeholder="e.g. 6 LPA"
              value={data.salary_package || ''} onChange={(e) => set('salary_package', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-vacancies">No. of vacancies</FieldLabel>
            <input id="edit-vacancies" type="number" min="1" className={FIELD_CLASS}
              value={data.no_of_vacancies || ''} onChange={(e) => set('no_of_vacancies', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-deadline">Application deadline *</FieldLabel>
            <input id="edit-deadline" type="date" className={FIELD_CLASS}
              value={data.application_deadline || ''} onChange={(e) => set('application_deadline', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-cgpa">Min CGPA</FieldLabel>
            <input id="edit-cgpa" type="number" step="0.01" min="0" max="10" className={FIELD_CLASS}
              placeholder="e.g. 6.5"
              value={data.min_cgpa || ''} onChange={(e) => set('min_cgpa', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-backlogs">Max backlogs allowed</FieldLabel>
            <input id="edit-backlogs" type="number" min="0" className={FIELD_CLASS}
              value={data.max_backlogs || ''} onChange={(e) => set('max_backlogs', e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="edit-form-url">Application form URL</FieldLabel>
          <input id="edit-form-url" type="url" className={FIELD_CLASS} placeholder="https://…"
            value={data.application_form_url || ''} onChange={(e) => set('application_form_url', e.target.value)} />
        </div>

        <div>
          <FieldLabel htmlFor="edit-description">Job description *</FieldLabel>
          <textarea id="edit-description" rows={4} className={`${FIELD_CLASS} py-2 h-auto resize-none`}
            value={data.description || ''} onChange={(e) => set('description', e.target.value)} />
        </div>

        <fieldset>
          <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Allowed backlog semesters
            <span className="ml-2 font-semibold normal-case tracking-normal text-spc-muted">
              (leave unchecked for any)
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <label
                key={sem}
                className="flex items-center gap-2 min-h-[44px] px-3 rounded-spc-control
                  border border-spc-control cursor-pointer hover:bg-spc-surface-2 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={semesters.includes(sem)}
                  onChange={() =>
                    set(
                      'allowed_backlog_semesters',
                      semesters.includes(sem)
                        ? semesters.filter((s) => s !== sem)
                        : [...semesters, sem].sort((a, b) => a - b)
                    )
                  }
                  className={CHECKBOX_CLASS}
                />
                <span className="text-spc-xs font-bold text-spc-ink">Sem {sem}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Allowed branches *
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 max-h-52 overflow-y-auto
            spc-scroll-contain border border-spc-line rounded-spc-control px-3">
            {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
              <label key={branch} className="flex items-center gap-2 min-h-[40px] cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  checked={branches.includes(branch)}
                  onChange={() =>
                    set(
                      'allowed_branches',
                      branches.includes(branch)
                        ? branches.filter((b) => b !== branch)
                        : [...branches, branch]
                    )
                  }
                  className={CHECKBOX_CLASS}
                />
                <span className="text-xs text-spc-body truncate">{branch}</span>
              </label>
            ))}
          </div>
          {branches.length === 0 && (
            <p className="text-xs text-spc-bad font-bold mt-1">Please select at least one branch.</p>
          )}
        </fieldset>
      </div>

      <Footer>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </Footer>
    </Dialog>
  );
}

import Modal from '../../../components/Modal';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  PrimaryButton, SecondaryButton, DangerButton, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, CheckRow,
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
  barredCount = 0,
  onClose,
}) {
  return (
    <Dialog id="export-options-title" title="Export options" onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto spc-scroll-contain">
        {/*
          * The list shows applicants who have since been blacklisted or lost
          * their approval; the exports leave them out, which is the right
          * default for a file that goes to a company. Said here so the row
          * count in the file is not a surprise.
          */}
        {barredCount > 0 && (
          <p className="text-spc-xs text-spc-body bg-spc-warn-bg border-b border-spc-warn/40
            px-4 py-3">
            {barredCount} applicant{barredCount === 1 ? '' : 's'} shown in the list
            {barredCount === 1 ? ' is' : ' are'} left out of every export —
            {barredCount === 1 ? ' their' : ' their'} account is blacklisted or no longer approved.
          </p>
        )}
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
const FIELD_LOCKED = 'opacity-60 cursor-not-allowed bg-spc-surface-2';

export function EditJobModal({ data, onChange, onSave, saving, applicantCount = 0, onClose }) {
  const set = (key, value) => onChange({ ...data, [key]: value });
  /*
   * Who may apply cannot change once someone has. Shown rather than enforced
   * silently: the fields stay visible so the officer can still read what the
   * rules are, but they are disabled and the reason is stated once, above them.
   * The container also omits these from the payload, so a title edit on a job
   * with applicants is not refused for a field nobody touched.
   */
  const eligibilityLocked = applicantCount > 0;
  const lockedField = eligibilityLocked ? ` ${FIELD_LOCKED}` : '';
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
          <div className={eligibilityLocked ? 'col-span-2' : 'contents'}>
            {eligibilityLocked && (
              <p className="text-spc-xs text-spc-body bg-spc-warn-bg border border-spc-warn/40
                rounded-spc-control px-3 py-2 mb-3">
                {applicantCount} student{applicantCount === 1 ? ' has' : 's have'} already applied,
                so who is eligible can no longer be changed — they applied under these rules.
                Everything else here can still be edited.
              </p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="edit-cgpa">Min CGPA</FieldLabel>
            <input id="edit-cgpa" type="number" step="0.01" min="0" max="10"
              className={`${FIELD_CLASS}${lockedField}`} disabled={eligibilityLocked}
              placeholder="e.g. 6.5"
              value={data.min_cgpa || ''} onChange={(e) => set('min_cgpa', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-backlogs">Max backlogs allowed</FieldLabel>
            <input id="edit-backlogs" type="number" min="0"
              className={`${FIELD_CLASS}${lockedField}`} disabled={eligibilityLocked}
              value={data.max_backlogs || ''} onChange={(e) => set('max_backlogs', e.target.value)} />
          </div>
          {/* Locked with the rest of eligibility once anyone has applied:
              narrowing a live drive to one gender would leave the applicant
              list contradicting the criteria. */}
          <div>
            <FieldLabel htmlFor="edit-dob">Born on or before</FieldLabel>
            <input id="edit-dob" type="date" max={new Date().toISOString().slice(0, 10)}
              className={`${FIELD_CLASS}${lockedField}`} disabled={eligibilityLocked}
              value={(data.dob_on_or_before || '').slice(0, 10)}
              onChange={(e) => set('dob_on_or_before', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-dob-after">Born on or after</FieldLabel>
            <input id="edit-dob-after" type="date" max={new Date().toISOString().slice(0, 10)}
              className={`${FIELD_CLASS}${lockedField}`} disabled={eligibilityLocked}
              value={(data.dob_on_or_after || '').slice(0, 10)}
              onChange={(e) => set('dob_on_or_after', e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="edit-gender">Open to</FieldLabel>
            <select id="edit-gender"
              className={`${FIELD_CLASS}${lockedField}`} disabled={eligibilityLocked}
              value={data.gender_requirement || 'all'}
              onChange={(e) => set('gender_requirement', e.target.value)}>
              <option value="all">All candidates</option>
              <option value="male">Male candidates only</option>
              <option value="female">Female candidates only</option>
            </select>
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
            Allowed backlog semesters{eligibilityLocked ? " — locked" : ""}
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
                  disabled={eligibilityLocked}
                  className={`${CHECKBOX_CLASS}${lockedField}`}
                />
                <span className="text-spc-xs font-bold text-spc-ink">Sem {sem}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Allowed branches{eligibilityLocked ? " — locked" : " *"}
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
                  disabled={eligibilityLocked}
                  className={`${CHECKBOX_CLASS}${lockedField}`}
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

/**
 * Confirm taking a job down.
 *
 * Two different actions behind one dialog, because they are the same intent
 * with different consequences and the officer should see which one they are
 * getting. With no applicants the job is deleted outright. With applicants it
 * can only be unpublished — their applications reference this job, so removing
 * it would take them too — and the dialog says that rather than presenting a
 * Delete that would be refused.
 */
export function ConfirmRemoveJobModal({ job, applicantCount, busy, onConfirm, onClose }) {
  const deleting = applicantCount === 0;
  return (
    <Dialog
      id="confirm-remove-job"
      title={deleting ? 'Delete this job?' : 'Unpublish this job?'}
      subtitle={`${job.job_title} · ${job.company_name}`}
      onClose={onClose}
    >
      <div className="px-5 py-4 text-spc-xs text-spc-body leading-snug space-y-2">
        {deleting ? (
          <>
            <p>
              Nobody has applied to this job, so it can be removed. It disappears from your list
              and from every student&rsquo;s.
            </p>
            <p className="text-spc-muted">
              The record is kept internally for history — it is taken out of circulation, not
              wiped.
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="font-bold text-spc-ink tabular-nums">{applicantCount}</span> student
              {applicantCount === 1 ? ' has' : 's have'} applied, so this job cannot be deleted —
              their applications point at it and would go with it.
            </p>
            <p>
              Unpublishing takes it off the students&rsquo; list instead. The applicants, their
              statuses and any placement details you have recorded all stay exactly as they are,
              and you keep this page.
            </p>
          </>
        )}
      </div>
      <Footer>
        <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
        <DangerButton type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : deleting ? 'Delete job' : 'Unpublish job'}
        </DangerButton>
      </Footer>
    </Dialog>
  );
}

/**
 * Undoing a manual addition. Says plainly that the student never applied, so
 * the officer can tell this apart from removing a real application — which this
 * never does, because those rows have no Remove button.
 */
export function ConfirmRemoveApplicantModal({ student, job, busy, onConfirm, onClose }) {
  const name = student.name || student.prn;
  return (
    <Dialog
      id="confirm-remove-applicant"
      title="Remove this student from the job?"
      subtitle={`${name} · ${student.prn}`}
      onClose={onClose}
    >
      <div className="px-5 py-4 text-spc-xs text-spc-body leading-snug space-y-2">
        <p>
          {name} was added to <span className="font-bold text-spc-ink">{job.job_title}</span> by
          hand — they never applied through the portal. Removing them undoes that.
        </p>
        <p className="text-spc-muted">
          Any placement details recorded against this entry go with it. Nothing else about the
          student changes, and they can be added again.
        </p>
      </div>
      <Footer>
        <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
        <DangerButton type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Removing…' : 'Remove student'}
        </DangerButton>
      </Footer>
    </Dialog>
  );
}

import { AlertTriangle, ExternalLink, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
  PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { JobStanding, formatMoment, targetDisplay, packageOf } from './jobsShared';

/* ---------------------------------------------------------------- details */

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5
      border-b border-spc-line last:border-b-0">
      <dt className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body flex-shrink-0">
        {label}
      </dt>
      <dd className="text-spc-sm text-spc-ink text-right min-w-0 break-words">
        {value === null || value === undefined || value === '' ? '—' : value}
      </dd>
    </div>
  );
}

/** `[]` for anything unparseable rather than throwing inside a render. */
function asList(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** How the backlog rule reads, given the two columns that express it. */
function backlogRule(job) {
  if (job.max_backlogs === null || job.max_backlogs === undefined) return 'No bar';
  if (Number(job.max_backlogs) === 0) return 'None allowed';
  const semesters = asList(job.allowed_backlog_semesters);
  if (semesters.length > 0) {
    return `Up to ${job.max_backlogs}, in semester${semesters.length === 1 ? '' : 's'} ${semesters.join(', ')}`;
  }
  return `Up to ${job.max_backlogs}`;
}

/**
 * One job, read-only.
 *
 * Opened from both the posted list and the pending list, so it takes whichever
 * shape it is given — a request calls the title `job_title` and the package
 * `salary_range`, a posted job calls them `title` and `salary_package`.
 */
export function DetailsDialog({ job, regions, colleges, onClose }) {
  const branches = asList(job.allowed_branches);
  const title = job.title || job.job_title;

  return (
    <Modal
      onClose={onClose}
      labelledBy="job-details-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="job-details-title"
        title={title}
        subtitle={job.company_name}
        onClose={onClose}
      />

      <AdminDialogBody className="px-0 py-0">
        <dl>
          <Row label="Company" value={job.company_name} />
          <Row label="Location" value={job.location} />
          <Row label="Package" value={packageOf(job.salary_package ?? job.salary_range)} />
          <Row label="Vacancies" value={job.no_of_vacancies} />
          <Row label="Closes" value={formatMoment(job.application_deadline)} />
          {job.is_active !== undefined && (
            <Row label="Status" value={<JobStanding active={job.is_active} />} />
          )}
        </dl>

        {job.description && (
          <div className="px-5 py-4 border-t border-spc-line">
            <SectionLabel>About the job</SectionLabel>
            <p className="text-spc-sm text-spc-body break-words whitespace-pre-line">
              {job.description}
            </p>
          </div>
        )}

        <div className="px-5 py-4 border-t border-spc-line">
          <SectionLabel>Who can apply</SectionLabel>
          <dl className="border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
            <Row label="Minimum CGPA" value={job.min_cgpa || 'No bar'} />
            <Row label="Backlogs" value={backlogRule(job)} />
            <Row label="Reaches" value={targetDisplay(job, regions, colleges)} />
          </dl>

          <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mt-3 mb-1.5">
            Branches {branches.length > 0 && `— ${branches.length}`}
          </p>
          {branches.length === 0 ? (
            <p className="text-spc-sm text-spc-ink">Every branch</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {branches.map((branch) => (
                <li key={branch}
                  className="px-2 py-1 rounded-spc-admin-sm bg-spc-surface-2
                    border border-spc-line-strong text-spc-xs text-spc-ink">
                  {branch}
                </li>
              ))}
            </ul>
          )}
        </div>

        {job.application_form_url && (
          <div className="px-5 py-4 border-t border-spc-line">
            <SectionLabel>The company&apos;s own form</SectionLabel>
            <a
              href={job.application_form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
                text-spc-accent hover:underline break-all"
            >
              <ExternalLink size={14} aria-hidden="true" className="flex-shrink-0" />
              {job.application_form_url}
            </a>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <PrimaryButton onClick={onClose}>Close</PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------------- delete */

/**
 * Take a job down, one of two ways.
 *
 * They are genuinely different and the dialog says which is which: a soft
 * delete moves it to the history tab and can be looked at afterwards; a
 * permanent one takes the applications with it.
 *
 * The reason for a permanent delete used to be collected with `window.prompt`
 * — a single-line box with no validation and no way to see what you are about
 * to destroy while typing. It is a field here. The confirmation that follows it
 * is unchanged.
 */
export function DeleteDialog({ job, reason, onReasonChange, onSoftDelete, onPermanentDelete, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="delete-job-title"
      panelClassName={adminPanel('md', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="delete-job-title"
        title="Take this job down"
        subtitle={`${job.title} · ${job.company_name}`}
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-4">
        <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          <p className="text-spc-sm font-bold text-spc-ink">Move it to the history</p>
          <p className="text-spc-xs text-spc-body mt-1">
            It stops appearing to students and goes to the Deleted history tab, with who took it
            down and when. Nothing is destroyed.
          </p>
          <SecondaryButton onClick={onSoftDelete} className="mt-2.5">
            <Trash2 size={15} aria-hidden="true" />
            Move to history
          </SecondaryButton>
        </div>

        <div className="p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <div className="flex gap-2.5">
            <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-spc-sm font-bold text-spc-ink">Delete it permanently</p>
              <p className="text-spc-xs text-spc-body mt-1">
                The job and everything attached to it — every application students made to it —
                are removed. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel htmlFor="delete-reason">Reason *</FieldLabel>
            <textarea
              id="delete-reason"
              rows="2"
              className={FIELD_CLASS}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Why is this being destroyed rather than archived?"
            />
          </div>

          <DangerButton onClick={onPermanentDelete} disabled={!reason.trim()} className="mt-2.5">
            Delete permanently
          </DangerButton>
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------------- export */

const SCOPES = [
  ['all', 'Every college', 'Everyone who applied'],
  ['region', 'One region', 'Every college in it'],
  ['colleges', 'Chosen colleges', 'Pick them below'],
];

export function ExportDialog({
  job, regions, colleges, scope, onScope, selectedRegion, onSelectedRegion,
  selectedColleges, onToggleCollege, onAllColleges, onNoColleges,
  format, onFormat, onExport, onClose, exporting,
}) {
  const inRegion = colleges.filter((c) => String(c.region_id) === String(selectedRegion)).length;

  return (
    <Modal
      onClose={onClose}
      labelledBy="export-applicants-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="export-applicants-title"
        title="Export applicants"
        subtitle={`${job.title || job.job_title} · ${job.company_name}`}
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        <div>
          <SectionLabel>Who is in it</SectionLabel>
          <div className="space-y-1">
            {SCOPES.map(([value, label, hint]) => (
              <label key={value}
                className={`flex items-start gap-3 p-3 rounded-spc-admin-sm border cursor-pointer
                  transition-colors ${scope === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}>
                <input
                  type="radio"
                  name="export-scope"
                  value={value}
                  checked={scope === value}
                  onChange={(e) => onScope(e.target.value)}
                  className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0`}
                />
                <span className="min-w-0">
                  <span className="block text-spc-sm font-bold text-spc-ink">{label}</span>
                  <span className="block text-spc-xs text-spc-body">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {scope === 'region' && (
          <div>
            <FieldLabel htmlFor="export-region">Region</FieldLabel>
            <select
              id="export-region"
              className={FIELD_CLASS}
              value={selectedRegion}
              onChange={(e) => onSelectedRegion(e.target.value)}
            >
              <option value="">Choose a region…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.region_name}</option>
              ))}
            </select>
            {selectedRegion && (
              <p className="text-spc-xs text-spc-body mt-1.5 tabular-nums">
                {inRegion} {inRegion === 1 ? 'college' : 'colleges'} in it.
              </p>
            )}
          </div>
        )}

        {scope === 'colleges' && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <SectionLabel className="mb-0">
                Colleges{selectedColleges.length > 0 && ` — ${selectedColleges.length} chosen`}
              </SectionLabel>
              <div className="flex items-center gap-2">
                <SecondaryButton onClick={onAllColleges}>All</SecondaryButton>
                <SecondaryButton onClick={onNoColleges}>None</SecondaryButton>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto border border-spc-line-strong
              rounded-spc-admin-sm">
              {colleges.map((college) => (
                <label key={college.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b
                    border-spc-line last:border-b-0 ${selectedColleges.includes(college.id)
                      ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                  <input
                    type="checkbox"
                    checked={selectedColleges.includes(college.id)}
                    onChange={() => onToggleCollege(college.id)}
                    className={`${CHECKBOX_CLASS} flex-shrink-0`}
                  />
                  <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                    {college.college_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Format</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['excel', 'Excel (.xlsx)', FileSpreadsheet],
              ['pdf', 'PDF', FileText],
            ].map(([value, label, Icon]) => (
              <label key={value}
                className={`flex items-center gap-2 p-3 rounded-spc-admin-sm border cursor-pointer
                  transition-colors ${format === value
                    ? 'bg-spc-selected border-spc-accent'
                    : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}>
                <input
                  type="radio"
                  name="export-format"
                  value={value}
                  checked={format === value}
                  onChange={(e) => onFormat(e.target.value)}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`}
                />
                <Icon size={16} aria-hidden="true" className="text-spc-body" />
                <span className="text-spc-sm font-bold text-spc-ink">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={exporting}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

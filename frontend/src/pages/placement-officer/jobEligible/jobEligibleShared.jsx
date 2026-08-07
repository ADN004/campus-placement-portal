import { Download, Eye, DollarSign, Calendar, Send, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import {
  Panel, PanelHeading, SectionLabel, PrimaryButton, SecondaryButton,
  CHECKBOX_CLASS, EmptyState, formatDate,
} from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three JobEligibleStudents presenters.
 *
 * Presentation only — every value comes from the container and every handler is
 * the container's, so the three devices behave identically.
 *
 * `StatusBadge` is deliberately left as it is. It is shared with super-admin,
 * which has not been redesigned, and the whole set of shared components gets an
 * officer variant in one dedicated pass after the ten page layouts are done.
 * Until then it renders in its original colours inside these ruled tables.
 */

/* -------------------------------------------------------------- job picker */

/**
 * The list of active jobs. Selecting one is what loads everything below it, so
 * it reads as a list of choices rather than a grid of cards: one ruled block,
 * the chosen row washed with `selected`.
 */
export function JobPicker({ jobs, selectedJob, onSelect, onDownloadJobPdf, columns = 1 }) {
  if (jobs.length === 0) {
    return (
      <Panel>
        <EmptyState>No active jobs available.</EmptyState>
      </Panel>
    );
  }

  const grid = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';

  return (
    <div
      className={`grid grid-cols-1 ${grid} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden`}
    >
      {jobs.map((job) => {
        const active = selectedJob?.id === job.id;
        return (
          <div
            key={job.id}
            className={`relative bg-spc-surface transition-colors
              ${active ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
          >
            {/* The whole tile selects the job; the PDF button sits above it and
                stops the click, exactly as before. */}
            <button
              type="button"
              onClick={() => onSelect(job)}
              aria-pressed={active}
              className="w-full text-left p-4 pr-14 min-h-[92px]"
            >
              <p className="text-spc-sm font-bold text-spc-ink break-words">{job.job_title}</p>
              <p className="text-spc-xs text-spc-body mt-0.5 break-words">{job.company_name}</p>
              <p className="text-xs text-spc-muted mt-2 tabular-nums">
                {job.min_cgpa ? `Min CGPA ${job.min_cgpa}` : 'No CGPA bar'}
                {job.max_backlogs !== null && job.max_backlogs !== undefined
                  ? ` · Max backlogs ${job.max_backlogs}`
                  : ''}
              </p>
              <p className="text-xs text-spc-muted mt-0.5 tabular-nums">
                Closes {formatDate(job.application_deadline)}
              </p>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadJobPdf(job);
              }}
              aria-label={`Download job details for ${job.job_title} as PDF`}
              title="Download job details as PDF"
              className="absolute top-3 right-3 inline-flex items-center justify-center w-11 h-11
                rounded-spc-control text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink
                transition-colors"
            >
              <Download size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- stat block */

/**
 * Placement statistics as one ruled block sharing hairlines, figures
 * right-aligned. Seven tiles across is unreadable below a wide desktop, so the
 * column count is the only thing that changes per device.
 */
export function StatBlock({ stats, columns = 4 }) {
  const cols =
    columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : columns === 7 ? 'grid-cols-7' : 'grid-cols-4';
  return (
    <div
      className={`grid ${cols} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden`}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-spc-surface p-3 flex flex-col min-h-[84px]">
          <span className="text-spc-label font-bold uppercase text-spc-muted leading-tight">
            {stat.label}
          </span>
          <span className="block text-spc-h1 font-bold text-spc-ink text-right mt-auto tabular-nums">
            {typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- drive & job */

export function DrivePanel({ driveData, onSchedule, onNotifyAll }) {
  return (
    <Panel>
      <PanelHeading>Drive schedule</PanelHeading>
      <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {driveData ? (
            <dl className="text-spc-xs text-spc-body space-y-1">
              <div className="flex gap-2">
                <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Date</dt>
                <dd className="tabular-nums">{formatDate(driveData.drive_date)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Time</dt>
                <dd className="tabular-nums">{driveData.drive_time}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Venue</dt>
                <dd className="break-words">{driveData.venue}</dd>
              </div>
              {driveData.additional_instructions && (
                <div className="flex gap-2">
                  <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Notes</dt>
                  <dd className="break-words">{driveData.additional_instructions}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-spc-xs text-spc-muted">No drive scheduled yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryButton onClick={onSchedule}>
            <Calendar size={15} aria-hidden="true" />
            <span>{driveData ? 'Edit drive' : 'Schedule drive'}</span>
          </SecondaryButton>
          {driveData && (
            <SecondaryButton onClick={onNotifyAll}>
              <Send size={15} aria-hidden="true" />
              <span>Notify all</span>
            </SecondaryButton>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** The chosen job's headline facts, plus Edit (host only) and Export. */
export function JobSummary({ job, isHost, onEditJob, onExport, exporting, exportDisabled }) {
  return (
    <Panel>
      <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-spc-h2 font-bold text-spc-ink break-words">{job.job_title}</p>
          <p className="text-spc-sm text-spc-body mt-0.5 break-words">{job.company_name}</p>
          <p className="text-xs text-spc-muted mt-2 tabular-nums">
            {job.min_cgpa ? `Min CGPA ${job.min_cgpa}` : 'No CGPA bar'}
            {job.max_backlogs !== null && job.max_backlogs !== undefined
              ? ` · Max backlogs ${job.max_backlogs}`
              : ''}
            {job.allowed_branches?.length ? ` · ${job.allowed_branches.length} branch(es)` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isHost && <SecondaryButton onClick={onEditJob}>Edit job</SecondaryButton>}
          <PrimaryButton onClick={onExport} disabled={exportDisabled || exporting}>
            <Download size={15} aria-hidden="true" />
            <span>{exporting ? 'Exporting…' : 'Export'}</span>
          </PrimaryButton>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- bulk bar */

/**
 * Bulk status actions. When every selected application is already `selected`
 * the action buttons are replaced by a plain note, exactly as before — there is
 * nothing useful left to apply to them.
 */
export function BulkActionBar({ count, allAlreadySelected, onStatusUpdate, onClear }) {
  if (count === 0) return null;

  return (
    <Panel className="border-spc-accent">
      <div className="flex items-center justify-between gap-3 flex-wrap p-3">
        <p className="text-spc-xs font-bold text-spc-ink">
          <span className="tabular-nums">{count}</span> student{count === 1 ? '' : 's'} selected
          {allAlreadySelected && (
            <span className="ml-2 font-semibold text-spc-muted">
              — already marked selected
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {allAlreadySelected ? (
            <SecondaryButton onClick={onClear}>Clear selection</SecondaryButton>
          ) : (
            <>
              <SecondaryButton onClick={() => onStatusUpdate('under_review')}>
                Mark under review
              </SecondaryButton>
              <SecondaryButton onClick={() => onStatusUpdate('shortlisted')}>
                Shortlist
              </SecondaryButton>
              <PrimaryButton onClick={() => onStatusUpdate('selected')}>
                Mark selected
              </PrimaryButton>
              <SecondaryButton onClick={() => onStatusUpdate('rejected')}>Reject</SecondaryButton>
              <SecondaryButton onClick={onClear}>Clear</SecondaryButton>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ filter toggle */

export function FilterToggle({ open, onToggle, active, label }) {
  return (
    <SecondaryButton onClick={onToggle} aria-expanded={open}>
      <Filter size={15} aria-hidden="true" />
      <span>{label}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-spc-accent flex-shrink-0" aria-hidden="true" />
      )}
      {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
    </SecondaryButton>
  );
}

/* -------------------------------------------------------- applicant rows */

/**
 * Row actions. Identical in all three tables, so one component.
 */
export function ApplicantActions({ student, onView, onPlacement }) {
  const name = student.name || student.prn;
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onView(student)}
        aria-label={`View details for ${name}`}
        title={`View details for ${name}`}
        className="inline-flex items-center justify-center w-11 h-11 rounded-spc-control
          text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors flex-shrink-0"
      >
        <Eye size={18} aria-hidden="true" />
      </button>
      {student.application_status === 'selected' && (
        <button
          type="button"
          onClick={() => onPlacement(student)}
          aria-label={`Add or edit placement details for ${name}`}
          title={`Add or edit placement details for ${name}`}
          className="inline-flex items-center justify-center w-11 h-11 rounded-spc-control
            text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors flex-shrink-0"
        >
          <DollarSign size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * The applicants table — used for all three lists on this page (current
 * applicants, already-placed-elsewhere, and the selected-students summary).
 *
 * They previously existed as three near-identical blocks of markup with the
 * same eight columns; the only real differences are whether rows can be ticked
 * and whether the "already placed at" column shows. Those are props now, so the
 * three can no longer drift apart.
 */
export function ApplicantTable({
  students, isHost, caption,
  selectable = false, selectedIds = [], onSelect, onSelectAll, allSelected,
  showPlacedAt = false,
  onView, onPlacement,
  emptyMessage = 'No students match the current filters.',
  loading = false,
}) {
  if (loading) return <EmptyState>Loading applicants…</EmptyState>;
  if (students.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            {selectable && (
              <th scope="col" className="w-12 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  aria-label="Select all applicants in this list"
                  className={CHECKBOX_CLASS}
                />
              </th>
            )}
            <Th>PRN</Th>
            <Th>Name</Th>
            {isHost && <Th>College</Th>}
            <Th>Branch</Th>
            <Th align="right">CGPA</Th>
            <Th align="right">Backlogs</Th>
            <Th>Status</Th>
            {showPlacedAt && <Th>Already placed at</Th>}
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const checked = selectedIds.includes(student.application_id);
            return (
              <tr
                key={student.application_id || student.id}
                className={`border-b border-spc-line last:border-b-0 transition-colors
                  ${checked ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
              >
                {selectable && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSelect(student.application_id)}
                      aria-label={`Select ${student.name || student.prn}`}
                      className={CHECKBOX_CLASS}
                    />
                  </td>
                )}
                <th
                  scope="row"
                  className="px-3 py-2 text-left text-spc-xs font-bold text-spc-ink
                    tabular-nums whitespace-nowrap"
                >
                  {student.prn}
                </th>
                <Td bold>{student.name}</Td>
                {isHost && <Td muted>{student.college_name}</Td>}
                <Td muted>{student.branch}</Td>
                <Td align="right" bold>{student.cgpa}</Td>
                <Td align="right">
                  <BacklogFigure count={student.backlog_count} />
                </Td>
                <Td><StatusBadge status={student.application_status} /></Td>
                {showPlacedAt && <Td muted>{student.placed_company || '–'}</Td>}
                <td className="px-3 py-2">
                  <ApplicantActions student={student} onView={onView} onPlacement={onPlacement} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The same three lists on a phone or tablet: a ruled list, not cards.
 * Carries the facts an officer scans — PRN, name, branch, CGPA, backlogs,
 * status — with college added when the officer is hosting.
 */
export function ApplicantList({
  students, isHost,
  selectable = false, selectedIds = [], onSelect,
  showPlacedAt = false,
  onView, onPlacement,
  emptyMessage = 'No students match the current filters.',
  loading = false,
}) {
  if (loading) return <EmptyState>Loading applicants…</EmptyState>;
  if (students.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <ul>
      {students.map((student) => {
        const checked = selectedIds.includes(student.application_id);
        return (
          <li
            key={student.application_id || student.id}
            className={`px-4 py-3 border-b border-spc-line last:border-b-0
              ${checked ? 'bg-spc-selected' : ''}`}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <span className="pt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onSelect(student.application_id)}
                    aria-label={`Select ${student.name || student.prn}`}
                    className={CHECKBOX_CLASS}
                  />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-spc-xs font-bold text-spc-ink tabular-nums truncate">
                    {student.prn}
                  </span>
                  <StatusBadge status={student.application_status} />
                </div>

                <p className="text-spc-sm font-bold text-spc-ink mt-0.5 break-words">
                  {student.name}
                </p>

                <p className="text-xs text-spc-muted mt-1 break-words">
                  {student.branch}
                  {isHost && student.college_name ? ` · ${student.college_name}` : ''}
                </p>

                <p className="text-xs text-spc-muted mt-1">
                  CGPA <span className="tabular-nums font-bold text-spc-ink">{student.cgpa}</span>
                  {' · '}
                  <BacklogFigure count={student.backlog_count} /> backlogs
                </p>

                {showPlacedAt && student.placed_company && (
                  <p className="text-xs text-spc-muted mt-1 break-words">
                    Already placed at{' '}
                    <span className="font-bold text-spc-ink">{student.placed_company}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-1">
              <ApplicantActions student={student} onView={onView} onPlacement={onPlacement} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Zero backlogs is not a problem, so it stays ink; above zero is coloured. */
function BacklogFigure({ count }) {
  const total = count || 0;
  return (
    <span className={`tabular-nums font-bold ${total > 0 ? 'text-spc-bad' : 'text-spc-ink'}`}>
      {total}
    </span>
  );
}

/** Column header. `muted`, not accent — the band sits on surface-2 (4.49:1). */
function Th({ children, align = 'left' }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
        text-spc-xs text-spc-muted whitespace-nowrap
        ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', bold, muted }) {
  return (
    <td
      className={`px-3 py-2 text-spc-xs
        ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}
        ${bold ? 'font-bold text-spc-ink' : muted ? 'text-spc-body' : 'text-spc-ink'}`}
    >
      {children}
    </td>
  );
}

export { SectionLabel, Panel, PanelHeading };

import { Eye, Calendar, Send, Filter, UserPlus, Download, X, Undo2 } from 'lucide-react';
import {
  Panel, PanelHeading, SectionLabel, EmptyState, FIELD_CLASS, FieldLabel,
  SecondaryButton, PrimaryButton, formatDate,
} from '../../../components/admin/AdminUI';

/**
 * The parts of the super admin's job applicants page.
 *
 * Three tables on this page carry the same columns — the applicants, the ones
 * already placed elsewhere, and the summary of those marked selected — so there
 * is one table component and one list component, parameterised, rather than
 * three near-copies that drift.
 */

/* -------------------------------------------------------------- status */

const STATUS_TONE = {
  selected: 'text-spc-ok',
  shortlisted: 'text-spc-ink',
  rejected: 'text-spc-bad',
  under_review: 'text-spc-warn',
};

export function ApplicationStatus({ status }) {
  // 'submitted' is the retired spelling of under_review and may still appear on
  // a row written by an older image; it reads as the state it actually is.
  const normalized = status === 'submitted' ? 'under_review' : status;
  const label = String(normalized || 'under_review').replace(/_/g, ' ');
  return (
    <span className={`text-spc-xs font-semibold capitalize ${STATUS_TONE[normalized] || 'text-spc-body'}`}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------- figures */

/** How the drive is going. Six numbers, no colour except where it means something. */
export function PlacementStats({ layout, stats }) {
  if (!stats?.overall) return null;
  const o = stats.overall;
  const columns = layout === 'desktop' ? 'lg:grid-cols-6' : 'sm:grid-cols-3';
  const items = [
    { label: 'Applied', value: o.total_applications || 0 },
    { label: 'Under review', value: o.under_review_count || 0 },
    { label: 'Shortlisted', value: o.shortlisted_count || 0 },
    { label: 'Selected', value: o.selected_count || 0, ok: (o.selected_count || 0) > 0 },
    { label: 'Rejected', value: o.rejected_count || 0 },
    { label: 'Avg package', value: o.avg_package ? `${Number(o.avg_package).toFixed(1)}` : '—' },
  ];
  return (
    <div className={`grid grid-cols-2 ${columns} gap-3 mb-5`}>
      {items.map((item) => (
        <div key={item.label} className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
          <p className={`text-spc-metric font-bold tabular-nums ${item.ok ? 'text-spc-ok' : 'text-spc-ink'}`}>
            {item.value}
          </p>
          <p className="text-spc-xs text-spc-body mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- the drive */

/** When and where, or an invitation to set it. */
export function DrivePanel({ drive, driveSlots = [], onSchedule, onNotifyAll, disabled }) {
  /*
   * `drive` is the earliest venue. A job may now be held at several, and a
   * Console shown only the first would have no way to tell there are more —
   * which is the one thing to know before announcing it. One venue renders
   * exactly as it did.
   */
  const venues = driveSlots.length > 0 ? driveSlots : (drive ? [drive] : []);
  const many = venues.length > 1;
  return (
    <Panel className="mb-5">
      <PanelHeading
        action={(
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={onSchedule} disabled={disabled}>
              <Calendar size={15} aria-hidden="true" />
              {drive ? 'Edit drive' : 'Schedule drive'}
            </SecondaryButton>
            {drive && (
              <SecondaryButton onClick={onNotifyAll} disabled={disabled}>
                <Send size={15} aria-hidden="true" />
                Notify all
              </SecondaryButton>
            )}
          </div>
        )}
      >
        {many ? `Drive schedule · ${venues.length} venues` : 'Drive schedule'}
      </PanelHeading>
      <div className="p-4">
        {venues.length > 0 ? (
          <div className="space-y-3">
            {venues.map((venue, i) => (
              <dl
                key={venue.id ?? `${venue.drive_date}-${venue.drive_location}`}
                className={`text-spc-xs text-spc-body space-y-1 ${
                  i > 0 ? 'pt-3 border-t border-spc-line' : ''}`}
              >
                {many && (
                  <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">
                    Venue {i + 1}
                  </p>
                )}
                <div className="flex gap-2">
                  <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Date</dt>
                  <dd className="tabular-nums">{formatDate(venue.drive_date)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Time</dt>
                  <dd className="tabular-nums">{venue.drive_time}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Venue</dt>
                  <dd className="break-words">{venue.drive_location}</dd>
                </div>
                {venue.additional_instructions && (
                  <div className="flex gap-2">
                    <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Notes</dt>
                    <dd className="break-words">{venue.additional_instructions}</dd>
                  </div>
                )}
              </dl>
            ))}
          </div>
        ) : (
          <p className="text-spc-xs text-spc-body">
            No drive scheduled yet. Students see the date, time and place once one is set.
          </p>
        )}
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- filters */

export function AdvancedFilters({ layout, filters, onChange, colleges, onClear }) {
  const columns = layout === 'desktop' ? 'lg:grid-cols-3' : 'sm:grid-cols-2';
  const field = (id, label, props) => (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input id={id} className={FIELD_CLASS} {...props} />
    </div>
  );
  return (
    <Panel className="mb-4">
      <PanelHeading action={<SecondaryButton onClick={onClear}>Clear</SecondaryButton>}>
        Narrow the list
      </PanelHeading>
      <div className={`grid grid-cols-1 ${columns} gap-3 p-4`}>
        {field('f-cgpa-min', 'CGPA at least', {
          type: 'number', step: '0.01', value: filters.cgpaMin,
          onChange: (e) => onChange('cgpaMin', e.target.value), placeholder: 'e.g. 7.5',
        })}
        {field('f-cgpa-max', 'CGPA at most', {
          type: 'number', step: '0.01', value: filters.cgpaMax,
          onChange: (e) => onChange('cgpaMax', e.target.value), placeholder: 'e.g. 9.0',
        })}
        {field('f-backlogs', 'Backlogs at most', {
          type: 'number', value: filters.maxBacklogs,
          onChange: (e) => onChange('maxBacklogs', e.target.value), placeholder: 'e.g. 0',
        })}
        {field('f-dob-from', 'Born on or after', {
          type: 'date', value: filters.dobFrom,
          onChange: (e) => onChange('dobFrom', e.target.value),
        })}
        {field('f-dob-to', 'Born on or before', {
          type: 'date', value: filters.dobTo,
          onChange: (e) => onChange('dobTo', e.target.value),
        })}
        <div>
          <FieldLabel htmlFor="f-college">College</FieldLabel>
          <select
            id="f-college"
            className={FIELD_CLASS}
            value={filters.collegeId}
            onChange={(e) => onChange('collegeId', e.target.value)}
          >
            <option value="">Every college</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>{college.college_name}</option>
            ))}
          </select>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- bulk bar */

/**
 * What can be done to the ticked applicants.
 *
 * Sticky at the bottom, because the tick boxes are in a long table and a bar at
 * the top of it scrolls out of reach exactly when it is needed.
 */
export function BulkBar({ count, onStatus, onNotify, onRevert, onClear, disabled }) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-10 mt-3">
      <div className="spc-admin-glass rounded-spc-admin-lg border border-spc-line-strong
        px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-spc-sm font-bold text-spc-ink tabular-nums">
          {count} selected
        </span>
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/*
            'Under review' is gone from this row of forward actions. It was the
            only one of the four that moved somebody *backwards*, sitting
            unlabelled among three that move them onwards — and every
            application now starts there, so it was never a step anybody needed
            to take. Putting people back is a correction and gets its own
            control, below, which says what it is doing before it does it.
          */}
          {[
            ['shortlisted', 'Shortlist'],
            ['selected', 'Select'],
            ['rejected', 'Reject'],
          ].map(([status, label]) => (
            <SecondaryButton key={status} onClick={() => onStatus(status)} disabled={disabled}>
              {label}
            </SecondaryButton>
          ))}
          {/*
            One button, and it reads the selection to decide what to send.

            It used to be passed straight to onClick, so what reached the server
            was a click event and every notification failed. Before that it was
            hard-wired to 'shortlisted', so marking five people Selected and
            pressing Notify told all five they had been shortlisted.

            Three buttons, one per message, would also be correct — but this bar
            is sticky on a phone and already carries three status actions, and
            the type is not really a choice: it is whatever the selected people
            have just been marked. So it is derived, and a selection spanning
            two statuses is refused with a sentence rather than guessed at.
          */}
          <PrimaryButton onClick={() => onNotify()} disabled={disabled}>
            <Send size={15} aria-hidden="true" />
            Notify
          </PrimaryButton>

          {/*
            Undoing somebody else's mistake.

            The Undo banner only reaches a batch this page just wrote, and every
            status set before any of this existed has no batch at all — so a
            drive where three hundred people were marked Selected by accident
            last term was, until this button, unrecoverable from the interface.
            Separated from the three above by a rule because it is the only one
            that moves people backwards.
          */}
          {onRevert && (
            <>
              <span aria-hidden="true" className="w-px h-7 bg-spc-line-strong mx-1" />
              <SecondaryButton onClick={() => onRevert()} disabled={disabled}>
                <Undo2 size={15} aria-hidden="true" />
                Move back…
              </SecondaryButton>
            </>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear the selection"
            className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
              text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the rows */

const COLUMNS = ['PRN', 'Name', 'Email', 'Mobile', 'College', 'Branch', 'CGPA', 'Backlogs', 'DOB', 'Status'];

export function ApplicantTable({
  students, caption, selectable, selectedIds, onSelect, onSelectAll, allSelected, onView,
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {selectable && (
                <th scope="col" className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    aria-label="Select every applicant"
                    className="h-5 w-5 rounded-[4px] border-spc-control text-spc-accent"
                  />
                </th>
              )}
              {COLUMNS.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap"
                >
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.application_id}
                className={`border-b border-spc-line last:border-b-0
                  ${selectedIds?.includes(student.application_id) ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.application_id)}
                      onChange={() => onSelect(student.application_id)}
                      aria-label={`Select ${student.name}`}
                      className="h-5 w-5 rounded-[4px] border-spc-control text-spc-accent"
                    />
                  </td>
                )}
                <th scope="row" className="px-4 py-3 text-left text-spc-sm font-bold text-spc-ink tabular-nums">
                  {student.prn}
                </th>
                <td className="px-4 py-3 text-spc-sm text-spc-ink">{student.name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body break-all">{student.email}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums">{student.mobile_number}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.college_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.branch}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink tabular-nums">{student.cgpa ?? '—'}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink tabular-nums">{student.backlog_count ?? 0}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums whitespace-nowrap">
                  {formatDate(student.date_of_birth)}
                </td>
                <td className="px-4 py-3"><ApplicationStatus status={student.application_status} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onView(student)}
                    aria-label={`View ${student.name}'s full profile`}
                    title="View profile"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
                      text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
                  >
                    <Eye size={17} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ApplicantList({ students, selectable, selectedIds, onSelect, onView }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {students.map((student) => (
          <li
            key={student.application_id}
            className={`p-4 ${selectedIds?.includes(student.application_id) ? 'bg-spc-selected' : ''}`}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.application_id)}
                  onChange={() => onSelect(student.application_id)}
                  aria-label={`Select ${student.name}`}
                  className="h-5 w-5 mt-0.5 rounded-[4px] border-spc-control text-spc-accent flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-spc-sm font-bold text-spc-ink tabular-nums">{student.prn}</p>
                <p className="text-spc-sm text-spc-ink break-words">{student.name}</p>
                <p className="text-spc-xs text-spc-body mt-0.5">
                  {student.college_name} · {student.branch}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 tabular-nums">
                  CGPA {student.cgpa ?? '—'} · {student.backlog_count ?? 0} backlogs
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <ApplicationStatus status={student.application_status} />
                <button
                  type="button"
                  onClick={() => onView(student)}
                  aria-label={`View ${student.name}'s full profile`}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
                    text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
                >
                  <Eye size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** A table or a list, plus its own pager, under one heading. */
export function ApplicantSection({
  layout, title, students, page, caption, emptyText, selectable, selectedIds,
  onSelect, onSelectAll, allSelected, onView, Pager,
}) {
  const Rows = layout === 'desktop' ? ApplicantTable : ApplicantList;
  return (
    <section className="mb-5">
      <SectionLabel>{title}</SectionLabel>
      {students.length === 0 ? (
        <Panel><EmptyState>{emptyText}</EmptyState></Panel>
      ) : (
        <>
          <Rows
            students={page.visible}
            caption={caption}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            allSelected={allSelected}
            onView={onView}
          />
          {Pager}
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------- export scoping */

/**
 * Which colleges an export covers.
 *
 * A super admin's export spans sixty colleges by default, which is rarely what
 * is wanted when a drive belongs to one region. Choosing a region ticks its
 * colleges; individual ones can then be unticked.
 */
export function ExportScope({ regions, colleges, filters, onRegion, onToggleCollege, onClear }) {
  const chosen = filters.selectedColleges.length;
  return (
    <Panel className="mb-4">
      <PanelHeading action={<SecondaryButton onClick={onClear}>Every college</SecondaryButton>}>
        Export covers {chosen === 0 ? 'every college' : `${chosen} ${chosen === 1 ? 'college' : 'colleges'}`}
      </PanelHeading>
      <div className="p-4">
        <div className="mb-3">
          <FieldLabel htmlFor="export-region">Region</FieldLabel>
          <select
            id="export-region"
            className={FIELD_CLASS}
            value={filters.selectedRegion}
            onChange={(e) => onRegion(e.target.value)}
          >
            <option value="">Every region</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>{region.region_name}</option>
            ))}
          </select>
        </div>

        <SectionLabel>Colleges</SectionLabel>
        <div className="max-h-56 overflow-y-auto border border-spc-line-strong rounded-spc-admin-sm">
          {colleges.map((college) => {
            const checked = filters.selectedColleges.includes(college.id);
            return (
              <label
                key={college.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-spc-line
                  last:border-b-0 ${checked ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleCollege(college.id)}
                  className="h-5 w-5 rounded-[4px] border-spc-control text-spc-accent flex-shrink-0"
                />
                <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                  {college.college_name}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------- controls */

export function ApplicantToolbar({
  onToggleFilters, filtersOpen, hasFilters, onToggleEnhanced, enhancedOpen, hasEnhanced,
  onManualAdd, onExportExcel, onExportExcelFields, onExportPdf, exporting,
  onToggleScope, scopeOpen, scopeCount,
  // What the exports beside these buttons will actually contain.
  filterSummary = null, shownCount = 0, totalCount = 0,
  onClearFilters,
}) {
  return (
    <div className="mb-4">
    <div className="flex items-center gap-2 flex-wrap">
      <SecondaryButton onClick={onToggleFilters}>
        <Filter size={15} aria-hidden="true" />
        {filtersOpen ? 'Hide filters' : 'Filters'}
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-spc-accent" aria-label="active" />}
      </SecondaryButton>
      <SecondaryButton onClick={onToggleEnhanced}>
        <Filter size={15} aria-hidden="true" />
        {enhancedOpen ? 'Hide more' : 'More filters'}
        {hasEnhanced && <span className="w-1.5 h-1.5 rounded-full bg-spc-accent" aria-label="active" />}
      </SecondaryButton>
      <SecondaryButton onClick={onManualAdd}>
        <UserPlus size={15} aria-hidden="true" />
        Add a student
      </SecondaryButton>
      <div className="flex items-center gap-2 ml-auto">
        <SecondaryButton onClick={onToggleScope}>
          <Filter size={15} aria-hidden="true" />
          {scopeOpen ? 'Hide scope' : 'Export scope'}
          {scopeCount > 0 && (
            <span className="text-spc-xs tabular-nums">({scopeCount})</span>
          )}
        </SecondaryButton>
        <SecondaryButton onClick={onExportExcel} disabled={exporting}>
          <Download size={15} aria-hidden="true" />
          Excel
        </SecondaryButton>
        {/* Beside "Excel", not instead of it: that one is a single click for
            the whole sheet, which is what most exports want. This one opens
            the same chooser the PDF uses, for the times it isn't. */}
        <SecondaryButton onClick={onExportExcelFields} disabled={exporting}>
          <Download size={15} aria-hidden="true" />
          Excel columns
        </SecondaryButton>
        <SecondaryButton onClick={onExportPdf} disabled={exporting}>
          <Download size={15} aria-hidden="true" />
          PDF
        </SecondaryButton>
      </div>
    </div>

    <ExportContents
      filterSummary={filterSummary}
      shownCount={shownCount}
      totalCount={totalCount}
      scopeCount={scopeCount}
      onClearFilters={onClearFilters}
    />
    </div>
  );
}

/**
 * What the export buttons will produce, said next to the export buttons.
 *
 * The officer role asks before it exports -- a dialog opens and the same
 * sentence sits at the top of it. Here a click downloads immediately, so there
 * is no "before" to put it in; the only honest place is beside the buttons,
 * standing, where the decision is actually made.
 *
 * Worth saying at all because every export obeys the filters, which is right
 * and completely invisible: the filters were set in a panel further up the
 * page, possibly an hour earlier, and a file quietly narrower than expected is
 * as wrong as one quietly wider.
 *
 * Two different narrowings, and the difference matters. The row filters change
 * what is on screen, so `shownCount` reflects them. The export scope picks
 * colleges and changes only the file -- the list does not move -- so claiming
 * "23 applicants" while a college scope is also set would understate by an
 * unknown amount. Each is named separately, and the sentence is only as
 * precise as it can honestly be.
 *
 * Renders nothing when nothing is narrowed, which is most of the time.
 */
function ExportContents({
  filterSummary, shownCount, totalCount, scopeCount, onClearFilters,
}) {
  const scoped = scopeCount > 0;
  if (!filterSummary && !scoped) return null;

  return (
    <div
      className="mt-2 flex items-start gap-2.5 flex-wrap rounded-spc-admin
        border border-spc-line bg-spc-surface-2 px-3 py-2.5"
    >
      <Download size={15} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />

      {/* min-w-0 so a long filter name wraps inside the row instead of forcing
          the whole bar wider than a phone. */}
      <p className="text-spc-xs text-spc-ink min-w-0 flex-1">
        {filterSummary ? (
          <>
            Exports will contain{' '}
            <span className="font-bold tabular-nums">{shownCount}</span>
            {totalCount > shownCount && <span className="text-spc-body"> of {totalCount}</span>}
            {' '}applicant{shownCount === 1 ? '' : 's'} —{' '}
            <span className="font-bold">{filterSummary}</span>
          </>
        ) : (
          <>Exports will cover the applicants shown</>
        )}
        {/* A count, not a fraction: the page holds every college in the state,
            not this job's targets, so "2 of 60" would name a denominator that
            has nothing to do with the job. */}
        {scoped && (
          <>
            , from{' '}
            <span className="font-bold tabular-nums">{scopeCount}</span>
            {' '}selected college{scopeCount === 1 ? '' : 's'}
          </>
        )}
        .
      </p>

      {filterSummary && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-spc-xs font-bold text-spc-accent hover:underline underline-offset-2
            min-h-[44px] sm:min-h-0 sm:py-1 px-1 flex-shrink-0 whitespace-nowrap"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

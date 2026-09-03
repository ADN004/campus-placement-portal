import { Eye, Calendar, Send, Filter, UserPlus, Download, X } from 'lucide-react';
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
  const label = String(status || 'submitted').replace(/_/g, ' ');
  return (
    <span className={`text-spc-xs font-semibold capitalize ${STATUS_TONE[status] || 'text-spc-body'}`}>
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
export function DrivePanel({ drive, onSchedule, onNotifyAll, disabled }) {
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
        Drive schedule
      </PanelHeading>
      <div className="p-4">
        {drive ? (
          <dl className="text-spc-xs text-spc-body space-y-1">
            <div className="flex gap-2">
              <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Date</dt>
              <dd className="tabular-nums">{formatDate(drive.drive_date)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Time</dt>
              <dd className="tabular-nums">{drive.drive_time}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Venue</dt>
              <dd className="break-words">{drive.drive_location}</dd>
            </div>
            {drive.additional_instructions && (
              <div className="flex gap-2">
                <dt className="font-bold text-spc-ink w-20 flex-shrink-0">Notes</dt>
                <dd className="break-words">{drive.additional_instructions}</dd>
              </div>
            )}
          </dl>
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
export function BulkBar({ count, onStatus, onNotify, onClear, disabled }) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-10 mt-3">
      <div className="spc-admin-glass rounded-spc-admin-lg border border-spc-line-strong
        px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-spc-sm font-bold text-spc-ink tabular-nums">
          {count} selected
        </span>
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {[
            ['under_review', 'Under review'],
            ['shortlisted', 'Shortlist'],
            ['selected', 'Select'],
            ['rejected', 'Reject'],
          ].map(([status, label]) => (
            <SecondaryButton key={status} onClick={() => onStatus(status)} disabled={disabled}>
              {label}
            </SecondaryButton>
          ))}
          <PrimaryButton onClick={onNotify} disabled={disabled}>
            <Send size={15} aria-hidden="true" />
            Notify
          </PrimaryButton>
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
  onManualAdd, onExportExcel, onExportPdf, exporting, onToggleScope, scopeOpen, scopeCount,
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
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
        <SecondaryButton onClick={onExportPdf} disabled={exporting}>
          <Download size={15} aria-hidden="true" />
          PDF
        </SecondaryButton>
      </div>
    </div>
  );
}

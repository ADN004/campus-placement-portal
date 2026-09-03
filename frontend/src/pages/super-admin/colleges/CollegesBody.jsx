import { Link } from 'react-router-dom';
import {
  Search, Plus, UploadCloud, Globe2, Edit2, Power, Trash2, MapPin, Users, UserCheck,
} from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState, FIELD_CLASS,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The colleges on this portal, and the regions they sit in.
 *
 * Sixty rows that barely change, plus two policy panels that appear only when
 * the portal is configured a particular way. The old page led with four
 * statistic cards and put the three controls that actually do something —
 * import, regions, add — in a row of same-weight outlined buttons beside a
 * heading. Adding a college is the reason you come here, so it leads.
 *
 * The mode-switch panel is a testing tool that deactivates fifty-nine colleges.
 * It looked like the policy panel above it; here it is marked as what it is.
 */

/** One number. Not a filter — the two status tiles do not narrow the list. */
function Metric({ label, value, tone }) {
  const toneClass = tone === 'ok' ? 'text-spc-ok' : tone === 'muted' ? 'text-spc-body' : 'text-spc-ink';
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
      min-w-[120px] flex-1">
      <p className={`text-spc-metric font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

/**
 * A standing rule about how this portal behaves, with the switch that changes
 * it. Two of them, and both are conditional on server configuration.
 */
function PolicyPanel({ title, tone, children, action }) {
  const edge = tone === 'warn' ? 'border-l-spc-warn' : 'border-l-spc-accent';
  return (
    <Panel className={`mb-4 border-l-4 ${edge}`}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-spc-sm font-bold text-spc-ink">{title}</h2>
          <div className="text-spc-xs text-spc-body mt-1 max-w-2xl break-words">{children}</div>
        </div>
        <div className="flex-shrink-0">{action}</div>
      </div>
    </Panel>
  );
}

function StatusMark({ active }) {
  return active
    ? <span className="text-spc-xs font-semibold text-spc-ok">Active</span>
    : <span className="text-spc-xs font-semibold text-spc-body">Inactive</span>;
}

function OfficerMark({ college }) {
  return parseInt(college.active_officer_count, 10) > 0
    ? (
      <span className="inline-flex items-center gap-1 text-spc-xs text-spc-ok font-semibold">
        <UserCheck size={14} aria-hidden="true" />
        Assigned
      </span>
    )
    : <span className="text-spc-xs text-spc-warn font-semibold">No officer</span>;
}

function CollegeActions({ college, onEdit, onToggle, onDelete }) {
  const button = 'inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm '
    + 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors';
  return (
    <span className="flex items-center gap-0.5 justify-end">
      <button type="button" onClick={() => onEdit(college)} className={button}
        aria-label={`Edit ${college.college_name}`} title="Edit college details">
        <Edit2 size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onToggle(college)} className={button}
        aria-label={college.is_active
          ? `Deactivate ${college.college_name}`
          : `Activate ${college.college_name}`}
        title={college.is_active ? 'Deactivate' : 'Activate'}>
        <Power size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onDelete(college)} className={`${button} hover:text-spc-bad`}
        aria-label={`Delete ${college.college_name}`} title="Delete (only when unused)">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

/*
 * Declared proportions. Six columns of short values left to a browser's own
 * sharing gave the Actions column 267px to hold a 42px control, stranding it
 * 166px from the status it sits beside — the same fault the officer's PRN table
 * and the student's applications table had.
 */
const COLUMNS = [
  ['College', 'w-[30%]', 'text-left'],
  ['Region', 'w-[16%]', 'text-left'],
  ['Students', 'w-[10%]', 'text-left'],
  ['Officer', 'w-[18%]', 'text-left'],
  ['Status', 'w-[12%]', 'text-right'],
];

function CollegeTable({ colleges, actions }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <caption className="sr-only">
            Every college, with controls to edit, activate or delete each one.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {COLUMNS.map(([heading, width, align]) => (
                <th key={heading} scope="col"
                  className={`font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body px-4 py-2.5 whitespace-nowrap ${width} ${align}`}>
                  {heading}
                </th>
              ))}
              <th scope="col" className="w-[14%] px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {colleges.map((college) => (
              <tr key={college.id}
                className={`border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2
                  ${college.is_active ? '' : 'opacity-60'}`}>
                <th scope="row" className="px-4 py-3 text-left">
                  <span className="block text-spc-sm font-bold text-spc-ink break-words">
                    {college.college_name}
                  </span>
                  <span className="block text-spc-xs font-normal text-spc-body">
                    {college.college_code}
                  </span>
                </th>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{college.region_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink tabular-nums">
                  {college.student_count}
                </td>
                <td className="px-4 py-3"><OfficerMark college={college} /></td>
                <td className="px-4 py-3 text-right"><StatusMark active={college.is_active} /></td>
                <td className="px-4 py-3 text-right">
                  <CollegeActions college={college} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CollegeList({ colleges, actions }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {colleges.map((college) => (
          <li key={college.id} className={`p-4 ${college.is_active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink break-words">
                  {college.college_name}
                </p>
                <p className="text-spc-xs text-spc-body">{college.college_code}</p>
                <p className="text-spc-xs text-spc-body mt-1 flex items-center gap-1">
                  <MapPin size={13} aria-hidden="true" />
                  {college.region_name}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 flex items-center gap-1 tabular-nums">
                  <Users size={13} aria-hidden="true" />
                  {college.student_count} students
                </p>
                <p className="mt-1"><OfficerMark college={college} /></p>
              </div>
              <StatusMark active={college.is_active} />
            </div>
            <div className="mt-2">
              <CollegeActions college={college} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function CollegesBody(p) {
  const { layout, portalSettings } = p;
  const filterColumns = layout === 'desktop' ? 'lg:grid-cols-3' : 'sm:grid-cols-2';
  const snapshot = portalSettings?.mode_switch_snapshot;

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Colleges"
        subline="The colleges and regions this portal serves"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryButton onClick={p.onOpenImport}>
            <UploadCloud size={15} aria-hidden="true" />
            Bulk import
          </SecondaryButton>
          <SecondaryButton onClick={p.onOpenRegions}>
            <Globe2 size={15} aria-hidden="true" />
            Regions
          </SecondaryButton>
          <PrimaryButton onClick={p.onAddCollege}>
            <Plus size={15} aria-hidden="true" />
            Add college
          </PrimaryButton>
        </div>
      </PageHeading>

      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="colleges" value={p.colleges.length} />
        <Metric label="active" value={p.activeCount} tone="ok" />
        <Metric label="inactive" value={p.colleges.length - p.activeCount} tone="muted" />
        <Metric label="regions" value={p.regions.length} />
      </div>

      {/* ------------------------------------------------ single-college policy */}
      {portalSettings?.single_college && (
        <PolicyPanel
          title="Officer job posts"
          action={(
            <SecondaryButton onClick={p.onToggleJobApproval}>
              {portalSettings.single_college_require_job_approval
                ? 'Let them publish directly'
                : 'Require my approval'}
            </SecondaryButton>
          )}
        >
          {portalSettings.single_college_require_job_approval
            ? 'A placement officer’s job post waits for your approval on the Job Requests page before it goes live.'
            : 'A placement officer’s job post publishes immediately, without your approval.'}
          {' '}This choice exists only because the portal has exactly one active college —
          with several, a college’s own posts are always auto-approved.
        </PolicyPanel>
      )}

      {/* -------------------------------------------------------- mode switch */}
      {portalSettings?.mode_switch_available && (
        <PolicyPanel
          title="Mode switch — a testing tool"
          tone={snapshot ? 'warn' : undefined}
          action={snapshot ? (
            <SecondaryButton onClick={p.onModeRestore} disabled={p.submitting}>
              Restore every college
            </SecondaryButton>
          ) : (
            portalSettings.active_colleges > 1 && (
              <SecondaryButton onClick={p.onOpenModeSwitch}>
                Switch to one college…
              </SecondaryButton>
            )
          )}
        >
          {snapshot ? (
            <>
              <span className="font-bold text-spc-ink">
                A single-college simulation is running.
              </span>{' '}
              {snapshot.kept_college_name} was kept and{' '}
              {snapshot.deactivated_college_ids?.length} colleges were deactivated on{' '}
              {new Date(snapshot.switched_at).toLocaleString('en-IN')}. Restore when you are done.
            </>
          ) : (
            <>
              Temporarily deactivates every college but one, so the simplified single-college
              experience can be tested. Nothing is deleted — a snapshot is kept and the restore
              puts back exactly what was switched off. For staging, never a live portal.
            </>
          )}
        </PolicyPanel>
      )}

      {/* ------------------------------------------------------------ filters */}
      <Panel className="p-4 mb-4">
        <SectionLabel>Find a college</SectionLabel>
        <div className={`grid grid-cols-1 ${filterColumns} gap-3`}>
          <div className="relative min-w-0">
            <Search size={17} aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none" />
            <input
              id="college-search"
              type="text"
              value={p.searchQuery}
              onChange={(e) => p.onSearch(e.target.value)}
              placeholder="Search by name or code…"
              aria-label="Search colleges by name or code"
              className={`${FIELD_CLASS} pl-10`}
            />
          </div>
          <select
            id="college-region"
            value={p.selectedRegion}
            onChange={(e) => p.onRegion(e.target.value)}
            aria-label="Filter by region"
            className={FIELD_CLASS}
          >
            <option value="">All regions</option>
            {p.regions.map((region) => (
              <option key={region.id} value={region.id}>{region.region_name}</option>
            ))}
          </select>
          <select
            id="college-status"
            value={p.statusFilter}
            onChange={(e) => p.onStatus(e.target.value)}
            aria-label="Filter by status"
            className={FIELD_CLASS}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Panel>

      {/* ------------------------------------------------------------- the list */}
      <SectionLabel>
        {p.filteredColleges.length === p.colleges.length
          ? `${p.colleges.length} colleges`
          : `${p.filteredColleges.length} of ${p.colleges.length} colleges`}
      </SectionLabel>

      {p.filteredColleges.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.colleges.length === 0
              ? 'No colleges yet. "Add college" creates the first one.'
              : 'No college matches those filters.'}
          </EmptyState>
        </Panel>
      ) : (
        layout === 'desktop'
          ? <CollegeTable colleges={p.filteredColleges} actions={p.actions} />
          : <CollegeList colleges={p.filteredColleges} actions={p.actions} />
      )}

      <p className="text-spc-xs text-spc-body mt-3">
        Branches for each college are set on the{' '}
        <Link to="/super-admin/college-branches"
          className="font-bold text-spc-accent hover:underline">
          College Branches
        </Link>{' '}
        page, and its officer on the Placement Officers page.
      </p>
    </div>
  );
}

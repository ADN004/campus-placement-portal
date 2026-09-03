import { Link } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronRight, Eye, Edit2, Trash2, Lock, Unlock, Building2, Globe,
} from 'lucide-react';
import { Panel, FIELD_CLASS, SecondaryButton, formatDate } from '../../../components/admin/AdminUI';

/**
 * The pieces the PRN Ranges page is built from, shared by its table and its
 * list so a range reads the same on a laptop and a phone.
 */

/* --------------------------------------------------------------- one range */

/** What a range covers: a span, or a single PRN. */
export function RangeSpan({ range }) {
  if (range.single_prn) {
    return (
      <span className="text-spc-sm font-bold text-spc-ink tabular-nums">{range.single_prn}</span>
    );
  }
  return (
    <span className="text-spc-sm font-bold text-spc-ink tabular-nums">
      {range.range_start} <span className="text-spc-body font-normal">to</span> {range.range_end}
    </span>
  );
}

/**
 * Enabled or disabled, and why.
 *
 * Disabling is the consequential one — every student inside a disabled range
 * has their account deactivated — so it is the state that gets a colour and a
 * reason. Enabled is the ordinary case and says so quietly.
 */
export function RangeStatus({ range }) {
  if (range.is_enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-spc-xs font-semibold text-spc-ink">
        <Unlock size={13} aria-hidden="true" className="flex-shrink-0" />
        Enabled
      </span>
    );
  }
  return (
    <span className="min-w-0">
      <span className="inline-flex items-center gap-1.5 text-spc-xs font-bold text-spc-bad">
        <Lock size={13} aria-hidden="true" className="flex-shrink-0" />
        Disabled
      </span>
      {range.disabled_reason && (
        <span className="block text-spc-xs text-spc-body mt-0.5 break-words">
          {range.disabled_reason}
        </span>
      )}
    </span>
  );
}

/** The three controls every range carries, at a real target size. */
export function RangeActions({ range, onEdit, onToggle, onDelete }) {
  const label = range.single_prn || `${range.range_start}–${range.range_end}`;
  const button = 'inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm '
    + 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors';
  return (
    <span className="flex items-center gap-1 justify-end">
      <Link
        to={`/super-admin/prn-ranges/${range.id}/students`}
        aria-label={`View students in ${label}`}
        title="View students"
        className={button}
      >
        <Eye size={17} aria-hidden="true" />
      </Link>
      <button type="button" onClick={() => onEdit(range)} aria-label={`Edit ${label}`} title="Edit" className={button}>
        <Edit2 size={17} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onToggle(range)}
        aria-label={`${range.is_enabled ? 'Disable' : 'Enable'} ${label}`}
        title={range.is_enabled ? 'Disable' : 'Enable'}
        className={button}
      >
        {range.is_enabled ? <Lock size={17} aria-hidden="true" /> : <Unlock size={17} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(range.id)}
        aria-label={`Delete ${label}`}
        title="Delete"
        className={`${button} hover:text-spc-bad`}
      >
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </span>
  );
}

/* ----------------------------------------------------------------- controls */

export function RangeFilters({ layout, search, onSearch, yearFilter, onYear, years }) {
  const columns = layout === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2';
  return (
    <div className={`grid ${columns} gap-3 mb-4`}>
      <div className="relative min-w-0">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none"
        />
        <input
          id="range-search"
          type="text"
          value={search}
          onChange={onSearch}
          placeholder="Jump to a college or PRN…"
          aria-label="Search ranges"
          className={`${FIELD_CLASS} pl-10`}
        />
      </div>
      <select
        id="year-filter"
        value={yearFilter}
        onChange={onYear}
        aria-label="Filter by year"
        className={FIELD_CLASS}
      >
        <option value="active">Active years only</option>
        <option value="all">All years</option>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------- groups */

/**
 * One college's ranges, collapsed until asked for.
 *
 * Sixty colleges' ranges in one flat list is unreadable, so they are grouped and
 * the heading carries the counts — how many spans, how many single PRNs, how
 * many disabled — because that is what tells you whether to open it.
 */
export function GroupHeading({ group, expanded, onToggle }) {
  const Icon = group.isSystemWide ? Globe : Building2;
  return (
    <button
      type="button"
      onClick={() => onToggle(group.key)}
      aria-expanded={expanded}
      className="w-full flex items-center gap-3 px-4 py-3 text-left
        hover:bg-spc-surface-2 transition-colors"
    >
      {expanded
        ? <ChevronDown size={17} aria-hidden="true" className="text-spc-body flex-shrink-0" />
        : <ChevronRight size={17} aria-hidden="true" className="text-spc-body flex-shrink-0" />}
      <Icon size={17} aria-hidden="true" className="text-spc-body flex-shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-spc-sm font-bold text-spc-ink break-words">{group.label}</span>
        <span className="block text-spc-xs text-spc-body tabular-nums">
          {group.rangeCount} {group.rangeCount === 1 ? 'range' : 'ranges'}
          {group.singleCount > 0 && ` · ${group.singleCount} single`}
          {group.disabledCount > 0 && (
            <span className="text-spc-bad font-semibold"> · {group.disabledCount} disabled</span>
          )}
        </span>
      </span>
    </button>
  );
}

/** Desktop: the ranges inside a group, as table rows. */
export function RangeTable({ ranges, onEdit, onToggle, onDelete }) {
  return (
    <div className="overflow-x-auto border-t border-spc-line">
      <table className="min-w-full">
        <caption className="sr-only">PRN ranges for this college.</caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b border-spc-line">
            {['Range / PRN', 'Year', 'Description', 'Status', 'Added'].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                  text-spc-body text-left px-4 py-2"
              >
                {heading}
              </th>
            ))}
            <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={range.id} className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
              <th scope="row" className="px-4 py-3 text-left font-normal align-top">
                <RangeSpan range={range} />
                {range.single_prn && (
                  <span className="block text-spc-xs text-spc-body">Single PRN</span>
                )}
              </th>
              <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums align-top">{range.year || '—'}</td>
              <td className="px-4 py-3 text-spc-xs text-spc-body align-top break-words max-w-xs">
                {range.description || '—'}
              </td>
              <td className="px-4 py-3 align-top max-w-xs"><RangeStatus range={range} /></td>
              <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums align-top">
                {formatDate(range.created_at)}
              </td>
              <td className="px-4 py-3 align-top">
                <RangeActions range={range} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phone and tablet: the same ranges, read down the page. */
export function RangeList({ ranges, onEdit, onToggle, onDelete }) {
  return (
    <ul className="divide-y divide-spc-line border-t border-spc-line">
      {ranges.map((range) => (
        <li key={range.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <RangeSpan range={range} />
              <p className="text-spc-xs text-spc-body tabular-nums">
                {range.single_prn ? 'Single PRN' : 'Range'}
                {range.year && ` · ${range.year}`}
                {` · added ${formatDate(range.created_at)}`}
              </p>
            </div>
            <RangeStatus range={range} />
          </div>
          {range.description && (
            <p className="text-spc-xs text-spc-body mt-1.5 break-words">{range.description}</p>
          )}
          <div className="mt-2">
            <RangeActions range={range} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The grouped register, whichever shape the device calls for. */
export function RangeGroups({ layout, groups, isExpanded, onToggleGroup, onEdit, onToggle, onDelete }) {
  const Rows = layout === 'desktop' ? RangeTable : RangeList;
  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const expanded = isExpanded(group.key);
        return (
          <Panel key={group.key} className="overflow-hidden">
            <GroupHeading group={group} expanded={expanded} onToggle={onToggleGroup} />
            {expanded && (
              <Rows ranges={group.ranges} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
            )}
          </Panel>
        );
      })}
    </div>
  );
}

/** Expand / collapse, beside the count of what is showing. */
export function GroupControls({ shown, total, onExpandAll, onCollapseAll }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
      <p className="font-khand text-spc-label font-medium uppercase tracking-[0.14em] text-spc-body">
        {shown} of {total} {total === 1 ? 'college' : 'colleges'}
      </p>
      <div className="flex items-center gap-2">
        <SecondaryButton onClick={onExpandAll}>Expand all</SecondaryButton>
        <SecondaryButton onClick={onCollapseAll}>Collapse all</SecondaryButton>
      </div>
    </div>
  );
}

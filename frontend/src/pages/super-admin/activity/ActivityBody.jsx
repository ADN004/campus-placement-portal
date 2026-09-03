import {
  Search, Eye, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
} from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState, FieldLabel, FIELD_CLASS,
  SecondaryButton,
} from '../../../components/admin/AdminUI';
import { ActionMark, RoleMark, formatMoment } from './activityShared';

/**
 * The audit trail.
 *
 * Every row is one thing somebody did. The point of the page is finding a
 * particular one, so the filters lead and the table is plain — the old one put
 * a five-colour gradient behind the header and a coloured pill on every cell,
 * including LOGIN, which is most of the rows.
 *
 * Export used to be a dropdown positioned by reading `getBoundingClientRect()`
 * during render into a `fixed` panel — which does not follow a scroll, and
 * placed itself at `right - 288px`, off the left edge of a phone. Two buttons.
 */

export const ACTION_TYPES = [
  'LOGIN', 'LOGOUT',
  'STUDENT_APPROVED', 'STUDENT_REJECTED', 'STUDENT_BLACKLISTED', 'STUDENT_WHITELISTED',
  'JOB_CREATED', 'JOB_APPROVED', 'JOB_REJECTED', 'JOB_UPDATED', 'JOB_DELETED',
  'NOTIFICATION_SENT', 'PRN_RANGE_ADDED', 'PRN_RANGE_DELETED',
  'OFFICER_CREATED', 'OFFICER_UPDATED', 'PASSWORD_CHANGED',
  'WHITELIST_REQUEST_APPROVED', 'WHITELIST_REQUEST_REJECTED',
];

export const USER_ROLES = ['Super Admin', 'Placement Officer', 'Student'];

function Metric({ label, value }) {
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
      min-w-[120px] flex-1">
      <p className="text-spc-metric font-bold text-spc-ink tabular-nums">{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

function LogTable({ logs, onView }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">
            Activity log entries: who did what, and when.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {['Who', 'Did what', 'When'].map((h) => (
                <th key={h} scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-right">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left align-top">
                  <span className="block text-spc-sm font-bold text-spc-ink break-words">
                    {log.user_name || 'System'}
                  </span>
                  <span className="block text-spc-xs font-normal text-spc-body break-words">
                    {log.user_email || '—'}
                  </span>
                  <RoleMark role={log.user_role} />
                </th>
                <td className="px-4 py-3 align-top"><ActionMark actionType={log.action_type} /></td>
                <td className="px-4 py-3 align-top text-spc-xs text-spc-body
                  whitespace-nowrap tabular-nums">
                  {formatMoment(log.created_at)}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <button
                    type="button"
                    onClick={() => onView(log)}
                    aria-label={`Details of log ${log.id}`}
                    title="View details"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
                      text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
                  >
                    <Eye size={16} aria-hidden="true" />
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

function LogList({ logs, onView }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {logs.map((log) => (
          <li key={log.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ActionMark actionType={log.action_type} />
                <p className="text-spc-sm font-bold text-spc-ink break-words mt-0.5">
                  {log.user_name || 'System'}
                </p>
                <p className="text-spc-xs text-spc-body break-words">{log.user_email || '—'}</p>
                <p className="text-spc-xs text-spc-body mt-0.5 tabular-nums">
                  {formatMoment(log.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onView(log)}
                aria-label={`Details of log ${log.id}`}
                title="View details"
                className="inline-flex items-center justify-center w-11 h-11 flex-shrink-0
                  rounded-spc-admin-sm text-spc-body hover:bg-spc-surface-2
                  hover:text-spc-ink transition-colors"
              >
                <Eye size={16} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ActivityBody(p) {
  const { layout, filters, pagination } = p;
  const columns = layout === 'desktop' ? 'lg:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Activity Logs"
        subline="Who did what, and when"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryButton onClick={() => p.onExport('csv')} disabled={p.logs.length === 0}>
            <FileSpreadsheet size={15} aria-hidden="true" />
            CSV
          </SecondaryButton>
          <SecondaryButton onClick={() => p.onExport('pdf')} disabled={p.logs.length === 0}>
            <FileText size={15} aria-hidden="true" />
            PDF
          </SecondaryButton>
        </div>
      </PageHeading>

      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="entries match" value={pagination.totalLogs} />
        <Metric label="on this page" value={p.logs.length} />
        <Metric label={`of ${pagination.totalPages}`} value={`Page ${pagination.currentPage}`} />
      </div>

      {/* ----------------------------------------------------------- filters */}
      <Panel className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <SectionLabel className="mb-0">Narrow it down</SectionLabel>
          {p.activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 rounded-spc-admin-sm bg-spc-accent text-spc-on-accent
              text-[10px] font-bold uppercase tracking-wide">
              {p.activeFiltersCount} on
            </span>
          )}
        </div>

        <div className={`grid grid-cols-1 ${columns} gap-3`}>
          <div className="relative min-w-0">
            <FieldLabel htmlFor="log-search">Search</FieldLabel>
            <Search size={17} aria-hidden="true"
              className="absolute left-3 top-[38px] text-spc-body pointer-events-none" />
            <input
              id="log-search"
              type="text"
              value={filters.search}
              onChange={(e) => p.onFilterChange('search', e.target.value)}
              placeholder="Email or action…"
              className={`${FIELD_CLASS} pl-10`}
            />
          </div>

          <div>
            <FieldLabel htmlFor="log-action">Action</FieldLabel>
            <select
              id="log-action"
              className={FIELD_CLASS}
              value={filters.action_type}
              onChange={(e) => p.onFilterChange('action_type', e.target.value)}
            >
              <option value="">Every action</option>
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="log-role">Role</FieldLabel>
            <select
              id="log-role"
              className={FIELD_CLASS}
              value={filters.user_role}
              onChange={(e) => p.onFilterChange('user_role', e.target.value)}
            >
              <option value="">Every role</option>
              {USER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="log-from">From</FieldLabel>
            <input
              id="log-from"
              type="date"
              className={FIELD_CLASS}
              value={filters.date_from}
              onChange={(e) => p.onFilterChange('date_from', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor="log-to">To</FieldLabel>
            <input
              id="log-to"
              type="date"
              className={FIELD_CLASS}
              value={filters.date_to}
              onChange={(e) => p.onFilterChange('date_to', e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor="log-limit">Per page</FieldLabel>
            <select
              id="log-limit"
              className={FIELD_CLASS}
              value={filters.limit}
              onChange={(e) => p.onFilterChange('limit', parseInt(e.target.value, 10))}
            >
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Filters apply on their own after a pause in typing; this is a re-fetch. */}
          <SecondaryButton onClick={p.onRefresh}>Refresh</SecondaryButton>
          <SecondaryButton onClick={p.onClearFilters} disabled={p.activeFiltersCount === 0}>
            Clear all
          </SecondaryButton>
        </div>
      </Panel>

      {/* --------------------------------------------------------- the trail */}
      <SectionLabel>Entries</SectionLabel>

      {p.loading ? (
        <Panel>
          <EmptyState>Loading the log…</EmptyState>
        </Panel>
      ) : p.logs.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.activeFiltersCount > 0
              ? 'No entry matches those filters.'
              : 'No activity has been logged yet.'}
          </EmptyState>
        </Panel>
      ) : (
        <>
          {layout === 'desktop'
            ? <LogTable logs={p.logs} onView={p.onView} />
            : <LogList logs={p.logs} onView={p.onView} />}

          <Panel className="mt-4 p-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-spc-xs text-spc-body tabular-nums">
              Page <span className="font-bold text-spc-ink">{pagination.currentPage}</span> of{' '}
              <span className="font-bold text-spc-ink">{pagination.totalPages}</span>
              {' · '}
              <span className="font-bold text-spc-ink">{pagination.totalLogs}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <SecondaryButton
                onClick={() => p.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft size={15} aria-hidden="true" />
                Previous
              </SecondaryButton>
              <SecondaryButton
                onClick={() => p.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Next
                <ChevronRight size={15} aria-hidden="true" />
              </SecondaryButton>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

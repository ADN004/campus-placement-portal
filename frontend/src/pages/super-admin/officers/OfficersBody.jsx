import {
  Search, Plus, Eye, History, Key, UserCheck, UserX, Trash2, Building2, MapPin, Phone, Mail,
} from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState, FIELD_CLASS,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';
import { OfficerStanding } from './officersShared';

/**
 * One placement officer per college, across sixty colleges.
 *
 * Five things can be done to each of them and three of those are serious —
 * suspend, remove, reset the password — so the row's controls are labelled
 * targets rather than 32px glyphs that only announce themselves on hover.
 *
 * Suspend and Remove are deliberately different, and the confirmations say so: a
 * suspended officer still holds their college's seat, so no replacement can be
 * appointed until they are reactivated or removed.
 */

function Metric({ label, value, tone }) {
  const toneClass = tone === 'ok' ? 'text-spc-ok'
    : tone === 'warn' ? 'text-spc-warn' : 'text-spc-ink';
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
      min-w-[120px] flex-1">
      <p className={`text-spc-metric font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

function OfficerActions({ officer, onView, onHistory, onResetPassword, onToggleSuspend, onRemove }) {
  const button = 'inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm '
    + 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors';
  const suspended = officer.officer_status === 'suspended';

  return (
    <span className="flex items-center gap-0.5 justify-end">
      <button type="button" onClick={() => onView(officer)} className={button}
        aria-label={`View ${officer.officer_name}'s record`} title="View details">
        <Eye size={16} aria-hidden="true" />
      </button>

      <button type="button" onClick={() => onHistory(officer)} className={button}
        aria-label={`Officer history for ${officer.college_name}`} title="Officer history">
        <History size={16} aria-hidden="true" />
      </button>

      <button type="button" onClick={() => onResetPassword(officer)} className={button}
        aria-label={`Reset ${officer.officer_name}'s password`} title="Reset password to the default">
        <Key size={16} aria-hidden="true" />
      </button>

      {officer.officer_status !== 'removed' && (
        <button
          type="button"
          onClick={() => onToggleSuspend(officer)}
          className={button}
          aria-label={suspended
            ? `Reactivate ${officer.officer_name}`
            : `Suspend ${officer.officer_name}`}
          title={suspended
            ? 'Reactivate — allow sign-in'
            : 'Suspend — block sign-in, keep the seat'}
        >
          {suspended
            ? <UserCheck size={16} aria-hidden="true" />
            : <UserX size={16} aria-hidden="true" />}
        </button>
      )}

      <button type="button" onClick={() => onRemove(officer)} className={`${button} hover:text-spc-bad`}
        aria-label={`Remove ${officer.officer_name}`} title="Remove officer">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

const COLUMNS = [
  ['Officer', 'w-[24%]', 'text-left'],
  ['Phone', 'w-[13%]', 'text-left'],
  ['Email', 'w-[20%]', 'text-left'],
  ['College', 'w-[20%]', 'text-left'],
  ['Status', 'w-[9%]', 'text-right'],
];

function OfficerTable({ officers, actions }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <caption className="sr-only">
            Every placement officer, with controls to view, reset a password,
            suspend or remove each one.
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
            {officers.map((officer) => (
              <tr key={officer.id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left">
                  <span className="block text-spc-sm font-bold text-spc-ink break-words">
                    {officer.officer_name || '—'}
                  </span>
                  <span className="block text-spc-xs font-normal text-spc-body break-words">
                    {officer.region_name || '—'}
                  </span>
                </th>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums">
                  {officer.phone_number || '—'}
                </td>
                <td className="px-4 py-3 text-spc-xs text-spc-body break-words">
                  {officer.officer_email || '—'}
                </td>
                <td className="px-4 py-3 text-spc-xs text-spc-body break-words">
                  {officer.college_name || '—'}
                </td>
                <td className="px-4 py-3 text-right"><OfficerStanding officer={officer} /></td>
                <td className="px-4 py-3 text-right">
                  <OfficerActions officer={officer} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function OfficerList({ officers, actions }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {officers.map((officer) => (
          <li key={officer.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink break-words">
                  {officer.officer_name || '—'}
                </p>
                <p className="text-spc-xs text-spc-body mt-1 flex items-center gap-1.5 break-words">
                  <Building2 size={13} aria-hidden="true" className="flex-shrink-0" />
                  {officer.college_name || '—'}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden="true" className="flex-shrink-0" />
                  {officer.region_name || '—'}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 flex items-center gap-1.5 tabular-nums">
                  <Phone size={13} aria-hidden="true" className="flex-shrink-0" />
                  {officer.phone_number || '—'}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 flex items-center gap-1.5 break-words">
                  <Mail size={13} aria-hidden="true" className="flex-shrink-0" />
                  {officer.officer_email || '—'}
                </p>
              </div>
              <OfficerStanding officer={officer} />
            </div>
            <div className="mt-2">
              <OfficerActions officer={officer} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function OfficersBody(p) {
  const { layout } = p;
  const filtering = Boolean(p.searchQuery || p.selectedRegion);

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Placement Officers"
        subline="One per college, across the sixty colleges"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={p.onAddOfficer}>
          <Plus size={15} aria-hidden="true" />
          Add officer
        </PrimaryButton>
      </PageHeading>

      {/*
        All four counts read the same columns the rows do. The old "active" card
        compared a boolean against the string 'active', so it read 0 forever —
        see the container.
      */}
      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="officers" value={p.officers.length} />
        <Metric label="active" value={p.activeCount} tone="ok" />
        <Metric label="suspended" value={p.suspendedCount} tone="warn" />
        <Metric label="regions" value={p.regions.length} />
      </div>

      <Panel className="p-4 mb-4">
        <SectionLabel>Find an officer</SectionLabel>
        <div className={`grid grid-cols-1 ${layout === 'desktop' ? 'sm:grid-cols-2' : ''} gap-3`}>
          <div className="relative min-w-0">
            <Search size={17} aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none" />
            <input
              id="officer-search"
              type="text"
              value={p.searchQuery}
              onChange={(e) => p.onSearch(e.target.value)}
              placeholder="Search by name, college or email…"
              aria-label="Search officers by name, college or email"
              className={`${FIELD_CLASS} pl-10`}
            />
          </div>
          <select
            id="officer-region"
            value={p.selectedRegion}
            onChange={(e) => p.onRegion(e.target.value)}
            aria-label="Filter by region"
            className={FIELD_CLASS}
          >
            <option value="">All regions</option>
            {p.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.region_name || region.name}
              </option>
            ))}
          </select>
        </div>

        {filtering && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <p className="text-spc-xs text-spc-body">
              Narrowed to {p.filteredOfficers.length} of {p.officers.length}.
            </p>
            <SecondaryButton onClick={p.onClearFilters}>Clear filters</SecondaryButton>
          </div>
        )}
      </Panel>

      <SectionLabel>
        {p.filteredOfficers.length === p.officers.length
          ? `${p.officers.length} officers`
          : `${p.filteredOfficers.length} of ${p.officers.length} officers`}
      </SectionLabel>

      {p.filteredOfficers.length === 0 ? (
        <Panel>
          <EmptyState>
            {filtering
              ? 'No officer matches those filters.'
              : 'No placement officers yet.'}
          </EmptyState>
        </Panel>
      ) : (
        layout === 'desktop'
          ? <OfficerTable officers={p.filteredOfficers} actions={p.actions} />
          : <OfficerList officers={p.filteredOfficers} actions={p.actions} />
      )}
    </div>
  );
}

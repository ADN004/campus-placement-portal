import { Lock, Unlock, Search, UserCheck } from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState, FIELD_CLASS,
  SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/**
 * Two freezes, per college.
 *
 * A **registration** lock refuses new student registrations and leaves
 * already-approved students alone. A **PRN-range** lock stops that college's
 * officer adding or editing ranges. Neither ever blocks the super admin, and
 * both come off instantly — which is why locking is a small action here and not
 * a ceremony.
 *
 * The four bulk buttons were the same size and colour as each other, two of
 * which reach all sixty colleges. They are grouped and paired now, and the
 * destructive half is the only half that is red.
 */
export const LOCK_LABELS = {
  registration: 'Student registration',
  prn_ranges: 'PRN range editing',
};

/*
 * Declared at module scope on purpose.
 *
 * This was a component defined inside the page's own body, so a new function
 * identity was created on every render and React tore the whole cell down and
 * rebuilt it each time rather than updating it. It held no state, so nothing
 * visibly broke — but it is the exact shape of the bug that loses an open
 * dropdown or the caret in a field, and it costs a full remount per keystroke in
 * the search box, sixty rows at a time.
 */
function LockState({ college, lockType, onLock, onUnlock, onAllowPrns, layout }) {
  const state = college[lockType];
  const stacked = layout !== 'desktop';

  if (!state.locked) {
    return (
      <div className={stacked ? 'flex items-center justify-between gap-3' : 'flex flex-col gap-2'}>
        <span className="text-spc-xs font-semibold text-spc-ok">Open</span>
        <SecondaryButton
          onClick={() => onLock(college.college_id, lockType, college.college_name)}
          className="w-fit"
        >
          <Lock size={14} aria-hidden="true" />
          Lock
        </SecondaryButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-spc-xs font-bold text-spc-bad">Locked</span>

      {state.reason && (
        <span className="text-spc-xs text-spc-body break-words">{state.reason}</span>
      )}

      {state.locked_at && (
        <span className="text-spc-xs text-spc-body">
          {new Date(state.locked_at).toLocaleDateString('en-IN')}
          {state.locked_by_name ? ` · ${state.locked_by_name}` : ''}
        </span>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-0.5">
        <SecondaryButton
          onClick={() => onUnlock(college.college_id, lockType, college.college_name)}
        >
          <Unlock size={14} aria-hidden="true" />
          Unlock
        </SecondaryButton>

        {lockType === 'registration' && (
          <SecondaryButton
            onClick={() => onAllowPrns(college)}
            title="PRNs allowed to register despite the lock"
          >
            <UserCheck size={14} aria-hidden="true" />
            {(state.allowed_prns?.length || 0) > 0
              ? `${state.allowed_prns.length} let through`
              : 'Let a PRN through'}
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  const toneClass = tone === 'bad' ? 'text-spc-bad' : 'text-spc-ink';
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin
      min-w-[140px] flex-1">
      <p className={`text-spc-metric font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

function LocksTable({ colleges, handlers }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">
            Every college, with its registration and PRN-range lock and the controls to change each.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {['College', 'Region', LOCK_LABELS.registration, LOCK_LABELS.prn_ranges].map((h) => (
                <th key={h} scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colleges.map((college) => (
              <tr key={college.college_id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row"
                  className="px-4 py-4 text-left text-spc-sm font-bold text-spc-ink align-top break-words">
                  {college.college_name}
                </th>
                <td className="px-4 py-4 text-spc-xs text-spc-body align-top">
                  {college.region_name || '—'}
                </td>
                <td className="px-4 py-4 align-top">
                  <LockState college={college} lockType="registration" layout="desktop" {...handlers} />
                </td>
                <td className="px-4 py-4 align-top">
                  <LockState college={college} lockType="prn_ranges" layout="desktop" {...handlers} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LocksList({ colleges, handlers, layout }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {colleges.map((college) => (
          <li key={college.college_id} className="p-4">
            <p className="text-spc-sm font-bold text-spc-ink break-words">{college.college_name}</p>
            <p className="text-spc-xs text-spc-body">{college.region_name || '—'}</p>

            <div className="mt-3 space-y-3">
              {['registration', 'prn_ranges'].map((lockType) => (
                <div key={lockType}
                  className="p-3 rounded-spc-admin-sm bg-spc-surface-2 border border-spc-line-strong">
                  <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1.5">
                    {LOCK_LABELS[lockType]}
                  </p>
                  <LockState college={college} lockType={lockType} layout={layout} {...handlers} />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function LocksBody(p) {
  const { layout } = p;
  const handlers = {
    onLock: p.onLock,
    onUnlock: p.onUnlock,
    onAllowPrns: p.onAllowPrns,
  };

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Locks"
        subline="Freeze a college's registration or its PRN ranges once a deadline passes"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <Panel className="p-4 mb-4">
        <p className="text-spc-sm text-spc-body max-w-3xl">
          A <span className="font-bold text-spc-ink">registration</span> lock refuses new student
          registrations only — already-approved students keep signing in. A{' '}
          <span className="font-bold text-spc-ink">PRN-range</span> lock stops that college&apos;s
          placement officer adding or editing ranges. Neither ever blocks you, and unlocking takes
          effect immediately.
        </p>
      </Panel>

      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="colleges" value={p.colleges.length} />
        <Metric label="registration locked" value={p.regLocked}
          tone={p.regLocked > 0 ? 'bad' : undefined} />
        <Metric label="PRN ranges locked" value={p.prnLocked}
          tone={p.prnLocked > 0 ? 'bad' : undefined} />
      </div>

      {/* ------------------------------------------------------- everything */}
      <Panel className="p-4 mb-4">
        <SectionLabel>All sixty at once</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['registration', LOCK_LABELS.registration],
            ['prn_ranges', LOCK_LABELS.prn_ranges],
          ].map(([lockType, label]) => (
            <div key={lockType}
              className="p-3 rounded-spc-admin-sm bg-spc-surface-2 border border-spc-line-strong">
              <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-2">
                {label}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <DangerButton onClick={() => p.onLock('all', lockType, null)}>
                  <Lock size={14} aria-hidden="true" />
                  Lock every college
                </DangerButton>
                <SecondaryButton onClick={() => p.onUnlock('all', lockType, null)}>
                  <Unlock size={14} aria-hidden="true" />
                  Unlock every college
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ----------------------------------------------------------- search */}
      <Panel className="p-4 mb-4">
        <SectionLabel>Find a college</SectionLabel>
        <div className="relative max-w-md">
          <Search size={17} aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none" />
          <input
            id="lock-search"
            type="text"
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="Search college or region…"
            aria-label="Search by college or region"
            className={`${FIELD_CLASS} pl-10`}
          />
        </div>
      </Panel>

      <SectionLabel>
        {p.filtered.length === p.colleges.length
          ? `${p.colleges.length} colleges`
          : `${p.filtered.length} of ${p.colleges.length} colleges`}
      </SectionLabel>

      {p.filtered.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.colleges.length === 0
              ? 'No colleges to show.'
              : 'No college matches that search.'}
          </EmptyState>
        </Panel>
      ) : (
        layout === 'desktop'
          ? <LocksTable colleges={p.filtered} handlers={handlers} />
          : <LocksList colleges={p.filtered} handlers={handlers} layout={layout} />
      )}
    </div>
  );
}

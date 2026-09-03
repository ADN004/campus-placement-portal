import { Check, X, Eye } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/**
 * Whitelist requests — an officer asking for a blacklisted student to be let
 * back in, and the decision on it.
 *
 * These are drawn as cards rather than table rows because the substance of the
 * decision is two pieces of prose: why the student was barred, and why the
 * officer thinks they should not be. A table put both behind `line-clamp-2` in a
 * `max-w-xs` cell, so the one thing you have to read to decide was the one thing
 * you could not read.
 *
 * The four counters and the four tabs above the table were the same control
 * twice — both set `activeTab`, to the same four values. They are one row now.
 */

/** Where a request stands. */
export function StatusMark({ status }) {
  if (status === 'approved') {
    return <span className="text-spc-xs font-semibold text-spc-ok">Approved</span>;
  }
  if (status === 'rejected') {
    return <span className="text-spc-xs font-semibold text-spc-bad">Rejected</span>;
  }
  if (status === 'pending') {
    return <span className="text-spc-xs font-semibold text-spc-warn">Pending</span>;
  }
  return <span className="text-spc-xs font-semibold text-spc-body">Unknown</span>;
}

/** Dates here carry a time: a review is an event, not a day. */
export function formatMoment(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * One counter, which is also the filter.
 *
 * `aria-pressed` rather than a tab role: these filter a list in place, they do
 * not switch between panels.
 */
function CountTile({ label, value, active, onClick, tone }) {
  const toneClass = tone === 'warn' ? 'text-spc-warn'
    : tone === 'ok' ? 'text-spc-ok'
      : tone === 'bad' ? 'text-spc-bad' : 'text-spc-ink';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`p-4 text-left rounded-spc-admin border transition-colors min-w-[130px] flex-1
        ${active
          ? 'bg-spc-selected border-spc-accent'
          : 'bg-spc-surface border-spc-line-strong hover:bg-spc-surface-2'}`}
    >
      <p className={`text-spc-metric font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </button>
  );
}

/** One piece of the request, labelled. */
function Fact({ label, children, tone }) {
  const box = tone === 'bad' ? 'bg-spc-bad-bg border-spc-bad/30'
    : tone === 'ok' ? 'bg-spc-ok-bg border-spc-ok/30'
      : 'bg-spc-surface-2 border-spc-line-strong';
  return (
    <div className={`p-3 rounded-spc-admin border ${box}`}>
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1">{label}</p>
      <div className="text-spc-sm text-spc-ink break-words whitespace-pre-line">{children}</div>
    </div>
  );
}

function RequestCard({ layout, request, onView, onApprove, onReject }) {
  const pending = request.status === 'pending';

  return (
    <Panel className="overflow-hidden">
      <PanelHeading
        action={(
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <SecondaryButton onClick={() => onView(request)}>
              <Eye size={15} aria-hidden="true" />
              Details
            </SecondaryButton>
            {pending && (
              <>
                <DangerButton onClick={() => onReject(request)}>
                  <X size={15} aria-hidden="true" />
                  Reject
                </DangerButton>
                <PrimaryButton onClick={() => onApprove(request)}>
                  <Check size={15} aria-hidden="true" />
                  Approve
                </PrimaryButton>
              </>
            )}
          </div>
        )}
      >
        <span className="block min-w-0">
          <span className="block text-spc-sm font-bold text-spc-ink break-words">
            {request.student_name}
          </span>
          <span className="block text-spc-xs font-normal text-spc-body tabular-nums">
            {request.student_prn} · {request.college_name}
          </span>
        </span>
      </PanelHeading>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <p className="text-spc-xs text-spc-body">
            Asked for by <span className="font-bold text-spc-ink">{request.officer_name}</span>
            {' · '}{formatMoment(request.created_at)}
          </p>
          <StatusMark status={request.status} />
        </div>

        <div className={`grid gap-3 ${layout === 'desktop' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          <Fact label="Barred because" tone="bad">
            {request.blacklist_reason || '—'}
          </Fact>
          <Fact label="The officer's case" tone="ok">
            {request.whitelist_reason || '—'}
          </Fact>
        </div>

        {request.review_comment && !pending && (
          <div className="mt-3">
            <Fact label={request.status === 'approved' ? 'Approved with' : 'Refused because'}>
              {request.review_comment}
            </Fact>
          </div>
        )}
      </div>
    </Panel>
  );
}

const TABS = [
  ['all', 'in total', undefined],
  ['pending', 'waiting on you', 'warn'],
  ['approved', 'let back in', 'ok'],
  ['rejected', 'refused', 'bad'],
];

export default function WhitelistBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Students"
        title="Whitelist Requests"
        subline="Officers asking for a blacklisted student to be let back in"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <div className="flex gap-3 flex-wrap mb-5">
        {TABS.map(([key, label, tone]) => (
          <CountTile
            key={key}
            label={label}
            value={p.stats[key === 'all' ? 'total' : key]}
            tone={tone}
            active={p.activeTab === key}
            onClick={() => p.onTab(key)}
          />
        ))}
      </div>

      <SectionLabel>
        {p.activeTab === 'all' ? 'Every request' : `${p.activeTab} requests`}
      </SectionLabel>

      {p.requests.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.activeTab === 'pending'
              ? 'Nothing waiting. Requests appear here when an officer asks for a blacklisted student to be let back in.'
              : `No ${p.activeTab === 'all' ? '' : `${p.activeTab} `}whitelist requests.`}
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="space-y-3">
            {p.requests.map((request) => (
              <RequestCard
                key={request.id}
                layout={layout}
                request={request}
                onView={p.onView}
                onApprove={p.onApprove}
                onReject={p.onReject}
              />
            ))}
          </div>
          <p className="text-spc-xs text-spc-body mt-3 tabular-nums">
            Showing {p.requests.length} of {p.stats.total} whitelist requests.
          </p>
        </>
      )}
    </div>
  );
}

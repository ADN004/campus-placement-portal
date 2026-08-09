import { Eye } from 'lucide-react';
import {
  Panel, PanelHeading, SecondaryButton, EmptyState, formatDate,
} from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three CreateJobRequest presenters.
 *
 * This is the first officer page that is mostly a form, so it is where the
 * Register form treatment gets defined — see FormSection below. Every later
 * form page should use the same component rather than growing its own.
 */

/* ------------------------------------------------------------------- form */

/**
 * A ruled form section: a structural rule with its legend sitting ON the rule,
 * and no card around the fields.
 *
 * This is the direction's form signature, and the reason a form here looks
 * different from the student role rather than merely recoloured. The old markup
 * wrapped each group in a rounded, shadowed panel and gave it a 20px heading;
 * boxing a form group adds an edge that means nothing — the rule already says
 * "a new group starts here", and it does it with one line instead of four.
 *
 * The legend is Khand, the condensed face reserved for exactly this and for
 * table column headers.
 */
export function FormSection({ title, hint, children }) {
  return (
    <section className="pt-5 mt-5 border-t-[1.5px] border-spc-rule-structural first:mt-0 first:pt-0 first:border-t-0">
      <div className="-mt-[calc(0.5rem+1px)] mb-4 first:mt-0">
        <h3 className="inline-block bg-spc-surface pr-3 font-khand font-medium uppercase
          tracking-[0.06em] text-spc-sm text-spc-ink">
          {title}
        </h3>
        {hint && <p className="text-xs text-spc-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A responsive field grid. Only the column count differs by device. */
export function FieldGrid({ columns = 2, className = '', children }) {
  const cols =
    columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return <div className={`grid ${cols} gap-4 ${className}`}>{children}</div>;
}

/** Marks a required field without spending a status colour on decoration. */
export function RequiredMark() {
  return (
    <span className="text-spc-bad" aria-hidden="true">
      *
    </span>
  );
}

/* ----------------------------------------------------------------- status */

/**
 * Request status as a dot plus the word, not a filled pill — same treatment as
 * every other status in this role.
 *
 * `auto_approved` and `approved` both mean live, but they are kept distinct
 * because the officer needs to know whether a Super Admin ever saw it. A job
 * whose request was approved but has since been deleted reads as its own state
 * rather than silently still showing "approved".
 *
 * That deleted state comes from `job_exists`, which the API derives by looking
 * for a job row linked to the request: true when it is there, false when an
 * approved request's job has gone, and null for anything not approved. The old
 * markup tested `job_deleted`, which no endpoint has ever returned, so the
 * notice could not appear at all.
 */
const REQUEST_STATUS = {
  pending: { label: 'Pending', dot: 'bg-spc-warn' },
  approved: { label: 'Approved', dot: 'bg-spc-ok' },
  auto_approved: { label: 'Published', dot: 'bg-spc-ok' },
  rejected: { label: 'Rejected', dot: 'bg-spc-bad' },
};

export function RequestStatus({ status, jobDeleted }) {
  if (jobDeleted) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-spc-muted flex-shrink-0" />
        <span className="text-spc-xs font-semibold text-spc-ink">Job deleted</span>
      </span>
    );
  }
  const meta = REQUEST_STATUS[status] || { label: status || '—', dot: 'bg-spc-muted' };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
      <span className="text-spc-xs font-semibold text-spc-ink">{meta.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------ stat block */

export function StatBlock({ requests, columns = 3 }) {
  const stats = [
    { label: 'Total requests', value: requests.length },
    { label: 'Pending', value: requests.filter((r) => r.status === 'pending').length },
    {
      label: 'Approved / published',
      value: requests.filter((r) => r.status === 'approved' || r.status === 'auto_approved').length,
    },
  ];
  const cols = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div
      className={`grid ${cols} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden`}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-spc-surface p-4 flex flex-col min-h-[92px]">
          <span className="text-spc-label font-bold uppercase text-spc-muted leading-tight">
            {stat.label}
          </span>
          <span className="block text-spc-metric font-bold text-spc-ink text-right mt-auto tabular-nums">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- filters */

export const REQUEST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

/**
 * Filter strip, same treatment as the student status tabs: the active one is a
 * step up the surface ladder plus a rule, because the tint alone measures
 * 1.29:1 against white and is invisible on a bright monitor.
 */
export function RequestFilterTabs({ active, counts, onChange, scroll = false }) {
  return (
    <div
      className={`flex gap-px bg-spc-line border border-spc-line-strong rounded-spc-panel
        ${scroll ? 'overflow-x-auto' : 'overflow-hidden'}`}
    >
      {REQUEST_FILTERS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 min-w-[88px] min-h-[52px] px-3 flex flex-col items-center justify-center
              gap-0.5 transition-colors border-t-2
              ${isActive
                ? 'bg-spc-surface-3 text-spc-ink border-spc-accent'
                : 'bg-spc-surface text-spc-muted border-transparent hover:bg-spc-surface-2 hover:text-spc-ink'}`}
          >
            <span className="text-spc-xs font-bold whitespace-nowrap">{label}</span>
            <span className="text-xs font-semibold tabular-nums">{counts[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- how it works */

/**
 * The explainer that used to be a large tinted callout. It is reference text,
 * so it reads as a quiet ruled panel rather than something demanding attention.
 */
export function HowItWorks({ points }) {
  return (
    <Panel>
      <PanelHeading>How it works</PanelHeading>
      <ul>
        {points.map((point) => (
          <li
            key={point}
            className="px-4 py-3 text-spc-xs text-spc-body leading-snug border-b border-spc-line last:border-b-0"
          >
            {point}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export const HOW_IT_WORKS_POINTS = [
  'A request targeting only your own college is published to your students immediately.',
  'A request targeting other regions or colleges goes to the Super Admin for approval.',
  'Extended profile requirements are carried with the request, so students are asked for them before applying.',
  'You can review any request and its outcome from the table below.',
];

/* --------------------------------------------------------------- requests */

const columnsFor = (isDesktop) =>
  isDesktop
    ? ['Job title', 'Company', 'Location', 'Salary', 'Deadline', 'Status', 'Actions']
    : null;

/** Desktop: the requests as a real ruled table. */
export function RequestTable({ requests, onView }) {
  if (requests.length === 0) {
    return <EmptyState>No job requests yet. Create your first one to get started.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Your job requests, with company, location, salary, deadline and approval status.
        </caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            {columnsFor(true).map((label, i) => (
              <th
                key={label}
                scope="col"
                className={`px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
                  text-spc-xs text-spc-muted whitespace-nowrap
                  ${i === 3 || i === 4 ? 'text-right' : 'text-left'}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors"
            >
              <th scope="row" className="px-3 py-2 text-left text-spc-xs font-bold text-spc-ink">
                {request.job_title}
              </th>
              <td className="px-3 py-2 text-spc-xs text-spc-ink">{request.company_name}</td>
              <td className="px-3 py-2 text-spc-xs text-spc-body">{request.location || '–'}</td>
              <td className="px-3 py-2 text-spc-xs text-spc-ink text-right tabular-nums">
                {request.salary_range ? `${request.salary_range} LPA` : '–'}
              </td>
              <td className="px-3 py-2 text-spc-xs text-spc-body text-right tabular-nums whitespace-nowrap">
                {formatDate(request.application_deadline)}
              </td>
              <td className="px-3 py-2">
                <RequestStatus status={request.status} jobDeleted={request.job_exists === false} />
              </td>
              <td className="px-3 py-2">
                <ViewButton request={request} onView={onView} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phone and tablet: the same requests as a ruled list. */
export function RequestList({ requests, onView }) {
  if (requests.length === 0) {
    return <EmptyState>No job requests yet. Create your first one to get started.</EmptyState>;
  }

  return (
    <ul>
      {requests.map((request) => (
        <li key={request.id} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-spc-sm font-bold text-spc-ink break-words">{request.job_title}</p>
              <p className="text-spc-xs text-spc-body mt-0.5 break-words">{request.company_name}</p>
              <p className="text-xs text-spc-muted mt-1 tabular-nums">
                {request.location || 'No location'}
                {request.salary_range ? ` · ${request.salary_range} LPA` : ''}
              </p>
              <p className="text-xs text-spc-muted mt-0.5 tabular-nums">
                Closes {formatDate(request.application_deadline)}
              </p>
            </div>
            <RequestStatus status={request.status} jobDeleted={request.job_exists === false} />
          </div>
          <div className="flex justify-end mt-1">
            <ViewButton request={request} onView={onView} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ViewButton({ request, onView }) {
  return (
    <SecondaryButton
      className="min-h-[40px] px-3"
      onClick={() => onView(request)}
      aria-label={`View details for ${request.job_title} at ${request.company_name}`}
    >
      <Eye size={15} aria-hidden="true" />
      <span>View</span>
    </SecondaryButton>
  );
}

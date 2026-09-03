import {
  Plus, Eye, Edit, ToggleLeft, ToggleRight, Users, Trash2, Check, X,
} from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { JobStanding, formatDay, formatMoment, targetDisplay, packageOf } from './jobsShared';

/**
 * Every job on the portal, in three lists.
 *
 * **All** is what is live, **Pending approval** is what officers have asked for,
 * and **Deleted history** is the audit trail of what was taken down. They were
 * three tables with the same eight-column shape and a gradient header, and none
 * of them worked below a laptop.
 *
 * Creating and editing are no longer a dialog — a job carries a deadline, an
 * eligibility rule, a sixty-college audience and a set of profile requirements,
 * which is a page, not something to squeeze behind a scrim.
 */

/** One counter, which is also the tab. */
function TabTile({ label, value, active, onClick }) {
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
      <p className="text-spc-metric font-bold text-spc-ink tabular-nums">{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </button>
  );
}

const ICON_BUTTON = 'inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm '
  + 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors';

function JobActions({ job, onView, onEdit, onToggleStatus, onExport, onDelete }) {
  return (
    <span className="flex items-center gap-0.5 justify-end">
      <button type="button" onClick={() => onView(job)} className={ICON_BUTTON}
        aria-label={`View ${job.title}`} title="View details">
        <Eye size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onEdit(job)} className={ICON_BUTTON}
        aria-label={`Edit ${job.title}`} title="Edit">
        <Edit size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onToggleStatus(job.id, job.is_active)}
        className={ICON_BUTTON}
        aria-label={job.is_active ? `Deactivate ${job.title}` : `Activate ${job.title}`}
        title={job.is_active ? 'Deactivate' : 'Activate'}>
        {job.is_active
          ? <ToggleRight size={16} aria-hidden="true" />
          : <ToggleLeft size={16} aria-hidden="true" />}
      </button>
      <button type="button" onClick={() => onExport(job)} className={ICON_BUTTON}
        aria-label={`Export applicants for ${job.title}`} title="Export applicants">
        <Users size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onDelete(job)} className={`${ICON_BUTTON} hover:text-spc-bad`}
        aria-label={`Delete ${job.title}`} title="Delete job">
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

/* ----------------------------------------------------------------- all jobs */

const JOB_COLUMNS = [
  ['Job', 'w-[26%]', 'text-left'],
  ['Location', 'w-[13%]', 'text-left'],
  ['Package', 'w-[11%]', 'text-left'],
  ['Closes', 'w-[12%]', 'text-left'],
  ['Reaches', 'w-[20%]', 'text-left'],
  ['Status', 'w-[8%]', 'text-right'],
];

function JobTable({ jobs, regions, colleges, actions }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <caption className="sr-only">
            Every job posting, with controls to view, edit, activate, export and delete each one.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {JOB_COLUMNS.map(([heading, width, align]) => (
                <th key={heading} scope="col"
                  className={`font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body px-4 py-2.5 whitespace-nowrap ${width} ${align}`}>
                  {heading}
                </th>
              ))}
              <th scope="col" className="w-[10%] px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left align-top">
                  <span className="block text-spc-sm font-bold text-spc-ink break-words">
                    {job.title}
                  </span>
                  <span className="block text-spc-xs font-normal text-spc-body break-words">
                    {job.company_name}
                  </span>
                </th>
                <td className="px-4 py-3 align-top text-spc-xs text-spc-body break-words">
                  {job.location || '—'}
                </td>
                <td className="px-4 py-3 align-top text-spc-xs text-spc-ink tabular-nums">
                  {packageOf(job.salary_package)}
                </td>
                <td className="px-4 py-3 align-top text-spc-xs text-spc-body tabular-nums">
                  {formatDay(job.application_deadline)}
                </td>
                <td className="px-4 py-3 align-top text-spc-xs text-spc-body break-words">
                  {targetDisplay(job, regions, colleges)}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <JobStanding active={job.is_active} />
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <JobActions job={job} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function JobList({ jobs, regions, colleges, actions }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {jobs.map((job) => (
          <li key={job.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink break-words">{job.title}</p>
                <p className="text-spc-xs text-spc-body break-words">{job.company_name}</p>
                <p className="text-spc-xs text-spc-body mt-1 break-words">
                  {job.location || '—'} · {packageOf(job.salary_package)}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 tabular-nums">
                  Closes {formatDay(job.application_deadline)}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 break-words">
                  Reaches {targetDisplay(job, regions, colleges)}
                </p>
              </div>
              <JobStanding active={job.is_active} />
            </div>
            <div className="mt-2">
              <JobActions job={job} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------ pending tab */

/**
 * Officer requests, as a shortcut.
 *
 * The same requests have a page of their own at `/super-admin/job-requests`,
 * where a rejection can carry a reason. This tab is the quicker path and keeps
 * the confirmation it always had.
 */
function PendingList({ layout, requests, onView, onApprove, onReject }) {
  if (requests.length === 0) {
    return (
      <Panel>
        <EmptyState>
          Nothing waiting. Requests appear here when an officer asks for a drive to be posted.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Panel key={request.id} className="overflow-hidden">
          <div className={`p-4 flex gap-3 ${layout === 'desktop'
            ? 'items-center justify-between' : 'flex-col'}`}>
            <div className="min-w-0">
              <p className="text-spc-sm font-bold text-spc-ink break-words">{request.job_title}</p>
              <p className="text-spc-xs text-spc-body break-words">{request.company_name}</p>
              <p className="text-spc-xs text-spc-body mt-1 break-words">
                {request.location || '—'} · {packageOf(request.salary_range)}
              </p>
              <p className="text-spc-xs text-spc-body mt-0.5 break-words">
                Asked for by <span className="font-bold text-spc-ink">
                  {request.officer_name || '—'}
                </span>{' · '}{request.college_name || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <SecondaryButton onClick={() => onView(request)}>
                <Eye size={15} aria-hidden="true" />
                Details
              </SecondaryButton>
              <DangerButton onClick={() => onReject(request.id)}>
                <X size={15} aria-hidden="true" />
                Reject
              </DangerButton>
              <PrimaryButton onClick={() => onApprove(request.id)}>
                <Check size={15} aria-hidden="true" />
                Approve
              </PrimaryButton>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ deleted tab */

function DeletedList({ layout, jobs, onClearHistory }) {
  return (
    <>
      {jobs.length > 0 && (
        <Panel className="p-4 mb-3 flex flex-col sm:flex-row sm:items-center
          sm:justify-between gap-3">
          <p className="text-spc-xs text-spc-body">
            Soft-deleted, and kept so there is a record of what came down and why.
          </p>
          <DangerButton onClick={onClearHistory} className="flex-shrink-0">
            <Trash2 size={15} aria-hidden="true" />
            Clear the history
          </DangerButton>
        </Panel>
      )}

      {jobs.length === 0 ? (
        <Panel>
          <EmptyState>Nothing has been deleted.</EmptyState>
        </Panel>
      ) : layout === 'desktop' ? (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <caption className="sr-only">Jobs that were deleted, and why.</caption>
              <thead>
                <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
                  {['Job', 'Location', 'Deleted by', 'Deleted', 'Reason'].map((h) => (
                    <th key={h} scope="col"
                      className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                        text-spc-body text-left px-4 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-spc-line last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left align-top">
                      <span className="block text-spc-sm font-bold text-spc-ink break-words">
                        {job.title}
                      </span>
                      <span className="block text-spc-xs font-normal text-spc-body break-words">
                        {job.company_name}
                      </span>
                    </th>
                    <td className="px-4 py-3 align-top text-spc-xs text-spc-body">
                      {job.location || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-spc-xs text-spc-body break-words">
                      {job.deleted_by_name || 'System'}
                    </td>
                    <td className="px-4 py-3 align-top text-spc-xs text-spc-body tabular-nums">
                      {formatMoment(job.deleted_at)}
                    </td>
                    <td className="px-4 py-3 align-top text-spc-xs text-spc-body break-words">
                      {job.deletion_reason || 'No reason given'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-spc-line">
            {jobs.map((job) => (
              <li key={job.id} className="p-4">
                <p className="text-spc-sm font-bold text-spc-ink break-words">{job.title}</p>
                <p className="text-spc-xs text-spc-body break-words">{job.company_name}</p>
                <p className="text-spc-xs text-spc-body mt-1 tabular-nums">
                  Deleted {formatMoment(job.deleted_at)} by {job.deleted_by_name || 'System'}
                </p>
                <p className="text-spc-xs text-spc-body mt-1 break-words">
                  {job.deletion_reason || 'No reason given'}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* --------------------------------------------------------------- the page */

export default function JobsBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Jobs"
        title="Jobs"
        subline="Every posting on the portal, what is waiting, and what came down"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={p.onCreate}>
          <Plus size={15} aria-hidden="true" />
          New job
        </PrimaryButton>
      </PageHeading>

      <div className="flex gap-3 flex-wrap mb-5">
        <TabTile label="posted" value={p.jobs.length}
          active={p.activeTab === 'all'} onClick={() => p.onTab('all')} />
        <TabTile label="waiting on you" value={p.pendingRequests.length}
          active={p.activeTab === 'pending'} onClick={() => p.onTab('pending')} />
        <TabTile label="deleted" value={p.deletedJobs.length}
          active={p.activeTab === 'deleted'} onClick={() => p.onTab('deleted')} />
      </div>

      {p.activeTab === 'all' && (
        <>
          <SectionLabel>Posted jobs</SectionLabel>
          {p.jobs.length === 0 ? (
            <Panel>
              <EmptyState>
                No jobs yet. &ldquo;New job&rdquo; posts the first one.
              </EmptyState>
            </Panel>
          ) : layout === 'desktop' ? (
            <JobTable jobs={p.jobs} regions={p.regions} colleges={p.colleges}
              actions={p.actions} />
          ) : (
            <JobList jobs={p.jobs} regions={p.regions} colleges={p.colleges}
              actions={p.actions} />
          )}
        </>
      )}

      {p.activeTab === 'pending' && (
        <>
          <SectionLabel>Waiting for approval</SectionLabel>
          <PendingList
            layout={layout}
            requests={p.pendingRequests}
            onView={p.actions.onView}
            onApprove={p.onApproveRequest}
            onReject={p.onRejectRequest}
          />
          <p className="text-spc-xs text-spc-body mt-3">
            The same requests have a page of their own under Job Requests, where a rejection can
            carry a reason the officer will see.
          </p>
        </>
      )}

      {p.activeTab === 'deleted' && (
        <>
          <SectionLabel>Deleted history</SectionLabel>
          <DeletedList layout={layout} jobs={p.deletedJobs} onClearHistory={p.onClearHistory} />
        </>
      )}
    </div>
  );
}

import { Search, Download, ChevronRight } from 'lucide-react';
import useLongList from '../../../hooks/useLongList';
import { ShowMore } from '../../../components/officer/LongList';
import {
  PageHeading, Panel, EmptyState, FIELD_CLASS, formatDate,
} from '../../../components/officer/OfficerUI';

/**
 * The job list — everything at /placement-officer/job-eligible-students.
 *
 * Selecting a job used to reveal the whole applicants screen below the picker,
 * so an officer on a phone chose a job and then scrolled past it to reach the
 * students. A job now opens on its own address instead, which gives it a
 * working Back button, a URL that survives a refresh and can be shared, and a
 * list page that stays usable as the number of drives grows.
 *
 * One component with a `layout` prop rather than three presenters: the devices
 * differ only in how many columns the list runs and how large the heading is.
 */
export default function JobListPage({
  layout, jobs, searchQuery, onSearchChange, onOpenJob, onDownloadJobPdf,
}) {
  const columns = layout === 'desktop' ? 2 : 1;
  const grid = columns === 2 ? 'sm:grid-cols-2' : '';

  // Every job ever published to this college stays visible here, so the grid
  // grows with the college's history. The search above narrows it; this bounds
  // what is left. 24 divides evenly into both column counts.
  const jobWindow = useLongList(jobs, { step: 24 });

  return (
    <div className={layout === 'mobile' ? 'pb-2' : undefined}>
      <PageHeading
        title="Job Applicants"
        subline="Choose a drive to review its applicants"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      {/* Search earns its place here: this list only grows. */}
      <div className="relative min-w-0 mb-4">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
        />
        <input
          id="job-search"
          type="text"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search by job title or company…"
          aria-label="Search jobs"
          className={`${FIELD_CLASS} pl-10`}
        />
      </div>

      {jobs.length === 0 ? (
        <Panel>
          <EmptyState>
            {searchQuery
              ? 'No jobs match that search.'
              : 'No active jobs available. Jobs appear here once they are published.'}
          </EmptyState>
        </Panel>
      ) : (
        <div
          className={`grid grid-cols-1 ${grid} gap-px bg-spc-line
            border border-spc-line-strong rounded-spc-panel overflow-hidden`}
        >
          {jobWindow.visible.map((job) => (
            <div key={job.id} className="relative bg-spc-surface hover:bg-spc-surface-2 transition-colors">
              {/* The whole tile opens the job. The PDF button sits above it and
                  stops the click, as it did on the old picker. */}
              <button
                type="button"
                onClick={() => onOpenJob(job)}
                className="w-full text-left p-4 pr-14 min-h-[104px]"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-spc-sm font-bold text-spc-ink break-words">
                      {job.job_title}
                    </span>
                    <span className="block text-spc-xs text-spc-body mt-0.5 break-words">
                      {job.company_name}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    aria-hidden="true"
                    className="text-spc-muted flex-shrink-0 mt-0.5"
                  />
                </span>

                <span className="block text-xs text-spc-muted mt-2 tabular-nums">
                  {job.min_cgpa ? `Min CGPA ${job.min_cgpa}` : 'No CGPA bar'}
                  {job.max_backlogs !== null && job.max_backlogs !== undefined
                    ? ` · Max backlogs ${job.max_backlogs}`
                    : ''}
                  {job.allowed_branches?.length ? ` · ${job.allowed_branches.length} branch(es)` : ''}
                </span>
                <span className="block text-xs text-spc-muted mt-0.5 tabular-nums">
                  Closes {formatDate(job.application_deadline)}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadJobPdf(job);
                }}
                aria-label={`Download job details for ${job.job_title} as PDF`}
                title="Download job details as PDF"
                className="absolute bottom-3 right-3 inline-flex items-center justify-center w-11 h-11
                  rounded-spc-control text-spc-body hover:bg-spc-surface-3 hover:text-spc-ink
                  transition-colors"
              >
                <Download size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {jobWindow.hasMore && (
        <div className="mt-4">
          <ShowMore onClick={jobWindow.showMore} remaining={jobWindow.remaining} noun="job" />
        </div>
      )}
    </div>
  );
}

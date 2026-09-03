import { Search, ChevronRight } from 'lucide-react';
import {
  PageHeading, Panel, EmptyState, SectionLabel, FIELD_CLASS, formatDate,
} from '../../../components/admin/AdminUI';
import Pagination from '../../../components/officer/Pagination';
import usePagedList from '../../../hooks/usePagedList';

/**
 * The drives to choose from — everything at
 * /super-admin/job-eligible-students.
 *
 * Choosing a job used to reveal the whole applicants screen below the picker,
 * so on a phone you picked a drive and then scrolled past a grid of sixty cards
 * to reach the students. A job opens on its own address now, which gives it a
 * working Back button, a URL that survives a refresh and can be shared, and a
 * list page that stays usable as the number of drives grows.
 *
 * The same split the officer role got, for the same reasons.
 */
export default function JobListPage({ layout, jobs, searchQuery, onSearchChange, onOpenJob }) {
  const columns = layout === 'desktop' ? 'sm:grid-cols-2 xl:grid-cols-3' : layout === 'tablet' ? 'sm:grid-cols-2' : '';

  /*
   * Every job ever posted stays reachable here, so the grid grows with the
   * portal's history. 24 a page, and sizes that divide evenly into both column
   * counts, so a page never ends with one orphan card beside a gap. Typing in
   * the search box starts again at the first page.
   */
  const jobPage = usePagedList(jobs, {
    pageSize: 24,
    resetKey: (searchQuery || '').trim().toLowerCase(),
  });

  return (
    <div>
      <PageHeading
        eyebrow="Jobs"
        title="Job Applicants"
        subline="Choose a drive to review who applied"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <div className="relative min-w-0 mb-4">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none"
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

      <SectionLabel>
        {jobs.length} active {jobs.length === 1 ? 'drive' : 'drives'}
      </SectionLabel>

      {jobs.length === 0 ? (
        <Panel>
          <EmptyState>
            {searchQuery
              ? 'No drives match that search.'
              : 'No active drives. They appear here once a job is published.'}
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className={`grid grid-cols-1 ${columns} gap-3`}>
            {jobPage.visible.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onOpenJob(job)}
                className="group text-left p-4 bg-spc-surface border border-spc-line-strong
                  rounded-spc-admin hover:bg-spc-surface-2 transition-colors"
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
                    size={17}
                    aria-hidden="true"
                    className="text-spc-body flex-shrink-0 mt-0.5"
                  />
                </span>

                <span className="block text-spc-xs text-spc-body mt-2 tabular-nums">
                  {job.min_cgpa ? `Min CGPA ${job.min_cgpa}` : 'No CGPA bar'}
                  {job.max_backlogs !== null && job.max_backlogs !== undefined
                    ? ` · Max backlogs ${job.max_backlogs}`
                    : ''}
                </span>
                <span className="block text-spc-xs text-spc-body mt-0.5 tabular-nums">
                  Closes {formatDate(job.application_deadline)}
                </span>
              </button>
            ))}
          </div>

          {jobPage.totalPages > 1 && (
            <div className="mt-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
              <Pagination
                currentPage={jobPage.page}
                totalPages={jobPage.totalPages}
                pageSize={jobPage.pageSize}
                total={jobPage.total}
                onPageChange={jobPage.setPage}
                onPageSizeChange={(e) => jobPage.setPageSize(Number(e.target.value))}
                label="Drives"
                sizes={[24, 48, 96, 192]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

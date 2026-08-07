import { motion } from 'framer-motion';
import { ShowMore } from '../../../components/student/StudentUI';
import {
  SearchField,
  FilterChips,
  JobCard,
  JobsEmptyState,
  JobsErrorState,
} from './jobsShared';

/**
 * Tablet (`md` up to below `lg`) presenter — two columns, with the search and
 * filters side by side on one sticky row rather than stacked. Enough width to
 * show every filter chip without scrolling, not enough for three columns.
 */
export default function TabletStudentJobs({
  error,
  jobs,
  filteredJobs,

  visibleJobs,

  shownCount,

  totalCount,

  hasMore,

  remaining,

  onShowMore,
  filters,
  filterEligibility,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onViewDetails,
  onApply,
}) {
  if (error) {
    return (
      <div>
        <Header />
        <JobsErrorState error={error} />
      </div>
    );
  }

  const isFiltered = Boolean(searchQuery) || filterEligibility !== 'all';

  return (
    <div>
      <Header count={filteredJobs.length} total={jobs.length} />

      <div className="sticky top-16 z-10 -mx-6 px-6 pt-2 pb-4 bg-spc-ground space-y-3">
        <SearchField placeholder="Search by company, title, or location…" value={searchQuery} onChange={onSearchChange} size="lg" />
        <FilterChips filters={filters} active={filterEligibility} onChange={onFilterChange} />
      </div>

      {filteredJobs.length === 0 ? (
        <JobsEmptyState filtered={isFiltered} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visibleJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: Math.min(index, 8) * 0.04 }}
            >
              <JobCard job={job} onViewDetails={onViewDetails} onApply={onApply} size="md" />
            </motion.div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-5">
          <ShowMore onClick={onShowMore} remaining={remaining} noun="job" />
        </div>
      )}
    </div>
  );
}

function Header({ count, total }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="mb-2"
    >
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Available Jobs</h1>
      <p className="text-spc-body text-spc-muted mt-1.5">
        {total === undefined
          ? 'Browse and apply to job opportunities'
          : count === total
          ? `${total} ${total === 1 ? 'opening' : 'openings'} open to you`
          : `Showing ${count} of ${total} openings`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the tablet jobs grid. */
export function TabletJobsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-10 w-72 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-56 bg-spc-surface-2 rounded animate-pulse mb-6" />

      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="flex gap-2 mb-6 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="h-5 w-44 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3.5 w-28 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="flex gap-2 mb-3">
              <div className="h-6 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-6 w-16 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
            <div className="flex gap-2 mb-4">
              <div className="h-7 w-24 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-7 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
            <div className="flex gap-2.5">
              <div className="h-12 flex-1 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-12 flex-1 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

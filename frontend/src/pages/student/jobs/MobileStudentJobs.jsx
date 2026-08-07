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
 * Mobile (below `md`) presenter — one column, and the search plus filters stick
 * to the top so a student scrolling a long list can always re-filter without
 * scrolling back up. Filters scroll horizontally inside their own row, so the
 * page itself never scrolls sideways.
 */
export default function MobileStudentJobs({
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
        <Header count={0} />
        <JobsErrorState error={error} />
      </div>
    );
  }

  const isFiltered = Boolean(searchQuery) || filterEligibility !== 'all';

  return (
    <div>
      <Header count={filteredJobs.length} total={jobs.length} />

      {/* Sticky control bar. `top-16` clears the fixed top bar; the negative
          margins let the solid ground run edge to edge so cards scroll under
          it cleanly. */}
      <div className="sticky top-16 z-10 -mx-4 px-4 pt-2 pb-3 bg-spc-ground space-y-2.5">
        <SearchField placeholder="Search by company, title, or location…" value={searchQuery} onChange={onSearchChange} />
        <FilterChips
          filters={filters}
          active={filterEligibility}
          onChange={onFilterChange}
          compact
        />
      </div>

      {filteredJobs.length === 0 ? (
        <JobsEmptyState filtered={isFiltered} />
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
            >
              <JobCard job={job} onViewDetails={onViewDetails} onApply={onApply} size="sm" />
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mb-1"
    >
      <h1 className="text-spc-display font-extrabold text-spc-ink">Jobs</h1>
      <p className="text-spc-sm text-spc-muted mt-1">
        {total === undefined
          ? 'Browse and apply to opportunities'
          : count === total
          ? `${total} ${total === 1 ? 'opening' : 'openings'}`
          : `${count} of ${total} shown`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the mobile jobs list. */
export function MobileJobsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-44 bg-spc-surface-2 rounded animate-pulse mb-5" />

      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2.5" />
      <div className="flex gap-2 mb-5 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse flex-shrink-0" />
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="h-5 w-40 bg-spc-surface-2 rounded animate-pulse mb-2" />
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

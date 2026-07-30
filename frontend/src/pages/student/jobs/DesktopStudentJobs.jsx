import { motion } from 'framer-motion';
import {
  SearchField,
  FilterChips,
  JobCard,
  JobsEmptyState,
  JobsErrorState,
} from './jobsShared';

/**
 * Desktop (`lg` and up) presenter — three columns, with search and filters on a
 * single row since there is width for both. Not sticky: at this size a screenful
 * already shows six to nine jobs, so the controls stay in normal flow.
 */
export default function DesktopStudentJobs({
  error,
  jobs,
  filteredJobs,
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex items-center gap-3 flex-wrap mb-7"
      >
        <div className="w-full xl:w-[340px] xl:flex-shrink-0">
          <SearchField value={searchQuery} onChange={onSearchChange} size="lg" />
        </div>
        <FilterChips filters={filters} active={filterEligibility} onChange={onFilterChange} />
      </motion.div>

      {filteredJobs.length === 0 ? (
        <JobsEmptyState filtered={isFiltered} />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12 + Math.min(index, 8) * 0.04 }}
            >
              <JobCard job={job} onViewDetails={onViewDetails} onApply={onApply} size="lg" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ count, total }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Available Jobs</h1>
      <p className="text-spc-body text-spc-muted mt-2">
        {total === undefined
          ? 'Browse and apply to job opportunities'
          : count === total
          ? `${total} ${total === 1 ? 'opening' : 'openings'} open to you`
          : `Showing ${count} of ${total} openings`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the desktop jobs grid. */
export function DesktopJobsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-11 w-80 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-64 bg-spc-surface-2 rounded animate-pulse mb-7" />

      <div className="flex items-center gap-3 flex-wrap mb-7">
        <div className="h-12 w-full xl:w-[340px] bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
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

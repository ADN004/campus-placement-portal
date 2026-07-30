import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState } from '../../../components/student/StudentUI';
import { ApplicationCard } from './applicationsShared';

/**
 * Mobile (below `md`) presenter — the desktop table becomes one card per
 * application, with search and filters stuck to the top so a student can
 * re-filter without scrolling back up.
 */
export default function MobileStudentApplications({
  error,
  applications,
  filteredApplications,
  filters,
  statusFilter,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onViewDetails,
}) {
  if (error) {
    return (
      <div>
        <Header />
        <ErrorState
          icon={FileText}
          error={error}
          pendingNote="Please wait for your placement officer to approve your registration. You'll be able to view your applications once approved."
        />
      </div>
    );
  }

  const hasNone = applications.length === 0;

  return (
    <div>
      <Header count={filteredApplications.length} total={applications.length} />

      {!hasNone && (
        <div className="sticky top-16 z-10 -mx-4 px-4 pt-2 pb-3 bg-spc-ground space-y-2.5">
          <SearchField
            placeholder="Search by company or job title…"
            value={searchQuery}
            onChange={onSearchChange}
          />
          <FilterChips
            filters={filters}
            active={statusFilter}
            onChange={onFilterChange}
            label="Filter by status"
            scroll
          />
        </div>
      )}

      {filteredApplications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasNone ? 'No applications yet' : 'No applications found'}
          message={
            hasNone
              ? "You haven't applied to any jobs yet. Start browsing available jobs and apply."
              : 'Try adjusting your search or filter.'
          }
          action={
            hasNone ? (
              <a
                href="/student/jobs"
                className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-spc-sm
                  bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity"
              >
                Browse jobs
              </a>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
            >
              <ApplicationCard
                application={application}
                onViewDetails={onViewDetails}
                size="sm"
              />
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mb-1"
    >
      <h1 className="text-spc-display font-extrabold text-spc-ink">Applications</h1>
      <p className="text-spc-sm text-spc-muted mt-1">
        {total === undefined
          ? 'Track your applications and their status'
          : count === total
          ? `${total} ${total === 1 ? 'application' : 'applications'}`
          : `${count} of ${total} shown`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the mobile applications list. */
export function MobileApplicationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-44 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-40 bg-spc-surface-2 rounded animate-pulse mb-5" />

      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2.5" />
      <div className="flex gap-2 mb-5 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse flex-shrink-0" />
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="flex justify-between gap-3 mb-4">
              <div className="flex-1">
                <div className="h-5 w-40 bg-spc-surface-2 rounded animate-pulse mb-2" />
                <div className="h-3.5 w-28 bg-spc-surface-2 rounded animate-pulse" />
              </div>
              <div className="h-7 w-24 bg-spc-surface-2 rounded-spc-sm animate-pulse flex-shrink-0" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-32 bg-spc-surface-2 rounded animate-pulse" />
              <div className="h-11 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

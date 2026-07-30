import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState } from '../../../components/student/StudentUI';
import { ApplicationCard } from './applicationsShared';

/**
 * Tablet (`md` up to below `lg`) presenter — two columns of cards. Still cards
 * rather than a table: a five-column table inside ~720px would be exactly the
 * squeezed desktop this redesign exists to remove.
 */
export default function TabletStudentApplications({
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
        <div className="sticky top-16 z-10 -mx-6 px-6 pt-2 pb-4 bg-spc-ground space-y-3">
          <SearchField
            placeholder="Search by company or job title…"
            value={searchQuery}
            onChange={onSearchChange}
            size="lg"
          />
          <FilterChips
            filters={filters}
            active={statusFilter}
            onChange={onFilterChange}
            label="Filter by status"
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
              <Link
                to="/student/jobs"
                className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-spc-sm
                  bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity"
              >
                Browse jobs
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredApplications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: Math.min(index, 8) * 0.04 }}
            >
              <ApplicationCard
                application={application}
                onViewDetails={onViewDetails}
                size="md"
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="mb-2"
    >
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">My Applications</h1>
      <p className="text-spc-body text-spc-muted mt-1.5">
        {total === undefined
          ? 'Track your job applications and their status'
          : count === total
          ? `${total} ${total === 1 ? 'application' : 'applications'} submitted`
          : `Showing ${count} of ${total} applications`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the tablet applications grid. */
export function TabletApplicationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-10 w-80 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-60 bg-spc-surface-2 rounded animate-pulse mb-6" />

      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="flex gap-2 mb-6 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
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

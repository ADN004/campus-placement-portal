import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState, ShowMore } from '../../../components/student/StudentUI';
import { StatusPill, formatDate } from './applicationsShared';

/**
 * Desktop (`lg` and up) presenter — keeps the real table, which is the right
 * shape for five columns of comparable rows at this width. Restyled onto the
 * design system: no gradient header bar, no zebra striping, and column labels
 * as small uppercase type.
 */
export default function DesktopStudentApplications({
  error,
  applications,
  filteredApplications,

  visibleApplications,

  hasMore,

  remaining,

  onShowMore,
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex items-center gap-3 flex-wrap mb-7"
        >
          <div className="w-full xl:w-[320px] xl:flex-shrink-0">
            <SearchField
              placeholder="Search by company or job title…"
              value={searchQuery}
              onChange={onSearchChange}
              size="lg"
            />
          </div>
          <FilterChips
            filters={filters}
            active={statusFilter}
            onChange={onFilterChange}
            label="Filter by status"
          />
        </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="rounded-spc bg-spc-surface border border-spc-line overflow-hidden"
        >
          <div className="overflow-x-auto">
            {/*
              Fixed proportions, because five short columns cannot fill a
              desktop on their own. Left to itself the browser shared several
              hundred pixels out and gave the last column 209px to hold a 76px
              button, stranding View 310px from the status it belongs to — a
              button so far from its row it reads as unrelated to it.

              Status is right-aligned for the same reason: left-aligned it sat
              at the far end of its own share with the gap doubled. What the
              application IS reads from the left, what has become of it and what
              you can do about it sit together on the right.
            */}
            <table className="w-full table-fixed min-w-[52rem]">
              <thead>
                <tr className="border-b border-spc-line">
                  <th className="w-[22%] px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                    Company
                  </th>
                  <th className="w-[30%] px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                    Job title
                  </th>
                  <th className="w-[16%] px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                    Applied
                  </th>
                  <th className="w-[22%] px-5 py-3.5 text-right text-spc-label font-bold uppercase text-spc-muted">
                    Status
                  </th>
                  <th className="w-[10%] px-5 py-3.5 text-right text-spc-label font-bold uppercase text-spc-muted">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((application) => (
                  <tr
                    key={application.id}
                    className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2/60 transition-colors"
                  >
                    <td className="px-5 py-4 text-spc-sm font-bold text-spc-ink truncate">
                      {application.company_name}
                    </td>
                    <td className="px-5 py-4 text-spc-sm text-spc-body truncate">
                      {application.job_title}
                    </td>
                    <td className="px-5 py-4 text-spc-sm text-spc-muted whitespace-nowrap">
                      {formatDate(application.applied_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusPill status={application.status} size="md" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onViewDetails(application)}
                        className="min-h-[40px] px-4 rounded-spc-sm bg-spc-surface text-spc-ink
                          border border-spc-line-strong text-spc-xs font-bold
                          hover:bg-spc-surface-2 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      {hasMore && (
        <div className="mt-5">
          <ShowMore onClick={onShowMore} remaining={remaining} noun="application" />
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
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">My Applications</h1>
      <p className="text-spc-body text-spc-muted mt-2">
        {total === undefined
          ? 'Track your job applications and their status'
          : count === total
          ? `${total} ${total === 1 ? 'application' : 'applications'} submitted`
          : `Showing ${count} of ${total} applications`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the desktop applications table. */
export function DesktopApplicationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-11 w-96 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-4 w-64 bg-spc-surface-2 rounded animate-pulse mb-7" />

      <div className="flex items-center gap-3 flex-wrap mb-7">
        <div className="h-12 w-full xl:w-[320px] bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>

      <div className="rounded-spc border border-spc-line bg-spc-surface p-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-4 border-b border-spc-line last:border-b-0">
            <div className="h-4 w-40 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-4 w-32 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-4 w-24 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-7 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            <div className="h-10 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

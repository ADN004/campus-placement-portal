import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  formatDate,
  StatusPill,
  VerificationNotice,
  buildProfileRows,
  HIGHLIGHT_TEXT,
  VerifiedChip,
  isFeaturedStat,
  SectionTitle,
  Eyebrow,
  JobFacts,
  JobBadges,
  UpcomingDrives,
} from './dashboardShared';

/**
 * Desktop (`lg` and up) presenter.
 *
 * Keeps the wide-screen shape — a four-across stat strip, a three-column
 * profile grid, three job cards in a row, a real table for applications and
 * four quick-action cards — but restyled onto the design system: solid
 * surfaces, one accent colour, and the type scale instead of 48px/900 headings.
 *
 * All state, effects, API calls and handlers live in the StudentDashboard
 * container; this file only renders what it is handed.
 */
export default function DesktopStudentDashboard({
  profile,
  upcomingDrives,
  statCards,
  quickActions,
  recentJobs,
  recentApplications,
  verificationStatus,
  resending,
  onResendVerification,
  onOpenEmailModal,
}) {
  const profileRows = buildProfileRows(profile);
  const showVerificationBanner =
    profile.registration_status === 'approved' && !profile.email_verified;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <div>
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        className="mb-8"
      >
        {profile.college_name && (
          <Eyebrow className="text-spc-brass mb-2">{profile.college_name}</Eyebrow>
        )}
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Student Dashboard</h1>
        <p className="text-spc-body text-spc-muted mt-2">
          {fullName || 'Welcome'}
          {profile.prn && <> · PRN {profile.prn}</>}
        </p>
      </motion.header>

      {/* ── Email verification ── */}
      {showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mb-8"
        >
          <VerificationNotice
            variant="desktop"
            email={profile.email}
            verificationStatus={verificationStatus}
            resending={resending}
            onResend={onResendVerification}
            onUpdateEmail={onOpenEmailModal}
          />
        </motion.div>
      )}

      {/* ── Stats ── */}
      <UpcomingDrives drives={upcomingDrives} />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10"
      >
        {statCards.map((stat) => (
          <StatTile key={stat.title} stat={stat} />
        ))}
      </motion.div>

      {/* ── Recent job openings ── */}
      {recentJobs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="mb-10"
        >
          <SectionTitle title="Recent openings" to="/student/jobs" linkLabel="View all jobs" size="lg" />
          <div className="grid grid-cols-3 gap-4">
            {recentJobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                to="/student/jobs"
                className="flex flex-col rounded-spc bg-spc-surface border border-spc-line p-5
                  hover:border-spc-line-strong hover:shadow-[0_12px_32px_-20px_rgba(18,33,31,0.4)]
                  transition-all"
              >
                <p className="text-spc-h2 font-bold text-spc-ink leading-tight break-words">
                  {job.company_name}
                </p>
                <p className="text-spc-sm text-spc-muted mt-1 break-words">{job.title}</p>
                <div className="mt-3">
                  <JobBadges job={job} />
                </div>
                <JobFacts job={job} className="mt-auto pt-4" />
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Recent applications ── */}
      {recentApplications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="mb-10"
        >
          <SectionTitle
            title="Recent applications"
            to="/student/applications"
            linkLabel="View all applications"
            size="lg"
          />
          <div className="rounded-spc bg-spc-surface border border-spc-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-spc-line">
                    <th className="px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                      Company
                    </th>
                    <th className="px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                      Job title
                    </th>
                    <th className="px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                      Applied
                    </th>
                    <th className="px-5 py-3.5 text-left text-spc-label font-bold uppercase text-spc-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.slice(0, 5).map((application) => (
                    <tr
                      key={application.id}
                      className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2/60 transition-colors"
                    >
                      <td className="px-5 py-4 text-spc-sm font-bold text-spc-ink">
                        {application.company_name}
                      </td>
                      <td className="px-5 py-4 text-spc-sm text-spc-body">{application.job_title}</td>
                      <td className="px-5 py-4 text-spc-sm text-spc-muted whitespace-nowrap">
                        {formatDate(application.applied_at)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={application.status} size="md" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Your profile ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-10"
      >
        <SectionTitle title="Your profile" size="lg" />
        <div className="rounded-spc bg-spc-surface border border-spc-line p-6">
          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            {profileRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <Eyebrow>{row.label}</Eyebrow>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p
                    className={`text-spc-sm break-words ${
                      row.highlight ? HIGHLIGHT_TEXT[row.highlight] : 'text-spc-ink font-semibold'
                    }`}
                  >
                    {row.value || 'N/A'}
                  </p>
                  {row.verified !== undefined && <VerifiedChip verified={row.verified} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Quick actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.36 }}
        className="mb-8"
      >
        <SectionTitle title="Quick actions" size="lg" />
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="group flex flex-col rounded-spc bg-spc-surface border border-spc-line p-5
                  hover:border-spc-line-strong hover:shadow-[0_12px_32px_-20px_rgba(18,33,31,0.4)]
                  transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="w-8 h-8 rounded-spc-sm bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
                    <Icon size={17} className="text-spc-teal" />
                  </span>
                  {action.count !== undefined && (
                    <span className="text-spc-metric font-extrabold text-spc-ink leading-none">
                      {action.count}
                    </span>
                  )}
                </div>
                <p className="text-spc-h3 font-bold text-spc-ink mt-4">{action.title}</p>
                <p className="text-spc-xs text-spc-muted mt-1 leading-snug">{action.description}</p>
                {/* mt-auto, not mt-4: "Update Profile" has no count and a
                    one-line description, so without this its Open row floats
                    up while the others sit lower. */}
                <span className="flex items-center gap-1 text-spc-xs font-bold text-spc-teal mt-auto pt-4 border-t border-spc-line">
                  <span>Open</span>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}

function StatTile({ stat }) {
  const Icon = stat.icon;
  const featured = isFeaturedStat(stat);

  const shell = `flex flex-col rounded-spc p-5 min-h-[136px] border transition-all ${
    featured
      ? 'bg-spc-teal border-spc-teal'
      : 'bg-spc-surface border-spc-line hover:border-spc-line-strong hover:shadow-[0_12px_32px_-20px_rgba(18,33,31,0.4)]'
  }`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`text-spc-label font-bold uppercase ${
            featured ? 'text-spc-on-teal-dim' : 'text-spc-muted'
          }`}
        >
          {stat.title}
        </span>
        <Icon
          size={19}
          className={`flex-shrink-0 ${featured ? 'text-spc-on-teal-dim' : 'text-spc-muted'}`}
        />
      </div>
      <span
        className={`text-spc-metric-lg font-extrabold mt-auto pt-3 ${
          featured ? 'text-spc-on-teal' : 'text-spc-ink'
        }`}
      >
        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
      </span>
      {stat.description && (
        <span
          className={`text-spc-xs mt-1.5 ${
            featured ? 'text-spc-on-teal-dim' : 'text-spc-muted'
          }`}
        >
          {stat.description}
        </span>
      )}
    </>
  );

  return stat.link ? (
    <Link to={stat.link} className={shell}>
      {content}
    </Link>
  ) : (
    <div className={shell}>{content}</div>
  );
}

/** Loading skeleton shaped like the desktop layout. */
export function DesktopDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <div className="h-3 w-52 bg-spc-surface-2 rounded animate-pulse mb-3" />
        <div className="h-11 w-80 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
        <div className="h-4 w-72 bg-spc-surface-2 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5 min-h-[136px]">
            <div className="h-3 w-24 bg-spc-surface-2 rounded animate-pulse mb-8" />
            <div className="h-9 w-16 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-spc-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="h-8 w-52 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
            <div className="h-5 w-44 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-4 w-28 bg-spc-surface-2 rounded animate-pulse mb-4" />
            <div className="flex gap-2 mb-4">
              <div className="h-6 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-6 w-16 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-24 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-7 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-8 w-60 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="rounded-spc border border-spc-line bg-spc-surface p-5 mb-10">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-4 border-b border-spc-line last:border-b-0">
            <div className="h-4 w-40 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-4 w-32 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-4 w-24 bg-spc-surface-2 rounded animate-pulse" />
            <div className="h-7 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse ml-auto" />
          </div>
        ))}
      </div>

      <div className="h-8 w-40 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="rounded-spc border border-spc-line bg-spc-surface p-6">
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          {[...Array(9)].map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 bg-spc-surface-2 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-spc-surface-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

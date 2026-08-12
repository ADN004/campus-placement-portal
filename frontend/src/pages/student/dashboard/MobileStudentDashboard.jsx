import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
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
 * Mobile (below `md`) presenter — a single-column, app-style home screen.
 *
 * Same data, same handlers, same destinations as desktop; only the arrangement
 * and styling differ. Order is action-first: identity, anything urgent, the
 * numbers, the shortcuts, then the feeds, then account details.
 *
 * Layout rules applied here: a 16px screen margin everything hangs off, three
 * type sizes only, a 12px floor on text, and the primary action at the bottom
 * inside thumb reach.
 */
export default function MobileStudentDashboard({
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
  // Purely visual disclosure for the 9-row profile list. No data is affected.
  const [profileExpanded, setProfileExpanded] = useState(false);

  const profileRows = buildProfileRows(profile);
  const visibleRows = profileExpanded ? profileRows : profileRows.slice(0, 3);
  const hiddenCount = profileRows.length - 3;

  const showVerificationBanner =
    profile.registration_status === 'approved' && !profile.email_verified;

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <div className="pb-2">
      {/* ── Greeting ── */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0 }}
        className="mb-6"
      >
        {profile.college_name && (
          <Eyebrow className="text-spc-brass mb-1.5 truncate">{profile.college_name}</Eyebrow>
        )}
        <h1 className="text-spc-display font-extrabold text-spc-ink">Dashboard</h1>
        <p className="text-spc-sm text-spc-muted mt-1">
          {fullName || 'Welcome'}
          {profile.prn && <> · PRN {profile.prn}</>}
        </p>
      </motion.header>

      {/* ── Email verification ── */}
      {showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.05 }}
          className="mb-6"
        >
          <VerificationNotice
            variant="mobile"
            email={profile.email}
            verificationStatus={verificationStatus}
            resending={resending}
            onResend={onResendVerification}
            onUpdateEmail={onOpenEmailModal}
          />
        </motion.div>
      )}

      {/* ── Stats: 2 × 2 ── */}
      <UpcomingDrives drives={upcomingDrives} />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.1 }}
        className="grid grid-cols-2 gap-2.5 mb-8"
      >
        {statCards.map((stat) => (
          <StatTile key={stat.title} stat={stat} />
        ))}
      </motion.div>

      {/* ── Quick actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.15 }}
        className="mb-8"
      >
        <SectionTitle title="Quick actions" />
        <div className="space-y-2.5">
          {quickActions.map((action) => (
            <ActionRow key={action.title} action={action} />
          ))}
        </div>
      </motion.section>

      {/* ── Recent job openings ── */}
      {recentJobs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.2 }}
          className="mb-8"
        >
          <SectionTitle title="Recent openings" to="/student/jobs" />
          <div className="space-y-2.5">
            {recentJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Recent applications (table → cards) ── */}
      {recentApplications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.25 }}
          className="mb-8"
        >
          <SectionTitle title="Recent applications" to="/student/applications" />
          <div className="space-y-2.5">
            {recentApplications.slice(0, 5).map((application) => (
              <div
                key={application.id}
                className="rounded-spc bg-spc-surface border border-spc-line p-4"
              >
                <p className="text-spc-h3 font-bold text-spc-ink break-words">
                  {application.company_name}
                </p>
                <p className="text-spc-xs text-spc-muted mt-0.5 break-words">
                  {application.job_title}
                </p>
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-spc-line">
                  <span className="text-xs text-spc-muted font-semibold">
                    {formatDate(application.applied_at)}
                  </span>
                  <StatusPill status={application.status} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Your profile (collapsible) ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.3 }}
        className="mb-6"
      >
        <SectionTitle title="Your profile" />
        <div className="rounded-spc bg-spc-surface border border-spc-line overflow-hidden">
          <div id="student-profile-details" className="px-4">
            {visibleRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-3.5 min-h-[52px]
                  border-b border-spc-line last:border-b-0"
              >
                <span className="text-spc-xs font-semibold text-spc-muted flex-shrink-0">
                  {row.label}
                </span>
                <span className="flex items-center gap-2 min-w-0 justify-end">
                  {row.verified !== undefined && <VerifiedChip verified={row.verified} />}
                  <span
                    className={`text-spc-xs text-right truncate ${
                      row.highlight ? HIGHLIGHT_TEXT[row.highlight] : 'text-spc-ink font-semibold'
                    }`}
                  >
                    {row.value || 'N/A'}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setProfileExpanded((open) => !open)}
            aria-expanded={profileExpanded}
            aria-controls="student-profile-details"
            className="w-full min-h-[48px] flex items-center justify-center gap-1.5 px-4
              text-spc-xs font-bold text-spc-teal bg-spc-surface-2/60
              border-t border-spc-line active:bg-spc-surface-2 transition-colors"
          >
            <span>{profileExpanded ? 'Show less' : `Show all details (${hiddenCount} more)`}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${profileExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </motion.section>
    </div>
  );
}

function StatTile({ stat }) {
  const Icon = stat.icon;
  const featured = isFeaturedStat(stat);

  const shell = `flex flex-col rounded-spc p-4 min-h-[112px] border transition-transform active:scale-[0.98] ${
    featured
      ? 'bg-spc-teal border-spc-teal'
      : 'bg-spc-surface border-spc-line'
  }`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-spc-label font-bold uppercase leading-tight ${
            featured ? 'text-spc-on-teal-dim' : 'text-spc-muted'
          }`}
        >
          {stat.title}
        </span>
        <Icon
          size={17}
          className={`flex-shrink-0 ${featured ? 'text-spc-on-teal-dim' : 'text-spc-muted'}`}
        />
      </div>
      <span
        className={`text-spc-metric font-extrabold mt-auto pt-3 ${
          featured ? 'text-spc-on-teal' : 'text-spc-ink'
        }`}
      >
        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
      </span>
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

function ActionRow({ action }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.link}
      className="flex items-center gap-3 rounded-spc bg-spc-surface border border-spc-line
        p-3.5 min-h-[68px] transition-transform active:scale-[0.99]"
    >
      {/* Fixed 32px icon box — text starts on the same vertical line in every
          row, which is what stops the list reading as ragged. */}
      <span className="w-8 h-8 rounded-spc-sm bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-spc-teal" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-spc-xs font-bold text-spc-ink leading-tight">
          {action.title}
        </span>
        <span className="block text-xs text-spc-muted leading-snug mt-0.5">
          {action.description}
        </span>
      </span>
      {action.count !== undefined && (
        <span className="text-spc-h2 font-extrabold text-spc-ink flex-shrink-0">
          {action.count}
        </span>
      )}
      <ChevronRight size={18} className="text-spc-muted flex-shrink-0" />
    </Link>
  );
}

function JobCard({ job }) {
  return (
    <Link
      to="/student/jobs"
      className="block rounded-spc bg-spc-surface border border-spc-line p-4
        transition-transform active:scale-[0.99]"
    >
      <p className="text-spc-h3 font-bold text-spc-ink leading-tight break-words">
        {job.company_name}
      </p>
      <p className="text-spc-xs text-spc-muted mt-0.5 break-words">{job.title}</p>
      <div className="mt-3">
        <JobBadges job={job} />
      </div>
      <JobFacts job={job} className="mt-3 pt-3 border-t border-spc-line" />
    </Link>
  );
}

/** Loading skeleton shaped like the mobile layout. */
export function MobileDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <div className="h-3 w-40 bg-spc-surface-2 rounded animate-pulse mb-3" />
        <div className="h-8 w-44 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
        <div className="h-4 w-56 bg-spc-surface-2 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4 min-h-[112px]">
            <div className="h-3 w-20 bg-spc-surface-2 rounded animate-pulse mb-6" />
            <div className="h-7 w-14 bg-spc-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="h-6 w-36 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="space-y-2.5 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-spc border border-spc-line bg-spc-surface p-3.5 min-h-[68px]">
            <div className="h-8 w-8 rounded-spc-sm bg-spc-surface-2 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-28 bg-spc-surface-2 rounded animate-pulse mb-2" />
              <div className="h-3 w-40 bg-spc-surface-2 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-6 w-40 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="space-y-2.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="h-4 w-36 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
              <div className="h-6 w-16 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

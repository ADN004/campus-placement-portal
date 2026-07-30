import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronRight } from 'lucide-react';
import {
  formatDate,
  StatusPill,
  buildProfileRows,
  HIGHLIGHT_TEXT,
  VerifiedChip,
  isFeaturedStat,
  SectionTitle,
  Eyebrow,
  JobFacts,
  JobBadges,
} from './dashboardShared';

/**
 * Tablet (`md` up to below `lg`) presenter.
 *
 * Its own layout, not a stretched phone and not a shrunk desktop: a full-width
 * stat strip, then a two-column working area (job feed beside a profile
 * companion panel), then full-width two-up card grids. The applications table
 * stays cards here — a four-column table inside ~420px is exactly the squeezed
 * desktop this redesign exists to remove. Touch targets stay phone-sized.
 */
export default function TabletStudentDashboard({
  profile,
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0 }}
        className="mb-7"
      >
        {profile.college_name && (
          <Eyebrow className="text-spc-brass mb-2">{profile.college_name}</Eyebrow>
        )}
        <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Student Dashboard</h1>
        <p className="text-spc-body text-spc-muted mt-1.5">
          {fullName || 'Welcome'}
          {profile.prn && <> · PRN {profile.prn}</>}
        </p>
      </motion.header>

      {/* ── Email verification ── */}
      {showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.05 }}
          className="mb-7 rounded-spc bg-spc-warn-bg p-5"
        >
          <div className="flex items-start gap-3.5">
            <AlertCircle className="text-spc-warn flex-shrink-0 mt-0.5" size={22} />
            <div className="min-w-0 flex-1">
              <h2 className="text-spc-h2 font-bold text-spc-ink">Verify your email address</h2>
              <p className="text-spc-sm text-spc-body mt-1">
                We&apos;ve sent a verification link to{' '}
                <span className="font-bold break-all">{profile.email}</span>. Check your inbox and
                spam folder.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onResendVerification}
              disabled={resending || !verificationStatus?.can_resend}
              className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-teal text-spc-on-teal
                text-spc-sm font-bold px-5 hover:opacity-95 active:scale-[0.99] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
            <button
              onClick={onOpenEmailModal}
              className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-surface text-spc-ink
                border border-spc-line-strong text-spc-sm font-bold px-5
                hover:bg-spc-surface-2 active:scale-[0.99] transition-all"
            >
              Update email address
            </button>
          </div>

          {verificationStatus && !verificationStatus.can_resend && (
            <p className="text-spc-xs text-spc-body mt-3 bg-spc-surface/70 rounded-spc-sm p-2.5">
              Maximum verification emails sent for today (
              {verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
            </p>
          )}
        </motion.div>
      )}

      {/* ── Stat strip: 4 across ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-8"
      >
        {statCards.map((stat) => (
          <StatTile key={stat.title} stat={stat} />
        ))}
      </motion.div>

      {/* ── Two-column working area ── */}
      <div className="grid grid-cols-5 gap-5 mb-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.15 }}
          className="col-span-3"
        >
          <SectionTitle title="Recent openings" to="/student/jobs" />
          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="rounded-spc bg-spc-surface border border-spc-line p-6 text-center">
              <p className="text-spc-sm text-spc-muted font-medium">No recent job openings.</p>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.2 }}
          className="col-span-2"
        >
          <SectionTitle title="Your profile" />
          <div className="rounded-spc bg-spc-surface border border-spc-line px-4">
            {profileRows.map((row) => (
              <div
                key={row.label}
                className="py-3 border-b border-spc-line last:border-b-0"
              >
                <Eyebrow>{row.label}</Eyebrow>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p
                    className={`text-spc-xs break-words ${
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
        </motion.section>
      </div>

      {/* ── Recent applications: 2-up cards ── */}
      {recentApplications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.25 }}
          className="mb-8"
        >
          <SectionTitle title="Recent applications" to="/student/applications" />
          <div className="grid grid-cols-2 gap-3">
            {recentApplications.slice(0, 5).map((application) => (
              <div
                key={application.id}
                className="rounded-spc bg-spc-surface border border-spc-line p-4 flex flex-col"
              >
                <p className="text-spc-h3 font-bold text-spc-ink break-words">
                  {application.company_name}
                </p>
                <p className="text-spc-xs text-spc-muted mt-0.5 break-words">
                  {application.job_title}
                </p>
                <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-spc-line">
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

      {/* ── Quick actions: 2-up ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.3 }}
        className="mb-6"
      >
        <SectionTitle title="Quick actions" />
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="flex items-start gap-3 rounded-spc bg-spc-surface border border-spc-line
                  p-4 min-h-[92px] hover:border-spc-line-strong active:scale-[0.99] transition-all"
              >
                <span className="w-8 h-8 rounded-spc-sm bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-spc-teal" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-spc-h3 font-bold text-spc-ink">{action.title}</span>
                    {action.count !== undefined && (
                      <span className="text-spc-h2 font-extrabold text-spc-ink flex-shrink-0">
                        {action.count}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-spc-muted leading-snug mt-1">
                    {action.description}
                  </span>
                </span>
                <ChevronRight size={17} className="text-spc-muted flex-shrink-0 mt-1" />
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

  const shell = `flex flex-col rounded-spc p-4 min-h-[118px] border transition-all ${
    featured
      ? 'bg-spc-teal border-spc-teal'
      : 'bg-spc-surface border-spc-line hover:border-spc-line-strong active:scale-[0.99]'
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
          size={18}
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

function JobCard({ job }) {
  return (
    <Link
      to="/student/jobs"
      className="block rounded-spc bg-spc-surface border border-spc-line p-4
        hover:border-spc-line-strong active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-spc-h2 font-bold text-spc-ink leading-tight break-words">
            {job.company_name}
          </p>
          <p className="text-spc-xs text-spc-muted mt-0.5 break-words">{job.title}</p>
        </div>
        <div className="flex-shrink-0">
          <JobBadges job={job} />
        </div>
      </div>
      <JobFacts job={job} className="mt-3 pt-3 border-t border-spc-line" />
    </Link>
  );
}

/** Loading skeleton shaped like the tablet layout. */
export function TabletDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mb-7">
        <div className="h-3 w-48 bg-spc-surface-2 rounded animate-pulse mb-3" />
        <div className="h-10 w-72 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
        <div className="h-4 w-64 bg-spc-surface-2 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4 min-h-[118px]">
            <div className="h-3 w-20 bg-spc-surface-2 rounded animate-pulse mb-7" />
            <div className="h-7 w-14 bg-spc-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5 mb-8">
        <div className="col-span-3">
          <div className="h-7 w-44 bg-spc-surface-2 rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
                <div className="h-5 w-44 bg-spc-surface-2 rounded animate-pulse mb-2" />
                <div className="h-3.5 w-28 bg-spc-surface-2 rounded animate-pulse mb-4" />
                <div className="flex gap-2">
                  <div className="h-7 w-24 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
                  <div className="h-7 w-20 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <div className="h-7 w-36 bg-spc-surface-2 rounded animate-pulse mb-3" />
          <div className="rounded-spc border border-spc-line bg-spc-surface px-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="py-3 border-b border-spc-line last:border-b-0">
                <div className="h-3 w-16 bg-spc-surface-2 rounded animate-pulse mb-2" />
                <div className="h-4 w-28 bg-spc-surface-2 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-7 w-48 bg-spc-surface-2 rounded animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="h-4 w-36 bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-spc-surface-2 rounded animate-pulse mb-4" />
            <div className="h-7 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  User,
  Activity,
  Briefcase,
  FileText,
} from 'lucide-react';
import {
  formatDate,
  StatusPill,
  buildProfileRows,
  HIGHLIGHT_TEXT,
  VerifiedChip,
} from './dashboardShared';

/**
 * Tablet (`md` up to below `lg`) presenter.
 *
 * Its own layout, not a stretched phone and not a shrunk desktop: a full-width
 * stat strip, then a two-column working area (job feed beside a profile
 * companion panel), then full-width two-up card grids. The applications table
 * is cards here too — a four-column table inside ~420px is exactly the squeezed
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

  return (
    <div>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl flex-shrink-0">
            <GraduationCap className="text-white" size={34} />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Dashboard</h1>
            <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full shadow-sm">
              <span className="text-sm text-gray-700 font-medium">
                Welcome, {`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Student'}
              </span>
              {profile.prn && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-700 font-medium">PRN: {profile.prn}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Email Verification ── */}
      {showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6"
        >
          <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-lg flex-shrink-0">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-lg">Email Verification Required</h3>
                <p className="text-gray-700 mt-1 font-medium">
                  Please verify your email address to access all features. We&apos;ve sent a
                  verification link to <span className="font-bold break-all">{profile.email}</span>.
                  Check your inbox and spam folder.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={onResendVerification}
                disabled={resending || !verificationStatus?.can_resend}
                className="flex-1 min-h-[48px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button
                onClick={onOpenEmailModal}
                className="flex-1 min-h-[48px] bg-white border-2 border-orange-400 text-orange-700 font-bold px-5 rounded-xl hover:bg-orange-50 active:scale-[0.99] transition-all"
              >
                Update Email Address
              </button>
            </div>

            {verificationStatus && !verificationStatus.can_resend && (
              <p className="text-sm text-gray-600 mt-3 bg-white/70 rounded-lg p-2.5 border border-yellow-200">
                Maximum verification emails sent for today (
                {verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Stat strip: 4 across ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-7"
      >
        {statCards.map((stat) => (
          <TabletStatTile key={stat.title} stat={stat} />
        ))}
      </motion.div>

      {/* ── Two-column working area: job feed + profile panel ── */}
      <div className="grid grid-cols-5 gap-5 mb-7">
        {/* Job feed */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="col-span-3"
        >
          <TabletSectionHeading title="Recent Job Openings" icon={Briefcase} to="/student/jobs" />
          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.slice(0, 3).map((job) => (
                <TabletJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-500 font-medium">No recent job openings.</p>
            </div>
          )}
        </motion.section>

        {/* Profile companion panel */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="col-span-2"
        >
          <TabletSectionHeading title="Your Profile" icon={User} />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 space-y-2.5">
            {profileRows.map((row) => (
              <div
                key={row.label}
                className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl px-3 py-2.5 border border-gray-200"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {row.label}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p
                    className={`text-sm break-words ${
                      row.highlight ? HIGHLIGHT_TEXT[row.highlight] : 'text-gray-900 font-semibold'
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

      {/* ── Recent Applications: 2-up cards ── */}
      {recentApplications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-7"
        >
          <TabletSectionHeading
            title="Recent Applications"
            icon={FileText}
            to="/student/applications"
            tone="green"
          />
          <div className="grid grid-cols-2 gap-3">
            {recentApplications.slice(0, 5).map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 leading-tight break-words">
                      {application.company_name}
                    </p>
                    <p className="text-sm text-gray-600 font-medium mt-0.5 break-words">
                      {application.job_title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">
                    Applied {formatDate(application.applied_at)}
                  </span>
                  <StatusPill status={application.status} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Quick Actions: 2-up rows ── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-6"
      >
        <TabletSectionHeading title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 min-h-[96px] hover:shadow-lg active:scale-[0.99] transition-all"
              >
                <div
                  className={`bg-gradient-to-br ${action.gradient} rounded-xl p-2.5 shadow-md flex-shrink-0`}
                >
                  <Icon className="text-white" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-800 leading-tight">
                      {action.title}
                    </h3>
                    {action.count !== undefined && (
                      <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex-shrink-0">
                        {action.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-snug mt-1">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}

function TabletSectionHeading({ title, icon: Icon, to, tone = 'blue' }) {
  const toneClasses =
    tone === 'green'
      ? 'text-green-600 bg-green-50 border-green-200'
      : 'text-blue-600 bg-blue-50 border-blue-200';

  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md flex-shrink-0">
            <Icon className="text-white" size={18} />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-800 truncate">{title}</h2>
      </div>
      {to && (
        <Link
          to={to}
          className={`flex items-center gap-1.5 font-bold text-sm px-3.5 min-h-[44px] rounded-xl border transition-all flex-shrink-0 ${toneClasses}`}
        >
          <span>View All</span>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function TabletStatTile({ stat }) {
  const Icon = stat.icon;
  const classes =
    'flex flex-col bg-white rounded-2xl border border-gray-200 shadow-md p-4 min-h-[132px] hover:shadow-xl hover:-translate-y-1 active:scale-[0.99] transition-all';

  const content = (
    <>
      <div
        className={`inline-flex self-start bg-gradient-to-br ${stat.gradient} rounded-xl p-2.5 shadow-lg`}
      >
        <Icon className="text-white" size={22} />
      </div>
      <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-none mt-auto pt-3">
        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
      </p>
      <p className="text-sm font-semibold text-gray-800 mt-1.5 leading-tight">{stat.title}</p>
    </>
  );

  return stat.link ? (
    <Link to={stat.link} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

function TabletJobCard({ job }) {
  return (
    <Link
      to="/student/jobs"
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-lg active:scale-[0.99] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 flex-shrink-0">
          <Building2 className="text-white" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-gray-900 leading-tight break-words">
                {job.company_name}
              </h3>
              <p className="text-sm text-gray-600 font-medium mt-0.5 break-words">{job.title}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {job.has_applied && (
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  Applied
                </span>
              )}
              {job.is_eligible ? (
                <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <CheckCircle size={12} />
                  <span>Eligible</span>
                </span>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <XCircle size={12} />
                  <span>Check Eligibility</span>
                </span>
              )}
            </div>
          </div>

          {(job.location || job.salary_package || job.application_deadline) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {job.location && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <MapPin size={14} className="text-blue-600" />
                  {job.location}
                </span>
              )}
              {job.salary_package && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
                  <IndianRupee size={14} className="text-green-600" />
                  {job.salary_package} LPA
                </span>
              )}
              {job.application_deadline && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-orange-50 rounded-lg px-2.5 py-1.5">
                  <Calendar size={14} className="text-orange-600" />
                  {formatDate(job.application_deadline)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Loading skeleton shaped like the tablet layout. */
export function TabletDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-gray-200/70 rounded-2xl animate-pulse" />
        <div>
          <div className="h-8 w-56 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
          <div className="h-6 w-72 bg-gray-200/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 border border-gray-200/50 min-h-[132px]">
            <div className="h-10 w-10 bg-gray-200/70 rounded-xl animate-pulse mb-6" />
            <div className="h-7 w-14 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-20 bg-gray-200/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Two-column area */}
      <div className="grid grid-cols-5 gap-5 mb-7">
        <div className="col-span-3">
          <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/60 rounded-2xl p-4 border border-gray-200/50">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 bg-gray-200/70 rounded-xl animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-40 bg-gray-200/70 rounded animate-pulse mb-2" />
                    <div className="h-4 w-28 bg-gray-200/50 rounded animate-pulse mb-3" />
                    <div className="flex gap-2">
                      <div className="h-7 w-24 bg-gray-100/70 rounded-lg animate-pulse" />
                      <div className="h-7 w-20 bg-gray-100/70 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <div className="h-7 w-36 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-4 space-y-2.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-100/50 rounded-xl px-3 py-2.5">
                <div className="h-3 w-16 bg-gray-200/70 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-gray-200/70 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-up cards */}
      <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 border border-gray-200/50">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 bg-gray-200/70 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200/70 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-28 bg-gray-100/70 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

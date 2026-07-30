import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  User,
} from 'lucide-react';
import {
  formatDate,
  StatusPill,
  buildProfileRows,
  HIGHLIGHT_TEXT,
  VerifiedChip,
} from './dashboardShared';

/**
 * Mobile (below `md`) presenter — a single-column, app-style home screen.
 *
 * Same data, same handlers, same destinations as desktop; only the arrangement
 * differs. Order is deliberately action-first: identity, anything urgent, the
 * numbers, the shortcuts, then the feeds, then account details.
 */
export default function MobileStudentDashboard({
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
  // Purely visual disclosure for the 9-row profile list. No data is affected.
  const [profileExpanded, setProfileExpanded] = useState(false);

  const profileRows = buildProfileRows(profile);
  const visibleRows = profileExpanded ? profileRows : profileRows.slice(0, 3);
  const hiddenCount = profileRows.length - 3;

  const showVerificationBanner =
    profile.registration_status === 'approved' && !profile.email_verified;

  return (
    <div className="pb-2">
      {/* ── Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0 }}
        className="mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg flex-shrink-0">
            <GraduationCap className="text-white" size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Student Dashboard
            </p>
            <h1 className="text-xl font-black text-gray-900 truncate">
              {`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Welcome'}
            </h1>
          </div>
        </div>
        {profile.prn && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-full shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">PRN</span>
            <span className="text-sm font-semibold text-gray-800">{profile.prn}</span>
          </div>
        )}
      </motion.div>

      {/* ── Email Verification ── */}
      {showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-6"
        >
          <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-md flex-shrink-0">
                <AlertCircle className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 text-base">Email Verification Required</h3>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                  Verify your email to access all features. We&apos;ve sent a link to{' '}
                  <span className="font-bold break-all">{profile.email}</span>. Check your inbox and
                  spam folder.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={onResendVerification}
                disabled={resending || !verificationStatus?.can_resend}
                className="w-full min-h-[48px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-4 rounded-xl shadow-md active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button
                onClick={onOpenEmailModal}
                className="w-full min-h-[48px] bg-white border-2 border-orange-400 text-orange-700 font-bold px-4 rounded-xl active:scale-[0.99] transition-all"
              >
                Update Email Address
              </button>
            </div>

            {verificationStatus && !verificationStatus.can_resend && (
              <p className="text-xs text-gray-600 mt-3 bg-white/70 rounded-lg p-2.5 border border-yellow-200">
                Maximum verification emails sent for today (
                {verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Stats: 2 x 2 ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-7"
      >
        {statCards.map((stat) => (
          <MobileStatTile key={stat.title} stat={stat} />
        ))}
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mb-7"
      >
        <MobileSectionHeading title="Quick Actions" />
        <div className="space-y-2.5">
          {quickActions.map((action) => (
            <MobileActionRow key={action.title} action={action} />
          ))}
        </div>
      </motion.section>

      {/* ── Recent Job Openings ── */}
      {recentJobs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mb-7"
        >
          <MobileSectionHeading title="Recent Job Openings" to="/student/jobs" />
          <div className="space-y-3">
            {recentJobs.slice(0, 3).map((job) => (
              <MobileJobCard key={job.id} job={job} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Recent Applications (table → cards) ── */}
      {recentApplications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="mb-7"
        >
          <MobileSectionHeading title="Recent Applications" to="/student/applications" />
          <div className="space-y-3">
            {recentApplications.slice(0, 5).map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                    <Building2 size={18} className="text-blue-600" />
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
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
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

      {/* ── Your Profile (collapsible) ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="mb-4"
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md">
              <User className="text-white" size={16} />
            </div>
            <h2 className="text-base font-bold text-gray-800">Your Profile</h2>
          </div>

          <div id="student-profile-details" className="px-4">
            {visibleRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-3.5 min-h-[52px] border-b border-gray-100 last:border-b-0"
              >
                <span className="text-sm font-medium text-gray-500 flex-shrink-0">{row.label}</span>
                <span className="flex items-center gap-2 min-w-0 justify-end">
                  {row.verified !== undefined && <VerifiedChip verified={row.verified} />}
                  <span
                    className={`text-sm text-right truncate ${
                      row.highlight ? HIGHLIGHT_TEXT[row.highlight] : 'text-gray-900 font-semibold'
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
            className="w-full min-h-[48px] flex items-center justify-center gap-1.5 px-4 text-sm font-bold text-blue-600 bg-blue-50/60 border-t border-gray-100 active:bg-blue-100 transition-colors"
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

function MobileSectionHeading({ title, to }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-0.5 text-sm font-bold text-blue-600 min-h-[44px] px-1 -mr-1"
        >
          <span>View all</span>
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function MobileStatTile({ stat }) {
  const Icon = stat.icon;
  const classes =
    'flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm p-4 min-h-[124px] active:scale-[0.98] transition-transform';

  const content = (
    <>
      <div
        className={`inline-flex self-start bg-gradient-to-br ${stat.gradient} rounded-xl p-2.5 shadow-md`}
      >
        <Icon className="text-white" size={20} />
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

function MobileActionRow({ action }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.link}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-3.5 min-h-[68px] active:scale-[0.99] transition-transform"
    >
      <div className={`bg-gradient-to-br ${action.gradient} rounded-xl p-2.5 shadow-md flex-shrink-0`}>
        <Icon className="text-white" size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-800 leading-tight">{action.title}</p>
        <p className="text-xs text-gray-500 font-medium leading-snug mt-0.5">{action.description}</p>
      </div>
      {action.count !== undefined && (
        <span className="text-lg font-black text-gray-900 flex-shrink-0">{action.count}</span>
      )}
      <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
    </Link>
  );
}

function MobileJobCard({ job }) {
  return (
    <Link
      to="/student/jobs"
      className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 flex-shrink-0">
          <Building2 className="text-white" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base text-gray-900 leading-tight break-words">
            {job.company_name}
          </h3>
          <p className="text-sm text-gray-600 font-medium mt-0.5 break-words">{job.title}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
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

      {(job.location || job.salary_package || job.application_deadline) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {job.location && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <MapPin size={13} className="text-blue-600" />
              {job.location}
            </span>
          )}
          {job.salary_package && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
              <IndianRupee size={13} className="text-green-600" />
              {job.salary_package} LPA
            </span>
          )}
          {job.application_deadline && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-orange-50 rounded-lg px-2.5 py-1.5">
              <Calendar size={13} className="text-orange-600" />
              {formatDate(job.application_deadline)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/** Loading skeleton shaped like the mobile layout. */
export function MobileDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 bg-gray-200/70 rounded-2xl animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-gray-200/50 rounded animate-pulse mb-2" />
          <div className="h-6 w-40 bg-gray-200/70 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 border border-gray-200/50 min-h-[124px]">
            <div className="h-10 w-10 bg-gray-200/70 rounded-xl animate-pulse mb-5" />
            <div className="h-7 w-12 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-20 bg-gray-200/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="h-6 w-32 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
      <div className="space-y-2.5 mb-7">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/60 rounded-2xl p-3.5 border border-gray-200/50 min-h-[68px]">
            <div className="h-10 w-10 bg-gray-200/70 rounded-xl animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-gray-200/70 rounded animate-pulse mb-2" />
              <div className="h-3 w-40 bg-gray-200/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Feed cards */}
      <div className="h-6 w-40 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 border border-gray-200/50">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 bg-gray-200/70 rounded-xl animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200/70 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-100/70 rounded-lg animate-pulse" />
              <div className="h-6 w-20 bg-gray-100/70 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

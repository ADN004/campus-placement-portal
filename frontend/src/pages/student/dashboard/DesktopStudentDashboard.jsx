import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  FileText,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  GraduationCap,
  User,
  Activity,
} from 'lucide-react';
import DashboardHeader from '../../../components/DashboardHeader';
import GlassStatCard from '../../../components/GlassStatCard';
import SectionHeader from '../../../components/SectionHeader';
import GlassCard from '../../../components/GlassCard';
import { fadeUp, formatDate, getStatusBadge } from './dashboardShared';

/**
 * Desktop (lg and up) presenter — the original StudentDashboard layout, moved
 * here unchanged. Markup, classes and animation delays are identical to what
 * shipped before the mobile/tablet split, so desktop output is untouched.
 *
 * All state, effects, API calls and handlers live in the StudentDashboard
 * container; this file only renders what it is handed.
 */
export default function DesktopStudentDashboard({
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
  return (
    <div>
      {/* Dashboard Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0 }}
      >
        <DashboardHeader
          icon={GraduationCap}
          title="Student Dashboard"
          subtitle={`Welcome, ${profile.first_name || ''} ${profile.last_name || ''} • PRN: ${profile.prn || ''}`}
        />
      </motion.div>

      {/* Email Verification Banner */}
      {profile.registration_status === 'approved' && !profile.email_verified && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <GlassCard variant="accent" className="p-6 mb-8 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-lg">
                <AlertCircle className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-xl mb-2">
                  Email Verification Required
                </h3>
                <p className="text-gray-700 mb-4 font-medium">
                  Please verify your email address to access all features. We've sent a verification link to{' '}
                  <span className="font-bold">{profile.email}</span>. Check your inbox and spam folder.
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail size={18} className="text-gray-600" />
                    <span className="text-gray-600 font-medium">
                      Didn't receive the email? Wrong address?
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onOpenEmailModal}
                      className="bg-white border-2 border-orange-400 text-orange-700 font-bold px-6 py-2.5 rounded-xl shadow hover:bg-orange-50 transition-all duration-200"
                    >
                      Update Email Address
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onResendVerification}
                      disabled={resending || !verificationStatus?.can_resend}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resending ? 'Sending...' : 'Resend Verification Email'}
                    </motion.button>
                  </div>
                </div>
                {verificationStatus && !verificationStatus.can_resend && (
                  <p className="text-sm text-gray-600 mt-3 bg-white/70 rounded-lg p-2 border border-yellow-200">
                    Maximum verification emails sent for today ({verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            style={{ willChange: 'transform' }}
          >
            <GlassStatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              gradient={stat.gradient}
              link={stat.link}
              description={stat.description}
              index={index}
            />
          </motion.div>
        ))}
      </div>

      {/* Profile Summary */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <GlassCard variant="elevated" className="p-8 mb-8">
          <SectionHeader title="Your Profile" icon={User} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <ProfileItem label="PRN" value={profile.prn} />
            <ProfileItem
              label="Email"
              value={profile.email}
              verified={profile.email_verified}
            />
            <ProfileItem label="Mobile" value={profile.mobile_number} />
            <ProfileItem label="College" value={profile.college_name} />
            <ProfileItem label="Region" value={profile.region_name} />
            <ProfileItem label="Branch" value={profile.branch} />
            <ProfileItem
              label="Programme CGPA"
              value={profile.programme_cgpa}
              highlight={profile.programme_cgpa >= 7 ? 'green' : 'red'}
            />
            <ProfileItem
              label="Backlogs"
              value={profile.backlog_count || 0}
              highlight={profile.backlog_count > 0 ? 'red' : 'green'}
            />
            <ProfileItem
              label="Status"
              value={
                profile.is_blacklisted
                  ? 'Blacklisted'
                  : profile.registration_status === 'approved'
                  ? 'Active'
                  : profile.registration_status
              }
              highlight={
                profile.is_blacklisted
                  ? 'red'
                  : profile.registration_status === 'approved'
                  ? 'green'
                  : 'yellow'
              }
            />
          </div>
        </GlassCard>
      </motion.div>

      {/* Recent Jobs Section */}
      {recentJobs.length > 0 && (
        <motion.div
          className="mb-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <SectionHeader
            title="Recent Job Openings"
            icon={Briefcase}
            action={
              <Link
                to="/student/jobs"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-all border border-blue-200"
              >
                <span>View All</span>
                <ArrowRight size={18} />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {recentJobs.slice(0, 3).map((job, index) => (
              <motion.div
                key={job.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                style={{ willChange: 'transform' }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Applications Section */}
      {recentApplications.length > 0 && (
        <motion.div
          className="mb-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <SectionHeader
            title="Recent Applications"
            icon={FileText}
            action={
              <Link
                to="/student/applications"
                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-bold bg-green-50 px-5 py-2.5 rounded-xl hover:bg-green-100 transition-all border border-green-200"
              >
                <span>View All</span>
                <ArrowRight size={18} />
              </Link>
            }
          />
          <GlassCard variant="elevated" className="overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Company</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Job Title</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Applied Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentApplications.slice(0, 5).map((application) => (
                    <tr key={application.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 rounded-lg p-2">
                            <Building2 size={20} className="text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{application.company_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{application.job_title}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(application.applied_at)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(application.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        className="mb-10"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.9 }}
      >
        <SectionHeader title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.4, delay: 1.0 + index * 0.1 }}
                whileHover={{ y: -4 }}
                style={{ willChange: 'transform' }}
              >
                <Link to={action.link}>
                  <GlassCard variant="elevated" hover className="h-full p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className={`bg-gradient-to-br ${action.gradient} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                          {action.title}
                        </h3>
                        {action.count !== undefined && (
                          <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            {action.count}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 font-medium">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end text-blue-600 font-bold text-sm mt-4 group">
                      <span>Open</span>
                      <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileItem({ label, value, highlight, verified }) {
  const highlightColors = {
    green: 'text-green-600 font-bold',
    red: 'text-red-600 font-bold',
    yellow: 'text-yellow-600 font-bold',
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
      <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-lg ${highlight ? highlightColors[highlight] : 'text-gray-900 font-semibold'}`}>
          {value || 'N/A'}
        </p>
        {verified !== undefined && (
          verified ? (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-300">
              <CheckCircle size={12} />
              <span>Verified</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-300">
              <XCircle size={12} />
              <span>Not Verified</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}

function JobCard({ job }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link to="/student/jobs">
      <GlassCard variant="elevated" hover className="h-full p-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {job.has_applied && (
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-lg">Applied</span>
          )}
          {job.is_eligible ? (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
              <CheckCircle size={14} />
              <span>Eligible</span>
            </span>
          ) : (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
              <XCircle size={14} />
              <span>Check Eligibility</span>
            </span>
          )}
        </div>

        {/* Company & Title */}
        <div className="mb-4">
          <div className="flex items-start space-x-3 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
              <Building2 className="text-white" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{job.company_name}</h3>
              <p className="text-gray-600 font-medium">{job.title}</p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-2.5">
          {job.location && (
            <div className="flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
              <MapPin size={16} className="mr-2 text-blue-600" />
              <span className="font-medium">{job.location}</span>
            </div>
          )}
          {job.salary_package && (
            <div className="flex items-center text-sm bg-green-50 rounded-lg p-2">
              <IndianRupee size={16} className="mr-2 text-green-600" />
              <span className="font-bold text-green-700">{job.salary_package} LPA</span>
            </div>
          )}
          {job.application_deadline && (
            <div className="flex items-center text-sm text-gray-700 bg-orange-50 rounded-lg p-2">
              <Calendar size={16} className="mr-2 text-orange-600" />
              <span className="font-medium">{formatDate(job.application_deadline)}</span>
            </div>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}

/** Loading skeleton for the desktop layout — moved here verbatim. */
export function DesktopDashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
        <div className="h-5 w-96 bg-gray-200/50 rounded-lg animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200/70 rounded-lg animate-pulse" />
              <div className="h-12 w-12 bg-gray-200/70 rounded-xl animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-32 bg-gray-200/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Profile summary skeleton */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 mb-8">
        <div className="h-7 w-36 bg-gray-200/70 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-gray-100/50 rounded-xl p-4">
              <div className="h-3 w-16 bg-gray-200/70 rounded animate-pulse mb-2" />
              <div className="h-5 w-28 bg-gray-200/70 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent jobs skeleton */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-16 bg-gray-200/70 rounded-lg animate-pulse" />
                <div className="h-6 w-20 bg-gray-200/70 rounded-lg animate-pulse" />
              </div>
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 bg-gray-200/70 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
                  <div className="h-4 w-24 bg-gray-200/50 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-full bg-gray-100/70 rounded-lg animate-pulse" />
                <div className="h-8 w-full bg-gray-100/70 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-10">
        <div className="h-7 w-36 bg-gray-200/70 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 bg-gray-200/70 rounded-xl animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-24 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
                  <div className="h-3 w-full bg-gray-200/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

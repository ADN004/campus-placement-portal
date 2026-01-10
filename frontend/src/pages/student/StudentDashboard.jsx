import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Briefcase,
  FileText,
  Bell,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  GraduationCap,
  User,
  Activity,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassStatCard from '../../components/GlassStatCard';
import SectionHeader from '../../components/SectionHeader';
import GlassCard from '../../components/GlassCard';
import ExtendedProfilePromptModal from '../../components/ExtendedProfilePromptModal';
import api from '../../services/api';

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showExtendedProfilePrompt, setShowExtendedProfilePrompt] = useState(false);
  const [extendedProfileCompletion, setExtendedProfileCompletion] = useState(100);

  useEffect(() => {
    fetchDashboard();
    fetchVerificationStatus();
    checkExtendedProfileCompletion();
  }, []);

  const checkExtendedProfileCompletion = async () => {
    try {
      const response = await api.get('/students/extended-profile/completion');
      const completion = response.data.data.overall_completion || 0;
      setExtendedProfileCompletion(completion);

      // Show prompt if profile is incomplete
      if (completion < 100) {
        setShowExtendedProfilePrompt(true);
      }
    } catch (error) {
      console.error('Failed to check extended profile completion:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await studentAPI.getDashboard();
      setDashboard(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await studentAPI.getVerificationStatus();
      setVerificationStatus(response.data.data);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationStatus?.can_resend) {
      toast.error('Maximum verification emails sent for today. Please try again tomorrow.');
      return;
    }

    setResending(true);
    try {
      await studentAPI.resendVerificationEmail();
      toast.success('Verification email sent! Please check your inbox.');
      fetchVerificationStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const profile = dashboard?.profile || {};
  const recentJobs = dashboard?.recentJobs || [];
  const recentApplications = dashboard?.recentApplications || [];

  const statCards = [
    {
      title: 'Available Jobs',
      value: stats.eligibleJobsCount || 0,
      icon: Briefcase,
      gradient: 'from-blue-500 to-cyan-600',
      link: '/student/jobs',
      description: 'Jobs you can apply for',
    },
    {
      title: 'My Applications',
      value: stats.applicationsCount || 0,
      icon: FileText,
      gradient: 'from-green-500 to-emerald-600',
      link: '/student/applications',
      description: 'Total applications submitted',
    },
    {
      title: 'Unread Notifications',
      value: stats.unreadNotifications || 0,
      icon: Bell,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/student/notifications',
      description: 'New announcements',
    },
    {
      title: 'Programme CGPA',
      value: profile.programme_cgpa || 'N/A',
      icon: GraduationCap,
      gradient: 'from-purple-500 to-pink-600',
      description: 'Your current CGPA',
    },
  ];

  const quickActions = [
    {
      title: 'Browse Jobs',
      description: 'Find and apply to job openings that match your profile',
      icon: Briefcase,
      gradient: 'from-blue-500 to-indigo-600',
      link: '/student/jobs',
      count: stats.eligibleJobsCount || 0,
    },
    {
      title: 'My Applications',
      description: 'Track your job applications and their current status',
      icon: FileText,
      gradient: 'from-green-500 to-emerald-600',
      link: '/student/applications',
      count: stats.applicationsCount || 0,
    },
    {
      title: 'View Notifications',
      description: 'Check announcements from your placement officer',
      icon: Bell,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/student/notifications',
      count: stats.unreadNotifications || 0,
    },
    {
      title: 'Update Profile',
      description: 'Keep your profile information up to date',
      icon: User,
      gradient: 'from-purple-500 to-pink-600',
      link: '/student/profile',
    },
  ];

  return (
    <div>
      {/* Extended Profile Prompt Modal */}
      {showExtendedProfilePrompt && (
        <ExtendedProfilePromptModal
          onClose={() => setShowExtendedProfilePrompt(false)}
          profileCompletion={extendedProfileCompletion}
        />
      )}

      {/* Dashboard Header */}
      <DashboardHeader
        icon={GraduationCap}
        title="Student Dashboard"
        subtitle={`Welcome, ${profile.first_name || ''} ${profile.last_name || ''} • PRN: ${profile.prn || ''}`}
      />

      {/* Email Verification Banner */}
      {profile.registration_status === 'approved' && !profile.email_verified && (
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
                    Didn't receive the email?
                  </span>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={resending || !verificationStatus?.can_resend}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
              {verificationStatus && !verificationStatus.can_resend && (
                <p className="text-sm text-gray-600 mt-3 bg-white/70 rounded-lg p-2 border border-yellow-200">
                  Maximum verification emails sent for today ({verificationStatus.verification_email_sent_count}/5). Please try again tomorrow.
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <GlassStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            link={stat.link}
            description={stat.description}
            index={index}
          />
        ))}
      </div>

      {/* Profile Summary */}
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

      {/* Recent Jobs Section */}
      {recentJobs.length > 0 && (
        <div className="mb-8">
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
            {recentJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications Section */}
      {recentApplications.length > 0 && (
        <div className="mb-8">
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
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-10">
        <SectionHeader title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
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
            );
          })}
        </div>
      </div>
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
    return new Date(dateString).toLocaleDateString('en-US', {
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

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-lg border border-yellow-200">
          <Clock size={16} />
          <span>Pending</span>
        </span>
      );
    case 'shortlisted':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg border border-green-200">
          <CheckCircle size={16} />
          <span>Shortlisted</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center space-x-1.5 bg-red-100 text-red-800 text-sm font-bold px-4 py-2 rounded-lg border border-red-200">
          <XCircle size={16} />
          <span>Rejected</span>
        </span>
      );
    default:
      return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-4 py-2 rounded-lg border border-gray-200">{status}</span>;
  }
}

import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import {
  Briefcase,
  FileText,
  Bell,
  TrendingUp,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) return <LoadingSpinner />;

  const stats = dashboard?.stats || {};
  const profile = dashboard?.profile || {};
  const recentJobs = dashboard?.recentJobs || [];
  const recentApplications = dashboard?.recentApplications || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
        <p className="text-gray-600 mt-2">
          {profile.first_name && `${profile.first_name} ${profile.last_name || ''}`} - PRN: {profile.prn}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Available Jobs"
          value={stats.eligibleJobsCount || 0}
          icon={Briefcase}
          color="blue"
          link="/student/jobs"
        />
        <StatCard
          title="My Applications"
          value={stats.applicationsCount || 0}
          icon={FileText}
          color="green"
          link="/student/applications"
        />
        <StatCard
          title="Unread Notifications"
          value={stats.unreadNotifications || 0}
          icon={Bell}
          color="yellow"
          link="/student/notifications"
        />
      </div>

      {/* Profile Summary */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Your Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProfileItem label="PRN" value={profile.prn} />
          <ProfileItem label="Email" value={profile.email} />
          <ProfileItem label="Mobile" value={profile.mobile_number} />
          <ProfileItem label="College" value={profile.college_name} />
          <ProfileItem label="Region" value={profile.region_name} />
          <ProfileItem label="Branch" value={profile.branch} />
          <ProfileItem
            label="CGPA"
            value={profile.cgpa}
            highlight={profile.cgpa >= 7 ? 'green' : 'red'}
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
      </div>

      {/* Recent Jobs Section */}
      {recentJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Recent Job Openings</h2>
            <Link
              to="/student/jobs"
              className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-medium"
            >
              <span>View All</span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications Section */}
      {recentApplications.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Recent Applications</h2>
            <Link
              to="/student/applications"
              className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm font-medium"
            >
              <span>View All</span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Job Title</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.slice(0, 5).map((application) => (
                    <tr key={application.id}>
                      <td>
                        <div className="flex items-center space-x-2">
                          <Building2 size={18} className="text-gray-400" />
                          <span className="font-semibold">{application.company_name}</span>
                        </div>
                      </td>
                      <td className="font-medium">{application.job_title}</td>
                      <td className="text-sm text-gray-600">
                        {formatDate(application.applied_at)}
                      </td>
                      <td>{getStatusBadge(application.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/student/jobs"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Briefcase className="text-blue-600 mr-3" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Browse Jobs</p>
              <p className="text-sm text-gray-600">
                {stats.eligibleJobsCount || 0} jobs available
              </p>
            </div>
          </Link>
          <Link
            to="/student/applications"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <FileText className="text-green-600 mr-3" size={24} />
            <div>
              <p className="font-semibold text-gray-900">My Applications</p>
              <p className="text-sm text-gray-600">
                {stats.applicationsCount || 0} applications
              </p>
            </div>
          </Link>
          <Link
            to="/student/notifications"
            className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <Bell className="text-yellow-600 mr-3" size={24} />
            <div>
              <p className="font-semibold text-gray-900">Notifications</p>
              <p className="text-sm text-gray-600">
                {stats.unreadNotifications || 0} unread
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, link }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  const CardContent = () => (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-4 rounded-full ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return link ? (
    <Link to={link}>
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
}

function ProfileItem({ label, value, highlight }) {
  const highlightColors = {
    green: 'text-green-600 font-semibold',
    red: 'text-red-600 font-semibold',
    yellow: 'text-yellow-600 font-semibold',
  };

  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`font-medium ${highlight ? highlightColors[highlight] : 'text-gray-900'}`}>
        {value || 'N/A'}
      </p>
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
      <div className="card hover:shadow-lg transition-shadow duration-200">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {job.has_applied && (
            <span className="badge bg-blue-100 text-blue-800">Applied</span>
          )}
          {job.is_eligible ? (
            <span className="badge badge-success flex items-center space-x-1">
              <CheckCircle size={12} />
              <span>Eligible</span>
            </span>
          ) : (
            <span className="badge badge-warning flex items-center space-x-1">
              <XCircle size={12} />
              <span>Check Eligibility</span>
            </span>
          )}
        </div>

        {/* Company & Title */}
        <div className="mb-3">
          <div className="flex items-start space-x-2 mb-2">
            <Building2 className="text-primary-600 mt-1" size={20} />
            <div>
              <h3 className="font-bold text-base text-gray-900">{job.company_name}</h3>
              <p className="text-sm text-gray-600">{job.title}</p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-1">
          {job.location && (
            <div className="flex items-center text-xs text-gray-600">
              <MapPin size={14} className="mr-2 text-gray-400" />
              <span>{job.location}</span>
            </div>
          )}
          {job.salary_package && (
            <div className="flex items-center text-xs text-gray-600">
              <IndianRupee size={14} className="mr-2 text-gray-400" />
              <span className="font-semibold text-green-600">{job.salary_package} LPA</span>
            </div>
          )}
          {job.application_deadline && (
            <div className="flex items-center text-xs text-gray-600">
              <Calendar size={14} className="mr-2 text-gray-400" />
              <span>{formatDate(job.application_deadline)}</span>
            </div>
          )}
        </div>
      </div>
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
        <span className="badge badge-warning flex items-center space-x-1">
          <Clock size={12} />
          <span>Pending</span>
        </span>
      );
    case 'shortlisted':
      return (
        <span className="badge badge-success flex items-center space-x-1">
          <CheckCircle size={12} />
          <span>Shortlisted</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="badge badge-danger flex items-center space-x-1">
          <XCircle size={12} />
          <span>Rejected</span>
        </span>
      );
    default:
      return <span className="badge badge-info">{status}</span>;
  }
}

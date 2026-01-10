import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import {
  Building2,
  Calendar,
  Eye,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassButton from '../../components/GlassButton';
import GradientOrb from '../../components/GradientOrb';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [error, setError] = useState(null);

  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, statusFilter, applications]);

  const fetchApplications = async () => {
    try {
      const response = await studentAPI.getMyApplications();
      const applicationsData = response.data.data || [];
      setApplications(applicationsData);
      calculateStatusCounts(applicationsData);
      setError(null);
    } catch (error) {
      if (error.response?.status === 403) {
        setError({
          title: 'Account Pending Approval',
          message: error.response?.data?.message || 'Your registration is pending approval from placement officer',
          type: 'pending'
        });
      } else {
        setError({
          title: 'Failed to Load Applications',
          message: 'Unable to fetch your applications. Please try again later.',
          type: 'error'
        });
        toast.error('Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusCounts = (applicationsData) => {
    const counts = {
      all: applicationsData.length,
      pending: applicationsData.filter((a) => a.status === 'pending').length,
      shortlisted: applicationsData.filter((a) => a.status === 'shortlisted').length,
      selected: applicationsData.filter((a) => a.status === 'selected').length,
      rejected: applicationsData.filter((a) => a.status === 'rejected').length,
    };
    setStatusCounts(counts);
  };

  const filterApplications = () => {
    let filtered = applications;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 border-2 border-yellow-200">
            <Clock size={16} />
            <span>Pending</span>
          </span>
        );
      case 'shortlisted':
        return (
          <span className="bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 border-2 border-green-200">
            <CheckCircle size={16} />
            <span>Shortlisted</span>
          </span>
        );
      case 'selected':
        return (
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 border-2 border-blue-200">
            <CheckCircle size={16} />
            <span>Selected</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-red-100 text-red-800 text-sm font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 border-2 border-red-200">
            <XCircle size={16} />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-4 py-2 rounded-xl border-2 border-gray-200">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div>
        <GradientOrb color="blue" position="top-right" />
        <GradientOrb color="indigo" position="bottom-left" delay="2s" />
        <GradientOrb color="purple" position="center" delay="4s" />

        <div className="mb-8">
          <DashboardHeader
            icon={FileText}
            title="My Applications"
            subtitle="Track your job applications and their status"
          />
        </div>

        <GlassCard className="p-16 text-center">
          <div className={`rounded-2xl p-6 inline-block mb-6 ${
            error.type === 'pending'
              ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
              : 'bg-gradient-to-br from-red-500 to-pink-600'
          }`}>
            <FileText className="text-white" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{error.title}</h3>
          <p className="text-gray-600 text-lg mb-6">{error.message}</p>
          {error.type === 'pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-yellow-900 font-semibold">
                Please wait for your placement officer to approve your registration.
                You'll be able to view your applications once approved.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <GradientOrb color="blue" position="top-right" />
      <GradientOrb color="indigo" position="bottom-left" delay="2s" />
      <GradientOrb color="purple" position="center" delay="4s" />

      {/* Header */}
      <div className="mb-8">
        <DashboardHeader
          icon={FileText}
          title="My Applications"
          subtitle="Track your job applications and their status"
        />
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-5">
        {/* Status Filters */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2">
                <Filter size={20} className="text-white" />
              </div>
              <span className="font-bold text-gray-800">Filter by Status:</span>
            </div>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              All Applications
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${statusFilter === 'all' ? 'bg-white/20' : 'bg-blue-100 text-blue-800'}`}>
                {statusCounts.all}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                statusFilter === 'pending'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Pending
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${statusFilter === 'pending' ? 'bg-white/20' : 'bg-yellow-100 text-yellow-800'}`}>
                {statusCounts.pending}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('shortlisted')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                statusFilter === 'shortlisted'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Shortlisted
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${statusFilter === 'shortlisted' ? 'bg-white/20' : 'bg-green-100 text-green-800'}`}>
                {statusCounts.shortlisted}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('selected')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                statusFilter === 'selected'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Selected
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${statusFilter === 'selected' ? 'bg-white/20' : 'bg-blue-100 text-blue-800'}`}>
                {statusCounts.selected}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                statusFilter === 'rejected'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Rejected
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${statusFilter === 'rejected' ? 'bg-white/20' : 'bg-red-100 text-red-800'}`}>
                {statusCounts.rejected}
              </span>
            </button>
          </div>
        </GlassCard>

        {/* Search Bar */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2">
              <Search className="text-white" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by company or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-transparent border-none outline-none focus:ring-0 font-medium text-lg"
            />
          </div>
        </GlassCard>
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 inline-block mb-6">
            <FileText className="text-white" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {applications.length === 0 ? 'No Applications Yet' : 'No applications found'}
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            {applications.length === 0
              ? "You haven't applied to any jobs yet. Start browsing available jobs and apply!"
              : 'Try adjusting your search or filter criteria'}
          </p>
          {applications.length === 0 && (
            <a href="/student/jobs" className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95">
              Browse Jobs
            </a>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">Company</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Job Title</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Applied Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplications.map((application, index) => (
                  <tr key={application.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 rounded-xl p-2">
                          <Building2 size={20} className="text-blue-600" />
                        </div>
                        <span className="font-bold text-gray-900">{application.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{application.job_title}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar size={16} className="text-blue-600" />
                        <span className="font-medium">{formatDate(application.applied_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(application.status)}</td>
                    <td className="px-6 py-4">
                      <GlassButton
                        variant="primary"
                        onClick={() => handleViewDetails(application)}
                        className="flex items-center space-x-2"
                      >
                        <Eye size={18} />
                        <span>View</span>
                      </GlassButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedApplication(null);
          }}
        />
      )}
    </div>
  );
}

function ApplicationDetailsModal({ application, onClose }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-800 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 border-2 border-yellow-200">
            <Clock size={18} />
            <span>Pending</span>
          </span>
        );
      case 'shortlisted':
        return (
          <span className="bg-green-100 text-green-800 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 border-2 border-green-200">
            <CheckCircle size={18} />
            <span>Shortlisted</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-red-100 text-red-800 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 border-2 border-red-200">
            <XCircle size={18} />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-5 py-2.5 rounded-xl border-2 border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-3xl font-bold text-white">Application Details</h2>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2 transition-all">
            <XCircle size={28} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Company & Job Info */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
            <div className="flex items-start space-x-4 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
                <Building2 className="text-white" size={28} />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-gray-900 mb-1">{application.company_name}</h3>
                <p className="text-lg text-gray-700 font-semibold">{application.job_title}</p>
              </div>
            </div>
            {application.location && (
              <p className="text-base text-gray-700 mt-3 bg-white rounded-xl px-4 py-2 border border-blue-100">
                <span className="font-bold">Location:</span> {application.location}
              </p>
            )}
            {application.salary_package && (
              <p className="text-base text-gray-700 mt-2 bg-white rounded-xl px-4 py-2 border border-green-100">
                <span className="font-bold">Salary:</span>{' '}
                <span className="font-bold text-green-700">₹{application.salary_package} LPA</span>
              </p>
            )}
          </div>

          {/* Application Status */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-gray-200">
            <h3 className="font-bold text-xl text-gray-900 mb-4">Application Status</h3>
            <div className="flex items-start space-x-4">
              {getStatusBadge(application.status)}
              <div className="flex-1">
                {application.status === 'shortlisted' && (
                  <p className="text-base text-green-700 font-semibold">
                    Congratulations! You have been shortlisted for this position.
                  </p>
                )}
                {application.status === 'rejected' && (
                  <p className="text-base text-red-700 font-semibold">
                    Unfortunately, your application was not selected for this position.
                  </p>
                )}
                {application.status === 'pending' && (
                  <p className="text-base text-yellow-700 font-semibold">
                    Your application is under review.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
            <h3 className="font-bold text-xl text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-purple-100">
                <Calendar size={20} className="text-purple-600" />
                <span className="text-gray-700 font-semibold">Applied on:</span>
                <span className="font-bold text-gray-900">{formatDate(application.applied_at)}</span>
              </div>
              {application.updated_at && application.updated_at !== application.applied_at && (
                <div className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-purple-100">
                  <Calendar size={20} className="text-purple-600" />
                  <span className="text-gray-700 font-semibold">Last updated:</span>
                  <span className="font-bold text-gray-900">{formatDate(application.updated_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          {application.description && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-gray-200">
              <h3 className="font-bold text-xl text-gray-900 mb-4">Job Description</h3>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{application.description}</p>
            </div>
          )}

          {/* Eligibility Criteria */}
          {(application.min_cgpa || application.max_backlogs !== null) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-200">
              <h3 className="font-bold text-xl text-gray-900 mb-4">Eligibility Criteria</h3>
              <div className="grid grid-cols-2 gap-5">
                {application.min_cgpa && (
                  <div className="bg-white rounded-xl p-5 border border-indigo-100">
                    <span className="text-sm text-gray-600 font-semibold block mb-2">Minimum CGPA:</span>
                    <p className="font-bold text-3xl text-indigo-600">{application.min_cgpa}</p>
                  </div>
                )}
                {application.max_backlogs !== null && application.max_backlogs !== undefined && (
                  <div className="bg-white rounded-xl p-5 border border-indigo-100">
                    <span className="text-sm text-gray-600 font-semibold block mb-2">Max Backlogs:</span>
                    <p className="font-bold text-3xl text-indigo-600">{application.max_backlogs}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Application Form Link */}
          {application.application_form_url && (
            <div className="p-6 bg-gradient-to-r from-green-500/90 to-emerald-500/90 border-2 border-green-300 rounded-2xl shadow-xl">
              <h3 className="font-bold text-xl text-white mb-3">Application Form</h3>
              <a
                href={application.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-all transform hover:scale-105 active:scale-95"
              >
                <span>View Application Form</span>
              </a>
            </div>
          )}

          {/* Notes */}
          {application.notes && (
            <div className="p-6 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 border-2 border-yellow-300 rounded-2xl shadow-xl">
              <h3 className="font-bold text-xl text-white mb-3">Notes</h3>
              <p className="text-white/90 font-medium">{application.notes}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-6 border-t-2">
            <GlassButton
              variant="secondary"
              onClick={onClose}
              className="px-8 py-4"
            >
              Close
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

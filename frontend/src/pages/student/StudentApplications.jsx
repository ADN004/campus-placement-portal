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

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'shortlisted', 'rejected'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    shortlisted: 0,
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
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusCounts = (applicationsData) => {
    const counts = {
      all: applicationsData.length,
      pending: applicationsData.filter((a) => a.status === 'pending').length,
      shortlisted: applicationsData.filter((a) => a.status === 'shortlisted').length,
      rejected: applicationsData.filter((a) => a.status === 'rejected').length,
    };
    setStatusCounts(counts);
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Filter by search query
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
          <span className="badge badge-warning flex items-center space-x-1">
            <Clock size={14} />
            <span>Pending</span>
          </span>
        );
      case 'shortlisted':
        return (
          <span className="badge badge-success flex items-center space-x-1">
            <CheckCircle size={14} />
            <span>Shortlisted</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="badge badge-danger flex items-center space-x-1">
            <XCircle size={14} />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-2">Track your job applications and their status</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All Applications
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-20">
              {statusCounts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Pending
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-200 text-yellow-800">
              {statusCounts.pending}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('shortlisted')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'shortlisted'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Shortlisted
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-200 text-green-800">
              {statusCounts.shortlisted}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Rejected
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-200 text-red-800">
              {statusCounts.rejected}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by company or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {applications.length === 0 ? 'No Applications Yet' : 'No applications found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {applications.length === 0
              ? "You haven't applied to any jobs yet. Start browsing available jobs and apply!"
              : 'Try adjusting your search or filter criteria'}
          </p>
          {applications.length === 0 && (
            <a href="/student/jobs" className="btn btn-primary">
              Browse Jobs
            </a>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Building2 size={20} className="text-gray-400" />
                        <span className="font-semibold">{application.company_name}</span>
                      </div>
                    </td>
                    <td className="font-medium">{application.job_title}</td>
                    <td className="text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{formatDate(application.applied_at)}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(application.status)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(application)}
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        title="View Details"
                      >
                        <Eye size={18} />
                        <span className="text-sm">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

// Application Details Modal Component
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
          <span className="badge badge-warning flex items-center space-x-1">
            <Clock size={14} />
            <span>Pending</span>
          </span>
        );
      case 'shortlisted':
        return (
          <span className="badge badge-success flex items-center space-x-1">
            <CheckCircle size={14} />
            <span>Shortlisted</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="badge badge-danger flex items-center space-x-1">
            <XCircle size={14} />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Application Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company & Job Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3 mb-3">
              <Building2 className="text-primary-600 mt-1" size={24} />
              <div>
                <h3 className="font-bold text-xl text-gray-900">{application.company_name}</h3>
                <p className="text-lg text-gray-600">{application.job_title}</p>
              </div>
            </div>
            {application.location && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Location:</span> {application.location}
              </p>
            )}
            {application.salary_package && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Salary:</span>{' '}
                <span className="font-semibold text-green-600">₹{application.salary_package} LPA</span>
              </p>
            )}
          </div>

          {/* Application Status */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Application Status</h3>
            <div className="flex items-center space-x-3">
              {getStatusBadge(application.status)}
              {application.status === 'shortlisted' && (
                <p className="text-sm text-green-700">
                  Congratulations! You have been shortlisted for this position.
                </p>
              )}
              {application.status === 'rejected' && (
                <p className="text-sm text-red-700">
                  Unfortunately, your application was not selected for this position.
                </p>
              )}
              {application.status === 'pending' && (
                <p className="text-sm text-yellow-700">
                  Your application is under review.
                </p>
              )}
            </div>
          </div>

          {/* Application Timeline */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-600">Applied on:</span>
                <span className="font-semibold">{formatDate(application.applied_at)}</span>
              </div>
              {application.updated_at && application.updated_at !== application.applied_at && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar size={16} className="text-gray-500" />
                  <span className="text-gray-600">Last updated:</span>
                  <span className="font-semibold">{formatDate(application.updated_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          {application.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{application.description}</p>
            </div>
          )}

          {/* Eligibility Criteria */}
          {(application.min_cgpa || application.max_backlogs !== null) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Eligibility Criteria</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                {application.min_cgpa && (
                  <div>
                    <span className="text-sm text-gray-600">Minimum CGPA:</span>
                    <p className="font-semibold">{application.min_cgpa}</p>
                  </div>
                )}
                {application.max_backlogs !== null && application.max_backlogs !== undefined && (
                  <div>
                    <span className="text-sm text-gray-600">Max Backlogs:</span>
                    <p className="font-semibold">{application.max_backlogs}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Application Form Link */}
          {application.application_form_url && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Application Form</h3>
              <a
                href={application.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline text-sm"
              >
                View Application Form
              </a>
            </div>
          )}

          {/* Additional Notes */}
          {application.notes && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{application.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t">
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

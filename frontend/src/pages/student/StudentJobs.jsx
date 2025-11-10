import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Filter,
  Search,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('all'); // 'all', 'eligible', 'not-eligible'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobsData();
  }, [searchQuery, filterEligibility, jobs]);

  const fetchJobs = async () => {
    try {
      const response = await studentAPI.getEligibleJobs();
      setJobs(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filterJobsData = () => {
    let filtered = jobs;

    // Filter by eligibility
    if (filterEligibility === 'eligible') {
      filtered = filtered.filter((job) => job.is_eligible);
    } else if (filterEligibility === 'not-eligible') {
      filtered = filtered.filter((job) => !job.is_eligible);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  const handleApplyClick = (job) => {
    if (!job.is_eligible) {
      toast.error('You are not eligible for this job');
      return;
    }
    if (job.has_applied) {
      toast.error('You have already applied for this job');
      return;
    }
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedJob) return;

    setApplying(true);
    try {
      await studentAPI.applyForJob(selectedJob.id);
      toast.success('Application submitted successfully!');

      // Redirect to Google Form if available
      if (selectedJob.application_form_url) {
        window.open(selectedJob.application_form_url, '_blank');
      }

      setShowApplicationModal(false);
      fetchJobs(); // Refresh to update applied status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply for job');
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
        <p className="text-gray-600 mt-2">Browse and apply to job opportunities</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by company, title, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Eligibility Filters */}
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-600" />
          <button
            onClick={() => setFilterEligibility('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterEligibility === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setFilterEligibility('eligible')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterEligibility === 'eligible'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Eligible ({jobs.filter((j) => j.is_eligible).length})
          </button>
          <button
            onClick={() => setFilterEligibility('not-eligible')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterEligibility === 'not-eligible'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Check Eligibility ({jobs.filter((j) => !j.is_eligible).length})
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg">
            {searchQuery || filterEligibility !== 'all'
              ? 'No jobs found matching your filters'
              : 'No jobs available at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewDetails={handleViewDetails}
              onApply={handleApplyClick}
            />
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {showDetailsModal && selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedJob(null);
          }}
          onApply={() => {
            setShowDetailsModal(false);
            handleApplyClick(selectedJob);
          }}
        />
      )}

      {/* Application Confirmation Modal */}
      {showApplicationModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Application</h2>
            <p className="text-gray-600 mb-4">
              You are about to apply for <span className="font-semibold">{selectedJob.title}</span> at{' '}
              <span className="font-semibold">{selectedJob.company_name}</span>.
            </p>
            {selectedJob.application_form_url && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  After confirming, you'll be redirected to the Google Form to complete your application.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              This action will mark you as applied and cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmApply}
                disabled={applying}
                className="btn btn-primary flex-1"
              >
                {applying ? 'Applying...' : 'Confirm & Apply'}
              </button>
              <button
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedJob(null);
                }}
                disabled={applying}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Job Card Component
function JobCard({ job, onViewDetails, onApply }) {
  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const deadlinePassed = isDeadlinePassed(job.application_deadline);

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 relative">
      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.has_applied && (
          <span className="badge bg-blue-100 text-blue-800">Applied</span>
        )}
        {!job.is_active && (
          <span className="badge bg-gray-100 text-gray-800">Inactive</span>
        )}
        {deadlinePassed && !job.has_applied ? (
          <span className="badge bg-orange-100 text-orange-800">Missed Opportunity</span>
        ) : job.is_eligible ? (
          <span className="badge badge-success flex items-center space-x-1">
            <CheckCircle size={14} />
            <span>Eligible</span>
          </span>
        ) : (
          <span className="badge badge-warning flex items-center space-x-1">
            <XCircle size={14} />
            <span>Check Eligibility</span>
          </span>
        )}
      </div>

      {/* Company & Title */}
      <div className="mb-4">
        <div className="flex items-start space-x-3 mb-2">
          <Building2 className="text-primary-600 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-lg text-gray-900">{job.company_name}</h3>
            <p className="text-gray-600">{job.title}</p>
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        {job.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={16} className="mr-2 text-gray-400" />
            <span>{job.location}</span>
          </div>
        )}
        {job.salary_package && (
          <div className="flex items-center text-sm text-gray-600">
            <IndianRupee size={16} className="mr-2 text-gray-400" />
            <span className="font-semibold text-green-600">{job.salary_package} LPA</span>
          </div>
        )}
        {job.application_deadline && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={16} className="mr-2 text-gray-400" />
            <span>Deadline: {formatDate(job.application_deadline)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewDetails(job)}
          className="btn btn-secondary flex-1 flex items-center justify-center space-x-2"
        >
          <Eye size={16} />
          <span>Details</span>
        </button>
        <button
          onClick={() => onApply(job)}
          disabled={!job.is_eligible || job.has_applied || deadlinePassed || !job.is_active}
          className="btn btn-primary flex-1"
        >
          {job.has_applied
            ? 'Applied'
            : deadlinePassed
            ? 'Deadline Passed'
            : !job.is_active
            ? 'Inactive'
            : 'Apply'}
        </button>
      </div>
    </div>
  );
}

// Job Details Modal Component
function JobDetailsModal({ job, onClose, onApply }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const deadlinePassed = isDeadlinePassed(job.application_deadline);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{job.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <Building2 className="text-primary-600 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{job.company_name}</h3>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                {job.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin size={16} />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.salary_package && (
                  <div className="flex items-center space-x-1">
                    <IndianRupee size={16} />
                    <span className="font-semibold text-green-600">{job.salary_package} LPA</span>
                  </div>
                )}
                {job.job_type && (
                  <span className="badge badge-info">{job.job_type}</span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {job.has_applied && (
              <span className="badge bg-blue-100 text-blue-800">You have applied</span>
            )}
            {job.is_eligible ? (
              <span className="badge badge-success flex items-center space-x-1">
                <CheckCircle size={14} />
                <span>You are eligible</span>
              </span>
            ) : (
              <span className="badge badge-danger flex items-center space-x-1">
                <XCircle size={14} />
                <span>Not eligible</span>
              </span>
            )}
            {deadlinePassed && (
              <span className="badge badge-danger">Deadline Passed</span>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* Eligibility Criteria */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Eligibility Criteria</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              {job.min_cgpa && (
                <div>
                  <span className="text-sm text-gray-600">Minimum CGPA:</span>
                  <p className="font-semibold text-lg">{job.min_cgpa}</p>
                </div>
              )}
              {job.max_backlogs !== null && job.max_backlogs !== undefined && (
                <div>
                  <span className="text-sm text-gray-600">Max Backlogs:</span>
                  <p className="font-semibold text-lg">{job.max_backlogs}</p>
                </div>
              )}
            </div>
            {!job.is_eligible && job.eligibility_reason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Reason: </span>
                  {job.eligibility_reason}
                </p>
              </div>
            )}
          </div>

          {/* Allowed Branches */}
          {job.allowed_branches && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Allowed Branches</h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(job.allowed_branches)
                  ? job.allowed_branches
                  : (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : [])
                ).map((branch, index) => (
                  <span key={index} className="badge badge-info">
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Application Info */}
          {job.application_deadline && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Application Details</h3>
              <div className="flex items-center space-x-2 text-sm">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-600">Deadline:</span>
                <span className="font-semibold">{formatDate(job.application_deadline)}</span>
              </div>
            </div>
          )}

          {/* Google Form Link */}
          {job.application_form_url && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                This job requires filling out an external application form.
              </p>
              <a
                href={job.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline text-sm flex items-center space-x-1"
              >
                <ExternalLink size={16} />
                <span>View Application Form</span>
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            {!job.has_applied && job.is_eligible && !deadlinePassed && (
              <button onClick={onApply} className="btn btn-primary flex-1">
                Apply Now
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

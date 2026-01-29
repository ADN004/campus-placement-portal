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
import SmartApplicationModal from '../../components/SmartApplicationModal';
import toast from 'react-hot-toast';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassButton from '../../components/GlassButton';
import GradientOrb from '../../components/GradientOrb';

export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('all'); // 'all', 'eligible', 'not-eligible', 'missed'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [error, setError] = useState(null);

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
          title: 'Failed to Load Jobs',
          message: 'Unable to fetch available jobs. Please try again later.',
          type: 'error'
        });
        toast.error('Failed to load jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterJobsData = () => {
    let filtered = jobs;

    // Filter by deadline and eligibility
    if (filterEligibility === 'all') {
      // Show only available jobs (not deadline passed and not already applied)
      filtered = filtered.filter((job) => !job.deadline_passed || job.has_applied);
    } else if (filterEligibility === 'eligible') {
      filtered = filtered.filter((job) => job.is_eligible && (!job.deadline_passed || job.has_applied));
    } else if (filterEligibility === 'not-eligible') {
      filtered = filtered.filter((job) => !job.is_eligible && (!job.deadline_passed || job.has_applied));
    } else if (filterEligibility === 'missed') {
      // Show only deadline-passed jobs that student hasn't applied to
      filtered = filtered.filter((job) => job.deadline_passed && !job.has_applied);
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
    if (job.has_applied) {
      toast.error('You have already applied for this job');
      return;
    }
    if (job.deadline_passed) {
      toast.error('Application deadline has passed');
      return;
    }
    if (!job.is_active) {
      toast.error('This job is no longer active');
      return;
    }
    // Note: We no longer check is_eligible here - the smart modal will handle it
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    fetchJobs(); // Refresh to update applied status
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

  if (error) {
    return (
      <div>
        <GradientOrb color="blue" position="top-right" />
        <GradientOrb color="indigo" position="bottom-left" delay="2s" />
        <GradientOrb color="purple" position="center" delay="4s" />

        <div className="mb-8">
          <DashboardHeader
            icon={Briefcase}
            title="Available Jobs"
            subtitle="Browse and apply to job opportunities"
          />
        </div>

        <GlassCard className="p-16 text-center">
          <div className={`rounded-2xl p-6 inline-block mb-6 ${
            error.type === 'pending'
              ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
              : 'bg-gradient-to-br from-red-500 to-pink-600'
          }`}>
            <Briefcase className="text-white" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{error.title}</h3>
          <p className="text-gray-600 text-lg mb-6">{error.message}</p>
          {error.type === 'pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-yellow-900 font-semibold">
                Please wait for your placement officer to approve your registration.
                You'll be able to view and apply for jobs once approved.
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
          icon={Briefcase}
          title="Available Jobs"
          subtitle="Browse and apply to job opportunities"
        />
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-5">
        {/* Search Bar */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
              <Search className="text-white" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by company, title, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-transparent border-none outline-none focus:ring-0 font-medium text-lg"
            />
          </div>
        </GlassCard>

        {/* Eligibility Filters */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2">
                <Filter size={20} className="text-white" />
              </div>
              <span className="font-bold text-gray-800">Filter by:</span>
            </div>
            <button
              onClick={() => setFilterEligibility('all')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                filterEligibility === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              All Jobs ({jobs.filter((j) => !j.deadline_passed || j.has_applied).length})
            </button>
            <button
              onClick={() => setFilterEligibility('eligible')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                filterEligibility === 'eligible'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Eligible ({jobs.filter((j) => j.is_eligible && (!j.deadline_passed || j.has_applied)).length})
            </button>
            <button
              onClick={() => setFilterEligibility('not-eligible')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                filterEligibility === 'not-eligible'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Check Eligibility ({jobs.filter((j) => !j.is_eligible && (!j.deadline_passed || j.has_applied)).length})
            </button>
            <button
              onClick={() => setFilterEligibility('missed')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                filterEligibility === 'missed'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Missed Opportunities ({jobs.filter((j) => j.deadline_passed && !j.has_applied).length})
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 inline-block mb-6">
            <Briefcase className="text-white" size={64} />
          </div>
          <p className="text-gray-700 text-xl font-bold">
            {searchQuery || filterEligibility !== 'all'
              ? 'No jobs found matching your filters'
              : 'No jobs available at the moment'}
          </p>
          <p className="text-gray-600 mt-2">Check back later for new opportunities</p>
        </GlassCard>
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

      {/* Smart Application Modal */}
      {showApplicationModal && selectedJob && (
        <SmartApplicationModal
          job={selectedJob}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedJob(null);
          }}
          onSuccess={handleApplicationSuccess}
        />
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
    <GlassCard className="group relative p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl"></div>

      <div className="relative z-10">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {job.has_applied && (
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-lg">Applied</span>
          )}
          {!job.is_active && (
            <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg">Inactive</span>
          )}
          {deadlinePassed && !job.has_applied ? (
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-lg">Missed Opportunity</span>
          ) : job.is_eligible ? (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
              <CheckCircle size={14} />
              <span>Eligible</span>
            </span>
          ) : (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1">
              <XCircle size={14} />
              <span>Not Eligible</span>
            </span>
          )}
        </div>

        {/* Company & Title */}
        <div className="mb-5">
          <div className="flex items-start space-x-3 mb-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 mb-1">{job.company_name}</h3>
              <p className="text-gray-600 font-medium">{job.title}</p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-3 mb-5">
          {job.location && (
            <div className="flex items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
              <MapPin size={18} className="mr-3 text-blue-600" />
              <span className="font-medium text-gray-900">{job.location}</span>
            </div>
          )}
          {job.salary_package && (
            <div className="flex items-center bg-green-50 rounded-xl p-3 border border-green-100">
              <IndianRupee size={18} className="mr-3 text-green-600" />
              <span className="font-bold text-green-700">{job.salary_package} LPA</span>
            </div>
          )}
          {job.application_deadline && (
            <div className="flex items-center bg-orange-50 rounded-xl p-3 border border-orange-100">
              <Calendar size={18} className="mr-3 text-orange-600" />
              <span className="font-medium text-gray-900">{formatDate(job.application_deadline)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4 border-t-2 border-gray-100">
          <GlassButton
            variant="secondary"
            onClick={() => onViewDetails(job)}
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Eye size={18} />
            <span>Details</span>
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={() => onApply(job)}
            disabled={job.has_applied || deadlinePassed || !job.is_active}
            className="flex-1"
          >
            {job.has_applied
              ? 'Applied'
              : deadlinePassed
              ? 'Deadline Passed'
              : !job.is_active
              ? 'Inactive'
              : 'Apply'}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-3xl font-bold text-white">{job.title}</h2>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2 transition-all"
          >
            <XCircle size={28} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Company Info */}
          <div className="flex items-start space-x-5 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 shadow-lg">
              <Building2 className="text-white" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-2xl text-gray-900 mb-3">{job.company_name}</h3>
              <div className="flex flex-wrap gap-5 text-base">
                {job.location && (
                  <div className="flex items-center space-x-2 bg-white rounded-xl px-4 py-2 border border-blue-100">
                    <MapPin size={20} className="text-blue-600" />
                    <span className="font-semibold text-gray-900">{job.location}</span>
                  </div>
                )}
                {job.salary_package && (
                  <div className="flex items-center space-x-2 bg-white rounded-xl px-4 py-2 border border-green-100">
                    <IndianRupee size={20} className="text-green-600" />
                    <span className="font-bold text-green-700">{job.salary_package} LPA</span>
                  </div>
                )}
                {job.no_of_vacancies && (
                  <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-4 py-2 rounded-xl">{job.no_of_vacancies} Vacancies</span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-3">
            {job.has_applied && (
              <span className="bg-blue-100 text-blue-800 text-sm font-bold px-5 py-2.5 rounded-xl border-2 border-blue-200">You have applied</span>
            )}
            {job.is_eligible ? (
              <span className="bg-green-100 text-green-800 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 border-2 border-green-200">
                <CheckCircle size={18} />
                <span>You are eligible</span>
              </span>
            ) : (
              <span className="bg-red-100 text-red-800 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 border-2 border-red-200">
                <XCircle size={18} />
                <span>Not eligible</span>
              </span>
            )}
            {deadlinePassed && (
              <span className="bg-red-100 text-red-800 text-sm font-bold px-5 py-2.5 rounded-xl border-2 border-red-200">Deadline Passed</span>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-2xl border-2 border-gray-200">
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center">
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-2 mr-3">
                  <Briefcase size={20} className="text-white" />
                </div>
                Job Description
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{job.description}</p>
            </div>
          )}

          {/* Eligibility Criteria */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border-2 border-indigo-200">
            <h3 className="font-bold text-xl text-gray-900 mb-5 flex items-center">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2 mr-3">
                <CheckCircle size={20} className="text-white" />
              </div>
              Eligibility Criteria
            </h3>
            <div className="grid grid-cols-2 gap-5">
              {job.min_cgpa && (
                <div className="bg-white rounded-xl p-5 border border-indigo-100">
                  <span className="text-sm text-gray-600 font-semibold block mb-2">Minimum CGPA:</span>
                  <p className="font-bold text-3xl text-indigo-600">{job.min_cgpa}</p>
                </div>
              )}
              {job.max_backlogs !== null && job.max_backlogs !== undefined && (
                <div className="bg-white rounded-xl p-5 border border-indigo-100">
                  <span className="text-sm text-gray-600 font-semibold block mb-2">Max Backlogs:</span>
                  <p className="font-bold text-3xl text-indigo-600">{job.max_backlogs}</p>
                </div>
              )}
            </div>
            {!job.is_eligible && job.eligibility_reason && (
              <div className="mt-5 p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
                <p className="text-base text-red-900 font-bold">
                  <span className="block mb-1">Reason for Ineligibility:</span>
                  <span className="font-medium">{job.eligibility_reason}</span>
                </p>
              </div>
            )}
          </div>

          {/* Allowed Branches */}
          {job.allowed_branches && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
              <h3 className="font-bold text-xl text-gray-900 mb-4">Allowed Branches</h3>
              <div className="flex flex-wrap gap-3">
                {(Array.isArray(job.allowed_branches)
                  ? job.allowed_branches
                  : (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : [])
                ).map((branch, index) => (
                  <span key={index} className="bg-green-100 text-green-800 text-sm font-bold px-5 py-2.5 rounded-xl border-2 border-green-200">
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Application Info */}
          {job.application_deadline && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-2xl border-2 border-orange-200">
              <h3 className="font-bold text-xl text-gray-900 mb-4">Application Details</h3>
              <div className="flex items-center space-x-3 bg-white rounded-xl px-5 py-3 border border-orange-100">
                <Calendar size={22} className="text-orange-600" />
                <span className="text-gray-600 font-semibold">Deadline:</span>
                <span className="font-bold text-lg text-gray-900">{formatDate(job.application_deadline)}</span>
              </div>
            </div>
          )}

          {/* Google Form Link */}
          {job.application_form_url && (
            <div className="p-6 bg-gradient-to-r from-green-500/90 to-emerald-500/90 border-2 border-green-300 rounded-2xl shadow-xl">
              <p className="text-white font-bold text-lg mb-3">
                This job requires filling out an external application form.
              </p>
              <a
                href={job.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-all transform hover:scale-105 active:scale-95"
              >
                <ExternalLink size={20} />
                <span>View Application Form</span>
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4 pt-6 border-t-2">
            {!job.has_applied && !deadlinePassed && job.is_active && (
              <GlassButton
                variant="primary"
                onClick={onApply}
                className="flex-1"
              >
                Apply Now
              </GlassButton>
            )}
            <GlassButton
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

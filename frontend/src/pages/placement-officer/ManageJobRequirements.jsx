import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { placementOfficerAPI } from '../../services/api';
import JobRequirementsConfig from '../../components/JobRequirementsConfig';
import { ArrowLeft, Briefcase, CheckCircle, Users, Loader, Settings } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';

const ManageJobRequirements = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eligibleCount, setEligibleCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    fetchApprovedJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchEligibleCount();
    }
  }, [selectedJob]);

  const fetchApprovedJobs = async () => {
    try {
      const response = await placementOfficerAPI.getMyJobRequests();
      // Filter only approved jobs
      const approvedJobs = response.data.data.filter(job => job.is_approved === true);
      setJobs(approvedJobs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
      setLoading(false);
    }
  };

  const fetchEligibleCount = async () => {
    if (!selectedJob) return;

    setLoadingCount(true);
    try {
      const response = await placementOfficerAPI.getEligibleStudentsCount(selectedJob.id);
      setEligibleCount(response.data.data);
    } catch (error) {
      console.error('Error fetching eligible count:', error);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleRequirementsSaved = () => {
    toast.success('Requirements saved successfully!');
    fetchEligibleCount(); // Refresh eligible count
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/placement-officer/my-job-requests')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-bold mb-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all transform hover:scale-105"
        >
          <ArrowLeft size={20} />
          <span>Back to My Job Requests</span>
        </button>
        <DashboardHeader
          icon={Settings}
          title="Manage Job Requirements"
          subtitle="Configure detailed requirements for your approved jobs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard variant="elevated" className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2 mr-3 shadow-lg">
                <Briefcase className="text-white" size={20} />
              </div>
              Approved Jobs ({jobs.length})
            </h2>

            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                <p className="text-gray-600 font-bold text-lg mb-2">No approved jobs yet</p>
                <p className="text-sm text-gray-500 font-medium">
                  Jobs need Super Admin approval first
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left p-5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedJob?.id === job.id
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg'
                        : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 line-clamp-1 text-lg mb-1">
                          {job.job_title}
                        </div>
                        <div className="text-sm text-gray-700 font-medium mb-3">
                          {job.company_name}
                        </div>
                        {job.is_active && (
                          <div className="flex items-center space-x-1.5 bg-green-100 text-green-800 w-fit px-3 py-1 rounded-lg border-2 border-green-200">
                            <CheckCircle size={14} />
                            <span className="text-xs font-bold">Active</span>
                          </div>
                        )}
                      </div>
                      {selectedJob?.id === job.id && (
                        <div className="ml-3">
                          <div className="w-4 h-4 bg-blue-600 rounded-full shadow-lg"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Eligible Students Card */}
          {selectedJob && (
            <GlassCard variant="elevated" className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-2 mr-3 shadow-lg">
                  <Users className="text-white" size={20} />
                </div>
                Eligibility Stats
              </h3>
              {loadingCount ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin text-blue-600" size={40} />
                </div>
              ) : eligibleCount ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
                    <span className="text-sm font-bold text-gray-700">Total Students</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {eligibleCount.total_students}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100">
                    <span className="text-sm font-bold text-gray-700">Eligible</span>
                    <span className="text-2xl font-bold text-green-600">
                      {eligibleCount.eligible_students}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-red-100">
                    <span className="text-sm font-bold text-gray-700">Not Eligible</span>
                    <span className="text-2xl font-bold text-red-600">
                      {eligibleCount.ineligible_students}
                    </span>
                  </div>
                  <div className="mt-5 pt-5 border-t-2 border-gray-200">
                    <div className="text-sm text-gray-600 text-center">
                      <span className="font-bold">Eligibility Rate:</span>{' '}
                      <span className="font-bold text-gray-900 text-lg">
                        {eligibleCount.total_students > 0
                          ? Math.round((eligibleCount.eligible_students / eligibleCount.total_students) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          )}
        </div>

        {/* Requirements Configuration */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <GlassCard variant="elevated" className="p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedJob.job_title}
                </h2>
                <p className="text-gray-700 font-medium text-lg mt-2">
                  {selectedJob.company_name}
                </p>
              </div>

              <JobRequirementsConfig
                jobId={selectedJob.id}
                onRequirementsSaved={handleRequirementsSaved}
              />
            </GlassCard>
          ) : (
            <GlassCard variant="elevated" className="p-16 text-center">
              <Briefcase className="mx-auto text-gray-300 mb-6" size={96} />
              <h3 className="text-2xl font-bold text-gray-600 mb-3">
                Select a Job
              </h3>
              <p className="text-gray-500 font-medium text-lg">
                Choose a job from the list to configure its requirements
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageJobRequirements;

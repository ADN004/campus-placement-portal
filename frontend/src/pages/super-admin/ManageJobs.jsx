import { useState, useEffect } from 'react';
import { superAdminAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  Users,
  Clock,
} from 'lucide-react';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';

export default function ManageJobs() {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending'
  const [jobs, setJobs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    description: '',
    location: '',
    salary_package: '',
    job_type: 'Full-time',
    application_deadline: '',
    min_cgpa: '',
    max_backlogs: '',
    allowed_branches: [],
    target_type: 'region', // 'region' or 'college'
    target_regions: [],
    target_colleges: [],
    application_form_url: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchJobs(), fetchPendingRequests(), fetchRegions()]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await superAdminAPI.getJobs();
      setJobs(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load jobs');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await superAdminAPI.getPendingJobRequests();
      setPendingRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await commonAPI.getRegions();
      setRegions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const fetchColleges = async () => {
    try {
      const response = await commonAPI.getColleges();
      setColleges(response.data.data || []);
    } catch (error) {
      console.error('Failed to load colleges:', error);
    }
  };

  const handleCreateJob = () => {
    setEditMode(false);
    setSelectedJob(null);
    setFormData({
      title: '',
      company_name: '',
      description: '',
      location: '',
      salary_package: '',
      job_type: 'Full-time',
      application_deadline: '',
      min_cgpa: '',
      max_backlogs: '',
      allowed_branches: [],
      target_type: 'region',
      target_regions: [],
      target_colleges: [],
      application_form_url: '',
    });
    setShowJobModal(true);
    if (colleges.length === 0) {
      fetchColleges();
    }
  };

  const handleEditJob = (job) => {
    setEditMode(true);
    setSelectedJob(job);
    setFormData({
      title: job.title || '',
      company_name: job.company_name || '',
      description: job.description || '',
      location: job.location || '',
      salary_package: job.salary_package || '',
      job_type: job.job_type || 'Full-time',
      application_deadline: job.application_deadline
        ? new Date(job.application_deadline).toISOString().split('T')[0]
        : '',
      min_cgpa: job.min_cgpa || '',
      max_backlogs: job.max_backlogs || '',
      allowed_branches: job.allowed_branches ? JSON.parse(job.allowed_branches) : [],
      target_type: job.target_type || 'region',
      target_regions: job.target_regions ? JSON.parse(job.target_regions) : [],
      target_colleges: job.target_colleges ? JSON.parse(job.target_colleges) : [],
      application_form_url: job.application_form_url || '',
    });
    setShowJobModal(true);
    if (colleges.length === 0) {
      fetchColleges();
    }
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.company_name || !formData.description) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.allowed_branches.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }

    if (formData.target_type === 'region' && formData.target_regions.length === 0) {
      toast.error('Please select at least one region');
      return;
    }

    if (formData.target_type === 'college' && formData.target_colleges.length === 0) {
      toast.error('Please select at least one college');
      return;
    }

    try {
      const submitData = {
        ...formData,
        allowed_branches: JSON.stringify(formData.allowed_branches),
        target_regions: JSON.stringify(formData.target_regions),
        target_colleges: JSON.stringify(formData.target_colleges),
      };

      if (editMode) {
        await superAdminAPI.updateJob(selectedJob.id, submitData);
        toast.success('Job updated successfully');
      } else {
        await superAdminAPI.createJob(submitData);
        toast.success('Job created successfully');
      }

      setShowJobModal(false);
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save job');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      await superAdminAPI.deleteJob(jobId);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    }
  };

  const handleToggleStatus = async (jobId, currentStatus) => {
    try {
      await superAdminAPI.toggleJobStatus(jobId);
      toast.success(`Job ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this job request?')) {
      return;
    }

    try {
      await superAdminAPI.approveJobRequest(requestId);
      toast.success('Job request approved successfully');
      fetchJobs();
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve job request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this job request?')) {
      return;
    }

    try {
      await superAdminAPI.rejectJobRequest(requestId);
      toast.success('Job request rejected successfully');
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject job request');
    }
  };

  const handleBranchToggle = (branch) => {
    const newBranches = formData.allowed_branches.includes(branch)
      ? formData.allowed_branches.filter((b) => b !== branch)
      : [...formData.allowed_branches, branch];
    setFormData({ ...formData, allowed_branches: newBranches });
  };

  const handleTargetChange = (id, type) => {
    if (type === 'region') {
      const newRegions = formData.target_regions.includes(id)
        ? formData.target_regions.filter((r) => r !== id)
        : [...formData.target_regions, id];
      setFormData({ ...formData, target_regions: newRegions });
    } else {
      const newColleges = formData.target_colleges.includes(id)
        ? formData.target_colleges.filter((c) => c !== id)
        : [...formData.target_colleges, id];
      setFormData({ ...formData, target_colleges: newColleges });
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

  const getTargetDisplay = (job) => {
    // Handle 'specific' type from job requests - check what data exists
    if (job.target_type === 'specific') {
      if (job.target_regions) {
        // Has regions - treat as region type
        job = { ...job, target_type: 'region' };
      } else if (job.target_colleges) {
        // Has colleges - treat as college type
        job = { ...job, target_type: 'college' };
      } else {
        // Neither - show all
        return 'All Students';
      }
    }

    if ((job.target_type === 'region' || job.target_type === 'specific') && job.target_regions) {
      let targetRegions;
      try {
        targetRegions = typeof job.target_regions === 'string'
          ? JSON.parse(job.target_regions)
          : job.target_regions;
      } catch (error) {
        console.error('Failed to parse target_regions:', error);
        return 'N/A';
      }

      // Ensure targetRegions is an array
      if (!Array.isArray(targetRegions) || targetRegions.length === 0) {
        return 'N/A';
      }

      const regionNames = regions
        .filter((r) => targetRegions.includes(r.id))
        .map((r) => r.region_name || r.name);
      return regionNames.length > 0 ? regionNames.join(', ') : 'N/A';
    } else if ((job.target_type === 'college' || job.target_type === 'specific') && job.target_colleges) {
      let targetColleges;
      try {
        targetColleges = typeof job.target_colleges === 'string'
          ? JSON.parse(job.target_colleges)
          : job.target_colleges;
      } catch (error) {
        console.error('Failed to parse target_colleges:', error);
        return 'N/A';
      }

      // Ensure targetColleges is an array
      if (!Array.isArray(targetColleges) || targetColleges.length === 0) {
        return 'N/A';
      }

      const collegeNames = colleges
        .filter((c) => targetColleges.includes(c.id))
        .map((c) => c.college_name || c.name);
      return collegeNames.length > 0
        ? collegeNames.length > 2
          ? `${collegeNames.slice(0, 2).join(', ')} +${collegeNames.length - 2} more`
          : collegeNames.join(', ')
        : 'N/A';
    } else if (job.target_type === 'all') {
      return 'All Students';
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Jobs</h1>
          <p className="text-gray-600 mt-1">
            Create, approve, and manage job postings across all colleges
          </p>
        </div>
        <button
          onClick={handleCreateJob}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Job</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approval ({pendingRequests.length})
            </button>
          </nav>
        </div>
      </div>

      {/* All Jobs Tab */}
      {activeTab === 'all' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Salary</th>
                  <th>Deadline</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-gray-500 py-8">
                      No jobs posted yet. Create your first job posting to get started.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="font-semibold">{job.title}</td>
                      <td>{job.company_name}</td>
                      <td className="text-sm text-gray-600">{job.location || 'N/A'}</td>
                      <td className="font-semibold text-green-600">
                        {job.salary_package ? `₹${job.salary_package} LPA` : 'Not specified'}
                      </td>
                      <td className="text-sm">{formatDate(job.application_deadline)}</td>
                      <td className="text-sm text-gray-600 max-w-xs truncate">
                        {getTargetDisplay(job)}
                      </td>
                      <td>
                        {job.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(job)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditJob(job)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(job.id, job.is_active)}
                            className="text-blue-600 hover:text-blue-800"
                            title={job.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {job.is_active ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Salary</th>
                  <th>Requested By</th>
                  <th>College</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-gray-500 py-8">
                      No pending job requests at the moment.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="font-semibold">{request.job_title}</td>
                      <td>{request.company_name}</td>
                      <td className="text-sm text-gray-600">{request.location || 'N/A'}</td>
                      <td className="font-semibold text-green-600">
                        {request.salary_range ? `₹${request.salary_range} LPA` : 'Not specified'}
                      </td>
                      <td className="text-sm">{request.officer_name || 'N/A'}</td>
                      <td className="text-sm text-gray-600">{request.college_name || 'N/A'}</td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job Create/Edit Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold">
                {editMode ? 'Edit Job' : 'Create New Job'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      placeholder="e.g., Google"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input"
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the job role, responsibilities, and requirements..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Location</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Mumbai, India"
                    />
                  </div>
                  <div>
                    <label className="label">Salary Package</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.salary_package}
                      onChange={(e) =>
                        setFormData({ ...formData, salary_package: e.target.value })
                      }
                      placeholder="e.g., 12-15 LPA"
                    />
                  </div>
                  <div>
                    <label className="label">Job Type</label>
                    <select
                      className="input"
                      value={formData.job_type}
                      onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Application Deadline</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.application_deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, application_deadline: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Google Form URL</label>
                    <input
                      type="url"
                      className="input"
                      value={formData.application_form_url}
                      onChange={(e) =>
                        setFormData({ ...formData, application_form_url: e.target.value })
                      }
                      placeholder="https://forms.google.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Eligibility Criteria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Minimum CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      className="input"
                      value={formData.min_cgpa}
                      onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                      placeholder="e.g., 7.0"
                    />
                  </div>
                  <div>
                    <label className="label">Maximum Backlogs Allowed</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={formData.max_backlogs}
                      onChange={(e) => setFormData({ ...formData, max_backlogs: e.target.value })}
                      placeholder="e.g., 0"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Allowed Branches <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
                        <label key={branch} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowed_branches.includes(branch)}
                            onChange={() => handleBranchToggle(branch)}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm">{branch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Target Audience
                </h3>
                <div>
                  <label className="label">Target Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target_type"
                        value="region"
                        checked={formData.target_type === 'region'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value })
                        }
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>Region</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target_type"
                        value="college"
                        checked={formData.target_type === 'college'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value })
                        }
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>Specific Colleges</span>
                    </label>
                  </div>
                </div>

                {formData.target_type === 'region' ? (
                  <div>
                    <label className="label">
                      Select Regions <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {regions.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          <p>Loading regions...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {regions.map((region) => (
                            <label
                              key={region.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.target_regions.includes(region.id)}
                                onChange={() => handleTargetChange(region.id, 'region')}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm">{region.region_name || region.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label">
                      Select Colleges <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                      {colleges.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          <p>Loading colleges...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {colleges.map((college) => (
                            <label
                              key={college.id}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.target_colleges.includes(college.id)}
                                onChange={() => handleTargetChange(college.id, 'college')}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm">{college.college_name || college.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" className="btn btn-primary flex-1">
                  {editMode ? 'Update Job' : 'Create Job'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJobModal(false);
                    setEditMode(false);
                    setSelectedJob(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showDetailsModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedJob(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Info */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <Building2 className="text-primary-600 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">{selectedJob.company_name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                    {selectedJob.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{selectedJob.location}</span>
                      </div>
                    )}
                    {selectedJob.salary_package && (
                      <div className="flex items-center space-x-1">
                        <IndianRupee size={16} />
                        <span>₹{selectedJob.salary_package} LPA</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock size={16} />
                      <span>{selectedJob.job_type}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {/* Eligibility */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Eligibility Criteria</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  {selectedJob.min_cgpa && (
                    <div>
                      <span className="text-sm text-gray-600">Minimum CGPA:</span>
                      <p className="font-semibold">{selectedJob.min_cgpa}</p>
                    </div>
                  )}
                  {selectedJob.max_backlogs !== null && selectedJob.max_backlogs !== undefined && (
                    <div>
                      <span className="text-sm text-gray-600">Max Backlogs:</span>
                      <p className="font-semibold">{selectedJob.max_backlogs}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Allowed Branches */}
              {selectedJob.allowed_branches && selectedJob.allowed_branches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Allowed Branches</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(selectedJob.allowed_branches)
                      ? selectedJob.allowed_branches
                      : (typeof selectedJob.allowed_branches === 'string' ? JSON.parse(selectedJob.allowed_branches) : [])
                    ).map((branch) => (
                      <span key={branch} className="badge badge-info">
                        {branch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Audience */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Target Audience</h3>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users size={18} className="text-green-600" />
                    <span className="text-sm font-medium">
                      {(() => {
                        if (selectedJob.target_type === 'specific') {
                          if (selectedJob.target_regions) return 'Regions';
                          if (selectedJob.target_colleges) return 'Colleges';
                          return 'All Students';
                        }
                        return selectedJob.target_type === 'region' ? 'Regions' : selectedJob.target_type === 'college' ? 'Colleges' : 'All Students';
                      })()}
                    </span>
                  </div>
                  <p className="text-gray-700">{getTargetDisplay(selectedJob)}</p>
                </div>
              </div>

              {/* Application Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Application Details</h3>
                <div className="space-y-2">
                  {selectedJob.application_deadline && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-semibold">{formatDate(selectedJob.application_deadline)}</span>
                    </div>
                  )}
                  {selectedJob.application_form_url && (
                    <div>
                      <a
                        href={selectedJob.application_form_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline text-sm"
                      >
                        Application Form Link
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Current Status:</span>
                {selectedJob.is_active ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Inactive</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { placementOfficerAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  IndianRupee,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';

export default function CreateJobRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [regions, setRegions] = useState([]);

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
    target_type: 'college', // Defaults to own college
    target_regions: [],
    application_form_url: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchJobRequests(), fetchRegions()]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobRequests = async () => {
    try {
      const response = await placementOfficerAPI.getMyJobRequests();
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to load job requests:', error);
      toast.error('Failed to load your job requests');
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

  const handleCreateRequest = () => {
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
      target_type: 'college',
      target_regions: [],
      application_form_url: '',
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.company_name || !formData.description ||
        !formData.application_form_url || !formData.application_deadline) {
      toast.error('Please fill all required fields (title, company, description, form URL, deadline)');
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

    try {
      // Map frontend field names to backend expected names
      const submitData = {
        job_title: formData.title,
        company_name: formData.company_name,
        job_description: formData.description,
        job_type: formData.job_type,
        location: formData.location,
        salary_range: formData.salary_package,
        application_deadline: formData.application_deadline,
        application_form_url: formData.application_form_url,
        min_cgpa: formData.min_cgpa || null,
        max_backlogs: formData.max_backlogs || null,
        allowed_branches: formData.allowed_branches, // Send as array, backend will stringify
        target_type: formData.target_type,
        target_regions: formData.target_type === 'region' ? formData.target_regions : null, // Send as array
        target_colleges: formData.target_type === 'college' ? [] : null,
      };

      await placementOfficerAPI.createJobRequest(submitData);
      toast.success('Job request submitted successfully! Waiting for Super Admin approval.');
      setShowCreateModal(false);
      fetchJobRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit job request');
    }
  };

  const handleBranchToggle = (branch) => {
    const newBranches = formData.allowed_branches.includes(branch)
      ? formData.allowed_branches.filter((b) => b !== branch)
      : [...formData.allowed_branches, branch];
    setFormData({ ...formData, allowed_branches: newBranches });
  };

  const handleRegionToggle = (regionId) => {
    const newRegions = formData.target_regions.includes(regionId)
      ? formData.target_regions.filter((r) => r !== regionId)
      : [...formData.target_regions, regionId];
    setFormData({ ...formData, target_regions: newRegions });
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
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

  const getStatusBadge = (status, jobDeleted = false) => {
    if (status === 'approved' && jobDeleted) {
      return (
        <span className="badge bg-gray-100 text-gray-800 flex items-center space-x-1">
          <span>Approved - Job Deleted</span>
        </span>
      );
    }

    const badges = {
      pending: <span className="badge badge-warning">Pending Approval</span>,
      approved: <span className="badge badge-success">Approved</span>,
      rejected: <span className="badge badge-danger">Rejected</span>,
    };
    return badges[status] || <span className="badge badge-secondary">{status}</span>;
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Requests</h1>
          <p className="text-gray-600 mt-2">
            Submit job postings for Super Admin approval
          </p>
        </div>
        <button
          onClick={handleCreateRequest}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Job Request</span>
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">How it works</h4>
            <p className="text-sm text-blue-800">
              Job requests you create here will be sent to the Super Admin for review and approval.
              Once approved, the job posting will be visible to eligible students. You will be notified
              when your request is approved or rejected.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{requests.length}</p>
            </div>
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
              <FileText size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {requests.filter((r) => r.status === 'pending').length}
              </p>
            </div>
            <div className="p-4 rounded-full bg-yellow-100 text-yellow-600">
              <Clock size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {requests.filter((r) => r.status === 'approved').length}
              </p>
            </div>
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-8">
                    No job requests yet. Create your first job request to get started.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="font-semibold">{request.job_title}</td>
                    <td>{request.company_name}</td>
                    <td className="text-sm text-gray-600">{request.location || 'N/A'}</td>
                    <td className="font-semibold text-green-600">
                      {request.salary_range ? `₹${request.salary_range} LPA` : 'Not specified'}
                    </td>
                    <td className="text-sm">{formatDate(request.application_deadline)}</td>
                    <td>{getStatusBadge(request.status, request.job_deleted)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Job Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold">Create Job Request</h2>
              <p className="text-sm text-gray-600 mt-1">
                Submit a job posting for Super Admin approval
              </p>
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
                        value="college"
                        checked={formData.target_type === 'college'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value })
                        }
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>My College Only</span>
                    </label>
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
                      <span>Specific Regions</span>
                    </label>
                  </div>
                </div>

                {formData.target_type === 'region' && (
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
                                onChange={() => handleRegionToggle(region.id)}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm">{region.region_name || region.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.target_type === 'college' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      This job will only be visible to students from your college.
                    </p>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" className="btn btn-primary flex-1">
                  Submit Job Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedRequest.job_title}</h2>
                <div className="mt-2">{getStatusBadge(selectedRequest.status, selectedRequest.job_deleted)}</div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
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
                  <h3 className="font-semibold text-lg">{selectedRequest.company_name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                    {selectedRequest.location && (
                      <div className="flex items-center space-x-1">
                        <span>📍 {selectedRequest.location}</span>
                      </div>
                    )}
                    {selectedRequest.salary_range && (
                      <div className="flex items-center space-x-1">
                        <IndianRupee size={16} />
                        <span>₹{selectedRequest.salary_range} LPA</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock size={16} />
                      <span>{selectedRequest.job_type}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.job_description}</p>
              </div>

              {/* Eligibility */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Eligibility Criteria</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  {selectedRequest.min_cgpa && (
                    <div>
                      <span className="text-sm text-gray-600">Minimum CGPA:</span>
                      <p className="font-semibold">{selectedRequest.min_cgpa}</p>
                    </div>
                  )}
                  {selectedRequest.max_backlogs !== null && selectedRequest.max_backlogs !== undefined && (
                    <div>
                      <span className="text-sm text-gray-600">Max Backlogs:</span>
                      <p className="font-semibold">{selectedRequest.max_backlogs}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Allowed Branches */}
              {selectedRequest.allowed_branches && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Allowed Branches</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const branches = Array.isArray(selectedRequest.allowed_branches)
                          ? selectedRequest.allowed_branches
                          : JSON.parse(selectedRequest.allowed_branches);
                        return branches.map((branch) => (
                          <span key={branch} className="badge badge-info">
                            {branch}
                          </span>
                        ));
                      } catch (error) {
                        console.error('Failed to parse allowed_branches:', error);
                        return <span className="text-sm text-gray-500">N/A</span>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Application Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Application Details</h3>
                <div className="space-y-2">
                  {selectedRequest.application_deadline && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="text-gray-600">Deadline:</span>
                      <span className="font-semibold">{formatDate(selectedRequest.application_deadline)}</span>
                    </div>
                  )}
                  {selectedRequest.application_form_url && (
                    <div>
                      <a
                        href={selectedRequest.application_form_url}
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

              {/* Review Comments (if rejected) */}
              {selectedRequest.review_comment && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Review Comments</h3>
                  <p className="text-sm text-red-800">{selectedRequest.review_comment}</p>
                </div>
              )}

              {/* Job Deleted Notice (if approved but job deleted) */}
              {selectedRequest.status === 'approved' && selectedRequest.job_deleted && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">⚠️ Job Deleted</h3>
                  <p className="text-sm text-gray-700">
                    This job request was approved, but the corresponding job has been deleted by the Super Admin.
                    Students can no longer view or apply to this job.
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

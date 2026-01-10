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
  Briefcase,
  Star,
  Info,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';

export default function CreateJobRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [regions, setRegions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    // Extended requirements
    requires_academic_extended: false,
    requires_physical_details: false,
    requires_family_details: false,
    requires_personal_details: false,
    requires_document_verification: false,
    requires_education_preferences: false,
    specific_field_requirements: {},
    custom_fields: [],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchJobRequests(), fetchRegions(), fetchTemplates()]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await placementOfficerAPI.getRequirementTemplates();
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
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
    setSelectedTemplate('');
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
      requires_academic_extended: false,
      requires_physical_details: false,
      requires_family_details: false,
      requires_personal_details: false,
      requires_document_verification: false,
      requires_education_preferences: false,
      specific_field_requirements: {},
      custom_fields: [],
    });
    setShowCreateModal(true);
  };

  const handleApplyTemplate = (templateId) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    const template = templates.find((t) => t.id === parseInt(templateId));
    if (template) {
      setFormData((prev) => ({
        ...prev,
        min_cgpa: template.min_cgpa || '',
        max_backlogs: template.max_backlogs ?? '',
        allowed_branches: template.allowed_branches
          ? typeof template.allowed_branches === 'string'
            ? JSON.parse(template.allowed_branches)
            : template.allowed_branches
          : [],
        requires_academic_extended: template.requires_academic_extended || false,
        requires_physical_details: template.requires_physical_details || false,
        requires_family_details: template.requires_family_details || false,
        requires_personal_details: template.requires_personal_details || false,
        requires_document_verification: template.requires_document_verification || false,
        requires_education_preferences: template.requires_education_preferences || false,
        specific_field_requirements: template.specific_field_requirements
          ? typeof template.specific_field_requirements === 'string'
            ? JSON.parse(template.specific_field_requirements)
            : template.specific_field_requirements
          : {},
        custom_fields: template.custom_fields
          ? typeof template.custom_fields === 'string'
            ? JSON.parse(template.custom_fields)
            : template.custom_fields
          : [],
      }));
      setSelectedTemplate(templateId);
      toast.success('Template applied successfully!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.company_name || !formData.description ||
        !formData.application_deadline) {
      toast.error('Please fill all required fields (title, company, description, deadline)');
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

      const response = await placementOfficerAPI.createJobRequest(submitData);
      const jobRequestId = response.data.data.id;

      // Save requirements if any are specified
      const hasRequirements =
        formData.requires_academic_extended ||
        formData.requires_physical_details ||
        formData.requires_family_details ||
        formData.requires_personal_details ||
        formData.requires_document_verification ||
        formData.requires_education_preferences ||
        Object.keys(formData.specific_field_requirements).length > 0 ||
        formData.custom_fields.length > 0;

      if (hasRequirements) {
        try {
          const requirementsData = {
            min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : null,
            max_backlogs: formData.max_backlogs !== '' ? parseInt(formData.max_backlogs) : null,
            allowed_branches: formData.allowed_branches,
            requires_academic_extended: formData.requires_academic_extended,
            requires_physical_details: formData.requires_physical_details,
            requires_family_details: formData.requires_family_details,
            requires_personal_details: formData.requires_personal_details,
            requires_document_verification: formData.requires_document_verification,
            requires_education_preferences: formData.requires_education_preferences,
            specific_field_requirements: formData.specific_field_requirements,
            custom_fields: formData.custom_fields,
          };

          await placementOfficerAPI.createJobRequestRequirements(jobRequestId, requirementsData);
          toast.success('Job request and requirements submitted successfully! Waiting for Super Admin approval.');
        } catch (error) {
          console.error('Failed to save requirements:', error);
          toast.error('Job created but failed to save requirements');
        }
      } else {
        toast.success('Job request submitted successfully! Waiting for Super Admin approval.');
      }

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

  const handleSpecificFieldChange = (fieldName, key, value) => {
    setFormData((prev) => ({
      ...prev,
      specific_field_requirements: {
        ...prev.specific_field_requirements,
        [fieldName]: {
          ...prev.specific_field_requirements[fieldName],
          [key]: value,
        },
      },
    }));
  };

  const handleAddCustomField = (newField) => {
    if (!newField.field_name || !newField.field_label) {
      toast.error('Please fill field name and label');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { ...newField }],
    }));
  };

  const handleRemoveCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));
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
        <span className="w-fit bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-xl border-2 border-gray-200 flex items-center justify-center space-x-1">
          <span>Approved - Job Deleted</span>
        </span>
      );
    }

    const badges = {
      pending: <span className="w-fit bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-xl border-2 border-yellow-200 flex items-center justify-center space-x-1"><Clock size={16} /><span>Pending Approval</span></span>,
      approved: <span className="w-fit bg-green-100 text-green-800 font-bold px-4 py-2 rounded-xl border-2 border-green-200 flex items-center justify-center space-x-1"><CheckCircle size={16} /><span>Approved</span></span>,
      rejected: <span className="w-fit bg-red-100 text-red-800 font-bold px-4 py-2 rounded-xl border-2 border-red-200 flex items-center justify-center space-x-1"><XCircle size={16} /><span>Rejected</span></span>,
    };
    return badges[status] || <span className="w-fit bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-xl border-2 border-gray-200 flex items-center justify-center">{status}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading job requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <DashboardHeader
          icon={Briefcase}
          title="Job Requests"
          subtitle="Submit job postings for Super Admin approval"
        />
        <button
          onClick={handleCreateRequest}
          className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Job Request</span>
        </button>
      </div>

      {/* Info Alert */}
      <GlassCard variant="elevated" className="p-6 mb-8 border-l-4 border-blue-500">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
            <AlertCircle className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-xl mb-2">How it works</h3>
            <p className="text-gray-700 font-medium">
              Job requests you create here will be sent to the Super Admin for review and approval.
              Once approved, the job posting will be visible to eligible students. You will be notified
              when your request is approved or rejected.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <GlassCard variant="elevated" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-bold mb-2">Total Requests</p>
              <p className="text-4xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
              <FileText className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="elevated" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-bold mb-2">Pending</p>
              <p className="text-4xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === 'pending').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-4 shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>
        <GlassCard variant="elevated" className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-bold mb-2">Approved</p>
              <p className="text-4xl font-bold text-green-600">
                {requests.filter((r) => r.status === 'approved').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Requests Table */}
      <GlassCard variant="elevated" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Job Title</th>
                <th className="px-6 py-4 text-left font-bold">Company</th>
                <th className="px-6 py-4 text-left font-bold">Location</th>
                <th className="px-6 py-4 text-left font-bold">Salary</th>
                <th className="px-6 py-4 text-left font-bold">Deadline</th>
                <th className="px-6 py-4 text-left font-bold">Status</th>
                <th className="px-6 py-4 text-left font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-12">
                    <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="font-bold text-lg">No job requests yet</p>
                    <p className="text-sm mt-2">Create your first job request to get started</p>
                  </td>
                </tr>
              ) : (
                requests.map((request, index) => (
                  <tr key={request.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 font-bold text-gray-900">{request.job_title}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{request.company_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{request.location || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      {request.salary_range ? `₹${request.salary_range} LPA` : 'Not specified'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{formatDate(request.application_deadline)}</td>
                    <td className="px-6 py-4">{getStatusBadge(request.status, request.job_deleted)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all transform hover:scale-110"
                        title="View Details"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Create Job Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-8 py-6 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
                  <Plus className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Create Job Request</h2>
                  <p className="text-sm text-gray-600 mt-1 font-medium">
                    Submit a job posting for Super Admin approval
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Template Selection */}
              {templates.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Star className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Quick Start: Apply Template</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Save time by using a pre-configured template for common companies
                  </p>
                  <div className="flex space-x-3">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a template...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.template_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Job Title <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Company Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Job Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the job role, responsibilities, and requirements..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Mumbai, India"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Salary Package</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.salary_package}
                      onChange={(e) =>
                        setFormData({ ...formData, salary_package: e.target.value })
                      }
                      placeholder="e.g., 12-15 LPA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Job Type</label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.job_type}
                      onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Application Deadline <span className="text-red-600">*</span></label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.application_deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, application_deadline: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Google Form URL</label>
                    <input
                      type="url"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.application_form_url}
                      onChange={(e) =>
                        setFormData({ ...formData, application_form_url: e.target.value })
                      }
                      placeholder="https://forms.google.com/... (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3">
                  Eligibility Criteria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Minimum CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.min_cgpa}
                      onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                      placeholder="e.g., 7.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Maximum Backlogs Allowed</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.max_backlogs}
                      onChange={(e) => setFormData({ ...formData, max_backlogs: e.target.value })}
                      placeholder="e.g., 0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Allowed Branches <span className="text-red-600">*</span>
                  </label>
                  <div className="border-2 border-gray-300 rounded-xl p-5 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
                        <label key={branch} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.allowed_branches.includes(branch)}
                            onChange={() => handleBranchToggle(branch)}
                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{branch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3">
                  Target Audience
                </h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Target Type</label>
                  <div className="flex space-x-5">
                    <label className="flex items-center space-x-3 cursor-pointer p-4 border-2 border-gray-300 rounded-xl hover:border-blue-500 transition-colors">
                      <input
                        type="radio"
                        name="target_type"
                        value="college"
                        checked={formData.target_type === 'college'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value })
                        }
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900">My College Only</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer p-4 border-2 border-gray-300 rounded-xl hover:border-blue-500 transition-colors">
                      <input
                        type="radio"
                        name="target_type"
                        value="region"
                        checked={formData.target_type === 'region'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value })
                        }
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900">Specific Regions</span>
                    </label>
                  </div>
                </div>

                {formData.target_type === 'region' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Select Regions <span className="text-red-600">*</span>
                    </label>
                    <div className="border-2 border-gray-300 rounded-xl p-5 max-h-48 overflow-y-auto bg-gray-50">
                      {regions.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          <p className="font-medium">Loading regions...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {regions.map((region) => (
                            <label
                              key={region.id}
                              className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.target_regions.includes(region.id)}
                                onChange={() => handleRegionToggle(region.id)}
                                className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">{region.region_name || region.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.target_type === 'college' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                    <p className="text-sm text-blue-800 font-medium">
                      This job will only be visible to students from your college.
                    </p>
                  </div>
                )}
              </div>

              {/* Extended Profile Requirements */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Extended Profile Requirements</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Info size={16} />
                    <span>Select sections students must complete</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_academic_extended}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_academic_extended: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Academic Extended</div>
                      <div className="text-sm text-gray-600">SSLC and 12th marks, year, board</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_physical_details}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_physical_details: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Physical Details</div>
                      <div className="text-sm text-gray-600">Height, weight, disability status</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_family_details}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_family_details: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Family Details</div>
                      <div className="text-sm text-gray-600">Parents' names, occupation, income, siblings</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_personal_details}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_personal_details: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Personal Details</div>
                      <div className="text-sm text-gray-600">District, address, interests</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_document_verification}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_document_verification: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Document Verification</div>
                      <div className="text-sm text-gray-600">PAN, Aadhar, Passport details</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.requires_education_preferences}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_education_preferences: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-800">Education Preferences</div>
                      <div className="text-sm text-gray-600">Interest in B.Tech, M.Tech, study mode</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Advanced Configuration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-800">Advanced Configuration</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-600">{showAdvanced ? 'Hide' : 'Show'}</span>
                    {showAdvanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {showAdvanced && <AdvancedConfigSection
                  formData={formData}
                  handleSpecificFieldChange={handleSpecificFieldChange}
                  handleAddCustomField={handleAddCustomField}
                  handleRemoveCustomField={handleRemoveCustomField}
                />}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Submit Job Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Job Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-8 py-6 rounded-t-3xl flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedRequest.job_title}</h2>
                <div className="mt-3">{getStatusBadge(selectedRequest.status, selectedRequest.job_deleted)}</div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Company Info */}
              <div className="flex items-start space-x-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
                <Building2 className="text-blue-600 mt-1" size={28} />
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-900">{selectedRequest.company_name}</h3>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-700 font-medium">
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
                <h3 className="font-bold text-gray-900 text-lg mb-3">Job Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap font-medium leading-relaxed">{selectedRequest.job_description}</p>
              </div>

              {/* Eligibility */}
              {(selectedRequest.min_cgpa || selectedRequest.max_backlogs !== null) && (
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Eligibility Criteria</h3>
                  <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100">
                    {selectedRequest.min_cgpa && (
                      <div>
                        <span className="text-sm text-gray-600 font-bold">Minimum CGPA:</span>
                        <p className="font-bold text-lg text-gray-900">{selectedRequest.min_cgpa}</p>
                      </div>
                    )}
                    {selectedRequest.max_backlogs !== null && selectedRequest.max_backlogs !== undefined && (
                      <div>
                        <span className="text-sm text-gray-600 font-bold">Max Backlogs:</span>
                        <p className="font-bold text-lg text-gray-900">{selectedRequest.max_backlogs}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Allowed Branches */}
              {selectedRequest.allowed_branches && (
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Allowed Branches</h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const branches = Array.isArray(selectedRequest.allowed_branches)
                          ? selectedRequest.allowed_branches
                          : JSON.parse(selectedRequest.allowed_branches);
                        return branches.map((branch) => (
                          <span key={branch} className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-xl border-2 border-blue-200 text-sm">
                            {branch}
                          </span>
                        ));
                      } catch (error) {
                        console.error('Failed to parse allowed_branches:', error);
                        return <span className="text-sm text-gray-500 font-medium">N/A</span>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Application Info */}
              {(selectedRequest.application_deadline || selectedRequest.application_form_url) && (
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Application Details</h3>
                  <div className="space-y-3">
                    {selectedRequest.application_deadline && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar size={18} className="text-gray-500" />
                        <span className="text-gray-600 font-bold">Deadline:</span>
                        <span className="font-bold text-gray-900">{formatDate(selectedRequest.application_deadline)}</span>
                      </div>
                    )}
                    {selectedRequest.application_form_url && (
                      <div>
                        <a
                          href={selectedRequest.application_form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-bold hover:underline"
                        >
                          Application Form Link →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Comments (if rejected) */}
              {selectedRequest.review_comment && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                  <h3 className="font-bold text-red-900 text-lg mb-2">Review Comments</h3>
                  <p className="text-sm text-red-800 font-medium">{selectedRequest.review_comment}</p>
                </div>
              )}

              {/* Job Deleted Notice (if approved but job deleted) */}
              {selectedRequest.status === 'approved' && selectedRequest.job_deleted && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">⚠️ Job Deleted</h3>
                  <p className="text-sm text-gray-700 font-medium">
                    This job request was approved, but the corresponding job has been deleted by the Super Admin.
                    Students can no longer view or apply to this job.
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 px-8 py-6 rounded-b-3xl">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// Advanced Configuration Section Component (reusable)
function AdvancedConfigSection({
  formData,
  handleSpecificFieldChange,
  handleAddCustomField,
  handleRemoveCustomField,
}) {
  const [newCustomField, setNewCustomField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    required: true,
    options: [],
  });

  return (
    <div className="mt-4 space-y-6">
      {/* Specific Field Requirements */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3">Specific Field Requirements</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Height (cm)
              </label>
              <input
                type="number"
                step="1"
                value={formData.specific_field_requirements.height_cm?.min || ''}
                onChange={(e) => handleSpecificFieldChange('height_cm', 'min', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="155"
                min="0"
                max="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.specific_field_requirements.weight_kg?.min || ''}
                onChange={(e) => handleSpecificFieldChange('weight_kg', 'min', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="45"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum SSLC % (10th)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specific_field_requirements.sslc_marks?.min || ''}
                onChange={(e) => handleSpecificFieldChange('sslc_marks', 'min', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="60"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum 12th % (+2)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.specific_field_requirements.twelfth_marks?.min || ''}
                onChange={(e) => handleSpecificFieldChange('twelfth_marks', 'min', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="60"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3">Custom Company-Specific Fields</h4>

        {/* Existing Custom Fields */}
        {formData.custom_fields.length > 0 && (
          <div className="mb-4 space-y-2">
            {formData.custom_fields.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800">{field.field_label}</div>
                  <div className="text-sm text-gray-600">
                    Type: {field.field_type} | {field.required ? 'Required' : 'Optional'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Custom Field */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name (for database)
              </label>
              <input
                type="text"
                value={newCustomField.field_name}
                onChange={(e) =>
                  setNewCustomField({ ...newCustomField, field_name: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="sitttr_applied"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Label (shown to students)
              </label>
              <input
                type="text"
                value={newCustomField.field_label}
                onChange={(e) =>
                  setNewCustomField({ ...newCustomField, field_label: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                placeholder="Have you applied for SITTTR?"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
              <select
                value={newCustomField.field_type}
                onChange={(e) =>
                  setNewCustomField({ ...newCustomField, field_type: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Yes/No</option>
                <option value="select">Dropdown</option>
                <option value="textarea">Long Text</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCustomField.required}
                  onChange={(e) =>
                    setNewCustomField({ ...newCustomField, required: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Required Field</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleAddCustomField(newCustomField);
              setNewCustomField({
                field_name: '',
                field_label: '',
                field_type: 'text',
                required: true,
                options: [],
              });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={18} />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>
    </div>
  );
}

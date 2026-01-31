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
  Zap,
  MapPin,
  Users,
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
  // New state for college selection
  const [collegesByRegion, setCollegesByRegion] = useState({}); // { regionId: [colleges] }
  const [loadingColleges, setLoadingColleges] = useState({});
  const [expandedRegions, setExpandedRegions] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    description: '',
    location: '',
    salary_package: '',
    no_of_vacancies: '',
    application_deadline: '',
    min_cgpa: '',
    max_backlogs: '',
    allowed_branches: [],
    target_type: 'college', // Defaults to own college (auto-approved)
    target_regions: [],
    target_colleges: [], // New: specific colleges within regions
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
      no_of_vacancies: '',
      application_deadline: '',
      min_cgpa: '',
      max_backlogs: '',
      allowed_branches: [],
      target_type: 'college',
      target_regions: [],
      target_colleges: [],
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
    setExpandedRegions({});
    setShowCreateModal(true);
  };

  // Fetch colleges for a specific region
  const fetchCollegesForRegion = async (regionId) => {
    if (collegesByRegion[regionId]) return; // Already loaded

    setLoadingColleges(prev => ({ ...prev, [regionId]: true }));
    try {
      const response = await commonAPI.getColleges(regionId);
      setCollegesByRegion(prev => ({
        ...prev,
        [regionId]: response.data.data || []
      }));
    } catch (error) {
      console.error(`Failed to load colleges for region ${regionId}:`, error);
      toast.error('Failed to load colleges');
    } finally {
      setLoadingColleges(prev => ({ ...prev, [regionId]: false }));
    }
  };

  // Toggle region expansion and load colleges
  const handleRegionExpand = async (regionId) => {
    const isExpanding = !expandedRegions[regionId];
    setExpandedRegions(prev => ({
      ...prev,
      [regionId]: isExpanding
    }));

    if (isExpanding && !collegesByRegion[regionId]) {
      await fetchCollegesForRegion(regionId);
    }
  };

  // Handle college selection toggle
  const handleCollegeToggle = (collegeId, regionId) => {
    const newColleges = formData.target_colleges.includes(collegeId)
      ? formData.target_colleges.filter((c) => c !== collegeId)
      : [...formData.target_colleges, collegeId];

    // Also ensure region is selected if any college from it is selected
    const regionColleges = collegesByRegion[regionId] || [];
    const hasCollegesFromRegion = newColleges.some(cId =>
      regionColleges.some(c => c.id === cId)
    );

    let newRegions = [...formData.target_regions];
    if (hasCollegesFromRegion && !newRegions.includes(regionId)) {
      newRegions.push(regionId);
    } else if (!hasCollegesFromRegion && newRegions.includes(regionId)) {
      // Check if we should keep region for "all colleges in region" scenario
      // Only remove if no colleges are selected from this region
      // Actually, let's keep regions separate - user explicitly selects regions
    }

    setFormData({ ...formData, target_colleges: newColleges });
  };

  // Select/deselect all colleges in a region
  const handleSelectAllCollegesInRegion = (regionId, selectAll) => {
    const regionColleges = collegesByRegion[regionId] || [];
    const regionCollegeIds = regionColleges.map(c => c.id);

    let newColleges;
    if (selectAll) {
      // Add all colleges from this region
      newColleges = [...new Set([...formData.target_colleges, ...regionCollegeIds])];
    } else {
      // Remove all colleges from this region
      newColleges = formData.target_colleges.filter(cId => !regionCollegeIds.includes(cId));
    }

    setFormData({ ...formData, target_colleges: newColleges });
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

    // Validate region/college selection for multi-college jobs
    if (formData.target_type === 'region' || formData.target_type === 'specific_colleges') {
      if (formData.target_colleges.length === 0 && formData.target_regions.length === 0) {
        toast.error('Please select at least one region or specific colleges');
        return;
      }
    }

    try {
      // Determine if this is own college only (auto-approved)
      const isOwnCollegeOnly = formData.target_type === 'college';

      // Map frontend field names to backend expected names
      const submitData = {
        job_title: formData.title,
        company_name: formData.company_name,
        job_description: formData.description,
        no_of_vacancies: formData.no_of_vacancies || null,
        location: formData.location,
        salary_range: formData.salary_package,
        application_deadline: formData.application_deadline,
        application_form_url: formData.application_form_url,
        min_cgpa: formData.min_cgpa || null,
        max_backlogs: formData.max_backlogs || null,
        allowed_branches: formData.allowed_branches,
        target_type: formData.target_type,
        // For region/specific_colleges, send both regions and specific colleges
        target_regions: (formData.target_type === 'region' || formData.target_type === 'specific_colleges')
          ? formData.target_regions
          : null,
        target_colleges: (formData.target_type === 'region' || formData.target_type === 'specific_colleges')
          ? formData.target_colleges
          : null,
        // Include extended requirements for auto-approval
        requires_academic_extended: formData.requires_academic_extended,
        requires_physical_details: formData.requires_physical_details,
        requires_family_details: formData.requires_family_details,
        requires_personal_details: formData.requires_personal_details,
        requires_document_verification: formData.requires_document_verification,
        requires_education_preferences: formData.requires_education_preferences,
        specific_field_requirements: formData.specific_field_requirements,
        custom_fields: formData.custom_fields,
      };

      const response = await placementOfficerAPI.createJobRequest(submitData);
      const jobRequestId = response.data.data.id;
      const isAutoApproved = response.data.auto_approved;

      if (isAutoApproved) {
        // Job was auto-approved (own college only)
        toast.success(
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-500" size={20} />
            <span>Job created and published instantly for your college students!</span>
          </div>,
          { duration: 5000 }
        );
      } else {
        // Standard flow - requires approval
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
          } catch (error) {
            console.error('Failed to save requirements:', error);
          }
        }
        toast.success('Job request submitted! Awaiting Super Admin approval for multi-college visibility.');
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status, jobDeleted = false) => {
    if ((status === 'approved' || status === 'auto_approved') && jobDeleted) {
      return (
        <span className="w-fit bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-xl border-2 border-gray-200 flex items-center justify-center space-x-1">
          <span>Job Deleted</span>
        </span>
      );
    }

    const badges = {
      pending: <span className="w-fit bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-xl border-2 border-yellow-200 flex items-center justify-center space-x-1"><Clock size={16} /><span>Pending Approval</span></span>,
      approved: <span className="w-fit bg-green-100 text-green-800 font-bold px-4 py-2 rounded-xl border-2 border-green-200 flex items-center justify-center space-x-1"><CheckCircle size={16} /><span>Approved</span></span>,
      auto_approved: <span className="w-fit bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-xl border-2 border-emerald-200 flex items-center justify-center space-x-1"><Zap size={16} /><span>Auto-Approved</span></span>,
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
            <div className="space-y-2">
              <p className="text-gray-700 font-medium flex items-center gap-2">
                <Zap className="text-green-500" size={16} />
                <strong>My College Only:</strong> Jobs are instantly published without approval (Super Admin is notified)
              </p>
              <p className="text-gray-700 font-medium flex items-center gap-2">
                <Clock className="text-yellow-500" size={16} />
                <strong>Multiple Colleges:</strong> Jobs require Super Admin approval before becoming visible
              </p>
            </div>
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
              <p className="text-gray-600 text-sm font-bold mb-2">Approved / Published</p>
              <p className="text-4xl font-bold text-green-600">
                {requests.filter((r) => r.status === 'approved' || r.status === 'auto_approved').length}
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">No. of Vacancies</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                      value={formData.no_of_vacancies}
                      onChange={(e) => setFormData({ ...formData, no_of_vacancies: e.target.value })}
                      placeholder="e.g., 10"
                    />
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
                  <div className="flex flex-wrap gap-3">
                    <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-xl transition-all ${
                      formData.target_type === 'college'
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}>
                      <input
                        type="radio"
                        name="target_type"
                        value="college"
                        checked={formData.target_type === 'college'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value, target_regions: [], target_colleges: [] })
                        }
                        className="w-5 h-5 text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          My College Only
                          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap size={12} /> Instant
                          </span>
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Auto-approved, no wait time</p>
                      </div>
                    </label>
                    <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-xl transition-all ${
                      formData.target_type === 'region' || formData.target_type === 'specific_colleges'
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}>
                      <input
                        type="radio"
                        name="target_type"
                        value="region"
                        checked={formData.target_type === 'region' || formData.target_type === 'specific_colleges'}
                        onChange={(e) =>
                          setFormData({ ...formData, target_type: e.target.value, target_colleges: [] })
                        }
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          Multiple Colleges
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock size={12} /> Approval Required
                          </span>
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Select specific colleges from any region</p>
                      </div>
                    </label>
                  </div>
                </div>

                {(formData.target_type === 'region' || formData.target_type === 'specific_colleges') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Select Regions & Colleges <span className="text-red-600">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Expand a region to select specific colleges, or leave all colleges unselected to target the entire region.
                    </p>
                    <div className="border-2 border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                      {regions.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          <p className="font-medium">Loading regions...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {regions.map((region) => {
                            const regionColleges = collegesByRegion[region.id] || [];
                            const selectedCollegesInRegion = formData.target_colleges.filter(cId =>
                              regionColleges.some(c => c.id === cId)
                            );
                            const allCollegesSelected = regionColleges.length > 0 &&
                              selectedCollegesInRegion.length === regionColleges.length;
                            const someCollegesSelected = selectedCollegesInRegion.length > 0;

                            return (
                              <div key={region.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                                {/* Region Header */}
                                <div
                                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                    someCollegesSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleRegionExpand(region.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    {expandedRegions[region.id] ? (
                                      <ChevronDown size={20} className="text-gray-500" />
                                    ) : (
                                      <ChevronRight size={20} className="text-gray-500" />
                                    )}
                                    <MapPin size={16} className="text-blue-600" />
                                    <span className="font-medium text-gray-900">
                                      {region.region_name || region.name}
                                    </span>
                                    {someCollegesSelected && (
                                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                        {selectedCollegesInRegion.length} college{selectedCollegesInRegion.length !== 1 ? 's' : ''} selected
                                      </span>
                                    )}
                                  </div>
                                  {expandedRegions[region.id] && regionColleges.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectAllCollegesInRegion(region.id, !allCollegesSelected);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {allCollegesSelected ? 'Deselect All' : 'Select All'}
                                    </button>
                                  )}
                                </div>

                                {/* Colleges List (Expanded) */}
                                {expandedRegions[region.id] && (
                                  <div className="border-t border-gray-200 p-3 bg-gray-50">
                                    {loadingColleges[region.id] ? (
                                      <div className="text-center py-3 text-gray-500">
                                        <div className="spinner-small mx-auto mb-2"></div>
                                        Loading colleges...
                                      </div>
                                    ) : regionColleges.length === 0 ? (
                                      <p className="text-gray-500 text-sm py-2">No colleges found in this region</p>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                        {regionColleges.map((college) => (
                                          <label
                                            key={college.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                              formData.target_colleges.includes(college.id)
                                                ? 'bg-blue-100 border border-blue-300'
                                                : 'hover:bg-white border border-transparent'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={formData.target_colleges.includes(college.id)}
                                              onChange={() => handleCollegeToggle(college.id, region.id)}
                                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                {college.college_name}
                                              </p>
                                              {college.college_code && (
                                                <p className="text-xs text-gray-500">{college.college_code}</p>
                                              )}
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {formData.target_colleges.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-800">
                          Selected: {formData.target_colleges.length} college{formData.target_colleges.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {formData.target_type === 'college' && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Zap className="text-green-600 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm text-green-800 font-bold mb-1">
                          Instant Publishing
                        </p>
                        <p className="text-sm text-green-700">
                          This job will be immediately visible to students from your college.
                          No approval needed! Super Admin will be notified of the posting.
                        </p>
                      </div>
                    </div>
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
                    {selectedRequest.no_of_vacancies && (
                      <div className="flex items-center space-x-1">
                        <Users size={16} />
                        <span>{selectedRequest.no_of_vacancies} Vacancies</span>
                      </div>
                    )}
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

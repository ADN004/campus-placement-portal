import { useState, useEffect } from 'react';
import { placementOfficerAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import usePortalMode from '../../hooks/usePortalMode';
import { SecondaryButton } from '../../components/officer/OfficerUI';
import DesktopCreateJobRequest from './jobRequest/DesktopCreateJobRequest';
import TabletCreateJobRequest from './jobRequest/TabletCreateJobRequest';
import MobileCreateJobRequest from './jobRequest/MobileCreateJobRequest';
import JobRequestForm from './jobRequest/JobRequestForm';
import { CreateRequestModal, RequestDetailsModal } from './jobRequest/JobRequestModals';
import {
  DesktopJobRequestSkeleton,
  TabletJobRequestSkeleton,
  MobileJobRequestSkeleton,
} from './jobRequest/JobRequestSkeleton';

/** The six extended-profile sections a request can demand. */
const EXTENDED_SECTIONS = [
  { key: 'requires_academic_extended', label: 'Extended academic details' },
  { key: 'requires_physical_details', label: 'Physical details' },
  { key: 'requires_family_details', label: 'Family details' },
  { key: 'requires_personal_details', label: 'Personal details' },
  { key: 'requires_document_verification', label: 'Document verification' },
  { key: 'requires_education_preferences', label: 'Education preferences' },
];

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

  const showSkeleton = useSkeletonLoading(loading);
  const portalMode = usePortalMode();

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
    backlog_policy: 'no_restriction',
    allowed_backlog_semesters: [],
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
      backlog_policy: 'no_restriction',
      allowed_backlog_semesters: [],
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
        max_backlogs: template.max_backlogs !== null && template.max_backlogs !== undefined ? String(template.max_backlogs) : '',
        backlog_policy: template.max_backlogs === null || template.max_backlogs === undefined ? 'no_restriction' : template.max_backlogs === 0 ? 'no_backlogs' : 'limited',
        allowed_backlog_semesters: Array.isArray(template.allowed_backlog_semesters) ? template.allowed_backlog_semesters.map(Number) : [],
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

    // A deadline in the past creates a job no student can ever see: the student
    // job list only returns rows with application_deadline >= CURRENT_DATE. The
    // officer would get a success message for a job that is invisible to
    // everyone, with nothing on screen to explain why.
    const deadline = new Date(`${formData.application_deadline}T23:59:59`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(deadline.getTime()) || deadline < today) {
      toast.error('The application deadline must be today or later — students cannot see a job whose deadline has passed');
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
        max_backlogs: formData.max_backlogs !== '' ? parseInt(formData.max_backlogs) : null,
        allowed_backlog_semesters: formData.allowed_backlog_semesters || [],
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
              allowed_backlog_semesters: formData.allowed_backlog_semesters || [],
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
            // This call is the ONLY thing that stores requirements for a
            // multi-college request — createJobRequest saves them server-side
            // only on the own-college path. Swallowing the failure and then
            // reporting success meant the request reached the Super Admin with
            // no requirements at all, and students could apply without the
            // profile sections the officer asked for. Say so instead.
            console.error('Failed to save requirements:', error);
            toast.error(
              'Job request was created, but its extended requirements could not be saved. Open the request and add them again before it is approved.',
              { duration: 9000 }
            );
            setShowCreateModal(false);
            fetchJobRequests();
            return;
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

  const deviceType = useDeviceType();

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileJobRequestSkeleton />;
    if (deviceType === 'tablet') return <TabletJobRequestSkeleton />;
    return <DesktopJobRequestSkeleton />;
  }

  const presenterProps = {
    requests,
    onCreate: handleCreateRequest,
    onViewRequest: handleViewDetails,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileCreateJobRequest {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletCreateJobRequest {...presenterProps} />
      ) : (
        <DesktopCreateJobRequest {...presenterProps} />
      )}

      {showCreateModal && (
        <CreateRequestModal onClose={() => setShowCreateModal(false)}>
          <JobRequestForm
            layout={deviceType}
            formData={formData}
            onFieldChange={setFormData}
            templates={templates}
            selectedTemplate={selectedTemplate}
            onApplyTemplate={handleApplyTemplate}
            regions={regions}
            collegesByRegion={collegesByRegion}
            loadingColleges={loadingColleges}
            expandedRegions={expandedRegions}
            onRegionExpand={handleRegionExpand}
            onCollegeToggle={handleCollegeToggle}
            onSelectAllCollegesInRegion={handleSelectAllCollegesInRegion}
            onBranchToggle={handleBranchToggle}
            requireJobApproval={portalMode.requireJobApproval}
            extendedSections={EXTENDED_SECTIONS}
            onSubmit={handleSubmit}
            onCancel={() => setShowCreateModal(false)}
          >
            {/* Specific-field and custom-field editors keep their own state and
                handlers; the form just gives them a home inside its last
                section. */}
            <div className="mt-2">
              <SecondaryButton type="button" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Hide advanced options' : 'Advanced options'}
              </SecondaryButton>
              {showAdvanced && (
                <AdvancedConfigSection
                  formData={formData}
                  handleSpecificFieldChange={handleSpecificFieldChange}
                  handleAddCustomField={handleAddCustomField}
                  handleRemoveCustomField={handleRemoveCustomField}
                />
              )}
            </div>
          </JobRequestForm>
        </CreateRequestModal>
      )}

      {showDetailsModal && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}

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

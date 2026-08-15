import { useState, useEffect, useMemo } from 'react';
import { dateForAge, ageForDate } from '../../utils/ageCutoff';
import { utcToLocalInput, localInputToUtc } from '../../utils/deadline';
import ModalScrollLock from '../../components/ModalScrollLock';
import { superAdminAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  X,
  ToggleLeft,
  ToggleRight,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  Users,
  Clock,
  Star,
  Info,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';
import DeadlineEcho from '../../components/DeadlineEcho';

/**
 * The colleges a stored targeting shape actually reaches.
 *
 * Mirrors collegesReachedBy on the server, which is what really decides who
 * sees the job. Used for two things that must agree: greying the colleges a job
 * already covers, and converting an older job into the picker's terms when it
 * is opened for editing.
 *
 * Kept outside the component so both callers share one definition rather than
 * one reading it and the other re-deriving it slightly differently.
 */
function reachedCollegeIds(targeting, colleges) {
  if (!targeting) return [];
  const { target_type: type } = targeting;
  const regionIds = new Set((targeting.target_regions || []).map(String));
  const collegeIds = new Set((targeting.target_colleges || []).map(String));
  const inRegions = (c) => regionIds.has(String(c.region_id));
  const named = (c) => collegeIds.has(String(c.id));
  return colleges
    .filter((c) => {
      if (type === 'all') return true;
      if (type === 'region') return inRegions(c);
      if (type === 'college') return named(c);
      if (type === 'specific') return inRegions(c) || named(c);
      return false;
    })
    .map((c) => c.id);
}

export default function ManageJobs() {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'deleted'
  const [jobs, setJobs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editMode, setEditMode] = useState(false);
  /*
   * How many students have applied to the job being edited, which decides
   * whether the eligibility and targeting fields are still open.
   *
   * Read from the job row the list already carries (getJobs returns
   * applications_count), so opening the dialog costs no extra request.
   */
  const [editApplicantCount, setEditApplicantCount] = useState(0);
  const eligibilityLocked = editMode && editApplicantCount > 0;
  /*
   * The targeting the job had when the dialog opened.
   *
   * Once anyone has applied this can be added to but not removed, so the boxes
   * for it are ticked and disabled. Held separately from formData because
   * formData is what the admin is editing — comparing against that would make
   * every box they tick immediately un-tickable.
   *
   * The whole shape is kept, not just the two lists, because which colleges are
   * already on the job depends on the target type. See lockedColleges.
   */
  const [lockedTargeting, setLockedTargeting] = useState(null);
  // Same idea for branches, which may be added to but not removed.
  const [lockedBranches, setLockedBranches] = useState([]);
  /*
   * The colleges the job already reaches — resolved, not read off target_colleges.
   *
   * A job aimed at five regions has an empty target_colleges, so greying only
   * the ids listed there left every college in the picker unticked and free to
   * change. Switching the target type to Specific Colleges then showed a blank
   * slate for a job that already covers all sixty, and saving it would have cut
   * the audience to whatever was ticked. The server refused that, but the screen
   * had said otherwise the whole way.
   *
   * This mirrors the rule the server uses: which colleges a job reaches, given
   * its type and both lists. Recomputed rather than snapshotted so it is still
   * right if the colleges list arrives after the dialog opens.
   */
  const lockedColleges = useMemo(
    () => new Set(reachedCollegeIds(lockedTargeting, colleges)),
    [lockedTargeting, colleges]
  );

  const lockedRegions = useMemo(
    () => new Set((lockedTargeting?.target_regions || []).map(String)),
    [lockedTargeting]
  );

  const targetLocked = (kind, id) =>
    eligibilityLocked
    && (kind === 'colleges' ? lockedColleges.has(id) : lockedRegions.has(String(id)));

  /*
   * A job already open to every college cannot be narrowed to a list, so the
   * "All colleges" box is held on once anyone has applied.
   */
  const lockedAllColleges = eligibilityLocked && lockedTargeting?.target_type === 'all';

  /** Colleges grouped under their region, for the picker. */
  const collegesByRegion = useMemo(() => {
    const grouped = {};
    colleges.forEach((c) => {
      const key = c.region_id;
      if (key === null || key === undefined) return;
      (grouped[key] = grouped[key] || []).push(c);
    });
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => String(a.college_name || a.name).localeCompare(String(b.college_name || b.name)))
    );
    return grouped;
  }, [colleges]);

  const [expandedRegions, setExpandedRegions] = useState({});

  /*
   * Tick or untick every college in a region at once.
   *
   * Deselecting leaves the locked ones behind rather than clearing the region
   * outright: they are on the job already and cannot be taken off it, so
   * removing them here would only produce a save the server refuses.
   */
  const handleSelectAllInRegion = (regionId, selectAll) => {
    const ids = (collegesByRegion[regionId] || []).map((c) => c.id);
    setFormData((prev) => ({
      ...prev,
      target_colleges: selectAll
        ? [...new Set([...prev.target_colleges, ...ids])]
        : prev.target_colleges.filter(
          (id) => !ids.includes(id) || targetLocked('colleges', id)
        ),
    }));
  };
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Export Applicants modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTargetJob, setExportTargetJob] = useState(null);
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'region' | 'colleges'
  const [exportSelectedRegion, setExportSelectedRegion] = useState('');
  const [exportSelectedColleges, setExportSelectedColleges] = useState([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exporting, setExporting] = useState(false);

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
    dob_on_or_before: '',
    dob_on_or_after: '',
    gender_requirement: 'all',
    // 'college' means the picker below; 'all' means every college,
    // including any added to the portal later.
    target_type: 'college',
    target_regions: [],
    target_colleges: [],
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
      await Promise.all([
        fetchJobs(),
        fetchPendingRequests(),
        fetchRegions(),
        fetchColleges(),
        fetchDeletedJobs(),
        fetchTemplates(),
      ]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await superAdminAPI.getRequirementTemplates();
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
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

  const fetchDeletedJobs = async () => {
    try {
      const response = await superAdminAPI.getDeletedJobsHistory();
      setDeletedJobs(response.data.data || []);
    } catch (error) {
      console.error('Failed to load deleted jobs:', error);
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

  // Returns the list as well as storing it: opening a job for editing has to
  // resolve which colleges it reaches before the next render, and state set
  // here is not readable until then.
  const fetchColleges = async () => {
    try {
      const response = await commonAPI.getColleges();
      const list = response.data.data || [];
      setColleges(list);
      return list;
    } catch (error) {
      console.error('Failed to load colleges:', error);
      return [];
    }
  };

  const handleCreateJob = () => {
    setEditMode(false);
    setSelectedJob(null);
    setSelectedTemplate('');
    // A new job has no applicants, so nothing is locked. Reset explicitly:
    // opening create straight after editing a job with applicants would
    // otherwise carry the lock over to a blank form.
    setEditApplicantCount(0);
    setLockedTargeting(null);
    setLockedBranches([]);
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
      dob_on_or_before: '',
      dob_on_or_after: '',
      gender_requirement: 'all',
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
    setShowJobModal(true);
    if (colleges.length === 0) {
      fetchColleges();
    }
  };

  const handleEditJob = async (job) => {
    setEditMode(true);
    setSelectedJob(job);
    setSelectedTemplate('');
    setEditApplicantCount(Number(job.applications_count) || 0);

    // Helper function to safely parse JSON or return array
    const parseJsonField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        return JSON.parse(field);
      } catch (error) {
        console.error('Error parsing field:', field, error);
        return [];
      }
    };

    // Set basic job data
    const basicFormData = {
      title: job.title || '',
      company_name: job.company_name || '',
      description: job.description || '',
      location: job.location || '',
      salary_package: job.salary_package || '',
      no_of_vacancies: job.no_of_vacancies || '',
      // Indian wall-clock in the box; a UTC instant on the wire.
      application_deadline: utcToLocalInput(job.application_deadline),
      min_cgpa: job.min_cgpa || '',
      max_backlogs: job.max_backlogs !== null && job.max_backlogs !== undefined ? String(job.max_backlogs) : '',
      backlog_policy: job.max_backlogs === null || job.max_backlogs === undefined ? 'no_restriction' : job.max_backlogs === 0 ? 'no_backlogs' : 'limited',
      allowed_backlog_semesters: Array.isArray(job.allowed_backlog_semesters) ? job.allowed_backlog_semesters.map(Number) : [],
      allowed_branches: parseJsonField(job.allowed_branches),
      // A DATE comes back as a full ISO timestamp; the picker wants a day.
      dob_on_or_before: job.dob_on_or_before ? String(job.dob_on_or_before).slice(0, 10) : '',
      dob_on_or_after: job.dob_on_or_after ? String(job.dob_on_or_after).slice(0, 10) : '',
      gender_requirement: job.gender_requirement || 'all',
      target_type: job.target_type || 'region',
      target_regions: parseJsonField(job.target_regions),
      target_colleges: parseJsonField(job.target_colleges),
      application_form_url: job.application_form_url || '',
      // Captured below from these same parsed values — see lockedTargeting.
      requires_academic_extended: false,
      requires_physical_details: false,
      requires_family_details: false,
      requires_personal_details: false,
      requires_document_verification: false,
      requires_education_preferences: false,
      specific_field_requirements: {},
      custom_fields: [],
    };

    const storedTargeting = {
      target_type: basicFormData.target_type,
      target_regions: basicFormData.target_regions,
      target_colleges: basicFormData.target_colleges,
    };

    /*
     * Older jobs are shown in the picker's terms.
     *
     * A job stored as `region` — or as `specific`, which the officers' requests
     * produce — has an empty or partial target_colleges, and the picker reads
     * target_colleges alone. Left as stored, opening such a job would show its
     * colleges unticked, which is the same lie the greying used to tell. So it
     * is expanded to the colleges it actually reaches on the way in.
     *
     * This does mean saving afterwards writes the audience out as an explicit
     * list rather than "that region". They cover the same students today; the
     * difference is only that a college added to that region later would have
     * been picked up by the region form and is not by the list. `all` is left
     * exactly as it is, which is why it stayed a separate choice.
     */
    // Resolved against a list we know is loaded — on the first edit of a
    // session the state copy is still empty, and an empty list would expand a
    // whole region to no colleges at all.
    const collegeList = colleges.length > 0 ? colleges : await fetchColleges();

    if (storedTargeting.target_type !== 'all') {
      basicFormData.target_type = 'college';
      basicFormData.target_colleges = reachedCollegeIds(storedTargeting, collegeList);
      basicFormData.target_regions = [];
    }

    setFormData(basicFormData);
    setLockedTargeting(storedTargeting);
    setLockedBranches(basicFormData.allowed_branches);
    setShowJobModal(true);

    // Load existing job requirements
    try {
      const response = await superAdminAPI.getJobRequirements(job.id);
      const requirements = response.data.data;

      if (requirements) {
        // Helper to parse JSON fields safely
        const parseField = (field, defaultValue = {}) => {
          if (!field) return defaultValue;
          if (typeof field === 'object') return field;
          try {
            return JSON.parse(field);
          } catch (error) {
            console.error('Error parsing requirements field:', error);
            return defaultValue;
          }
        };

        setFormData(prev => ({
          ...prev,
          requires_academic_extended: requirements.requires_academic_extended || false,
          requires_physical_details: requirements.requires_physical_details || false,
          requires_family_details: requirements.requires_family_details || false,
          requires_personal_details: requirements.requires_personal_details || false,
          requires_document_verification: requirements.requires_document_verification || false,
          requires_education_preferences: requirements.requires_education_preferences || false,
          specific_field_requirements: parseField(requirements.specific_field_requirements, {}),
          custom_fields: parseField(requirements.custom_fields, []),
        }));
      }
    } catch (error) {
      // If requirements don't exist, that's okay - just use defaults
      console.log('No existing requirements found for this job');
    }

    if (colleges.length === 0) {
      fetchColleges();
    }
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
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

    if (formData.target_type !== 'all' && formData.target_colleges.length === 0) {
      toast.error('Please select at least one college, or tick "All colleges"');
      return;
    }

    try {
      const submitData = {
        ...formData,
        // Sent as a UTC instant so no environment reinterprets the hour.
        application_deadline: localInputToUtc(formData.application_deadline),
        allowed_branches: JSON.stringify(formData.allowed_branches),
        target_regions: JSON.stringify(formData.target_regions),
        target_colleges: JSON.stringify(formData.target_colleges),
      };

      /*
       * Dropped rather than sent unchanged once anyone has applied.
       *
       * The server refuses the whole request if any of these is present, and it
       * cannot tell "same value resent by the form" from "deliberately
       * changed" — so leaving them in would make correcting a job title come
       * back "cannot be changed" for fields nobody touched. The inputs are
       * disabled in the dialog too; this is what makes the save work.
       *
       * Targeting is deliberately not in this list. It is still sent, because
       * it may still change — the audience is allowed to grow — and the server
       * compares the colleges reached before and after rather than refusing the
       * field outright.
       */
      if (eligibilityLocked) {
        [
          // allowed_branches stays in: it may be added to, and the server
          // checks what the new list takes away rather than refusing the field.
          'min_cgpa', 'max_backlogs', 'backlog_max_semester', 'allowed_backlog_semesters',
          'dob_on_or_before', 'dob_on_or_after', 'gender_requirement',
        ].forEach((field) => delete submitData[field]);
      }

      let jobId;
      if (editMode) {
        await superAdminAPI.updateJob(selectedJob.id, submitData);
        jobId = selectedJob.id;
        toast.success('Job updated successfully');
      } else {
        const response = await superAdminAPI.createJob(submitData);
        jobId = response.data.data.id;
        toast.success('Job created successfully');
      }

      // Create/update job requirements if any extended requirements are set
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

          if (editMode) {
            // Update existing requirements
            await superAdminAPI.updateJobRequirements(jobId, requirementsData);
            toast.success('Job requirements updated successfully');
          } else {
            // Create new requirements
            await superAdminAPI.createJobRequirements(jobId, requirementsData);
            toast.success('Job requirements saved successfully');
          }
        } catch (error) {
          console.error('Failed to save requirements:', error);
          if (editMode) {
            toast.error('Job updated but failed to save requirements');
          } else {
            toast.error('Job created but failed to save requirements');
          }
        }
      }

      setShowJobModal(false);
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save job');
    }
  };

  const handleOpenDeleteModal = (job) => {
    setJobToDelete(job);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setJobToDelete(null);
  };

  const handleSoftDelete = async () => {
    if (!jobToDelete) return;

    try {
      await superAdminAPI.deleteJob(jobToDelete.id);
      toast.success('Job moved to deleted history');
      fetchJobs();
      fetchDeletedJobs();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    }
  };

  const handlePermanentDelete = async (reason) => {
    if (!jobToDelete) return;

    if (!reason || !reason.trim()) {
      toast.error('Reason is required for permanent deletion');
      return;
    }

    try {
      await superAdminAPI.permanentlyDeleteJob(jobToDelete.id, reason);
      toast.success('Job permanently deleted');
      fetchJobs();
      fetchDeletedJobs();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to permanently delete job');
    }
  };

  const handleClearDeletedHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all deleted jobs history? This action cannot be undone.')) {
      return;
    }

    try {
      await superAdminAPI.clearDeletedJobsHistory();
      toast.success('Deleted jobs history cleared');
      fetchDeletedJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear deleted history');
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

  const handleSAExport = async () => {
    try {
      setExporting(true);
      let college_ids = [];
      if (exportScope === 'region') {
        college_ids = colleges.filter((c) => String(c.region_id) === String(exportSelectedRegion)).map((c) => c.id);
      } else if (exportScope === 'colleges') {
        college_ids = exportSelectedColleges;
      }

      const loadingToast = toast.loading(`Preparing ${exportFormat === 'pdf' ? 'PDF' : 'Excel'} export...`);
      const response = await superAdminAPI.enhancedExportJobApplicants(exportTargetJob.id, {
        format: exportFormat,
        college_ids,
      });

      const mimeType = exportFormat === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExt = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      const scopeLabel = exportScope === 'all' ? 'all' : exportScope === 'region' ? `region_${exportSelectedRegion}` : 'selected_colleges';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `applicants_${exportTargetJob.job_title.replace(/\s+/g, '_')}_${scopeLabel}_${Date.now()}.${fileExt}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Export downloaded successfully');
      setShowExportModal(false);
    } catch (error) {
      console.error('SA export error:', error);
      toast.error('Failed to export applicants');
    } finally {
      setExporting(false);
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
    return new Date(dateString).toLocaleDateString('en-IN', {
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

  if (showSkeleton) return <TablePageSkeleton tableColumns={5} hasTabs={true} hasSearch={false} hasFilters={false} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-8">
      {/* Header Section with Gradient */}
      <AnimatedSection delay={0}>
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl mb-8 p-8">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0 bg-grid-white/[0.05]"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Building2 className="text-white" size={36} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                  Manage Jobs
                </h1>
                <p className="text-blue-100 text-lg">
                  Create, approve, and manage job postings across all colleges
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateJob}
              className="px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Job</span>
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Tabs */}
      <AnimatedSection delay={0.08}>
        <div className="mb-6 bg-white rounded-2xl shadow-lg p-2">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending Approval ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'deleted'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Deleted History ({deletedJobs.length})
            </button>
          </nav>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.16}>
      {/* All Jobs Tab */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Target</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No jobs posted yet. Create your first job posting to get started.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 text-gray-900">{job.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.location || 'N/A'}</td>
                      <td className="px-6 py-4 font-semibold text-green-600">
                        {job.salary_package ? `₹${job.salary_package} LPA` : 'Not specified'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(job.application_deadline)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {getTargetDisplay(job)}
                      </td>
                      <td className="px-6 py-4">
                        {job.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
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
                            onClick={() => {
                              setExportTargetJob(job);
                              setExportScope('all');
                              setExportSelectedRegion('');
                              setExportSelectedColleges([]);
                              setExportFormat('excel');
                              setShowExportModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-800"
                            title="Export Applicants"
                          >
                            <Users size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(job)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Job"
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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requested By</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">College</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No pending job requests at the moment.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{request.job_title}</td>
                      <td className="px-6 py-4 text-gray-900">{request.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.location || 'N/A'}</td>
                      <td className="px-6 py-4 font-semibold text-green-600">
                        {request.salary_range ? `₹${request.salary_range} LPA` : 'Not specified'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{request.officer_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.college_name || 'N/A'}</td>
                      <td className="px-6 py-4">
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

      {/* Deleted Jobs History Tab */}
      {activeTab === 'deleted' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {deletedJobs.length > 0 && (
            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
              <p className="text-sm text-red-800 font-medium">
                These jobs have been soft-deleted and are kept for audit purposes.
              </p>
              <button
                onClick={handleClearDeletedHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Clear All History
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-red-50 to-orange-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deleted By</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deleted At</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {deletedJobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No deleted jobs in history.
                    </td>
                  </tr>
                ) : (
                  deletedJobs.map((job) => (
                    <tr key={job.id} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700">{job.title}</td>
                      <td className="px-6 py-4 text-gray-700">{job.company_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.location || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{job.deleted_by_name || 'System'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {job.deleted_at
                          ? new Date(job.deleted_at).toLocaleString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {job.deletion_reason || 'No reason provided'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </AnimatedSection>

      {/* Job Create/Edit Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModalScrollLock />
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {editMode ? 'Edit Job' : 'Create New Job'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowJobModal(false); setEditMode(false); setSelectedJob(null); }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Template Selection */}
              {!editMode && templates.length > 0 && (
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
                    <label className="label">No. of Vacancies</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.no_of_vacancies}
                      onChange={(e) => setFormData({ ...formData, no_of_vacancies: e.target.value })}
                      placeholder="e.g., 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Application Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.application_deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, application_deadline: e.target.value })
                      }
                      required
                    />
                    <DeadlineEcho value={formData.application_deadline} variant="admin" />
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
                      placeholder="https://forms.google.com/... (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Eligibility Criteria
                  {eligibilityLocked && <span className="ml-2 text-sm font-normal text-amber-600">— locked</span>}
                </h3>
                {eligibilityLocked && (
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {editApplicantCount} student{editApplicantCount === 1 ? ' has' : 's have'} already
                    applied, so who is eligible can no longer be changed — they applied under these
                    rules. Everything else, including the company, package, location and deadline, can
                    still be edited.
                  </p>
                )}
                {/*
                  A disabled fieldset disables every control inside it, which is
                  the point: this section holds a dozen inputs and adding the
                  flag to each one by hand is how one gets missed and quietly
                  stays editable.
                */}
                <fieldset disabled={eligibilityLocked} className="border-0 p-0 m-0 space-y-4 min-w-0">
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
                  {/* A cutoff date rather than an age in years: it is how a
                      company words the requirement, and it names one fixed set
                      of students instead of one that changes as birthdays pass
                      during the drive. */}
                  <div>
                    <label className="label">Born On or Before</label>
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      className="input"
                      value={formData.dob_on_or_before}
                      onChange={(e) => setFormData({ ...formData, dob_on_or_before: e.target.value })}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">or minimum age</span>
                      <input
                        type="number" min="1" max="99" className="input w-20" placeholder="18"
                        value={ageForDate(formData.dob_on_or_before) ?? ''}
                        onChange={(e) => setFormData({ ...formData, dob_on_or_before: dateForAge(e.target.value) })}
                      />
                      <span className="text-xs text-gray-500">years</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      The older end. Optional.
                    </p>
                  </div>
                  <div>
                    <label className="label">Born On or After</label>
                    <input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      className="input"
                      value={formData.dob_on_or_after}
                      onChange={(e) => setFormData({ ...formData, dob_on_or_after: e.target.value })}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">or maximum age</span>
                      <input
                        type="number" min="1" max="99" className="input w-20" placeholder="25"
                        value={ageForDate(formData.dob_on_or_after) ?? ''}
                        onChange={(e) => setFormData({ ...formData, dob_on_or_after: dateForAge(e.target.value) })}
                      />
                      <span className="text-xs text-gray-500">years</span>
                    </div>
                    {formData.dob_on_or_before && formData.dob_on_or_after
                      && formData.dob_on_or_after > formData.dob_on_or_before && (
                      <p className="text-xs font-bold text-red-600 mt-1">
                        Back to front — "on or after" must be the earlier date. As set, no student qualifies.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Open To</label>
                    <select
                      className="input"
                      value={formData.gender_requirement}
                      onChange={(e) => setFormData({ ...formData, gender_requirement: e.target.value })}
                    >
                      <option value="all">All candidates</option>
                      <option value="male">Male candidates only</option>
                      <option value="female">Female candidates only</option>
                    </select>
                    {formData.gender_requirement !== 'all' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Only students recorded as {formData.gender_requirement} will be able to apply.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Backlog Policy</label>
                    <select
                      className="input"
                      value={formData.backlog_policy}
                      onChange={(e) => {
                        const policy = e.target.value;
                        if (policy === 'no_restriction') {
                          setFormData({ ...formData, backlog_policy: policy, max_backlogs: '', allowed_backlog_semesters: [] });
                        } else if (policy === 'no_backlogs') {
                          setFormData({ ...formData, backlog_policy: policy, max_backlogs: '0', allowed_backlog_semesters: [] });
                        } else {
                          setFormData({ ...formData, backlog_policy: policy, max_backlogs: formData.max_backlogs || '1', allowed_backlog_semesters: [] });
                        }
                      }}
                    >
                      <option value="no_restriction">No Restriction</option>
                      <option value="no_backlogs">0 Backlogs Allowed</option>
                      <option value="limited">Allow Limited Backlogs</option>
                    </select>
                  </div>
                </div>
                {formData.backlog_policy === 'limited' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">Maximum Backlogs Allowed</label>
                      <select
                        className="input"
                        value={formData.max_backlogs}
                        onChange={(e) => setFormData({ ...formData, max_backlogs: e.target.value })}
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={String(num)}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Allowed Backlog Semesters <span className="text-xs font-normal text-gray-500">(leave all unchecked = any semester allowed)</span></label>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {[1, 2, 3, 4, 5, 6].map(sem => (
                          <label key={sem} className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg hover:bg-blue-50">
                            <input
                              type="checkbox"
                              checked={formData.allowed_backlog_semesters.includes(sem)}
                              onChange={() => {
                                const current = formData.allowed_backlog_semesters;
                                const updated = current.includes(sem) ? current.filter(s => s !== sem) : [...current, sem].sort((a, b) => a - b);
                                setFormData({ ...formData, allowed_backlog_semesters: updated });
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm font-medium">Sem {sem}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                </fieldset>

                {/*
                  Outside the disabled fieldset on purpose. Branches are the one
                  part of eligibility that still opens up after people apply:
                  adding one lets more students in and moves nobody who already
                  applied, while removing one strands whoever applied from it.
                  So the ones already on the job are fixed and the rest stay
                  tickable, instead of the whole list going grey.
                */}
                <div>
                  <label className="label">
                    Allowed Branches <span className="text-red-500">*</span>
                    {eligibilityLocked && (
                      <span className="ml-2 text-sm font-normal text-amber-600">— can only be added to</span>
                    )}
                  </label>
                  {eligibilityLocked && (
                    <p className="text-sm text-gray-600 mb-2">
                      Branches already on the job are fixed — tick any others you want to add.
                    </p>
                  )}
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
                        <label key={branch} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowed_branches.includes(branch)}
                            onChange={() => handleBranchToggle(branch)}
                            disabled={eligibilityLocked && lockedBranches.includes(branch)}
                            className="rounded text-primary-600 focus:ring-primary-500
                              disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm">
                            {branch}
                            {eligibilityLocked && lockedBranches.includes(branch) && (
                              <span className="ml-1 text-xs text-gray-500">(already on the job)</span>
                            )}
                          </span>
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
                  {eligibilityLocked && (
                    <span className="ml-2 text-sm font-normal text-amber-600">&mdash; can only be widened</span>
                  )}
                </h3>
                {eligibilityLocked && (
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    You can open this job to more colleges, but not take it away from any that are
                    already on it &mdash; students there have applied, and removing their college
                    would leave them attached to a job it is no longer part of. The ones already
                    selected are fixed; tick any others you want to add.
                  </p>
                )}

                {/*
                  One picker rather than a Region / Specific Colleges choice.
                  Regions are how the list is grouped, not a separate kind of
                  target: ticking a region ticks its colleges. That is the shape
                  the officer's request form already uses, and it is the only one
                  that can express a whole region plus one more college beside
                  it, which the two exclusive modes could not.

                  "All colleges" stays its own choice because it means something
                  an enumerated list cannot: a college added to the portal next
                  year is covered by it and would not be by a list written today.
                */}
                <label
                  className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${
                    formData.target_type === 'all'
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.target_type === 'all'}
                    disabled={lockedAllColleges}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        target_type: e.target.checked ? 'all' : 'college',
                        target_regions: [],
                        // Coming back off "all", the colleges already on the job
                        // stay on it: they are exactly the ones that may not go.
                        target_colleges: e.target.checked
                          ? []
                          : [...new Set([...prev.target_colleges, ...lockedColleges])],
                      }))
                    }
                    className="mt-0.5 rounded text-primary-600 focus:ring-primary-500
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">All colleges</span>
                    <span className="block text-xs text-gray-500">
                      Including any college added to the portal later.
                      {lockedAllColleges && ' Cannot be turned off \u2014 students have already applied.'}
                    </span>
                  </span>
                </label>

                {formData.target_type !== 'all' && (
                  <div>
                    <label className="label">
                      Regions and Colleges <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-300 rounded-lg divide-y divide-gray-200">
                      {regions.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">
                          No regions available.
                        </p>
                      ) : (
                        regions.map((region) => {
                          const regionColleges = collegesByRegion[region.id] || [];
                          const selectedHere = regionColleges.filter(
                            (c) =>
                              formData.target_colleges.includes(c.id) ||
                              targetLocked('colleges', c.id)
                          );
                          const allSelected =
                            regionColleges.length > 0 &&
                            selectedHere.length === regionColleges.length;
                          // Locked colleges cannot be unticked, so "Deselect all"
                          // is only offered where it would actually do something.
                          const canDeselectAll = regionColleges.some(
                            (c) => !targetLocked('colleges', c.id)
                          );
                          const expanded = expandedRegions[region.id];
                          return (
                            <div key={region.id}>
                              <div className="flex items-center justify-between gap-2 pr-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedRegions((prev) => ({
                                      ...prev,
                                      [region.id]: !prev[region.id],
                                    }))
                                  }
                                  aria-expanded={Boolean(expanded)}
                                  className="flex items-center gap-2 flex-1 min-w-0 px-4 py-3 text-left
                                    hover:bg-gray-50 transition-colors"
                                >
                                  {expanded ? (
                                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {region.region_name || region.name}
                                  </span>
                                  <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
                                    {selectedHere.length > 0
                                      ? `${selectedHere.length} of ${regionColleges.length} selected`
                                      : `${regionColleges.length} colleges`}
                                  </span>
                                </button>
                                {expanded &&
                                  regionColleges.length > 0 &&
                                  (allSelected ? canDeselectAll : true) && (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllInRegion(region.id, !allSelected)}
                                      className="text-xs font-medium text-primary-600 hover:underline flex-shrink-0"
                                    >
                                      {allSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                  )}
                              </div>
                              {expanded && (
                                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                                  {regionColleges.length === 0 ? (
                                    <p className="py-2 text-xs text-gray-500">
                                      No colleges in this region.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                      {regionColleges.map((college) => (
                                        <label
                                          key={college.id}
                                          className="flex items-center space-x-2 py-1 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              formData.target_colleges.includes(college.id) ||
                                              targetLocked('colleges', college.id)
                                            }
                                            onChange={() => handleTargetChange(college.id, 'college')}
                                            disabled={targetLocked('colleges', college.id)}
                                            className="rounded text-primary-600 focus:ring-primary-500
                                              disabled:opacity-60 disabled:cursor-not-allowed"
                                          />
                                          <span className="text-sm">
                                            {college.college_name || college.name}
                                            {targetLocked('colleges', college.id) && (
                                              <span className="ml-1 text-xs text-gray-500">
                                                (already on the job)
                                              </span>
                                            )}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 tabular-nums">
                      {formData.target_colleges.length} college(s) selected
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
          <ModalScrollLock />
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    // Loaded on click: jsPDF is ~384K.
                    const { generateJobDetailsPDF } = await import('../../utils/jobDetailsPdf');
                    generateJobDetailsPDF(selectedJob, { regions, colleges });
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                  title="Download Job Details as PDF"
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </button>
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
                    {selectedJob.no_of_vacancies && (
                      <div className="flex items-center space-x-1">
                        <Users size={16} />
                        <span>{selectedJob.no_of_vacancies} Vacancies</span>
                      </div>
                    )}
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
                      <span className="text-sm text-gray-600">Backlog Criteria:</span>
                      <p className="font-semibold">
                        {selectedJob.max_backlogs === 0
                          ? 'No Backlogs'
                          : (() => {
                              const sems = Array.isArray(selectedJob.allowed_backlog_semesters) && selectedJob.allowed_backlog_semesters.length > 0 ? selectedJob.allowed_backlog_semesters : null;
                              return sems ? `Max ${selectedJob.max_backlogs} in Sem ${sems.join(', ')}` : `Max ${selectedJob.max_backlogs} (any semester)`;
                            })()
                        }
                      </p>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && jobToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModalScrollLock />
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">Delete Job</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{jobToDelete.title}</h3>
                <p className="text-gray-600">{jobToDelete.company_name}</p>
              </div>

              <div className="space-y-4">
                {/* Soft Delete Option */}
                <div className="border-2 border-yellow-200 rounded-xl p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-500 rounded-lg p-2">
                        <Trash2 className="text-white" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Soft Delete</h4>
                        <p className="text-sm text-gray-600">Move to deleted history</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    The job will be moved to deleted history and can be viewed in the "Deleted History" tab.
                  </p>
                  <button
                    onClick={handleSoftDelete}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Soft Delete Job
                  </button>
                </div>

                {/* Permanent Delete Option */}
                <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50 hover:bg-red-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-red-600 rounded-lg p-2">
                        <XCircle className="text-white" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Permanent Delete</h4>
                        <p className="text-sm text-red-600">Cannot be undone!</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    This will PERMANENTLY delete the job and all related data. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => {
                      const reason = window.prompt(
                        'PERMANENT DELETE: This action cannot be undone.\n\nPlease provide a reason for permanent deletion:'
                      );
                      if (reason && reason.trim()) {
                        if (
                          window.confirm(
                            '⚠️ WARNING: This will PERMANENTLY delete this job and all related data.\n\nThis action CANNOT be undone. Are you absolutely sure?'
                          )
                        ) {
                          handlePermanentDelete(reason);
                        }
                      } else if (reason !== null) {
                        toast.error('Reason is required for permanent deletion');
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Permanently Delete Job
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleCloseDeleteModal}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Applicants Modal */}
      {showExportModal && exportTargetJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <ModalScrollLock />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Export Applicants</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{exportTargetJob.job_title} — {exportTargetJob.company_name}</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Scope */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Export Scope</p>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Colleges', desc: 'Export applicants from every college' },
                    { value: 'region', label: 'By Region', desc: 'All colleges in a selected region' },
                    { value: 'colleges', label: 'Select Colleges', desc: 'Choose specific colleges via checkboxes' },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${exportScope === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="exportScope" value={opt.value} checked={exportScope === opt.value}
                        onChange={(e) => { setExportScope(e.target.value); setExportSelectedRegion(''); setExportSelectedColleges([]); }}
                        className="mt-0.5 text-purple-600" />
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Region dropdown */}
              {exportScope === 'region' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Region</label>
                  <select value={exportSelectedRegion} onChange={(e) => setExportSelectedRegion(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium bg-white">
                    <option value="">— Choose a region —</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.region_name}</option>
                    ))}
                  </select>
                  {exportSelectedRegion && (
                    <p className="text-xs text-gray-500 mt-1">
                      {colleges.filter((c) => String(c.region_id) === String(exportSelectedRegion)).length} college(s) in this region
                    </p>
                  )}
                </div>
              )}

              {/* College checkboxes */}
              {exportScope === 'colleges' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-700">Select Colleges</label>
                    <div className="flex gap-2">
                      <button onClick={() => setExportSelectedColleges(colleges.map((c) => c.id))} className="text-xs text-purple-600 font-bold hover:underline">All</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setExportSelectedColleges([])} className="text-xs text-gray-500 font-bold hover:underline">None</button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-xl divide-y divide-gray-100">
                    {colleges.map((college) => (
                      <label key={college.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 cursor-pointer transition-colors">
                        <input type="checkbox"
                          checked={exportSelectedColleges.includes(college.id)}
                          onChange={() => {
                            setExportSelectedColleges((prev) =>
                              prev.includes(college.id) ? prev.filter((id) => id !== college.id) : [...prev, college.id]
                            );
                          }}
                          className="rounded text-purple-600" />
                        <span className="text-sm font-medium text-gray-800">{college.college_name}</span>
                      </label>
                    ))}
                  </div>
                  {exportSelectedColleges.length > 0 && (
                    <p className="text-xs text-purple-600 font-bold mt-1">{exportSelectedColleges.length} college(s) selected</p>
                  )}
                </div>
              )}

              {/* Format */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Format</p>
                <div className="flex gap-3">
                  {[{ value: 'excel', label: 'Excel (.xlsx)', color: 'green' }, { value: 'pdf', label: 'PDF', color: 'red' }].map((f) => (
                    <button key={f.value} onClick={() => setExportFormat(f.value)}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${exportFormat === f.value ? `border-${f.color}-500 bg-${f.color}-50 text-${f.color}-700` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSAExport} disabled={exporting || (exportScope === 'region' && !exportSelectedRegion) || (exportScope === 'colleges' && exportSelectedColleges.length === 0)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Advanced Configuration Section Component
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
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
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

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import { utcToLocalInput, localInputToUtc } from '../../utils/deadline';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import JobForm from './jobs/JobForm';
import JobFormSkeleton from './jobs/JobFormSkeleton';
import { reachedCollegeIds, EMPTY_JOB_FORM } from './jobs/jobsShared';

/**
 * Posting or editing a job — container.
 *
 * This was a 707-line dialog inside `ManageJobs`. It is a page now, at
 * `/super-admin/jobs/new` and `/super-admin/jobs/:jobId/edit`.
 *
 * There is no single-job endpoint for super admin, so an edit resolves its job
 * out of `getJobs()`. That is one request the page needs anyway, and it means a
 * link to a job that has since been deleted lands on a plain "not found"
 * instead of a blank form that would post a second copy on save.
 */
export default function JobEditor() {
  const deviceType = useDeviceType();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const editMode = Boolean(jobId);

  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState({});
  const [formData, setFormData] = useState(EMPTY_JOB_FORM);

  /*
   * How many students have applied to the job being edited, which decides
   * whether the eligibility and targeting rules are still open.
   *
   * Read from the job row the list already carries (getJobs returns
   * applications_count), so resolving the job costs no extra request.
   */
  const [editApplicantCount, setEditApplicantCount] = useState(0);
  const eligibilityLocked = editMode && editApplicantCount > 0;

  /*
   * The targeting the job had when the page opened.
   *
   * Once anyone has applied this can be added to but not removed, so the boxes
   * for it are ticked and disabled. Held separately from formData because
   * formData is what the admin is editing — comparing against that would make
   * every box they tick immediately un-tickable.
   */
  const [lockedTargeting, setLockedTargeting] = useState(null);
  // Same idea for branches, which may be added to but not removed.
  const [lockedBranches, setLockedBranches] = useState([]);

  /*
   * The colleges the job already reaches — resolved, not read off
   * target_colleges. A job aimed at five regions has an empty target_colleges,
   * so greying only the ids listed there would leave every college free to
   * change and let a save cut the audience. Mirrors the server's rule.
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

  useEffect(() => {
    fetchInitialData();
    // Re-resolves when the route changes from new to an edit, or between jobs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchTemplates = async () => {
    try {
      const response = await superAdminAPI.getRequirementTemplates();
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
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

  // Returns the list as well as storing it: resolving which colleges a job
  // reaches has to happen before the next render, and state set here is not
  // readable until then.
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

  const fetchInitialData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [collegeList] = await Promise.all([fetchColleges(), fetchRegions(), fetchTemplates()]);
      if (editMode) await loadJob(collegeList);
      else setFormData(EMPTY_JOB_FORM);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /** `[]` for anything unparseable rather than throwing on the way in. */
  const parseJsonField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing field:', field, error);
      return [];
    }
  };

  const loadJob = async (collegeList) => {
    const response = await superAdminAPI.getJobs();
    const job = (response.data.data || []).find((j) => String(j.id) === String(jobId));

    if (!job) {
      setNotFound(true);
      return;
    }

    setSelectedJob(job);
    setEditApplicantCount(Number(job.applications_count) || 0);

    const basicFormData = {
      ...EMPTY_JOB_FORM,
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
     * colleges unticked, which is a lie about who it reaches. So it is expanded
     * to the colleges it actually reaches on the way in.
     *
     * This does mean saving afterwards writes the audience out as an explicit
     * list rather than "that region". They cover the same students today; the
     * difference is only that a college added to that region later would have
     * been picked up by the region form and is not by the list. `all` is left
     * exactly as it is, which is why it stayed a separate choice.
     */
    if (storedTargeting.target_type !== 'all') {
      basicFormData.target_type = 'college';
      basicFormData.target_colleges = reachedCollegeIds(storedTargeting, collegeList);
      basicFormData.target_regions = [];
    }

    setFormData(basicFormData);
    setLockedTargeting(storedTargeting);
    setLockedBranches(basicFormData.allowed_branches);

    // Load existing job requirements
    try {
      const reqResponse = await superAdminAPI.getJobRequirements(job.id);
      const requirements = reqResponse.data.data;

      if (requirements) {
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

        setFormData((prev) => ({
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
    }
  };

  const set = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleApplyTemplate = (templateId) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    const template = templates.find((t) => t.id === parseInt(templateId));
    if (template) {
      const asObject = (field, fallback) => {
        if (!field) return fallback;
        if (typeof field === 'string') {
          try { return JSON.parse(field); } catch { return fallback; }
        }
        return field;
      };

      setFormData((prev) => ({
        ...prev,
        min_cgpa: template.min_cgpa || '',
        max_backlogs: template.max_backlogs !== null && template.max_backlogs !== undefined ? String(template.max_backlogs) : '',
        backlog_policy: template.max_backlogs === null || template.max_backlogs === undefined ? 'no_restriction' : template.max_backlogs === 0 ? 'no_backlogs' : 'limited',
        allowed_backlog_semesters: Array.isArray(template.allowed_backlog_semesters) ? template.allowed_backlog_semesters.map(Number) : [],
        allowed_branches: asObject(template.allowed_branches, []),
        requires_academic_extended: template.requires_academic_extended || false,
        requires_physical_details: template.requires_physical_details || false,
        requires_family_details: template.requires_family_details || false,
        requires_personal_details: template.requires_personal_details || false,
        requires_document_verification: template.requires_document_verification || false,
        requires_education_preferences: template.requires_education_preferences || false,
        specific_field_requirements: asObject(template.specific_field_requirements, {}),
        custom_fields: asObject(template.custom_fields, []),
      }));
      setSelectedTemplate(templateId);
      toast.success('Template applied successfully!');
    }
  };

  const handleBranchToggle = (branch) => {
    setFormData((prev) => ({
      ...prev,
      allowed_branches: prev.allowed_branches.includes(branch)
        ? prev.allowed_branches.filter((b) => b !== branch)
        : [...prev.allowed_branches, branch],
    }));
  };

  const handleTargetChange = (id, type) => {
    setFormData((prev) => {
      if (type === 'region') {
        return {
          ...prev,
          target_regions: prev.target_regions.includes(id)
            ? prev.target_regions.filter((r) => r !== id)
            : [...prev.target_regions, id],
        };
      }
      return {
        ...prev,
        target_colleges: prev.target_colleges.includes(id)
          ? prev.target_colleges.filter((c) => c !== id)
          : [...prev.target_colleges, id],
      };
    });
  };

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

    setSubmitting(true);
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
       * Nothing is stripped.
       *
       * The server compares each eligibility value against what is stored and
       * objects only to a real tightening, so sending the form's whole state is
       * safe. Removing fields here was what made a save depend on the browser
       * guessing correctly, and it is also what stopped a rule being relaxed at
       * all once anyone had applied.
       */
      let savedJobId;
      if (editMode) {
        await superAdminAPI.updateJob(selectedJob.id, submitData);
        savedJobId = selectedJob.id;
        toast.success('Job updated successfully');
      } else {
        const response = await superAdminAPI.createJob(submitData);
        savedJobId = response.data.data.id;
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
            await superAdminAPI.updateJobRequirements(savedJobId, requirementsData);
            toast.success('Job requirements updated successfully');
          } else {
            await superAdminAPI.createJobRequirements(savedJobId, requirementsData);
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

      navigate('/super-admin/jobs');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  if (showSkeleton) return <JobFormSkeleton layout={deviceType} />;

  if (notFound) {
    return (
      <div className="p-8 text-center">
        <p className="text-spc-h2 font-bold text-spc-ink">That job is not here.</p>
        <p className="text-spc-sm text-spc-body mt-2">
          It may have been deleted since the link was made.
        </p>
        <button
          type="button"
          onClick={() => navigate('/super-admin/jobs')}
          className="inline-flex items-center justify-center min-h-[44px] px-4 mt-4
            rounded-spc-admin-sm bg-spc-accent text-spc-on-accent text-spc-xs font-bold"
        >
          Back to jobs
        </button>
      </div>
    );
  }

  return (
    <JobForm
      layout={deviceType}
      editMode={editMode}
      formData={formData}
      set={set}
      submitting={submitting}
      templates={templates}
      selectedTemplate={selectedTemplate}
      onApplyTemplate={handleApplyTemplate}
      regions={regions}
      collegesByRegion={collegesByRegion}
      expandedRegions={expandedRegions}
      onToggleRegion={(id) => setExpandedRegions((prev) => ({ ...prev, [id]: !prev[id] }))}
      onTargetChange={handleTargetChange}
      onSelectAllInRegion={handleSelectAllInRegion}
      onAllCollegesChange={(checked) => setFormData((prev) => ({
        ...prev,
        target_type: checked ? 'all' : 'college',
        target_regions: [],
        // Coming back off "all", the colleges already on the job stay on it:
        // they are exactly the ones that may not go.
        target_colleges: checked ? [] : [...new Set([...prev.target_colleges, ...lockedColleges])],
      }))}
      targetLocked={targetLocked}
      lockedAllColleges={lockedAllColleges}
      lockedBranches={lockedBranches}
      eligibilityLocked={eligibilityLocked}
      editApplicantCount={editApplicantCount}
      onBranchToggle={handleBranchToggle}
      onBacklogPolicy={(policy) => {
        if (policy === 'no_restriction') {
          set({ backlog_policy: policy, max_backlogs: '', allowed_backlog_semesters: [] });
        } else if (policy === 'no_backlogs') {
          set({ backlog_policy: policy, max_backlogs: '0', allowed_backlog_semesters: [] });
        } else {
          set({
            backlog_policy: policy,
            max_backlogs: formData.max_backlogs || '1',
            allowed_backlog_semesters: [],
          });
        }
      }}
      onBacklogSemesterToggle={(sem) => setFormData((prev) => ({
        ...prev,
        allowed_backlog_semesters: prev.allowed_backlog_semesters.includes(sem)
          ? prev.allowed_backlog_semesters.filter((s) => s !== sem)
          : [...prev.allowed_backlog_semesters, sem].sort((a, b) => a - b),
      }))}
      showAdvanced={showAdvanced}
      onToggleAdvanced={() => setShowAdvanced((v) => !v)}
      onSpecificFieldChange={handleSpecificFieldChange}
      onAddCustomField={handleAddCustomField}
      onRemoveCustomField={handleRemoveCustomField}
      onCancel={() => navigate('/super-admin/jobs')}
      onSubmit={handleSubmit}
    />
  );
}

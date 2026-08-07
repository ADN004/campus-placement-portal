import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { placementOfficerAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import PlacementDetailsForm from '../../components/PlacementDetailsForm';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopJobEligibleStudents from './jobEligible/DesktopJobEligibleStudents';
import TabletJobEligibleStudents from './jobEligible/TabletJobEligibleStudents';
import MobileJobEligibleStudents from './jobEligible/MobileJobEligibleStudents';
import {
  ExportOptionsModal,
  CollegePickerModal,
  EditJobModal,
} from './jobEligible/JobEligibleModals';
import {
  DesktopJobEligibleSkeleton,
  TabletJobEligibleSkeleton,
  MobileJobEligibleSkeleton,
} from './jobEligible/JobEligibleSkeleton';

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobResolved, setJobResolved] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Enhanced Features State
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveData, setDriveData] = useState(null);
  const [placementStats, setPlacementStats] = useState(null);
  const [showEnhancedFilters, setShowEnhancedFilters] = useState(false);
  const [enhancedFilters, setEnhancedFilters] = useState({
    applicationStatuses: [],
    sslcMin: '',
    twelfthMin: '',
    district: '',
    hasPassport: null,
    hasAadhar: null,
    hasDrivingLicense: null,
    hasPan: null,
    heightMin: '',
    weightMin: '',
    physicallyHandicapped: null,
  });
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPDFFieldSelector, setShowPDFFieldSelector] = useState(false);
  const [pdfExportType, setPdfExportType] = useState('basic'); // 'basic' or 'enhanced'
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [includePlacedInExport, setIncludePlacedInExport] = useState(false);

  // Edit Job modal state (host POs only)
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editJobData, setEditJobData] = useState({});
  const [editJobLoading, setEditJobLoading] = useState(false);

  // College selection for host-job export
  const [allColleges, setAllColleges] = useState([]);
  const [exportCollegeIds, setExportCollegeIds] = useState([]);
  const [showCollegeModal, setShowCollegeModal] = useState(false);

  // Advanced Filters (legacy)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    maxBacklogs: '',
    dobFrom: '',
    dobTo: '',
  });

  useEffect(() => {
    fetchJobs();
    commonAPI.getColleges().then((res) => setAllColleges(res.data.data || [])).catch(() => {});
  }, []);

  // The job is identified by the URL, so a bookmark or a refresh lands on the
  // same drive.
  //
  // `jobResolved` is tracked explicitly rather than inferring "missing" from a
  // null selectedJob. Effects run after the commit, so for one render after the
  // list arrives selectedJob is still null while the job is perfectly valid —
  // inferring it would flash "no longer available" at someone whose job is
  // fine. Nothing but the skeleton's timing would have hidden that, and timing
  // is not a guarantee.
  useEffect(() => {
    if (loading) return;
    const match = jobs.find((job) => String(job.id) === String(jobId)) || null;
    setSelectedJob(match);
    setJobResolved(true);
  }, [jobs, jobId, loading]);

  useEffect(() => {
    if (selectedJob) {
      setStudents([]);
      fetchJobApplicants();
      fetchDriveSchedule();
      fetchPlacementStats();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedJob && students.length > 0) {
      filterEligibleStudents();
    }
  }, [students, advancedFilters, enhancedFilters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getJobs();
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobApplicants = async () => {
    try {
      setLoadingStudents(true);
      const response = await placementOfficerAPI.getJobApplicants(selectedJob.id);
      setStudents(response.data.data || []);
      setIsHost(response.data.is_host || false);
    } catch (error) {
      toast.error('Failed to load job applicants');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchDriveSchedule = async () => {
    try {
      const response = await placementOfficerAPI.getJobDrive(selectedJob.id);
      setDriveData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch drive schedule:', error);
      setDriveData(null);
    }
  };

  const fetchPlacementStats = async () => {
    try {
      const response = await placementOfficerAPI.getJobPlacementStats(selectedJob.id);
      setPlacementStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch placement stats:', error);
      setPlacementStats(null);
    }
  };

  // Silent refresh for auto-refresh (no loading spinners / toasts)
  const silentRefresh = useCallback(async () => {
    if (!selectedJob) return;
    try {
      const [applicantsRes, statsRes] = await Promise.all([
        placementOfficerAPI.getJobApplicants(selectedJob.id),
        placementOfficerAPI.getJobPlacementStats(selectedJob.id),
      ]);
      setStudents(applicantsRes.data.data || []);
      setIsHost(applicantsRes.data.is_host || false);
      setPlacementStats(statsRes.data.data);
    } catch (e) {
      // Silently fail on auto-refresh
    }
  }, [selectedJob]);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const showSkeleton = useSkeletonLoading(loading);

  const filterEligibleStudents = () => {
    if (jobResolved && !selectedJob) {
      setFilteredStudents([]);
      return;
    }

    let filtered = [...students];

    // Apply legacy advanced filters
    if (advancedFilters.cgpaMin) {
      const minCGPA = parseFloat(advancedFilters.cgpaMin);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) >= minCGPA);
    }

    if (advancedFilters.cgpaMax) {
      const maxCGPA = parseFloat(advancedFilters.cgpaMax);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) <= maxCGPA);
    }

    if (advancedFilters.maxBacklogs !== '') {
      const maxBacklogs = parseInt(advancedFilters.maxBacklogs);
      filtered = filtered.filter((s) => parseInt(s.backlog_count || 0) <= maxBacklogs);
    }

    if (advancedFilters.dobFrom) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) >= new Date(advancedFilters.dobFrom)
      );
    }

    if (advancedFilters.dobTo) {
      filtered = filtered.filter(
        (s) => s.date_of_birth && new Date(s.date_of_birth) <= new Date(advancedFilters.dobTo)
      );
    }

    // Apply enhanced filters
    if (enhancedFilters.applicationStatuses.length > 0) {
      filtered = filtered.filter((s) => enhancedFilters.applicationStatuses.includes(s.application_status));
    }

    if (enhancedFilters.sslcMin) {
      const sslcMin = parseFloat(enhancedFilters.sslcMin);
      filtered = filtered.filter((s) => parseFloat(s.sslc_marks || 0) >= sslcMin);
    }

    if (enhancedFilters.twelfthMin) {
      const twelfthMin = parseFloat(enhancedFilters.twelfthMin);
      filtered = filtered.filter((s) => parseFloat(s.twelfth_marks || 0) >= twelfthMin);
    }

    if (enhancedFilters.district) {
      filtered = filtered.filter((s) => s.district === enhancedFilters.district);
    }

    if (enhancedFilters.hasPassport !== null) {
      filtered = filtered.filter((s) => s.has_passport === enhancedFilters.hasPassport);
    }

    if (enhancedFilters.hasAadhar !== null) {
      filtered = filtered.filter((s) => s.has_aadhar_card === enhancedFilters.hasAadhar);
    }

    if (enhancedFilters.hasDrivingLicense !== null) {
      filtered = filtered.filter((s) => s.has_driving_license === enhancedFilters.hasDrivingLicense);
    }

    if (enhancedFilters.hasPan !== null) {
      filtered = filtered.filter((s) => s.has_pan_card === enhancedFilters.hasPan);
    }

    if (enhancedFilters.heightMin) {
      const heightMin = parseFloat(enhancedFilters.heightMin);
      filtered = filtered.filter((s) => parseFloat(s.height_cm || 0) >= heightMin);
    }

    if (enhancedFilters.weightMin) {
      const weightMin = parseFloat(enhancedFilters.weightMin);
      filtered = filtered.filter((s) => parseFloat(s.weight_kg || 0) >= weightMin);
    }

    if (enhancedFilters.physicallyHandicapped !== null) {
      filtered = filtered.filter((s) => s.physically_handicapped === enhancedFilters.physicallyHandicapped);
    }

    // Sort: college → branch → PRN (grouped by college first, then branch within college, then PRN order)
    filtered.sort((a, b) => {
      // First sort by college name
      const collegeCompare = (a.college_name || '').localeCompare(b.college_name || '');
      if (collegeCompare !== 0) return collegeCompare;

      // Then by branch within same college
      const branchCompare = (a.branch || '').localeCompare(b.branch || '');
      if (branchCompare !== 0) return branchCompare;

      // Then by PRN within same branch (ascending order)
      return (a.prn || '').localeCompare(b.prn || '');
    });

    setFilteredStudents(filtered);
  };

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      maxBacklogs: '',
      dobFrom: '',
      dobTo: '',
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleEnhancedFiltersChange = (newFilters) => {
    setEnhancedFilters(newFilters);
  };

  const clearEnhancedFilters = () => {
    setEnhancedFilters({
      applicationStatuses: [],
      sslcMin: '',
      twelfthMin: '',
      district: '',
      hasPassport: null,
      hasAadhar: null,
      hasDrivingLicense: null,
      hasPan: null,
      heightMin: '',
      weightMin: '',
      physicallyHandicapped: null,
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map((s) => s.application_id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (applicationId) => {
    setSelectedStudents((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    try {
      const loadingToast = toast.loading(`Updating ${selectedStudents.length} applications...`);
      await placementOfficerAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status,
      });
      toast.dismiss(loadingToast);
      toast.success(`Updated ${selectedStudents.length} applications to ${status}`);
      setSelectedStudents([]);
      await fetchJobApplicants();
      await fetchPlacementStats();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update applications');
    }
  };

  const handleNotifyStudents = async (notificationType) => {
    if (!driveData && notificationType === 'drive_scheduled') {
      toast.error('Please schedule a drive first');
      return;
    }

    let applicationsToNotify = [];

    if (notificationType === 'drive_scheduled') {
      applicationsToNotify = filteredStudents.map((s) => s.application_id);
    } else if (notificationType === 'shortlisted' || notificationType === 'rejected' || notificationType === 'selected') {
      applicationsToNotify = filteredStudents
        .filter((s) => s.application_status === notificationType)
        .map((s) => s.application_id);
    }

    if (applicationsToNotify.length === 0) {
      toast.error(`No students to notify for ${notificationType}`);
      return;
    }

    try {
      const loadingToast = toast.loading(`Sending notifications to ${applicationsToNotify.length} students...`);
      await placementOfficerAPI.notifyApplicationStatus({
        application_ids: applicationsToNotify,
        notification_type: notificationType,
      });
      toast.dismiss(loadingToast);
      toast.success(`Sent ${applicationsToNotify.length} notifications`);
    } catch (error) {
      console.error('Notification error:', error);
      toast.error('Failed to send notifications');
    }
  };

  const handleUpdatePlacement = async (applicationId, placementData) => {
    try {
      await placementOfficerAPI.updatePlacementDetails(applicationId, placementData);
      toast.success('Placement details updated');
      setShowPlacementForm(false);
      setSelectedApplication(null);
      await fetchJobApplicants();
      await fetchPlacementStats();
    } catch (error) {
      console.error('Update placement error:', error);
      toast.error('Failed to update placement details');
    }
  };

  const handleDriveSubmit = async (driveFormData) => {
    try {
      await placementOfficerAPI.createOrUpdateJobDrive(selectedJob.id, driveFormData);
      toast.success(driveData ? 'Drive updated successfully' : 'Drive scheduled successfully');
      setShowDriveModal(false);
      await fetchDriveSchedule();
    } catch (error) {
      console.error('Drive submit error:', error);
      toast.error('Failed to save drive schedule');
    }
  };

  const handleEditJobSave = async () => {
    try {
      setEditJobLoading(true);
      await placementOfficerAPI.updateJob(selectedJob.id, editJobData);
      toast.success('Job updated successfully');
      setShowEditJobModal(false);
      // Refresh jobs list and update selectedJob
      const response = await placementOfficerAPI.getJobs();
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
      const updated = activeJobs.find((j) => j.id === selectedJob.id);
      if (updated) setSelectedJob(updated);
    } catch (error) {
      console.error('Edit job error:', error);
      toast.error(error.response?.data?.message || 'Failed to update job');
    } finally {
      setEditJobLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    try {
      setExporting(true);
      setShowExportModal(false);

      const loadingToast = toast.loading(`Preparing ${format === 'pdf' ? 'PDF' : 'Excel'} export...`);

      // Host POs with college selection use enhanced export to support college_ids
      const useEnhanced = isHost && exportCollegeIds.length > 0;
      const response = useEnhanced
        ? await placementOfficerAPI.enhancedExportJobApplicants(selectedJob.id, {
            format,
            college_ids: exportCollegeIds,
            exclude_already_placed: !includePlacedInExport,
          })
        : await placementOfficerAPI.exportJobApplicants(selectedJob.id, format, !includePlacedInExport);

      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExt = format === 'pdf' ? 'pdf' : 'xlsx';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${selectedJob.job_title.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.${fileExt}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${filteredStudents.length} applicants as ${format === 'pdf' ? 'PDF' : 'Excel'}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format === 'pdf' ? 'PDF' : 'Excel'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleEnhancedExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    // Enhanced export only supports PDF with field selector
    setPdfExportType('enhanced');
    setShowPDFFieldSelector(true);
    setShowExportModal(false);
  };

  const handlePDFExportWithFields = async ({ fields: selectedFields, includeSignature, headerLine1, headerLine2 }) => {
    try {
      setExporting(true);
      setShowPDFFieldSelector(false);
      const loadingToast = toast.loading('Preparing PDF export...');

      const exportData = {
        format: 'pdf',
        pdf_fields: selectedFields,
        include_signature: includeSignature || false,
        header_line1: headerLine1 || '',
        header_line2: headerLine2 || null,
        exclude_already_placed: !includePlacedInExport,
        college_ids: isHost && exportCollegeIds.length > 0 ? exportCollegeIds : [],
      };

      // Add enhanced filters if it's an enhanced export
      if (pdfExportType === 'enhanced') {
        Object.assign(exportData, {
          application_statuses: enhancedFilters.applicationStatuses.length > 0
            ? enhancedFilters.applicationStatuses
            : undefined,
          sslc_min: enhancedFilters.sslcMin || undefined,
          twelfth_min: enhancedFilters.twelfthMin || undefined,
          district: enhancedFilters.district || undefined,
          has_passport: enhancedFilters.hasPassport,
          has_aadhar: enhancedFilters.hasAadhar,
          has_driving_license: enhancedFilters.hasDrivingLicense,
          has_pan: enhancedFilters.hasPan,
          height_min: enhancedFilters.heightMin || undefined,
          weight_min: enhancedFilters.weightMin || undefined,
          physically_handicapped: enhancedFilters.physicallyHandicapped,
        });
      } else if (pdfExportType === 'selected_only') {
        // Export only students with 'selected' status
        Object.assign(exportData, {
          application_statuses: ['selected'],
        });
      }

      const response = (pdfExportType === 'enhanced' || pdfExportType === 'selected_only')
        ? await placementOfficerAPI.enhancedExportJobApplicants(selectedJob.id, exportData)
        : await placementOfficerAPI.exportJobApplicants(selectedJob.id, 'pdf', !includePlacedInExport);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${pdfExportType}_${selectedJob.job_title.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${filteredStudents.length} applicants as PDF`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export as PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportEligibleNotApplied = async () => {
    if (!selectedJob) {
      toast.error('Please select a job first');
      return;
    }
    try {
      setExporting(true);
      setShowExportModal(false);
      const loadingToast = toast.loading('Preparing PDF export of not-applied students...');
      const response = await placementOfficerAPI.exportEligibleNotApplied(selectedJob.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `eligible_not_applied_${selectedJob.job_title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Exported eligible-not-applied students');
    } catch (error) {
      console.error('Eligible-not-applied export error:', error);
      if (error.response?.status === 404) {
        toast.error('No eligible students who have not applied yet');
      } else {
        toast.error('Failed to export eligible-not-applied students');
      }
    } finally {
      setExporting(false);
    }
  };

  const deviceType = useDeviceType();

  if (showSkeleton || !jobResolved) {
    if (deviceType === 'mobile') return <MobileJobEligibleSkeleton />;
    if (deviceType === 'tablet') return <TabletJobEligibleSkeleton />;
    return <DesktopJobEligibleSkeleton />;
  }

  if (!selectedJob) {
    return (
      <div>
        <Link
          to="/placement-officer/job-eligible-students"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
            text-spc-accent hover:underline underline-offset-4"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span>All jobs</span>
        </Link>
        <div className="mt-4 bg-spc-surface border border-spc-line-strong rounded-spc-panel px-4 py-12 text-center">
          <p className="text-spc-sm font-bold text-spc-ink">This job is no longer available.</p>
          <p className="text-spc-xs text-spc-muted mt-1">
            It may have closed, been deleted, or belong to another college. Pick a drive from the
            list to carry on.
          </p>
        </div>
      </div>
    );
  }

  const currentApplicants = filteredStudents.filter((s) => !s.is_already_placed);
  const selectedSummary = filteredStudents.filter((s) => s.application_status === 'selected');

  // Same rule as before: with every ticked application already `selected`,
  // there is nothing left for the bulk buttons to apply.
  const selectedRows = filteredStudents.filter((s) => selectedStudents.includes(s.application_id));
  const allSelectedAreSelected =
    selectedRows.length > 0 && selectedRows.every((s) => s.application_status === 'selected');

  const hasEnhancedFilters =
    enhancedFilters.applicationStatuses.length > 0 ||
    Boolean(enhancedFilters.sslcMin) ||
    Boolean(enhancedFilters.twelfthMin) ||
    Boolean(enhancedFilters.district) ||
    enhancedFilters.hasPassport !== null ||
    enhancedFilters.hasAadhar !== null ||
    enhancedFilters.hasDrivingLicense !== null ||
    enhancedFilters.hasPan !== null ||
    Boolean(enhancedFilters.heightMin) ||
    Boolean(enhancedFilters.weightMin) ||
    enhancedFilters.physicallyHandicapped !== null;

  const placementStatCards = placementStats
    ? [
        { label: 'Total applications', value: placementStats.total_applications || 0 },
        { label: 'Submitted', value: placementStats.submitted || 0 },
        { label: 'Under review', value: placementStats.under_review || 0 },
        { label: 'Shortlisted', value: placementStats.shortlisted || 0 },
        { label: 'Selected', value: placementStats.selected || 0 },
        { label: 'Rejected', value: placementStats.rejected || 0 },
        { label: 'Already placed', value: filteredStudents.filter((s) => s.is_already_placed).length },
      ]
    : null;

  // The colleges this drive actually targets — used by both the export dialog
  // and the college picker it opens.
  const targetCollegeIds = Array.isArray(selectedJob?.target_colleges)
    ? selectedJob.target_colleges.map(Number)
    : [];
  const jobColleges = allColleges.filter((c) => targetCollegeIds.includes(Number(c.id)));

  const handleViewStudent = (student) => {
    setSelectedStudentId(student.id);
    setSelectedApplicationId(student.application_id);
    setShowStudentDetail(true);
  };

  const handleEditPlacement = (student) => {
    setSelectedApplication({ ...student, id: student.application_id });
    setShowPlacementForm(true);
  };

  const handleOpenEditJob = () => {
    setEditJobData({
      title: selectedJob.job_title,
      company_name: selectedJob.company_name,
      description: selectedJob.job_description,
      location: selectedJob.job_location,
      salary_package: selectedJob.salary_package || '',
      no_of_vacancies: selectedJob.no_of_vacancies || '',
      application_deadline: selectedJob.application_deadline
        ? new Date(selectedJob.application_deadline).toISOString().split('T')[0]
        : '',
      application_form_url: selectedJob.application_form_url || '',
      min_cgpa: selectedJob.min_cgpa || '',
      max_backlogs:
        selectedJob.max_backlogs !== null && selectedJob.max_backlogs !== undefined
          ? String(selectedJob.max_backlogs)
          : '',
      allowed_backlog_semesters: Array.isArray(selectedJob.allowed_backlog_semesters)
        ? selectedJob.allowed_backlog_semesters.map(Number)
        : [],
      allowed_branches: Array.isArray(selectedJob.allowed_branches)
        ? selectedJob.allowed_branches
        : [],
    });
    setShowEditJobModal(true);
  };

  const handleOpenExport = () => {
    setShowExportModal(true);
    setShowEnhancedFilters(false);
    setShowAdvancedFilters(false);
  };

  const refreshControl = (
    <AutoRefreshIndicator
      variant="officer"
      lastRefreshed={lastRefreshed}
      autoRefreshEnabled={autoRefreshEnabled}
      onToggle={toggleAutoRefresh}
      onManualRefresh={manualRefresh}
      refreshing={refreshing}
    />
  );

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    job: selectedJob,
    jobs,
    selectedJob,
    isHost,
    placementStats: placementStatCards,
    driveData,
    onScheduleDrive: () => setShowDriveModal(true),
    onNotifyDrive: () => handleNotifyStudents('drive_scheduled'),
    onEditJob: handleOpenEditJob,
    onExport: handleOpenExport,
    exporting,
    filteredStudents,
    selectedSummary,
    loadingStudents,
    selectedStudents,
    allSelectedAreSelected,
    onBulkStatusUpdate: handleBulkStatusUpdate,
    onClearSelection: () => setSelectedStudents([]),
    onSelectStudent: handleSelectStudent,
    onSelectAll: handleSelectAll,
    onViewStudent: handleViewStudent,
    onEditPlacement: handleEditPlacement,
    onManualAdd: () => setShowManualAddModal(true),
    showEnhancedFilters,
    onToggleEnhancedFilters: () => setShowEnhancedFilters(!showEnhancedFilters),
    hasEnhancedFilters,
    enhancedFilters,
    onEnhancedFiltersChange: handleEnhancedFiltersChange,
    onClearEnhancedFilters: clearEnhancedFilters,
    showAdvancedFilters,
    onToggleAdvancedFilters: () => setShowAdvancedFilters(!showAdvancedFilters),
    hasAdvancedFilters: hasActiveFilters(),
    advancedFilters,
    onAdvancedFilterChange: handleAdvancedFilterChange,
    onClearAdvancedFilters: clearAdvancedFilters,
    refreshControl,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileJobEligibleStudents {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletJobEligibleStudents {...presenterProps} />
      ) : (
        <DesktopJobEligibleStudents {...presenterProps} />
      )}

      {/* Shared components — these keep their original styling until the
          dedicated officer-variant pass after all ten pages. */}
      <StudentDetailModal
        isOpen={showStudentDetail}
        onClose={() => {
          setShowStudentDetail(false);
          setSelectedStudentId(null);
          setSelectedApplicationId(null);
        }}
        studentId={selectedStudentId}
        applicationId={selectedApplicationId}
        userRole="placement-officer"
        variant="officer"
      />

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onSave={handleDriveSubmit}
        existingDrive={driveData}
        jobTitle={selectedJob?.job_title}
        variant="officer"
      />

      <PlacementDetailsForm
        isOpen={showPlacementForm}
        onClose={() => {
          setShowPlacementForm(false);
          setSelectedApplication(null);
        }}
        onSubmit={handleUpdatePlacement}
        application={selectedApplication}
        variant="officer"
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          onExport={handlePDFExportWithFields}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={
            pdfExportType === 'selected_only'
              ? filteredStudents.filter((s) => s.application_status === 'selected').length
              : filteredStudents.length
          }
          exportType={pdfExportType}
          variant="officer"
        />
      )}

      <ManualStudentAdditionModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        job={selectedJob}
        onSuccess={() => {
          fetchJobApplicants();
          fetchPlacementStats();
        }}
        api={placementOfficerAPI}
        userRole="placement-officer"
        variant="officer"
      />

      {/* Page-local dialogs — converted. */}
      {showExportModal && !exporting && (
        <ExportOptionsModal
          isHost={isHost}
          jobCollegeCount={jobColleges.length}
          exportCollegeIds={exportCollegeIds}
          onOpenCollegePicker={() => {
            setShowCollegeModal(true);
            setShowExportModal(false);
          }}
          onExportExcel={() => handleExport('excel')}
          onExportPdf={() => handleExport('pdf')}
          onEnhancedExport={handleEnhancedExport}
          onExportNotApplied={() => handleExportEligibleNotApplied()}
          placedCount={filteredStudents.filter((s) => s.is_already_placed).length}
          includePlaced={includePlacedInExport}
          onIncludePlacedChange={(e) => setIncludePlacedInExport(e.target.checked)}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showCollegeModal && selectedJob && (
        <CollegePickerModal
          jobColleges={jobColleges}
          exportCollegeIds={exportCollegeIds}
          onToggle={(id) =>
            setExportCollegeIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onSelectAll={() => setExportCollegeIds(jobColleges.map((c) => Number(c.id)))}
          onClear={() => setExportCollegeIds([])}
          onApply={() => setShowCollegeModal(false)}
          onResetAndClose={() => {
            setExportCollegeIds([]);
            setShowCollegeModal(false);
          }}
        />
      )}

      {showEditJobModal && (
        <EditJobModal
          data={editJobData}
          onChange={setEditJobData}
          onSave={handleEditJobSave}
          saving={editJobLoading}
          onClose={() => setShowEditJobModal(false)}
        />
      )}
    </>
  );
}

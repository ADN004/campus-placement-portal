import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import EnhancedFilterPanel from '../../components/EnhancedFilterPanel';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';
import ApplicantsBody from './jobEligible/ApplicantsBody';
import ApplicantsSkeleton from './jobEligible/ApplicantsSkeleton';

/**
 * One drive's applicants — container.
 *
 * Every piece of state, effect and handler from the page this was split out of,
 * carried over rather than retyped. `ApplicantsBody` draws them and owns no
 * logic.
 *
 * Three handlers were dropped because nothing called them, and they are worth
 * naming because each represents something a super admin cannot do that a
 * placement officer can:
 *
 *   - `handleStatusUpdate` — set one application's status. Only the bulk bar
 *     works here; there is no per-row control and never was.
 *   - `handlePlacementUpdate` — record a package, joining date and location.
 *     `PlacementDetailsForm` was imported and never rendered.
 *   - `handleSelectAll` — superseded by the header checkbox's own inline logic.
 *
 * They were dead on the page before this and are dead code here; removing them
 * does not change what the page does. Whether super admin *should* have those
 * two abilities is a question for the user, not something to add quietly.
 */
export default function SuperAdminJobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [exportRegions, setExportRegions] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportFilters, setShowExportFilters] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    selectedColleges: [],
    selectedRegion: '',
  });

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    maxBacklogs: '',
    dobFrom: '',
    dobTo: '',
    collegeId: '',
  });

  // New State for Enhanced Features
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
  const [showPDFFieldSelector, setShowPDFFieldSelector] = useState(false);
  const [pdfExportType, setPdfExportType] = useState('basic'); // 'basic' or 'enhanced'
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [includePlacedInExport, setIncludePlacedInExport] = useState(false);
  // The selected job's own custom questions, which arrive with its applicants.
  const [jobCustomFields, setJobCustomFields] = useState([]);

  useEffect(() => {
    fetchJobs();
    fetchColleges();
    fetchExportRegions();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchJobApplicants();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (selectedJob && students.length > 0) {
      filterEligibleStudents();
    }
  }, [students, advancedFilters]);

  useEffect(() => {
    if (selectedJob) {
      fetchDriveSchedule();
      fetchPlacementStats();
    }
  }, [selectedJob]);

  useEffect(() => {
    applyEnhancedFilters();
  }, [students, enhancedFilters]);

  /*
   * The job is whichever one the URL names. It used to be whichever card was
   * clicked, and the click set it directly; now the page is opened at the job's
   * own address, so it is looked up once the list arrives.
   */
  const selectJobFromRoute = (list) => {
    const job = list.find((j) => String(j.id) === String(jobId));
    if (job) {
      setSelectedJob(job);
    } else {
      toast.error('That drive could not be found');
      navigate('/super-admin/job-eligible-students');
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getJobs();
      // Filter to show only active jobs
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
      selectJobFromRoute(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
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

  const fetchExportRegions = async () => {
    try {
      const response = await commonAPI.getRegions();
      setExportRegions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const fetchJobApplicants = async () => {
    try {
      setLoadingStudents(true);
      const response = await superAdminAPI.getJobApplicants(selectedJob.id);
      // These are students who have APPLIED to this job across all colleges
      setStudents(response.data.data || []);
      setJobCustomFields(response.data.custom_fields || []);
    } catch (error) {
      toast.error('Failed to load job applicants');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };


  const filterEligibleStudents = () => {
    if (!selectedJob) {
      setFilteredStudents([]);
      return;
    }

    // Students are already filtered as applicants who meet basic job criteria
    // Now apply additional advanced filters
    let filtered = [...students];

    // Apply advanced filters
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

    if (advancedFilters.collegeId) {
      filtered = filtered.filter((s) => s.college_id === parseInt(advancedFilters.collegeId));
    }

    /*
     * The same order the server returns, so filtering does not re-order the
     * list under the reader. Shared rather than repeated: this comparison also
     * folds the two spellings of a branch together, which a plain compare on
     * the branch text does not.
     */
    filtered.sort((a, b) => compareStudents(a, b, { byCollege: true }));

    setFilteredStudents(filtered);
  };

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  // New Handler Functions for Enhanced Features
  const fetchDriveSchedule = async () => {
    if (!selectedJob) return;
    try {
      const response = await superAdminAPI.getJobDrive(selectedJob.id);
      setDriveData(response.data.data);
    } catch (error) {
      console.error('Error fetching drive schedule:', error);
    }
  };

  const fetchPlacementStats = async () => {
    if (!selectedJob) return;
    try {
      const response = await superAdminAPI.getJobPlacementStats(selectedJob.id);
      setPlacementStats(response.data.data);
    } catch (error) {
      console.error('Error fetching placement stats:', error);
    }
  };

  // Silent refresh for auto-refresh (no loading spinners / toasts)
  const silentRefresh = useCallback(async () => {
    if (!selectedJob) return;
    try {
      const [applicantsRes, statsRes] = await Promise.all([
        superAdminAPI.getJobApplicants(selectedJob.id),
        superAdminAPI.getJobPlacementStats(selectedJob.id),
      ]);
      setStudents(applicantsRes.data.data || []);
      setPlacementStats(statsRes.data.data);
    } catch (e) {
      // Silently fail on auto-refresh
    }
  }, [selectedJob]);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const applyEnhancedFilters = () => {
    if (!students.length) {
      setFilteredStudents([]);
      return;
    }

    let filtered = [...students];

    // Application status filter
    if (enhancedFilters.applicationStatuses?.length > 0) {
      filtered = filtered.filter((s) =>
        enhancedFilters.applicationStatuses.includes(s.application_status)
      );
    }

    /*
     * The same order the server returns, so filtering does not re-order the
     * list under the reader. Shared rather than repeated: this comparison also
     * folds the two spellings of a branch together, which a plain compare on
     * the branch text does not.
     */
    filtered.sort((a, b) => compareStudents(a, b, { byCollege: true }));

    setFilteredStudents(filtered);
  };

  const handleSelectStudent = (applicationId) => {
    setSelectedStudents((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };


  const handleViewStudentDetail = (student) => {
    setSelectedStudentId(student.id);
    setSelectedApplicationId(student.application_id);
    setShowStudentDetail(true);
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students first');
      return;
    }

    try {
      await superAdminAPI.bulkUpdateApplicationStatus({
        application_ids: selectedStudents,
        status,
      });
      toast.success(`${selectedStudents.length} applications updated to ${status}`);
      setSelectedStudents([]);
      fetchJobApplicants();
      fetchPlacementStats();
    } catch (error) {
      toast.error('Failed to update application status');
      console.error(error);
    }
  };


  const handleScheduleDrive = async (driveDetails) => {
    try {
      await superAdminAPI.createOrUpdateJobDrive(selectedJob.id, driveDetails);
      toast.success('Drive scheduled successfully');
      setShowDriveModal(false);
      fetchDriveSchedule();
    } catch (error) {
      toast.error('Failed to schedule drive');
      console.error(error);
    }
  };

  const handleNotifyStudents = async (notificationType) => {
    const applicationsToNotify =
      notificationType === 'drive_scheduled'
        ? filteredStudents.filter((s) => s.application_status === 'shortlisted').map((s) => s.application_id)
        : selectedStudents;

    if (applicationsToNotify.length === 0) {
      toast.error(
        notificationType === 'drive_scheduled'
          ? 'No shortlisted students to notify'
          : 'Please select students first'
      );
      return;
    }

    try {
      const response = await superAdminAPI.notifyApplicationStatus({
        application_ids: applicationsToNotify,
        notification_type: notificationType,
      });
      toast.success(`Sent ${response.data.notificationsCreated} notifications and ${response.data.emailsSent} emails`);
      if (notificationType !== 'drive_scheduled') {
        setSelectedStudents([]);
      }
    } catch (error) {
      toast.error('Failed to send notifications');
      console.error(error);
    }
  };


  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      maxBacklogs: '',
      dobFrom: '',
      dobTo: '',
      collegeId: '',
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }

    // Enhanced export only supports PDF with field selector
    setPdfExportType('enhanced');
    setShowPDFFieldSelector(true);
    setShowExportDropdown(false);
    setShowExportFilters(false);
  };

  /*
   * The same applicant list as a spreadsheet.
   *
   * Goes through the plain export rather than the enhanced one: the enhanced
   * route exists to let a PDF be built from chosen fields, which a spreadsheet
   * does not need — every column is there and the reader hides what they do not
   * want. The endpoint has accepted a format all along and defaults to excel;
   * nothing on this page had ever called it.
   */
  const handleExcelExport = async () => {
    if (filteredStudents.length === 0) {
      toast.error('No applicants to export');
      return;
    }
    try {
      setExporting(true);
      setShowExportDropdown(false);
      setShowExportFilters(false);
      const loadingToast = toast.loading('Preparing Excel export...');
      /*
       * The college filter applies here exactly as it does to the PDF.
       *
       * Both formats are the same list; only the container differs. An empty
       * selection is left out rather than sent as [], because the endpoint
       * reads an empty array as "no college filter" — which is the same thing,
       * but saying nothing is clearer than saying nothing-shaped.
       */
      const selectedColleges = exportFilters.selectedColleges;
      const response = await superAdminAPI.exportJobApplicants(selectedJob.id, {
        format: 'excel',
        use_short_names: true,
        exclude_already_placed: !includePlacedInExport,
        college_ids: selectedColleges.length > 0 ? selectedColleges : undefined,
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `applicants_${String(selectedJob.job_title).replace(/\s+/g, '_')}_${Date.now()}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success(
        selectedColleges.length > 0
          ? `Exported applicants as Excel from ${selectedColleges.length} college(s)`
          : 'Exported applicants as Excel from every college'
      );
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export as Excel');
    } finally {
      setExporting(false);
    }
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
        college_ids: exportFilters.selectedColleges.length > 0 ? exportFilters.selectedColleges : undefined,
        application_statuses: pdfExportType === 'selected_only'
          ? ['selected']
          : (enhancedFilters.applicationStatuses.length > 0 ? enhancedFilters.applicationStatuses : undefined),
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
      };

      const response = await superAdminAPI.enhancedExportJobApplicants(selectedJob.id, exportData);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `job_applicants_${selectedJob.job_title.replace(/\s+/g, '_')}_${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${filteredStudents.length} applicants as PDF`);
      setShowExportFilters(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export as PDF');
    } finally {
      setExporting(false);
    }
  };

  const toggleCollegeSelection = (collegeId) => {
    setExportFilters((prev) => {
      const isSelected = prev.selectedColleges.includes(collegeId);
      return {
        ...prev,
        selectedColleges: isSelected
          ? prev.selectedColleges.filter((id) => id !== collegeId)
          : [...prev.selectedColleges, collegeId],
      };
    });
  };

  const handleRegionSelect = (regionId) => {
    if (!regionId) {
      setExportFilters((prev) => ({ ...prev, selectedRegion: '', selectedColleges: [] }));
      return;
    }
    const regionColleges = colleges
      .filter((c) => String(c.region_id) === String(regionId))
      .map((c) => c.id);
    setExportFilters((prev) => ({
      ...prev,
      selectedRegion: regionId,
      selectedColleges: regionColleges,
    }));
  };

  const clearExportFilters = () => {
    setExportFilters({
      selectedColleges: [],
      selectedRegion: '',
    });
  };

  const hasExportFilters = () => {
    return exportFilters.selectedColleges.length > 0 || !!exportFilters.selectedRegion;
  };

  if (showSkeleton || !selectedJob) return <ApplicantsSkeleton layout={deviceType} />;

  const currentApplicants = filteredStudents.filter((s) => !s.is_already_placed);
  const placedApplicants = filteredStudents.filter((s) => s.is_already_placed);
  const selectedSummary = filteredStudents.filter((s) => s.application_status === 'selected');

  const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);
  const hasEnhancedFilters = Object.entries(enhancedFilters).some(([, v]) => (
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null
  ));

  return (
    <>
      <ApplicantsBody
        layout={deviceType}
        selectedJob={selectedJob}
        students={students}
        filteredStudents={filteredStudents}
        currentApplicants={currentApplicants}
        placedApplicants={placedApplicants}
        selectedSummary={selectedSummary}
        colleges={colleges}
        placementStats={placementStats}
        driveData={driveData}
        loadingStudents={loadingStudents}
        exporting={exporting}
        selectedStudents={selectedStudents}
        onSelectStudent={handleSelectStudent}
        onSelectAll={() => {
          const ids = currentApplicants.map((s) => s.application_id);
          const all = ids.length > 0 && ids.every((id) => selectedStudents.includes(id));
          setSelectedStudents(all ? [] : ids);
        }}
        onClearSelection={() => setSelectedStudents([])}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onNotifyStudents={handleNotifyStudents}
        onViewStudent={handleViewStudentDetail}
        onScheduleDrive={() => setShowDriveModal(true)}
        onNotifyDrive={() => handleNotifyStudents('drive_scheduled')}
        onManualAdd={() => setShowManualAddModal(true)}
        onExportExcel={() => handleExcelExport()}
        onExportPdf={handleExport}
        exportRegions={exportRegions}
        exportFilters={exportFilters}
        showExportFilters={showExportFilters}
        onToggleExportScope={() => setShowExportFilters(!showExportFilters)}
        onRegionSelect={handleRegionSelect}
        onToggleCollege={toggleCollegeSelection}
        onClearExportScope={() => setExportFilters({ selectedColleges: [], selectedRegion: '' })}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        advancedFilters={advancedFilters}
        onAdvancedFilterChange={handleAdvancedFilterChange}
        onClearAdvancedFilters={() => setAdvancedFilters({
          cgpaMin: '', cgpaMax: '', maxBacklogs: '', dobFrom: '', dobTo: '', collegeId: '',
        })}
        hasAdvancedFilters={hasAdvancedFilters}
        showEnhancedFilters={showEnhancedFilters}
        onToggleEnhancedFilters={() => setShowEnhancedFilters(!showEnhancedFilters)}
        enhancedFilters={enhancedFilters}
        hasEnhancedFilters={hasEnhancedFilters}
        enhancedFilterPanel={showEnhancedFilters ? (
          <div className="mb-4">
            <EnhancedFilterPanel
              filters={enhancedFilters}
              onFilterChange={setEnhancedFilters}
              onClose={() => setShowEnhancedFilters(false)}
            />
          </div>
        ) : null}
      />

      <StudentDetailModal
        isOpen={showStudentDetail}
        onClose={() => setShowStudentDetail(false)}
        studentId={selectedStudentId}
        applicationId={selectedApplicationId}
      />

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        jobId={selectedJob?.id}
        existingDrive={driveData}
        onSubmit={handleScheduleDrive}
        onSuccess={() => { setShowDriveModal(false); fetchDriveSchedule(selectedJob.id); }}
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          onExport={handlePDFExportWithFields}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={filteredStudents.length}
          exportType={pdfExportType}
          customFields={jobCustomFields}
        />
      )}

      <ManualStudentAdditionModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        jobId={selectedJob?.id}
        jobTitle={selectedJob?.job_title}
        onSuccess={() => { setShowManualAddModal(false); fetchJobApplicants(selectedJob.id); }}
      />
    </>
  );
}

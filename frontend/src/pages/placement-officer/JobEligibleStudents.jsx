import { useState, useEffect, useCallback } from 'react';
import { placementOfficerAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Briefcase, Users, Download, Filter, ChevronDown, ChevronUp, Check, FileSpreadsheet, FileText,
  Eye, Calendar, Send, BarChart3, CheckCircle, Clock, XCircle, AlertCircle, UserCheck, DollarSign, UserPlus, AlertTriangle, Edit
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassStatCard from '../../components/GlassStatCard';
import StatusBadge from '../../components/StatusBadge';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import EnhancedFilterPanel from '../../components/EnhancedFilterPanel';
import PlacementDetailsForm from '../../components/PlacementDetailsForm';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';
import { generateJobDetailsPDF } from '../../utils/jobDetailsPdf';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';

export default function JobEligibleStudents() {
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
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

  useEffect(() => {
    if (selectedJob) {
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
    if (!selectedJob) {
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
      setShowExportDropdown(false);

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
    setShowExportDropdown(false);
  };

  const handlePDFExportWithFields = async ({ fields: selectedFields, includeSignature }) => {
    try {
      setExporting(true);
      setShowPDFFieldSelector(false);
      const loadingToast = toast.loading('Preparing PDF export...');

      const exportData = {
        format: 'pdf',
        pdf_fields: selectedFields,
        include_signature: includeSignature || false,
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

  if (showSkeleton) {
    return <TablePageSkeleton statCards={0} tableColumns={8} tableRows={8} hasSearch={true} hasFilters={false} />;
  }

  return (
    <div>
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="mb-8">
          <DashboardHeader
            icon={Briefcase}
            title="Job Applicants Management"
            subtitle={isHost ? "View, manage, and track student applications across all colleges (Host)" : "View, manage, and track student applications for your college"}
          />
        </div>
      </AnimatedSection>

      {/* Job Selection */}
      <AnimatedSection delay={0.1}>
        <GlassCard variant="elevated" className="p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2 mr-3 shadow-lg">
              <Briefcase className="text-white" size={20} />
            </div>
            Select a Job
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8 font-medium">No active jobs available</p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`relative p-6 border-2 rounded-2xl text-left transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                    selectedJob?.id === job.id
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <h3 className="font-bold text-gray-900 text-lg mb-2 pr-8">{job.job_title}</h3>
                  <p className="text-gray-700 font-medium mb-4">{job.company_name}</p>
                  <div className="space-y-2 text-sm font-medium">
                    {job.min_cgpa && <p className="text-blue-600">Min CGPA: {job.min_cgpa}</p>}
                    {job.max_backlogs !== null && <p className="text-orange-600">Max Backlogs: {job.max_backlogs}</p>}
                    <p className="text-green-600 font-bold">
                      Deadline: {new Date(job.application_deadline).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateJobDetailsPDF({
                        ...job,
                        title: job.job_title,
                        description: job.job_description,
                      });
                    }}
                    className="absolute top-4 right-4 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
                    title="Download Job Details as PDF"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </AnimatedSection>

      {selectedJob && (
        <AnimatedSection delay={0.2}>
          {/* Placement Statistics */}
          {placementStats && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="mr-2 text-blue-600" size={24} />
                Placement Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <GlassStatCard
                  title="Total Applications"
                  value={placementStats.total_applications || 0}
                  icon={Users}
                  gradient="from-blue-500 to-blue-600"
                />
                <GlassStatCard
                  title="Submitted"
                  value={placementStats.submitted || 0}
                  icon={Clock}
                  gradient="from-gray-500 to-gray-600"
                />
                <GlassStatCard
                  title="Under Review"
                  value={placementStats.under_review || 0}
                  icon={AlertCircle}
                  gradient="from-yellow-500 to-yellow-600"
                />
                <GlassStatCard
                  title="Shortlisted"
                  value={placementStats.shortlisted || 0}
                  icon={CheckCircle}
                  gradient="from-indigo-500 to-indigo-600"
                />
                <GlassStatCard
                  title="Selected"
                  value={placementStats.selected || 0}
                  icon={UserCheck}
                  gradient="from-green-500 to-green-600"
                />
                <GlassStatCard
                  title="Rejected"
                  value={placementStats.rejected || 0}
                  icon={XCircle}
                  gradient="from-red-500 to-red-600"
                />
                <GlassStatCard
                  title="Already Placed"
                  value={filteredStudents.filter(s => s.is_already_placed).length}
                  icon={AlertTriangle}
                  gradient="from-amber-500 to-orange-600"
                />
              </div>
            </div>
          )}

          {/* Drive Schedule Section */}
          <GlassCard variant="elevated" className="p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                  <Calendar className="mr-2 text-blue-600" size={24} />
                  Drive Schedule
                </h3>
                {driveData ? (
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-semibold">Date:</span> {new Date(driveData.drive_date).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Time:</span> {driveData.drive_time}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Venue:</span> {driveData.venue}
                    </p>
                    {driveData.additional_instructions && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Instructions:</span> {driveData.additional_instructions}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No drive scheduled yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDriveModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Calendar size={18} />
                  {driveData ? 'Edit Drive' : 'Schedule Drive'}
                </button>
                {driveData && (
                  <button
                    onClick={() => handleNotifyStudents('drive_scheduled')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Send size={18} />
                    Notify All
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Selected Job Info */}
          <GlassCard variant="elevated" className="p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{selectedJob.job_title}</h2>
                <p className="text-lg sm:text-xl text-gray-700 font-medium mb-4">{selectedJob.company_name}</p>
                <div className="flex flex-wrap gap-3">
                  {selectedJob.min_cgpa && (
                    <span className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-xl border-2 border-blue-200">
                      Min CGPA: {selectedJob.min_cgpa}
                    </span>
                  )}
                  {selectedJob.max_backlogs !== null && (
                    <span className="bg-orange-100 text-orange-800 font-bold px-4 py-2 rounded-xl border-2 border-orange-200">
                      Max Backlogs: {selectedJob.max_backlogs}
                    </span>
                  )}
                  {selectedJob.allowed_branches && selectedJob.allowed_branches.length > 0 && (
                    <span className="bg-purple-100 text-purple-800 font-bold px-4 py-2 rounded-xl border-2 border-purple-200">
                      {selectedJob.allowed_branches.length} Branch(es)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:ml-6">
                {isHost && (
                  <button
                    onClick={() => {
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
                        max_backlogs: selectedJob.max_backlogs !== null && selectedJob.max_backlogs !== undefined ? String(selectedJob.max_backlogs) : '',
                        allowed_backlog_semesters: Array.isArray(selectedJob.allowed_backlog_semesters) ? selectedJob.allowed_backlog_semesters.map(Number) : [],
                        allowed_branches: Array.isArray(selectedJob.allowed_branches) ? selectedJob.allowed_branches : [],
                      });
                      setShowEditJobModal(true);
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    title="Edit Job"
                  >
                    <Edit size={18} />
                    <span>Edit Job</span>
                  </button>
                )}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => {
                    setShowExportDropdown(!showExportDropdown);
                    // Close filter panels when export opens
                    if (!showExportDropdown) {
                      setShowEnhancedFilters(false);
                      setShowAdvancedFilters(false);
                    }
                  }}
                  disabled={filteredStudents.length === 0 || exporting}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  <span>{exporting ? 'Exporting...' : 'Export'}</span>
                  <ChevronDown size={16} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showExportDropdown && !exporting && (
                  <>
                    <div
                      className="fixed inset-0 bg-black/20 z-[100]"
                      onClick={() => setShowExportDropdown(false)}
                    ></div>
                    <GlassCard className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-80 z-[110] overflow-hidden p-0 shadow-2xl border-2 border-gray-200">
                      <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-700">Export Options</p>
                      </div>
                      {/* College selection for host POs */}
                      {isHost && (() => {
                        const targetIds = Array.isArray(selectedJob?.target_colleges)
                          ? selectedJob.target_colleges.map(Number)
                          : [];
                        const jobColleges = allColleges.filter((c) => targetIds.includes(Number(c.id)));
                        if (jobColleges.length <= 1) return null;
                        return (
                          <div className="px-4 py-3 border-b border-gray-200 bg-indigo-50">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-indigo-700">Filter by College</p>
                              <div className="flex gap-2">
                                <button onClick={() => setExportCollegeIds([])} className={`text-xs font-bold ${exportCollegeIds.length === 0 ? 'text-indigo-600 underline' : 'text-gray-400 hover:text-indigo-600'}`}>All</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {jobColleges.map((college) => (
                                <label key={college.id} className="flex items-center gap-2 cursor-pointer text-xs">
                                  <input type="checkbox"
                                    checked={exportCollegeIds.includes(Number(college.id))}
                                    onChange={() => {
                                      const id = Number(college.id);
                                      setExportCollegeIds((prev) =>
                                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                      );
                                    }}
                                    className="rounded text-indigo-600" />
                                  <span className="font-medium text-gray-800">{college.college_name}</span>
                                </label>
                              ))}
                            </div>
                            {exportCollegeIds.length > 0 && (
                              <p className="text-xs text-indigo-600 font-bold mt-1">{exportCollegeIds.length} selected</p>
                            )}
                          </div>
                        );
                      })()}
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-500 px-4 py-2">Basic Export</p>
                        <button
                          onClick={() => handleExport('excel')}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center space-x-3 transition-colors rounded-lg"
                        >
                          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2 shadow-lg">
                            <FileSpreadsheet size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">Export as Excel</div>
                            <div className="text-xs text-gray-600">Basic applicant list</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center space-x-3 transition-colors rounded-lg"
                        >
                          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-2 shadow-lg">
                            <FileText size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">Export as PDF</div>
                            <div className="text-xs text-gray-600">Basic report format</div>
                          </div>
                        </button>
                      </div>
                      <div className="p-2 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 px-4 py-2">Enhanced Export (with filters)</p>
                        <button
                          onClick={handleEnhancedExport}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center space-x-3 transition-colors rounded-lg"
                        >
                          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-2 shadow-lg">
                            <FileText size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">Enhanced PDF</div>
                            <div className="text-xs text-gray-600">Comprehensive report with field selection</div>
                          </div>
                        </button>
                      </div>
                      {filteredStudents.some(s => s.is_already_placed) && (
                        <div className="p-3 border-t border-gray-200 bg-amber-50">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includePlacedInExport}
                              onChange={(e) => setIncludePlacedInExport(e.target.checked)}
                              className="w-4 h-4 rounded border-2 border-amber-400 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-amber-800 text-sm">Include already placed students</div>
                              <div className="text-xs text-amber-600">
                                {filteredStudents.filter(s => s.is_already_placed).length} student(s) already placed in other companies
                              </div>
                            </div>
                          </label>
                        </div>
                      )}
                    </GlassCard>
                  </>
                )}
              </div>
              </div>
            </div>
          </GlassCard>

          {/* Bulk Actions Bar */}
          {selectedStudents.length > 0 && (
            <GlassCard variant="elevated" className="p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900">
                  {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                  {(() => {
                    const selectedStudentData = filteredStudents.filter(s => selectedStudents.includes(s.application_id));
                    const allSelected = selectedStudentData.every(s => s.application_status === 'selected');
                    if (allSelected && selectedStudentData.length > 0) {
                      return <span className="ml-2 text-sm text-green-600">(All already selected)</span>;
                    }
                    return null;
                  })()}
                </p>
                <div className="flex gap-2">
                  {(() => {
                    const selectedStudentData = filteredStudents.filter(s => selectedStudents.includes(s.application_id));
                    const allSelected = selectedStudentData.every(s => s.application_status === 'selected');

                    // Hide action buttons if all selected students are already marked as selected
                    if (allSelected && selectedStudentData.length > 0) {
                      return (
                        <>
                          <p className="text-sm text-gray-600 self-center mr-2">
                            These students are already marked as selected
                          </p>
                          <button
                            onClick={() => setSelectedStudents([])}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-bold"
                          >
                            Clear Selection
                          </button>
                        </>
                      );
                    }

                    return (
                      <>
                        <button
                          onClick={() => handleBulkStatusUpdate('under_review')}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-bold"
                        >
                          Mark Under Review
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('shortlisted')}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold"
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('selected')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-bold"
                        >
                          Mark Selected
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('rejected')}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-bold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setSelectedStudents([])}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-bold"
                        >
                          Clear Selection
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Manually Add Student Button */}
          <div className="mb-6 mt-8">
            <button
              onClick={() => setShowManualAddModal(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 w-full sm:w-auto"
            >
              <UserPlus size={18} />
              <span>Manually Add Student</span>
            </button>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              Add students who didn't apply but got selected during the drive
            </p>
          </div>

          {/* Enhanced Filters */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowEnhancedFilters(!showEnhancedFilters);
                // Close export dropdown when filters open
                if (!showEnhancedFilters) {
                  setShowExportDropdown(false);
                }
              }}
              className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 border-2 border-gray-200 hover:border-blue-300 w-full sm:w-auto"
            >
              <Filter size={18} />
              <span>Filter by Status & Profile</span>
              {(enhancedFilters.applicationStatuses.length > 0 ||
                enhancedFilters.sslcMin ||
                enhancedFilters.twelfthMin ||
                enhancedFilters.district ||
                enhancedFilters.hasPassport !== null ||
                enhancedFilters.hasAadhar !== null ||
                enhancedFilters.hasDrivingLicense !== null ||
                enhancedFilters.hasPan !== null ||
                enhancedFilters.heightMin ||
                enhancedFilters.weightMin ||
                enhancedFilters.physicallyHandicapped !== null) && (
                <span className="bg-blue-600 text-white px-3 py-1 text-xs rounded-full font-bold">
                  Active
                </span>
              )}
              {showEnhancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showEnhancedFilters && (
              <div className="mt-4">
                <EnhancedFilterPanel
                  filters={enhancedFilters}
                  onChange={handleEnhancedFiltersChange}
                  onClear={clearEnhancedFilters}
                />
              </div>
            )}
          </div>

          {/* Advanced Filters (Legacy) */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowAdvancedFilters(!showAdvancedFilters);
                // Close export dropdown when filters open
                if (!showAdvancedFilters) {
                  setShowExportDropdown(false);
                }
              }}
              className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 border-2 border-gray-200 hover:border-blue-300"
            >
              <Filter size={18} />
              <span>Additional Filters</span>
              {hasActiveFilters() && (
                <span className="bg-blue-600 text-white px-3 py-1 text-xs rounded-full font-bold">
                  Active
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvancedFilters && (
              <GlassCard variant="elevated" className="mt-4 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Additional Min CGPA</label>
                    <input
                      type="number"
                      value={advancedFilters.cgpaMin}
                      onChange={(e) => handleAdvancedFilterChange('cgpaMin', e.target.value)}
                      placeholder="e.g., 7.0"
                      min="0"
                      max="10"
                      step="0.1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Additional Max CGPA</label>
                    <input
                      type="number"
                      value={advancedFilters.cgpaMax}
                      onChange={(e) => handleAdvancedFilterChange('cgpaMax', e.target.value)}
                      placeholder="e.g., 9.0"
                      min="0"
                      max="10"
                      step="0.1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Max Backlogs (Stricter)</label>
                    <input
                      type="number"
                      value={advancedFilters.maxBacklogs}
                      onChange={(e) => handleAdvancedFilterChange('maxBacklogs', e.target.value)}
                      placeholder="e.g., 0 for no backlogs"
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth (From)</label>
                    <input
                      type="date"
                      value={advancedFilters.dobFrom}
                      onChange={(e) => handleAdvancedFilterChange('dobFrom', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth (To)</label>
                    <input
                      type="date"
                      value={advancedFilters.dobTo}
                      onChange={(e) => handleAdvancedFilterChange('dobTo', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-bold">
                    Showing {filteredStudents.length} applicants
                  </span>
                  <button
                    onClick={clearAdvancedFilters}
                    className="bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105 disabled:opacity-50"
                    disabled={!hasActiveFilters()}
                  >
                    Clear Filters
                  </button>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Job Applicants Table - Normal (non-placed) students only */}
          <GlassCard variant="elevated" className="overflow-hidden p-0">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2 mr-3 shadow-lg">
                  <Users className="text-white" size={24} />
                </div>
                Job Applicants ({filteredStudents.filter(s => !s.is_already_placed).length})
              </h2>
              <AutoRefreshIndicator
                lastRefreshed={lastRefreshed}
                autoRefreshEnabled={autoRefreshEnabled}
                onToggle={toggleAutoRefresh}
                onManualRefresh={manualRefresh}
                refreshing={refreshing}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={filteredStudents.filter(s => !s.is_already_placed).length > 0 && selectedStudents.length === filteredStudents.filter(s => !s.is_already_placed).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(filteredStudents.filter(s => !s.is_already_placed).map(s => s.application_id));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-white"
                      />
                    </th>
                    <th className="px-6 py-4 text-left font-bold">PRN</th>
                    <th className="px-6 py-4 text-left font-bold">Name</th>
                    {isHost && <th className="px-6 py-4 text-left font-bold">College</th>}
                    <th className="px-6 py-4 text-left font-bold">Branch</th>
                    <th className="px-6 py-4 text-left font-bold">CGPA</th>
                    <th className="px-6 py-4 text-left font-bold">Backlogs</th>
                    <th className="px-6 py-4 text-left font-bold">Status</th>
                    <th className="px-6 py-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={isHost ? 9 : 8} className="text-center py-12">
                        <div className="spinner mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading applicants...</p>
                      </td>
                    </tr>
                  ) : filteredStudents.filter(s => !s.is_already_placed).length === 0 ? (
                    <tr>
                      <td colSpan={isHost ? 9 : 8} className="text-center text-gray-500 py-12 font-medium text-lg">
                        No students match the current filters
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.filter(s => !s.is_already_placed).map((student, index) => (
                      <tr key={student.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.application_id)}
                            onChange={() => handleSelectStudent(student.application_id)}
                            className="w-4 h-4 rounded border-2 border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">{student.prn}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                        {isHost && <td className="px-6 py-4 font-medium text-indigo-700">{student.college_name}</td>}
                        <td className="px-6 py-4 font-medium text-gray-700">{student.branch}</td>
                        <td className="px-6 py-4 font-bold text-green-600 text-lg">{student.cgpa}</td>
                        <td className="px-6 py-4">
                          {student.backlog_count > 0 ? (
                            <span className="text-orange-600 font-bold text-lg">{student.backlog_count}</span>
                          ) : (
                            <span className="text-green-600 font-bold flex items-center text-lg">
                              <Check size={20} className="mr-1" /> 0
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={student.application_status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                setSelectedApplicationId(student.application_id);
                                setShowStudentDetail(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Details"
                            >
                              <Eye size={20} />
                            </button>
                            {student.application_status === 'selected' && (
                              <button
                                onClick={() => {
                                  setSelectedApplication({ ...student, id: student.application_id });
                                  setShowPlacementForm(true);
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Add/Edit Placement Details"
                              >
                                <DollarSign size={20} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Already Placed but Applied Students */}
          {filteredStudents.filter(s => s.is_already_placed).length > 0 && (
            <GlassCard variant="elevated" className="mt-6 overflow-hidden p-0">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-2 mr-3 shadow-lg">
                    <AlertTriangle className="text-white" size={24} />
                  </div>
                  Already Placed but Applied ({filteredStudents.filter(s => s.is_already_placed).length})
                </h2>
                <p className="text-sm text-amber-700 font-medium">
                  These students are already selected in another company
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">PRN</th>
                      <th className="px-6 py-4 text-left font-bold">Name</th>
                      {isHost && <th className="px-6 py-4 text-left font-bold">College</th>}
                      <th className="px-6 py-4 text-left font-bold">Branch</th>
                      <th className="px-6 py-4 text-left font-bold">CGPA</th>
                      <th className="px-6 py-4 text-left font-bold">Backlogs</th>
                      <th className="px-6 py-4 text-left font-bold">Status</th>
                      <th className="px-6 py-4 text-left font-bold">Already Placed At</th>
                      <th className="px-6 py-4 text-left font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.filter(s => s.is_already_placed).map((student, index) => (
                      <tr key={student.id} className={`border-b border-gray-200 hover:bg-amber-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">{student.prn}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                        {isHost && <td className="px-6 py-4 font-medium text-indigo-700">{student.college_name}</td>}
                        <td className="px-6 py-4 font-medium text-gray-700">{student.branch}</td>
                        <td className="px-6 py-4 font-bold text-green-600 text-lg">{student.cgpa}</td>
                        <td className="px-6 py-4">
                          {student.backlog_count > 0 ? (
                            <span className="text-orange-600 font-bold text-lg">{student.backlog_count}</span>
                          ) : (
                            <span className="text-green-600 font-bold flex items-center text-lg">
                              <Check size={20} className="mr-1" /> 0
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={student.application_status} />
                        </td>
                        <td className="px-6 py-4">
                          {student.previous_placements && student.previous_placements.map((p, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-bold text-amber-700">{p.company_name}</span>
                              {p.placement_package && (
                                <span className="text-gray-600 ml-1">({p.placement_package} LPA)</span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                setSelectedApplicationId(student.application_id);
                                setShowStudentDetail(true);
                              }}
                              className="text-amber-600 hover:text-amber-800 transition-colors"
                              title="View Details"
                            >
                              <Eye size={20} />
                            </button>
                            {student.application_status === 'selected' && (
                              <button
                                onClick={() => {
                                  setSelectedApplication({ ...student, id: student.application_id });
                                  setShowPlacementForm(true);
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Add/Edit Placement Details"
                              >
                                <DollarSign size={20} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Selected Students Summary Section */}
          {filteredStudents.filter(s => s.application_status === 'selected').length > 0 && (
            <GlassCard variant="elevated" className="mt-6 overflow-hidden p-0">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-2 mr-3 shadow-lg">
                    <UserCheck className="text-white" size={24} />
                  </div>
                  Selected Students ({filteredStudents.filter(s => s.application_status === 'selected').length})
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        setExporting(true);
                        const loadingToast = toast.loading('Exporting selected students...');

                        // Create export data with only selected students
                        const exportData = {
                          format: 'excel',
                          application_statuses: ['selected'],
                        };

                        const response = await placementOfficerAPI.enhancedExportJobApplicants(selectedJob.id, exportData);

                        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const fileName = `selected_students_${selectedJob.job_title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
                        link.setAttribute('download', fileName);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(url);

                        toast.dismiss(loadingToast);
                        toast.success('Exported selected students as Excel');
                      } catch (error) {
                        console.error('Export error:', error);
                        toast.error('Failed to export selected students');
                      } finally {
                        setExporting(false);
                      }
                    }}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                    disabled={exporting}
                  >
                    <FileSpreadsheet size={18} />
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setPdfExportType('selected_only');
                      setShowPDFFieldSelector(true);
                    }}
                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-red-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                    disabled={exporting}
                  >
                    <FileText size={18} />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">PRN</th>
                      <th className="px-6 py-4 text-left font-bold">Name</th>
                      {isHost && <th className="px-6 py-4 text-left font-bold">College</th>}
                      <th className="px-6 py-4 text-left font-bold">Branch</th>
                      <th className="px-6 py-4 text-left font-bold">CGPA</th>
                      <th className="px-6 py-4 text-left font-bold">Backlogs</th>
                      <th className="px-6 py-4 text-left font-bold">Status</th>
                      <th className="px-6 py-4 text-left font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents
                      .filter(s => s.application_status === 'selected')
                      .map((student, index) => (
                        <tr key={student.id} className={`border-b border-gray-200 hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">{student.prn}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{student.name}</td>
                          {isHost && <td className="px-6 py-4 font-medium text-indigo-700">{student.college_name}</td>}
                          <td className="px-6 py-4 font-medium text-gray-700">{student.branch}</td>
                          <td className="px-6 py-4 font-bold text-green-600 text-lg">{student.cgpa}</td>
                          <td className="px-6 py-4">
                            {student.backlog_count > 0 ? (
                              <span className="text-orange-600 font-bold text-lg">{student.backlog_count}</span>
                            ) : (
                              <span className="text-green-600 font-bold flex items-center text-lg">
                                <Check size={20} className="mr-1" /> 0
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={student.application_status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudentId(student.id);
                                  setSelectedApplicationId(student.application_id);
                                  setShowStudentDetail(true);
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="View Details"
                              >
                                <Eye size={20} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApplication({ ...student, id: student.application_id });
                                  setShowPlacementForm(true);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                                title="Add/Edit Placement Details"
                              >
                                <DollarSign size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </AnimatedSection>
      )}

      {/* Modals */}
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
      />

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onSubmit={handleDriveSubmit}
        initialData={driveData}
        jobTitle={selectedJob?.job_title}
      />

      <PlacementDetailsForm
        isOpen={showPlacementForm}
        onClose={() => {
          setShowPlacementForm(false);
          setSelectedApplication(null);
        }}
        onSubmit={handleUpdatePlacement}
        application={selectedApplication}
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          onExport={handlePDFExportWithFields}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={
            pdfExportType === 'selected_only'
              ? filteredStudents.filter(s => s.application_status === 'selected').length
              : filteredStudents.length
          }
          exportType={pdfExportType}
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
      />

      {/* Edit Job Modal (host POs only) */}
      {showEditJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit size={20} className="text-indigo-600" />
                Edit Job
              </h2>
              <button onClick={() => setShowEditJobModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Job Title *</label>
                  <input type="text" value={editJobData.title || ''} onChange={(e) => setEditJobData({ ...editJobData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Company Name *</label>
                  <input type="text" value={editJobData.company_name || ''} onChange={(e) => setEditJobData({ ...editJobData, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input type="text" value={editJobData.location || ''} onChange={(e) => setEditJobData({ ...editJobData, location: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Salary Package</label>
                  <input type="text" value={editJobData.salary_package || ''} onChange={(e) => setEditJobData({ ...editJobData, salary_package: e.target.value })}
                    placeholder="e.g., 6 LPA" className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">No. of Vacancies</label>
                  <input type="number" min="1" value={editJobData.no_of_vacancies || ''} onChange={(e) => setEditJobData({ ...editJobData, no_of_vacancies: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Application Deadline *</label>
                  <input type="date" value={editJobData.application_deadline || ''} onChange={(e) => setEditJobData({ ...editJobData, application_deadline: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Min CGPA</label>
                  <input type="number" step="0.01" min="0" max="10" value={editJobData.min_cgpa || ''} onChange={(e) => setEditJobData({ ...editJobData, min_cgpa: e.target.value })}
                    placeholder="e.g., 6.5" className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Backlogs Allowed</label>
                  <input type="number" min="0" value={editJobData.max_backlogs || ''} onChange={(e) => setEditJobData({ ...editJobData, max_backlogs: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Application Form URL</label>
                <input type="url" value={editJobData.application_form_url || ''} onChange={(e) => setEditJobData({ ...editJobData, application_form_url: e.target.value })}
                  placeholder="https://..." className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Job Description *</label>
                <textarea rows={4} value={editJobData.description || ''} onChange={(e) => setEditJobData({ ...editJobData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium resize-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Allowed Backlog Semesters <span className="text-gray-400 font-normal">(leave unchecked = any semester)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <label key={sem} className="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-indigo-50 transition-colors">
                      <input type="checkbox"
                        checked={(editJobData.allowed_backlog_semesters || []).includes(sem)}
                        onChange={() => {
                          const current = editJobData.allowed_backlog_semesters || [];
                          const updated = current.includes(sem) ? current.filter((s) => s !== sem) : [...current, sem].sort((a, b) => a - b);
                          setEditJobData({ ...editJobData, allowed_backlog_semesters: updated });
                        }}
                        className="rounded text-indigo-600" />
                      <span className="text-sm font-medium">Sem {sem}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowEditJobModal(false)} className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleEditJobSave} disabled={editJobLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {editJobLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

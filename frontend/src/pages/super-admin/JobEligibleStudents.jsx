import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Briefcase, Users, Download, Filter, ChevronDown, ChevronUp, Check, X, FileSpreadsheet, FileText, Eye, Calendar, Send, BarChart3, UserCheck, UserPlus } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import StudentDetailModal from '../../components/StudentDetailModal';
import DriveScheduleModal from '../../components/DriveScheduleModal';
import EnhancedFilterPanel from '../../components/EnhancedFilterPanel';
import PlacementDetailsForm from '../../components/PlacementDetailsForm';
import PDFFieldSelector from '../../components/PDFFieldSelector';
import ManualStudentAdditionModal from '../../components/ManualStudentAdditionModal';

export default function JobEligibleStudents() {
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportFilters, setShowExportFilters] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    selectedColleges: [],
    selectedBranches: [],
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
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPDFFieldSelector, setShowPDFFieldSelector] = useState(false);
  const [pdfExportType, setPdfExportType] = useState('basic'); // 'basic' or 'enhanced'
  const [showManualAddModal, setShowManualAddModal] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchColleges();
    fetchBranches();
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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getJobs();
      // Filter to show only active jobs
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const response = await superAdminAPI.getPlacementOfficers();
      // Extract unique colleges
      const uniqueColleges = [];
      const collegeMap = new Map();
      response.data.data.forEach((officer) => {
        if (!collegeMap.has(officer.college_id)) {
          collegeMap.set(officer.college_id, {
            id: officer.college_id,
            name: officer.college_name,
          });
        }
      });
      setColleges(Array.from(collegeMap.values()));
    } catch (error) {
      console.error('Failed to load colleges:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await superAdminAPI.getNormalizedBranches();
      setBranches(response.data.data || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const fetchJobApplicants = async () => {
    try {
      setLoadingStudents(true);
      const response = await superAdminAPI.getJobApplicants(selectedJob.id);
      // These are students who have APPLIED to this job across all colleges
      setStudents(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load job applicants');
      console.error('Failed to load applicants:', error);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleJobSelect = async (job) => {
    setSelectedJob(job);
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

    // Sort: selected students first, then by other statuses
    filtered.sort((a, b) => {
      const statusOrder = { 'selected': 0, 'shortlisted': 1, 'under_review': 2, 'submitted': 3, 'rejected': 4 };
      const aOrder = statusOrder[a.application_status] ?? 999;
      const bOrder = statusOrder[b.application_status] ?? 999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // If same status, sort by CGPA descending
      return parseFloat(b.cgpa || 0) - parseFloat(a.cgpa || 0);
    });

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

    // Sort: selected students first, then by other statuses
    filtered.sort((a, b) => {
      const statusOrder = { 'selected': 0, 'shortlisted': 1, 'under_review': 2, 'submitted': 3, 'rejected': 4 };
      const aOrder = statusOrder[a.application_status] ?? 999;
      const bOrder = statusOrder[b.application_status] ?? 999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // If same status, sort by CGPA descending
      return parseFloat(b.cgpa || 0) - parseFloat(a.cgpa || 0);
    });

    setFilteredStudents(filtered);
  };

  const handleSelectStudent = (applicationId) => {
    setSelectedStudents((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.application_id));
    }
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

  const handleStatusUpdate = async (applicationId, status, notes) => {
    try {
      await superAdminAPI.updateApplicationStatus(applicationId, {
        status,
        review_notes: notes,
      });
      toast.success('Status updated successfully');
      fetchJobApplicants();
      fetchPlacementStats();
    } catch (error) {
      toast.error('Failed to update status');
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

  const handlePlacementUpdate = async (placementData) => {
    if (!selectedApplication) return;

    try {
      await superAdminAPI.updatePlacementDetails(selectedApplication.application_id, placementData);
      toast.success('Placement details updated successfully');
      setShowPlacementForm(false);
      setSelectedApplication(null);
      fetchJobApplicants();
      fetchPlacementStats();
    } catch (error) {
      toast.error('Failed to update placement details');
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

  const handlePDFExportWithFields = async (selectedFields) => {
    try {
      setExporting(true);
      setShowPDFFieldSelector(false);
      const loadingToast = toast.loading('Preparing PDF export...');

      const exportData = {
        format: 'pdf',
        pdf_fields: selectedFields,
        college_ids: exportFilters.selectedColleges.length > 0 ? exportFilters.selectedColleges : undefined,
        branches: exportFilters.selectedBranches.length > 0 ? exportFilters.selectedBranches : undefined,
        application_statuses: enhancedFilters.applicationStatuses.length > 0 ? enhancedFilters.applicationStatuses : undefined,
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

  const toggleBranchSelection = (branch) => {
    setExportFilters((prev) => {
      const isSelected = prev.selectedBranches.includes(branch);
      return {
        ...prev,
        selectedBranches: isSelected
          ? prev.selectedBranches.filter((b) => b !== branch)
          : [...prev.selectedBranches, branch],
      };
    });
  };

  const clearExportFilters = () => {
    setExportFilters({
      selectedColleges: [],
      selectedBranches: [],
    });
  };

  const hasExportFilters = () => {
    return exportFilters.selectedColleges.length > 0 || exportFilters.selectedBranches.length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Users className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Job Applicants
              </h1>
              <p className="text-cyan-100 text-lg">
                View and download list of students who have applied to each job across all colleges
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl mr-3">
            <Briefcase className="text-white" size={20} />
          </div>
          Select a Job
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.length === 0 ? (
            <p className="text-gray-500 col-span-full">No active jobs available</p>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => handleJobSelect(job)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedJob?.id === job.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{job.job_title}</h3>
                <p className="text-sm text-gray-600">{job.company_name}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {job.min_cgpa && <p>Min CGPA: {job.min_cgpa}</p>}
                  {job.max_backlogs !== null && <p>Max Backlogs: {job.max_backlogs}</p>}
                  <p className="text-primary-600 font-medium">
                    Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedJob && (
        <>
          {loadingStudents ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading students...</span>
            </div>
          ) : (
            <>
              {/* Selected Job Info */}
              <div className="card mb-6 bg-gradient-to-r from-primary-50 to-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedJob.job_title}</h2>
                    <p className="text-gray-700">{selectedJob.company_name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      {selectedJob.min_cgpa && (
                        <span className="badge badge-info">Min CGPA: {selectedJob.min_cgpa}</span>
                      )}
                      {selectedJob.max_backlogs !== null && (
                        <span className="badge badge-info">Max Backlogs: {selectedJob.max_backlogs}</span>
                      )}
                      {selectedJob.allowed_branches && selectedJob.allowed_branches.length > 0 && (
                        <span className="badge badge-info">
                          {selectedJob.allowed_branches.length} Branch(es)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Export Filters Toggle */}
                    <button
                      onClick={() => setShowExportFilters(!showExportFilters)}
                      className="btn btn-secondary flex items-center space-x-2"
                      disabled={filteredStudents.length === 0}
                    >
                      <Filter size={18} />
                      <span>Export Filters</span>
                      {hasExportFilters() && (
                        <span className="bg-primary-600 text-white px-2 py-0.5 text-xs rounded-full">
                          {exportFilters.selectedColleges.length + exportFilters.selectedBranches.length}
                        </span>
                      )}
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowExportDropdown(!showExportDropdown);
                          if (!showExportDropdown) {
                            setShowEnhancedFilters(false);
                            setShowAdvancedFilters(false);
                          }
                        }}
                        disabled={filteredStudents.length === 0 || exporting}
                        className="btn btn-primary flex items-center space-x-2"
                      >
                        <Download size={18} />
                        <span>{exporting ? 'Exporting...' : 'Export'}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Export Format Dropdown */}
                      {showExportDropdown && !exporting && (
                        <>
                          <div
                            className="fixed inset-0 bg-black/20 z-[100]"
                            onClick={() => setShowExportDropdown(false)}
                          ></div>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[110]">
                            <button
                              onClick={handleExport}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors rounded-lg"
                            >
                              <FileText size={18} className="text-red-600" />
                              <div>
                                <div className="font-medium text-gray-900">Export as PDF</div>
                                <div className="text-xs text-gray-500">Comprehensive report with field selection</div>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Filters Panel */}
              {showExportFilters && (
                <div className="card mb-6 p-6 bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Filter size={20} className="mr-2" />
                      Advanced Export Filters
                    </h3>
                    <button
                      onClick={clearExportFilters}
                      className="btn btn-secondary btn-sm"
                      disabled={!hasExportFilters()}
                    >
                      Clear All
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Select specific colleges and branches to filter the export. Leave empty to export all displayed applicants.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* College Filter */}
                    <div>
                      <label className="label font-semibold mb-3">Filter by Colleges</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                        {colleges.map((college) => (
                          <label
                            key={college.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={exportFilters.selectedColleges.includes(college.id)}
                              onChange={() => toggleCollegeSelection(college.id)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{college.name}</span>
                          </label>
                        ))}
                      </div>
                      {exportFilters.selectedColleges.length > 0 && (
                        <p className="text-xs text-primary-600 mt-2">
                          {exportFilters.selectedColleges.length} college(s) selected
                        </p>
                      )}
                    </div>

                    {/* Branch Filter */}
                    <div>
                      <label className="label font-semibold mb-3">Filter by Branches</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                        {branches.map((branch) => (
                          <label
                            key={branch.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={exportFilters.selectedBranches.includes(branch.normalized_name)}
                              onChange={() => toggleBranchSelection(branch.normalized_name)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{branch.branch_name}</span>
                          </label>
                        ))}
                      </div>
                      {exportFilters.selectedBranches.length > 0 && (
                        <p className="text-xs text-primary-600 mt-2">
                          {exportFilters.selectedBranches.length} branch(es) selected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Filters */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowAdvancedFilters(!showAdvancedFilters);
                    if (!showAdvancedFilters) {
                      setShowExportDropdown(false);
                    }
                  }}
                  className="btn btn-secondary flex items-center space-x-2 mb-3"
                >
                  <Filter size={18} />
                  <span>Additional Filters</span>
                  {hasActiveFilters() && (
                    <span className="bg-primary-600 text-white px-2 py-0.5 text-xs rounded-full">
                      Active
                    </span>
                  )}
                  {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvancedFilters && (
                  <div className="card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* CGPA Range */}
                      <div>
                        <label className="label text-sm">Additional Min CGPA</label>
                        <input
                          type="number"
                          value={advancedFilters.cgpaMin}
                          onChange={(e) => handleAdvancedFilterChange('cgpaMin', e.target.value)}
                          placeholder="e.g., 7.0"
                          min="0"
                          max="10"
                          step="0.1"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label text-sm">Additional Max CGPA</label>
                        <input
                          type="number"
                          value={advancedFilters.cgpaMax}
                          onChange={(e) => handleAdvancedFilterChange('cgpaMax', e.target.value)}
                          placeholder="e.g., 9.0"
                          min="0"
                          max="10"
                          step="0.1"
                          className="input"
                        />
                      </div>

                      {/* Backlog Count */}
                      <div>
                        <label className="label text-sm">Max Backlogs (Stricter)</label>
                        <input
                          type="number"
                          value={advancedFilters.maxBacklogs}
                          onChange={(e) => handleAdvancedFilterChange('maxBacklogs', e.target.value)}
                          placeholder="e.g., 0 for no backlogs"
                          min="0"
                          className="input"
                        />
                      </div>

                      {/* College Filter */}
                      <div>
                        <label className="label text-sm">Filter by College</label>
                        <select
                          value={advancedFilters.collegeId}
                          onChange={(e) => handleAdvancedFilterChange('collegeId', e.target.value)}
                          className="input"
                        >
                          <option value="">All Colleges</option>
                          {colleges.map((college) => (
                            <option key={college.id} value={college.id}>
                              {college.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* DOB Range */}
                      <div>
                        <label className="label text-sm">Date of Birth (From)</label>
                        <input
                          type="date"
                          value={advancedFilters.dobFrom}
                          onChange={(e) => handleAdvancedFilterChange('dobFrom', e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label text-sm">Date of Birth (To)</label>
                        <input
                          type="date"
                          value={advancedFilters.dobTo}
                          onChange={(e) => handleAdvancedFilterChange('dobTo', e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>

                    {/* Filter Actions */}
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={clearAdvancedFilters}
                        className="btn btn-secondary"
                        disabled={!hasActiveFilters()}
                      >
                        Clear Filters
                      </button>
                      <div className="text-sm text-gray-600 self-center">
                        Showing {filteredStudents.length} applicants
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manually Add Student Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowManualAddModal(true)}
                  className="btn btn-success flex items-center space-x-2"
                >
                  <UserPlus size={18} />
                  <span>Manually Add Student</span>
                </button>
                <p className="text-xs text-gray-600 mt-2">
                  Add students who didn't apply but got selected during the drive
                </p>
              </div>

              {/* Enhanced Filters Toggle */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowEnhancedFilters(!showEnhancedFilters);
                    if (!showEnhancedFilters) {
                      setShowExportDropdown(false);
                    }
                  }}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <Filter size={18} />
                  <span>Filter by Status & Profile</span>
                  {showEnhancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showEnhancedFilters && (
                <div className="mb-6">
                  <EnhancedFilterPanel
                    filters={enhancedFilters}
                    onChange={(newFilters) => setEnhancedFilters(newFilters)}
                    onClear={() =>
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
                      })
                    }
                  />
                </div>
              )}

              {/* Placement Statistics */}
              {placementStats && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">
                      {placementStats.overall.total_applications}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-700">
                      {placementStats.overall.under_review_count}
                    </div>
                    <div className="text-sm text-gray-600">Under Review</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">
                      {placementStats.overall.shortlisted_count}
                    </div>
                    <div className="text-sm text-gray-600">Shortlisted</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                      {placementStats.overall.selected_count}
                    </div>
                    <div className="text-sm text-gray-600">Selected</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="text-2xl font-bold text-red-700">
                      {placementStats.overall.rejected_count}
                    </div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                  {placementStats.overall.avg_package && (
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="text-2xl font-bold text-indigo-700">
                        {parseFloat(placementStats.overall.avg_package).toFixed(2)} LPA
                      </div>
                      <div className="text-sm text-gray-600">Avg Package</div>
                    </div>
                  )}
                </div>
              )}

              {/* Drive Schedule Section */}
              <div className="mb-6">
                {driveData ? (
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-green-800 flex items-center">
                        <Calendar size={20} className="mr-2" />
                        Drive Scheduled
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDriveModal(true)}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit Schedule
                        </button>
                        <button
                          onClick={() => handleNotifyStudents('drive_scheduled')}
                          className="btn btn-sm btn-primary flex items-center gap-1"
                        >
                          <Send size={16} />
                          Notify Shortlisted
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Date:</span>{' '}
                        {new Date(driveData.drive_date).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div>
                        <span className="font-semibold">Time:</span> {driveData.drive_time}
                      </div>
                      <div>
                        <span className="font-semibold">Location:</span> {driveData.drive_location}
                      </div>
                    </div>
                    {driveData.additional_instructions && (
                      <div className="mt-3 text-sm">
                        <span className="font-semibold">Instructions:</span>{' '}
                        {driveData.additional_instructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDriveModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Calendar size={18} />
                    Schedule Placement Drive
                  </button>
                )}
              </div>

              {/* Bulk Actions Bar */}
              {selectedStudents.length > 0 && (
                <div className="mb-6 bg-indigo-50 rounded-lg p-4 border-2 border-indigo-300">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="font-semibold text-indigo-900">
                      {selectedStudents.length} student(s) selected
                      {(() => {
                        const selectedStudentData = filteredStudents.filter(s => selectedStudents.includes(s.application_id));
                        const allSelected = selectedStudentData.every(s => s.application_status === 'selected');
                        if (allSelected && selectedStudentData.length > 0) {
                          return <span className="ml-2 text-sm text-green-700">(All already selected)</span>;
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const selectedStudentData = filteredStudents.filter(s => selectedStudents.includes(s.application_id));
                        const allSelected = selectedStudentData.every(s => s.application_status === 'selected');

                        // Hide action buttons if all selected students are already marked as selected
                        if (allSelected && selectedStudentData.length > 0) {
                          return (
                            <>
                              <p className="text-sm text-gray-700 self-center mr-2">
                                These students are already marked as selected
                              </p>
                              <button
                                onClick={() => setSelectedStudents([])}
                                className="btn btn-sm btn-secondary"
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
                              className="btn btn-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              Mark Under Review
                            </button>
                            <button
                              onClick={() => handleBulkStatusUpdate('shortlisted')}
                              className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Shortlist
                            </button>
                            <button
                              onClick={() => handleBulkStatusUpdate('selected')}
                              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white"
                            >
                              Mark Selected
                            </button>
                            <button
                              onClick={() => handleBulkStatusUpdate('rejected')}
                              className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleNotifyStudents('shortlisted')}
                              className="btn btn-sm btn-primary flex items-center gap-1"
                            >
                              <Send size={16} />
                              Notify
                            </button>
                            <button
                              onClick={() => setSelectedStudents([])}
                              className="btn btn-sm btn-secondary"
                            >
                              Clear Selection
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Job Applicants Table */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
                  <h2 className="text-2xl font-bold flex items-center text-gray-900">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl mr-3">
                      <Users className="text-white" size={20} />
                    </div>
                    Job Applicants ({filteredStudents.length})
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th>PRN</th>
                        <th>Name</th>
                        <th>College</th>
                        <th>Branch</th>
                        <th>CGPA</th>
                        <th>Backlogs</th>
                        <th>Status</th>
                        <th>DOB</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="12" className="text-center text-gray-500 py-8">
                            No students have applied to this job yet
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.application_id)}
                                onChange={() => handleSelectStudent(student.application_id)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="font-mono font-semibold">{student.prn}</td>
                            <td className="font-medium">{student.name}</td>
                            <td className="text-sm">{student.college_name}</td>
                            <td className="text-sm">{student.branch}</td>
                            <td className="font-semibold text-green-600">{student.cgpa}</td>
                            <td>
                              {student.backlog_count > 0 ? (
                                <span className="text-orange-600 font-semibold">{student.backlog_count}</span>
                              ) : (
                                <span className="text-green-600 font-semibold flex items-center">
                                  <Check size={16} className="mr-1" /> 0
                                </span>
                              )}
                            </td>
                            <td>
                              <StatusBadge status={student.application_status} />
                            </td>
                            <td className="text-sm">
                              {student.date_of_birth
                                ? new Date(student.date_of_birth).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="text-sm">{student.email}</td>
                            <td className="text-sm">{student.mobile_number || '-'}</td>
                            <td>
                              <button
                                onClick={() => handleViewStudentDetail(student)}
                                className="btn btn-sm btn-primary"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Students Summary Section */}
              {filteredStudents.filter(s => s.application_status === 'selected').length > 0 && (
                <div className="mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center text-gray-900">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mr-3">
                        <UserCheck className="text-white" size={20} />
                      </div>
                      Selected Students ({filteredStudents.filter(s => s.application_status === 'selected').length})
                    </h2>
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

                          const response = await superAdminAPI.enhancedExportJobApplicants(selectedJob.id, exportData);

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
                          toast.success('Exported selected students successfully');
                        } catch (error) {
                          console.error('Export error:', error);
                          toast.error('Failed to export selected students');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      className="btn btn-primary flex items-center gap-2"
                      disabled={exporting}
                    >
                      <Download size={18} />
                      <span>Export Selected</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>PRN</th>
                          <th>Name</th>
                          <th>College</th>
                          <th>Branch</th>
                          <th>CGPA</th>
                          <th>Backlogs</th>
                          <th>Status</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents
                          .filter(s => s.application_status === 'selected')
                          .map((student) => (
                            <tr key={student.id}>
                              <td className="font-mono font-semibold">{student.prn}</td>
                              <td className="font-medium">{student.name}</td>
                              <td className="text-sm">{student.college_name}</td>
                              <td className="text-sm">{student.branch}</td>
                              <td className="font-semibold text-green-600">{student.cgpa}</td>
                              <td>
                                {student.backlog_count > 0 ? (
                                  <span className="text-orange-600 font-semibold">{student.backlog_count}</span>
                                ) : (
                                  <span className="text-green-600 font-semibold flex items-center">
                                    <Check size={16} className="mr-1" /> 0
                                  </span>
                                )}
                              </td>
                              <td>
                                <StatusBadge status={student.application_status} />
                              </td>
                              <td className="text-sm">{student.email}</td>
                              <td>
                                <button
                                  onClick={() => handleViewStudentDetail(student)}
                                  className="btn btn-sm btn-primary"
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
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
      />

      <DriveScheduleModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onSave={handleScheduleDrive}
        existingDrive={driveData}
        jobTitle={selectedJob?.job_title}
      />

      {showPDFFieldSelector && (
        <PDFFieldSelector
          onExport={handlePDFExportWithFields}
          onClose={() => setShowPDFFieldSelector(false)}
          applicantCount={filteredStudents.length}
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
        api={superAdminAPI}
        userRole="super-admin"
      />
    </div>
  );
}

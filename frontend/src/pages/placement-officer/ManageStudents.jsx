import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import { passoutYearFromAcademicYear } from '../../utils/passoutYears';
import DesktopManageStudents from './students/DesktopManageStudents';
import TabletManageStudents from './students/TabletManageStudents';
import MobileManageStudents from './students/MobileManageStudents';
import StudentModals from './students/StudentModals';
import ExportModals, { EXPORT_FIELDS } from './students/ExportModals';
import {
  DesktopManageStudentsSkeleton,
  TabletManageStudentsSkeleton,
  MobileManageStudentsSkeleton,
} from './students/ManageStudentsSkeleton';

export default function ManageStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    blacklisted: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  // College branches
  const [collegeBranches, setCollegeBranches] = useState([]);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    backlogCount: '',
    dobFrom: '',
    dobTo: '',
    branch: '',
    heightMin: '',
    heightMax: '',
    weightMin: '',
    weightMax: '',
  });
  const [filterDocuments, setFilterDocuments] = useState({
    driving_license: '',
    pan_card: '',
    aadhar_card: '',
    passport: ''
  });
  const [filterDistricts, setFilterDistricts] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  // Archived (passed-out) students: deactivated by the year-end reset, kept for
  // reference/export.
  const [showArchived, setShowArchived] = useState(false);
  const [archivedYear, setArchivedYear] = useState('');
  const [archivedYears, setArchivedYears] = useState([]);

  // Bulk Selection
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctionRequirePhoto, setCorrectionRequirePhoto] = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [emailFixStudent, setEmailFixStudent] = useState(null);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [whitelistReason, setWhitelistReason] = useState('');

  // CGPA Lock/Unlock
  const [cgpaLocked, setCgpaLocked] = useState(true);
  const [cgpaUnlockWindow, setCgpaUnlockWindow] = useState(null);
  const [showCgpaUnlockModal, setShowCgpaUnlockModal] = useState(false);
  const [unlockDays, setUnlockDays] = useState(7);
  const [unlockReason, setUnlockReason] = useState('');
  const [cgpaProcessing, setCgpaProcessing] = useState(false);

  // Backlog Lock/Unlock
  const [backlogLocked, setBacklogLocked] = useState(true);
  const [backlogUnlockWindow, setBacklogUnlockWindow] = useState(null);
  const [showBacklogUnlockModal, setShowBacklogUnlockModal] = useState(false);
  const [backlogUnlockDays, setBacklogUnlockDays] = useState(7);
  const [backlogUnlockReason, setBacklogUnlockReason] = useState('');
  const [backlogProcessing, setBacklogProcessing] = useState(false);

  // Export state
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showExcelConfigModal, setShowExcelConfigModal] = useState(false);
  const [showPdfConfigModal, setShowPdfConfigModal] = useState(false);
  const [showCustomExportModal, setShowCustomExportModal] = useState(false);
  const [pdfCompanyName, setPdfCompanyName] = useState('');
  const [pdfDriveDate, setPdfDriveDate] = useState('');
  const [pdfIncludeSignature, setPdfIncludeSignature] = useState(false);
  const [pdfSeparateColleges, setPdfSeparateColleges] = useState(false);
  const [useBranchShortNames, setUseBranchShortNames] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Custom Export State
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportFields, setExportFields] = useState([]);
  const [exportBranches, setExportBranches] = useState([]);
  const [includePhotoUrl, setIncludePhotoUrl] = useState(false);
  const [customExportSettings, setCustomExportSettings] = useState({
    companyName: '',
    driveDate: '',
    includeSignature: false,
    useBranchShortNames: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && ['all', 'pending', 'approved', 'rejected', 'blacklisted'].includes(status)) {
      setActiveTab(status);
    }
  }, [location.search]);

  useEffect(() => {
    fetchCollegeBranches();
    fetchDistricts();
    fetchCgpaLockStatus();
    fetchBacklogLockStatus();
    fetchArchivedYears();
    // Tab counts are college-wide totals, so they are fetched once here and
    // then only after an action that moves a student between tabs — never on
    // a search or filter change. See refreshStudentsAndCounts.
    fetchStatusCounts();
  }, []);

  const fetchArchivedYears = async () => {
    try {
      const res = await placementOfficerAPI.getArchivedYears();
      setArchivedYears(res.data.data || []);
    } catch {
      // non-fatal
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await placementOfficerAPI.getAvailableDistricts();
      setAvailableDistricts(response.data.districts || []);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    }
  };

  // Debounce search input (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Page scroll is locked by components/Modal.jsx, which every dialog on this
  // page now goes through. This used to hold a second lock of its own, and the
  // two nested: the modal's lock recorded "hidden" as the value to restore,
  // because the page had already set it, so closing the dialog put the page
  // back to locked. Sidebar and tab bar still worked — they are fixed — which
  // made it look like scrolling itself had broken.

  useEffect(() => {
    fetchStudents();
  }, [currentPage, pageSize, activeTab, debouncedSearch, advancedFilters, filterDocuments, filterDistricts, showArchived, archivedYear]);

  const fetchCollegeBranches = async () => {
    try {
      const response = await placementOfficerAPI.getCollegeBranches();
      setCollegeBranches(response.data.data.branches || []);
    } catch (error) {
      console.error('Error fetching college branches:', error);
    }
  };

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    setSelectedStudents([]);
  }, [activeTab, debouncedSearch, advancedFilters, filterDocuments, filterDistricts]);

  const fetchCgpaLockStatus = async () => {
    try {
      const response = await placementOfficerAPI.getCgpaLockStatus();
      const data = response.data.data;
      setCgpaLocked(data.is_locked);
      setCgpaUnlockWindow(data.unlock_window);
    } catch {
      setCgpaLocked(true);
    }
  };

  const handleCgpaUnlock = async () => {
    if (unlockDays < 1 || unlockDays > 30) {
      toast.error('Duration must be between 1 and 30 days');
      return;
    }
    setCgpaProcessing(true);
    try {
      await placementOfficerAPI.unlockCgpa({
        unlock_days: unlockDays,
        reason: unlockReason || 'Semester results update',
      });
      toast.success(`CGPA editing unlocked for ${unlockDays} days`);
      setShowCgpaUnlockModal(false);
      setUnlockDays(7);
      setUnlockReason('');
      fetchCgpaLockStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock CGPA');
    } finally {
      setCgpaProcessing(false);
    }
  };

  const handleCgpaLock = async () => {
    setCgpaProcessing(true);
    try {
      await placementOfficerAPI.lockCgpa();
      toast.success('CGPA editing locked');
      fetchCgpaLockStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock CGPA');
    } finally {
      setCgpaProcessing(false);
    }
  };

  const fetchBacklogLockStatus = async () => {
    try {
      const response = await placementOfficerAPI.getBacklogLockStatus();
      const data = response.data.data;
      setBacklogLocked(data.is_locked);
      setBacklogUnlockWindow(data.unlock_window);
    } catch {
      setBacklogLocked(true);
    }
  };

  const handleBacklogUnlock = async () => {
    if (backlogUnlockDays < 1 || backlogUnlockDays > 30) {
      toast.error('Duration must be between 1 and 30 days');
      return;
    }
    setBacklogProcessing(true);
    try {
      await placementOfficerAPI.unlockBacklog({
        unlock_days: backlogUnlockDays,
        reason: backlogUnlockReason || 'Exam results update',
      });
      toast.success(`Backlog editing unlocked for ${backlogUnlockDays} days`);
      setShowBacklogUnlockModal(false);
      setBacklogUnlockDays(7);
      setBacklogUnlockReason('');
      fetchBacklogLockStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock backlog editing');
    } finally {
      setBacklogProcessing(false);
    }
  };

  const handleBacklogLock = async () => {
    setBacklogProcessing(true);
    try {
      await placementOfficerAPI.lockBacklog();
      toast.success('Backlog editing locked');
      fetchBacklogLockStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock backlog editing');
    } finally {
      setBacklogProcessing(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (advancedFilters.cgpaMin) {
        params.cgpa_min = advancedFilters.cgpaMin;
      }

      // Was never sent, and neither endpoint read it, so the Maximum CGPA box
      // did nothing: a min+max range silently applied only the min.
      if (advancedFilters.cgpaMax) {
        params.cgpa_max = advancedFilters.cgpaMax;
      }

      if (advancedFilters.backlogCount !== '') {
        params.backlog = advancedFilters.backlogCount;
      }

      if (advancedFilters.branch) {
        params.branch = advancedFilters.branch;
      }

      // DOB filters
      if (advancedFilters.dobFrom) {
        params.dob_from = advancedFilters.dobFrom;
        if (!advancedFilters.dobTo) {
          params.dob_to = new Date().toISOString().split('T')[0];
        }
      }
      if (advancedFilters.dobTo) {
        params.dob_to = advancedFilters.dobTo;
      }

      // Height filters
      if (advancedFilters.heightMin) params.height_min = advancedFilters.heightMin;
      if (advancedFilters.heightMax) params.height_max = advancedFilters.heightMax;

      // Weight filters
      if (advancedFilters.weightMin) params.weight_min = advancedFilters.weightMin;
      if (advancedFilters.weightMax) params.weight_max = advancedFilters.weightMax;

      // Document filters
      if (filterDocuments.driving_license) params.has_driving_license = filterDocuments.driving_license;
      if (filterDocuments.pan_card) params.has_pan_card = filterDocuments.pan_card;
      if (filterDocuments.aadhar_card) params.has_aadhar_card = filterDocuments.aadhar_card;
      if (filterDocuments.passport) params.has_passport = filterDocuments.passport;

      // District filter
      if (filterDistricts.length > 0) params.districts = filterDistricts.join(',');

      // Archived (passed-out) students
      if (showArchived) {
        params.archived = 'true';
        if (archivedYear) params.academic_year = archivedYear;
      }

      const response = await placementOfficerAPI.getStudents(params);
      const studentsData = response.data.data || [];
      setStudents(studentsData);
      setTotalStudents(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reload the list and the tab counts together, for the handful of actions
   * that actually move a student between tabs.
   *
   * The counts used to be refetched at the end of every fetchStudents(), which
   * runs on nine dependencies including the debounced search box and every
   * advanced filter. Since fetchStatusCounts fires five requests of its own,
   * a single keystroke settling or one filter toggle cost SIX requests. The
   * limiter allows 100 per 15 minutes outside production, so roughly sixteen
   * filter interactions could lock an officer out of the portal.
   *
   * The five count queries pass only `status` and `limit: 1` — no search and no
   * filters — so they are college-wide totals that cannot change when the view
   * changes. Only a status change moves them.
   */
  const refreshStudentsAndCounts = () => {
    fetchStudents();
    fetchStatusCounts();
  };

  /*
   * One request, not five.
   *
   * This used to fire five /students calls in parallel — one per tab, each with
   * limit=1 purely to read `total`. Every one ran the full filtered query on the
   * server and discarded the rows, and measured in a browser they were the
   * slowest requests on the page: Manage Students settled in 4.6s while every
   * other officer route was between 1.2 and 2.6s.
   *
   * /students/counts computes all five with FILTER clauses over a single scan,
   * off the same joins and the same base WHERE, so the numbers are identical.
   */
  const fetchStatusCounts = async () => {
    try {
      const res = await placementOfficerAPI.getStudentCounts();
      const c = res.data.counts || {};
      setStatusCounts({
        all: c.all || 0,
        pending: c.pending || 0,
        approved: c.approved || 0,
        rejected: c.rejected || 0,
        blacklisted: c.blacklisted || 0,
      });
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  };

  const handleApprove = async (studentId) => {
    if (!window.confirm('Are you sure you want to approve this student?')) return false;
    try {
      await placementOfficerAPI.approveStudent(studentId);
      toast.success('Student approved successfully');
      refreshStudentsAndCounts();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve student');
      return false;
    }
  };

  const handleReject = async (studentId) => {
    const reason = window.prompt(
      'Reason for rejection (optional — shown to the student so they can fix it and re-register):',
      ''
    );
    if (reason === null) return false; // Cancel pressed — abort; empty is allowed
    try {
      await placementOfficerAPI.rejectStudent(studentId, reason.trim() || undefined);
      toast.success('Student rejected');
      refreshStudentsAndCounts();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject student');
      return false;
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === getPendingStudentsInView().length) {
      setSelectedStudents([]);
    } else {
      const pendingIds = getPendingStudentsInView().map((s) => s.id);
      setSelectedStudents(pendingIds);
    }
  };

  const getPendingStudentsInView = () => {
    return students.filter(
      (s) => s.registration_status === 'pending' && !s.is_blacklisted
    );
  };

  const handleBulkApprove = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    if (!window.confirm(`Are you sure you want to approve ${selectedStudents.length} student(s)?`)) {
      return;
    }
    const selectedCount = selectedStudents.length;
    try {
      // One atomic request. This used to fire one PUT per student in parallel:
      // Promise.all rejects on the first failure while every other request is
      // already in flight and still completes, so a partial batch could apply
      // with no way to tell the officer which students actually went through.
      const response = await placementOfficerAPI.bulkApproveStudents(selectedStudents);

      // The server only approves rows still in `pending` and reports the real
      // number. The old code always claimed the full selection had succeeded.
      const approvedCount = response.data?.data?.approvedCount ?? 0;

      if (approvedCount === 0) {
        toast.error('No students were approved — they may no longer be pending.');
      } else if (approvedCount < selectedCount) {
        toast.success(
          `${approvedCount} of ${selectedCount} student(s) approved. The rest were no longer pending.`
        );
      } else {
        toast.success(`${approvedCount} student(s) approved successfully`);
      }

      setSelectedStudents([]);
      refreshStudentsAndCounts();
    } catch (error) {
      // Nothing was written — the update runs in a transaction — so the
      // selection is deliberately left intact for a retry.
      toast.error(error.response?.data?.message || 'Failed to approve students');
      refreshStudentsAndCounts();
    }
  };

  const handleBulkReject = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    const reason = window.prompt(
      'Reason for rejecting these students (optional — shown to each student):',
      ''
    );
    if (reason === null) return; // Cancel pressed — abort; empty is allowed
    const selectedCount = selectedStudents.length;
    try {
      // Same swap as bulk approve: one transactional request instead of N
      // racing ones. The reason applies to the whole batch, as it did before.
      const response = await placementOfficerAPI.bulkRejectStudents(
        selectedStudents,
        reason.trim() || undefined
      );

      const rejectedCount = response.data?.data?.rejectedCount ?? 0;

      if (rejectedCount === 0) {
        toast.error('No students were rejected — they may no longer be pending.');
      } else if (rejectedCount < selectedCount) {
        toast.success(
          `${rejectedCount} of ${selectedCount} student(s) rejected. The rest were no longer pending.`
        );
      } else {
        toast.success(`${rejectedCount} student(s) rejected`);
      }

      setSelectedStudents([]);
      refreshStudentsAndCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject students');
      refreshStudentsAndCounts();
    }
  };

  const openCorrectionModal = (student) => {
    setSelectedStudent(student);
    setCorrectionNote('');
    setCorrectionRequirePhoto(false);
    setShowCorrectionModal(true);
  };

  const confirmCorrection = async () => {
    if (!correctionNote.trim()) {
      toast.error('Please describe what the student needs to correct');
      return;
    }
    setCorrectionSubmitting(true);
    try {
      const res = await placementOfficerAPI.requestStudentCorrection(selectedStudent.id, correctionNote.trim(), correctionRequirePhoto);
      toast.success(res.data?.message || 'Correction requested');
      setShowCorrectionModal(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request correction');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const handleBlacklist = (student) => {
    setSelectedStudent(student);
    setBlacklistReason('');
    setShowBlacklistModal(true);
  };

  const confirmBlacklist = async () => {
    if (!blacklistReason.trim()) {
      toast.error('Please provide a reason for blacklisting');
      return;
    }
    try {
      await placementOfficerAPI.blacklistStudent(selectedStudent.id, blacklistReason);
      toast.success('Student blacklisted successfully');
      setShowBlacklistModal(false);
      setBlacklistReason('');
      setSelectedStudent(null);
      refreshStudentsAndCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to blacklist student');
    }
  };

  const handleRequestWhitelist = (student) => {
    setSelectedStudent(student);
    setWhitelistReason('');
    setShowWhitelistModal(true);
  };

  const confirmRequestWhitelist = async () => {
    if (!whitelistReason.trim()) {
      toast.error('Please provide a reason for whitelist request');
      return;
    }
    try {
      await placementOfficerAPI.requestWhitelist(selectedStudent.id, whitelistReason);
      toast.success('Whitelist request submitted to Super Admin');
      setShowWhitelistModal(false);
      setWhitelistReason('');
      setSelectedStudent(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit whitelist request');
    }
  };

  const openDetailsModal = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    navigate(`?status=${tab}`, { replace: true });
  };

  // getStatusBadge and getBlacklistBadge lived here and were left behind by the
  // rewrite: StatusMark and BlacklistMark in students/studentsShared took over,
  // and neither was called again. They were the last old-theme markup in the
  // officer role — rounded-xl pills in bg-green-100 / bg-red-900.

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      cgpaMax: '',
      backlogCount: '',
      dobFrom: '',
      dobTo: '',
      branch: '',
      heightMin: '',
      heightMax: '',
      weightMin: '',
      weightMax: '',
    });
    setFilterDocuments({
      driving_license: '',
      pan_card: '',
      aadhar_card: '',
      passport: ''
    });
    setFilterDistricts([]);
  };

  const hasActiveFilters = () => {
    return (
      Object.values(advancedFilters).some((value) => value !== '') ||
      Object.values(filterDocuments).some((value) => value !== '') ||
      filterDistricts.length > 0
    );
  };

  // Handler functions for custom export
  const handleFieldToggle = (field) => {
    if (exportFields.includes(field)) {
      setExportFields(exportFields.filter(f => f !== field));
    } else {
      setExportFields([...exportFields, field]);
    }
  };

  const handleSelectAllFields = () => {
    // Read from the one list the dialog also renders. This used to be a second
    // hardcoded copy of the same nineteen values, with the number 19 written out
    // a third time in the button label — three places to keep in step.
    const allFields = EXPORT_FIELDS.map((field) => field.value);
    if (exportFields.length === allFields.length) {
      setExportFields([]);
    } else {
      setExportFields(allFields);
    }
  };

  const handleCustomExport = async () => {
    if (exportFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    // A4 landscape fits at most 12 readable columns (backend enforces too)
    if (exportFormat === 'pdf' && exportFields.length > 12) {
      toast.error('PDF fits at most 12 columns readably — deselect some fields or switch to Excel, which has no limit');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        branches: exportBranches.length > 0 ? exportBranches : undefined,
        fields: exportFields,
        include_photo_url: includePhotoUrl,
        status: activeTab !== 'all' ? activeTab : undefined,
        format: exportFormat,
        // Export the archived batch when viewing archives
        archived: showArchived ? 'true' : undefined,
        academic_year: showArchived && archivedYear ? archivedYear : undefined,
      };

      // Include page-level filters
      if (searchQuery.trim()) {
        payload.search = searchQuery.trim();
      }

      // Include advanced filters
      if (advancedFilters.cgpaMin) {
        payload.cgpa_min = advancedFilters.cgpaMin;
      }
      if (advancedFilters.cgpaMax) {
        payload.cgpa_max = advancedFilters.cgpaMax;
      }
      if (advancedFilters.backlogCount !== '') {
        payload.backlog_count = advancedFilters.backlogCount;
      }
      if (advancedFilters.branch && !exportBranches.length) {
        // Only use page branch filter if no branches selected in custom export
        payload.branch = advancedFilters.branch;
      }
      if (advancedFilters.dobFrom) {
        payload.dob_from = advancedFilters.dobFrom;
        if (!advancedFilters.dobTo) {
          payload.dob_to = new Date().toISOString().split('T')[0];
        }
      }
      if (advancedFilters.dobTo) {
        payload.dob_to = advancedFilters.dobTo;
      }
      if (advancedFilters.heightMin) {
        payload.height_min = advancedFilters.heightMin;
      }
      if (advancedFilters.heightMax) {
        payload.height_max = advancedFilters.heightMax;
      }
      if (advancedFilters.weightMin) {
        payload.weight_min = advancedFilters.weightMin;
      }
      if (advancedFilters.weightMax) {
        payload.weight_max = advancedFilters.weightMax;
      }

      // Include document filters
      if (filterDocuments.driving_license) {
        payload.has_driving_license = filterDocuments.driving_license;
      }
      if (filterDocuments.pan_card) {
        payload.has_pan_card = filterDocuments.pan_card;
      }
      if (filterDocuments.aadhar_card) {
        payload.has_aadhar_card = filterDocuments.aadhar_card;
      }
      if (filterDocuments.passport) {
        payload.has_passport = filterDocuments.passport;
      }

      // Include district filter
      if (filterDistricts.length > 0) {
        payload.districts = filterDistricts;
      }

      if (exportFormat === 'pdf') {
        payload.company_name = customExportSettings.companyName || undefined;
        payload.drive_date = customExportSettings.driveDate || undefined;
        payload.include_signature = customExportSettings.includeSignature;
        payload.use_short_names = customExportSettings.useBranchShortNames;
      } else {
        payload.use_short_names = customExportSettings.useBranchShortNames;
      }

      const response = await placementOfficerAPI.customExportStudents(payload);

      const blob = new Blob([response.data], {
        type: exportFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-custom-export-${new Date().toISOString().split('T')[0]}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported to ${exportFormat.toUpperCase()}`);
      setShowCustomExportModal(false);

      // Reset custom export state
      setExportFields([]);
      setExportBranches([]);
      setIncludePhotoUrl(false);
      setCustomExportSettings({
        companyName: '',
        driveDate: '',
        includeSignature: false,
        useBranchShortNames: false,
      });
    } catch (error) {
      console.error('Custom export error:', error);
      toast.error(error.response?.data?.message || 'Error exporting students');
    } finally {
      setProcessing(false);
    }
  };

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const params = {};

      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (advancedFilters.cgpaMin) {
        params.cgpa_min = advancedFilters.cgpaMin;
      }

      // Was never sent, and neither endpoint read it, so the Maximum CGPA box
      // did nothing: a min+max range silently applied only the min.
      if (advancedFilters.cgpaMax) {
        params.cgpa_max = advancedFilters.cgpaMax;
      }

      if (advancedFilters.backlogCount !== '') {
        params.backlog = advancedFilters.backlogCount;
      }

      if (advancedFilters.branch) {
        params.branch = advancedFilters.branch;
      }

      // Advanced filters
      if (advancedFilters.dobFrom) {
        params.dob_from = advancedFilters.dobFrom;
        if (!advancedFilters.dobTo) {
          params.dob_to = new Date().toISOString().split('T')[0];
        }
      }
      if (advancedFilters.dobTo) params.dob_to = advancedFilters.dobTo;
      if (advancedFilters.heightMin) params.height_min = advancedFilters.heightMin;
      if (advancedFilters.heightMax) params.height_max = advancedFilters.heightMax;
      if (advancedFilters.weightMin) params.weight_min = advancedFilters.weightMin;
      if (advancedFilters.weightMax) params.weight_max = advancedFilters.weightMax;
      if (filterDocuments.driving_license) params.has_driving_license = filterDocuments.driving_license;
      if (filterDocuments.pan_card) params.has_pan_card = filterDocuments.pan_card;
      if (filterDocuments.aadhar_card) params.has_aadhar_card = filterDocuments.aadhar_card;
      if (filterDocuments.passport) params.has_passport = filterDocuments.passport;
      if (filterDistricts.length > 0) params.districts = filterDistricts.join(',');

      // Without these the export ignores the archived view entirely and returns
      // current students while the screen is showing a passed-out batch.
      if (showArchived) {
        params.archived = 'true';
        if (archivedYear) params.academic_year = archivedYear;
      }

      params.format = 'excel';
      params.use_short_names = useBranchShortNames;

      const queryParams = new URLSearchParams(params);
      const response = await placementOfficerAPI.exportStudents(`?${queryParams.toString()}`);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Excel exported successfully');
      setShowExcelConfigModal(false);
      setUseBranchShortNames(false);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Error exporting to Excel');
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams({
        status: activeTab,
        format: 'pdf',
        ...(searchQuery && { search: searchQuery }),
        ...(advancedFilters.branch && { branch: advancedFilters.branch }),
        ...(advancedFilters.cgpaMin && { cgpa_min: advancedFilters.cgpaMin }),
        ...(advancedFilters.cgpaMax && { cgpa_max: advancedFilters.cgpaMax }),
        ...(advancedFilters.backlogCount !== '' && { backlog: advancedFilters.backlogCount }),
        // Without these the export ignores the archived view entirely and
        // returns current students while the screen shows a passed-out batch.
        ...(showArchived && { archived: 'true' }),
        ...(showArchived && archivedYear && { academic_year: archivedYear }),
        ...(advancedFilters.dobFrom && { dob_from: advancedFilters.dobFrom }),
        ...(advancedFilters.dobTo ? { dob_to: advancedFilters.dobTo } : (advancedFilters.dobFrom && { dob_to: new Date().toISOString().split('T')[0] })),
        ...(advancedFilters.heightMin && { height_min: advancedFilters.heightMin }),
        ...(advancedFilters.heightMax && { height_max: advancedFilters.heightMax }),
        ...(advancedFilters.weightMin && { weight_min: advancedFilters.weightMin }),
        ...(advancedFilters.weightMax && { weight_max: advancedFilters.weightMax }),
        ...(filterDocuments.driving_license && { has_driving_license: filterDocuments.driving_license }),
        ...(filterDocuments.pan_card && { has_pan_card: filterDocuments.pan_card }),
        ...(filterDocuments.aadhar_card && { has_aadhar_card: filterDocuments.aadhar_card }),
        ...(filterDocuments.passport && { has_passport: filterDocuments.passport }),
        ...(filterDistricts.length > 0 && { districts: filterDistricts.join(',') }),
        ...(pdfCompanyName && { company_name: pdfCompanyName }),
        ...(pdfDriveDate && { drive_date: pdfDriveDate }),
        include_signature: pdfIncludeSignature,
        separate_colleges: pdfSeparateColleges,
        use_short_names: useBranchShortNames,
      });

      const response = await placementOfficerAPI.exportStudents(`?${queryParams.toString()}`);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF exported successfully');
      setShowPdfConfigModal(false);
      setPdfCompanyName('');
      setPdfDriveDate('');
      setPdfIncludeSignature(false);
      setUseBranchShortNames(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error exporting PDF');
    } finally {
      setExporting(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);
  const deviceType = useDeviceType();

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileManageStudentsSkeleton />;
    if (deviceType === 'tablet') return <TabletManageStudentsSkeleton />;
    return <DesktopManageStudentsSkeleton />;
  }

  const pendingInView = getPendingStudentsInView();

  // The export menu picks which configuration dialog opens — the same three
  // destinations the old dropdown had.
  const handlePickExport = (kind) => {
    setShowExportDropdown(false);
    if (kind === 'excel') setShowExcelConfigModal(true);
    else if (kind === 'pdf') setShowPdfConfigModal(true);
    else setShowCustomExportModal(true);
  };

  const handleToggleArchived = () => {
    setShowArchived(!showArchived);
    setArchivedYear('');
    setCurrentPage(1);
  };

  const handleDocumentChange = (key, value) =>
    setFilterDocuments((prev) => ({ ...prev, [key]: value }));

  const handleCustomSettingChange = (key, value) =>
    setCustomExportSettings((prev) => ({ ...prev, [key]: value }));

  const archivedYearOptions = archivedYears.map((y) => ({
    value: y,
    label: `${y} (passout ${passoutYearFromAcademicYear(y)})`,
  }));

  // Row actions. Every presenter gets these same functions.
  const actionHandlers = {
    onReview: openDetailsModal,
    onApprove: handleApprove,
    onReject: handleReject,
    onEmailFix: setEmailFixStudent,
    onCorrection: openCorrectionModal,
    onBlacklist: handleBlacklist,
    onWhitelist: handleRequestWhitelist,
  };

  const filtersProps = {
    advancedFilters,
    onFilterChange: handleAdvancedFilterChange,
    filterDocuments,
    onDocumentChange: handleDocumentChange,
    filterDistricts,
    onDistrictsChange: setFilterDistricts,
    availableDistricts,
    collegeBranches,
    onClear: clearAdvancedFilters,
    hasActiveFilters: hasActiveFilters(),
    shownCount: students.length,
    totalStudents,
  };

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    students,
    activeTab,
    statusCounts,
    onChangeTab: changeTab,
    searchQuery,
    onSearchChange: (e) => setSearchQuery(e.target.value),
    showAdvancedFilters,
    onToggleAdvancedFilters: () => setShowAdvancedFilters(!showAdvancedFilters),
    hasActiveFilters: hasActiveFilters(),
    showExportDropdown,
    onToggleExportDropdown: () => setShowExportDropdown(!showExportDropdown),
    onPickExport: handlePickExport,
    totalStudents,
    cgpaLocked,
    cgpaUnlockWindow,
    onCgpaUnlock: () => setShowCgpaUnlockModal(true),
    onCgpaLock: handleCgpaLock,
    cgpaProcessing,
    backlogLocked,
    backlogUnlockWindow,
    onBacklogUnlock: () => setShowBacklogUnlockModal(true),
    onBacklogLock: handleBacklogLock,
    backlogProcessing,
    showArchived,
    archivedYear,
    archivedYearOptions,
    onToggleArchived: handleToggleArchived,
    onArchivedYearChange: (e) => {
      setArchivedYear(e.target.value);
      setCurrentPage(1);
    },
    selectedStudents,
    pendingInView,
    onSelectStudent: handleSelectStudent,
    onSelectAll: handleSelectAll,
    onBulkApprove: handleBulkApprove,
    onBulkReject: handleBulkReject,
    onClearSelection: () => setSelectedStudents([]),
    currentPage,
    totalPages,
    pageSize,
    onPageChange: setCurrentPage,
    onPageSizeChange: (e) => {
      setPageSize(Number(e.target.value));
      setCurrentPage(1);
    },
    filtersProps,
    actionHandlers,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileManageStudents {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletManageStudents {...presenterProps} />
      ) : (
        <DesktopManageStudents {...presenterProps} />
      )}

      <StudentModals
        showDetailsModal={showDetailsModal}
        selectedStudent={selectedStudent}
        onCloseDetails={() => setShowDetailsModal(false)}
        /* Approving or rejecting from the review dialog closes it on success,
           exactly as before — both handlers return a boolean for this. */
        onApprove={async (id) => {
          if (await handleApprove(id)) setShowDetailsModal(false);
        }}
        onReject={async (id) => {
          if (await handleReject(id)) setShowDetailsModal(false);
        }}
        emailFixStudent={emailFixStudent}
        onEmailFixSubmit={async (email) => {
          const response = await placementOfficerAPI.updateStudentEmail(emailFixStudent.id, email);
          toast.success(response.data.message, { duration: 7000 });
          fetchStudents();
        }}
        onCloseEmailFix={() => setEmailFixStudent(null)}
        showCorrectionModal={showCorrectionModal}
        correctionNote={correctionNote}
        onCorrectionNoteChange={(e) => setCorrectionNote(e.target.value)}
        correctionRequirePhoto={correctionRequirePhoto}
        onCorrectionRequirePhotoChange={(e) => setCorrectionRequirePhoto(e.target.checked)}
        correctionSubmitting={correctionSubmitting}
        onConfirmCorrection={confirmCorrection}
        onCloseCorrection={() => setShowCorrectionModal(false)}
        showBlacklistModal={showBlacklistModal}
        blacklistReason={blacklistReason}
        onBlacklistReasonChange={(e) => setBlacklistReason(e.target.value)}
        onConfirmBlacklist={confirmBlacklist}
        onCloseBlacklist={() => {
          setShowBlacklistModal(false);
          setBlacklistReason('');
          setSelectedStudent(null);
        }}
        showWhitelistModal={showWhitelistModal}
        whitelistReason={whitelistReason}
        onWhitelistReasonChange={(e) => setWhitelistReason(e.target.value)}
        onConfirmWhitelist={confirmRequestWhitelist}
        onCloseWhitelist={() => {
          setShowWhitelistModal(false);
          setWhitelistReason('');
          setSelectedStudent(null);
        }}
        showCgpaUnlockModal={showCgpaUnlockModal}
        unlockDays={unlockDays}
        onUnlockDaysChange={(e) => setUnlockDays(Number(e.target.value))}
        unlockReason={unlockReason}
        onUnlockReasonChange={(e) => setUnlockReason(e.target.value)}
        cgpaProcessing={cgpaProcessing}
        onConfirmCgpaUnlock={handleCgpaUnlock}
        onCloseCgpaUnlock={() => setShowCgpaUnlockModal(false)}
        showBacklogUnlockModal={showBacklogUnlockModal}
        backlogUnlockDays={backlogUnlockDays}
        onBacklogUnlockDaysChange={(e) => setBacklogUnlockDays(Number(e.target.value))}
        backlogUnlockReason={backlogUnlockReason}
        onBacklogUnlockReasonChange={(e) => setBacklogUnlockReason(e.target.value)}
        backlogProcessing={backlogProcessing}
        onConfirmBacklogUnlock={handleBacklogUnlock}
        onCloseBacklogUnlock={() => setShowBacklogUnlockModal(false)}
      />

      <ExportModals
        showExcelConfigModal={showExcelConfigModal}
        useBranchShortNames={useBranchShortNames}
        onUseBranchShortNamesChange={(e) => setUseBranchShortNames(e.target.checked)}
        exporting={exporting}
        onExcelExport={handleExcelExport}
        onCloseExcel={() => {
          setShowExcelConfigModal(false);
          setUseBranchShortNames(false);
        }}
        showPdfConfigModal={showPdfConfigModal}
        pdfCompanyName={pdfCompanyName}
        onPdfCompanyNameChange={(e) => setPdfCompanyName(e.target.value)}
        pdfDriveDate={pdfDriveDate}
        onPdfDriveDateChange={(e) => setPdfDriveDate(e.target.value)}
        pdfIncludeSignature={pdfIncludeSignature}
        onPdfIncludeSignatureChange={(e) => setPdfIncludeSignature(e.target.checked)}
        pdfSeparateColleges={pdfSeparateColleges}
        onPdfSeparateCollegesChange={(e) => setPdfSeparateColleges(e.target.checked)}
        onPdfExport={handlePdfExport}
        onClosePdf={() => setShowPdfConfigModal(false)}
        showCustomExportModal={showCustomExportModal}
        exportFormat={exportFormat}
        onExportFormatChange={(e) => setExportFormat(e.target.value)}
        exportFields={exportFields}
        onFieldToggle={handleFieldToggle}
        onSelectAllFields={handleSelectAllFields}
        exportBranches={exportBranches}
        onExportBranchesChange={setExportBranches}
        collegeBranches={collegeBranches}
        includePhotoUrl={includePhotoUrl}
        onIncludePhotoUrlChange={(e) => setIncludePhotoUrl(e.target.checked)}
        customExportSettings={customExportSettings}
        onCustomSettingChange={handleCustomSettingChange}
        processing={processing}
        onCustomExport={handleCustomExport}
        onCloseCustom={() => setShowCustomExportModal(false)}
      />
    </>
  );
}

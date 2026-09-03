import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import UpdateStudentEmailModal from '../../components/UpdateStudentEmailModal';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';
import StudentsBody from './students/StudentsBody';
import StudentsSkeleton from './students/StudentsSkeleton';
import {
  DetailsDialog, DeleteDialog, BlacklistDialog, WhitelistDialog, CorrectionDialog,
} from './students/StudentModals';
import ExportModal, { ALL_EXPORT_FIELDS } from './students/ExportModal';
import PhotoPurgeModal from './students/PhotoPurgeModal';
import { CgpaUnlockDialog } from './students/CgpaControls';

/**
 * All Students — container.
 *
 * Every piece of state, every effect and every handler; the body and the
 * dialogs draw them. Same endpoints, same parameters, same toasts, same
 * refusals — what changed is the surface they are drawn on.
 */
export default function ManageAllStudents() {
  const deviceType = useDeviceType();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  /*
   * The full-page skeleton belongs to the first load and nothing else.
   *
   * Every fetch used to set `loading`, and the render returns a skeleton
   * whenever that is true — which replaces the whole page, the search box
   * included. Typing a ten-digit PRN at the pace you read one off a page fires
   * a request per digit, and each one unmounted the input mid-word: focus was
   * lost, the remaining digits went nowhere, and the officer had to click back
   * in and finish. Measured at 10 requests and focus lost on every one.
   *
   * Refetches keep the page mounted now and only dim the register.
   */
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showSkeleton } = useSkeleton(loading);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || '');
  const [filterBranch, setFilterBranch] = useState('');
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    backlogCount: '',
  });

  // New Advanced Filters
  const [dobFrom, setDobFrom] = useState('');
  const [dobTo, setDobTo] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [filterDocuments, setFilterDocuments] = useState({
    driving_license: '',
    pan_card: '',
    aadhar_card: '',
    passport: ''
  });
  const [filterDistricts, setFilterDistricts] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  // Archived (passed-out) students: deactivated by the year-end reset, kept for
  // reference/export. showArchived flips the list to those; archivedYear filters
  // to one batch. archivedYears populates the batch dropdown.
  const [showArchived, setShowArchived] = useState(false);
  const [archivedYear, setArchivedYear] = useState('');
  const [archivedYears, setArchivedYears] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctionRequirePhoto, setCorrectionRequirePhoto] = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [emailFixStudent, setEmailFixStudent] = useState(null);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [showCustomExportModal, setShowCustomExportModal] = useState(false);
  const [showBulkDeletePhotoModal, setShowBulkDeletePhotoModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Bulk Photo Deletion State
  const [bulkDeleteType, setBulkDeleteType] = useState('single_prn');
  const [bulkDeleteData, setBulkDeleteData] = useState({
    prn_list: '',
    prn_range_start: '',
    prn_range_end: '',
    date_start: '',
    date_end: '',
  });

  // Custom Export State
  const [exportFilters, setExportFilters] = useState({
    college_id: '',
    region_id: '',
    branches: [],
  });
  const [exportFields, setExportFields] = useState([]);
  const [includePhotoUrl, setIncludePhotoUrl] = useState(false);
  const [useBranchShortNames, setUseBranchShortNames] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [pdfSettings, setPdfSettings] = useState({
    companyName: '',
    driveDate: '',
    includeSignature: false,
    separateColleges: false,
    useBranchShortNames: false
  });

  // CGPA Lock/Unlock
  const [cgpaLocked, setCgpaLocked] = useState(true);
  const [cgpaUnlockWindow, setCgpaUnlockWindow] = useState(null);
  const [showCgpaUnlockModal, setShowCgpaUnlockModal] = useState(false);
  const [unlockDays, setUnlockDays] = useState(7);
  const [unlockReason, setUnlockReason] = useState('');
  const [cgpaProcessing, setCgpaProcessing] = useState(false);
  const [cgpaSelectedCollege, setCgpaSelectedCollege] = useState('');
  const [cgpaGlobalMode, setCgpaGlobalMode] = useState(false);
  const [globalCgpaUnlocked, setGlobalCgpaUnlocked] = useState(false);
  const [globalCgpaWindow, setGlobalCgpaWindow] = useState(null);

  // Maps for export modal
  const [exportRegionsData, setExportRegionsData] = useState([]);
  const [exportCollegesData, setExportCollegesData] = useState([]);
  const [filteredExportColleges, setFilteredExportColleges] = useState([]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchRegionsAndColleges();
      await fetchDistricts();
      await fetchGlobalCgpaStatus();
      fetchArchivedYears();
    };
    initializeData();
  }, []);

  const fetchArchivedYears = async () => {
    try {
      const res = await superAdminAPI.getArchivedYears();
      setArchivedYears(res.data.data || []);
    } catch {
      // non-fatal: dropdown just stays empty
    }
  };

  // Waits for a pause in typing before searching. 400ms was shorter
  // than the gap between digits when someone transcribes a PRN, so every
  // digit searched; 700ms bridges that without feeling slow.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 700);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (regions.length > 0 && colleges.length > 0) {
      fetchStudents();
    }
  }, [currentPage, pageSize, regions, colleges, filterRegion, filterCollege, filterStatus, filterBranch, debouncedSearch, advancedFilters, dobFrom, dobTo, heightMin, heightMax, weightMin, weightMax, filterDocuments, filterDistricts, showArchived, archivedYear]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterRegion, filterCollege, filterStatus, filterBranch, debouncedSearch, advancedFilters, dobFrom, dobTo, heightMin, heightMax, weightMin, weightMax, filterDocuments, filterDistricts]);

  // Fetch branches when college is selected
  useEffect(() => {
    if (filterCollege && colleges.length > 0) {
      const collegeData = colleges.find(c => c.college_name === filterCollege);
      if (collegeData?.id) {
        fetchBranches(collegeData.id);
      }
    } else {
      setBranches([]);
      setFilterBranch('');
    }
  }, [filterCollege, colleges]);

  const fetchDistricts = async () => {
    try {
      const response = await superAdminAPI.getAvailableDistricts();
      setAvailableDistricts(response.data.districts || []);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    }
  };

  const fetchRegionsAndColleges = async () => {
    try {
      const [regionsRes, collegesRes] = await Promise.all([
        commonAPI.getRegions(),
        commonAPI.getColleges()
      ]);
      setRegions(regionsRes.data.data || []);
      setColleges(collegesRes.data.data || []);
      setExportRegionsData(regionsRes.data.data || []);
      setExportCollegesData(collegesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching regions and colleges:', error);
    }
  };

  const fetchBranches = async (collegeId) => {
    try {
      const response = await superAdminAPI.getCollegeBranches(collegeId);
      setBranches(response.data.data.branches || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  // Fetch CGPA lock status when a college is selected for CGPA management
  const fetchCgpaLockStatus = async (collegeId) => {
    if (!collegeId) return;
    try {
      const response = await superAdminAPI.getCgpaLockStatus(collegeId);
      const data = response.data.data;
      setCgpaLocked(data.is_locked);
      setCgpaUnlockWindow(data.unlock_window);
    } catch {
      setCgpaLocked(true);
      setCgpaUnlockWindow(null);
    }
  };

  const fetchGlobalCgpaStatus = async () => {
    try {
      const response = await superAdminAPI.getGlobalCgpaLockStatus();
      const data = response.data.data;
      setGlobalCgpaUnlocked(data.has_global_window);
      setGlobalCgpaWindow(data.global_window);
    } catch {
      setGlobalCgpaUnlocked(false);
      setGlobalCgpaWindow(null);
    }
  };

  const handleCgpaUnlock = async () => {
    if (unlockDays < 1 || unlockDays > 30) {
      toast.error('Duration must be between 1 and 30 days');
      return;
    }
    setCgpaProcessing(true);
    try {
      await superAdminAPI.unlockCgpa({
        college_id: cgpaGlobalMode ? null : (cgpaSelectedCollege || null),
        unlock_days: unlockDays,
        reason: unlockReason || 'Semester results update',
      });
      toast.success(cgpaGlobalMode
        ? `CGPA editing unlocked for ALL colleges for ${unlockDays} days`
        : `CGPA editing unlocked for ${unlockDays} days`
      );
      setShowCgpaUnlockModal(false);
      setUnlockDays(7);
      setUnlockReason('');
      setCgpaGlobalMode(false);
      if (cgpaSelectedCollege) fetchCgpaLockStatus(cgpaSelectedCollege);
      fetchGlobalCgpaStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock CGPA');
    } finally {
      setCgpaProcessing(false);
    }
  };

  const handleCgpaLock = async () => {
    setCgpaProcessing(true);
    try {
      await superAdminAPI.lockCgpa({
        college_id: cgpaSelectedCollege || null,
      });
      toast.success('CGPA editing locked');
      if (cgpaSelectedCollege) fetchCgpaLockStatus(cgpaSelectedCollege);
      fetchGlobalCgpaStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock CGPA');
    } finally {
      setCgpaProcessing(false);
    }
  };

  const handleGlobalCgpaLock = async () => {
    setCgpaProcessing(true);
    try {
      await superAdminAPI.lockCgpa({ college_id: null });
      toast.success('CGPA editing locked for ALL colleges');
      fetchGlobalCgpaStatus();
      if (cgpaSelectedCollege) fetchCgpaLockStatus(cgpaSelectedCollege);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock CGPA');
    } finally {
      setCgpaProcessing(false);
    }
  };

  const fetchStudents = async () => {
    try {
      if (firstLoadDone) setRefreshing(true); else setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });

      if (filterStatus) params.append('status', filterStatus);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const selectedRegion = regions.find(r => r.region_name === filterRegion);
      if (selectedRegion) params.append('region_id', selectedRegion.id);

      const selectedCollege = colleges.find(c => c.college_name === filterCollege);
      if (selectedCollege) params.append('college_id', selectedCollege.id);

      if (filterBranch) params.append('branch', filterBranch);
      if (advancedFilters.cgpaMin) params.append('cgpa_min', advancedFilters.cgpaMin);
      if (advancedFilters.backlogCount !== '') params.append('backlog', advancedFilters.backlogCount);

      // New advanced filters
      if (dobFrom) {
        params.append('dob_from', dobFrom);
        // Auto-set dob_to to today if not provided
        if (!dobTo) {
          params.append('dob_to', new Date().toISOString().split('T')[0]);
        }
      }
      if (dobTo) params.append('dob_to', dobTo);
      if (heightMin) params.append('height_min', heightMin);
      if (heightMax) params.append('height_max', heightMax);
      if (weightMin) params.append('weight_min', weightMin);
      if (weightMax) params.append('weight_max', weightMax);
      if (filterDocuments.driving_license) params.append('has_driving_license', filterDocuments.driving_license);
      if (filterDocuments.pan_card) params.append('has_pan_card', filterDocuments.pan_card);
      if (filterDocuments.aadhar_card) params.append('has_aadhar_card', filterDocuments.aadhar_card);
      if (filterDocuments.passport) params.append('has_passport', filterDocuments.passport);
      if (filterDistricts.length > 0) params.append('districts', filterDistricts.join(','));
      if (showArchived) {
        params.append('archived', 'true');
        if (archivedYear) params.append('academic_year', archivedYear);
      }

      const response = await superAdminAPI.getAllStudents(params.toString());
      const data = response.data;

      setStudents(data.data || []);
      setTotalStudents(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFirstLoadDone(true);
    }
  };

  const handleAdvancedFilterChange = (field, value) => {
    setAdvancedFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      cgpaMin: '',
      backlogCount: '',
    });
    setDobFrom('');
    setDobTo('');
    setHeightMin('');
    setHeightMax('');
    setWeightMin('');
    setWeightMax('');
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
      Object.values(advancedFilters).some(value => value !== '') ||
      dobFrom || dobTo || heightMin || heightMax || weightMin || weightMax ||
      Object.values(filterDocuments).some(value => value !== '') ||
      filterDistricts.length > 0
    );
  };

  const handleDocumentFilterChange = (key, value) => {
    setFilterDocuments(prev => ({ ...prev, [key]: value }));
  };

  const handleDistrictToggle = (district) => {
    setFilterDistricts(prev =>
      prev.includes(district) ? prev.filter(d => d !== district) : [...prev, district]
    );
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudent) return;

    setDeleting(true);
    try {
      await superAdminAPI.deleteStudent(selectedStudent.id);
      toast.success('Student deleted successfully');
      setShowDeleteModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeleting(false);
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
      const res = await superAdminAPI.requestStudentCorrection(selectedStudent.id, correctionNote.trim(), correctionRequirePhoto);
      toast.success(res.data?.message || 'Correction requested');
      setShowCorrectionModal(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request correction');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const handleBlacklistClick = (student) => {
    setSelectedStudent(student);
    setBlacklistReason('');
    setShowBlacklistModal(true);
  };

  const handleConfirmBlacklist = async () => {
    if (!selectedStudent) return;
    if (!blacklistReason.trim()) {
      toast.error('Please provide a reason for blacklisting');
      return;
    }

    setProcessing(true);
    try {
      await superAdminAPI.blacklistStudent(selectedStudent.id, blacklistReason);
      toast.success('Student blacklisted successfully');
      setShowBlacklistModal(false);
      setSelectedStudent(null);
      setBlacklistReason('');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to blacklist student');
    } finally {
      setProcessing(false);
    }
  };

  const handleWhitelistClick = (student) => {
    setSelectedStudent(student);
    setShowWhitelistModal(true);
  };

  const handleConfirmWhitelist = async () => {
    if (!selectedStudent) return;

    setProcessing(true);
    try {
      await superAdminAPI.whitelistStudent(selectedStudent.id);
      toast.success('Student whitelisted successfully');
      setShowWhitelistModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to whitelist student');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenCustomExport = () => {
    // Use the FULL region/college lists fetched from the API. These used
    // to be derived from the students on the current page, so the dropdowns
    // only offered the colleges of the ~20 visible students and silently
    // hid every other college from the export filters.
    const regionsData = regions
      .map(r => ({ id: r.id, name: r.region_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const collegesData = colleges
      .map(c => ({ id: c.id, name: c.college_name, region_id: c.region_id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setExportRegionsData(regionsData);
    setExportCollegesData(collegesData);
    setFilteredExportColleges(collegesData);

    setShowCustomExportModal(true);
    setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
    setExportFilters({ college_id: '', region_id: '', branches: [] });
  };

  const fetchCollegeBranches = async (collegeId) => {
    if (!collegeId) {
      setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
      return;
    }

    setFetchingBranches(true);
    try {
      const response = await superAdminAPI.getCollegeBranches(collegeId);
      const branches = response.data.data.branches || [];
      setAvailableBranches(branches.length > 0 ? branches : KERALA_POLYTECHNIC_BRANCHES);
    } catch (error) {
      console.error('Failed to fetch college branches:', error);
      toast.error('Failed to fetch college branches');
      setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
    } finally {
      setFetchingBranches(false);
    }
  };

  /** Region chosen inside the export dialog: narrows the colleges, drops branches. */
  const handleExportRegionChange = (regionId) => {
    setExportFilters(prev => ({ ...prev, region_id: regionId, college_id: '', branches: [] }));

    if (regionId) {
      const filtered = exportCollegesData.filter(c => c.region_id === parseInt(regionId));
      setFilteredExportColleges(filtered);
    } else {
      setFilteredExportColleges(exportCollegesData);
    }
    setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
  };

  /** College chosen inside the export dialog: its branches replace the full list. */
  const handleExportCollegeChange = (collegeId) => {
    setExportFilters(prev => ({ ...prev, college_id: collegeId, branches: [] }));

    if (collegeId) {
      fetchCollegeBranches(collegeId);
    } else {
      setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
    }
  };

  const handleExportBranchToggle = (branch) => {
    setExportFilters(prev => ({
      ...prev,
      branches: prev.branches.includes(branch)
        ? prev.branches.filter(b => b !== branch)
        : [...prev.branches, branch],
    }));
  };

  const handleSelectAllBranches = () => {
    setExportFilters(prev => ({
      ...prev,
      branches: prev.branches.length === availableBranches.length ? [] : [...availableBranches],
    }));
  };

  const handlePdfSettingChange = (key, value) => {
    setPdfSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFieldToggle = (field) => {
    setExportFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSelectAllFields = () => {
    // One list, shared with the dialog that draws the ticks. It used to be
    // written out twice — 26 values here, a hard-coded 25 in the button's label
    // — so with everything ticked the button still read "Select All".
    if (exportFields.length === ALL_EXPORT_FIELDS.length) {
      setExportFields([]);
    } else {
      setExportFields([...ALL_EXPORT_FIELDS]);
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
      // Get the selected college ID from filterCollege or exportFilters
      const selectedCollege = filterCollege
        ? colleges.find(c => c.college_name === filterCollege)
        : exportFilters.college_id
          ? colleges.find(c => c.id === exportFilters.college_id)
          : null;

      const selectedRegion = filterRegion
        ? regions.find(r => r.region_name === filterRegion)
        : exportFilters.region_id
          ? regions.find(r => r.id === exportFilters.region_id)
          : null;

      const requestBody = {
        college_id: selectedCollege?.id || exportFilters.college_id || null,
        region_id: selectedRegion?.id || exportFilters.region_id || null,
        departments: filterBranch ? [filterBranch] : (exportFilters.branches.length > 0 ? exportFilters.branches : null),
        fields: exportFields,
        format: exportFormat,
        // Include advanced filters from the page
        cgpa_min: advancedFilters.cgpaMin || null,
        backlog_count: advancedFilters.backlogCount !== '' ? advancedFilters.backlogCount : null,
        search: searchQuery || null,
        status: filterStatus || null,
        // New advanced filters
        dob_from: dobFrom || null,
        dob_to: dobTo || (dobFrom ? new Date().toISOString().split('T')[0] : null),
        height_min: heightMin || null,
        height_max: heightMax || null,
        weight_min: weightMin || null,
        weight_max: weightMax || null,
        has_driving_license: filterDocuments.driving_license || null,
        has_pan_card: filterDocuments.pan_card || null,
        has_aadhar_card: filterDocuments.aadhar_card || null,
        has_passport: filterDocuments.passport || null,
        districts: filterDistricts.length > 0 ? filterDistricts : null,
        // Export the archived batch when viewing archives
        archived: showArchived ? 'true' : null,
        academic_year: showArchived && archivedYear ? archivedYear : null,
      };

      // Add format-specific parameters
      if (exportFormat === 'pdf') {
        requestBody.company_name = pdfSettings.companyName || null;
        requestBody.drive_date = pdfSettings.driveDate || null;
        requestBody.include_signature = pdfSettings.includeSignature;
        requestBody.separate_colleges = pdfSettings.separateColleges;
        requestBody.use_short_names = pdfSettings.useBranchShortNames;
      } else if (exportFormat === 'excel') {
        requestBody.include_photo_url = includePhotoUrl;
        requestBody.use_short_names = useBranchShortNames;
      }

      const response = await superAdminAPI.enhancedCustomExport(requestBody);

      // Determine file extension and MIME type
      const extension = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      const mimeType = exportFormat === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      // Create blob and download
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${exportFormat.toUpperCase()}`);
      setShowCustomExportModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export students');
    } finally {
      setProcessing(false);
    }
  };

  const closeBulkDeletePhotoModal = () => {
    setShowBulkDeletePhotoModal(false);
    setBulkDeleteData({
      prn_list: '',
      prn_range_start: '',
      prn_range_end: '',
      date_start: '',
      date_end: '',
    });
  };

  const handleBulkDeleteDataChange = (field, value) => {
    setBulkDeleteData(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkDeletePhotos = async () => {
    // Validation
    if (bulkDeleteType === 'single_prn' && !bulkDeleteData.prn_list.trim()) {
      toast.error('Please enter at least one PRN');
      return;
    }
    if (bulkDeleteType === 'prn_range' && (!bulkDeleteData.prn_range_start || !bulkDeleteData.prn_range_end)) {
      toast.error('Please enter both start and end PRN for range');
      return;
    }
    if (bulkDeleteType === 'date_range' && (!bulkDeleteData.date_start || !bulkDeleteData.date_end)) {
      toast.error('Please select both start and end dates');
      return;
    }

    const confirmation = window.confirm(
      'Are you sure you want to delete these student photos? This action cannot be undone.'
    );
    if (!confirmation) return;

    setProcessing(true);
    try {
      const payload = {
        deletion_type: bulkDeleteType,
      };

      if (bulkDeleteType === 'single_prn') {
        payload.prn_list = bulkDeleteData.prn_list.split(',').map(p => p.trim()).filter(p => p);
      } else if (bulkDeleteType === 'prn_range') {
        payload.prn_range_start = bulkDeleteData.prn_range_start;
        payload.prn_range_end = bulkDeleteData.prn_range_end;
      } else if (bulkDeleteType === 'date_range') {
        payload.date_start = bulkDeleteData.date_start;
        payload.date_end = bulkDeleteData.date_end;
      }

      const response = await superAdminAPI.bulkDeleteStudentPhotos(payload);
      toast.success(response.data.message || 'Student photos deleted successfully');
      setShowBulkDeletePhotoModal(false);
      setBulkDeleteData({
        prn_list: '',
        prn_range_start: '',
        prn_range_end: '',
        date_start: '',
        date_end: '',
      });
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student photos');
    } finally {
      setProcessing(false);
    }
  };

  /** The CGPA college picker: choosing one loads its lock state, clearing resets. */
  const handleCgpaCollegeChange = (value) => {
    setCgpaSelectedCollege(value);
    if (value) {
      fetchCgpaLockStatus(value);
    } else {
      setCgpaLocked(true);
      setCgpaUnlockWindow(null);
    }
  };

  if (showSkeleton) return <StudentsSkeleton layout={deviceType} />;

  const studentActions = {
    onView: handleViewDetails,
    onBlacklist: handleBlacklistClick,
    onWhitelist: handleWhitelistClick,
    onCorrection: openCorrectionModal,
    onFixEmail: setEmailFixStudent,
    onDelete: handleDeleteClick,
  };

  return (
    <>
      <StudentsBody
        layout={deviceType}
        students={students}
        refreshing={refreshing}
        actions={studentActions}

        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        regions={regions}
        filterRegion={filterRegion}
        onRegion={(value) => {
          setFilterRegion(value);
          setFilterCollege(''); // Clear college filter when region changes
        }}
        colleges={colleges}
        filterCollege={filterCollege}
        onCollege={setFilterCollege}
        filterStatus={filterStatus}
        onStatus={setFilterStatus}

        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
        hasActiveFilters={Boolean(hasActiveFilters())}
        advancedFilters={advancedFilters}
        onAdvancedChange={handleAdvancedFilterChange}
        branches={branches}
        filterBranch={filterBranch}
        onBranch={setFilterBranch}
        dobFrom={dobFrom}
        dobTo={dobTo}
        onDobFrom={setDobFrom}
        onDobTo={setDobTo}
        heightMin={heightMin}
        heightMax={heightMax}
        weightMin={weightMin}
        weightMax={weightMax}
        onHeightMin={setHeightMin}
        onHeightMax={setHeightMax}
        onWeightMin={setWeightMin}
        onWeightMax={setWeightMax}
        filterDocuments={filterDocuments}
        onDocumentChange={handleDocumentFilterChange}
        availableDistricts={availableDistricts}
        filterDistricts={filterDistricts}
        onDistrictToggle={handleDistrictToggle}
        onClearAdvanced={clearAdvancedFilters}

        showArchived={showArchived}
        onToggleArchived={() => {
          setShowArchived(!showArchived);
          setArchivedYear('');
          setCurrentPage(1);
        }}
        archivedYears={archivedYears}
        archivedYear={archivedYear}
        onArchivedYear={(value) => { setArchivedYear(value); setCurrentPage(1); }}

        cgpaSelectedCollege={cgpaSelectedCollege}
        onCgpaCollege={handleCgpaCollegeChange}
        cgpaLocked={cgpaLocked}
        cgpaUnlockWindow={cgpaUnlockWindow}
        globalCgpaUnlocked={globalCgpaUnlocked}
        globalCgpaWindow={globalCgpaWindow}
        cgpaProcessing={cgpaProcessing}
        onCgpaUnlockOne={() => { setCgpaGlobalMode(false); setShowCgpaUnlockModal(true); }}
        onCgpaLockOne={handleCgpaLock}
        onCgpaUnlockAll={() => { setCgpaGlobalMode(true); setShowCgpaUnlockModal(true); }}
        onCgpaLockAll={handleGlobalCgpaLock}

        currentPage={currentPage}
        totalPages={totalPages}
        totalStudents={totalStudents}
        pageSize={pageSize}
        onPage={setCurrentPage}
        onPageSize={(size) => { setPageSize(size); setCurrentPage(1); }}

        onOpenExport={handleOpenCustomExport}
        onOpenPhotoPurge={() => setShowBulkDeletePhotoModal(true)}
      />

      {showDetailsModal && selectedStudent && (
        <DetailsDialog
          student={selectedStudent}
          onClose={() => { setShowDetailsModal(false); setSelectedStudent(null); }}
        />
      )}

      {showDeleteModal && selectedStudent && (
        <DeleteDialog
          student={selectedStudent}
          onConfirm={handleConfirmDelete}
          onClose={() => { setShowDeleteModal(false); setSelectedStudent(null); }}
          deleting={deleting}
        />
      )}

      {showBlacklistModal && selectedStudent && (
        <BlacklistDialog
          student={selectedStudent}
          reason={blacklistReason}
          onReasonChange={setBlacklistReason}
          onConfirm={handleConfirmBlacklist}
          onClose={() => {
            setShowBlacklistModal(false);
            setBlacklistReason('');
            setSelectedStudent(null);
          }}
          processing={processing}
        />
      )}

      {showWhitelistModal && selectedStudent && (
        <WhitelistDialog
          student={selectedStudent}
          onConfirm={handleConfirmWhitelist}
          onClose={() => { setShowWhitelistModal(false); setSelectedStudent(null); }}
          processing={processing}
        />
      )}

      {showCorrectionModal && selectedStudent && (
        <CorrectionDialog
          student={selectedStudent}
          note={correctionNote}
          onNoteChange={setCorrectionNote}
          requirePhoto={correctionRequirePhoto}
          onRequirePhotoChange={setCorrectionRequirePhoto}
          onConfirm={confirmCorrection}
          onClose={() => setShowCorrectionModal(false)}
          submitting={correctionSubmitting}
        />
      )}

      {emailFixStudent && (
        <UpdateStudentEmailModal
          currentEmail={emailFixStudent.email}
          studentName={`${emailFixStudent.name || emailFixStudent.student_name || ''} (PRN ${emailFixStudent.prn})`}
          onSubmit={async (email) => {
            const response = await superAdminAPI.updateStudentEmail(emailFixStudent.id, email);
            toast.success(response.data.message, { duration: 7000 });
            fetchStudents();
          }}
          onClose={() => setEmailFixStudent(null)}
          variant="spc"
        />
      )}

      {showCustomExportModal && (
        <ExportModal
          layout={deviceType}
          format={exportFormat}
          onFormat={setExportFormat}
          fields={exportFields}
          onToggleField={handleFieldToggle}
          onSelectAll={handleSelectAllFields}
          pdfSettings={pdfSettings}
          onPdfSetting={handlePdfSettingChange}
          includePhotoUrl={includePhotoUrl}
          onIncludePhotoUrl={setIncludePhotoUrl}
          useBranchShortNames={useBranchShortNames}
          onUseBranchShortNames={setUseBranchShortNames}
          exportFilters={exportFilters}
          onExportRegion={handleExportRegionChange}
          onExportCollege={handleExportCollegeChange}
          onBranchToggle={handleExportBranchToggle}
          onSelectAllBranches={handleSelectAllBranches}
          regionsData={exportRegionsData}
          collegesData={filteredExportColleges}
          availableBranches={availableBranches}
          fetchingBranches={fetchingBranches}
          pageRegion={filterRegion}
          pageCollege={filterCollege}
          pageBranch={filterBranch}
          archivedScope={showArchived}
          onExport={handleCustomExport}
          onClose={() => setShowCustomExportModal(false)}
          processing={processing}
        />
      )}

      {showBulkDeletePhotoModal && (
        <PhotoPurgeModal
          mode={bulkDeleteType}
          onMode={setBulkDeleteType}
          data={bulkDeleteData}
          onChange={handleBulkDeleteDataChange}
          onConfirm={handleBulkDeletePhotos}
          onClose={closeBulkDeletePhotoModal}
          processing={processing}
        />
      )}

      {showCgpaUnlockModal && (
        <CgpaUnlockDialog
          globalMode={cgpaGlobalMode}
          days={unlockDays}
          onDays={setUnlockDays}
          reason={unlockReason}
          onReason={setUnlockReason}
          onConfirm={handleCgpaUnlock}
          onClose={() => { setShowCgpaUnlockModal(false); setCgpaGlobalMode(false); }}
          processing={cgpaProcessing}
        />
      )}
    </>
  );
}

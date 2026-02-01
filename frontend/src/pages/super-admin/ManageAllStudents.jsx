import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { superAdminAPI, commonAPI } from '../../services/api';
import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Ban,
  Shield,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  GraduationCap,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';

export default function ManageAllStudents() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
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
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (regions.length > 0 && colleges.length > 0) {
      fetchStudents();
    }
  }, [currentPage, pageSize, regions, colleges, filterRegion, filterCollege, filterStatus, filterBranch, searchQuery, advancedFilters, dobFrom, dobTo, heightMin, heightMax, weightMin, weightMax, filterDocuments, filterDistricts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterRegion, filterCollege, filterStatus, filterBranch, searchQuery, advancedFilters, dobFrom, dobTo, heightMin, heightMax, weightMin, weightMax, filterDocuments, filterDistricts]);

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
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });

      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

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

      console.log('Fetching students with params:', params.toString());
      const response = await superAdminAPI.getAllStudents(params.toString());
      console.log('API Response:', response.data);
      const data = response.data;

      setStudents(data.data || []);
      setTotalStudents(data.total || 0);
      setTotalPages(data.totalPages || 1);
      console.log('Set total students:', data.total, 'Total pages:', data.totalPages);
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
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
    // Prepare regions and colleges data with IDs
    const regionsMap = new Map();
    const collegesMap = new Map();

    students.forEach(student => {
      if (student.region_id && student.region_name) {
        regionsMap.set(student.region_id, {
          id: student.region_id,
          name: student.region_name
        });
      }
      if (student.college_id && student.college_name) {
        collegesMap.set(student.college_id, {
          id: student.college_id,
          name: student.college_name,
          region_id: student.region_id
        });
      }
    });

    const regionsData = Array.from(regionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const collegesData = Array.from(collegesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

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

  const handleFieldToggle = (field) => {
    setExportFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSelectAllFields = () => {
    const allFields = [
      'prn', 'student_name', 'email', 'mobile_number', 'date_of_birth', 'age',
      'gender', 'height', 'weight', 'complete_address', 'branch',
      'cgpa_sem1', 'cgpa_sem2', 'cgpa_sem3', 'cgpa_sem4', 'cgpa_sem5', 'cgpa_sem6',
      'programme_cgpa', 'backlog_count', 'backlog_details',
      'has_driving_license', 'has_pan_card', 'college_name', 'region_name',
      'registration_status', 'is_blacklisted'
    ];
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl mb-8 p-10">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 animate-pulse"></div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-5 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-3xl blur-xl animate-pulse"></div>
                    <div className="relative p-5 bg-white/20 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30">
                      <Users className="text-white" size={40} />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                      Manage All Students
                    </h1>
                    <p className="text-indigo-100 text-lg font-medium">
                      Total: <span className="font-bold text-white">{totalStudents.toLocaleString()}</span> |
                      Showing: <span className="font-bold text-white">{students.length.toLocaleString()}</span>
                      {currentPage > 1 && ` | Page ${currentPage} of ${totalPages}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBulkDeletePhotoModal(true)}
                  className="group relative px-7 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3"
                >
                  <Trash2 size={20} />
                  <span className="text-lg">Bulk Delete Photos</span>
                </button>
                <button
                  onClick={handleOpenCustomExport}
                  className="group relative px-7 py-4 bg-white/95 backdrop-blur-sm text-indigo-700 hover:bg-white hover:shadow-2xl rounded-2xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-white/50"
                >
                  <Settings size={20} />
                  <span className="text-lg">Custom Export</span>
                </button>
              </div>
          </div>
        </div>
      </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 mb-8 border border-white/50">
          <div className="mb-6 flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Filter size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Filter Students</h3>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search PRN, name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                setFilterCollege(''); // Clear college filter when region changes
              }}
              className="input"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.region_name}>
                  {region.region_name}
                </option>
              ))}
            </select>
          </div>

          {/* College Filter */}
          <div>
            <select
              value={filterCollege}
              onChange={(e) => setFilterCollege(e.target.value)}
              className="input"
              disabled={!filterRegion}
            >
              <option value="">All Colleges</option>
              {colleges
                .filter(c => !filterRegion || c.region_name === filterRegion)
                .map((college) => (
                  <option key={college.id} value={college.college_name}>
                    {college.college_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="btn btn-secondary flex items-center space-x-2 mb-3"
        >
          <Filter size={18} />
          <span>Advanced Filters</span>
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
              {/* Branch Filter */}
              <div>
                <label className="label text-sm">Branch/Department</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="input"
                  disabled={!filterCollege}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
                {!filterCollege && (
                  <p className="text-xs text-gray-500 mt-1">Select a college first</p>
                )}
              </div>

              {/* CGPA Min */}
              <div>
                <label className="label text-sm">Minimum CGPA</label>
                <input
                  type="number"
                  value={advancedFilters.cgpaMin}
                  onChange={(e) => handleAdvancedFilterChange('cgpaMin', e.target.value)}
                  placeholder="e.g., 6.0"
                  min="0"
                  max="10"
                  step="0.1"
                  className="input"
                />
              </div>

              {/* Backlog Count */}
              <div>
                <label className="label text-sm">Maximum Backlogs</label>
                <input
                  type="number"
                  value={advancedFilters.backlogCount}
                  onChange={(e) => handleAdvancedFilterChange('backlogCount', e.target.value)}
                  placeholder="e.g., 0 for no backlogs"
                  min="0"
                  className="input"
                />
              </div>

              {/* DOB From */}
              <div>
                <label className="label text-sm">Date of Birth From</label>
                <input
                  type="date"
                  value={dobFrom}
                  onChange={(e) => setDobFrom(e.target.value)}
                  className="input"
                />
              </div>

              {/* DOB To */}
              <div>
                <label className="label text-sm">Date of Birth To</label>
                <input
                  type="date"
                  value={dobTo}
                  onChange={(e) => setDobTo(e.target.value)}
                  className="input"
                />
                {dobFrom && !dobTo && (
                  <p className="text-xs text-gray-500 mt-1">Defaults to today if not set</p>
                )}
              </div>

              {/* Height Min */}
              <div>
                <label className="label text-sm">Min Height (cm)</label>
                <input
                  type="number"
                  value={heightMin}
                  onChange={(e) => setHeightMin(e.target.value)}
                  placeholder="e.g., 155"
                  min="140"
                  max="220"
                  className="input"
                />
              </div>

              {/* Height Max */}
              <div>
                <label className="label text-sm">Max Height (cm)</label>
                <input
                  type="number"
                  value={heightMax}
                  onChange={(e) => setHeightMax(e.target.value)}
                  placeholder="e.g., 200"
                  min="140"
                  max="220"
                  className="input"
                />
              </div>

              {/* Weight Min */}
              <div>
                <label className="label text-sm">Min Weight (kg)</label>
                <input
                  type="number"
                  value={weightMin}
                  onChange={(e) => setWeightMin(e.target.value)}
                  placeholder="e.g., 45"
                  min="30"
                  max="150"
                  step="0.1"
                  className="input"
                />
              </div>

              {/* Weight Max */}
              <div>
                <label className="label text-sm">Max Weight (kg)</label>
                <input
                  type="number"
                  value={weightMax}
                  onChange={(e) => setWeightMax(e.target.value)}
                  placeholder="e.g., 100"
                  min="30"
                  max="150"
                  step="0.1"
                  className="input"
                />
              </div>

              {/* Driving License */}
              <div>
                <label className="label text-sm">Driving License</label>
                <select
                  value={filterDocuments.driving_license}
                  onChange={(e) => setFilterDocuments({...filterDocuments, driving_license: e.target.value})}
                  className="input"
                >
                  <option value="">Any</option>
                  <option value="yes">Has DL</option>
                  <option value="no">No DL</option>
                </select>
              </div>

              {/* PAN Card */}
              <div>
                <label className="label text-sm">PAN Card</label>
                <select
                  value={filterDocuments.pan_card}
                  onChange={(e) => setFilterDocuments({...filterDocuments, pan_card: e.target.value})}
                  className="input"
                >
                  <option value="">Any</option>
                  <option value="yes">Has PAN</option>
                  <option value="no">No PAN</option>
                </select>
              </div>

              {/* Aadhar Card */}
              <div>
                <label className="label text-sm">Aadhar Card</label>
                <select
                  value={filterDocuments.aadhar_card}
                  onChange={(e) => setFilterDocuments({...filterDocuments, aadhar_card: e.target.value})}
                  className="input"
                >
                  <option value="">Any</option>
                  <option value="yes">Has Aadhar</option>
                  <option value="no">No Aadhar</option>
                </select>
              </div>

              {/* Passport */}
              <div>
                <label className="label text-sm">Passport</label>
                <select
                  value={filterDocuments.passport}
                  onChange={(e) => setFilterDocuments({...filterDocuments, passport: e.target.value})}
                  className="input"
                >
                  <option value="">Any</option>
                  <option value="yes">Has Passport</option>
                  <option value="no">No Passport</option>
                </select>
              </div>

              {/* District Multi-select */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="label text-sm">District(s)</label>
                <select
                  multiple
                  value={filterDistricts}
                  onChange={(e) => setFilterDistricts(Array.from(e.target.selectedOptions, opt => opt.value))}
                  className="input"
                  size="3"
                  style={{ minHeight: '80px' }}
                >
                  {availableDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple districts. Selected: {filterDistricts.length}
                </p>
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
                Showing {students.length} of {totalStudents} students
              </div>
            </div>
          </div>
        )}
      </div>

        {/* CGPA Lock/Unlock Control */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Student CGPA Lock / Unlock</h4>
                <p className="text-xs text-gray-500 mt-0.5">Manage CGPA editing windows for colleges</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={cgpaSelectedCollege}
                onChange={(e) => {
                  const val = e.target.value;
                  setCgpaSelectedCollege(val);
                  if (val) fetchCgpaLockStatus(val);
                  else { setCgpaLocked(true); setCgpaUnlockWindow(null); }
                }}
                className="px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none"
              >
                <option value="">Select a college...</option>
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>{c.college_name}</option>
                ))}
              </select>

              {cgpaSelectedCollege && (
                <>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${cgpaLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {cgpaLocked ? 'LOCKED' : 'UNLOCKED'}
                  </span>
                  {!cgpaLocked && cgpaUnlockWindow && (
                    <span className="text-xs text-gray-500">
                      Expires: {new Date(cgpaUnlockWindow.unlock_end).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {cgpaLocked ? (
                    <button
                      onClick={() => { setCgpaGlobalMode(false); setShowCgpaUnlockModal(true); }}
                      disabled={cgpaProcessing}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Unlock size={13} /> Unlock
                    </button>
                  ) : (
                    <button
                      onClick={handleCgpaLock}
                      disabled={cgpaProcessing}
                      className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:from-red-700 hover:to-rose-700 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Lock size={13} /> Lock Now
                    </button>
                  )}
                </>
              )}

              <div className="border-l border-gray-300 pl-2 ml-1">
                {globalCgpaUnlocked ? (
                  <div className="flex items-center gap-2">
                    {globalCgpaWindow && (
                      <span className="text-xs text-gray-500">
                        Global expires: {new Date(globalCgpaWindow.unlock_end).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <button
                      onClick={handleGlobalCgpaLock}
                      disabled={cgpaProcessing}
                      className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:from-red-700 hover:to-rose-700 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Lock size={13} /> Lock All Colleges
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCgpaGlobalMode(true); setShowCgpaUnlockModal(true); }}
                    disabled={cgpaProcessing}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Unlock size={13} /> Unlock All Colleges
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    PRN
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    CGPA
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <Users className="mx-auto mb-4 text-gray-300" size={64} />
                    <p className="text-gray-500 text-lg font-semibold">No students found</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {student.prn}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {student.name}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.college_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.region_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.programme_cgpa || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.is_blacklisted ? (
                      <span className="badge badge-danger flex items-center space-x-1 w-fit">
                        <XCircle size={14} />
                        <span>Blacklisted</span>
                      </span>
                    ) : student.registration_status === 'approved' ? (
                      <span className="badge badge-success flex items-center space-x-1 w-fit">
                        <CheckCircle size={14} />
                        <span>Approved</span>
                      </span>
                    ) : student.registration_status === 'pending' ? (
                      <span className="badge badge-warning flex items-center space-x-1 w-fit">
                        <AlertTriangle size={14} />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="badge badge-danger flex items-center space-x-1 w-fit">
                        <XCircle size={14} />
                        <span>Rejected</span>
                      </span>
                    )}
                  </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(student)}
                          className="p-2 text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {student.is_blacklisted ? (
                          <button
                            onClick={() => handleWhitelistClick(student)}
                            className="p-2 text-green-600 hover:text-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Whitelist Student"
                          >
                            <Shield size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlacklistClick(student)}
                            className="p-2 text-orange-600 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Blacklist Student"
                          >
                            <Ban size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(student)}
                          className="p-2 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                          title="Delete Student"
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

        {/* Pagination Controls */}
          {totalStudents > 0 && (
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200 flex items-center justify-between rounded-b-3xl">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalStudents)}</span> of{' '}
                <span className="font-medium">{totalStudents}</span> results
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="input py-1 px-2 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <span className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Student Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Student Photo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {selectedStudent.photo_url ? (
                    <>
                      <img
                        src={selectedStudent.photo_url}
                        alt={selectedStudent.name}
                        className="w-32 h-32 object-cover rounded-lg border-4 border-primary-100 shadow-lg"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-primary-600 text-white rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-lg border-4 border-gray-300 bg-gray-200 shadow-lg flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-gray-500">No Photo</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white rounded-full p-2" title="Legacy Student - No Photo Uploaded">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">PRN</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.prn}</p>
                </div>
                <div>
                  <label className="label">Name</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.name}</p>
                </div>
                <div>
                  <label className="label">Email</label>
                  <p className="text-gray-900">{selectedStudent.email}</p>
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <p className="text-gray-900">{selectedStudent.mobile_number}</p>
                </div>
                <div>
                  <label className="label">College</label>
                  <p className="text-gray-900">{selectedStudent.college_name}</p>
                </div>
                <div>
                  <label className="label">Region</label>
                  <p className="text-gray-900">{selectedStudent.region_name}</p>
                </div>
                <div>
                  <label className="label">Branch</label>
                  <p className="text-gray-900">{selectedStudent.branch}</p>
                </div>
                <div>
                  <label className="label">Programme CGPA</label>
                  <p className="text-gray-900 font-medium">{selectedStudent.programme_cgpa || '-'}</p>
                </div>
                <div>
                  <label className="label">Backlogs</label>
                  <p className="text-gray-900">{selectedStudent.backlog_count}</p>
                </div>
                <div>
                  <label className="label">Status</label>
                  <p className="text-gray-900">
                    {selectedStudent.is_blacklisted
                      ? 'Blacklisted'
                      : selectedStudent.registration_status}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStudent(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete Student</h2>
            <p className="text-gray-600 mb-2">
              Are you sure you want to permanently delete this student?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm">
                <span className="font-semibold">PRN:</span> {selectedStudent.prn}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Name:</span> {selectedStudent.name}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {selectedStudent.email}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All student data including
                applications and records will be permanently deleted. The student can register again
                with the same PRN.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedStudent(null);
                }}
                disabled={deleting}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Ban className="text-orange-600" size={24} />
              <span>Blacklist Student</span>
            </h2>
            <p className="text-gray-600 mb-4">
              You are about to blacklist <span className="font-semibold">{selectedStudent.prn}</span>.
              This will prevent them from applying to jobs.
            </p>
            <div className="mb-4">
              <label className="label">Reason for Blacklisting *</label>
              <textarea
                className="input"
                rows="4"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Please provide a detailed reason for blacklisting this student..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmBlacklist}
                disabled={processing}
                className="btn bg-orange-600 hover:bg-orange-700 text-white flex-1"
              >
                {processing ? 'Blacklisting...' : 'Confirm Blacklist'}
              </button>
              <button
                onClick={() => {
                  setShowBlacklistModal(false);
                  setBlacklistReason('');
                  setSelectedStudent(null);
                }}
                disabled={processing}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Modal */}
      {showWhitelistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Shield className="text-green-600" size={24} />
              <span>Whitelist Student</span>
            </h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to whitelist <span className="font-semibold">{selectedStudent.prn}</span>?
              This will remove their blacklist status and allow them to apply for jobs again.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmWhitelist}
                disabled={processing}
                className="btn bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                {processing ? 'Whitelisting...' : 'Confirm Whitelist'}
              </button>
              <button
                onClick={() => {
                  setShowWhitelistModal(false);
                  setSelectedStudent(null);
                }}
                disabled={processing}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Export Modal */}
      {showCustomExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-[10vh] pb-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[82vh]">
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Settings size={18} className="text-gray-600" />
                Custom Export
              </h2>
              <button
                onClick={() => setShowCustomExportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
              {/* Export Format Selection */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Export Format</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 border-2 rounded-lg transition-all text-sm ${
                    exportFormat === 'excel' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-3.5 h-3.5 text-primary-600"
                    />
                    <span className="font-medium">Excel (.xlsx)</span>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 border-2 rounded-lg transition-all text-sm ${
                    exportFormat === 'pdf' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-3.5 h-3.5 text-primary-600"
                    />
                    <span className="font-medium">PDF (.pdf)</span>
                  </label>
                </div>
              </div>

              {/* PDF Settings (only shown when PDF format selected) */}
              {exportFormat === 'pdf' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">PDF Settings</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Company Name</label>
                      <input
                        type="text"
                        placeholder="e.g., TNSER Technology Solutions (P) Ltd"
                        className="input text-sm"
                        value={pdfSettings.companyName}
                        onChange={(e) => setPdfSettings({...pdfSettings, companyName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Placement Drive Date</label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={pdfSettings.driveDate}
                        onChange={(e) => setPdfSettings({...pdfSettings, driveDate: e.target.value})}
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={pdfSettings.includeSignature}
                        onChange={(e) => setPdfSettings({...pdfSettings, includeSignature: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Include Signature Column</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={pdfSettings.separateColleges}
                        onChange={(e) => setPdfSettings({...pdfSettings, separateColleges: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Separate Colleges by Page</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        checked={pdfSettings.useBranchShortNames}
                        onChange={(e) => setPdfSettings({...pdfSettings, useBranchShortNames: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Use Branch Short Names (e.g., CE, ME, CSE)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Filters Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Filters (Optional)</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="label text-xs">Region</label>
                    <select
                      value={exportFilters.region_id}
                      onChange={(e) => {
                        const regionId = e.target.value;
                        setExportFilters(prev => ({ ...prev, region_id: regionId, college_id: '', branches: [] }));

                        // Filter colleges by selected region
                        if (regionId) {
                          const filtered = exportCollegesData.filter(c => c.region_id === parseInt(regionId));
                          setFilteredExportColleges(filtered);
                        } else {
                          setFilteredExportColleges(exportCollegesData);
                        }
                        setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
                      }}
                      className="input text-sm"
                    >
                      <option value="">All Regions</option>
                      {exportRegionsData.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">College</label>
                    <select
                      value={exportFilters.college_id}
                      onChange={(e) => {
                        const collegeId = e.target.value;
                        setExportFilters(prev => ({ ...prev, college_id: collegeId, branches: [] }));

                        // Fetch branches for selected college
                        if (collegeId) {
                          fetchCollegeBranches(collegeId);
                        } else {
                          setAvailableBranches(KERALA_POLYTECHNIC_BRANCHES);
                        }
                      }}
                      className="input text-sm"
                    >
                      <option value="">All Colleges</option>
                      {filteredExportColleges.map((college) => (
                        <option key={college.id} value={college.id}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branches with Checkboxes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600">
                      Branches/Departments
                      {exportFilters.college_id && (
                        <span className="text-gray-400 ml-1">(Filtered by college)</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (exportFilters.branches.length === availableBranches.length) {
                          setExportFilters(prev => ({ ...prev, branches: [] }));
                        } else {
                          setExportFilters(prev => ({ ...prev, branches: [...availableBranches] }));
                        }
                      }}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                      disabled={fetchingBranches}
                    >
                      {exportFilters.branches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {fetchingBranches ? (
                    <div className="flex items-center justify-center h-32 border border-gray-200 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin h-6 w-6 border-3 border-primary-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-gray-500">Loading branches...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-0.5 max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-gray-50">
                      {availableBranches.map((branch) => (
                        <label key={branch} className="flex items-center gap-1.5 cursor-pointer hover:bg-white px-1.5 py-1 rounded text-[11px] transition-colors">
                          <input
                            type="checkbox"
                            checked={exportFilters.branches.includes(branch)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportFilters(prev => ({ ...prev, branches: [...prev.branches, branch] }));
                              } else {
                                setExportFilters(prev => ({ ...prev, branches: prev.branches.filter(b => b !== branch) }));
                              }
                            }}
                            className="checkbox w-3 h-3 flex-shrink-0"
                          />
                          <span className="leading-tight truncate">{branch}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {exportFilters.branches.length} branch(es) selected
                    {availableBranches.length < KERALA_POLYTECHNIC_BRANCHES.length && (
                      <span className="ml-1">({availableBranches.length} available)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Fields Selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className="text-xs font-semibold text-gray-700">Select Fields to Export <span className="text-red-500">*</span></h3>
                  <button
                    onClick={handleSelectAllFields}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-0.5 rounded hover:bg-primary-50 transition-colors"
                  >
                    {exportFields.length === 25 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-0.5 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-gray-50">
                  {[
                    { label: 'PRN', value: 'prn' },
                    { label: 'Student Name', value: 'student_name' },
                    { label: 'Email', value: 'email' },
                    { label: 'Mobile Number', value: 'mobile_number' },
                    { label: 'Date of Birth', value: 'date_of_birth' },
                    { label: 'Age', value: 'age' },
                    { label: 'Gender', value: 'gender' },
                    { label: 'Height (cm)', value: 'height' },
                    { label: 'Weight (kg)', value: 'weight' },
                    { label: 'Address', value: 'complete_address' },
                    { label: 'Branch', value: 'branch' },
                    { label: 'Semester 1 CGPA', value: 'cgpa_sem1' },
                    { label: 'Semester 2 CGPA', value: 'cgpa_sem2' },
                    { label: 'Semester 3 CGPA', value: 'cgpa_sem3' },
                    { label: 'Semester 4 CGPA', value: 'cgpa_sem4' },
                    { label: 'Semester 5 CGPA', value: 'cgpa_sem5' },
                    { label: 'Semester 6 CGPA', value: 'cgpa_sem6' },
                    { label: 'Programme CGPA', value: 'programme_cgpa' },
                    { label: 'Backlog Count', value: 'backlog_count' },
                    { label: 'Backlog Details', value: 'backlog_details' },
                    { label: 'Driving License', value: 'has_driving_license' },
                    { label: 'PAN Card', value: 'has_pan_card' },
                    { label: 'College Name', value: 'college_name' },
                    { label: 'Region Name', value: 'region_name' },
                    { label: 'Registration Status', value: 'registration_status' },
                    { label: 'Blacklist Status', value: 'is_blacklisted' },
                  ].map((field) => (
                    <label key={field.value} className="flex items-center gap-1.5 cursor-pointer hover:bg-white px-1.5 py-1 rounded text-[11px] transition-colors">
                      <input
                        type="checkbox"
                        checked={exportFields.includes(field.value)}
                        onChange={() => handleFieldToggle(field.value)}
                        className="checkbox w-3 h-3 flex-shrink-0"
                      />
                      <span className="leading-tight">{field.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {exportFields.length} field(s) selected
                </p>
              </div>

              {/* Photo URL Option (Excel only) */}
              {exportFormat === 'excel' && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={includePhotoUrl}
                      onChange={(e) => setIncludePhotoUrl(e.target.checked)}
                      className="checkbox h-3.5 w-3.5 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-700">Include Student Photo URLs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={useBranchShortNames}
                      onChange={(e) => setUseBranchShortNames(e.target.checked)}
                      className="checkbox h-3.5 w-3.5 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-700">Use Branch Short Names (CE, ME, CSE)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2.5 flex justify-between items-center bg-gray-50 rounded-b-xl">
              <p className="text-[11px] text-gray-400">{exportFields.length} fields selected</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomExportModal(false)}
                  className="btn btn-secondary text-xs px-3 py-1.5"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomExport}
                  className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  disabled={processing || exportFields.length === 0}
                >
                  <Download size={14} />
                  <span>{processing ? 'Exporting...' : `Export ${exportFormat === 'pdf' ? 'PDF' : 'Excel'}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Photos Modal */}
      {showBulkDeletePhotoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 px-5 py-3.5 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trash2 size={20} className="text-red-500" />
                Bulk Delete Photos
              </h2>
              <button
                onClick={() => {
                  setShowBulkDeletePhotoModal(false);
                  setBulkDeleteData({
                    prn_list: '',
                    prn_range_start: '',
                    prn_range_end: '',
                    date_start: '',
                    date_end: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Warning Banner */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-medium text-red-800">Permanent Action</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    This will permanently delete photos from Cloudinary and the database. Cannot be undone.
                  </p>
                </div>
              </div>

              {/* Deletion Type Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Deletion Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBulkDeleteType('single_prn')}
                    className={`py-2 px-3 border-2 rounded-lg text-xs font-medium transition-all ${
                      bulkDeleteType === 'single_prn'
                        ? 'border-primary-600 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Single/Multiple PRNs
                  </button>
                  <button
                    onClick={() => setBulkDeleteType('prn_range')}
                    className={`py-2 px-3 border-2 rounded-lg text-xs font-medium transition-all ${
                      bulkDeleteType === 'prn_range'
                        ? 'border-primary-600 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    PRN Range
                  </button>
                  <button
                    onClick={() => setBulkDeleteType('date_range')}
                    className={`py-2 px-3 border-2 rounded-lg text-xs font-medium transition-all ${
                      bulkDeleteType === 'date_range'
                        ? 'border-primary-600 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    Date Range
                  </button>
                </div>
              </div>

              {/* Conditional Input Fields */}
              {bulkDeleteType === 'single_prn' && (
                <div>
                  <label className="label text-xs">PRN Numbers (comma-separated)</label>
                  <textarea
                    className="input text-sm"
                    rows="3"
                    value={bulkDeleteData.prn_list}
                    onChange={(e) => setBulkDeleteData({ ...bulkDeleteData, prn_list: e.target.value })}
                    placeholder="e.g., 2301150001, 2301150002, 2301150003"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter one or more PRN numbers separated by commas
                  </p>
                </div>
              )}

              {bulkDeleteType === 'prn_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Start PRN</label>
                    <input
                      type="text"
                      className="input text-sm"
                      value={bulkDeleteData.prn_range_start}
                      onChange={(e) => setBulkDeleteData({ ...bulkDeleteData, prn_range_start: e.target.value })}
                      placeholder="e.g., 2301150001"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">End PRN</label>
                    <input
                      type="text"
                      className="input text-sm"
                      value={bulkDeleteData.prn_range_end}
                      onChange={(e) => setBulkDeleteData({ ...bulkDeleteData, prn_range_end: e.target.value })}
                      placeholder="e.g., 2301150100"
                    />
                  </div>
                </div>
              )}

              {bulkDeleteType === 'date_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Start Date</label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={bulkDeleteData.date_start}
                      onChange={(e) => setBulkDeleteData({ ...bulkDeleteData, date_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">End Date</label>
                    <input
                      type="date"
                      className="input text-sm"
                      value={bulkDeleteData.date_end}
                      onChange={(e) => setBulkDeleteData({ ...bulkDeleteData, date_end: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-400 col-span-2">
                    Photos uploaded between these dates will be deleted (inclusive)
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 px-5 py-3 flex justify-end gap-2 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowBulkDeletePhotoModal(false);
                  setBulkDeleteData({
                    prn_list: '',
                    prn_range_start: '',
                    prn_range_end: '',
                    date_start: '',
                    date_end: '',
                  });
                }}
                className="btn btn-secondary text-sm px-4 py-2"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeletePhotos}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                disabled={processing}
              >
                <Trash2 size={16} />
                <span>{processing ? 'Deleting...' : 'Delete Photos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CGPA Unlock Modal */}
      {showCgpaUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2">
                <GraduationCap className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {cgpaGlobalMode ? 'Unlock CGPA — All Colleges' : 'Unlock CGPA Editing'}
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {cgpaGlobalMode
                ? 'This will open CGPA editing for ALL approved students across every college. A notification will be sent.'
                : 'Students in this college will be able to update their semester CGPA during the unlock window. A notification will be sent to all approved students.'
              }
            </p>
            {cgpaGlobalMode && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span className="text-amber-800 text-xs font-bold">Global unlock affects all 60 colleges</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={unlockDays}
                  onChange={(e) => setUnlockDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g., Semester 4 results published"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none font-medium"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCgpaUnlock}
                disabled={cgpaProcessing}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                {cgpaProcessing ? 'Processing...' : `Unlock for ${unlockDays} days`}
              </button>
              <button
                onClick={() => { setShowCgpaUnlockModal(false); setCgpaGlobalMode(false); }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

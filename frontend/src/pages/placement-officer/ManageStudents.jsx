import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, X, Ban, Shield, Eye, Search, Download, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, Settings, XCircle } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import { BRANCH_SHORT_NAMES } from '../../constants/branches';

export default function ManageStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Bulk Selection
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [whitelistReason, setWhitelistReason] = useState('');

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
  }, []);

  const fetchDistricts = async () => {
    try {
      const response = await placementOfficerAPI.getAvailableDistricts();
      setAvailableDistricts(response.data.districts || []);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentPage, pageSize, activeTab, searchQuery, advancedFilters, filterDocuments, filterDistricts]);

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
  }, [activeTab, searchQuery, advancedFilters, filterDocuments, filterDistricts]);

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

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (advancedFilters.cgpaMin) {
        params.cgpa_min = advancedFilters.cgpaMin;
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

      const response = await placementOfficerAPI.getStudents(params);
      const studentsData = response.data.data || [];
      setStudents(studentsData);
      setTotalStudents(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);

      fetchStatusCounts();
    } catch (error) {
      toast.error('Failed to load students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusCounts = async () => {
    try {
      const [allRes, pendingRes, approvedRes, rejectedRes, blacklistedRes] = await Promise.all([
        placementOfficerAPI.getStudents({ limit: 1, page: 1 }),
        placementOfficerAPI.getStudents({ status: 'pending', limit: 1, page: 1 }),
        placementOfficerAPI.getStudents({ status: 'approved', limit: 1, page: 1 }),
        placementOfficerAPI.getStudents({ status: 'rejected', limit: 1, page: 1 }),
        placementOfficerAPI.getStudents({ status: 'blacklisted', limit: 1, page: 1 }),
      ]);

      setStatusCounts({
        all: allRes.data.total || 0,
        pending: pendingRes.data.total || 0,
        approved: approvedRes.data.total || 0,
        rejected: rejectedRes.data.total || 0,
        blacklisted: blacklistedRes.data.total || 0,
      });
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  };

  const handleApprove = async (studentId) => {
    if (!window.confirm('Are you sure you want to approve this student?')) return;
    try {
      await placementOfficerAPI.approveStudent(studentId);
      toast.success('Student approved successfully');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve student');
    }
  };

  const handleReject = async (studentId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;
    try {
      await placementOfficerAPI.rejectStudent(studentId, reason);
      toast.success('Student rejected');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject student');
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
    try {
      const promises = selectedStudents.map((id) => placementOfficerAPI.approveStudent(id));
      await Promise.all(promises);
      toast.success(`${selectedStudents.length} student(s) approved successfully`);
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve some students');
      fetchStudents();
    }
  };

  const handleBulkReject = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    const reason = window.prompt('Please provide a reason for rejecting these students:');
    if (!reason) return;
    try {
      const promises = selectedStudents.map((id) => placementOfficerAPI.rejectStudent(id, reason));
      await Promise.all(promises);
      toast.success(`${selectedStudents.length} student(s) rejected`);
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject some students');
      fetchStudents();
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
      fetchStudents();
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-2 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-2 border-red-200',
    };
    return (
      <span className={`w-fit text-sm font-bold px-4 py-2 rounded-xl flex items-center justify-center ${styles[status] || 'bg-gray-100 text-gray-800 border-2 border-gray-200'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getBlacklistBadge = (isBlacklisted) => {
    if (isBlacklisted) {
      return <span className="w-fit bg-red-900 text-white text-sm font-bold px-4 py-2 rounded-xl border-2 border-red-800 flex items-center justify-center">Blacklisted</span>;
    }
    return <span className="w-fit bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-xl border-2 border-green-200 flex items-center justify-center">Active</span>;
  };

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
    const allFields = [
      'prn', 'student_name', 'email', 'mobile_number', 'date_of_birth', 'age', 'gender',
      'branch', 'programme_cgpa', 'cgpa_sem1', 'cgpa_sem2', 'cgpa_sem3', 'cgpa_sem4',
      'cgpa_sem5', 'cgpa_sem6', 'backlog_count', 'has_driving_license', 'has_pan_card',
      'registration_status'
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
      const payload = {
        branches: exportBranches.length > 0 ? exportBranches : undefined,
        fields: exportFields,
        include_photo_url: includePhotoUrl,
        status: activeTab !== 'all' ? activeTab : undefined,
        format: exportFormat,
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

  const handleExportCSV = async () => {
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

      if (advancedFilters.backlogCount !== '') {
        params.backlog = advancedFilters.backlogCount;
      }

      if (advancedFilters.branch) {
        params.branch = advancedFilters.branch;
      }

      // New advanced filters
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

      params.limit = 10000;
      params.page = 1;

      const response = await placementOfficerAPI.getStudents(params);
      const allStudents = response.data.data || [];

      if (allStudents.length === 0) {
        toast.error('No students to export');
        return;
      }

      const headers = [
        'PRN',
        'Name',
        'Email',
        'Mobile Number',
        'Branch',
        'Date of Birth',
        'CGPA',
        'Backlog Count',
        'Backlog Details',
        'Registration Status',
        'Is Blacklisted',
        'Registration Date',
      ];

      const rows = allStudents.map((student) => [
        student.prn || '',
        student.name || '',
        student.email || '',
        student.mobile_number || '',
        useBranchShortNames && student.branch ? (BRANCH_SHORT_NAMES[student.branch] || student.branch) : (student.branch || ''),
        student.date_of_birth ? (() => {
          const date = new Date(student.date_of_birth);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        })() : '',
        student.programme_cgpa || '',
        student.backlog_count !== undefined ? student.backlog_count : '',
        student.backlog_details || '',
        student.registration_status || '',
        student.is_blacklisted ? 'Yes' : 'No',
        student.created_at ? (() => {
          const date = new Date(student.created_at);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        })() : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `students_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${allStudents.length} students to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students');
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
        ...(advancedFilters.backlogCount !== '' && { backlog: advancedFilters.backlogCount }),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <DashboardHeader
          icon={Users}
          title="Manage Students"
          subtitle="View, approve, reject, and blacklist students from your college"
        />

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={totalStudents === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Export</span>
            <ChevronDown size={16} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showExportDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportDropdown(false)}
              />
              <GlassCard className="absolute right-0 mt-2 w-64 z-20 overflow-hidden p-0">
                <button
                  onClick={() => {
                    setShowExcelConfigModal(true);
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center space-x-3 border-b border-gray-200 transition-colors"
                >
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2">
                    <Download size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Export to Excel</div>
                    <div className="text-xs text-gray-600">Standard fields export</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowPdfConfigModal(true);
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center space-x-3 border-b border-gray-200 transition-colors"
                >
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-lg p-2">
                    <Download size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Export to PDF</div>
                    <div className="text-xs text-gray-600">Print-ready document</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowCustomExportModal(true);
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center space-x-3 transition-colors"
                >
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-2">
                    <Settings size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Custom Export</div>
                    <div className="text-xs text-gray-600">Choose fields & format</div>
                  </div>
                </button>
              </GlassCard>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { key: 'all', label: 'All Students', gradient: 'from-blue-600 to-indigo-600' },
          { key: 'pending', label: 'Pending Approval', gradient: 'from-yellow-500 to-orange-600' },
          { key: 'approved', label: 'Approved', gradient: 'from-green-500 to-emerald-600' },
          { key: 'rejected', label: 'Rejected', gradient: 'from-red-500 to-rose-600' },
          { key: 'blacklisted', label: 'Blacklisted', gradient: 'from-red-900 to-red-800' },
        ].map(({ key, label, gradient }) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              activeTab === key
                ? `bg-gradient-to-r ${gradient} text-white shadow-xl`
                : 'bg-white/95 backdrop-blur-xl text-gray-700 hover:bg-white border-2 border-white/20'
            }`}
          >
            {label}
            <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${
              activeTab === key ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {statusCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <GlassCard className="p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
              <Search className="text-white" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search by PRN, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-transparent border-none outline-none focus:ring-0 font-medium text-lg"
            />
          </div>
        </GlassCard>
      </div>

      {/* Advanced Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="bg-white/95 backdrop-blur-xl text-gray-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 border-2 border-white/20"
        >
          <Filter size={18} />
          <span>Advanced Filters</span>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Minimum CGPA</label>
                  <input
                    type="number"
                    value={advancedFilters.cgpaMin}
                    onChange={(e) => handleAdvancedFilterChange('cgpaMin', e.target.value)}
                    placeholder="e.g., 6.0"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maximum CGPA</label>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maximum Backlogs</label>
                  <input
                    type="number"
                    value={advancedFilters.backlogCount}
                    onChange={(e) => handleAdvancedFilterChange('backlogCount', e.target.value)}
                    placeholder="e.g., 0 for no backlogs"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branch/Department</label>
                  <select
                    value={advancedFilters.branch}
                    onChange={(e) => handleAdvancedFilterChange('branch', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">All Branches</option>
                    {collegeBranches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
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
                  {advancedFilters.dobFrom && !advancedFilters.dobTo && (
                    <p className="text-xs text-gray-500 mt-1">Defaults to today if not set</p>
                  )}
                </div>

                {/* Height Min */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Min Height (cm)</label>
                  <input
                    type="number"
                    value={advancedFilters.heightMin}
                    onChange={(e) => handleAdvancedFilterChange('heightMin', e.target.value)}
                    placeholder="e.g., 155"
                    min="140"
                    max="220"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>

                {/* Height Max */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Max Height (cm)</label>
                  <input
                    type="number"
                    value={advancedFilters.heightMax}
                    onChange={(e) => handleAdvancedFilterChange('heightMax', e.target.value)}
                    placeholder="e.g., 200"
                    min="140"
                    max="220"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>

                {/* Weight Min */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Min Weight (kg)</label>
                  <input
                    type="number"
                    value={advancedFilters.weightMin}
                    onChange={(e) => handleAdvancedFilterChange('weightMin', e.target.value)}
                    placeholder="e.g., 45"
                    min="30"
                    max="150"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>

                {/* Weight Max */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Max Weight (kg)</label>
                  <input
                    type="number"
                    value={advancedFilters.weightMax}
                    onChange={(e) => handleAdvancedFilterChange('weightMax', e.target.value)}
                    placeholder="e.g., 100"
                    min="30"
                    max="150"
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  />
                </div>

                {/* Driving License */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Driving License</label>
                  <select
                    value={filterDocuments.driving_license}
                    onChange={(e) => setFilterDocuments({...filterDocuments, driving_license: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">Any</option>
                    <option value="yes">Has DL</option>
                    <option value="no">No DL</option>
                  </select>
                </div>

                {/* PAN Card */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">PAN Card</label>
                  <select
                    value={filterDocuments.pan_card}
                    onChange={(e) => setFilterDocuments({...filterDocuments, pan_card: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">Any</option>
                    <option value="yes">Has PAN</option>
                    <option value="no">No PAN</option>
                  </select>
                </div>

                {/* Aadhar Card */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Aadhar Card</label>
                  <select
                    value={filterDocuments.aadhar_card}
                    onChange={(e) => setFilterDocuments({...filterDocuments, aadhar_card: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">Any</option>
                    <option value="yes">Has Aadhar</option>
                    <option value="no">No Aadhar</option>
                  </select>
                </div>

                {/* Passport */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Passport</label>
                  <select
                    value={filterDocuments.passport}
                    onChange={(e) => setFilterDocuments({...filterDocuments, passport: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">Any</option>
                    <option value="yes">Has Passport</option>
                    <option value="no">No Passport</option>
                  </select>
                </div>

                {/* District Multi-select */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-bold text-gray-700 mb-2">District(s)</label>
                  <select
                    multiple
                    value={filterDistricts}
                    onChange={(e) => setFilterDistricts(Array.from(e.target.selectedOptions, opt => opt.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
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
                    Hold Ctrl/Cmd to select multiple. Selected: {filterDistricts.length}
                  </p>
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <span className="text-sm text-gray-600 font-bold">
                Showing {students.length} of {totalStudents} students
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

      {/* Bulk Actions */}
      {getPendingStudentsInView().length > 0 && (
        <GlassCard variant="elevated" className="mb-6 p-6 border-2 border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-base font-bold text-gray-700">
                {selectedStudents.length > 0 ? (
                  <>
                    <span className="text-blue-600 text-xl">{selectedStudents.length}</span> student(s) selected
                  </>
                ) : (
                  'Select students to perform bulk actions'
                )}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkApprove}
                disabled={selectedStudents.length === 0}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                <span>Approve Selected</span>
              </button>
              <button
                onClick={handleBulkReject}
                disabled={selectedStudents.length === 0}
                className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-red-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                <span>Reject Selected</span>
            </button>
          </div>
        </GlassCard>
      )}

      {/* Students Table */}
      <GlassCard variant="elevated" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  {getPendingStudentsInView().length > 0 && (
                    <th className="px-6 py-4 text-left font-bold">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === getPendingStudentsInView().length && getPendingStudentsInView().length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 rounded-lg"
                        title="Select All"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left font-bold">PRN</th>
                  <th className="px-6 py-4 text-left font-bold">Name</th>
                  <th className="px-6 py-4 text-left font-bold">Email</th>
                  <th className="px-6 py-4 text-left font-bold">Mobile</th>
                  <th className="px-6 py-4 text-left font-bold">CGPA</th>
                  <th className="px-6 py-4 text-left font-bold">Backlogs</th>
                  <th className="px-6 py-4 text-left font-bold">Status</th>
                  <th className="px-6 py-4 text-left font-bold">Blacklist</th>
                  <th className="px-6 py-4 text-left font-bold">Reg. Date</th>
                  <th className="px-6 py-4 text-left font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={getPendingStudentsInView().length > 0 ? "11" : "10"} className="text-center text-gray-500 py-12 font-medium text-lg">
                      {searchQuery || hasActiveFilters()
                        ? 'No students found matching your filters'
                        : `No ${activeTab === 'all' ? '' : activeTab} students found`}
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr key={student.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {getPendingStudentsInView().length > 0 && (
                        <td className="px-6 py-4">
                          {student.registration_status === 'pending' && !student.is_blacklisted ? (
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-5 h-5 rounded-lg"
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">{student.prn}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{student.name || '-'}</td>
                      <td className="px-6 py-4 text-gray-700">{student.email}</td>
                      <td className="px-6 py-4 text-gray-700">{student.mobile_number || '-'}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{student.programme_cgpa || '-'}</td>
                      <td className="px-6 py-4">
                        {student.backlogs ? (
                          <span className="text-red-600 font-bold text-lg">{student.backlogs}</span>
                        ) : (
                          <span className="text-green-600 font-bold text-lg">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(student.registration_status)}</td>
                      <td className="px-6 py-4">{getBlacklistBadge(student.is_blacklisted)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {student.created_at ? (() => {
                          const date = new Date(student.created_at);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}-${month}-${year}`;
                        })() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {student.registration_status === 'pending' && !student.is_blacklisted && (
                            <>
                              <button
                                onClick={() => handleApprove(student.id)}
                                className="text-green-600 hover:text-green-800 transform hover:scale-125 transition-all"
                                title="Approve"
                              >
                                <Check size={24} />
                              </button>
                              <button
                                onClick={() => handleReject(student.id)}
                                className="text-red-600 hover:text-red-800 transform hover:scale-125 transition-all"
                                title="Reject"
                              >
                                <X size={24} />
                              </button>
                            </>
                          )}
                          {student.registration_status === 'approved' && !student.is_blacklisted && (
                            <>
                              <button
                                onClick={() => openDetailsModal(student)}
                                className="text-blue-600 hover:text-blue-800 transform hover:scale-125 transition-all"
                                title="View Details"
                              >
                                <Eye size={24} />
                              </button>
                              <button
                                onClick={() => handleBlacklist(student)}
                                className="text-red-600 hover:text-red-800 transform hover:scale-125 transition-all"
                                title="Blacklist"
                              >
                                <Ban size={24} />
                              </button>
                            </>
                          )}
                          {student.is_blacklisted && (
                            <button
                              onClick={() => handleRequestWhitelist(student)}
                              className="text-green-600 hover:text-green-800 transform hover:scale-125 transition-all"
                              title="Request Whitelist"
                            >
                              <Shield size={24} />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 font-bold">
                  Showing <span className="text-blue-600">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                  <span className="text-blue-600">{Math.min(currentPage * pageSize, totalStudents)}</span> of{' '}
                  <span className="text-blue-600">{totalStudents}</span> results
                </span>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 font-bold">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg font-bold bg-white"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-all flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <span className="text-sm text-gray-700 font-bold px-4">
                  Page <span className="text-blue-600">{currentPage}</span> of{' '}
                  <span className="text-blue-600">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-all flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </GlassCard>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Student Details</h2>
            <div className="space-y-6">
              {/* Student Photo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {selectedStudent.photo_url ? (
                    <>
                      <img
                        src={selectedStudent.photo_url}
                        alt={selectedStudent.name}
                        className="w-32 h-32 object-cover rounded-lg border-4 border-blue-100 shadow-lg"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2">
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

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">PRN</p>
                    <p className="font-mono font-bold text-lg">{selectedStudent.prn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Name</p>
                    <p className="font-bold text-lg">{selectedStudent.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Email</p>
                    <p className="text-gray-900">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Mobile Number</p>
                    <p className="text-gray-900">{selectedStudent.mobile_number || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">College Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">College</p>
                    <p className="font-bold text-lg">{selectedStudent.college_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Region</p>
                    <p className="text-gray-900">{selectedStudent.region_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Branch</p>
                    <p className="font-bold text-lg">{selectedStudent.branch || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Academic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Programme CGPA</p>
                    <p className="font-bold text-2xl text-blue-600">{selectedStudent.programme_cgpa || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Backlogs</p>
                    <p className={`font-bold text-2xl ${selectedStudent.backlogs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedStudent.backlogs || 0}
                    </p>
                  </div>
                </div>
                {selectedStudent.backlog_details && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 font-bold mb-1">Backlog Details</p>
                    <p className="text-sm bg-white p-3 rounded-xl border-2 border-gray-200">{selectedStudent.backlog_details}</p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl border-2 border-orange-100">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Registration Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-2">Registration Status</p>
                    {getStatusBadge(selectedStudent.registration_status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-2">Blacklist Status</p>
                    {getBlacklistBadge(selectedStudent.is_blacklisted)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold mb-1">Registration Date</p>
                    <p className="text-gray-900 font-bold">{selectedStudent.created_at ? (() => {
                      const date = new Date(selectedStudent.created_at);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}-${month}-${year}`;
                    })() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 text-gray-700 font-bold px-8 py-4 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Blacklist Student</h2>
            <p className="text-gray-700 mb-6 font-medium">
              You are about to blacklist <span className="font-bold text-red-600">{selectedStudent.prn}</span>.
              This will prevent them from applying to jobs.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Blacklisting *</label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all font-medium bg-white"
                rows="4"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Please provide a detailed reason for blacklisting this student..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmBlacklist}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-red-700 hover:to-rose-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Confirm Blacklist
              </button>
              <button
                onClick={() => {
                  setShowBlacklistModal(false);
                  setBlacklistReason('');
                  setSelectedStudent(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Request Whitelist Modal */}
      {showWhitelistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Request Whitelist</h2>
            <p className="text-gray-700 mb-6 font-medium">
              Submit a request to the Super Admin to whitelist <span className="font-bold text-green-600">{selectedStudent.prn}</span>.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Whitelist Request *</label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all font-medium bg-white"
                rows="4"
                value={whitelistReason}
                onChange={(e) => setWhitelistReason(e.target.value)}
                placeholder="Please explain why this student should be whitelisted..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmRequestWhitelist}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowWhitelistModal(false);
                  setWhitelistReason('');
                  setSelectedStudent(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Excel Configuration Modal */}
      {showExcelConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Excel Export Settings</h2>

            <div className="space-y-5 mb-8">
              <label className="flex items-center space-x-3 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all">
                <input
                  type="checkbox"
                  checked={useBranchShortNames}
                  onChange={(e) => setUseBranchShortNames(e.target.checked)}
                  className="w-5 h-5 rounded-lg"
                />
                <span className="font-bold text-gray-900">Use Branch Short Names (e.g., CE, ME, CSE instead of full names)</span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleExcelExport}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export to Excel'}
              </button>
              <button
                onClick={() => {
                  setShowExcelConfigModal(false);
                  setUseBranchShortNames(false);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Custom Export Modal */}
      {showCustomExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <Settings size={24} className="text-indigo-600" />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Custom Export</span>
              </h2>
              <button
                onClick={() => setShowCustomExportModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Export Format Selection */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold mb-3">Export Format</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium">Excel (.xlsx)</span>
                      <span className="text-sm text-gray-500 ml-2">- Editable spreadsheet</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-medium">PDF (.pdf)</span>
                      <span className="text-sm text-gray-500 ml-2">- Print-ready document</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* PDF Settings */}
              {exportFormat === 'pdf' && (
                <div className="border-b border-gray-200 pb-4 bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">PDF Settings (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                      <input
                        type="text"
                        placeholder="e.g., TNSER Technology Solutions"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                        value={customExportSettings.companyName}
                        onChange={(e) => setCustomExportSettings({...customExportSettings, companyName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Drive Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                        value={customExportSettings.driveDate}
                        onChange={(e) => setCustomExportSettings({...customExportSettings, driveDate: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customExportSettings.includeSignature}
                          onChange={(e) => setCustomExportSettings({...customExportSettings, includeSignature: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span>Include Signature Column</span>
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                        <input
                          type="checkbox"
                          checked={customExportSettings.useBranchShortNames}
                          onChange={(e) => setCustomExportSettings({...customExportSettings, useBranchShortNames: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="font-medium">Use Branch Short Names (e.g., CE, ME, CSE)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Filter */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Filter by Branch (Optional)</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (exportBranches.length === collegeBranches.length) {
                        setExportBranches([]);
                      } else {
                        setExportBranches([...collegeBranches]);
                      }
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    {exportBranches.length === collegeBranches.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {collegeBranches.map((branch) => (
                    <label key={branch} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={exportBranches.includes(branch)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportBranches([...exportBranches, branch]);
                          } else {
                            setExportBranches(exportBranches.filter(b => b !== branch));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{branch}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {exportBranches.length > 0 ? `${exportBranches.length} branch(es) selected` : 'All branches will be included'}
                </p>
              </div>

              {/* Fields Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Select Fields to Export *</h3>
                  <button
                    onClick={handleSelectAllFields}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    {exportFields.length === 19 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {[
                    { label: 'PRN', value: 'prn' },
                    { label: 'Student Name', value: 'student_name' },
                    { label: 'Email', value: 'email' },
                    { label: 'Mobile Number', value: 'mobile_number' },
                    { label: 'Date of Birth', value: 'date_of_birth' },
                    { label: 'Age', value: 'age' },
                    { label: 'Gender', value: 'gender' },
                    { label: 'Branch', value: 'branch' },
                    { label: 'Programme CGPA', value: 'programme_cgpa' },
                    { label: 'Semester 1 CGPA', value: 'cgpa_sem1' },
                    { label: 'Semester 2 CGPA', value: 'cgpa_sem2' },
                    { label: 'Semester 3 CGPA', value: 'cgpa_sem3' },
                    { label: 'Semester 4 CGPA', value: 'cgpa_sem4' },
                    { label: 'Semester 5 CGPA', value: 'cgpa_sem5' },
                    { label: 'Semester 6 CGPA', value: 'cgpa_sem6' },
                    { label: 'Backlog Count', value: 'backlog_count' },
                    { label: 'Driving License', value: 'has_driving_license' },
                    { label: 'PAN Card', value: 'has_pan_card' },
                    { label: 'Registration Status', value: 'registration_status' },
                  ].map((field) => (
                    <label key={field.value} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={exportFields.includes(field.value)}
                        onChange={() => handleFieldToggle(field.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  {exportFields.length} field(s) selected
                </p>
              </div>

              {/* Excel-only Options */}
              {exportFormat === 'excel' && (
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includePhotoUrl}
                      onChange={(e) => setIncludePhotoUrl(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">Include Student Photo URLs</span>
                      <p className="text-xs text-gray-600 mt-1">Adds a column with photo URLs for students who have uploaded photos</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:border-blue-400 transition-all">
                    <input
                      type="checkbox"
                      checked={customExportSettings.useBranchShortNames}
                      onChange={(e) => setCustomExportSettings({...customExportSettings, useBranchShortNames: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">Use Branch Short Names</span>
                      <p className="text-xs text-gray-600 mt-1">Export branch names as abbreviations (e.g., CE, ME, CSE)</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowCustomExportModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-3 rounded-xl transition-all"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomExport}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center space-x-2"
                disabled={processing || exportFields.length === 0}
              >
                <Download size={18} />
                <span>{processing ? 'Exporting...' : `Export to ${exportFormat === 'pdf' ? 'PDF' : 'Excel'}`}</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* PDF Configuration Modal */}
      {showPdfConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">PDF Export Settings</h2>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Company Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., TNSER Technology Solutions (P) Ltd"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  value={pdfCompanyName}
                  onChange={(e) => setPdfCompanyName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2 font-medium">Leave empty for data collection exports</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Placement Drive Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                  value={pdfDriveDate}
                  onChange={(e) => setPdfDriveDate(e.target.value)}
                />
              </div>

              <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={pdfIncludeSignature}
                  onChange={(e) => setPdfIncludeSignature(e.target.checked)}
                  className="w-5 h-5 rounded-lg"
                />
                <span className="font-bold text-gray-900">Include Signature Column</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={pdfSeparateColleges}
                  onChange={(e) => setPdfSeparateColleges(e.target.checked)}
                  className="w-5 h-5 rounded-lg"
                />
                <span className="font-bold text-gray-900">Separate Colleges by Page (Each college starts on a new page)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all">
                <input
                  type="checkbox"
                  checked={useBranchShortNames}
                  onChange={(e) => setUseBranchShortNames(e.target.checked)}
                  className="w-5 h-5 rounded-lg"
                />
                <span className="font-bold text-gray-900">Use Branch Short Names (e.g., CE, ME, CSE instead of full names)</span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handlePdfExport}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                onClick={() => {
                  setShowPdfConfigModal(false);
                  setPdfCompanyName('');
                  setPdfDriveDate('');
                  setPdfIncludeSignature(false);
                  setPdfSeparateColleges(false);
                  setUseBranchShortNames(false);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl hover:bg-gray-300 transition-all transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

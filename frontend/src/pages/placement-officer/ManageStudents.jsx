import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, X, Ban, Shield, Eye, Search, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../constants/branches';

export default function ManageStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
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

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    cgpaMin: '',
    cgpaMax: '',
    backlogCount: '',
    dobFrom: '',
    dobTo: '',
    branch: '',
  });

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [whitelistReason, setWhitelistReason] = useState('');

  useEffect(() => {
    // Check for status query param
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && ['all', 'pending', 'approved', 'rejected', 'blacklisted'].includes(status)) {
      setActiveTab(status);
    }
  }, [location.search]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [activeTab, searchQuery, students, advancedFilters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getStudents({});
      const studentsData = response.data.data || [];
      setStudents(studentsData);
      calculateStatusCounts(studentsData);
    } catch (error) {
      toast.error('Failed to load students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusCounts = (studentsData) => {
    const counts = {
      all: studentsData.length,
      pending: studentsData.filter((s) => s.registration_status === 'pending').length,
      approved: studentsData.filter((s) => s.registration_status === 'approved').length,
      rejected: studentsData.filter((s) => s.registration_status === 'rejected').length,
      blacklisted: studentsData.filter((s) => s.is_blacklisted).length,
    };
    setStatusCounts(counts);
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter((s) => s.registration_status === 'pending');
    } else if (activeTab === 'approved') {
      filtered = filtered.filter((s) => s.registration_status === 'approved');
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter((s) => s.registration_status === 'rejected');
    } else if (activeTab === 'blacklisted') {
      filtered = filtered.filter((s) => s.is_blacklisted);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.prn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply advanced filters
    if (advancedFilters.cgpaMin) {
      const minCGPA = parseFloat(advancedFilters.cgpaMin);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) >= minCGPA);
    }

    if (advancedFilters.cgpaMax) {
      const maxCGPA = parseFloat(advancedFilters.cgpaMax);
      filtered = filtered.filter((s) => parseFloat(s.cgpa) <= maxCGPA);
    }

    if (advancedFilters.backlogCount !== '') {
      const maxBacklogs = parseInt(advancedFilters.backlogCount);
      filtered = filtered.filter((s) => parseInt(s.backlog_count || 0) <= maxBacklogs);
    }

    if (advancedFilters.dobFrom) {
      filtered = filtered.filter((s) => s.date_of_birth && new Date(s.date_of_birth) >= new Date(advancedFilters.dobFrom));
    }

    if (advancedFilters.dobTo) {
      filtered = filtered.filter((s) => s.date_of_birth && new Date(s.date_of_birth) <= new Date(advancedFilters.dobTo));
    }

    if (advancedFilters.branch) {
      filtered = filtered.filter((s) => s.branch === advancedFilters.branch);
    }

    setFilteredStudents(filtered);
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
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const getBlacklistBadge = (isBlacklisted) => {
    if (isBlacklisted) {
      return <span className="badge bg-red-900 text-white">Blacklisted</span>;
    }
    return <span className="badge badge-success">Active</span>;
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
    });
  };

  const hasActiveFilters = () => {
    return Object.values(advancedFilters).some((value) => value !== '');
  };

  const handleExportCSV = () => {
    try {
      if (filteredStudents.length === 0) {
        toast.error('No students to export');
        return;
      }

      // Create CSV header
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

      // Create CSV rows
      const rows = filteredStudents.map((student) => [
        student.prn || '',
        student.name || '',
        student.email || '',
        student.mobile_number || '',
        student.branch || '',
        student.date_of_birth ? (() => {
          const date = new Date(student.date_of_birth);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        })() : '',
        student.cgpa || '',
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

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Create and download file
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

      toast.success(`Exported ${filteredStudents.length} students to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export students');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-600 mt-1">
            View, approve, reject, and blacklist students from your college
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredStudents.length === 0}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Download size={18} />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => changeTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Students
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-20">
            {statusCounts.all}
          </span>
        </button>
        <button
          onClick={() => changeTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Pending Approval
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-200 text-yellow-800">
            {statusCounts.pending}
          </span>
        </button>
        <button
          onClick={() => changeTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Approved
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-200 text-green-800">
            {statusCounts.approved}
          </span>
        </button>
        <button
          onClick={() => changeTab('rejected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Rejected
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-200 text-red-800">
            {statusCounts.rejected}
          </span>
        </button>
        <button
          onClick={() => changeTab('blacklisted')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'blacklisted'
              ? 'bg-red-900 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Blacklisted
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-900 text-white">
            {statusCounts.blacklisted}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by PRN, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
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
              {/* CGPA Range */}
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
              <div>
                <label className="label text-sm">Maximum CGPA</label>
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

              {/* Branch */}
              <div>
                <label className="label text-sm">Branch/Department</label>
                <select
                  value={advancedFilters.branch}
                  onChange={(e) => handleAdvancedFilterChange('branch', e.target.value)}
                  className="input"
                >
                  <option value="">All Branches</option>
                  {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
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
                Showing {filteredStudents.length} of {students.length} students
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>PRN</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile Number</th>
                <th>CGPA</th>
                <th>Backlogs</th>
                <th>Registration Status</th>
                <th>Blacklist Status</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-gray-500 py-8">
                    {searchQuery
                      ? 'No students found matching your search'
                      : `No ${activeTab === 'all' ? '' : activeTab} students found`}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="font-mono font-semibold">{student.prn}</td>
                    <td className="font-semibold">{student.name || '-'}</td>
                    <td>{student.email}</td>
                    <td>{student.mobile_number || '-'}</td>
                    <td className="font-semibold">{student.cgpa || '-'}</td>
                    <td>
                      {student.backlogs ? (
                        <span className="text-red-600 font-semibold">{student.backlogs}</span>
                      ) : (
                        <span className="text-green-600 font-semibold">0</span>
                      )}
                    </td>
                    <td>{getStatusBadge(student.registration_status)}</td>
                    <td>{getBlacklistBadge(student.is_blacklisted)}</td>
                    <td className="text-sm text-gray-600">
                      {student.created_at ? (() => {
                        const date = new Date(student.created_at);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}-${month}-${year}`;
                      })() : 'N/A'}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        {student.registration_status === 'pending' && !student.is_blacklisted && (
                          <>
                            <button
                              onClick={() => handleApprove(student.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <Check size={20} />
                            </button>
                            <button
                              onClick={() => handleReject(student.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <X size={20} />
                            </button>
                          </>
                        )}
                        {student.registration_status === 'approved' && !student.is_blacklisted && (
                          <>
                            <button
                              onClick={() => openDetailsModal(student)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Details"
                            >
                              <Eye size={20} />
                            </button>
                            <button
                              onClick={() => handleBlacklist(student)}
                              className="text-red-600 hover:text-red-800"
                              title="Blacklist"
                            >
                              <Ban size={20} />
                            </button>
                          </>
                        )}
                        {student.is_blacklisted && (
                          <button
                            onClick={() => handleRequestWhitelist(student)}
                            className="text-green-600 hover:text-green-800"
                            title="Request Whitelist"
                          >
                            <Shield size={20} />
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
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Student Details</h2>
            <div className="space-y-4">
              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">PRN</p>
                    <p className="font-mono font-semibold">{selectedStudent.prn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">
                      {selectedStudent.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile Number</p>
                    <p>{selectedStudent.mobile_number || '-'}</p>
                  </div>
                </div>
              </div>

              {/* College Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">College Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">College</p>
                    <p className="font-semibold">{selectedStudent.college_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Region</p>
                    <p>{selectedStudent.region_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Academic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">CGPA</p>
                    <p className="font-semibold text-lg">{selectedStudent.cgpa || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Backlogs</p>
                    <p className={`font-semibold text-lg ${selectedStudent.backlogs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedStudent.backlogs || 0}
                    </p>
                  </div>
                </div>
                {selectedStudent.backlog_details && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Backlog Details</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">{selectedStudent.backlog_details}</p>
                  </div>
                )}
              </div>

              {/* Registration Information */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Registration Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Registration Status</p>
                    <div className="mt-1">{getStatusBadge(selectedStudent.registration_status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Blacklist Status</p>
                    <div className="mt-1">{getBlacklistBadge(selectedStudent.is_blacklisted)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Date</p>
                    <p>{selectedStudent.created_at ? (() => {
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
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Blacklist Student</h2>
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
                onClick={confirmBlacklist}
                className="btn btn-danger flex-1"
              >
                Confirm Blacklist
              </button>
              <button
                onClick={() => {
                  setShowBlacklistModal(false);
                  setBlacklistReason('');
                  setSelectedStudent(null);
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Whitelist Modal */}
      {showWhitelistModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Request Whitelist</h2>
            <p className="text-gray-600 mb-4">
              Submit a request to the Super Admin to whitelist <span className="font-semibold">{selectedStudent.prn}</span>.
            </p>
            <div className="mb-4">
              <label className="label">Reason for Whitelist Request *</label>
              <textarea
                className="input"
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
                className="btn btn-success flex-1"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowWhitelistModal(false);
                  setWhitelistReason('');
                  setSelectedStudent(null);
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

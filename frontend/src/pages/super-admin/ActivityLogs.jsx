import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportButtonRef, setExportButtonRef] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    action_type: '',
    user_role: '',
    search: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 50,
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
  });

  const actionTypes = [
    'LOGIN',
    'LOGOUT',
    'STUDENT_APPROVED',
    'STUDENT_REJECTED',
    'STUDENT_BLACKLISTED',
    'STUDENT_WHITELISTED',
    'JOB_CREATED',
    'JOB_APPROVED',
    'JOB_REJECTED',
    'JOB_UPDATED',
    'JOB_DELETED',
    'NOTIFICATION_SENT',
    'PRN_RANGE_ADDED',
    'PRN_RANGE_DELETED',
    'OFFICER_CREATED',
    'OFFICER_UPDATED',
    'PASSWORD_CHANGED',
    'WHITELIST_REQUEST_APPROVED',
    'WHITELIST_REQUEST_REJECTED',
  ];

  const userRoles = ['Super Admin', 'Placement Officer', 'Student'];

  useEffect(() => {
    fetchLogs();
  }, [filters.page]);

  // Debounced search effect for instant search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.page === 1) {
        fetchLogs();
      } else {
        // Reset to page 1 when filters change
        setFilters(prev => ({ ...prev, page: 1 }));
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.action_type, filters.user_role, filters.date_from, filters.date_to]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getActivityLogs(filters);
      setLogs(response.data.data || []);
      setPagination({
        currentPage: response.data.currentPage || 1,
        totalPages: response.data.totalPages || 1,
        totalLogs: response.data.total || 0,
      });
    } catch (error) {
      toast.error('Failed to load activity logs');
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      action_type: '',
      user_role: '',
      search: '',
      date_from: '',
      date_to: '',
      page: 1,
      limit: 50,
    });
    setTimeout(() => {
      fetchLogs();
    }, 100);
  };

  const handleExport = async (format) => {
    try {
      const formatLabel = format === 'csv' ? 'CSV' : 'PDF';
      const loadingToast = toast.loading(`Preparing ${formatLabel} export...`);

      // Use the dedicated export function with format
      const response = await superAdminAPI.exportActivityLogs(filters, format);

      // Create blob and download
      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/pdf';
      const extension = format === 'csv' ? 'csv' : 'pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(`Activity logs exported as ${formatLabel} successfully`);
      setShowExportDropdown(false);
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to export activity logs as ${format.toUpperCase()}`);
      console.error('Export error:', error);
    }
  };

  const handleViewDetails = (log) => {
    console.log('Opening activity log details:', log); // Debug logging
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (actionType) => {
    const badgeClasses = {
      LOGIN: 'badge badge-info',
      LOGOUT: 'badge badge-secondary',
      STUDENT_APPROVED: 'badge badge-success',
      STUDENT_REJECTED: 'badge badge-danger',
      STUDENT_BLACKLISTED: 'badge badge-danger',
      STUDENT_WHITELISTED: 'badge badge-success',
      JOB_CREATED: 'badge badge-success',
      JOB_APPROVED: 'badge badge-success',
      JOB_REJECTED: 'badge badge-danger',
      JOB_UPDATED: 'badge badge-warning',
      JOB_DELETED: 'badge badge-danger',
      NOTIFICATION_SENT: 'badge badge-info',
      PRN_RANGE_ADDED: 'badge badge-success',
      PRN_RANGE_DELETED: 'badge badge-danger',
      OFFICER_CREATED: 'badge badge-success',
      OFFICER_UPDATED: 'badge badge-warning',
      PASSWORD_CHANGED: 'badge badge-warning',
      WHITELIST_REQUEST_APPROVED: 'badge badge-success',
      WHITELIST_REQUEST_REJECTED: 'badge badge-danger',
      DEACTIVATE_SUPER_ADMIN: 'badge badge-warning',
      ACTIVATE_SUPER_ADMIN: 'badge badge-success',
      DELETE_SUPER_ADMIN: 'badge badge-danger',
      CREATE_SUPER_ADMIN: 'badge badge-success',
      GENERATE_PLACEMENT_POSTER: 'badge badge-info',
      POSTER_GENERATED: 'badge badge-info',
    };

    return (
      <span className={badgeClasses[actionType] || 'badge badge-secondary'}>
        {actionType?.replace(/_/g, ' ')}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    // Map both database format (snake_case) and display format (Title Case)
    const badgeClasses = {
      'Super Admin': 'badge badge-danger',
      'super_admin': 'badge badge-danger',
      'Placement Officer': 'badge badge-warning',
      'placement_officer': 'badge badge-warning',
      'Student': 'badge badge-info',
      'student': 'badge badge-info',
    };

    // Convert snake_case to Title Case for display
    const displayRole = role
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || role;

    return <span className={badgeClasses[role] || 'badge badge-secondary'}>{displayRole}</span>;
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'page' && key !== 'limit'
  ).length;

  if (loading && filters.page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 pb-8">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 rounded-3xl shadow-2xl mb-8 p-10">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 animate-pulse"></div>
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-3xl blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-white/20 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30">
                  <Activity className="text-white" size={40} />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                  Activity Logs
                </h1>
                <p className="text-pink-100 text-lg font-medium">
                  Monitor system-wide activities and maintain audit trail
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                ref={setExportButtonRef}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-7 py-4 bg-white/95 backdrop-blur-sm text-rose-700 hover:bg-white hover:shadow-2xl rounded-2xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-white/50"
                disabled={logs.length === 0}
              >
                <Download size={22} />
                <span className="text-lg">Export</span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${showExportDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Export Dropdown - Rendered outside the header to avoid overflow clipping */}
        {showExportDropdown && exportButtonRef && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowExportDropdown(false)}
            ></div>
            <div
              className="fixed w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
              style={{
                top: `${exportButtonRef.getBoundingClientRect().bottom + 12}px`,
                left: `${exportButtonRef.getBoundingClientRect().right - 288}px`,
              }}
            >
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-6 py-4 text-left hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 flex items-center space-x-4 transition-all border-b border-gray-100 group"
              >
                <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={22} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base">Export as CSV</div>
                  <div className="text-xs text-gray-500 mt-1">Excel compatible format</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-6 py-4 text-left hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 flex items-center space-x-4 transition-all rounded-b-2xl group"
              >
                <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText size={22} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base">Export as PDF</div>
                  <div className="text-xs text-gray-500 mt-1">Professional report format</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Total Logs</p>
                <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{pagination.totalLogs}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <Activity className="text-white" size={32} />
              </div>
            </div>
          </div>
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Current Page</p>
                <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{pagination.currentPage}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <Calendar className="text-white" size={32} />
              </div>
            </div>
          </div>
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Logs Showing</p>
                <p className="text-5xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{logs.length}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-400 via-purple-500 to-violet-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <Eye className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 mb-8 border border-white/50">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Filter size={24} className="text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full text-sm font-bold shadow-lg">{activeFiltersCount} active</span>
              )}
            </h3>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action Type */}
          <div>
            <label className="label">Action Type</label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
              className="input"
            >
              <option value="">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* User Role */}
          <div>
            <label className="label">User Role</label>
            <select
              value={filters.user_role}
              onChange={(e) => handleFilterChange('user_role', e.target.value)}
              className="input"
            >
              <option value="">All Roles</option>
              {userRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by email or action type..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="label">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="input"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="input"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="label">Logs Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="input"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 mt-4">
          <button onClick={handleApplyFilters} className="btn btn-primary">
            Apply Filters
          </button>
          <button onClick={handleClearFilters} className="btn btn-secondary">
            Clear All
          </button>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">User</th>
                <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Action Type</th>
                <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-16">
                    <Activity className="mx-auto mb-4 text-gray-300" size={64} />
                    <p className="text-gray-500 text-lg font-semibold">No activity logs found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-rose-50/50 transition-all duration-200 group">
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-rose-700 transition-colors">{log.user_name || 'System'}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{log.user_email || 'N/A'}</p>
                        <div className="mt-2">{getRoleBadge(log.user_role)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">{getActionBadge(log.action_type)}</td>
                    <td className="px-6 py-5 text-sm text-gray-600 whitespace-nowrap font-medium">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="p-2 text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                        title="View Details"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-t-2 border-pink-200 flex items-center justify-between rounded-b-3xl">
            <div className="text-sm font-bold text-gray-700">
              Showing page <span className="text-rose-600">{pagination.currentPage}</span> of <span className="text-rose-600">{pagination.totalPages}</span>
              <span className="ml-2 text-gray-500">({pagination.totalLogs} total logs)</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-5 py-2.5 bg-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 hover:text-white text-gray-700 font-bold rounded-xl shadow-md hover:shadow-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all duration-200 border border-gray-200"
              >
                <ChevronLeft size={18} />
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-5 py-2.5 bg-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 hover:text-white text-gray-700 font-bold rounded-xl shadow-md hover:shadow-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all duration-200 border border-gray-200"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Activity Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Activity Log Details</h2>
                  <p className="text-sm text-gray-600 mt-1">Log ID: #{selectedLog.id}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* User Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <User size={20} className="text-primary-600" />
                  <span>User Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">User Name</p>
                    <p className="font-semibold text-gray-900">{selectedLog.user_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm text-gray-900">{selectedLog.user_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <div className="mt-1">{getRoleBadge(selectedLog.user_role)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-mono text-gray-900">{selectedLog.user_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Activity Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <Activity size={20} className="text-primary-600" />
                  <span>Activity Information</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Action Type</p>
                    <div className="mt-1">{getActionBadge(selectedLog.action_type)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900">{selectedLog.description || 'N/A'}</p>
                  </div>
                  {selectedLog.target_type && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Target Type</p>
                        <p className="font-medium text-gray-900">{selectedLog.target_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target ID</p>
                        <p className="font-mono text-gray-900">{selectedLog.target_id || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selectedLog.metadata && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">Additional Metadata</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
                      {(() => {
                        try {
                          if (typeof selectedLog.metadata === 'string') {
                            // Try to parse if it's a JSON string
                            try {
                              const parsed = JSON.parse(selectedLog.metadata);
                              return JSON.stringify(parsed, null, 2);
                            } catch {
                              // If parsing fails, return as-is
                              return selectedLog.metadata;
                            }
                          } else if (typeof selectedLog.metadata === 'object') {
                            // Already an object, just stringify it
                            return JSON.stringify(selectedLog.metadata, null, 2);
                          } else {
                            // Other types, convert to string
                            return String(selectedLog.metadata);
                          }
                        } catch (error) {
                          console.error('Error displaying metadata:', error);
                          return 'Unable to display metadata';
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <Calendar size={20} className="text-primary-600" />
                  <span>Timestamp</span>
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{formatDate(selectedLog.created_at)}</p>
                  {selectedLog.ip_address && (
                    <p className="text-sm text-gray-600 mt-2">IP Address: {selectedLog.ip_address}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

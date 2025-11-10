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
} from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

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

  const handleExportCSV = async () => {
    try {
      const loadingToast = toast.loading('Preparing CSV export...');

      // Use the dedicated export function
      const response = await superAdminAPI.exportActivityLogs(filters);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Activity logs exported successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export activity logs');
      console.error('Export error:', error);
    }
  };

  const handleViewDetails = (log) => {
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
    };

    return (
      <span className={badgeClasses[actionType] || 'badge badge-secondary'}>
        {actionType?.replace(/_/g, ' ')}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const badgeClasses = {
      'Super Admin': 'badge badge-danger',
      'Placement Officer': 'badge badge-warning',
      'Student': 'badge badge-info',
    };

    return <span className={badgeClasses[role] || 'badge badge-secondary'}>{role}</span>;
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-2">
            Monitor system-wide activities and maintain audit trail
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-secondary flex items-center space-x-2"
          disabled={logs.length === 0}
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Logs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{pagination.totalLogs}</p>
            </div>
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
              <Activity size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Current Page</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{pagination.currentPage}</p>
            </div>
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <Calendar size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Logs Showing</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</p>
            </div>
            <div className="p-4 rounded-full bg-purple-100 text-purple-600">
              <Eye size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Filter size={18} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="badge badge-primary ml-2">{activeFiltersCount} active</span>
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
                placeholder="User email or description..."
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
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action Type</th>
                <th>Description</th>
                <th>Target</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">
                    No activity logs found matching your criteria
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{log.user_name || 'System'}</p>
                        <p className="text-sm text-gray-600">{log.user_email || 'N/A'}</p>
                        <div className="mt-1">{getRoleBadge(log.user_role)}</div>
                      </div>
                    </td>
                    <td>{getActionBadge(log.action_type)}</td>
                    <td className="max-w-md">
                      <p className="text-sm text-gray-700 line-clamp-2">{log.description || 'N/A'}</p>
                    </td>
                    <td className="text-sm text-gray-600">
                      {log.target_type && log.target_id ? (
                        <span className="font-mono">
                          {log.target_type} #{log.target_id}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye size={18} />
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
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page {pagination.currentPage} of {pagination.totalPages} (
              {pagination.totalLogs} total logs)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="btn btn-secondary flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn btn-secondary flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
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
                    <pre className="text-sm text-gray-800 overflow-x-auto">
                      {typeof selectedLog.metadata === 'string'
                        ? selectedLog.metadata
                        : JSON.stringify(JSON.parse(selectedLog.metadata || '{}'), null, 2)}
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

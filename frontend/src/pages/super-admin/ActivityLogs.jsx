import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import ActivityBody from './activity/ActivityBody';
import ActivitySkeleton from './activity/ActivitySkeleton';
import LogDialog from './activity/LogDialog';

const EMPTY_FILTERS = {
  action_type: '',
  user_role: '',
  search: '',
  date_from: '',
  date_to: '',
  page: 1,
  limit: 50,
};

/**
 * Activity logs — container.
 *
 * Server-side paged and server-side filtered; the debounce, the reset-to-page-1
 * behaviour and both export formats are carried over unchanged.
 */
export default function ActivityLogs() {
  const deviceType = useDeviceType();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filter states
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
  });

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
    setFilters(EMPTY_FILTERS);
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
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to export activity logs as ${format.toUpperCase()}`);
      console.error('Export error:', error);
    }
  };

  const handleViewDetails = (log) => {
    // The `console.log` that used to sit here printed the whole entry — the
    // user's email and whatever metadata the action recorded — into the browser
    // console on every click.
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'page' && key !== 'limit'
  ).length;

  if (showSkeleton && filters.page === 1) {
    return <ActivitySkeleton layout={deviceType} />;
  }

  return (
    <>
      <ActivityBody
        layout={deviceType}
        logs={logs}
        loading={loading}
        filters={filters}
        pagination={pagination}
        activeFiltersCount={activeFiltersCount}
        onFilterChange={handleFilterChange}
        onRefresh={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onExport={handleExport}
        onView={handleViewDetails}
        onPageChange={handlePageChange}
      />

      {showDetailsModal && selectedLog && (
        <LogDialog
          log={selectedLog}
          onClose={() => { setShowDetailsModal(false); setSelectedLog(null); }}
        />
      )}
    </>
  );
}

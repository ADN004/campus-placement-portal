import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, Building2, Briefcase, UserCheck, Shield, Activity, ClipboardList, MapPin, Ban,
} from 'lucide-react';
import { superAdminAPI } from '../../services/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';
import DashboardBody from './dashboard/DashboardBody';
import DashboardSkeleton from './dashboard/DashboardSkeleton';

/**
 * Super admin dashboard — container.
 *
 * Holds every piece of state, every effect and every handler; `DashboardBody`
 * draws them and owns no logic of its own. One body with a `layout` prop rather
 * than three presenters, because the devices here differ only in column counts.
 *
 * Three faults were carried over from the page this replaces and have since
 * been settled with the user:
 *
 *   1. A tile titled "Active Jobs" read `total_jobs`. The tile was renamed,
 *      because the total is the figure the page has always shown.
 *   2. The region list and its college counts were typed into this file. They
 *      matched the database at the time and would have stopped matching the
 *      moment a college moved. They come from `GET /super-admin/regions` now,
 *      which already returned a `college_count` per region.
 *   3. `|| 60` and `|| 59` fired on a real zero as well as on a missing value,
 *      so an empty system reported 60 colleges and 59 officers. They are `??`
 *      now, which falls back only when there is genuinely nothing to show.
 */
export default function SuperAdminDashboard() {
  const deviceType = useDeviceType();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [regionRows, setRegionRows] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchAdminNotifications();
    fetchRegions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await superAdminAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /*
   * The regions and how many colleges each holds. Silent on failure: the
   * section simply does not render, which is better than a dashboard that
   * refuses to load because one of its four panels could not be filled.
   */
  const fetchRegions = async () => {
    try {
      const response = await superAdminAPI.getAllRegions();
      setRegionRows(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        superAdminAPI.getAdminNotifications({ limit: 5, unread_only: false }),
        superAdminAPI.getAdminNotificationUnreadCount(),
      ]);
      setAdminNotifications(notificationsRes.data.data || []);
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch admin notifications:', error);
    }
  };

  // Silent refresh for auto-refresh
  const silentRefresh = useCallback(async () => {
    try {
      const [dashRes, notifRes, countRes, regionsRes] = await Promise.all([
        superAdminAPI.getDashboard(),
        superAdminAPI.getAdminNotifications({ limit: 5, unread_only: false }),
        superAdminAPI.getAdminNotificationUnreadCount(),
        superAdminAPI.getAllRegions(),
      ]);
      setStats(dashRes.data.data);
      setAdminNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.unread_count || 0);
      setRegionRows(regionsRes.data.data || []);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const handleMarkAsRead = async (id) => {
    try {
      await superAdminAPI.markAdminNotificationRead(id);
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await superAdminAPI.markAllAdminNotificationsRead();
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN');
  };

  if (showSkeleton) return <DashboardSkeleton layout={deviceType} />;

  // Same eight tiles, same destinations. `??` rather than `||` so a genuine
  // zero shows as zero — see note 3 at the top of this file.
  const statCards = [
    {
      title: 'Total Colleges',
      value: stats?.total_colleges ?? 0,
      icon: Building2,
      link: '/super-admin/placement-officers',
      description: 'Polytechnic colleges in Kerala',
    },
    {
      title: 'Placement Officers',
      value: stats?.total_officers ?? 0,
      icon: UserCheck,
      link: '/super-admin/placement-officers',
      description: 'Active placement officers',
    },
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      link: '/super-admin/students',
      description: 'Registered students',
    },
    {
      title: 'Blacklisted Students',
      value: stats?.blacklisted_students || 0,
      icon: Ban,
      link: '/super-admin/students?filter=blacklisted',
      description: 'Students blacklisted',
    },
    {
      // Named for what it counts. It read `total_jobs` under the title "Active
      // Jobs", so it has always shown every job ever posted; the endpoint
      // returns `active_jobs` separately if that figure is ever wanted.
      title: 'Total Jobs',
      value: stats?.total_jobs || 0,
      icon: Briefcase,
      link: '/super-admin/jobs',
      description: 'Posted job openings',
    },
    {
      title: 'PRN Ranges',
      value: stats?.active_prn_ranges || 0,
      icon: ClipboardList,
      link: '/super-admin/prn-ranges',
      description: 'Active PRN ranges',
    },
    {
      title: 'Whitelist Requests',
      value: stats?.pending_whitelist_requests || 0,
      icon: Shield,
      link: '/super-admin/whitelist-requests',
      description: 'Pending approval',
    },
    {
      title: 'Regions',
      value: regionRows.length,
      icon: MapPin,
      description: 'Geographic regions',
    },
  ];

  const quickActions = [
    {
      title: 'Manage PRN Ranges',
      description: 'Add or manage valid PRN ranges for student registration',
      icon: ClipboardList,
      link: '/super-admin/prn-ranges',
    },
    {
      title: 'Post New Job',
      description: 'Create job postings with eligibility criteria',
      icon: Briefcase,
      link: '/super-admin/jobs',
    },
    {
      title: 'Manage Officers',
      description: 'View and manage placement officers for each college',
      icon: UserCheck,
      link: '/super-admin/placement-officers',
    },
    {
      title: 'Whitelist Requests',
      description: 'Review requests to remove student blacklisting',
      icon: Shield,
      link: '/super-admin/whitelist-requests',
    },
    {
      title: 'Activity Logs',
      description: 'View system-wide activity and audit trail',
      icon: Activity,
      link: '/super-admin/activity-logs',
    },
  ];

  /*
   * Real counts, from the endpoint that already computes them. `college_count`
   * arrives as a string from Postgres, so it is coerced — otherwise "14" and 14
   * look the same on screen and sort differently everywhere else.
   */
  const regions = regionRows.map((region) => ({
    name: region.region_name,
    colleges: Number(region.college_count) || 0,
  }));

  return (
    <DashboardBody
      layout={deviceType}
      statCards={statCards}
      quickActions={quickActions}
      regions={regions}
      notifications={adminNotifications}
      unreadCount={unreadCount}
      onMarkRead={handleMarkAsRead}
      onMarkAllRead={handleMarkAllAsRead}
      timeAgo={formatTimeAgo}
      refreshControl={(
        <AutoRefreshIndicator
          lastRefreshed={lastRefreshed}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggle={toggleAutoRefresh}
          onManualRefresh={manualRefresh}
          refreshing={refreshing}
        />
      )}
    />
  );
}

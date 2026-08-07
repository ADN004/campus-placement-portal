import { useState, useEffect, useCallback } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Bell, Clock, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopPODashboard, {
  DesktopPODashboardSkeleton,
} from './dashboard/DesktopPODashboard';
import TabletPODashboard, {
  TabletPODashboardSkeleton,
} from './dashboard/TabletPODashboard';
import MobilePODashboard, {
  MobilePODashboardSkeleton,
} from './dashboard/MobilePODashboard';

/**
 * PlacementOfficerDashboard — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. Nothing is reimplemented per device, so a fix here fixes all three.
 * See hooks/useDeviceType for where the mobile/tablet/desktop line is drawn.
 */
export default function PlacementOfficerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await placementOfficerAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh for auto-refresh
  const silentRefresh = useCallback(async () => {
    try {
      const response = await placementOfficerAPI.getDashboard();
      setStats(response.data.data);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobilePODashboardSkeleton />;
    if (deviceType === 'tablet') return <TabletPODashboardSkeleton />;
    return <DesktopPODashboardSkeleton />;
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      description: 'Registered students from your college',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_students || 0,
      icon: Clock,
      link: '/placement-officer/students?status=pending',
      description: 'Students waiting for approval',
      // Marks the tile when the count is above zero: this is the officer's
      // actual job, and it is the one thing on the page worth a status colour.
      attention: true,
    },
    {
      title: 'Approved Students',
      value: stats?.approved_students || 0,
      icon: CheckCircle,
      link: '/placement-officer/students?status=approved',
      description: 'Active students',
    },
    {
      title: 'Blacklisted',
      value: stats?.blacklisted_students || 0,
      icon: XCircle,
      link: '/placement-officer/students?status=blacklisted',
      description: 'Blacklisted students',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Students',
      description: 'Approve registrations, manage student profiles, and handle blacklisting',
      icon: Users,
      link: '/placement-officer/students',
    },
    {
      title: 'Job Requests',
      description: 'Create and manage job posting requests for super admin approval',
      icon: Briefcase,
      // Was '/placement-officer/job-requests', which is not a route: the
      // catch-all bounced it straight back to this dashboard, so the card
      // silently did nothing. This is the page it was always meant to open.
      link: '/placement-officer/my-job-requests',
    },
    {
      title: 'Send Notification',
      description: 'Send announcements and notifications to your college students',
      icon: Bell,
      link: '/placement-officer/send-notification',
    },
  ];

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    collegeName: stats?.college_name,
    regionName: stats?.region_name,
    statCards,
    quickActions,
    lastRefreshed,
    autoRefreshEnabled,
    onToggleAutoRefresh: toggleAutoRefresh,
    onManualRefresh: manualRefresh,
    refreshing,
  };

  if (deviceType === 'mobile') return <MobilePODashboard {...presenterProps} />;
  if (deviceType === 'tablet') return <TabletPODashboard {...presenterProps} />;
  return <DesktopPODashboard {...presenterProps} />;
}

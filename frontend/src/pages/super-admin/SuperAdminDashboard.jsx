import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Building2,
  Briefcase,
  UserCheck,
  Shield,
  Activity,
  ClipboardList,
  MapPin,
  TrendingUp,
  Ban,
  LayoutDashboard,
  ArrowRight,
  Bell,
  Zap,
  CheckCircle,
  Eye,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassStatCard from '../../components/GlassStatCard';
import SectionHeader from '../../components/SectionHeader';
import GlassCard from '../../components/GlassCard';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import AnimatedCard from '../../components/animation/AnimatedCard';
import DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    fetchAdminNotifications();
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

  const fetchAdminNotifications = async () => {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        superAdminAPI.getAdminNotifications({ limit: 5, unread_only: false }),
        superAdminAPI.getAdminNotificationUnreadCount()
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
      const [dashRes, notifRes, countRes] = await Promise.all([
        superAdminAPI.getDashboard(),
        superAdminAPI.getAdminNotifications({ limit: 5, unread_only: false }),
        superAdminAPI.getAdminNotificationUnreadCount(),
      ]);
      setStats(dashRes.data.data);
      setAdminNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing } =
    useAutoRefresh(silentRefresh, 300000, true); // 5 min

  const handleMarkAsRead = async (id) => {
    try {
      await superAdminAPI.markAdminNotificationRead(id);
      setAdminNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await superAdminAPI.markAllAdminNotificationsRead();
      setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
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

  if (showSkeleton) return <DashboardSkeleton />;

  const statCards = [
    {
      title: 'Total Colleges',
      value: stats?.total_colleges || 60,
      icon: Building2,
      gradient: 'from-blue-500 to-cyan-600',
      link: '/super-admin/placement-officers',
      description: 'Polytechnic colleges in Kerala',
    },
    {
      title: 'Placement Officers',
      value: stats?.total_officers || 59,
      icon: UserCheck,
      gradient: 'from-purple-500 to-pink-600',
      link: '/super-admin/placement-officers',
      description: 'Active placement officers',
    },
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      link: '/super-admin/students',
      description: 'Registered students',
    },
    {
      title: 'Blacklisted Students',
      value: stats?.blacklisted_students || 0,
      icon: Ban,
      gradient: 'from-red-500 to-rose-600',
      link: '/super-admin/students?filter=blacklisted',
      description: 'Students blacklisted',
    },
    {
      title: 'Active Jobs',
      value: stats?.total_jobs || 0,
      icon: Briefcase,
      gradient: 'from-orange-500 to-amber-600',
      link: '/super-admin/jobs',
      description: 'Posted job openings',
    },
    {
      title: 'PRN Ranges',
      value: stats?.active_prn_ranges || 0,
      icon: ClipboardList,
      gradient: 'from-indigo-500 to-blue-600',
      link: '/super-admin/prn-ranges',
      description: 'Active PRN ranges',
    },
    {
      title: 'Whitelist Requests',
      value: stats?.pending_whitelist_requests || 0,
      icon: Shield,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/super-admin/whitelist-requests',
      description: 'Pending approval',
    },
    {
      title: 'Regions',
      value: 5,
      icon: MapPin,
      gradient: 'from-teal-500 to-cyan-600',
      description: 'Geographic regions',
    },
  ];

  const quickActions = [
    {
      title: 'Manage PRN Ranges',
      description: 'Add or manage valid PRN ranges for student registration',
      icon: ClipboardList,
      gradient: 'from-indigo-500 to-blue-600',
      link: '/super-admin/prn-ranges',
    },
    {
      title: 'Post New Job',
      description: 'Create job postings with eligibility criteria',
      icon: Briefcase,
      gradient: 'from-orange-500 to-amber-600',
      link: '/super-admin/jobs',
    },
    {
      title: 'Manage Officers',
      description: 'View and manage placement officers for each college',
      icon: UserCheck,
      gradient: 'from-purple-500 to-pink-600',
      link: '/super-admin/placement-officers',
    },
    {
      title: 'Whitelist Requests',
      description: 'Review requests to remove student blacklisting',
      icon: Shield,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/super-admin/whitelist-requests',
    },
    {
      title: 'Activity Logs',
      description: 'View system-wide activity and audit trail',
      icon: Activity,
      gradient: 'from-pink-500 to-rose-600',
      link: '/super-admin/activity-logs',
    },
  ];

  const regions = [
    { name: 'South Region', colleges: 14, color: 'blue' },
    { name: 'South-Central Region', colleges: 16, color: 'emerald' },
    { name: 'Central Region', colleges: 12, color: 'purple' },
    { name: 'North-Central Region', colleges: 9, color: 'orange' },
    { name: 'North Region', colleges: 9, color: 'pink' },
  ];

  return (
    <div className="min-h-screen">
      {/* Dashboard Header */}
      <AnimatedSection delay={0}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <DashboardHeader
            icon={LayoutDashboard}
            title="Super Admin Dashboard"
            subtitle="System-wide overview of State Placement Cell - Kerala Polytechnics"
          />
          <AutoRefreshIndicator
            lastRefreshed={lastRefreshed}
            autoRefreshEnabled={autoRefreshEnabled}
            onToggle={toggleAutoRefresh}
            onManualRefresh={manualRefresh}
            refreshing={refreshing}
          />
        </div>
      </AnimatedSection>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <AnimatedCard key={stat.title} delay={0.08 + index * 0.04}>
            <GlassStatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              gradient={stat.gradient}
              link={stat.link}
              description={stat.description}
              index={index}
            />
          </AnimatedCard>
        ))}
      </div>

      {/* Admin Notifications Section */}
      <AnimatedSection delay={0.4} className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-2.5 shadow-lg">
              <Bell className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Recent Notifications</h2>
              <p className="text-sm text-gray-500">Auto-approved jobs and system alerts</p>
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <CheckCircle size={16} />
              Mark all as read
            </button>
          )}
        </div>
        <GlassCard variant="elevated" className="p-0 overflow-hidden">
          {adminNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bell className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">
                You'll be notified when placement officers post jobs for their own college
              </p>
            </div>
          ) : (
          <div className="divide-y divide-gray-100">
            {adminNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className={`rounded-full p-2 ${
                    notification.notification_type === 'job_auto_approved'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {notification.notification_type === 'job_auto_approved' ? (
                      <Zap size={20} />
                    ) : (
                      <Bell size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-semibold text-gray-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {notification.college_name && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {notification.college_name}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.related_entity_type === 'job' && notification.related_entity_id && (
                          <Link
                            to={`/super-admin/jobs/${notification.related_entity_id}/applicants`}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50"
                            title="View Job"
                          >
                            <Eye size={18} />
                          </Link>
                        )}
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-gray-400 hover:text-green-600 p-1.5 rounded-lg hover:bg-green-50"
                            title="Mark as read"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </AnimatedSection>

      {/* Quick Actions */}
      <AnimatedSection delay={0.48} className="mb-10">
        <SectionHeader title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <AnimatedCard key={action.title} delay={0.48 + index * 0.04} enableTap>
              <Link
                to={action.link}
              >
                <GlassCard variant="elevated" hover className="h-full p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`bg-gradient-to-br ${action.gradient} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end text-blue-600 font-bold text-sm mt-4 group">
                    <span>Open</span>
                    <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </GlassCard>
              </Link>
              </AnimatedCard>
            );
          })}
        </div>
      </AnimatedSection>

      {/* Regional Distribution */}
      <AnimatedSection delay={0.56} className="mb-10">
        <SectionHeader title="Regional Distribution" icon={MapPin} />
        <GlassCard variant="elevated" className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {regions.slice(0, 3).map((region) => (
              <div
                key={region.name}
                className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className={`inline-block px-3 py-1 rounded-full bg-${region.color}-100 border border-${region.color}-200 mb-3`}>
                  <span className={`text-xs font-bold text-${region.color}-700`}>{region.name}</span>
                </div>
                <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  {region.colleges}
                </p>
                <p className="text-sm text-gray-600 font-semibold">Colleges</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {regions.slice(3).map((region) => (
              <div
                key={region.name}
                className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className={`inline-block px-3 py-1 rounded-full bg-${region.color}-100 border border-${region.color}-200 mb-3`}>
                  <span className={`text-xs font-bold text-${region.color}-700`}>{region.name}</span>
                </div>
                <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  {region.colleges}
                </p>
                <p className="text-sm text-gray-600 font-semibold">Colleges</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Super Admin Responsibilities */}
      <AnimatedSection delay={0.64}>
      <GlassCard variant="elevated" className="p-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800 text-2xl mb-4">
              Super Admin Responsibilities
            </h4>
            <ul className="text-gray-700 space-y-3 font-medium">
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Manage PRN ranges for student registration validation</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Post job openings with eligibility criteria</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Manage placement officers and handle officer changes</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Approve or reject whitelist requests from placement officers</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Monitor system-wide activities through activity logs</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Oversee all 60 polytechnic colleges across 5 regions in Kerala</span>
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
      </AnimatedSection>
    </div>
  );
}

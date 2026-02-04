import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  LayoutDashboard,
  ArrowRight,
  Activity,
  ClipboardList,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassStatCard from '../../components/GlassStatCard';
import SectionHeader from '../../components/SectionHeader';
import GlassCard from '../../components/GlassCard';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import AutoRefreshIndicator from '../../components/AutoRefreshIndicator';

export default function PlacementOfficerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    useAutoRefresh(silentRefresh, 60000, true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Registered students from your college',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_students || 0,
      icon: Clock,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/placement-officer/students?status=pending',
      description: 'Students waiting for approval',
    },
    {
      title: 'Approved Students',
      value: stats?.approved_students || 0,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-600',
      link: '/placement-officer/students?status=approved',
      description: 'Active students',
    },
    {
      title: 'Blacklisted',
      value: stats?.blacklisted_students || 0,
      icon: XCircle,
      gradient: 'from-red-500 to-rose-600',
      link: '/placement-officer/students?status=blacklisted',
      description: 'Blacklisted students',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Students',
      description: 'Approve registrations, manage student profiles, and handle blacklisting',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      link: '/placement-officer/students',
    },
    {
      title: 'Job Requests',
      description: 'Create and manage job posting requests for super admin approval',
      icon: Briefcase,
      gradient: 'from-purple-500 to-pink-600',
      link: '/placement-officer/job-requests',
    },
    {
      title: 'Send Notification',
      description: 'Send announcements and notifications to your college students',
      icon: Bell,
      gradient: 'from-green-500 to-emerald-600',
      link: '/placement-officer/send-notification',
    },
  ];

  return (
    <div>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <DashboardHeader
          icon={LayoutDashboard}
          title="Placement Officer Dashboard"
          subtitle={`${stats?.college_name || 'Your College'} - ${stats?.region_name || 'Region'}`}
        />
        <AutoRefreshIndicator
          lastRefreshed={lastRefreshed}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggle={toggleAutoRefresh}
          onManualRefresh={manualRefresh}
          refreshing={refreshing}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <GlassStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            link={stat.link}
            description={stat.description}
            index={index}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <SectionHeader title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
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
            );
          })}
        </div>
      </div>

      {/* Placement Officer Responsibilities */}
      <GlassCard variant="elevated" className="p-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800 text-2xl mb-4">
              Placement Officer Responsibilities
            </h4>
            <ul className="text-gray-700 space-y-3 font-medium">
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Review and approve/reject student registration requests</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Manage student profiles and academic information</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Create job posting requests for super admin approval</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Blacklist students who violate placement policies</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Send notifications and announcements to students</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Request whitelist for previously blacklisted students (requires super admin approval)</span>
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

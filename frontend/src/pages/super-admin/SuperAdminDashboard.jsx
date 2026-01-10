import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassStatCard from '../../components/GlassStatCard';
import SectionHeader from '../../components/SectionHeader';
import GlassCard from '../../components/GlassCard';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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
    <div>
      {/* Dashboard Header */}
      <DashboardHeader
        icon={LayoutDashboard}
        title="Super Admin Dashboard"
        subtitle="System-wide overview of State Placement Cell - Kerala Polytechnics"
      />

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

      {/* Regional Distribution */}
      <div className="mb-10">
        <SectionHeader title="Regional Distribution" icon={MapPin} />
        <GlassCard variant="elevated" className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {regions.slice(0, 3).map((region, index) => (
              <div
                key={region.name}
                className={`bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 stagger-item`}
                style={{ animationDelay: `${index * 50}ms` }}
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
            {regions.slice(3).map((region, index) => (
              <div
                key={region.name}
                className={`bg-white rounded-2xl border border-gray-200 shadow-md p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 stagger-item`}
                style={{ animationDelay: `${(index + 3) * 50}ms` }}
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
      </div>

      {/* Super Admin Responsibilities */}
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
    </div>
  );
}

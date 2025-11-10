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
} from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Colleges',
      value: stats?.total_colleges || 60,
      icon: Building2,
      color: 'blue',
      link: '/super-admin/placement-officers',
      description: 'Polytechnic colleges in Kerala',
    },
    {
      title: 'Placement Officers',
      value: stats?.total_officers || 59,
      icon: UserCheck,
      color: 'purple',
      link: '/super-admin/placement-officers',
      description: 'Active placement officers',
    },
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'green',
      link: '/super-admin/students',
      description: 'Registered students',
    },
    {
      title: 'Active Jobs',
      value: stats?.total_jobs || 0,
      icon: Briefcase,
      color: 'orange',
      link: '/super-admin/jobs',
      description: 'Posted job openings',
    },
    {
      title: 'PRN Ranges',
      value: stats?.active_prn_ranges || 0,
      icon: ClipboardList,
      color: 'indigo',
      link: '/super-admin/prn-ranges',
      description: 'Active PRN ranges',
    },
    {
      title: 'Whitelist Requests',
      value: stats?.pending_whitelist_requests || 0,
      icon: Shield,
      color: 'yellow',
      link: '/super-admin/whitelist-requests',
      description: 'Pending approval',
    },
    {
      title: 'Regions',
      value: 5,
      icon: MapPin,
      color: 'teal',
      description: 'Geographic regions',
    },
    {
      title: 'Recent Activities',
      value: stats?.recent_activities_count || 0,
      icon: Activity,
      color: 'pink',
      link: '/super-admin/activity-logs',
      description: 'System activities',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    teal: 'bg-teal-100 text-teal-600',
    pink: 'bg-pink-100 text-pink-600',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600">
          System-wide overview of Campus Placement Portal - Kerala Polytechnics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          const CardContent = (
            <div className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );

          return stat.link ? (
            <Link key={stat.title} to={stat.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={stat.title}>{CardContent}</div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Manage PRN Ranges */}
          <Link
            to="/super-admin/prn-ranges"
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-indigo-100 rounded-full">
                <ClipboardList className="text-indigo-600" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Manage PRN Ranges
                </h3>
                <p className="text-sm text-gray-600">
                  Add or manage valid PRN ranges for student registration
                </p>
              </div>
            </div>
          </Link>

          {/* Post Jobs */}
          <Link
            to="/super-admin/jobs"
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-orange-100 rounded-full">
                <Briefcase className="text-orange-600" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Post New Job
                </h3>
                <p className="text-sm text-gray-600">
                  Create job postings with eligibility criteria
                </p>
              </div>
            </div>
          </Link>

          {/* Manage Officers */}
          <Link
            to="/super-admin/placement-officers"
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-purple-100 rounded-full">
                <UserCheck className="text-purple-600" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Manage Officers
                </h3>
                <p className="text-sm text-gray-600">
                  View and manage placement officers for each college
                </p>
              </div>
            </div>
          </Link>

          {/* Whitelist Requests */}
          <Link
            to="/super-admin/whitelist-requests"
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-yellow-100 rounded-full">
                <Shield className="text-yellow-600" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Whitelist Requests
                </h3>
                <p className="text-sm text-gray-600">
                  Review requests to remove student blacklisting
                </p>
              </div>
            </div>
          </Link>

          {/* Activity Logs */}
          <Link
            to="/super-admin/activity-logs"
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-pink-100 rounded-full">
                <Activity className="text-pink-600" size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Activity Logs
                </h3>
                <p className="text-sm text-gray-600">
                  View system-wide activity and audit trail
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* System Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">South Region</h4>
            <p className="text-2xl font-bold text-blue-600 mb-1">14</p>
            <p className="text-sm text-blue-700">Colleges</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">South-Central Region</h4>
            <p className="text-2xl font-bold text-green-600 mb-1">16</p>
            <p className="text-sm text-green-700">Colleges</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">Central Region</h4>
            <p className="text-2xl font-bold text-purple-600 mb-1">12</p>
            <p className="text-sm text-purple-700">Colleges</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">North-Central Region</h4>
            <p className="text-2xl font-bold text-orange-600 mb-1">9</p>
            <p className="text-sm text-orange-700">Colleges</p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-lg">
            <h4 className="font-semibold text-pink-900 mb-2">North Region</h4>
            <p className="text-2xl font-bold text-pink-600 mb-1">9</p>
            <p className="text-sm text-pink-700">Colleges</p>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <TrendingUp className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Super Admin Responsibilities
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Manage PRN ranges for student registration validation</li>
              <li>• Post job openings with eligibility criteria</li>
              <li>• Manage placement officers and handle officer changes</li>
              <li>• Approve or reject whitelist requests from placement officers</li>
              <li>• Monitor system-wide activities through activity logs</li>
              <li>• Oversee all 60 polytechnic colleges across 5 regions in Kerala</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

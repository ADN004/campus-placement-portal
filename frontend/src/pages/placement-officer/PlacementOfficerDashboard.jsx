import { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'blue',
      description: 'Registered students from your college',
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_students || 0,
      icon: Clock,
      color: 'yellow',
      link: '/placement-officer/students?status=pending',
      description: 'Students waiting for approval',
    },
    {
      title: 'Approved Students',
      value: stats?.approved_students || 0,
      icon: CheckCircle,
      color: 'green',
      link: '/placement-officer/students?status=approved',
      description: 'Active students',
    },
    {
      title: 'Blacklisted',
      value: stats?.blacklisted_students || 0,
      icon: XCircle,
      color: 'red',
      link: '/placement-officer/students?status=blacklisted',
      description: 'Blacklisted students',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Placement Officer Dashboard
        </h1>
        <p className="text-gray-600">
          {stats?.college_name || 'Your College'} - {stats?.region_name || 'Region'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            green: 'bg-green-100 text-green-600',
            red: 'bg-red-100 text-red-600',
          };

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
                <div
                  className={`p-3 rounded-full ${
                    colorClasses[stat.color]
                  }`}
                >
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Manage Students */}
        <Link to="/placement-officer/students" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-primary-100 rounded-full">
              <Users className="text-primary-600" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Manage Students
              </h3>
              <p className="text-sm text-gray-600">
                Approve registrations, manage student profiles, and handle blacklisting
              </p>
            </div>
          </div>
        </Link>

        {/* Job Requests */}
        <Link to="/placement-officer/job-requests" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <Briefcase className="text-purple-600" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Job Requests
              </h3>
              <p className="text-sm text-gray-600">
                Create and manage job posting requests for super admin approval
              </p>
            </div>
          </div>
        </Link>

        {/* Send Notification */}
        <Link
          to="/placement-officer/send-notification"
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-green-100 rounded-full">
              <Bell className="text-green-600" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Send Notification
              </h3>
              <p className="text-sm text-gray-600">
                Send announcements and notifications to your college students
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Info Message */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <TrendingUp className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Placement Officer Responsibilities
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Review and approve/reject student registration requests</li>
              <li>• Manage student profiles and academic information</li>
              <li>• Create job posting requests for super admin approval</li>
              <li>• Blacklist students who violate placement policies</li>
              <li>• Send notifications and announcements to students</li>
              <li>• Request whitelist for previously blacklisted students (requires super admin approval)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Briefcase,
  FileText,
  Bell,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  UserCheck,
  ClipboardList,
  Activity,
  User,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavigationItems = () => {
    switch (user.role) {
      case 'student':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: Home },
          { name: 'Available Jobs', path: '/student/jobs', icon: Briefcase },
          { name: 'My Applications', path: '/student/applications', icon: FileText },
          { name: 'Notifications', path: '/student/notifications', icon: Bell },
          { name: 'Profile', path: '/student/profile', icon: User },
        ];
      case 'placement_officer':
        return [
          { name: 'Dashboard', path: '/placement-officer/dashboard', icon: Home },
          { name: 'Manage Students', path: '/placement-officer/students', icon: Users },
          { name: 'Job Requests', path: '/placement-officer/job-requests', icon: Briefcase },
          { name: 'Job Eligible Students', path: '/placement-officer/job-eligible-students', icon: UserCheck },
          { name: 'Send Notification', path: '/placement-officer/send-notification', icon: Bell },
          { name: 'Profile', path: '/placement-officer/profile', icon: User },
        ];
      case 'super_admin':
        return [
          { name: 'Dashboard', path: '/super-admin/dashboard', icon: Home },
          { name: 'PRN Ranges', path: '/super-admin/prn-ranges', icon: ClipboardList },
          { name: 'Placement Officers', path: '/super-admin/placement-officers', icon: UserCheck },
          { name: 'Manage Jobs', path: '/super-admin/jobs', icon: Briefcase },
          { name: 'Job Eligible Students', path: '/super-admin/job-eligible-students', icon: Users },
          { name: 'Whitelist Requests', path: '/super-admin/whitelist-requests', icon: Shield },
          { name: 'Activity Logs', path: '/super-admin/activity-logs', icon: Activity },
          { name: 'Profile', path: '/super-admin/profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navbar */}
      <nav className="bg-white shadow-lg border-b border-gray-200 fixed w-full top-0 z-30 backdrop-blur-sm bg-opacity-95">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl lg:text-2xl font-bold gradient-text">
                Campus Placement Portal
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-semibold text-gray-800 text-sm">{user.email}</span>
                <span className="text-xs px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 font-medium">
                  {user.role === 'student'
                    ? 'Student'
                    : user.role === 'placement_officer'
                    ? 'Placement Officer'
                    : 'Super Admin'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all hover:shadow-md border border-transparent hover:border-red-200"
                aria-label="Logout"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex pt-16">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static w-64 h-[calc(100vh-4rem)] bg-white shadow-xl border-r border-gray-200 transition-transform duration-300 ease-in-out z-20 overflow-y-auto`}
        >
          <nav className="p-4 space-y-1">
            {navigationItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 rounded-xl transition-all group relative overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative z-10 group-hover:scale-110 transition-transform">
                  <item.icon size={20} />
                </div>
                <span className="font-medium relative z-10">{item.name}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-5 transition-opacity" />
              </Link>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-gray-50 to-white">
            <p className="text-xs text-center text-gray-500 font-medium">
              Kerala Polytechnics
            </p>
            <p className="text-xs text-center text-gray-400 mt-1">
              Placement Management System
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-10 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

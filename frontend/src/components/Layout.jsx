import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
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
  GraduationCap,
  FileImage,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import GradientOrb from './GradientOrb';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
          { name: 'Extended Profile', path: '/student/extended-profile', icon: ClipboardList },
          { name: 'My Resume', path: '/student/resume', icon: FileText },
        ];
      case 'placement_officer':
        return [
          { name: 'Dashboard', path: '/placement-officer/dashboard', icon: Home },
          { name: 'Manage Students', path: '/placement-officer/students', icon: Users },
          { name: 'PRN Ranges', path: '/placement-officer/prn-ranges', icon: ClipboardList },
          { name: 'College Branches', path: '/placement-officer/college-branches', icon: GraduationCap },
          { name: 'Create Job Request', path: '/placement-officer/create-job-request', icon: Briefcase },
          { name: 'My Job Requests', path: '/placement-officer/my-job-requests', icon: FileText },
          { name: 'Job Eligible Students', path: '/placement-officer/job-eligible-students', icon: UserCheck },
          { name: 'Placement Poster', path: '/placement-officer/placement-poster', icon: FileImage },
          { name: 'Send Notification', path: '/placement-officer/send-notification', icon: Bell },
          { name: 'Profile', path: '/placement-officer/profile', icon: User },
        ];
      case 'super_admin':
        return [
          { name: 'Dashboard', path: '/super-admin/dashboard', icon: Home },
          { name: 'All Students', path: '/super-admin/students', icon: Users },
          { name: 'Send Notification', path: '/super-admin/send-notification', icon: Bell },
          { name: 'PRN Ranges', path: '/super-admin/prn-ranges', icon: ClipboardList },
          { name: 'Placement Officers', path: '/super-admin/placement-officers', icon: UserCheck },
          { name: 'College Branches', path: '/super-admin/college-branches', icon: GraduationCap },
          { name: 'Manage Jobs', path: '/super-admin/jobs', icon: Briefcase },
          { name: 'Job Requests', path: '/super-admin/job-requests', icon: FileText },
          { name: 'Requirement Templates', path: '/super-admin/requirement-templates', icon: Settings },
          { name: 'Job Eligible Students', path: '/super-admin/job-eligible-students', icon: Users },
          { name: 'Placement Poster', path: '/super-admin/placement-poster', icon: FileImage },
          { name: 'Whitelist Requests', path: '/super-admin/whitelist-requests', icon: Shield },
          { name: 'Super Admins', path: '/super-admin/admins', icon: Shield },
          { name: 'Activity Logs', path: '/super-admin/activity-logs', icon: Activity },
          { name: 'Year Reset', path: '/super-admin/academic-year-reset', icon: RotateCcw },
          { name: 'Profile', path: '/super-admin/profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <GradientOrb color="blue" size="xl" position={{ top: '10%', right: '10%' }} animationDuration="8s" />
        <GradientOrb color="purple" size="lg" position={{ bottom: '15%', left: '5%' }} animationDuration="10s" delay="2s" />
        <GradientOrb color="pink" size="md" position={{ top: '50%', left: '50%' }} animationDuration="12s" delay="4s" />
        <GradientOrb color="cyan" size="lg" position={{ top: '30%', left: '15%' }} animationDuration="9s" delay="1s" />
        <GradientOrb color="indigo" size="md" position={{ bottom: '25%', right: '20%' }} animationDuration="11s" delay="3s" />
      </div>

      {/* Top Navbar - Glassmorphic */}
      <nav className="fixed w-full top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 lg:hidden transition-all"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                State Placement Cell
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-semibold text-gray-700 text-sm">{user.email}</span>
                <span className="badge-primary text-xs mt-1">
                  {user.role === 'student'
                    ? 'Student'
                    : user.role === 'placement_officer'
                    ? 'Placement Officer'
                    : 'Super Admin'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:shadow-md"
                aria-label="Logout"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Floating Glassmorphic Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:fixed w-[280px] h-[calc(100vh-88px)]
          bg-white/70 backdrop-blur-2xl border-r border-gray-200
          transition-all duration-300 ease-in-out z-20 flex flex-col
          lg:left-3 lg:top-[76px] lg:rounded-3xl lg:border-gray-200 lg:shadow-xl
          ${sidebarOpen ? 'left-0 top-16 rounded-none' : 'left-0 top-16 rounded-none'}`}
        >
          {/* Scrollable Navigation */}
          <nav className="flex-1 overflow-y-auto p-6 space-y-2">
            {navigationItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all group relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animation: 'fadeInUp 0.5s ease-out backwards'
                  }}
                >
                  {/* Icon */}
                  <div className={`relative z-10 transition-all duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`}>
                    <item.icon size={20} />
                  </div>

                  <span className="font-medium relative z-10">{item.name}</span>

                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer - User Info */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gradient-to-t from-gray-50 to-transparent">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                <User size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 truncate">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {user.role === 'student'
                    ? 'Student'
                    : user.role === 'placement_officer'
                    ? 'Placement Officer'
                    : 'Super Admin'}
                </p>
              </div>
            </div>
            <div className="text-center pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 font-medium">
                Kerala Polytechnics
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Placement Management System
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto
          ${sidebarOpen ? '' : 'lg:ml-[296px]'} transition-all duration-300`}
        >
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-10 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

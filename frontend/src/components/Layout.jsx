import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CorrectionGate from './CorrectionGate';
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
  DatabaseBackup,
  Building2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import GradientOrb from './GradientOrb';
import StudentBottomNav from './StudentBottomNav';
import StudentTopBar from './student/StudentTopBar';
import StudentSidebar from './student/StudentSidebar';
import useDeviceType from '../hooks/useDeviceType';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const DEFAULT_PW_DISMISS_KEY = 'default-password-warning-dismissed';
const STUDENT_SIDEBAR_COLLAPSED_KEY = 'spc-student-sidebar-collapsed';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Warn (but never force) when the account is still on the shared default
  // password. Dismissal is per-session, so it reappears at the next sign-in
  // until the password is actually changed.
  const [pwWarningDismissed, setPwWarningDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DEFAULT_PW_DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const showDefaultPasswordWarning = user?.using_default_password === true && !pwWarningDismissed;

  // Students get their own chrome (top bar, grouped sidebar, bottom tab bar).
  // Officers and super admins keep exactly the shell they have today.
  const isStudent = user?.role === 'student';

  // Whether the student sidebar is collapsed to the icon rail at `lg` and up.
  // Remembered across visits so the panel stays how the student left it.
  const [studentSidebarCollapsed, setStudentSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STUDENT_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // While the student drawer is open it covers the page, so the page behind it
  // must not scroll — otherwise a swipe over the backdrop scrolls the content
  // underneath. Only below `lg`, where the drawer actually overlays; at `lg`
  // and up the sidebar is permanently on screen and nothing is covered.
  // Scoped to students because the officer and super-admin shell is frozen
  // until their own redesign — their drawer has the same bug.
  const deviceType = useDeviceType();
  useBodyScrollLock(isStudent && sidebarOpen && deviceType !== 'desktop');

  const toggleStudentSidebar = () => {
    setStudentSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STUDENT_SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore — private browsing / storage disabled
      }
      return next;
    });
  };

  const dismissPwWarning = () => {
    setPwWarningDismissed(true);
    try {
      sessionStorage.setItem(DEFAULT_PW_DISMISS_KEY, 'true');
    } catch {
      // Ignore — private browsing / storage disabled
    }
  };

  const profilePath =
    user.role === 'student'
      ? '/student/profile'
      : user.role === 'placement_officer'
      ? '/placement-officer/profile'
      : '/super-admin/profile';

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
          { name: 'Registration Locks', path: '/super-admin/college-locks', icon: Lock },
          { name: 'Placement Officers', path: '/super-admin/placement-officers', icon: UserCheck },
          { name: 'Manage Colleges', path: '/super-admin/colleges', icon: Building2 },
          { name: 'College Branches', path: '/super-admin/college-branches', icon: GraduationCap },
          { name: 'Manage Jobs', path: '/super-admin/jobs', icon: Briefcase },
          { name: 'Job Requests', path: '/super-admin/job-requests', icon: FileText },
          { name: 'Requirement Templates', path: '/super-admin/requirement-templates', icon: Settings },
          { name: 'Job Eligible Students', path: '/super-admin/job-eligible-students', icon: Users },
          { name: 'Placement Poster', path: '/super-admin/placement-poster', icon: FileImage },
          { name: 'Whitelist Requests', path: '/super-admin/whitelist-requests', icon: Shield },
          { name: 'Super Admins', path: '/super-admin/admins', icon: Shield },
          { name: 'Activity Logs', path: '/super-admin/activity-logs', icon: Activity },
          { name: 'Database Backup', path: '/super-admin/database-backup', icon: DatabaseBackup },
          { name: 'Year Reset', path: '/super-admin/academic-year-reset', icon: RotateCcw },
          { name: 'Profile', path: '/super-admin/profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden ${
        isStudent
          ? 'spc-student spc-student-bg'
          : 'bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50'
      }`}
    >
      {/* Blocks students with an outstanding correction from every page but Profile */}
      {user?.role === 'student' && <CorrectionGate />}
      {/* Animated Background Orbs — every role except students.
          The orbs render with mix-blend-multiply, which darkens whatever sits
          beneath them: measured, the page ground goes #eff6ff → #cadefd under
          one orb and → #bcc0fb where two overlap. Combined with translucent
          cards that pushed muted body text to 3.92:1, below the 4.5 minimum.
          They also cost a continuous large-blur composite on every phone.
          Students get the calm static ground from .spc-student-bg instead;
          other roles keep this exactly as it was until their own redesign. */}
      {!isStudent && (
        <div className="fixed inset-0 pointer-events-none">
          <GradientOrb color="blue" size="xl" position={{ top: '10%', right: '10%' }} animationDuration="8s" />
          <GradientOrb color="purple" size="lg" position={{ bottom: '15%', left: '5%' }} animationDuration="10s" delay="2s" />
          <GradientOrb color="pink" size="md" position={{ top: '50%', left: '50%' }} animationDuration="12s" delay="4s" />
          <GradientOrb color="cyan" size="lg" position={{ top: '30%', left: '15%' }} animationDuration="9s" delay="1s" />
          <GradientOrb color="indigo" size="md" position={{ bottom: '25%', right: '20%' }} animationDuration="11s" delay="3s" />
        </div>
      )}

      {/* Students get their own top bar; every other role keeps this one. */}
      {isStudent && (
        <StudentTopBar
          user={user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />
      )}

      {/* Top Navbar - Glassmorphic */}
      {!isStudent && (
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
      )}

      <div className="flex pt-16">
        {/* Students get the grouped, collapsible sidebar. */}
        {isStudent && (
          <StudentSidebar
            navigationItems={navigationItems}
            sidebarOpen={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
            collapsed={studentSidebarCollapsed}
            onToggleCollapse={toggleStudentSidebar}
            user={user}
          />
        )}

        {/* Floating Glassmorphic Sidebar */}
        {!isStudent && (
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:fixed w-[280px] h-[calc(100vh-88px)]
          bg-white/70 backdrop-blur-2xl border-r border-gray-200
          transition-all duration-300 ease-in-out z-20 flex flex-col
          lg:left-3 lg:top-[76px] lg:rounded-3xl lg:border-gray-200 lg:shadow-xl
          left-0 top-16 rounded-none`}
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
        )}

        {/* Main Content */}
        {/* The lg: margin is unconditional on purpose: at lg the sidebar is
            always on screen (lg:translate-x-0 + fixed above), so the content
            always has to clear it. Tying the margin to sidebarOpen meant that
            opening the menu below lg and then crossing the breakpoint — an
            iPad rotating to landscape, or a window dragged wider — left the
            margin off while the sidebar was showing, hiding the leftmost
            296px of the page underneath it. */}
        {/* The student bottom tab bar is fixed over the page below `lg`, so the
            content needs matching bottom padding or the last card sits under it.
            Both the sm: and lg: overrides are spelled out because `sm:p-6` /
            `lg:p-8` would otherwise reset padding-bottom at those breakpoints.
            `lg:pb-8` restores exactly the desktop value (p-8).

            `overflow-y-auto` is dropped for students only. It never actually
            scrolled — this element has min-height, not height — but it did
            create a nested scroll container, which silently breaks
            `position: sticky` for any child. The new mobile layouts need
            sticky action bars. Other roles keep the identical class list. */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]
          transition-all duration-300 ${
            isStudent
              ? `pb-24 sm:pb-24 lg:pb-8 ${
                  studentSidebarCollapsed ? 'lg:ml-[96px]' : 'lg:ml-[266px]'
                }`
              : 'overflow-y-auto lg:ml-[296px]'
          }`}
        >
          <div className="max-w-[1400px] mx-auto">
            {/* Default-password warning — informational, never blocking. */}
            {showDefaultPasswordWarning && (
              <div
                className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm"
                role="alert"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={22} />
                    <div>
                      <p className="font-bold text-amber-900">
                        You&rsquo;re still using the default password
                      </p>
                      <p className="text-sm text-amber-800 mt-0.5">
                        Anyone who knows your login ID could sign in and see your personal
                        details. Changing it takes less than a minute.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(profilePath)}
                      className="px-4 py-2 text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-all whitespace-nowrap"
                    >
                      Change password
                    </button>
                    <button
                      onClick={dismissPwWarning}
                      className="px-3 py-2 text-sm font-medium rounded-xl text-amber-800 hover:bg-amber-100 transition-all"
                      aria-label="Dismiss password warning"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Student-only mobile/tablet bottom navigation */}
      {isStudent && <StudentBottomNav />}

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

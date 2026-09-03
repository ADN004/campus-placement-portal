import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CorrectionGate from './CorrectionGate';
import { placementOfficerAPI } from '../services/api';
import StudentApprovalGate from './StudentApprovalGate';
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
  BarChart3,
  Activity,
  User,
  GraduationCap,
  FileImage,
  RotateCcw,
  DatabaseBackup,
  Building2,
  AlertTriangle,
  Lock,
  Inbox,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import GradientOrb from './GradientOrb';
import StudentBottomNav from './StudentBottomNav';
import StudentTopBar from './student/StudentTopBar';
import StudentSidebar from './student/StudentSidebar';
import OfficerBottomNav from './officer/OfficerBottomNav';
import AdminTopBar from './admin/AdminTopBar';
import AdminSidebar from './admin/AdminSidebar';
import AdminBottomNav from './admin/AdminBottomNav';
import OfficerTopBar from './officer/OfficerTopBar';
import OfficerSidebar from './officer/OfficerSidebar';
import useDeviceType from '../hooks/useDeviceType';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const DEFAULT_PW_DISMISS_KEY = 'default-password-warning-dismissed';
const STUDENT_SIDEBAR_COLLAPSED_KEY = 'spc-student-sidebar-collapsed';
const OFFICER_SIDEBAR_COLLAPSED_KEY = 'spc-officer-sidebar-collapsed';
const ADMIN_SIDEBAR_COLLAPSED_KEY = 'spc-admin-sidebar-collapsed';

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

  // Students and placement officers each get their own chrome (top bar, grouped
  // sidebar, bottom tab bar), on two deliberately different visual directions.
  // Super admins keep exactly the shell they have today — every branch below
  // falls through to the original code path for them.
  const isStudent = user?.role === 'student';
  const isOfficer = user?.role === 'placement_officer';
  const isAdmin = user?.role === 'super_admin';

  /*
   * The officer's unread count, for the badge beside Inbox.
   *
   * Re-read on every navigation rather than polled on a timer: an officer moves
   * between pages constantly, so the count is never far behind, and it costs
   * one small query instead of one per officer per interval forever. Reading
   * the inbox itself is the case that has to feel immediate, and landing there
   * is a navigation.
   *
   * The endpoint answers 0 rather than an error when it cannot count, so a
   * failure here shows no badge instead of breaking the shell.
   */
  const [inboxUnread, setInboxUnread] = useState(0);
  useEffect(() => {
    if (!isOfficer) return;
    let cancelled = false;
    placementOfficerAPI
      .getInboxUnreadCount()
      .then((res) => { if (!cancelled) setInboxUnread(res.data.count || 0); })
      .catch(() => { if (!cancelled) setInboxUnread(0); });
    return () => { cancelled = true; };
  }, [isOfficer, location.pathname]);

  // A pending student can only reach the waiting page, so the navigation is
  // hidden entirely: every destination in it would bounce straight back, and a
  // menu full of dead links reads as broken. The top bar keeps the brand and
  // logout. Reads both shapes — login returns it flat, /auth/me nests it.
  const isPendingStudent =
    isStudent &&
    (user?.profile?.registration_status ?? user?.registration_status) === 'pending';

  // Hidden while pending: the warning's only action is "Change password", which
  // opens the profile — and the approval gate sends a pending student straight
  // back to the waiting page. A prompt you cannot act on is worse than none.
  // They see it on their first sign-in after approval instead.
  const showDefaultPasswordWarning =
    user?.using_default_password === true && !pwWarningDismissed && !isPendingStudent;

  // Whether the student sidebar is collapsed to the icon rail at `lg` and up.
  // Remembered across visits so the panel stays how the student left it.
  const [studentSidebarCollapsed, setStudentSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STUDENT_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // The officer equivalent, kept as its own state and its own storage key
  // rather than shared with the student one. The two roles are different
  // people on different machines, and this file is shared by all three roles —
  // a parallel pair is worth more here than the deduplication would be.
  const [officerSidebarCollapsed, setOfficerSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(OFFICER_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // And the super-admin equivalent, on the same reasoning: a third person on a
  // third machine, whose panel should stay how they left it.
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // While the student drawer is open it covers the page, so the page behind it
  // must not scroll — otherwise a swipe over the backdrop scrolls the content
  // underneath. Only below `lg`, where the drawer actually overlays; at `lg`
  // and up the sidebar is permanently on screen and nothing is covered.
  // Covers all three roles now. Each drawer had the identical bug, and each
  // has been given a redesigned shell in turn.
  const deviceType = useDeviceType();
  const drawerOpen = (isStudent || isOfficer || isAdmin) && sidebarOpen && deviceType !== 'desktop';
  useBodyScrollLock(drawerOpen);

  // Make the hardware/browser Back button close the drawer instead of leaving
  // the page. Opening it pushes a history entry; Back pops that entry and we
  // close. If it's closed another way (the ✕, or tapping the backdrop) the
  // entry we pushed is still on the stack, so we pop it ourselves — otherwise
  // the next Back press would appear to do nothing.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    window.history.pushState({ spcDrawer: true }, '');
    let poppedByBack = false;
    const onPop = () => {
      poppedByBack = true;
      setSidebarOpen(false);
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBack && window.history.state?.spcDrawer) {
        window.history.back();
      }
    };
  }, [drawerOpen]);

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

  const toggleAdminSidebar = () => {
    setAdminSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore — private browsing / storage disabled
      }
      return next;
    });
  };

  const toggleOfficerSidebar = () => {
    setOfficerSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OFFICER_SIDEBAR_COLLAPSED_KEY, String(next));
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
          // `badge` is read by OfficerSidebar; absent on every other item, which
          // renders nothing rather than a zero.
          { name: 'Inbox', path: '/placement-officer/inbox', icon: Inbox, badge: inboxUnread },
          { name: 'Send Notification', path: '/placement-officer/send-notification', icon: Bell },
          { name: 'Profile', path: '/placement-officer/profile', icon: User },
        ];
      case 'super_admin':
        return [
          { name: 'Dashboard', path: '/super-admin/dashboard', icon: Home },
          { name: 'All Students', path: '/super-admin/students', icon: Users },
          { name: 'Student Counts', path: '/super-admin/student-counts', icon: BarChart3 },
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
      className={`relative ${
        isStudent
          ? 'spc-vh-screen spc-student spc-student-bg spc-clip-x'
          : isOfficer
          ? 'spc-vh-screen spc-officer spc-officer-bg spc-clip-x'
          : isAdmin
          ? 'spc-vh-screen spc-admin spc-admin-bg spc-clip-x'
          : 'min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50'
      }`}
    >
      {/* Blocks students with an outstanding correction from every page but
          Profile. Skipped while pending: corrections are only ever raised
          against approved students, and the endpoint is now closed to pending
          ones, so polling it on every navigation would just 403. */}
      {isStudent && !isPendingStudent && <CorrectionGate />}
      {/* Sends students still awaiting approval to the waiting page */}
      {isStudent && (
        <StudentApprovalGate
          /* The login response carries registration_status directly; /auth/me
             nests the fuller record under `profile`. Reading both means the
             redirect happens on the first render after sign-in rather than
             after the profile hydrates. */
          status={user?.profile?.registration_status ?? user?.registration_status}
        />
      )}
      {/* The animated background orbs are gone from every role.

          They rendered with mix-blend-multiply, darkening whatever sat beneath
          them: measured, the ground went #eff6ff → #cadefd under one orb and
          → #bcc0fb where two overlapped. Over that, grey label text on the
          translucent panels scored 3.79 and 3.14 against a 4.5 minimum, and
          the effect cost a continuous large-blur composite on every phone.

          Students get the calm static ground from .spc-student-bg, officers the
          flat one from .spc-officer-bg, and super admins now the flat one from
          .spc-admin-bg. The depth in Console comes from the glass chrome above
          the page rather than from colour behind it.

          This branch is unreachable: Layout renders only inside `{user ? …}`,
          and routes exist for exactly the three roles, so a user who reached
          here at all is one of them. Left in place for now — removing it is its
          own change, and it takes `GradientOrb` with it. */}
      {!isStudent && !isOfficer && !isAdmin && (
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
          showMenu={!isPendingStudent}
        />
      )}

      {/* Officers get their own header; super admins keep the shared one. */}
      {isOfficer && (
        <OfficerTopBar
          user={user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />
      )}

      {/* The strip above the floating top bar.

          On `lg` the admin bar sits at top:12px, and nothing painted the 12px
          band above it — so a page scrolled up passed under the bar and then
          re-appeared as a sliver above it before leaving the viewport. A bar
          that is meant to float over the page instead had content squeezing out
          of its top edge.

          `.spc-admin-bg` is the same class the root carries, and its
          `background-attachment: fixed` is what makes reusing it work: the
          gradient is positioned against the viewport, not the element, so a
          12px window onto it lines up exactly with the page behind. Painting a
          flat colour here would show as a band against the wash.

          Only at `lg` — below that the bar is welded to top:0 full-bleed and
          there is no gap to leak through. */}
      {isAdmin && (
        <div
          aria-hidden="true"
          className="hidden lg:block fixed inset-x-0 top-0 h-3 z-20
            pointer-events-none spc-admin-bg"
        />
      )}

      {isAdmin && (
        <AdminTopBar
          user={user}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />
      )}

      {/* The original shell, now unreachable: every role has its own, and
          Layout only renders for a signed-in user whose role is one of the
          three. Removing it is its own change. */}
      {!isStudent && !isOfficer && !isAdmin && (
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

      {/* Super admins clear a bar that floats 12px below the top edge;
          every other role has one welded to it. */}
      <div className={`flex pt-16 ${isAdmin ? 'lg:pt-[88px]' : ''}`}>
        {/* Students get the grouped, collapsible sidebar. */}
        {isStudent && !isPendingStudent && (
          <StudentSidebar
            navigationItems={navigationItems}
            sidebarOpen={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
            collapsed={studentSidebarCollapsed}
            onToggleCollapse={toggleStudentSidebar}
            user={user}
          />
        )}

        {/* Officers get the grouped, collapsible panel. */}
        {isOfficer && (
          <OfficerSidebar
            navigationItems={navigationItems}
            sidebarOpen={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
            collapsed={officerSidebarCollapsed}
            onToggleCollapse={toggleOfficerSidebar}
            user={user}
          />
        )}

        {/* Super admins get the grouped, collapsible panel. Twenty flat
            destinations was the problem it solves. */}
        {isAdmin && (
          <AdminSidebar
            navigationItems={navigationItems}
            sidebarOpen={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
            collapsed={adminSidebarCollapsed}
            onToggleCollapse={toggleAdminSidebar}
            user={user}
          />
        )}

        {/* The original panel, now unreachable — see the note on the navbar. */}
        {!isStudent && !isOfficer && !isAdmin && (
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

            `overflow-y-auto` is dropped for students and officers. It never
            actually scrolled — this element has min-height, not height — but it
            did create a nested scroll container, which silently breaks
            `position: sticky` for any child. The student mobile layouts need
            sticky action bars, and every officer table needs a sticky header.
            Super admin keeps the identical class list. */}
        {/* `min-w-0` is load-bearing wherever `overflow-y-auto` is dropped. A
            flex item defaults to min-width:auto, so it refuses to shrink below
            its widest child — a nowrap filter chip, or an officer table — then
            pushes the whole content column past the viewport, and the clip on
            the root hides the overflow instead of letting you reach it. Super
            admin carries `min-w-0` for the same reason: an earlier note here
            claimed it got the shrink for free from an `overflow-y-auto` on
            <main>, but that class was dropped for all three roles — the
            document is what scrolls, which is exactly why content passes under
            the fixed top bar. */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8
          transition-all duration-300 ${
            isStudent
              ? `spc-vh-main min-w-0 pb-24 sm:pb-24 lg:pb-8 ${
                  isPendingStudent
                    ? ''
                    : studentSidebarCollapsed
                    ? 'lg:ml-[96px]'
                    : 'lg:ml-[266px]'
                }`
              : isOfficer
              ? `spc-vh-main min-w-0 pb-24 sm:pb-24 lg:pb-8 ${
                  /* The officer sidebar sits flush at left:0, so the margin is
                     exactly its width — unlike the student panel, which floats
                     with a 12px gutter on each side. */
                  officerSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[248px]'
                }`
              : isAdmin
              ? `spc-vh-main min-w-0 pb-24 sm:pb-24 lg:pb-8 ${
                  /* The admin pane floats with a 12px gutter on each side, so
                     the margin is its width plus both gutters — unlike the
                     officer's, which is welded to left:0 and needs only its
                     own width. */
                  adminSidebarCollapsed ? 'lg:ml-[96px]' : 'lg:ml-[272px]'
                }`
              : 'min-h-[calc(100vh-4rem)] overflow-y-auto lg:ml-[296px]'
          }`}
        >
          <div className="max-w-[1400px] mx-auto">
            {/* Default-password warning — informational, never blocking. */}
            {showDefaultPasswordWarning && (
              <div
                /* Officers get the same warning on the Register palette: the
                   semantic warn tokens, a rule instead of a 2px amber border,
                   and no shadow. Super admin keeps the original amber card. */
                className={
                  isOfficer
                    ? 'mb-6 rounded-spc-panel border border-spc-warn/40 bg-spc-warn-bg p-4'
                    : 'mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm'
                }
                role="alert"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* The non-officer strings below are written out in full,
                        in their original order, rather than interpolated — the
                        rendered markup for students and super admins has to
                        stay byte-identical, not merely equivalent. */}
                    <AlertTriangle
                      className={
                        isOfficer
                          ? 'text-spc-warn flex-shrink-0 mt-0.5'
                          : 'text-amber-600 flex-shrink-0 mt-0.5'
                      }
                      size={22}
                    />
                    <div>
                      <p className={`font-bold ${isOfficer ? 'text-spc-ink' : 'text-amber-900'}`}>
                        You&rsquo;re still using the default password
                      </p>
                      <p
                        className={
                          isOfficer
                            ? 'text-sm text-spc-body mt-0.5'
                            : 'text-sm text-amber-800 mt-0.5'
                        }
                      >
                        Anyone who knows your login ID could sign in and see your personal
                        details. Changing it takes less than a minute.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(profilePath)}
                      className={
                        isOfficer
                          ? 'min-h-[44px] px-4 text-sm font-bold rounded-spc-control bg-spc-accent text-spc-on-accent hover:opacity-95 transition-opacity whitespace-nowrap'
                          : 'px-4 py-2 text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-all whitespace-nowrap'
                      }
                    >
                      Change password
                    </button>
                    <button
                      onClick={dismissPwWarning}
                      className={
                        isOfficer
                          ? 'min-h-[44px] px-3 text-sm font-semibold rounded-spc-control text-spc-body hover:bg-spc-surface transition-colors'
                          : 'px-3 py-2 text-sm font-medium rounded-xl text-amber-800 hover:bg-amber-100 transition-all'
                      }
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

      {/* Student-only mobile/tablet bottom navigation. Hidden while the drawer
          is open — the drawer already lists every destination, and the bar
          would otherwise sit on top of it. */}
      {isStudent && !isPendingStudent && !sidebarOpen && <StudentBottomNav />}

      {/* Officer equivalent, on the same rule: hidden while the drawer is open,
          since the drawer already lists every destination. */}
      {isOfficer && !sidebarOpen && <OfficerBottomNav />}

      {/* And the super-admin one. Same rule again. */}
      {isAdmin && !sidebarOpen && <AdminBottomNav />}

      {/* Mobile sidebar overlay. Officers get a plain scrim — the blur is a
          decorative effect that direction does without, and it costs a
          full-screen composite on the phones officers actually use.

          Super admins keep the blur: a scrim is on Console's short list of
          things allowed to be glass, since the page really is behind it. It is
          drawn in ink rather than gray-900 so it belongs to the palette. */}
      {sidebarOpen && (
        <div
          className={
            isOfficer
              ? 'fixed inset-0 bg-spc-ink/30 z-10 lg:hidden animate-fadeIn'
              : isAdmin
              ? 'fixed inset-0 bg-spc-ink/35 backdrop-blur-sm z-10 lg:hidden animate-fadeIn'
              : 'fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-10 lg:hidden animate-fadeIn'
          }
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

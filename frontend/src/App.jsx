import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Shared Components (loaded eagerly - needed on every page)
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Auth Pages (lazy loaded)
const RoleSelectionPage = lazy(() => import('./pages/auth/RoleSelectionPage'));
const StudentLoginPage = lazy(() => import('./pages/auth/StudentLoginPage'));
const PlacementOfficerLoginPage = lazy(() => import('./pages/auth/PlacementOfficerLoginPage'));
const SuperAdminLoginPage = lazy(() => import('./pages/auth/SuperAdminLoginPage'));
const StudentRegisterPage = lazy(() => import('./pages/auth/StudentRegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

// Student Pages (lazy loaded)
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentJobs = lazy(() => import('./pages/student/StudentJobs'));
const StudentApplications = lazy(() => import('./pages/student/StudentApplications'));
const StudentNotifications = lazy(() => import('./pages/student/StudentNotifications'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));
const ExtendedProfile = lazy(() => import('./pages/student/ExtendedProfile'));
const StudentResume = lazy(() => import('./pages/student/Resume'));
const WaitingPage = lazy(() => import('./pages/student/WaitingPage'));

// Placement Officer Pages (lazy loaded)
const PlacementOfficerDashboard = lazy(() => import('./pages/placement-officer/PlacementOfficerDashboard'));
const ManageStudents = lazy(() => import('./pages/placement-officer/ManageStudents'));
const SendNotification = lazy(() => import('./pages/placement-officer/SendNotification'));
const CreateJobRequest = lazy(() => import('./pages/placement-officer/CreateJobRequest'));
const MyJobRequests = lazy(() => import('./pages/placement-officer/MyJobRequests'));
const PlacementOfficerProfile = lazy(() => import('./pages/placement-officer/Profile'));
const JobEligibleStudents = lazy(() => import('./pages/placement-officer/JobEligibleStudents'));
const PlacementOfficerPRNRanges = lazy(() => import('./pages/placement-officer/ManagePRNRanges'));
const PlacementOfficerManageCollegeBranches = lazy(() => import('./pages/placement-officer/ManageCollegeBranches'));
const PlacementOfficerPlacementPoster = lazy(() => import('./pages/placement-officer/PlacementPoster'));

// Super Admin Pages (lazy loaded)
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard'));
const ManagePRNRanges = lazy(() => import('./pages/super-admin/ManagePRNRanges'));
const PRNRangeStudents = lazy(() => import('./pages/super-admin/PRNRangeStudents'));
const ManagePlacementOfficers = lazy(() => import('./pages/super-admin/ManagePlacementOfficers'));
const ManageJobs = lazy(() => import('./pages/super-admin/ManageJobs'));
const ManageJobRequests = lazy(() => import('./pages/super-admin/ManageJobRequests'));
const ManageWhitelistRequests = lazy(() => import('./pages/super-admin/ManageWhitelistRequests'));
const ManageSuperAdmins = lazy(() => import('./pages/super-admin/ManageSuperAdmins'));
const ActivityLogs = lazy(() => import('./pages/super-admin/ActivityLogs'));
const SuperAdminProfile = lazy(() => import('./pages/super-admin/Profile'));
const SuperAdminJobEligibleStudents = lazy(() => import('./pages/super-admin/JobEligibleStudents'));
const ManageAllStudents = lazy(() => import('./pages/super-admin/ManageAllStudents'));
const ManageRequirementTemplates = lazy(() => import('./pages/super-admin/ManageRequirementTemplates'));
const SuperAdminManageCollegeBranches = lazy(() => import('./pages/super-admin/ManageCollegeBranches'));
const SuperAdminSendNotification = lazy(() => import('./pages/super-admin/SendNotification'));
const SuperAdminPlacementPoster = lazy(() => import('./pages/super-admin/PlacementPoster'));
const AcademicYearReset = lazy(() => import('./pages/super-admin/AcademicYearReset'));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <RoleSelectionPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/login/student" element={!user ? <StudentLoginPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/login/officer" element={!user ? <PlacementOfficerLoginPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/login/admin" element={!user ? <SuperAdminLoginPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/register" element={!user ? <StudentRegisterPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Routes */}
        {user ? (
          <Route element={<Layout />}>
            {/* Student Routes */}
            {user.role === 'student' && (
              <>
                <Route path="/student/waiting" element={<WaitingPage />} />
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/jobs" element={<StudentJobs />} />
                <Route path="/student/applications" element={<StudentApplications />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
                <Route path="/student/profile" element={<StudentProfile />} />
                <Route path="/student/extended-profile" element={<ExtendedProfile />} />
                <Route path="/student/resume" element={<StudentResume />} />
              </>
            )}

            {/* Placement Officer Routes */}
            {user.role === 'placement_officer' && (
              <>
                <Route path="/placement-officer/dashboard" element={<PlacementOfficerDashboard />} />
                <Route path="/placement-officer/students" element={<ManageStudents />} />
                <Route path="/placement-officer/prn-ranges" element={<PlacementOfficerPRNRanges />} />
                <Route path="/placement-officer/send-notification" element={<SendNotification />} />
                <Route path="/placement-officer/create-job-request" element={<CreateJobRequest />} />
                <Route path="/placement-officer/my-job-requests" element={<MyJobRequests />} />
                <Route path="/placement-officer/job-eligible-students" element={<JobEligibleStudents />} />
                <Route path="/placement-officer/placement-poster" element={<PlacementOfficerPlacementPoster />} />
                <Route path="/placement-officer/college-branches" element={<PlacementOfficerManageCollegeBranches />} />
                <Route path="/placement-officer/profile" element={<PlacementOfficerProfile />} />
              </>
            )}

            {/* Super Admin Routes */}
            {user.role === 'super_admin' && (
              <>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/prn-ranges" element={<ManagePRNRanges />} />
                <Route path="/super-admin/prn-ranges/:rangeId/students" element={<PRNRangeStudents />} />
                <Route path="/super-admin/placement-officers" element={<ManagePlacementOfficers />} />
                <Route path="/super-admin/jobs" element={<ManageJobs />} />
                <Route path="/super-admin/job-requests" element={<ManageJobRequests />} />
                <Route path="/super-admin/requirement-templates" element={<ManageRequirementTemplates />} />
                <Route path="/super-admin/students" element={<ManageAllStudents />} />
                <Route path="/super-admin/send-notification" element={<SuperAdminSendNotification />} />
                <Route path="/super-admin/whitelist-requests" element={<ManageWhitelistRequests />} />
                <Route path="/super-admin/admins" element={<ManageSuperAdmins />} />
                <Route path="/super-admin/activity-logs" element={<ActivityLogs />} />
                <Route path="/super-admin/job-eligible-students" element={<SuperAdminJobEligibleStudents />} />
                <Route path="/super-admin/placement-poster" element={<SuperAdminPlacementPoster />} />
                <Route path="/super-admin/college-branches" element={<SuperAdminManageCollegeBranches />} />
                <Route path="/super-admin/academic-year-reset" element={<AcademicYearReset />} />
                <Route path="/super-admin/profile" element={<SuperAdminProfile />} />
              </>
            )}

            {/* Redirect to appropriate dashboard */}
            <Route path="/" element={<Navigate to={getDashboardRoute(user.role)} />} />
            <Route path="*" element={<Navigate to={getDashboardRoute(user.role)} />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
      </Suspense>
    </Router>
  );
}

// Helper function to get dashboard route based on role
const getDashboardRoute = (role) => {
  switch (role) {
    case 'student':
      return '/student/dashboard';
    case 'placement_officer':
      return '/placement-officer/dashboard';
    case 'super_admin':
      return '/super-admin/dashboard';
    default:
      return '/login';
  }
};

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth Pages
import RoleSelectionPage from './pages/auth/RoleSelectionPage';
import StudentLoginPage from './pages/auth/StudentLoginPage';
import PlacementOfficerLoginPage from './pages/auth/PlacementOfficerLoginPage';
import SuperAdminLoginPage from './pages/auth/SuperAdminLoginPage';
import StudentRegisterPage from './pages/auth/StudentRegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentJobs from './pages/student/StudentJobs';
import StudentApplications from './pages/student/StudentApplications';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentProfile from './pages/student/Profile';
import ExtendedProfile from './pages/student/ExtendedProfile';
import WaitingPage from './pages/student/WaitingPage';

// Placement Officer Pages
import PlacementOfficerDashboard from './pages/placement-officer/PlacementOfficerDashboard';
import ManageStudents from './pages/placement-officer/ManageStudents';
import SendNotification from './pages/placement-officer/SendNotification';
import CreateJobRequest from './pages/placement-officer/CreateJobRequest';
import MyJobRequests from './pages/placement-officer/MyJobRequests';
import PlacementOfficerProfile from './pages/placement-officer/Profile';
import JobEligibleStudents from './pages/placement-officer/JobEligibleStudents';
import PlacementOfficerPRNRanges from './pages/placement-officer/ManagePRNRanges';
import PlacementOfficerManageCollegeBranches from './pages/placement-officer/ManageCollegeBranches';
import PlacementOfficerPlacementPoster from './pages/placement-officer/PlacementPoster';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import ManagePRNRanges from './pages/super-admin/ManagePRNRanges';
import PRNRangeStudents from './pages/super-admin/PRNRangeStudents';
import ManagePlacementOfficers from './pages/super-admin/ManagePlacementOfficers';
import ManageJobs from './pages/super-admin/ManageJobs';
import ManageJobRequests from './pages/super-admin/ManageJobRequests';
import ManageWhitelistRequests from './pages/super-admin/ManageWhitelistRequests';
import ManageSuperAdmins from './pages/super-admin/ManageSuperAdmins';
import ActivityLogs from './pages/super-admin/ActivityLogs';
import SuperAdminProfile from './pages/super-admin/Profile';
import SuperAdminJobEligibleStudents from './pages/super-admin/JobEligibleStudents';
import ManageAllStudents from './pages/super-admin/ManageAllStudents';
import ManageRequirementTemplates from './pages/super-admin/ManageRequirementTemplates';
import SuperAdminManageCollegeBranches from './pages/super-admin/ManageCollegeBranches';
import SuperAdminSendNotification from './pages/super-admin/SendNotification';
import SuperAdminPlacementPoster from './pages/super-admin/PlacementPoster';

// Shared Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
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

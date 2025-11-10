import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import StudentRegisterPage from './pages/auth/StudentRegisterPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentJobs from './pages/student/StudentJobs';
import StudentApplications from './pages/student/StudentApplications';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentProfile from './pages/student/Profile';
import WaitingPage from './pages/student/WaitingPage';

// Placement Officer Pages
import PlacementOfficerDashboard from './pages/placement-officer/PlacementOfficerDashboard';
import ManageStudents from './pages/placement-officer/ManageStudents';
import SendNotification from './pages/placement-officer/SendNotification';
import CreateJobRequest from './pages/placement-officer/CreateJobRequest';
import PlacementOfficerProfile from './pages/placement-officer/Profile';
import JobEligibleStudents from './pages/placement-officer/JobEligibleStudents';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import ManagePRNRanges from './pages/super-admin/ManagePRNRanges';
import ManagePlacementOfficers from './pages/super-admin/ManagePlacementOfficers';
import ManageJobs from './pages/super-admin/ManageJobs';
import ManageWhitelistRequests from './pages/super-admin/ManageWhitelistRequests';
import ActivityLogs from './pages/super-admin/ActivityLogs';
import SuperAdminProfile from './pages/super-admin/Profile';
import SuperAdminJobEligibleStudents from './pages/super-admin/JobEligibleStudents';
import ManageAllStudents from './pages/super-admin/ManageAllStudents';

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
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={getDashboardRoute(user.role)} />} />
        <Route path="/register" element={!user ? <StudentRegisterPage /> : <Navigate to={getDashboardRoute(user.role)} />} />

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
              </>
            )}

            {/* Placement Officer Routes */}
            {user.role === 'placement_officer' && (
              <>
                <Route path="/placement-officer/dashboard" element={<PlacementOfficerDashboard />} />
                <Route path="/placement-officer/students" element={<ManageStudents />} />
                <Route path="/placement-officer/send-notification" element={<SendNotification />} />
                <Route path="/placement-officer/job-requests" element={<CreateJobRequest />} />
                <Route path="/placement-officer/job-eligible-students" element={<JobEligibleStudents />} />
                <Route path="/placement-officer/profile" element={<PlacementOfficerProfile />} />
              </>
            )}

            {/* Super Admin Routes */}
            {user.role === 'super_admin' && (
              <>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/prn-ranges" element={<ManagePRNRanges />} />
                <Route path="/super-admin/placement-officers" element={<ManagePlacementOfficers />} />
                <Route path="/super-admin/jobs" element={<ManageJobs />} />
                <Route path="/super-admin/students" element={<ManageAllStudents />} />
                <Route path="/super-admin/whitelist-requests" element={<ManageWhitelistRequests />} />
                <Route path="/super-admin/activity-logs" element={<ActivityLogs />} />
                <Route path="/super-admin/job-eligible-students" element={<SuperAdminJobEligibleStudents />} />
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

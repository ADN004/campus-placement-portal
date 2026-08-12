import { useEffect, useState } from 'react';
import { studentAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Briefcase, FileText, Bell, GraduationCap, User } from 'lucide-react';
import ExtendedProfilePromptModal from '../../components/ExtendedProfilePromptModal';
import ResumePromptModal from '../../components/ResumePromptModal';
import CgpaUnlockPopup from '../../components/CgpaUnlockPopup';
import PriorityNotificationPopup from '../../components/student/PriorityNotificationPopup';
import UpdateStudentEmailModal from '../../components/UpdateStudentEmailModal';
import useDeviceType from '../../hooks/useDeviceType';
import api from '../../services/api';
import DesktopStudentDashboard, {
  DesktopDashboardSkeleton,
} from './dashboard/DesktopStudentDashboard';
import TabletStudentDashboard, {
  TabletDashboardSkeleton,
} from './dashboard/TabletStudentDashboard';
import MobileStudentDashboard, {
  MobileDashboardSkeleton,
} from './dashboard/MobileStudentDashboard';

/**
 * StudentDashboard — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. Nothing is reimplemented per device, so a fix here fixes all three.
 * See hooks/useDeviceType for where the mobile/tablet/desktop line is drawn.
 */
export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [resending, setResending] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showExtendedProfilePrompt, setShowExtendedProfilePrompt] = useState(false);
  const [extendedProfileCompletion, setExtendedProfileCompletion] = useState(100);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  // Only so the priority-notification popup can wait its turn rather than
  // opening on top of the CGPA one. CgpaUnlockPopup decides its own visibility.
  const [showCgpaPopup, setShowCgpaPopup] = useState(false);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchDashboard();
    fetchVerificationStatus();
    checkExtendedProfileCompletion();
    checkResumeCompletion();
  }, []);

  // Skeleton loading gate
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Lock scroll during skeleton
  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  const checkExtendedProfileCompletion = async () => {
    try {
      const response = await api.get('/students/extended-profile/completion');
      const completion = response.data.data.overall_completion || 0;
      setExtendedProfileCompletion(completion);

      if (completion < 100) {
        const today = new Date().toISOString().split('T')[0];
        const dismissed = localStorage.getItem('spc_profile_prompt_dismissed');
        if (dismissed !== today) {
          setShowExtendedProfilePrompt(true);
        }
      }
    } catch (error) {
      console.error('Failed to check extended profile completion:', error);
    }
  };

  const checkResumeCompletion = async () => {
    try {
      const response = await studentAPI.getResume();
      const resumeData = response.data.data;
      if (resumeData && !resumeData.has_custom_content) {
        const today = new Date().toISOString().split('T')[0];
        const dismissed = localStorage.getItem('spc_resume_prompt_dismissed');
        if (dismissed !== today) {
          setShowResumePrompt(true);
        }
      }
    } catch (error) {
      console.error('Failed to check resume completion:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await studentAPI.getDashboard();
      setDashboard(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await studentAPI.getVerificationStatus();
      setVerificationStatus(response.data.data);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationStatus?.can_resend) {
      toast.error('Maximum verification emails sent for today. Please try again tomorrow.');
      return;
    }

    setResending(true);
    try {
      await studentAPI.resendVerificationEmail();
      toast.success('Verification email sent! Please check your inbox.');
      fetchVerificationStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  // Named for passing down to the presenters — same call as the inline handler
  // it replaces.
  const handleOpenEmailModal = () => setShowEmailModal(true);

  const handleCloseEmailModal = () => setShowEmailModal(false);

  const handleDismissExtendedProfilePrompt = () => {
    localStorage.setItem('spc_profile_prompt_dismissed', new Date().toISOString().split('T')[0]);
    setShowExtendedProfilePrompt(false);
  };

  const handleDismissResumePrompt = () => {
    localStorage.setItem('spc_resume_prompt_dismissed', new Date().toISOString().split('T')[0]);
    setShowResumePrompt(false);
  };

  const handleUpdateEmail = async (email) => {
    const response = await authAPI.updateStudentEmail(email);
    toast.success(response.data.message, { duration: 7000 });
    fetchDashboard();
  };

  // Show skeleton until both data is loaded AND minimum time has passed
  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileDashboardSkeleton />;
    if (deviceType === 'tablet') return <TabletDashboardSkeleton />;
    return <DesktopDashboardSkeleton />;
  }

  const stats = dashboard?.stats || {};
  const profile = dashboard?.profile || {};
  const recentJobs = dashboard?.recentJobs || [];
  const recentApplications = dashboard?.recentApplications || [];

  const statCards = [
    {
      title: 'Available Jobs',
      value: stats.eligibleJobsCount || 0,
      icon: Briefcase,
      gradient: 'from-blue-500 to-cyan-600',
      link: '/student/jobs',
      description: 'Jobs you can apply for',
    },
    {
      title: 'My Applications',
      value: stats.applicationsCount || 0,
      icon: FileText,
      gradient: 'from-green-500 to-emerald-600',
      link: '/student/applications',
      description: 'Total applications submitted',
    },
    {
      title: 'Unread Notifications',
      value: stats.unreadNotifications || 0,
      icon: Bell,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/student/notifications',
      description: 'New announcements',
    },
    {
      title: 'Programme CGPA',
      value: profile.programme_cgpa || 'N/A',
      icon: GraduationCap,
      gradient: 'from-purple-500 to-pink-600',
      description: 'Your current CGPA',
    },
  ];

  const quickActions = [
    {
      title: 'Browse Jobs',
      description: 'Find and apply to job openings that match your profile',
      icon: Briefcase,
      gradient: 'from-blue-500 to-indigo-600',
      link: '/student/jobs',
      count: stats.eligibleJobsCount || 0,
    },
    {
      title: 'My Applications',
      description: 'Track your job applications and their current status',
      icon: FileText,
      gradient: 'from-green-500 to-emerald-600',
      link: '/student/applications',
      count: stats.applicationsCount || 0,
    },
    {
      title: 'View Notifications',
      description: 'Check announcements from your placement officer',
      icon: Bell,
      gradient: 'from-yellow-500 to-orange-600',
      link: '/student/notifications',
      count: stats.unreadNotifications || 0,
    },
    {
      title: 'Update Profile',
      description: 'Keep your profile information up to date',
      icon: User,
      gradient: 'from-purple-500 to-pink-600',
      link: '/student/profile',
    },
  ];

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    profile,
    stats,
    upcomingDrives: dashboard?.upcomingDrives || [],
    statCards,
    quickActions,
    recentJobs,
    recentApplications,
    verificationStatus,
    resending,
    onResendVerification: handleResendVerification,
    onOpenEmailModal: handleOpenEmailModal,
  };

  return (
    <>
      {/* Extended Profile Prompt Modal */}
      {showExtendedProfilePrompt && (
        <ExtendedProfilePromptModal
          onClose={handleDismissExtendedProfilePrompt}
          profileCompletion={extendedProfileCompletion}
        />
      )}

      {/* Resume Prompt Modal (only shows if extended profile prompt is not showing) */}
      {showResumePrompt && !showExtendedProfilePrompt && (
        <ResumePromptModal onClose={handleDismissResumePrompt} />
      )}

      {/* CGPA Unlock Popup (one-time, for approved students) */}
      <CgpaUnlockPopup onShownChange={setShowCgpaPopup} />

      {/* High/Urgent notifications from the placement cell. Last in the queue:
          the prompts above are about this student's own account, so they go
          first, and stacking two dialogs helps nobody. */}
      <PriorityNotificationPopup
        suppressed={
          showExtendedProfilePrompt || showResumePrompt || showEmailModal || showCgpaPopup
        }
      />

      {/* Update Email Modal (self-service email correction) */}
      {showEmailModal && (
        <UpdateStudentEmailModal
          currentEmail={profile.email}
          onSubmit={handleUpdateEmail}
          onClose={handleCloseEmailModal}
          variant="spc"
        />
      )}

      {deviceType === 'mobile' ? (
        <MobileStudentDashboard {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletStudentDashboard {...presenterProps} />
      ) : (
        <DesktopStudentDashboard {...presenterProps} />
      )}
    </>
  );
}

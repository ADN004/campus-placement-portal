import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import useDeviceType from '../../hooks/useDeviceType';
import { MobileWaiting, TabletWaiting, DesktopWaiting } from './waiting/WaitingPresenters';

/**
 * WaitingPage — container.
 *
 * Shown to a student whose registration is still pending. StudentApprovalGate
 * routes them here from every page except their profile, which stays reachable
 * so an officer's correction request can still be acted on.
 *
 * Guarded both ways: anyone who isn't pending is sent to their dashboard, so
 * typing the URL can't produce a misleading "you're waiting" screen.
 */
export default function WaitingPage() {
  const { user, checkAuth } = useAuth();
  const deviceType = useDeviceType();
  const [refreshing, setRefreshing] = useState(false);

  const profile = user?.profile;
  // Same dual read as StudentApprovalGate — login gives it flat, /auth/me nests it.
  const status = profile?.registration_status ?? user?.registration_status;

  if (status && status !== 'pending') {
    return <Navigate to="/student/dashboard" replace />;
  }

  // Without this the page is a dead end: a student approved five minutes ago
  // would have to sign out and back in to find out. Re-reads /auth/me; if the
  // status has changed, the guard above redirects on the next render.
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkAuth();
      toast.success('Status checked');
    } catch {
      toast.error('Could not check right now. Please try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  };

  const presenterProps = {
    name: profile?.name || profile?.student_name || '',
    prn: profile?.prn,
    email: user?.email,
    profile,
    refreshing,
    onRefresh: handleRefresh,
  };

  if (deviceType === 'mobile') return <MobileWaiting {...presenterProps} />;
  if (deviceType === 'tablet') return <TabletWaiting {...presenterProps} />;
  return <DesktopWaiting {...presenterProps} />;
}

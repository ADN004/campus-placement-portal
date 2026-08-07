import { useState, useEffect, useCallback } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import NotifyPage from './notify/NotifyPage';
import {
  DesktopNotifySkeleton,
  TabletNotifySkeleton,
  MobileNotifySkeleton,
} from './notify/NotifySkeleton';

const EMPTY_FORM = {
  title: '',
  message: '',
  target_branches: [], // empty means every approved student in the college
  priority: 'normal',
};

/**
 * SendNotification — container.
 *
 * Owns the branch list, the sent history, the form and the send; the presenter
 * renders what it is handed.
 *
 * The history is real now. It used to be `setRecentNotifications([])` with a
 * comment saying "mock data for now", so the panel only ever held what you sent
 * in the current session and emptied on refresh. It reads the new
 * /placement-officer/sent-notifications endpoint and is refetched after a
 * successful send rather than being patched optimistically with a fake row.
 */
export default function SendNotification() {
  const [branches, setBranches] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [sentItems, setSentItems] = useState([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const deviceType = useDeviceType();

  const fetchSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const response = await placementOfficerAPI.getSentNotifications();
      setSentItems(response.data.data || []);
    } catch (error) {
      // The history is supporting information; failing to load it must not
      // stop an officer sending something.
      console.error('Error fetching sent notifications:', error);
    } finally {
      setSentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchSent();
    // fetchSent is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const branchesResponse = await placementOfficerAPI.getBranches();
      const branchesData = branchesResponse.data.data || [];
      setBranches(branchesData);

      const total = branchesData.reduce(
        (sum, branch) => sum + (parseInt(branch.student_count, 10) || 0),
        0
      );
      setTotalStudents(total);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------- handlers */

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBranchToggle = (branchName) => {
    setFormData((prev) => ({
      ...prev,
      target_branches: prev.target_branches.includes(branchName)
        ? prev.target_branches.filter((b) => b !== branchName)
        : [...prev.target_branches, branchName],
    }));
  };

  const handleSelectAllBranches = () => {
    setFormData((prev) => ({
      ...prev,
      target_branches:
        prev.target_branches.length === branches.length ? [] : branches.map((b) => b.branch),
    }));
  };

  /**
   * Who this will reach.
   *
   * Deliberately the same rule the backend runs: no branches selected means
   * every approved, non-blacklisted student in the college, and a selection
   * sums those branches. The branch counts come from the same query, so the
   * number shown here is the number that will actually receive it.
   */
  const getTargetStudentCount = () => {
    if (formData.target_branches.length === 0) return totalStudents;
    return branches
      .filter((b) => formData.target_branches.includes(b.branch))
      .reduce((sum, branch) => sum + (parseInt(branch.student_count, 10) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a notification message');
      return;
    }

    if (getTargetStudentCount() === 0) {
      toast.error('No students available for the selected criteria');
      return;
    }

    try {
      setSending(true);
      const response = await placementOfficerAPI.sendNotification({
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        target_branches: formData.target_branches,
      });

      // The server's count, not the local estimate. They agree unless a student
      // was approved or blacklisted between this page loading and the send, and
      // when they disagree the server is the one that is right.
      const sentTo = response.data?.data?.recipient_count ?? getTargetStudentCount();
      toast.success(
        formData.priority === 'urgent'
          ? `Sent to ${sentTo} student(s). Emails are going out now.`
          : `Sent to ${sentTo} student(s).`
      );

      setFormData(EMPTY_FORM);
      fetchSent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
      console.error('Send notification error:', error);
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => setFormData(EMPTY_FORM);

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileNotifySkeleton />;
    if (deviceType === 'tablet') return <TabletNotifySkeleton />;
    return <DesktopNotifySkeleton />;
  }

  return (
    <NotifyPage
      layout={deviceType}
      form={formData}
      branches={branches}
      sending={sending}
      sentItems={sentItems}
      sentLoading={sentLoading}
      targetCount={getTargetStudentCount()}
      onChange={handleChange}
      onToggleBranch={handleBranchToggle}
      onToggleAllBranches={handleSelectAllBranches}
      onSubmit={handleSubmit}
      onClear={handleClear}
    />
  );
}

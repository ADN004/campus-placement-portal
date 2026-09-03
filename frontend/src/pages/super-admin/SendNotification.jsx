import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import NotifyBody from './notify/NotifyBody';
import NotifySkeleton from './notify/NotifySkeleton';

const EMPTY_FORM = {
  title: '',
  message: '',
  target_colleges: [], // Empty means all colleges
  target_branches: {}, // { college_id: [branches] }
  priority: 'normal', // 'normal', 'high', 'urgent'
};

/**
 * Send Notification — container.
 *
 * All state, effects and handlers; `NotifyBody` draws them. Every request,
 * payload, validation message and count is carried over unchanged.
 *
 * One thing is worth naming, because it looks like a missing feature and is
 * in fact the old behaviour: the list under the form holds only what has been
 * sent since the page was opened. Nothing is fetched and a refresh empties it.
 * The officer role has a real sent-history endpoint; super admin has none. The
 * heading now says "Sent in this session" rather than "Recent notifications",
 * because the old wording made a scratch list look like a record.
 */
export default function SendNotification() {
  const deviceType = useDeviceType();
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [sending, setSending] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.target_colleges.length > 0) {
      fetchBranchesForSelectedColleges();
    } else {
      setBranches([]);
    }
  }, [formData.target_colleges]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const collegesResponse = await superAdminAPI.getCollegesForNotifications();
      const collegesData = collegesResponse.data.data || [];
      setColleges(collegesData);

      const total = collegesData.reduce(
        (sum, college) => sum + parseInt(college.total_students || 0, 10),
        0,
      );
      setTotalStudents(total);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchesForSelectedColleges = async () => {
    try {
      const response = await superAdminAPI.getBranchesForColleges(formData.target_colleges);
      setBranches(response.data.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
    }
  };

  const handleCollegeToggle = (collegeId) => {
    const newColleges = formData.target_colleges.includes(collegeId)
      ? formData.target_colleges.filter((id) => id !== collegeId)
      : [...formData.target_colleges, collegeId];

    // Dropping a college drops any branch narrowing that belonged to it.
    const newBranches = { ...formData.target_branches };
    if (!newColleges.includes(collegeId)) {
      delete newBranches[collegeId];
    }

    setFormData({
      ...formData,
      target_colleges: newColleges,
      target_branches: newBranches,
    });
  };

  const handleSelectAllColleges = () => {
    if (formData.target_colleges.length === colleges.length) {
      setFormData({ ...formData, target_colleges: [], target_branches: {} });
    } else {
      setFormData({ ...formData, target_colleges: colleges.map((c) => c.id) });
    }
  };

  const handleBranchToggle = (collegeId, branchName) => {
    const newBranches = { ...formData.target_branches };

    if (!newBranches[collegeId]) {
      newBranches[collegeId] = [];
    }

    if (newBranches[collegeId].includes(branchName)) {
      newBranches[collegeId] = newBranches[collegeId].filter((b) => b !== branchName);
      if (newBranches[collegeId].length === 0) {
        delete newBranches[collegeId];
      }
    } else {
      newBranches[collegeId] = [...newBranches[collegeId], branchName];
    }

    setFormData({ ...formData, target_branches: newBranches });
  };

  const handleSelectAllBranches = () => {
    const allBranchesSelected = Object.keys(formData.target_branches).length > 0;

    if (allBranchesSelected) {
      setFormData({ ...formData, target_branches: {} });
    } else {
      const newBranches = {};
      branches.forEach((branch) => {
        if (!newBranches[branch.college_id]) {
          newBranches[branch.college_id] = [];
        }
        if (!newBranches[branch.college_id].includes(branch.branch)) {
          newBranches[branch.college_id].push(branch.branch);
        }
      });
      setFormData({ ...formData, target_branches: newBranches });
    }
  };

  /*
   * How many students this reaches, by the same three rules as before: every
   * student when no college is chosen, the chosen colleges' totals when no
   * branch is, and the chosen branches' counts otherwise.
   */
  const getTargetStudentCount = () => {
    if (formData.target_colleges.length === 0) {
      return totalStudents;
    }

    if (Object.keys(formData.target_branches).length === 0) {
      return colleges
        .filter((c) => formData.target_colleges.includes(c.id))
        .reduce((sum, college) => sum + parseInt(college.total_students || 0, 10), 0);
    }

    let count = 0;
    branches.forEach((branch) => {
      if (formData.target_branches[branch.college_id]?.includes(branch.branch)) {
        count += parseInt(branch.student_count || 0, 10);
      }
    });
    return count;
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

    const targetCount = getTargetStudentCount();
    if (targetCount === 0) {
      toast.error('No students available for the selected criteria');
      return;
    }

    try {
      setSending(true);
      const submitData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        target_colleges: formData.target_colleges,
        target_branches: formData.target_branches,
      };

      await superAdminAPI.sendNotification(submitData);

      const successMsg = formData.priority === 'urgent'
        ? `Notification sent to ${targetCount} student(s)! Urgent emails are being sent.`
        : `Notification sent successfully to ${targetCount} student(s)!`;
      toast.success(successMsg);

      const newNotification = {
        id: Date.now(),
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipient_count: targetCount,
        target_colleges: formData.target_colleges.length > 0
          ? `${formData.target_colleges.length} college(s)`
          : 'All colleges',
        sent_at: new Date().toISOString(),
      };
      setRecentNotifications([newNotification, ...recentNotifications].slice(0, 10));

      setFormData(EMPTY_FORM);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
      console.error('Send notification error:', error);
    } finally {
      setSending(false);
    }
  };

  if (showSkeleton) return <NotifySkeleton layout={deviceType} />;

  const branchCount = Object.values(formData.target_branches)
    .reduce((sum, list) => sum + list.length, 0);

  return (
    <NotifyBody
      layout={deviceType}
      colleges={colleges}
      branches={branches}
      formData={formData}
      onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
      onCollegeToggle={handleCollegeToggle}
      onSelectAllColleges={handleSelectAllColleges}
      onBranchToggle={handleBranchToggle}
      onSelectAllBranches={handleSelectAllBranches}
      onSubmit={handleSubmit}
      sending={sending}
      targetCount={getTargetStudentCount()}
      branchCount={branchCount}
      recentNotifications={recentNotifications}
    />
  );
}

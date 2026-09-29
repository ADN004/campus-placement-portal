import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import NotifyBody from './notify/NotifyBody';
import NotifySkeleton from './notify/NotifySkeleton';
import { recipientOf, describeAudience } from './notify/notifyShared';

const EMPTY_FORM = {
  title: '',
  message: '',
  target_colleges: [], // Empty means all colleges
  target_branches: {}, // { college_id: [branches] }
  priority: 'normal', // 'normal', 'high', 'urgent'
  // Students unless somebody says otherwise, on every load and after every
  // send. The audience is invisible once set, and the expensive mistake is a
  // message meant for ten thousand students going to sixty officers, so this
  // never stays switched.
  recipient_type: 'students', // 'students' | 'officers'
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
  const [totalOfficers, setTotalOfficers] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

      setTotalOfficers(collegesData.reduce(
        (sum, college) => sum + parseInt(college.total_officers || 0, 10),
        0,
      ));
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
   * How many this reaches, for either audience, against the colleges currently
   * chosen. Taking the audience as an argument rather than reading form state
   * is what lets the confirmation dialog show both numbers at once -- "60
   * officers, or 10450 students" -- without a second copy of the arithmetic.
   *
   * Students keep the same three rules as before: every student when no college
   * is chosen, the chosen colleges' totals when no branch is, and the chosen
   * branches' counts otherwise.
   *
   * Officers have two, because branches do not apply to them.
   */
  const countFor = (recipientType) => {
    if (recipientType === 'officers') {
      if (formData.target_colleges.length === 0) {
        return totalOfficers;
      }
      return colleges
        .filter((c) => formData.target_colleges.includes(c.id))
        .reduce((sum, college) => sum + parseInt(college.total_officers || 0, 10), 0);
    }

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

  const otherRecipient = formData.recipient_type === 'officers' ? 'students' : 'officers';

  /*
   * Send is now two steps. This one only validates and opens the confirmation;
   * handleConfirmedSend is the one that posts.
   *
   * The dialog is not a courtesy. The audience is the single piece of state on
   * this page that leaves no trace once it is set -- the form looks the same
   * either way -- so it is the one thing worth reading back before a message
   * goes to ten thousand people.
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a notification message');
      return;
    }

    if (countFor(formData.recipient_type) === 0) {
      toast.error(formData.recipient_type === 'officers'
        ? 'No active placement officers at the selected colleges'
        : 'No students available for the selected criteria');
      return;
    }

    setConfirmOpen(true);
  };

  /*
   * Switching audience from inside the dialog.
   *
   * The whole point is that the message survives: this changes recipient_type
   * and nothing else, and the dialog stays open so the new count can be read
   * before sending. Branch narrowing is left in state rather than cleared, so
   * switching to officers and back does not lose it.
   */
  const handleSwitchRecipient = () => {
    setFormData((prev) => ({ ...prev, recipient_type: otherRecipient }));
  };

  const handleConfirmedSend = async () => {
    const targetCount = countFor(formData.recipient_type);
    const meta = recipientOf(formData.recipient_type);

    try {
      setSending(true);
      const submitData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        target_colleges: formData.target_colleges,
        // Sent regardless: the officer path on the server ignores them rather
        // than rejecting them, and this keeps one payload shape for both.
        target_branches: formData.target_branches,
        recipient_type: formData.recipient_type,
      };

      await superAdminAPI.sendNotification(submitData);

      const audience = describeAudience(targetCount, formData.recipient_type);
      toast.success(formData.priority === 'urgent'
        ? `Notification sent to ${audience}. Urgent emails are being sent.`
        : `Notification sent successfully to ${audience}.`);

      const newNotification = {
        id: Date.now(),
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipient_count: targetCount,
        audience: meta.label,
        target_colleges: formData.target_colleges.length > 0
          ? `${formData.target_colleges.length} college(s)`
          : 'All colleges',
        sent_at: new Date().toISOString(),
      };
      setRecentNotifications([newNotification, ...recentNotifications].slice(0, 10));

      // Back to students, even after sending to officers. See EMPTY_FORM.
      setFormData(EMPTY_FORM);
      setConfirmOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
      console.error('Send notification error:', error);
      // Dialog stays open on failure, so the audience is still in view and the
      // message is still there to retry with.
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
      targetCount={countFor(formData.recipient_type)}
      otherCount={countFor(otherRecipient)}
      recipientCounts={{ students: countFor('students'), officers: countFor('officers') }}
      onRecipientChange={(recipient_type) => setFormData((prev) => ({ ...prev, recipient_type }))}
      confirmOpen={confirmOpen}
      onConfirmSend={handleConfirmedSend}
      onSwitchRecipient={handleSwitchRecipient}
      onCancelSend={() => setConfirmOpen(false)}
      branchCount={branchCount}
      recentNotifications={recentNotifications}
    />
  );
}

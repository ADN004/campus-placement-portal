import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Send, Bell, Clock, Users, AlertCircle, Sparkles, Mail, Filter, CheckSquare, Square } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import FormPageSkeleton from '../../components/skeletons/FormPageSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';

export default function SendNotification() {
  const [branches, setBranches] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_branches: [], // Array of selected branches (empty means all)
    priority: 'normal', // 'normal', 'high', 'urgent'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch branches available in the college with student counts
      const branchesResponse = await placementOfficerAPI.getBranches();
      const branchesData = branchesResponse.data.data || [];
      setBranches(branchesData);

      // Calculate total students
      const total = branchesData.reduce((sum, branch) => sum + parseInt(branch.student_count || 0), 0);
      setTotalStudents(total);

      // Fetch recent notifications (mock data for now since API might not return this)
      // In real scenario, you'd have an API endpoint for this
      setRecentNotifications([]);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchToggle = (branchName) => {
    const newBranches = formData.target_branches.includes(branchName)
      ? formData.target_branches.filter((b) => b !== branchName)
      : [...formData.target_branches, branchName];
    setFormData({ ...formData, target_branches: newBranches });
  };

  const handleSelectAllBranches = () => {
    if (formData.target_branches.length === branches.length) {
      setFormData({ ...formData, target_branches: [] });
    } else {
      setFormData({ ...formData, target_branches: branches.map((b) => b.branch) });
    }
  };

  const getTargetStudentCount = () => {
    if (formData.target_branches.length === 0) {
      return totalStudents;
    }
    return branches
      .filter(b => formData.target_branches.includes(b.branch))
      .reduce((sum, branch) => sum + parseInt(branch.student_count || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
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
        target_branches: formData.target_branches, // Empty array means all branches
      };

      const response = await placementOfficerAPI.sendNotification(submitData);

      // Show success message with details
      const successMsg = formData.priority === 'urgent'
        ? `Notification sent to ${targetCount} student(s)! Urgent emails are being sent.`
        : `Notification sent successfully to ${targetCount} student(s)!`;
      toast.success(successMsg);

      // Add to recent notifications list (optimistic update)
      const newNotification = {
        id: Date.now(),
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipient_count: targetCount,
        target_branches: formData.target_branches.length > 0
          ? formData.target_branches.join(', ')
          : 'All branches',
        sent_at: new Date().toISOString(),
      };
      setRecentNotifications([newNotification, ...recentNotifications].slice(0, 10));

      // Reset form
      setFormData({
        title: '',
        message: '',
        target_branches: [],
        priority: 'normal',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
      console.error('Send notification error:', error);
    } finally {
      setSending(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center space-x-1 bg-red-100 text-red-800 text-sm font-bold px-3 py-1.5 rounded-lg">
            <AlertCircle size={14} />
            <span>Urgent</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 bg-orange-100 text-orange-800 text-sm font-bold px-3 py-1.5 rounded-lg">
            <AlertCircle size={14} />
            <span>High</span>
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1.5 rounded-lg">
            <Bell size={14} />
            <span>Normal</span>
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-3 py-1.5 rounded-lg">{priority}</span>;
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="text-red-600" size={20} />;
    }
    return <Bell className="text-blue-600" size={20} />;
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    return <FormPageSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <AnimatedSection delay={0}>
        <DashboardHeader
          icon={Mail}
          title="Send Notification"
          subtitle="Send important notifications and announcements to students in your college"
        />
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Form */}
        <AnimatedSection delay={0.1} className="lg:col-span-2">
          <GlassCard variant="elevated" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5">
                  <Send className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Compose Notification
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notification Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Important Placement Drive Announcement"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                    rows="6"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your notification message here..."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    {formData.message.length} characters
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="relative flex items-center justify-center p-4 cursor-pointer border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 border-gray-200 has-[:checked]:border-blue-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-blue-100 has-[:checked]:to-indigo-100">
                      <input
                        type="radio"
                        name="priority"
                        value="normal"
                        checked={formData.priority === 'normal'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-sm font-bold text-gray-900">Normal</span>
                    </label>
                    <label className="relative flex items-center justify-center p-4 cursor-pointer border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-br from-orange-50 to-yellow-50 border-gray-200 has-[:checked]:border-orange-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-orange-100 has-[:checked]:to-yellow-100">
                      <input
                        type="radio"
                        name="priority"
                        value="high"
                        checked={formData.priority === 'high'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-sm font-bold text-gray-900">High</span>
                    </label>
                    <label className="relative flex items-center justify-center p-4 cursor-pointer border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-br from-red-50 to-rose-50 border-gray-200 has-[:checked]:border-red-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-red-100 has-[:checked]:to-rose-100">
                      <input
                        type="radio"
                        name="priority"
                        value="urgent"
                        checked={formData.priority === 'urgent'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-sm font-bold text-gray-900">Urgent</span>
                    </label>
                  </div>
                </div>

                {/* Branch Selection */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Filter size={18} />
                        <span>Send To Branches</span>
                      </div>
                      <p className="text-xs text-gray-500 font-normal mt-1">
                        Leave empty to send to all students, or select specific branches
                      </p>
                    </label>
                    {branches.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        className="text-sm text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {formData.target_branches.length === branches.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  {branches.length === 0 ? (
                    <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-center">
                      <p className="text-sm text-gray-500 font-medium">
                        No branches available. Make sure you have approved students in your college.
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {branches.map((branch) => (
                          <label
                            key={branch.branch}
                            className="flex items-center space-x-3 p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100"
                          >
                            <div className="flex items-center justify-center">
                              {formData.target_branches.includes(branch.branch) ? (
                                <CheckSquare
                                  size={20}
                                  className="text-blue-600"
                                  onClick={() => handleBranchToggle(branch.branch)}
                                />
                              ) : (
                                <Square
                                  size={20}
                                  className="text-gray-400"
                                  onClick={() => handleBranchToggle(branch.branch)}
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                {branch.branch}
                              </p>
                              <p className="text-xs text-gray-500 font-medium">
                                {branch.student_count} student{parseInt(branch.student_count) !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display target count */}
                  <div className="mt-3 flex items-center justify-between">
                    {formData.target_branches.length > 0 ? (
                      <p className="text-sm text-gray-600 font-bold bg-blue-50 px-3 py-2 rounded-lg">
                        {formData.target_branches.length} branch(es) selected
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-bold bg-green-50 px-3 py-2 rounded-lg">
                        All branches selected
                      </p>
                    )}
                    <p className="text-sm text-gray-700 font-bold bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 rounded-lg border border-purple-200">
                      Will send to <span className="text-purple-600 text-lg">{getTargetStudentCount()}</span> student(s)
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-3 pt-6 border-t-2 border-gray-100">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    <Send size={20} />
                    <span>{sending ? 'Sending...' : 'Send Notification'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        title: '',
                        message: '',
                        target_branches: [],
                        priority: 'normal',
                      })
                    }
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>

                {/* Priority Warnings */}
                {formData.priority === 'urgent' && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-red-900 mb-1">Urgent Email + Popup Alert Enabled</p>
                        <p className="text-sm text-red-700">
                          This notification will be sent to students' email addresses AND show as a popup alert when they login.
                          Students will receive the message in their Gmail inbox and see an immediate alert.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {formData.priority === 'high' && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Bell className="text-orange-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-orange-900 mb-1">High Priority Popup Alert Enabled</p>
                        <p className="text-sm text-orange-700">
                          This notification will show as a popup alert when students login to the app.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </GlassCard>
          </AnimatedSection>

          {/* Recent Notifications Sidebar */}
          <AnimatedSection delay={0.2} className="lg:col-span-1 space-y-6">
            <GlassCard variant="elevated" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-2">
                  <Clock className="text-white" size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Recent Notifications</h2>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-sm text-gray-500 font-medium">No recent notifications</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Your sent notifications will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border-2 border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors bg-white"
                    >
                      <div className="flex items-start space-x-2 mb-2">
                        {getPriorityIcon(notification.priority)}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-medium">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        {getPriorityBadge(notification.priority)}
                        <div className="flex items-center space-x-1 text-xs text-gray-600 font-bold">
                          <Users size={14} />
                          <span>{notification.recipient_count}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {new Date(notification.sent_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard variant="elevated" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-2">
                  <Sparkles className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Quick Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                  <div className="flex items-center space-x-2">
                    <Users className="text-blue-600" size={20} />
                    <span className="text-sm text-gray-700 font-bold">Total Students</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{totalStudents}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100">
                  <div className="flex items-center space-x-2">
                    <Filter className="text-purple-600" size={20} />
                    <span className="text-sm text-gray-700 font-bold">Branches</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{branches.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
                  <div className="flex items-center space-x-2">
                    <Bell className="text-green-600" size={20} />
                    <span className="text-sm text-gray-700 font-bold">Notifications Sent</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {recentNotifications.length}
                  </span>
                </div>
              </div>
            </GlassCard>
          </AnimatedSection>
        </div>
      </div>
  );
}

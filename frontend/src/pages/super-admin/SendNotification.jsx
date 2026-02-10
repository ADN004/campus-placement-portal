import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Send, Bell, Users, Mail, Filter, CheckSquare, Square, Building2, Sparkles } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import FormPageSkeleton from '../../components/skeletons/FormPageSkeleton';

export default function SuperAdminSendNotification() {
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [sending, setSending] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_colleges: [], // Empty means all colleges
    target_branches: {}, // { college_id: [branches] }
    priority: 'normal', // 'normal', 'high', 'urgent'
  });

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

      const total = collegesData.reduce((sum, college) => sum + parseInt(college.total_students || 0), 0);
      setTotalStudents(total);

      setRecentNotifications([]);
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

    // Remove branches for unselected colleges
    const newBranches = { ...formData.target_branches };
    if (!newColleges.includes(collegeId)) {
      delete newBranches[collegeId];
    }

    setFormData({
      ...formData,
      target_colleges: newColleges,
      target_branches: newBranches
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
      newBranches[collegeId].push(branchName);
    }

    setFormData({ ...formData, target_branches: newBranches });
  };

  const handleSelectAllBranches = () => {
    const allBranchesSelected = Object.keys(formData.target_branches).length === formData.target_colleges.length &&
      Object.values(formData.target_branches).every(branches => branches.length > 0);

    if (allBranchesSelected) {
      setFormData({ ...formData, target_branches: {} });
    } else {
      const newBranches = {};
      branches.forEach(branch => {
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

  const getTargetStudentCount = () => {
    if (formData.target_colleges.length === 0) {
      return totalStudents;
    }

    if (Object.keys(formData.target_branches).length === 0) {
      return colleges
        .filter(c => formData.target_colleges.includes(c.id))
        .reduce((sum, college) => sum + parseInt(college.total_students || 0), 0);
    }

    let count = 0;
    branches.forEach(branch => {
      if (formData.target_branches[branch.college_id]?.includes(branch.branch)) {
        count += parseInt(branch.student_count || 0);
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

      setFormData({
        title: '',
        message: '',
        target_colleges: [],
        target_branches: {},
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
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  if (showSkeleton) return <FormPageSkeleton hasSidebar={true} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <AnimatedSection delay={0}>
        <DashboardHeader
          title="Send Notification"
          subtitle="Send important announcements to students across all colleges"
          icon={Send}
        />
      </AnimatedSection>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <AnimatedSection delay={0.08} className="lg:col-span-2">
            <GlassCard variant="elevated" className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Bell className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Compose Notification</h2>
                  <p className="text-sm text-gray-600 mt-1">Send important notifications to students</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notification Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Important Placement Drive Announcement"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                    maxLength={255}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your notification message here..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium min-h-[150px] resize-y"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    {formData.message.length}/2000 characters
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
                    <label className="relative flex items-center justify-center p-4 cursor-pointer border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-br from-red-50 to-pink-50 border-gray-200 has-[:checked]:border-red-500 has-[:checked]:bg-gradient-to-br has-[:checked]:from-red-100 has-[:checked]:to-pink-100">
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

                {/* College Selection */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Building2 size={18} />
                        <span>Select Colleges</span>
                      </div>
                      <p className="text-xs text-gray-500 font-normal mt-1">
                        Leave empty to send to all colleges
                      </p>
                    </label>
                    {colleges.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllColleges}
                        className="text-sm text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {formData.target_colleges.length === colleges.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  <div className="border-2 border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {colleges.map((college) => (
                        <label
                          key={college.id}
                          className="flex items-center space-x-3 p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100"
                        >
                          <div className="flex items-center justify-center">
                            {formData.target_colleges.includes(college.id) ? (
                              <CheckSquare size={20} className="text-blue-600" />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1" onClick={() => handleCollegeToggle(college.id)}>
                            <p className="text-sm font-bold text-gray-900">{college.college_name}</p>
                            <p className="text-xs text-gray-500 font-medium">
                              {college.total_students} student{parseInt(college.total_students) !== 1 ? 's' : ''} • {college.branch_count} branch{parseInt(college.branch_count) !== 1 ? 'es' : ''}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    {formData.target_colleges.length > 0 ? (
                      <p className="text-sm text-gray-600 font-bold bg-blue-50 px-3 py-2 rounded-lg inline-block">
                        {formData.target_colleges.length} college(s) selected
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 font-bold bg-green-50 px-3 py-2 rounded-lg inline-block">
                        All colleges selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Branch Selection */}
                {formData.target_colleges.length > 0 && branches.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-bold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Filter size={18} />
                          <span>Select Branches (Optional)</span>
                        </div>
                        <p className="text-xs text-gray-500 font-normal mt-1">
                          Leave empty to send to all branches in selected colleges
                        </p>
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        className="text-sm text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {Object.keys(formData.target_branches).length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="border-2 border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                      {formData.target_colleges.map(collegeId => {
                        const collegeBranches = branches.filter(b => b.college_id === collegeId);
                        if (collegeBranches.length === 0) return null;

                        return (
                          <div key={collegeId} className="mb-4 last:mb-0">
                            <h4 className="text-sm font-bold text-gray-700 mb-2 px-2">
                              {collegeBranches[0].college_name}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {collegeBranches.map((branch) => (
                                <label
                                  key={`${branch.college_id}-${branch.branch}`}
                                  className="flex items-center space-x-3 p-3 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-gray-100"
                                >
                                  <div className="flex items-center justify-center">
                                    {formData.target_branches[branch.college_id]?.includes(branch.branch) ? (
                                      <CheckSquare size={20} className="text-blue-600" />
                                    ) : (
                                      <Square size={20} className="text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1" onClick={() => handleBranchToggle(branch.college_id, branch.branch)}>
                                    <p className="text-sm font-bold text-gray-900">{branch.branch}</p>
                                    <p className="text-xs text-gray-500 font-medium">
                                      {branch.student_count} student{parseInt(branch.student_count) !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      {Object.keys(formData.target_branches).length > 0 ? (
                        <p className="text-sm text-gray-600 font-bold bg-blue-50 px-3 py-2 rounded-lg inline-block">
                          Specific branches selected
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 font-bold bg-green-50 px-3 py-2 rounded-lg inline-block">
                          All branches in selected colleges
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Target Count Display */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <p className="text-center text-gray-700 font-bold">
                    Will send to <span className="text-purple-600 text-2xl">{getTargetStudentCount()}</span> student(s)
                  </p>
                </div>

                {/* Submit Buttons */}
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
                        target_colleges: [],
                        target_branches: {},
                        priority: 'normal',
                      })
                    }
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>

                {/* Urgent/High Priority Warnings */}
                {formData.priority === 'urgent' && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-red-900 mb-1">Urgent Email + Popup Alert Enabled</p>
                        <p className="text-sm text-red-700">
                          This notification will be sent to students' email addresses AND show as a popup alert in the app.
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

          {/* Sidebar */}
          <AnimatedSection delay={0.16} className="space-y-6">
            <GlassCard variant="elevated" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
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
                    <Building2 className="text-purple-600" size={20} />
                    <span className="text-sm text-gray-700 font-bold">Colleges</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{colleges.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
                  <div className="flex items-center space-x-2">
                    <Bell className="text-green-600" size={20} />
                    <span className="text-sm text-gray-700 font-bold">Notifications Sent</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{recentNotifications.length}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="elevated" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="text-gray-700" size={20} />
                <h3 className="text-lg font-bold text-gray-900">Priority Levels</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-bold text-blue-900 text-sm">Normal</p>
                  <p className="text-xs text-blue-700 mt-1">In-app notification only</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="font-bold text-orange-900 text-sm">High</p>
                  <p className="text-xs text-orange-700 mt-1">In-app + popup alert</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-bold text-red-900 text-sm">Urgent</p>
                  <p className="text-xs text-red-700 mt-1">In-app + popup + email</p>
                </div>
              </div>
            </GlassCard>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}

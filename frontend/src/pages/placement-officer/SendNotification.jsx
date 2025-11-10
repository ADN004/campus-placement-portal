import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Send, Bell, Clock, Users, AlertCircle } from 'lucide-react';

export default function SendNotification() {
  const [students, setStudents] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'all', // 'all' or 'specific'
    target_students: [],
    priority: 'normal', // 'normal', 'high', 'urgent'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch approved students for selection
      const studentsResponse = await placementOfficerAPI.getStudents({
        status: 'approved',
      });
      const studentsData = studentsResponse.data.data || [];
      setStudents(studentsData.filter((s) => !s.is_blacklisted));

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

  const handleStudentToggle = (studentId) => {
    const newStudents = formData.target_students.includes(studentId)
      ? formData.target_students.filter((id) => id !== studentId)
      : [...formData.target_students, studentId];
    setFormData({ ...formData, target_students: newStudents });
  };

  const handleSelectAll = () => {
    if (formData.target_students.length === students.length) {
      setFormData({ ...formData, target_students: [] });
    } else {
      setFormData({ ...formData, target_students: students.map((s) => s.id) });
    }
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

    if (formData.target_type === 'specific' && formData.target_students.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setSending(true);
      const submitData = {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        target_type: formData.target_type,
        target_students:
          formData.target_type === 'specific' ? formData.target_students : [],
      };

      await placementOfficerAPI.sendNotification(submitData);
      toast.success('Notification sent successfully!');

      // Add to recent notifications list (optimistic update)
      const newNotification = {
        id: Date.now(),
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        recipient_count:
          formData.target_type === 'all' ? students.length : formData.target_students.length,
        sent_at: new Date().toISOString(),
      };
      setRecentNotifications([newNotification, ...recentNotifications].slice(0, 10));

      // Reset form
      setFormData({
        title: '',
        message: '',
        target_type: 'all',
        target_students: [],
        priority: 'normal',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="badge bg-red-600 text-white">Urgent</span>;
      case 'high':
        return <span className="badge bg-orange-500 text-white">High</span>;
      case 'normal':
        return <span className="badge badge-info">Normal</span>;
      default:
        return <span className="badge badge-info">{priority}</span>;
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="text-red-600" size={20} />;
    }
    return <Bell className="text-blue-600" size={20} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-gray-600 mt-2">
          Send important notifications and announcements to students in your college
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="label">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Important Placement Drive Announcement"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="label">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input"
                  rows="6"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter your notification message here..."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.message.length} characters
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="label">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={formData.priority === 'normal'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Normal</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={formData.priority === 'high'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">High</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={formData.priority === 'urgent'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Urgent</span>
                  </label>
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label className="label">
                  Send To <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="target_type"
                      value="all"
                      checked={formData.target_type === 'all'}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">All Students ({students.length})</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="target_type"
                      value="specific"
                      checked={formData.target_type === 'specific'}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Specific Students</span>
                  </label>
                </div>
              </div>

              {/* Student Selection */}
              {formData.target_type === 'specific' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label mb-0">
                      Select Students <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {formData.target_students.length === students.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {students.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No approved students available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {students.map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.target_students.includes(student.id)}
                              onChange={() => handleStudentToggle(student.id)}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {student.prn}
                              </p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.target_students.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {formData.target_students.length} student(s) selected
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={sending}
                  className="btn btn-primary flex items-center space-x-2 flex-1"
                >
                  <Send size={18} />
                  <span>{sending ? 'Sending...' : 'Send Notification'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      title: '',
                      message: '',
                      target_type: 'all',
                      target_students: [],
                      priority: 'normal',
                    })
                  }
                  className="btn btn-secondary"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recent Notifications Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="text-gray-600" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Recent Notifications</h2>
            </div>

            {recentNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-sm text-gray-500">No recent notifications</p>
                <p className="text-xs text-gray-400 mt-1">
                  Your sent notifications will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      {getPriorityIcon(notification.priority)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {getPriorityBadge(notification.priority)}
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Users size={12} />
                        <span>{notification.recipient_count}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.sent_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="text-blue-600" size={18} />
                  <span className="text-sm text-gray-700">Total Students</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{students.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bell className="text-green-600" size={18} />
                  <span className="text-sm text-gray-700">Notifications Sent</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {recentNotifications.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

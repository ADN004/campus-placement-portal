import { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Bell,
  BellOff,
  Check,
  AlertCircle,
  Filter,
  Clock,
  User,
  Inbox,
} from 'lucide-react';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getNotifications();
      const notificationsData = response.data.data || [];
      setNotifications(notificationsData);
      calculateUnreadCount(notificationsData);
    } catch (error) {
      toast.error('Failed to load notifications');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUnreadCount = (notificationsData) => {
    const unread = notificationsData.filter((n) => !n.is_read).length;
    setUnreadCount(unread);
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.is_read);
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await studentAPI.markNotificationRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      calculateUnreadCount(
        notifications.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);

    if (unreadNotifications.length === 0) {
      toast.error('No unread notifications');
      return;
    }

    try {
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map((n) => studentAPI.markNotificationRead(n.id))
      );

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', error);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">
              Stay updated with announcements from your placement officers
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Check size={18} />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Stats */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{notifications.length}</p>
            </div>
            <Bell className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Unread</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{unreadCount}</p>
            </div>
            <BellOff className="text-orange-600" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Read</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {notifications.length - unreadCount}
              </p>
            </div>
            <Check className="text-green-600" size={24} />
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="card">
          <label className="label text-xs mb-1">Filter</label>
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input pl-10 py-2"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Inbox className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Notifications</h3>
              <p className="text-gray-500">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                  ? 'No read notifications yet.'
                  : 'No notifications yet. Check back later for updates from your placement officers.'}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card hover:shadow-lg transition-all ${
                !notification.is_read ? 'border-l-4 border-l-primary-600 bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getPriorityIcon(notification.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`text-lg font-semibold ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPriorityBadge(notification.priority)}
                    </div>
                  </div>

                  <p
                    className={`text-gray-700 whitespace-pre-wrap mb-3 ${
                      !notification.is_read ? 'font-medium' : ''
                    }`}
                  >
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User size={14} />
                        <span>{notification.sender_name || 'Placement Officer'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{formatDate(notification.sent_at || notification.created_at)}</span>
                      </div>
                    </div>

                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                      >
                        <Check size={16} />
                        <span>Mark as Read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results Summary */}
      {filteredNotifications.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredNotifications.length} of {notifications.length} notifications
          {filter !== 'all' && ` (${filter})`}
        </div>
      )}
    </div>
  );
}

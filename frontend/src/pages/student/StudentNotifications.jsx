import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import { Bell, Eye, Trash2, CheckCheck, Filter, Search, ArrowRight, Calendar, User, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassButton from '../../components/GlassButton';
import GradientOrb from '../../components/GradientOrb';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [searchQuery, readFilter, notifications]);

  const fetchNotifications = async () => {
    try {
      const response = await studentAPI.getNotifications();
      const notificationsData = response.data.data || [];
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.is_read).length);
      setError(null);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError({
        title: 'Failed to Load Notifications',
        message: 'Unable to fetch notifications. Please try again later.',
        type: 'error'
      });
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (readFilter === 'unread') {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (readFilter === 'read') {
      filtered = filtered.filter((n) => n.is_read);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await studentAPI.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setShowDetailView(true);

    // Mark as read if not already read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setSelectedNotification(null);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      toast.error('No unread notifications');
      return;
    }
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(
        unreadNotifications.map((n) => studentAPI.markNotificationRead(n.id))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      // Since deleteNotification API might not exist, we'll just filter it out locally
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div>
        <GradientOrb color="blue" position="top-right" />
        <GradientOrb color="indigo" position="bottom-left" delay="2s" />
        <GradientOrb color="purple" position="center" delay="4s" />

        <div className="mb-8">
          <DashboardHeader
            icon={Bell}
            title="Notifications"
            subtitle="Stay updated with important announcements and updates"
          />
        </div>

        <GlassCard className="p-16 text-center">
          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 inline-block mb-6">
            <Bell className="text-white" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{error.title}</h3>
          <p className="text-gray-600 text-lg mb-6">{error.message}</p>
          <GlassButton
            variant="primary"
            onClick={fetchNotifications}
            className="inline-flex items-center space-x-2"
          >
            <span>Try Again</span>
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <GradientOrb color="blue" position="top-right" />
      <GradientOrb color="indigo" position="bottom-left" delay="2s" />
      <GradientOrb color="purple" position="center" delay="4s" />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <DashboardHeader
          icon={Bell}
          title="Notifications"
          subtitle="Stay updated with important announcements and updates"
          />
        {unreadCount > 0 && (
          <GlassButton
            variant="primary"
            onClick={handleMarkAllAsRead}
            className="flex items-center space-x-2"
          >
            <CheckCheck size={20} />
            <span>Mark All as Read ({unreadCount})</span>
          </GlassButton>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-5">
        {/* Read Status Filters */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2">
                <Filter size={20} className="text-white" />
              </div>
              <span className="font-bold text-gray-800">Filter by:</span>
            </div>
            <button
              onClick={() => setReadFilter('all')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                readFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              All Notifications
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${readFilter === 'all' ? 'bg-white/20' : 'bg-blue-100 text-blue-800'}`}>
                {notifications.length}
              </span>
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                readFilter === 'unread'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Unread
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${readFilter === 'unread' ? 'bg-white/20' : 'bg-orange-100 text-orange-800'}`}>
                {unreadCount}
              </span>
            </button>
            <button
              onClick={() => setReadFilter('read')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 ${
                readFilter === 'read'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              }`}
            >
              Read
              <span className={`ml-2 px-2.5 py-0.5 text-xs rounded-full ${readFilter === 'read' ? 'bg-white/20' : 'bg-green-100 text-green-800'}`}>
                {notifications.length - unreadCount}
              </span>
            </button>
          </div>
        </GlassCard>

        {/* Search Bar */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2">
              <Search className="text-white" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-transparent border-none outline-none focus:ring-0 font-medium text-lg"
            />
          </div>
        </GlassCard>
      </div>

      {/* Notifications List or Detail View */}
      {showDetailView && selectedNotification ? (
        <NotificationDetailView
          notification={selectedNotification}
          onClose={handleCloseDetailView}
          onDelete={handleDelete}
          formatDate={formatDate}
        />
      ) : filteredNotifications.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 inline-block mb-6">
            <Bell className="text-white" size={64} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {notifications.length === 0 ? 'No Notifications Yet' : 'No notifications found'}
          </h3>
          <p className="text-gray-600 text-lg">
            {notifications.length === 0
              ? "You're all caught up! Check back later for new updates."
              : 'Try adjusting your search or filter criteria'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onView={handleViewNotification}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({ notification, onMarkAsRead, onDelete, onView, formatDate }) {
  return (
    <GlassCard
      className={`p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
        !notification.is_read ? 'border-l-4 border-blue-500' : ''
      }`}
      onClick={() => onView(notification)}
    >
      <div className="flex items-start justify-between space-x-4">
        <div className="flex-1">
          <div className="flex items-start space-x-4 mb-3">
            <div className={`rounded-xl p-3 ${
              !notification.is_read
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : 'bg-gray-300'
            }`}>
              <Bell className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className={`font-bold text-xl ${
                  !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {notification.title}
                </h3>
                {!notification.is_read && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full border-2 border-blue-200">
                    New
                  </span>
                )}
              </div>
              <p className={`mb-3 leading-relaxed line-clamp-2 ${
                !notification.is_read ? 'text-gray-700 font-medium' : 'text-gray-500'
              }`}>
                {notification.message}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-500 font-semibold">{formatDate(notification.created_at)}</span>
                {notification.sender_name && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-blue-600 font-bold">From: {notification.sender_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onDelete(notification.id)}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// Notification Detail View Component
function NotificationDetailView({ notification, onClose, onDelete, formatDate }) {
  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2 transition-all transform hover:scale-110 active:scale-95"
            >
              <ArrowRight className="rotate-180" size={24} />
            </button>
            <div className="bg-white rounded-xl p-3">
              <Bell className="text-blue-600" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white">Notification Details</h2>
          </div>
          <button
            onClick={() => {
              onDelete(notification.id);
              onClose();
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Metadata */}
        <div className="mb-8 flex flex-wrap items-center gap-4 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-400" size={20} />
            <span className="text-gray-600 font-semibold">
              {formatDate(notification.created_at)}
            </span>
          </div>
          {notification.sender_name && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center space-x-2">
                <User className="text-gray-400" size={20} />
                <span className="text-gray-600 font-semibold">
                  From: <span className="text-blue-600 font-bold">{notification.sender_name}</span>
                </span>
              </div>
            </>
          )}
          {notification.is_read && (
            <>
              <span className="text-gray-300">•</span>
              <span className="bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-xl border-2 border-green-200 flex items-center space-x-1.5">
                <CheckCircle size={16} />
                <span>Read</span>
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
          {notification.title}
        </h1>

        {/* Message */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border-2 border-gray-200">
          <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap font-medium">
            {notification.message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Back to Notifications
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

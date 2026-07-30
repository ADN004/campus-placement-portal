import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useDeviceType from '../../hooks/useDeviceType';
import DesktopStudentNotifications, {
  DesktopNotificationsSkeleton,
} from './notifications/DesktopStudentNotifications';
import TabletStudentNotifications, {
  TabletNotificationsSkeleton,
} from './notifications/TabletStudentNotifications';
import MobileStudentNotifications, {
  MobileNotificationsSkeleton,
} from './notifications/MobileStudentNotifications';

/**
 * StudentNotifications — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions.
 */
export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [searchQuery, readFilter, notifications]);

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
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Deleting from the reading view also closes it, matching the previous
  // detail view's button, which called delete then close.
  const handleDeleteFromDetail = async (notificationId) => {
    await handleDelete(notificationId);
    handleCloseDetailView();
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

  // Named for passing to the presenters — same call as the inline handler.
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileNotificationsSkeleton />;
    if (deviceType === 'tablet') return <TabletNotificationsSkeleton />;
    return <DesktopNotificationsSkeleton />;
  }

  const filters = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read', label: 'Read', count: notifications.length - unreadCount },
  ];

  // Identical props for all three presenters — same values, same functions.
  const presenterProps = {
    error,
    notifications,
    filteredNotifications,
    filters,
    readFilter,
    searchQuery,
    unreadCount,
    showDetailView,
    selectedNotification,
    onSearchChange: handleSearchChange,
    onFilterChange: setReadFilter,
    onView: handleViewNotification,
    onCloseDetail: handleCloseDetailView,
    onDelete: handleDelete,
    onDeleteFromDetail: handleDeleteFromDetail,
    onMarkAll: handleMarkAllAsRead,
    onRetry: fetchNotifications,
    formatDate,
  };

  if (deviceType === 'mobile') return <MobileStudentNotifications {...presenterProps} />;
  if (deviceType === 'tablet') return <TabletStudentNotifications {...presenterProps} />;
  return <DesktopStudentNotifications {...presenterProps} />;
}

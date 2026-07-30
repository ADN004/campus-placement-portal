import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState } from '../../../components/student/StudentUI';
import {
  NotificationCard,
  NotificationDetail,
  NotificationPlaceholder,
  MarkAllButton,
} from './notificationsShared';

/**
 * Desktop (`lg` and up) presenter — list beside a reading pane.
 *
 * The width is here, so there is no reason to throw the list away to read one
 * message: selecting a notification fills the pane on the right while the list
 * stays put, and moving between messages is a single click. The pane sticks so
 * a long message scrolls against a fixed list.
 *
 * Same interactions as before — clicking still opens and still marks as read,
 * deleting from the pane still clears it.
 */
export default function DesktopStudentNotifications({
  error,
  notifications,
  filteredNotifications,
  filters,
  readFilter,
  searchQuery,
  unreadCount,
  showDetailView,
  selectedNotification,
  onSearchChange,
  onFilterChange,
  onView,
  onDelete,
  onDeleteFromDetail,
  onMarkAll,
  onRetry,
  formatDate,
}) {
  if (error) {
    return (
      <div>
        <Header />
        <ErrorState icon={Bell} error={error} />
        <div className="mt-4 flex justify-center">
          <button
            onClick={onRetry}
            className="min-h-[48px] px-6 rounded-spc-sm bg-spc-teal text-spc-on-teal
              text-spc-sm font-bold hover:opacity-95 transition-opacity"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasNone = notifications.length === 0;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <Header count={filteredNotifications.length} total={notifications.length} />
        <MarkAllButton unreadCount={unreadCount} onMarkAll={onMarkAll} />
      </div>

      {!hasNone && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex items-center gap-3 flex-wrap mb-6"
        >
          <div className="w-full xl:w-[320px] xl:flex-shrink-0">
            <SearchField
              placeholder="Search notifications…"
              value={searchQuery}
              onChange={onSearchChange}
              size="lg"
            />
          </div>
          <FilterChips
            filters={filters}
            active={readFilter}
            onChange={onFilterChange}
            label="Filter notifications"
          />
        </motion.div>
      )}

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={hasNone ? 'No notifications yet' : 'No notifications found'}
          message={
            hasNone
              ? "You're all caught up. Check back later for new updates."
              : 'Try adjusting your search or filter.'
          }
        />
      ) : (
        <div className="grid grid-cols-12 gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="col-span-5 space-y-3"
          >
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onView={onView}
                onDelete={onDelete}
                formatDate={formatDate}
                size="md"
                active={showDetailView && selectedNotification?.id === notification.id}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-7 sticky top-24"
          >
            {showDetailView && selectedNotification ? (
              <NotificationDetail
                notification={selectedNotification}
                onDelete={onDeleteFromDetail}
                formatDate={formatDate}
              />
            ) : (
              <NotificationPlaceholder />
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Header({ count, total }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-w-0"
    >
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Notifications</h1>
      <p className="text-spc-body text-spc-muted mt-2">
        {total === undefined
          ? 'Stay updated with announcements from your placement officer'
          : count === total
          ? `${total} ${total === 1 ? 'message' : 'messages'}`
          : `Showing ${count} of ${total} messages`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the desktop split view. */
export function DesktopNotificationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="h-11 w-80 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
          <div className="h-4 w-72 bg-spc-surface-2 rounded animate-pulse" />
        </div>
        <div className="h-11 w-48 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="h-12 w-full xl:w-[320px] bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
              <div className="h-5 w-48 bg-spc-surface-2 rounded animate-pulse mb-3" />
              <div className="h-3.5 w-full bg-spc-surface-2 rounded animate-pulse mb-2" />
              <div className="h-3.5 w-4/5 bg-spc-surface-2 rounded animate-pulse mb-3" />
              <div className="h-3 w-28 bg-spc-surface-2 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="col-span-7 rounded-spc border border-spc-line bg-spc-surface p-6">
          <div className="h-3 w-40 bg-spc-surface-2 rounded animate-pulse mb-5" />
          <div className="h-8 w-3/4 bg-spc-surface-2 rounded animate-pulse mb-6" />
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-spc-surface-2 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

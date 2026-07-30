import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState } from '../../../components/student/StudentUI';
import { NotificationCard, NotificationDetail, MarkAllButton } from './notificationsShared';

/**
 * Tablet (`md` up to below `lg`) presenter.
 *
 * Still a single column — a notification is a paragraph of prose, and prose in
 * two narrow columns is harder to read, not easier. The extra width goes into
 * longer previews and a header that puts the title and "mark all as read" on
 * one line instead of stacking them. Opening one replaces the list, as on phone.
 */
export default function TabletStudentNotifications({
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
  onCloseDetail,
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

  if (showDetailView && selectedNotification) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <NotificationDetail
          notification={selectedNotification}
          onBack={onCloseDetail}
          onDelete={onDeleteFromDetail}
          formatDate={formatDate}
        />
      </motion.div>
    );
  }

  const hasNone = notifications.length === 0;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5">
        <Header count={filteredNotifications.length} total={notifications.length} />
        <MarkAllButton unreadCount={unreadCount} onMarkAll={onMarkAll} />
      </div>

      {!hasNone && (
        <div className="sticky top-16 z-10 -mx-6 px-6 pt-2 pb-4 bg-spc-ground space-y-3">
          <SearchField
            placeholder="Search notifications…"
            value={searchQuery}
            onChange={onSearchChange}
            size="lg"
          />
          <FilterChips
            filters={filters}
            active={readFilter}
            onChange={onFilterChange}
            label="Filter notifications"
          />
        </div>
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
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: Math.min(index, 8) * 0.04 }}
            >
              <NotificationCard
                notification={notification}
                onView={onView}
                onDelete={onDelete}
                formatDate={formatDate}
                size="md"
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ count, total }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="min-w-0"
    >
      <h1 className="text-spc-display-lg font-extrabold text-spc-ink">Notifications</h1>
      <p className="text-spc-body text-spc-muted mt-1.5">
        {total === undefined
          ? 'Stay updated with announcements from your placement officer'
          : count === total
          ? `${total} ${total === 1 ? 'message' : 'messages'}`
          : `Showing ${count} of ${total} messages`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the tablet notifications list. */
export function TabletNotificationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="h-10 w-72 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
          <div className="h-4 w-56 bg-spc-surface-2 rounded animate-pulse" />
        </div>
        <div className="h-11 w-48 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
      </div>
      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="flex gap-2 mb-6 flex-wrap">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-11 w-32 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-5">
            <div className="h-5 w-56 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="h-3.5 w-full bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3.5 w-5/6 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="h-3 w-32 bg-spc-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

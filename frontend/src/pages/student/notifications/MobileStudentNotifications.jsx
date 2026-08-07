import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { SearchField, FilterChips, EmptyState, ErrorState, ShowMore } from '../../../components/student/StudentUI';
import { NotificationCard, NotificationDetail, MarkAllButton } from './notificationsShared';

/**
 * Mobile (below `md`) presenter — one column. Opening a notification replaces
 * the list with the full text, exactly as before: on a phone there is no room
 * to show both, and a full-width reading view is the right shape for a message.
 */
export default function MobileStudentNotifications({
  error,
  notifications,
  filteredNotifications,

  visibleNotifications,

  hasMore,

  remaining,

  onShowMore,
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

  // Reading view takes over the screen — the list is one tap away.
  if (showDetailView && selectedNotification) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
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
      <Header count={filteredNotifications.length} total={notifications.length} />

      {unreadCount > 0 && (
        <div className="mb-3">
          <MarkAllButton unreadCount={unreadCount} onMarkAll={onMarkAll} full />
        </div>
      )}

      {!hasNone && (
        <div className="sticky top-16 z-10 -mx-4 px-4 pt-2 pb-3 bg-spc-ground space-y-2.5">
          <SearchField
            placeholder="Search notifications…"
            value={searchQuery}
            onChange={onSearchChange}
          />
          <FilterChips
            filters={filters}
            active={readFilter}
            onChange={onFilterChange}
            label="Filter notifications"
            compact
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
          {visibleNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 6) * 0.04 }}
            >
              <NotificationCard
                notification={notification}
                onView={onView}
                onDelete={onDelete}
                formatDate={formatDate}
                size="sm"
              />
            </motion.div>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-5">
          <ShowMore onClick={onShowMore} remaining={remaining} noun="notification" />
        </div>
      )}
    </div>
  );
}

function Header({ count, total }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="mb-3"
    >
      <h1 className="text-spc-display font-extrabold text-spc-ink">Notifications</h1>
      <p className="text-spc-sm text-spc-muted mt-1">
        {total === undefined
          ? 'Announcements and updates'
          : count === total
          ? `${total} ${total === 1 ? 'message' : 'messages'}`
          : `${count} of ${total} shown`}
      </p>
    </motion.header>
  );
}

/** Loading skeleton shaped like the mobile notifications list. */
export function MobileNotificationsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-8 w-52 bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2" />
      <div className="h-4 w-36 bg-spc-surface-2 rounded animate-pulse mb-4" />
      <div className="h-11 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-3" />
      <div className="h-12 w-full bg-spc-surface-2 rounded-spc-sm animate-pulse mb-2.5" />
      <div className="flex gap-2 mb-5 flex-wrap">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-11 w-28 bg-spc-surface-2 rounded-spc-sm animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-spc border border-spc-line bg-spc-surface p-4">
            <div className="h-5 w-48 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="h-3.5 w-full bg-spc-surface-2 rounded animate-pulse mb-2" />
            <div className="h-3.5 w-3/4 bg-spc-surface-2 rounded animate-pulse mb-3" />
            <div className="h-3 w-28 bg-spc-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

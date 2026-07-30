import { ArrowLeft, Trash2, CheckCircle, Bell } from 'lucide-react';

/**
 * Pieces shared by the three StudentNotifications presenters.
 *
 * All presentation. Filtering, read/delete handling and the relative-date
 * formatter live in the StudentNotifications container.
 */

/* ------------------------------------------------------------------- card */

/**
 * One notification in the list. The whole card is the button that opens it —
 * same as before — with Delete lifted out so it can't trigger that.
 *
 * `size` only changes density: `sm` clamps the preview to two lines for phones,
 * `md` and `lg` allow three.
 */
export function NotificationCard({ notification, onView, onDelete, formatDate, size = 'sm', active = false }) {
  const unread = !notification.is_read;
  const pad = size === 'sm' ? 'p-4' : 'p-5';
  const clamp = size === 'sm' ? 'line-clamp-2' : 'line-clamp-3';

  return (
    <div
      className={`relative rounded-spc border transition-colors ${pad}
        ${active
          ? 'bg-spc-teal-soft border-spc-teal'
          : 'bg-spc-surface border-spc-line hover:border-spc-line-strong'}`}
    >
      {/* Unread marker — a teal rail rather than a coloured card, so the text
          contrast is identical whether read or unread. */}
      {unread && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-spc-teal"
        />
      )}

      <button
        type="button"
        onClick={() => onView(notification)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            className={`text-spc-h3 leading-tight break-words ${
              unread ? 'font-extrabold text-spc-ink' : 'font-bold text-spc-body'
            }`}
          >
            {notification.title}
          </h3>
          {unread && (
            <span className="flex-shrink-0 inline-flex items-center rounded-spc-sm bg-spc-teal text-spc-on-teal text-xs font-bold px-2 py-0.5">
              New
            </span>
          )}
        </div>

        <p className={`text-spc-xs text-spc-muted mt-1.5 leading-relaxed ${clamp}`}>
          {notification.message}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 text-xs text-spc-muted font-semibold">
          <span>{formatDate(notification.created_at)}</span>
          {notification.sender_name && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-spc-teal">{notification.sender_name}</span>
            </>
          )}
        </div>
      </button>

      <div className="flex justify-end mt-3 pt-3 border-t border-spc-line">
        <button
          type="button"
          onClick={() => onDelete(notification.id)}
          aria-label={`Delete notification: ${notification.title}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-spc-sm
            text-spc-xs font-bold text-spc-muted
            hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- detail */

/**
 * Full notification. `onBack` is omitted on desktop, where the list stays
 * beside this panel and there is nothing to go back to.
 */
export function NotificationDetail({ notification, onBack, onDelete, formatDate }) {
  return (
    <article className="rounded-spc bg-spc-surface border border-spc-line overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-spc-line">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-spc-sm
              text-spc-xs font-bold text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
          >
            <ArrowLeft size={17} />
            <span>All notifications</span>
          </button>
        ) : (
          <span className="text-spc-label font-bold uppercase text-spc-muted">Notification</span>
        )}

        <button
          type="button"
          onClick={() => onDelete(notification.id)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-spc-sm
            text-spc-xs font-bold text-spc-muted
            hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </header>

      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs font-semibold text-spc-muted">
          <span>{formatDate(notification.created_at)}</span>
          {notification.sender_name && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-spc-teal">From {notification.sender_name}</span>
            </>
          )}
          {notification.is_read && (
            <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-ok-bg text-spc-ok px-2 py-0.5">
              <CheckCircle size={12} />
              <span>Read</span>
            </span>
          )}
        </div>

        <h1 className="text-spc-h1-lg font-extrabold text-spc-ink mt-3 leading-tight break-words">
          {notification.title}
        </h1>

        <p className="text-spc-body text-spc-body mt-4 leading-relaxed whitespace-pre-wrap break-words">
          {notification.message}
        </p>
      </div>
    </article>
  );
}

/** Shown in the desktop reading pane when nothing is selected yet. */
export function NotificationPlaceholder() {
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line border-dashed px-6 py-20 text-center">
      <span className="w-12 h-12 rounded-spc-sm bg-spc-surface-2 inline-flex items-center justify-center mb-4">
        <Bell className="text-spc-muted" size={22} />
      </span>
      <p className="text-spc-h3 font-bold text-spc-ink">Select a notification</p>
      <p className="text-spc-xs text-spc-muted mt-1.5">
        Choose one from the list to read it here.
      </p>
    </div>
  );
}

/** "Mark all as read", shown only when something is unread. */
export function MarkAllButton({ unreadCount, onMarkAll, full = false }) {
  if (unreadCount === 0) return null;
  return (
    <button
      type="button"
      onClick={onMarkAll}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-spc-sm
        bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-xs font-bold
        hover:bg-spc-surface-2 transition-colors ${full ? 'w-full' : ''}`}
    >
      <CheckCircle size={16} />
      <span>Mark all as read ({unreadCount})</span>
    </button>
  );
}

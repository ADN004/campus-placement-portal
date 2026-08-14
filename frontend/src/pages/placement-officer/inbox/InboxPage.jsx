import { Inbox, Check, CheckCheck } from 'lucide-react';
import {
  PageHeading, Panel, SecondaryButton, EmptyState,
} from '../../../components/officer/OfficerUI';

/**
 * The officer's inbox.
 *
 * Officers could send notifications but never receive them, so anything the
 * system needed to tell them — most of all that another college had put their
 * college on a job posting — had nowhere to go. This is that missing half.
 *
 * Read state is the whole interface. There is no archiving and no deleting: a
 * notice that a job exists is worth exactly as much as the job, and an officer
 * who deleted one would have no way to find out what they had been told. Unread
 * items are marked in the margin rather than by colouring the whole row, so a
 * long list still reads as one list.
 */

/** How long ago, in the words a person would use. */
function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Row({ notification, onMarkRead, compact }) {
  const unread = !notification.is_read;
  return (
    <li
      className={`px-4 py-3 border-b border-spc-line last:border-b-0 flex gap-3 items-start
        ${unread ? 'bg-spc-selected' : ''}`}
    >
      {/*
        A dot rather than a badge or a bold row. The list is scanned down its
        left edge, and an officer with two unread items among forty should be
        able to find them without reading any of the text.
      */}
      <span
        className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0
          ${unread ? 'bg-spc-accent' : 'bg-transparent'}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-spc-sm break-words ${unread ? 'font-bold text-spc-ink' : 'font-semibold text-spc-body'}`}>
          {notification.title}
        </p>
        <p className="text-spc-xs text-spc-body mt-1 leading-relaxed break-words">
          {notification.message}
        </p>
        <p className="text-xs text-spc-muted mt-1.5 tabular-nums">
          {relativeTime(notification.created_at)}
          {unread ? '' : ' · read'}
        </p>
      </div>
      {unread && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="flex-shrink-0 text-xs font-bold text-spc-accent hover:underline
            flex items-center gap-1 mt-0.5"
        >
          <Check size={13} aria-hidden="true" />
          {compact ? '' : <span>Mark read</span>}
        </button>
      )}
    </li>
  );
}

export default function InboxPage({
  layout,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  markingAll,
}) {
  const compact = layout === 'mobile';

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Placement Officer"
        title="Inbox"
        subline={
          unreadCount > 0
            ? `${unreadCount} unread of ${notifications.length}`
            : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`
        }
      >
        {unreadCount > 0 && (
          <SecondaryButton onClick={onMarkAllRead} disabled={markingAll}>
            <CheckCheck size={15} aria-hidden="true" />
            <span>{markingAll ? 'Marking…' : 'Mark all read'}</span>
          </SecondaryButton>
        )}
      </PageHeading>

      <Panel>
        {/*
          EmptyState renders its children inside a <p>, so the empty case is
          built from spans — a nested <p> is invalid and the browser closes the
          outer one early, which pulls the layout apart in a way that shows up
          only in the rendered page, never in the source.
        */}
        {notifications.length === 0 ? (
          <EmptyState>
            <Inbox size={22} className="text-spc-muted mb-2 mx-auto block" aria-hidden="true" />
            <span className="block text-spc-sm font-bold text-spc-ink">Nothing here yet</span>
            <span className="block text-spc-xs text-spc-muted mt-1 max-w-sm mx-auto">
              When another college includes yours on a job posting, or a drive is
              scheduled for a job your students can apply to, it will appear here.
            </span>
          </EmptyState>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <Row
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                compact={compact}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

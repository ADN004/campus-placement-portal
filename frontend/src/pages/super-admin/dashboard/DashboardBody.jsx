import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Zap, CheckCircle, Eye } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, EmptyState, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The whole super-admin dashboard, at every width.
 *
 * One component with a `layout` prop rather than three presenters: the devices
 * differ only in how many columns the grids run and how large the heading is.
 * Inventing three near-identical files for that would be three things to keep
 * in step, not three designs.
 *
 * Everything here is opaque. Console's glass is the chrome around the page —
 * the panes this page sits between — and a stat tile is something you read.
 */

/* ------------------------------------------------------------------- tiles */

/**
 * One figure and what it counts.
 *
 * The tiles this replaces were eight different gradients — blue-to-cyan,
 * purple-to-pink, green-to-emerald and so on — which made every tile shout
 * equally and told you nothing. The figure is the loudest thing now, and the
 * only colour is the accent behind the icon.
 */
function StatTile({ title, value, icon: Icon, description, link, metric }) {
  const inner = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="w-10 h-10 rounded-spc-admin-sm bg-spc-accent-soft
          flex items-center justify-center flex-shrink-0">
          <Icon size={19} className="text-spc-accent" aria-hidden="true" />
        </span>
        {link && (
          <ArrowRight
            size={17}
            aria-hidden="true"
            className="text-spc-body opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </span>
      <span className={`block ${metric} font-bold text-spc-ink tabular-nums mt-3`}>{value}</span>
      <span className="block text-spc-sm font-bold text-spc-ink mt-1">{title}</span>
      <span className="block text-spc-xs text-spc-body mt-0.5">{description}</span>
    </>
  );

  const shell = 'group block p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin';
  if (!link) return <div className={shell}>{inner}</div>;
  return (
    <Link to={link} className={`${shell} hover:bg-spc-surface-2 transition-colors`}>
      {inner}
    </Link>
  );
}

/** A place to go, with a sentence saying why. */
function ActionTile({ title, description, icon: Icon, link }) {
  return (
    <Link
      to={link}
      className="group flex items-start gap-3 p-4 bg-spc-surface border border-spc-line-strong
        rounded-spc-admin hover:bg-spc-surface-2 transition-colors"
    >
      <span className="w-10 h-10 rounded-spc-admin-sm bg-spc-accent-soft
        flex items-center justify-center flex-shrink-0">
        <Icon size={19} className="text-spc-accent" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-spc-sm font-bold text-spc-ink">{title}</span>
        <span className="block text-spc-xs text-spc-body mt-0.5">{description}</span>
      </span>
      <ArrowRight
        size={17}
        aria-hidden="true"
        className="text-spc-body flex-shrink-0 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  );
}

/**
 * A region and how many colleges are in it.
 *
 * The tiles this replaces built their colour at runtime — `bg-${region.color}-100`
 * — which Tailwind cannot see, so it never generated those classes and the chips
 * rendered with no colour at all. There is no per-region colour now: five
 * regions are not five meanings, and colour in this role says something.
 */
function RegionTile({ name, colleges }) {
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{name}</p>
      <p className="text-spc-metric font-bold text-spc-ink tabular-nums mt-2">{colleges}</p>
      <p className="text-spc-xs text-spc-body">Colleges</p>
    </div>
  );
}

/* ----------------------------------------------------------- notifications */

function NotificationRow({ notification, onMarkRead, timeAgo }) {
  const unread = !notification.is_read;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${unread ? 'bg-spc-selected' : ''}`}>
      <span className="w-9 h-9 rounded-spc-admin-sm bg-spc-surface-2
        flex items-center justify-center flex-shrink-0">
        {notification.notification_type === 'job_auto_approved'
          ? <Zap size={17} className="text-spc-ink" aria-hidden="true" />
          : <Bell size={17} className="text-spc-ink" aria-hidden="true" />}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-spc-sm text-spc-ink ${unread ? 'font-bold' : 'font-semibold'}`}>
          {notification.title}
        </p>
        <p className="text-spc-xs text-spc-body mt-0.5 break-words">{notification.message}</p>
        <p className="text-spc-xs text-spc-body mt-1 tabular-nums">
          {notification.college_name && (
            <span className="font-semibold">{notification.college_name} · </span>
          )}
          {timeAgo(notification.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {notification.related_entity_type === 'job' && notification.related_entity_id && (
          <Link
            to={`/super-admin/jobs?highlight=${notification.related_entity_id}`}
            aria-label={`View the job this is about: ${notification.title}`}
            title="View job"
            className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
              text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
          >
            <Eye size={17} aria-hidden="true" />
          </Link>
        )}
        {unread && (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            aria-label={`Mark as read: ${notification.title}`}
            title="Mark as read"
            className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
              text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
          >
            <CheckCircle size={17} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- body */

export default function DashboardBody(p) {
  const { layout } = p;
  const statColumns = layout === 'desktop' ? 'lg:grid-cols-4' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  const actionColumns = layout === 'desktop' ? 'lg:grid-cols-3' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  const regionColumns = layout === 'desktop' ? 'lg:grid-cols-5' : layout === 'tablet' ? 'sm:grid-cols-2' : '';
  // The figure carries the tile, so it grows with the room available.
  const metric = layout === 'mobile' ? 'text-spc-metric' : 'text-spc-metric-lg';

  return (
    <div>
      <PageHeading
        eyebrow="Kerala Polytechnics"
        title="Super Admin Dashboard"
        subline="System-wide overview of the State Placement Cell"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        {p.refreshControl}
      </PageHeading>

      <section className="mb-6">
        <SectionLabel>At a glance</SectionLabel>
        <div className={`grid grid-cols-1 ${statColumns} gap-3`}>
          {p.statCards.map((stat) => (
            <StatTile key={stat.title} {...stat} metric={metric} />
          ))}
        </div>
      </section>

      <section className="mb-6">
        <SectionLabel>Recent notifications</SectionLabel>
        <Panel className="overflow-hidden">
          <PanelHeading
            action={p.unreadCount > 0 ? (
              <SecondaryButton onClick={p.onMarkAllRead}>
                <CheckCircle size={15} aria-hidden="true" />
                Mark all read
              </SecondaryButton>
            ) : null}
          >
            Auto-approved jobs and system alerts
            {p.unreadCount > 0 && (
              <span className="ml-2 inline-block min-w-[20px] h-5 px-1.5 rounded-full
                bg-spc-accent text-spc-on-accent text-[11px] font-bold leading-5 text-center tabular-nums">
                {p.unreadCount}
              </span>
            )}
          </PanelHeading>

          {p.notifications.length === 0 ? (
            <EmptyState>
              Nothing yet. Auto-approved jobs and system alerts appear here.
            </EmptyState>
          ) : (
            <div className="divide-y divide-spc-line">
              {p.notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={p.onMarkRead}
                  timeAgo={p.timeAgo}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mb-6">
        <SectionLabel>Quick actions</SectionLabel>
        <div className={`grid grid-cols-1 ${actionColumns} gap-3`}>
          {p.quickActions.map((action) => (
            <ActionTile key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Colleges by region</SectionLabel>
        <div className={`grid grid-cols-1 ${regionColumns} gap-3`}>
          {p.regions.map((region) => (
            <RegionTile key={region.name} {...region} />
          ))}
        </div>
      </section>
    </div>
  );
}

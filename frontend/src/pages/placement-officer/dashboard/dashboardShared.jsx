import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';

/**
 * Pieces shared by the three PlacementOfficerDashboard presenters.
 *
 * Presentation only — every value rendered here is passed down unchanged from
 * the container, and every handler is the container's.
 *
 * The officer direction is "Register": hierarchy comes from surfaces, rules and
 * type weight, never from shadows or colour blocks. Two consequences show up
 * repeatedly below:
 *   - There is no `shadow-*` anywhere. Panels are a surface with a hairline.
 *   - Colour is reserved for meaning. The brass accent is only used for links
 *     and primary buttons, and the status tints only for real status.
 */

/* ------------------------------------------------------------------ panels */

/**
 * The standard panel: surface, one hairline edge, 4px radius, no shadow.
 * `overflow-hidden` so the child hairlines meet the rounded corner cleanly.
 */
export function Panel({ children, className = '' }) {
  return (
    <div
      className={`bg-spc-surface border border-spc-line-strong rounded-spc-panel
        overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

/** Panel heading — sits on the panel, separated by a hairline. */
export function PanelHeading({ children }) {
  return (
    <div className="px-4 py-3 border-b border-spc-line">
      <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
        {children}
      </h2>
    </div>
  );
}

/* ------------------------------------------------------------------ heading */

/**
 * Page heading. The eyebrow carries the accent — one of the few places it is
 * allowed — and sits on the ground, where it measures 4.83:1.
 *
 * The 1.5px rule underneath is the structural signature of this direction: it
 * is what replaces the old gradient icon tile as the thing that says "this is
 * the top of the page".
 */
export function PageHeading({ collegeName, regionName, title, subline, size = 'md', children }) {
  const titleSize = size === 'sm' ? 'text-spc-display' : 'text-spc-display-lg';

  return (
    <header className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {(collegeName || regionName) && (
            <p className="text-spc-label font-bold uppercase text-spc-accent mb-1.5 break-words">
              {[collegeName, regionName].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1 className={`${titleSize} font-bold text-spc-ink`}>{title}</h1>
          {subline && <p className="text-spc-sm text-spc-muted mt-1">{subline}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- auto refresh */

/**
 * Officer-styled auto-refresh control.
 *
 * A separate component from `components/AutoRefreshIndicator`, which is shared
 * with super-admin and must not be restyled. Same three controls, same
 * handlers, same 5-second "time ago" tick — only the presentation differs, and
 * the targets are now 44px rather than ~26px.
 *
 * The live/paused dot is deliberately monochrome. A green "Live" pill would
 * spend colour on something that is not a student's status, which is exactly
 * what this direction removed.
 */
export function RefreshControl({
  lastRefreshed,
  autoRefreshEnabled,
  onToggle,
  onManualRefresh,
  refreshing,
}) {
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((new Date() - lastRefreshed) / 1000);
      if (seconds < 10) setTimeAgo('just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onManualRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3
          rounded-spc-control bg-spc-surface border border-spc-control
          text-spc-xs font-bold text-spc-ink
          hover:bg-spc-surface-2 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh now"
      >
        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">
          {refreshing ? 'Refreshing…' : `Updated ${timeAgo}`}
        </span>
      </button>

      <button
        onClick={onToggle}
        aria-pressed={autoRefreshEnabled}
        className="inline-flex items-center gap-2 min-h-[44px] px-3
          rounded-spc-control bg-spc-surface border border-spc-control
          text-spc-xs font-bold text-spc-ink
          hover:bg-spc-surface-2 transition-colors"
        title={
          autoRefreshEnabled
            ? 'Updating on its own. Click to stop.'
            : 'Not updating on its own. Click to start.'
        }
      >
        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            autoRefreshEnabled ? 'bg-spc-ink' : 'border border-spc-control'
          }`}
        />
        {/* Same words as the applicants page's control. Two controls doing the
            same job in one role should not have two vocabularies — and "Live"
            describes the data while the button acts on the setting. */}
        <span>{autoRefreshEnabled ? 'Auto on' : 'Auto off'}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- stat block */

/**
 * The stat tiles as ONE ruled block rather than four floating cards: a 1px gap
 * over a `line` background, so neighbouring tiles share a hairline. That is
 * what makes it read as a register rather than a dashboard of cards.
 *
 * `columns` is the only thing that differs between devices.
 */
export function StatBlock({ stats, columns = 4 }) {
  const cols = columns === 2 ? 'grid-cols-2' : 'grid-cols-4';
  return (
    <div
      className={`grid ${cols} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden`}
    >
      {stats.map((stat) => (
        <StatTile key={stat.title} stat={stat} />
      ))}
    </div>
  );
}

function StatTile({ stat }) {
  const needsAttention = stat.attention && stat.value > 0;

  const body = (
    <>
      <div className="flex items-start gap-1.5">
        {/* The one status colour on this screen, and only when there is
            actually something waiting. */}
        {needsAttention && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-spc-warn flex-shrink-0 mt-[0.4rem]"
          />
        )}
        <span className="text-spc-label font-bold uppercase text-spc-muted leading-tight">
          {stat.title}
        </span>
      </div>

      {/* Numbers right-aligned, always. Text left, figures right — this is the
          single change that fixes the most complaints about columns of data,
          and the officer role is full of them. */}
      <span className="block text-spc-metric font-bold text-spc-ink text-right mt-3 tabular-nums">
        {typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}
      </span>

      {stat.description && (
        <span className="block text-xs text-spc-muted mt-1 leading-snug">{stat.description}</span>
      )}

      {/* Always visible, never hover-only: a hover-only affordance is invisible
          to touch and to keyboard, which is how the old "View Details" row
          managed to never appear on a phone at all. */}
      {/* Always visible, never hover-only: a hover-only affordance is invisible
          to touch and to keyboard, which is how the old "View Details" row
          managed to never appear on a phone at all.

          The accent goes to ink on hover because the row tints to surface-2
          there, and brass on surface-2 measures 4.49:1 — a hair under the 4.5
          AA minimum. Accent text is only safe on ground and surface. */}
      {stat.link && (
        <span
          className="flex items-center gap-1 text-spc-xs font-bold text-spc-accent
            group-hover:text-spc-ink transition-colors mt-3"
        >
          <span>{needsAttention ? 'Review' : 'View'}</span>
          <ArrowRight size={14} />
        </span>
      )}
    </>
  );

  const shell = 'bg-spc-surface p-4 flex flex-col min-h-[124px]';

  return stat.link ? (
    <Link to={stat.link} className={`group ${shell} hover:bg-spc-surface-2 transition-colors`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/* ------------------------------------------------------------ quick actions */

/**
 * Quick actions as ruled rows inside one panel — not a grid of cards. Each row
 * is entirely a link, so the pointer cursor is honest (the old Responsibilities
 * panel showed a hand cursor over plain text because GlassCard defaults
 * `hover` to true).
 */
export function ActionList({ actions, showDescription = true }) {
  return (
    <Panel>
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            to={action.link}
            className={`group flex items-center gap-3 px-4 py-3.5 min-h-[56px]
              hover:bg-spc-surface-2 transition-colors
              ${i > 0 ? 'border-t border-spc-line' : ''}`}
          >
            <span className="w-9 h-9 rounded-spc-control bg-spc-surface-2 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-spc-body" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-spc-sm font-bold text-spc-ink leading-tight">
                {action.title}
              </span>
              {showDescription && (
                <span className="block text-xs text-spc-muted leading-snug mt-0.5">
                  {action.description}
                </span>
              )}
            </span>

            {/* Ink on hover, for the same surface-2 contrast reason as the
                stat tiles above. */}
            <span
              className="flex items-center gap-1 text-spc-xs font-bold text-spc-accent
                group-hover:text-spc-ink transition-colors flex-shrink-0"
            >
              <span className="hidden sm:inline">Open</span>
              <ArrowRight size={15} />
            </span>
          </Link>
        );
      })}
    </Panel>
  );
}

/* ---------------------------------------------------------- responsibilities */

/**
 * The six responsibilities. Static reference text — so no boxes, no hover
 * treatment and no pointer cursor, all of which the old version had.
 */
export const RESPONSIBILITIES = [
  'Review and approve/reject student registration requests',
  'Manage student profiles and academic information',
  'Create job posting requests for super admin approval',
  'Blacklist students who violate placement policies',
  'Send notifications and announcements to students',
  'Request whitelist for previously blacklisted students (requires super admin approval)',
];

export function ResponsibilityList({ columns = 1 }) {
  if (columns === 2) {
    return (
      <div className="grid grid-cols-2 gap-x-px bg-spc-line">
        {[RESPONSIBILITIES.slice(0, 3), RESPONSIBILITIES.slice(3)].map((half, col) => (
          <ul key={col} className="bg-spc-surface">
            {half.map((text, i) => (
              <li
                key={text}
                className={`px-4 py-3 text-spc-xs text-spc-body leading-snug
                  ${i > 0 ? 'border-t border-spc-line' : ''}`}
              >
                {text}
              </li>
            ))}
          </ul>
        ))}
      </div>
    );
  }

  return (
    <ul>
      {RESPONSIBILITIES.map((text, i) => (
        <li
          key={text}
          className={`px-4 py-3 text-spc-xs text-spc-body leading-snug
            ${i > 0 ? 'border-t border-spc-line' : ''}`}
        >
          {text}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- skeletons */

/** A neutral shimmer block, shaped by the caller. */
export function Bar({ className = '' }) {
  return <div className={`bg-spc-surface-2 animate-pulse rounded-spc-badge ${className}`} />;
}

/** Skeleton stat block — same ruled geometry as the real one. */
export function StatBlockSkeleton({ columns = 4 }) {
  const cols = columns === 2 ? 'grid-cols-2' : 'grid-cols-4';
  return (
    <div
      className={`grid ${cols} gap-px bg-spc-line
        border border-spc-line-strong rounded-spc-panel overflow-hidden`}
    >
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-spc-surface p-4 min-h-[124px]">
          <Bar className="h-3 w-20 mb-6" />
          <Bar className="h-7 w-14 ml-auto" />
          <Bar className="h-3 w-24 mt-3" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton ruled list of `rows` rows. */
export function ListSkeleton({ rows = 3 }) {
  return (
    <Panel>
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3.5 min-h-[56px]
            ${i > 0 ? 'border-t border-spc-line' : ''}`}
        >
          <Bar className="w-9 h-9 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Bar className="h-3.5 w-32 mb-2" />
            <Bar className="h-3 w-48" />
          </div>
        </div>
      ))}
    </Panel>
  );
}

/** Skeleton page heading, matching PageHeading's rule and spacing. */
export function HeadingSkeleton({ size = 'md' }) {
  return (
    <div className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <Bar className="h-3 w-52 mb-3" />
      <Bar className={size === 'sm' ? 'h-7 w-56' : 'h-9 w-96 max-w-full'} />
      <Bar className="h-4 w-64 max-w-full mt-3" />
    </div>
  );
}

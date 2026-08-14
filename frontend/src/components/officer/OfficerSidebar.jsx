import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';

/**
 * OfficerSidebar — the placement-officer navigation panel.
 *
 * Rendered only for role === 'placement_officer'; the super-admin sidebar in
 * Layout.jsx is untouched. Same ten destinations, same links, and the drawer
 * still closes on navigation below `lg`.
 *
 * Two things drive the design. First, ten flat items is too many to scan, so
 * they are grouped by the job being done. Second — the research point this
 * whole direction leans on — navigation should recede once you have arrived:
 * labels sit at `muted`, not ink, and the active item is marked with a step up
 * the surface ladder rather than a saturated fill. On a page that is mostly a
 * table of student records, the table should be the brightest thing on screen.
 *
 * Grouping is keyed by path, so a nav item added later without a group still
 * renders — under "More" — rather than silently disappearing.
 */
const GROUPS = [
  { label: 'Overview', paths: ['/placement-officer/dashboard'] },
  {
    label: 'Students',
    paths: [
      '/placement-officer/students',
      '/placement-officer/prn-ranges',
      '/placement-officer/college-branches',
    ],
  },
  {
    label: 'Jobs',
    paths: [
      '/placement-officer/create-job-request',
      '/placement-officer/my-job-requests',
      '/placement-officer/job-eligible-students',
      '/placement-officer/placement-poster',
    ],
  },
  {
    label: 'Communication',
    paths: [
      '/placement-officer/inbox',
      '/placement-officer/send-notification',
    ],
  },
  { label: 'Account', paths: ['/placement-officer/profile'] },
];

function groupItems(navigationItems) {
  const byPath = new Map(navigationItems.map((item) => [item.path, item]));
  const used = new Set();

  const sections = GROUPS.map((group) => {
    const items = group.paths
      .map((path) => {
        const item = byPath.get(path);
        if (item) used.add(path);
        return item;
      })
      .filter(Boolean);
    return { label: group.label, items };
  }).filter((section) => section.items.length > 0);

  const leftovers = navigationItems.filter((item) => !used.has(item.path));
  if (leftovers.length > 0) sections.push({ label: 'More', items: leftovers });

  return sections;
}

export default function OfficerSidebar({
  navigationItems,
  sidebarOpen,
  onNavigate,
  collapsed,
  onToggleCollapse,
  user,
}) {
  const location = useLocation();
  const sections = groupItems(navigationItems);

  return (
    <aside
      className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 fixed z-20 flex flex-col
        w-[280px] ${collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]'}
        spc-vh-panel top-16 left-0
        bg-spc-surface border-r border-spc-line-strong
        transition-all duration-300 ease-in-out`}
    >
      {/* overflow-x-hidden is load-bearing: `overflow-y-auto` forces the
          horizontal axis to `auto` as well, so anything wider than the rail —
          a nowrap heading, an escaping tooltip — turns into a horizontal
          scrollbar and lets the panel scroll sideways into empty space. */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            {/* On the rail the heading keeps its height (so the icons below
                never shift) but gives up its width — `whitespace-nowrap` alone
                would still claim the full text width and overflow the 72px. */}
            <p
              className={`text-xs font-bold uppercase tracking-[0.13em] text-spc-muted
                whitespace-nowrap overflow-hidden transition-all duration-200
                ${collapsed
                  ? 'px-3 pt-3 pb-1.5 lg:opacity-0 lg:h-2 lg:w-0 lg:px-0 lg:pt-0 lg:pb-0'
                  : 'px-3 pt-3 pb-1.5'}`}
            >
              {section.label}
            </p>

            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 rounded-spc-control mb-0.5
                    min-h-[44px] px-3 ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                    text-spc-sm transition-colors
                    ${isActive
                      ? 'bg-spc-surface-3 text-spc-ink font-bold'
                      : 'text-spc-body font-semibold hover:bg-spc-surface-2 hover:text-spc-ink'}`}
                >
                  <span className="relative flex-shrink-0">
                    <Icon size={19} />
                    {/*
                      Collapsed, the label is gone and the count beside it would
                      go with it, so the icon carries a dot instead. Something
                      unread has to be visible in both states or an officer who
                      keeps the sidebar collapsed never learns to open it.
                    */}
                    {item.badge > 0 && collapsed && (
                      <span
                        className="hidden lg:block absolute -top-0.5 -right-0.5 h-2 w-2
                          rounded-full bg-spc-accent ring-2 ring-spc-surface"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={`whitespace-nowrap transition-opacity duration-150
                      ${collapsed ? 'lg:opacity-0 lg:hidden' : ''}`}
                  >
                    {item.name}
                  </span>
                  {item.badge > 0 && (
                    <span
                      className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-spc-accent
                        text-spc-on-accent text-[11px] font-bold leading-5 text-center tabular-nums
                        ${collapsed ? 'lg:hidden' : ''}`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-spc-line-strong p-3">
        {/* Identity block — hidden on the rail, where there is no room for it. */}
        <div className={`flex items-center gap-2.5 mb-2 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="w-8 h-8 rounded-spc-control bg-spc-surface-3 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-spc-ink" />
          </div>
          <div className="min-w-0">
            <p className="text-spc-xs font-semibold text-spc-ink truncate">
              {user.profile?.name || user.email}
            </p>
            <p className="text-xs text-spc-muted">Placement Officer</p>
          </div>
        </div>

        {/* Collapse control — desktop only; below lg the drawer is the control. */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className={`hidden lg:flex items-center gap-3 w-full min-h-[44px] rounded-spc-control
            px-3 ${collapsed ? 'lg:justify-center lg:px-0' : ''}
            text-spc-xs font-bold text-spc-muted
            hover:bg-spc-surface-2 hover:text-spc-ink transition-colors`}
        >
          <ChevronLeft
            size={18}
            className={`flex-shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
          <span className={`whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}

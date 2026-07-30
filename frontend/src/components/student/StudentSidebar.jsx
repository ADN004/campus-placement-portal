import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';

/**
 * StudentSidebar — the student navigation panel.
 *
 * Rendered only for role === 'student'; the officer and super-admin sidebar in
 * Layout.jsx is untouched.
 *
 * Behaviour is unchanged from the shared sidebar: same seven destinations, same
 * links, and the drawer still closes on navigation below `lg`. What's new is
 * presentation — the flat list is grouped under three headings, the active item
 * is a single solid pill instead of a gradient, and at `lg` and up the panel can
 * collapse to an icon rail (242px → 72px) with tooltips standing in for labels.
 *
 * Grouping is keyed by path so that a nav item added later without a group
 * still renders, in the "More" section, rather than silently disappearing.
 */
const GROUPS = [
  { label: 'Placement', paths: ['/student/dashboard', '/student/jobs', '/student/applications'] },
  { label: 'My Record', paths: ['/student/profile', '/student/extended-profile', '/student/resume'] },
  { label: 'Updates', paths: ['/student/notifications'] },
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

export default function StudentSidebar({
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
        w-[280px] ${collapsed ? 'lg:w-[72px]' : 'lg:w-[242px]'}
        spc-vh-drawer top-16 left-0 rounded-none
        lg:left-3 lg:top-[76px] lg:rounded-spc-lg lg:shadow-lg
        bg-spc-surface border-r border-spc-line lg:border
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
                  className={`group relative flex items-center gap-3 rounded-spc-sm mb-0.5
                    min-h-[44px] px-3 ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                    text-spc-sm font-semibold transition-colors
                    ${isActive
                      ? 'bg-spc-teal text-spc-on-teal'
                      : 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink'}`}
                >
                  <Icon size={19} className="flex-shrink-0" />
                  <span
                    className={`whitespace-nowrap transition-opacity duration-150
                      ${collapsed ? 'lg:opacity-0 lg:hidden' : ''}`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-spc-line p-3">
        {/* Identity block — hidden on the rail, where there is no room for it. */}
        <div className={`flex items-center gap-2.5 mb-2 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-spc-teal flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-spc-on-teal" />
          </div>
          <div className="min-w-0">
            <p className="text-spc-xs font-semibold text-spc-ink truncate">{user.profile?.name || user.profile?.student_name || user.email}</p>
            <p className="text-xs text-spc-muted">Student</p>
          </div>
        </div>

        {/* Collapse control — desktop only; below lg the drawer is the control. */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className={`hidden lg:flex items-center gap-3 w-full min-h-[44px] rounded-spc-sm
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

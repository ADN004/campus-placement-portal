import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

/**
 * AdminSidebar — the super-admin navigation panel.
 *
 * Rendered only for role === 'super_admin'. Same twenty destinations, same
 * links, and the drawer still closes on navigation below `lg`. Nothing is added
 * or removed; this is the same list, made findable.
 *
 * Twenty flat items is the problem it solves. The panel it replaces listed all
 * twenty in one column, each a gradient pill when active, so finding "Year
 * Reset" meant reading the whole list every time. They are grouped by the job
 * being done, and the group a page belongs to is keyed by path — an item added
 * later without a group still renders, under "More", rather than vanishing.
 *
 * Glass, because it floats: below `lg` it is a drawer over the page, and the
 * page is visible and blurred behind it. At `lg` and up the content column is
 * pushed clear of it, so there the material reads as a frosted panel rather
 * than a window — which is honest, and still separates it from the flat ground.
 *
 * Navigation recedes once you have arrived: labels sit at body weight, and the
 * active item is a step up the surface ladder rather than a saturated fill. On
 * a page that is mostly a table of records, the table should be the brightest
 * thing on screen.
 */
const GROUPS = [
  { label: 'Overview', paths: ['/super-admin/dashboard'] },
  {
    label: 'Students',
    paths: [
      '/super-admin/students',
      '/super-admin/student-counts',
      '/super-admin/prn-ranges',
      '/super-admin/whitelist-requests',
    ],
  },
  {
    label: 'Colleges',
    paths: [
      '/super-admin/colleges',
      '/super-admin/college-branches',
      '/super-admin/placement-officers',
      '/super-admin/college-locks',
    ],
  },
  {
    label: 'Jobs',
    paths: [
      '/super-admin/jobs',
      '/super-admin/job-requests',
      '/super-admin/requirement-templates',
      '/super-admin/job-eligible-students',
      '/super-admin/placement-poster',
    ],
  },
  { label: 'Communication', paths: ['/super-admin/send-notification'] },
  {
    label: 'System',
    paths: [
      '/super-admin/admins',
      '/super-admin/activity-logs',
      '/super-admin/database-backup',
      '/super-admin/academic-year-reset',
    ],
  },
  { label: 'Account', paths: ['/super-admin/profile'] },
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

export default function AdminSidebar({
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
        spc-glass border-r border-spc-line-strong
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
              className={`text-xs font-bold uppercase tracking-[0.13em] text-spc-ink/65
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
                      : 'text-spc-ink/80 font-semibold hover:bg-spc-surface-2 hover:text-spc-ink'}`}
                >
                  <span className="relative flex-shrink-0">
                    <Icon size={19} />
                  </span>
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

      <div className="flex-shrink-0 border-t border-spc-line-strong p-3">
        {/* Identity block — hidden on the rail, where there is no room for it. */}
        <div className={`flex items-center gap-2.5 mb-2 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="w-8 h-8 rounded-spc-control bg-spc-surface-3 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-spc-ink" />
          </div>
          <div className="min-w-0">
            <p className="text-spc-xs font-semibold text-spc-ink truncate">
              {user.profile?.name || user.email}
            </p>
            <p className="text-xs text-spc-ink/70">Super Admin</p>
          </div>
        </div>

        {/* Collapse control — desktop only; below lg the drawer is the control. */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className={`hidden lg:flex items-center gap-3 w-full min-h-[44px] rounded-spc-control
            px-3 ${collapsed ? 'lg:justify-center lg:px-0' : ''}
            text-spc-xs font-bold text-spc-ink/75
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

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, FileText, Bell, User } from 'lucide-react';
import useDeviceType from '../hooks/useDeviceType';

/**
 * StudentBottomNav — thumb-reachable tab bar for the student area.
 *
 * Only rendered for role === 'student', and only below `lg` (at `lg` and up the
 * sidebar is on screen). The destinations are a subset of the student sidebar
 * items — the sidebar stays the complete list, this is the shortcut to the five
 * screens used constantly.
 *
 * It floats: inset from the screen edges with its own radius, so it reads as a
 * control hovering above the page rather than a strip welded to the bottom.
 * That also means it keeps the glass treatment, since it genuinely overlays
 * scrolling content.
 */
const TABS = [
  { name: 'Home', path: '/student/dashboard', icon: Home },
  { name: 'Jobs', path: '/student/jobs', icon: Briefcase },
  { name: 'Applied', path: '/student/applications', icon: FileText },
  { name: 'Alerts', path: '/student/notifications', icon: Bell },
  { name: 'Profile', path: '/student/profile', icon: User },
];

export default function StudentBottomNav() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const isVisible = deviceType !== 'desktop';

  // Flag the bar on <body> while it is actually on screen, so the "switch to
  // desktop view" toggle can lift itself clear of it on the student pages that
  // still show that toggle. Purely cosmetic — see index.css.
  useEffect(() => {
    if (!isVisible) return undefined;
    document.body.setAttribute('data-student-tabbar', 'true');
    return () => document.body.removeAttribute('data-student-tabbar');
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <nav
      aria-label="Student sections"
      className="spc-tabbar lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-2"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <ul
        className="flex items-stretch gap-1 p-1.5 rounded-spc-lg spc-glass
          border border-spc-line shadow-[0_10px_28px_-14px_rgba(18,33,31,0.45)]"
      >
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[52px] px-1 py-1.5
                  rounded-spc-sm transition-colors
                  ${isActive
                    ? 'bg-spc-teal text-spc-on-teal'
                    : 'text-spc-muted active:bg-spc-surface-2'}`}
              >
                <Icon size={20} />
                <span className="text-xs font-bold leading-none">{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

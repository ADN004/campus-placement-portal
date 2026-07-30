import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, FileText, Bell, User } from 'lucide-react';
import useDeviceType from '../hooks/useDeviceType';

/**
 * StudentBottomNav — thumb-reachable tab bar for the student area.
 *
 * Only rendered for role === 'student', and only below `lg` (at `lg` and up the
 * permanent sidebar is on screen, so the desktop shell is untouched). The
 * destinations are a subset of the student sidebar items — the sidebar stays the
 * complete list, this is the shortcut to the five screens used constantly.
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[58px] px-1 py-2 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 active:text-blue-600'
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-lg px-3 py-0.5 transition-colors ${
                    isActive ? 'bg-blue-50' : 'bg-transparent'
                  }`}
                >
                  <Icon size={21} />
                </span>
                <span className="text-[11px] font-semibold leading-none">{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

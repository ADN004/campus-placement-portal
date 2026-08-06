import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Bell, User } from 'lucide-react';
import useDeviceType from '../../hooks/useDeviceType';

/**
 * OfficerBottomNav — thumb-reachable tab bar for the placement-officer area.
 *
 * Only rendered for role === 'placement_officer', and only below `lg` (at `lg`
 * and up the sidebar is on screen). The five destinations are a subset of the
 * sidebar's ten — the sidebar stays the complete list, this is the shortcut to
 * the screens an officer opens constantly. Nothing here is a new destination.
 *
 * Unlike the student bar this does not float: no inset, no radius, no glass, no
 * shadow. It is a solid surface welded to the bottom edge and separated by a
 * single rule, because the Register direction has no floating elements.
 */
const TABS = [
  { name: 'Home', path: '/placement-officer/dashboard', icon: Home },
  { name: 'Students', path: '/placement-officer/students', icon: Users },
  { name: 'Jobs', path: '/placement-officer/my-job-requests', icon: FileText },
  { name: 'Notify', path: '/placement-officer/send-notification', icon: Bell },
  { name: 'Profile', path: '/placement-officer/profile', icon: User },
];

export default function OfficerBottomNav() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const isVisible = deviceType !== 'desktop';

  // Flag the bar on <body> while it is actually on screen so the staging
  // ribbon, which is pinned bottom-centre, can move to the top instead of
  // sitting underneath it. Purely cosmetic — see index.css.
  useEffect(() => {
    if (!isVisible) return undefined;
    document.body.setAttribute('data-officer-tabbar', 'true');
    return () => document.body.removeAttribute('data-officer-tabbar');
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <nav
      aria-label="Placement officer sections"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30
        bg-spc-surface border-t border-spc-line-strong"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex-1 min-w-0">
              <Link
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 py-2
                  transition-colors
                  ${isActive
                    ? 'text-spc-accent font-bold'
                    : 'text-spc-muted font-semibold active:bg-spc-surface-2'}`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="text-xs leading-none truncate max-w-full">{tab.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

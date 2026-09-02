import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, Building2, Shield } from 'lucide-react';
import useDeviceType from '../../hooks/useDeviceType';

/**
 * AdminBottomNav — thumb-reachable tab bar for the super-admin area.
 *
 * Only rendered for role === 'super_admin', and only below `lg`, where the
 * sidebar is a drawer rather than a permanent panel. The five destinations are
 * a subset of the sidebar's twenty — the sidebar stays the complete list, this
 * is the shortcut to the screens opened constantly. Nothing here is a new
 * destination, and every path exists in the sidebar too.
 *
 * A floating pane rather than a bar welded to the edge: it sits on a gutter with
 * the page visible around and behind it, which is the whole point of the
 * material and matches the panes on the desktop layout. The officer equivalent
 * is deliberately solid and flush, because that direction has no floating layer
 * at all.
 *
 * The gutter is added to the safe-area inset rather than replacing it, so on a
 * phone with a home indicator the pane clears both.
 *
 * Labels are ink, not muted. On glass, muted text fails its contrast against a
 * dark backdrop, so the inactive state is carried by weight and by ink at
 * reduced opacity instead.
 *
 * 65% is the floor, and it is measured rather than chosen: ink at 60% over
 * glass scores 4.26 against a dark rule and 4.42 over an accent fill, both
 * under the 4.5 minimum, while 65% holds 4.98 in the worst case. Anything
 * quieter than this has to get smaller, not fainter.
 */
const TABS = [
  { name: 'Home', path: '/super-admin/dashboard', icon: Home },
  { name: 'Students', path: '/super-admin/students', icon: Users },
  { name: 'Jobs', path: '/super-admin/jobs', icon: Briefcase },
  { name: 'Colleges', path: '/super-admin/colleges', icon: Building2 },
  { name: 'Admins', path: '/super-admin/admins', icon: Shield },
];

export default function AdminBottomNav() {
  const location = useLocation();
  const deviceType = useDeviceType();
  const isVisible = deviceType !== 'desktop';

  /*
   * Flag the bar on <body> while it is actually on screen so the staging
   * ribbon, which is pinned bottom-centre, can move to the top instead of
   * sitting underneath it. Purely cosmetic — see index.css, where the officer
   * flag does the same job.
   */
  useEffect(() => {
    if (!isVisible) return undefined;
    document.body.setAttribute('data-admin-tabbar', 'true');
    return () => document.body.removeAttribute('data-admin-tabbar');
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <nav
      aria-label="Super admin sections"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <ul className="flex items-stretch spc-admin-glass rounded-spc-admin-lg
        border border-spc-line-strong overflow-hidden">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path
            || location.pathname.startsWith(`${tab.path}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 py-2
                  transition-colors
                  ${isActive ? 'text-spc-ink' : 'text-spc-ink/65 hover:text-spc-ink'}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span className={`text-[11px] leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {tab.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

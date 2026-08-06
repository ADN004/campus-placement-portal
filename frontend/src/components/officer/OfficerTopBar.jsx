import { Menu, X, LogOut } from 'lucide-react';

/**
 * OfficerTopBar — the fixed header for the placement-officer area.
 *
 * Rendered only for role === 'placement_officer'. Same three controls as the
 * shared navbar (menu toggle, identity, logout) calling the same handlers; only
 * the presentation differs.
 *
 * Deliberately not glass, unlike the student bar: the Register direction has no
 * blur and no shadow, so this is a solid surface separated from the page by a
 * single rule. The brand is plain type rather than a gradient — with colour
 * reserved for meaning, a decorative gradient would be the loudest thing on a
 * screen whose whole job is showing student records.
 */
export default function OfficerTopBar({ user, sidebarOpen, onToggleSidebar, onLogout }) {
  return (
    <nav className="fixed w-full top-0 z-30 bg-spc-surface border-b border-spc-line-strong">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-spc-control text-spc-body
                hover:bg-spc-surface-2 hover:text-spc-ink lg:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="min-w-0">
              <h1 className="text-spc-h3 font-bold text-spc-ink leading-tight truncate">
                State Placement Cell
              </h1>
              {/* The eyebrow is one of the few places accent is allowed, and it
                  sits on surface, where it measures 5.31:1. */}
              <p className="hidden sm:block text-xs font-bold uppercase tracking-[0.13em] text-spc-accent leading-tight">
                Kerala Polytechnics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end min-w-0">
              <span className="text-spc-xs font-semibold text-spc-ink truncate max-w-[220px]">
                {user.profile?.name || user.email}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                Placement Officer
              </span>
            </div>
            {/* Secondary-button treatment, not the red it used to be: red is a
                status colour here and logging out is not a failure state. */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 min-h-[44px] px-3 sm:px-4 rounded-spc-control
                text-spc-xs font-bold text-spc-ink bg-spc-surface border border-spc-control
                hover:bg-spc-surface-2 transition-colors"
              aria-label="Logout"
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

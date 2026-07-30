import { Menu, X, LogOut, GraduationCap } from 'lucide-react';

/**
 * StudentTopBar — the fixed header for the student area.
 *
 * Rendered only for role === 'student'. Same three controls as the shared
 * navbar (menu toggle, identity, logout) calling the same handlers; only the
 * styling differs. This is one of the three surfaces that keeps the glass
 * treatment, because it genuinely floats over scrolling content — at 86%
 * opacity with a 1px top highlight rather than the old 70%, so text on it
 * stays legible.
 */
export default function StudentTopBar({ user, sidebarOpen, onToggleSidebar, onLogout }) {
  return (
    <nav className="fixed w-full top-0 z-30 spc-glass border-b border-spc-line">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-spc-sm text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink lg:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-spc-sm bg-spc-teal flex items-center justify-center flex-shrink-0">
                <GraduationCap size={19} className="text-spc-on-teal" />
              </div>
              <div className="min-w-0">
                <h1 className="text-spc-h3 font-extrabold text-spc-ink leading-tight truncate">
                  State Placement Cell
                </h1>
                <p className="hidden sm:block text-xs font-bold uppercase tracking-[0.13em] text-spc-brass leading-tight">
                  Kerala Polytechnics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end min-w-0">
              <span className="text-spc-xs font-semibold text-spc-ink truncate max-w-[220px]">
                {user.email}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                Student
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 min-h-[40px] px-3 sm:px-4 rounded-spc-sm
                text-spc-xs font-bold text-spc-body border border-spc-line-strong
                hover:bg-spc-bad-bg hover:text-spc-bad hover:border-spc-bad-bg transition-colors"
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

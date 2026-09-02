import { Menu, X, LogOut } from 'lucide-react';

/**
 * AdminTopBar — the fixed header for the super-admin area.
 *
 * Rendered only for role === 'super_admin'. The same three controls as the
 * shell it replaces (menu toggle, identity, logout) calling the same handlers;
 * only the presentation differs.
 *
 * This one is glass, where the officer's equivalent is deliberately solid. The
 * bar is fixed and the page flows beneath it, so content genuinely passes under
 * it as you scroll — which is the whole justification for the material. The
 * officer direction has no floating layer at all, so a blur there would have
 * been decoration; here it is the one honest place for it.
 *
 * `spc-admin-glass` rather than the student's `spc-glass`: a wider blur, a much
 * stronger saturation lift so the washes on the ground come through as colour
 * instead of grey, a brighter specular edge, and a soft shadow. Console allows a
 * shadow on floating chrome and nowhere else — without one a pane has no reason
 * to look like it is above anything.
 *
 * Text on it is ink only. At this alpha, muted text measures 4.31 against a
 * dark backdrop and fails; ink measures 13.45. Anything here that wants to be
 * quiet gets smaller or lighter in weight, never lighter in colour.
 */
export default function AdminTopBar({ user, sidebarOpen, onToggleSidebar, onLogout }) {
  return (
    <nav className="fixed w-full top-0 z-30 spc-admin-glass border-b border-spc-line-strong">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-spc-control text-spc-ink
                hover:bg-spc-surface-2 lg:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="min-w-0">
              <h1 className="text-spc-h3 font-bold text-spc-ink leading-tight truncate">
                State Placement Cell
              </h1>
              {/* Sits on glass, so this is ink at a lighter weight rather than
                  the accent the officer bar uses — accent on glass is the same
                  contrast problem as muted. */}
              <p className="hidden sm:block text-xs font-bold uppercase tracking-[0.13em] text-spc-ink/70 leading-tight">
                Kerala Polytechnics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end min-w-0">
              <span className="text-spc-xs font-semibold text-spc-ink truncate max-w-[220px]">
                {user.profile?.name || user.email}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.11em] text-spc-ink/70">
                Super Admin
              </span>
            </div>
            {/* Not red. Red is a status colour in this palette and signing out
                is not a failure state — the same call the officer bar made. */}
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

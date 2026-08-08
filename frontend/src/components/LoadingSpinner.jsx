import { useAuth } from '../context/AuthContext';

/**
 * The full-page loader, shared by all three roles.
 *
 * It replaces a rotating ring in the old default blue — a mark that said
 * nothing about whose screen you were on and belonged to no part of the design.
 * A 4x4 block matrix lights in a diagonal sweep instead: hard corners, no
 * radius anywhere, no shadow, which suits the officer's Register direction and
 * sits just as well in the student palette.
 *
 * Role scope is carried by this component rather than inherited, because it
 * cannot rely on being inside one. It renders in three places and only one of
 * them is inside the themed shell:
 *   - App boot, before the user is known at all;
 *   - the Suspense fallback for every lazy route, which replaces the whole
 *     Routes tree — Layout, and therefore `.spc-officer`, included;
 *   - the verify-email page, which is public.
 * Putting the scope class on the wrapper here means the officer's loader is
 * brass and the student's is teal in all three, instead of whichever theme
 * happened to survive the unmount.
 *
 * Super admin has not been redesigned and reads none of these tokens, so it
 * keeps its own blue, set as the accent triple the cells already read.
 */

const ROLE_SCOPE = {
  student: 'spc-student',
  placement_officer: 'spc-officer',
};

// Super admin reads none of the design tokens, so both values are supplied as
// RGB triples: primary-600, the blue its pages already use, and slate-50, the
// lightest stop of the slate-to-purple wash behind them. Without these it would
// inherit the student defaults and show a teal grid on warm cream in front of a
// blue-grey shell.
const SUPER_ADMIN_TOKENS = { '--spc-accent': '37 99 235', '--spc-ground': '248 250 252' };

const SIZE = 4;
const CELLS = Array.from({ length: SIZE * SIZE }, (_, i) => ({
  key: i,
  // A diagonal wave: cells on the same anti-diagonal light together.
  delay: (Math.floor(i / SIZE) + (i % SIZE)) * 0.11,
}));

/**
 * @param {string|null} label  Word under the grid. Pass null where the
 *   surrounding page already says what is happening.
 * @param {boolean} inline  Drop the full-screen frame and its background, for
 *   the one caller that embeds this inside a card rather than replacing a page.
 */
export default function LoadingSpinner({ label = 'Loading', inline = false }) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div
      className={`${ROLE_SCOPE[role] || ''} flex flex-col items-center justify-center
        ${inline ? 'py-2' : 'min-h-screen gap-5 bg-spc-ground'}`}
      style={role === 'super_admin' ? SUPER_ADMIN_TOKENS : undefined}
    >
      {/*
        One live region for the whole thing. The cells are decoration and are
        hidden from assistive tech; a screen reader should hear "Loading", not
        sixteen empty boxes.
      */}
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {CELLS.map((cell) => (
            <span
              key={cell.key}
              className="spc-pixel-cell block h-3.5 w-3.5 bg-spc-accent"
              style={{ animationDelay: `${cell.delay}s` }}
            />
          ))}
        </div>

        {label ? (
          <p
            className="text-spc-xs font-bold uppercase tracking-[0.18em] text-spc-muted
              tabular-nums"
          >
            {label}
          </p>
        ) : (
          <span className="sr-only">Loading</span>
        )}
      </div>
    </div>
  );
}

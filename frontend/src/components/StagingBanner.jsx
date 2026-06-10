import { useEffect } from 'react';

/**
 * Staging Environment Indicator
 *
 * Renders a fixed, always-visible ribbon on every page (including login)
 * when the build was produced for the staging environment, plus a
 * "[STAGING]" prefix on the browser tab title.
 *
 * VITE_APP_ENV is baked in at image build time by CI:
 *   develop branch -> 'staging'   (banner shown)
 *   main branch    -> 'production' (this component compiles to nothing)
 *
 * Static element, position: fixed, pointer-events: none — it can never
 * intercept clicks or affect scrolling.
 */
const IS_STAGING = import.meta.env.VITE_APP_ENV === 'staging';

function StagingBanner() {
  useEffect(() => {
    if (IS_STAGING && !document.title.startsWith('[STAGING]')) {
      document.title = `[STAGING] ${document.title}`;
    }
  }, []);

  if (!IS_STAGING) return null;

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none"
      role="status"
      aria-label="Staging environment"
    >
      <div className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-lg ring-2 ring-amber-300/60">
        <span aria-hidden="true">⚠</span>
        Staging Environment — test data only
      </div>
    </div>
  );
}

export default StagingBanner;

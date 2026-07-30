import { useEffect, useState } from 'react';

/**
 * Reports which of the three device classes the viewport currently falls into.
 *
 * The boundaries deliberately mirror Tailwind's default `md` / `lg` breakpoints
 * so a page that branches on this hook and the shared shell agree about where
 * "tablet" ends: Layout.jsx pins the sidebar open at `lg`, so `lg` is also where
 * the desktop content layout takes over.
 *
 *   mobile   width < 768px            (below `md`)
 *   tablet   768px .. 1023.98px       (`md` up to below `lg`)
 *   desktop  width >= 1024px          (`lg` and up)
 *
 * Detection is purely viewport-based — no user-agent sniffing — and re-evaluates
 * on resize and orientation change, so rotating a tablet or dragging a desktop
 * window narrow switches layouts live.
 */

export const MOBILE_MAX_WIDTH = 767.98;
export const TABLET_MIN_WIDTH = 768;
export const DESKTOP_MIN_WIDTH = 1024;

const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;
const TABLET_QUERY = `(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${DESKTOP_MIN_WIDTH - 0.02}px)`;

function readDeviceType() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // No viewport to measure (SSR / very old browser) — desktop is the
    // pre-existing layout, so it is the safe default.
    return 'desktop';
  }
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'desktop';
}

export default function useDeviceType() {
  const [deviceType, setDeviceType] = useState(readDeviceType);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    // Only re-render when the class actually changes, not on every resize pixel.
    const update = () => setDeviceType((prev) => {
      const next = readDeviceType();
      return next === prev ? prev : next;
    });

    const queries = [window.matchMedia(MOBILE_QUERY), window.matchMedia(TABLET_QUERY)];
    queries.forEach((query) => {
      if (query.addEventListener) query.addEventListener('change', update);
      else query.addListener(update); // Safari < 14
    });
    window.addEventListener('orientationchange', update);

    // Catch the case where the viewport changed between first render and effect.
    update();

    return () => {
      queries.forEach((query) => {
        if (query.removeEventListener) query.removeEventListener('change', update);
        else query.removeListener(update);
      });
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return deviceType;
}

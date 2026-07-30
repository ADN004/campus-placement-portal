/**
 * Routes that ship a purpose-built mobile/tablet layout of their own.
 *
 * On these routes the "Switch to desktop view" system (useDesktopView +
 * DesktopViewSwitcher) is suppressed: the nudge banner and the sticky toggle are
 * hidden and, crucially, a previously saved `desktop-view-preference` is *not*
 * allowed to force the viewport to `width=1280, initial-scale=0.25` — that
 * override would zoom out the real mobile design into an unusable postage stamp.
 *
 * Everywhere else the switcher keeps behaving exactly as before, so the roles
 * and pages that still only have a desktop layout keep their escape hatch.
 *
 * Add one line per page as it gets a real mobile/tablet design.
 */
export const MOBILE_READY_ROUTES = [
  '/student/dashboard',
];

export function isMobileReadyRoute(pathname) {
  if (!pathname) return false;
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return MOBILE_READY_ROUTES.includes(normalized);
}

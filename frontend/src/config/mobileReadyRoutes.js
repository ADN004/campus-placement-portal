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
 *
 * An entry also covers that route's sub-paths, so a page that opens a record on
 * its own URL — /placement-officer/job-eligible-students/42 — is covered by the
 * parent entry. Without that, an exact-match list would silently miss every
 * detail page: the switcher would come back, a saved preference would force
 * width=1280, and the mobile layout we just built would render as a postage
 * stamp. The failure is invisible until someone opens it on a phone.
 */
export const MOBILE_READY_ROUTES = [
  '/student/dashboard',
  '/student/jobs',
  '/student/applications',
  '/student/notifications',
  '/student/profile',
  '/student/extended-profile',
  '/student/resume',
  '/student/waiting',
  '/placement-officer/dashboard',
  '/placement-officer/students',
  '/placement-officer/job-eligible-students',
  '/placement-officer/create-job-request',
  '/placement-officer/my-job-requests',
  '/placement-officer/prn-ranges',
];

export function isMobileReadyRoute(pathname) {
  if (!pathname) return false;
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  return MOBILE_READY_ROUTES.some(
    (route) =>
      normalized === route ||
      // Sub-paths only. The `/` guard matters: without it, a future
      // `/student/jobs-archive` would be swallowed by the `/student/jobs`
      // entry and silently suppress the switcher on a page that still needs it.
      normalized.startsWith(`${route}/`)
  );
}

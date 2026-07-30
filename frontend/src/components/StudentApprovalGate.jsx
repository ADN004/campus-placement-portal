import { Navigate, useLocation } from 'react-router-dom';

/**
 * Routes a student whose registration is still pending to the waiting page.
 *
 * The waiting page is the only thing they can reach. Profile was briefly
 * allowed through on the assumption that a correction request might need acting
 * on, but send-back-for-correction is rejected by the API for anyone who isn't
 * already approved, so a pending student can never have one. Leaving Profile
 * open only gave them a window to edit the very details their approval is being
 * judged on — CGPA and backlog locks don't engage until approval either.
 *
 * Only `pending` is gated. A rejected or blacklisted student keeps the existing
 * behaviour — they land on the dashboard and see the reason on their profile —
 * because telling them they're "being reviewed" would be untrue.
 */
const REACHABLE_WHILE_PENDING = ['/student/waiting'];

export default function StudentApprovalGate({ status }) {
  const { pathname } = useLocation();

  if (status !== 'pending') return null;
  if (REACHABLE_WHILE_PENDING.some((path) => pathname.startsWith(path))) return null;

  return <Navigate to="/student/waiting" replace />;
}

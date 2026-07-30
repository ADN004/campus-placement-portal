import { Navigate, useLocation } from 'react-router-dom';

/**
 * Routes a student whose registration is still pending to the waiting page.
 *
 * Profile is deliberately left reachable. A placement officer can raise a
 * correction request against a student who hasn't been approved yet, and
 * CorrectionGate locks that student out of every page *except* Profile until
 * they fix it. Redirecting Profile here too would bounce them between the two
 * screens with no way to resolve either.
 *
 * Only `pending` is gated. A rejected or blacklisted student keeps the existing
 * behaviour — they land on the dashboard and see the reason on their profile —
 * because telling them they're "being reviewed" would be untrue.
 */
const REACHABLE_WHILE_PENDING = ['/student/waiting', '/student/profile'];

export default function StudentApprovalGate({ status }) {
  const { pathname } = useLocation();

  if (status !== 'pending') return null;
  if (REACHABLE_WHILE_PENDING.some((path) => pathname.startsWith(path))) return null;

  return <Navigate to="/student/waiting" replace />;
}

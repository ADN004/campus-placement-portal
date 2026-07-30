import { Navigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * WaitingPage — shown to a student whose registration is still pending.
 *
 * Deliberately not split into device presenters like the other student pages:
 * it is one centred card with a single message and no interaction, so the same
 * arrangement is correct at every width. It just scales its own type and
 * padding. Splitting it would be three copies of the same thing.
 */
export default function WaitingPage() {
  const { user } = useAuth();

  // Nothing in the app links here — it is reachable only by typing the URL, and
  // it had no guard, so an already-approved student who did that was told their
  // registration was pending. Send anyone who isn't actually waiting to their
  // dashboard. `replace` keeps this page out of the back history.
  const status = user?.profile?.registration_status;
  if (status && status !== 'pending') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return (
    <div className="flex items-center justify-center py-10 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="rounded-spc bg-spc-surface border border-spc-line p-6 sm:p-8 text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-spc-warn-bg mb-5">
            <Clock className="text-spc-warn" size={30} />
          </span>

          <h1 className="text-spc-h1 sm:text-spc-h1-lg font-extrabold text-spc-ink">
            Registration pending approval
          </h1>

          <p className="text-spc-sm text-spc-body mt-3 leading-relaxed">
            Your placement officer is reviewing your registration. You&apos;ll get access to the
            portal as soon as it&apos;s approved.
          </p>

          <div className="rounded-spc-sm bg-spc-teal-soft p-4 mt-6 text-left">
            <p className="flex items-center gap-2 text-spc-label font-bold uppercase text-spc-teal">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>What happens next</span>
            </p>
            <ul className="mt-2.5 space-y-1.5 text-spc-xs text-spc-body list-disc list-inside">
              <li>Your placement officer reviews your details</li>
              <li>You&apos;ll be notified by email once approved</li>
              <li>After approval you can use every part of the portal</li>
            </ul>
          </div>

          <p className="text-spc-xs text-spc-muted mt-6">
            Registered email:{' '}
            <span className="font-semibold text-spc-ink break-all">{user.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

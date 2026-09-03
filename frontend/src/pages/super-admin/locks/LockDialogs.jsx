import { AlertTriangle, UserCheck } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { LOCK_LABELS } from './LocksBody';

/* -------------------------------------------------------------- lock one */

/**
 * Turn a lock on, with an optional note saying why.
 *
 * The reason is optional and worth writing: it is what the next person sees on
 * the row, and "why is this college frozen" is otherwise unanswerable.
 */
export function LockDialog({ target, reason, onReasonChange, onConfirm, onClose, submitting }) {
  const everyCollege = target.collegeId === 'all';
  const label = LOCK_LABELS[target.lockType];

  return (
    <Modal
      onClose={onClose}
      labelledBy="lock-reason-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="lock-reason-title"
        title={`Lock ${label.toLowerCase()}`}
        subtitle={everyCollege ? 'Every college' : target.collegeName}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-4">
        <div className={`flex gap-2.5 p-3 rounded-spc-admin border ${everyCollege
          ? 'bg-spc-bad-bg border-spc-bad/30' : 'bg-spc-warn-bg border-spc-warn/40'}`}>
          <AlertTriangle size={17} aria-hidden="true"
            className={`flex-shrink-0 mt-0.5 ${everyCollege ? 'text-spc-bad' : 'text-spc-warn'}`} />
          <div className="text-spc-xs text-spc-ink">
            {everyCollege && (
              <p className="font-bold mb-1">This reaches every college at once.</p>
            )}
            <p className="font-semibold">
              {target.lockType === 'registration'
                ? 'New student registrations are refused. Already-approved students are unaffected and keep signing in.'
                : 'That college’s placement officer can no longer add or edit PRN ranges.'}
            </p>
            <p className="text-spc-body mt-1">Unlocking takes effect immediately.</p>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="lock-reason">Reason (optional)</FieldLabel>
          <textarea
            id="lock-reason"
            rows="2"
            className={FIELD_CLASS}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Registration deadline (15 July) has passed"
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Shown on the row, so the next person can tell why it is frozen.
          </p>
        </div>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Locking…' : everyCollege ? 'Lock every college' : 'Lock'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------- allowed PRNs */

/**
 * The escape hatch: named PRNs that may register even while the lock is on.
 *
 * Everyone else stays blocked. This exists because a deadline that admits no
 * exceptions turns into an unlock for the whole college, which is worse.
 */
export function AllowedPrnsDialog({ target, text, onTextChange, onSave, onClose, saving }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="allow-prns-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="allow-prns-title"
        title="PRNs let through the lock"
        subtitle={target.collegeName}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-surface-2
          border border-spc-line-strong">
          <UserCheck size={17} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />
          <p className="text-spc-xs text-spc-ink">
            Registration is locked for this college. Every PRN listed here can still register;
            everyone else stays blocked.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="allowed-prns">The PRNs</FieldLabel>
          <textarea
            id="allowed-prns"
            rows="4"
            className={`${FIELD_CLASS} font-mono`}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="e.g. 2401031856, 2401031999"
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Separate them with commas, spaces or new lines. Clearing the box blocks everyone again.
          </p>
        </div>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save the list'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

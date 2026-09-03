import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  Panel, PanelHeading, FieldLabel, FIELD_CLASS,
  PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/**
 * Who may edit their CGPA, and until when.
 *
 * Semester CGPA is locked by default so a student cannot quietly improve their
 * marks the week a drive opens. Results day is the exception: the lock comes off
 * for a stated number of days, every approved student is notified, and it goes
 * back on by itself.
 *
 * Two scopes, and they are separate switches: one college, or all sixty. They
 * were adjacent buttons of the same size before, which is how you unlock the
 * state by meaning to unlock a college.
 */

/** A window's end, spelled out — "expires" with no date is not information. */
function windowEnd(window) {
  if (!window?.unlock_end) return null;
  return new Date(window.unlock_end).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function CgpaPanel({
  layout, colleges, selectedCollege, onSelectCollege,
  locked, unlockWindow, globalUnlocked, globalWindow,
  onUnlockOne, onLockOne, onUnlockAll, onLockAll, processing,
}) {
  const oneEnd = windowEnd(unlockWindow);
  const allEnd = windowEnd(globalWindow);
  const stacked = layout !== 'desktop';

  return (
    <Panel className="mb-4">
      <PanelHeading>CGPA editing</PanelHeading>

      <div className={`p-4 grid gap-4 ${stacked ? 'grid-cols-1' : 'grid-cols-2 divide-x divide-spc-line'}`}>
        {/* ------------------------------------------------------ one college */}
        <div className={stacked ? '' : 'pr-4'}>
          <FieldLabel htmlFor="cgpa-college">One college</FieldLabel>
          <select
            id="cgpa-college"
            className={FIELD_CLASS}
            value={selectedCollege}
            onChange={(e) => onSelectCollege(e.target.value)}
          >
            <option value="">Choose a college…</option>
            {colleges.map((c) => <option key={c.id} value={c.id}>{c.college_name}</option>)}
          </select>

          {selectedCollege ? (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className={`text-spc-xs font-bold ${locked ? 'text-spc-bad' : 'text-spc-ok'}`}>
                {locked ? 'Locked' : 'Unlocked'}
              </span>
              {!locked && oneEnd && (
                <span className="text-spc-xs text-spc-body">until {oneEnd}</span>
              )}
              {locked ? (
                <PrimaryButton onClick={onUnlockOne} disabled={processing}>
                  <Unlock size={15} aria-hidden="true" />
                  Unlock
                </PrimaryButton>
              ) : (
                <DangerButton onClick={onLockOne} disabled={processing}>
                  <Lock size={15} aria-hidden="true" />
                  Lock now
                </DangerButton>
              )}
            </div>
          ) : (
            <p className="text-spc-xs text-spc-body mt-2">
              Pick one to see whether its students can edit their CGPA.
            </p>
          )}
        </div>

        {/* ---------------------------------------------------- all colleges */}
        <div className={stacked ? 'pt-4 border-t border-spc-line' : 'pl-4'}>
          {/* Not a <label>: there is no single control for it to name. */}
          <p className="text-spc-label font-bold uppercase text-spc-body mb-1.5">Every college</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-spc-xs font-bold ${globalUnlocked ? 'text-spc-ok' : 'text-spc-bad'}`}>
              {globalUnlocked ? 'Unlocked for all' : 'Locked for all'}
            </span>
            {globalUnlocked && allEnd && (
              <span className="text-spc-xs text-spc-body">until {allEnd}</span>
            )}
          </div>
          <div className="mt-3">
            {globalUnlocked ? (
              <DangerButton onClick={onLockAll} disabled={processing}>
                <Lock size={15} aria-hidden="true" />
                Lock all colleges
              </DangerButton>
            ) : (
              <SecondaryButton onClick={onUnlockAll} disabled={processing}>
                <Unlock size={15} aria-hidden="true" />
                Unlock all colleges
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/**
 * How long the window stays open, and why.
 *
 * The duration is bounded 1–30 days by the same rule the handler enforces, so
 * the field cannot ask for something that will be refused after the click.
 */
export function CgpaUnlockDialog({
  globalMode, days, onDays, reason, onReason, onConfirm, onClose, processing,
}) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="cgpa-unlock-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="cgpa-unlock-title"
        title={globalMode ? 'Unlock CGPA for every college' : 'Unlock CGPA editing'}
        subtitle={globalMode
          ? 'All approved students, across all sixty colleges'
          : 'Approved students in the chosen college'}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-4">
        <p className="text-spc-xs text-spc-body">
          They will be able to update their semester CGPA for as long as the window is open, and
          every approved student in scope is notified that it has opened.
        </p>

        {globalMode && (
          <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
            <AlertTriangle size={17} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />
            <p className="text-spc-xs text-spc-ink font-semibold">
              This is every college at once, and every approved student gets the notification.
            </p>
          </div>
        )}

        <div>
          <FieldLabel htmlFor="unlock-days">Open for (days)</FieldLabel>
          <input
            id="unlock-days"
            type="number"
            min="1"
            max="30"
            className={FIELD_CLASS}
            value={days}
            onChange={(e) => onDays(parseInt(e.target.value, 10) || 1)}
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Between 1 and 30. It re-locks on its own when the window ends.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="unlock-reason">Reason (optional)</FieldLabel>
          <input
            id="unlock-reason"
            type="text"
            className={FIELD_CLASS}
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            placeholder="e.g. Semester 4 results published"
          />
        </div>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Opening…' : `Unlock for ${days} ${days === 1 ? 'day' : 'days'}`}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

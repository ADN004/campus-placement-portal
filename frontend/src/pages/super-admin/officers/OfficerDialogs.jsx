import { AlertTriangle, Key } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/* -------------------------------------------------------------------- add */

/**
 * Appoint an officer to a college.
 *
 * The consequence is stated before the button rather than after it: a college
 * already holding an officer loses them to history, and their login stops
 * working, the moment this is submitted.
 */
export function AddOfficerDialog({ form, onChange, colleges, onSubmit, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="add-officer-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="add-officer-title"
        title="Add a placement officer"
        subtitle="They sign in with their phone number"
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
        <AdminDialogBody className="space-y-4">
          <div>
            <FieldLabel htmlFor="officer-college">College *</FieldLabel>
            <select
              id="officer-college"
              className={FIELD_CLASS}
              value={form.college_id}
              onChange={(e) => onChange({ college_id: e.target.value })}
              required
            >
              <option value="">Choose a college…</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.college_name || college.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="officer-name">Officer name *</FieldLabel>
            <input
              id="officer-name"
              type="text"
              className={FIELD_CLASS}
              value={form.officer_name}
              onChange={(e) => onChange({ officer_name: e.target.value })}
              placeholder="Their full name"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="officer-phone">Phone number *</FieldLabel>
            <input
              id="officer-phone"
              type="text"
              className={FIELD_CLASS}
              value={form.phone_number}
              onChange={(e) => onChange({ phone_number: e.target.value })}
              placeholder="What they will sign in with"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="officer-designation">Designation</FieldLabel>
            <input
              id="officer-designation"
              type="text"
              className={FIELD_CLASS}
              value={form.designation}
              onChange={(e) => onChange({ designation: e.target.value })}
              placeholder="e.g. Placement Coordinator"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="officer-email">Their email</FieldLabel>
              <input
                id="officer-email"
                type="email"
                className={FIELD_CLASS}
                value={form.officer_email}
                onChange={(e) => onChange({ officer_email: e.target.value })}
                placeholder="officer@example.com"
              />
            </div>
            <div>
              <FieldLabel htmlFor="officer-college-email">The college&apos;s email</FieldLabel>
              <input
                id="officer-college-email"
                type="email"
                className={FIELD_CLASS}
                value={form.college_email}
                onChange={(e) => onChange({ college_email: e.target.value })}
                placeholder="college@example.com"
              />
            </div>
          </div>

          <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
            <AlertTriangle size={17} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />
            <p className="text-spc-xs text-spc-ink font-semibold">
              If this college already has an active officer, they move to history and their
              login stops working the moment this is saved.
            </p>
          </div>
        </AdminDialogBody>

        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add officer'}
          </PrimaryButton>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------- remove */

export function RemoveOfficerDialog({ officer, onConfirm, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="remove-officer-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="remove-officer-title"
        title="Remove this officer"
        subtitle={`${officer.officer_name} · ${officer.college_name}`}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-3">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />
          <div className="text-spc-xs text-spc-ink">
            <p className="font-semibold">Their tenure ends.</p>
            <ul className="list-disc ml-4 mt-1.5 space-y-1 text-spc-body">
              <li>The account is deactivated and they can no longer sign in.</li>
              <li>Their details move to this college&apos;s officer history.</li>
              <li>The college&apos;s seat is freed, so a replacement can be appointed.</li>
            </ul>
          </div>
        </div>
        <p className="text-spc-xs text-spc-body">
          To block someone temporarily while they keep the seat, suspend them instead.
        </p>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Removing…' : 'Remove officer'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------- clear history */

/**
 * Delete a college's whole line of succession.
 *
 * Typing DELETE is the guard, and it is the right guard here: this is the only
 * action on the page that destroys records rather than changing a state.
 */
export function ClearHistoryDialog({ officer, confirmText, onConfirmText, onConfirm, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="clear-history-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="clear-history-title"
        title="Clear this college's officer history"
        subtitle={officer.college_name}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <div className="text-spc-xs text-spc-ink">
            <p className="font-semibold">This cannot be undone.</p>
            <ul className="list-disc ml-4 mt-1.5 space-y-1 text-spc-body">
              <li>Every past officer record for this college.</li>
              <li>Their appointment dates.</li>
              <li>Why each one was removed.</li>
            </ul>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="clear-history-confirm">Type DELETE to confirm *</FieldLabel>
          <input
            id="clear-history-confirm"
            type="text"
            className={`${FIELD_CLASS} font-mono`}
            value={confirmText}
            onChange={(e) => onConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={submitting || confirmText !== 'DELETE'}>
          {submitting ? 'Clearing…' : 'Delete the history'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* --------------------------------------------------------- reset password */

export function ResetPasswordDialog({ officer, onConfirm, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="reset-password-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="reset-password-title"
        title="Reset this officer's password"
        subtitle={`${officer.officer_name} · ${officer.college_name}`}
        onClose={onClose}
      />

      <div className="px-5 py-4">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-surface-2
          border border-spc-line-strong">
          <Key size={17} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />
          <div className="text-spc-xs text-spc-ink">
            <p className="font-semibold">
              Their password becomes <span className="font-mono">123</span>.
            </p>
            <ul className="list-disc ml-4 mt-1.5 space-y-1 text-spc-body">
              <li>They sign in with their phone number and that password.</li>
              <li>Nothing else about them or their college changes.</li>
              <li>Tell them to change it as soon as they are in.</li>
            </ul>
          </div>
        </div>
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Resetting…' : 'Reset the password'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

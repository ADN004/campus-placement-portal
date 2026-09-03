import { AlertTriangle, Check, X } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * Create a super-admin account.
 *
 * The password rules the server actually enforces are these four, and they are
 * shown as they are met rather than as a sentence under the field. The page used
 * to describe all four in its hint while only checking the length itself, so a
 * password of eight lowercase letters passed here and was refused by the server
 * a round trip later.
 */
export const PASSWORD_RULES = [
  ['At least 8 characters', (p) => p.length >= 8],
  ['An uppercase letter', (p) => /[A-Z]/.test(p)],
  ['A lowercase letter', (p) => /[a-z]/.test(p)],
  ['A number', (p) => /[0-9]/.test(p)],
];

export default function AddAdminDialog({ form, onChange, onSubmit, onClose, processing }) {
  const checks = PASSWORD_RULES.map(([label, test]) => [label, test(form.password)]);
  const allMet = checks.every(([, met]) => met);

  return (
    <Modal
      onClose={onClose}
      labelledBy="add-super-admin-title"
      panelClassName={adminPanel('md', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="add-super-admin-title"
        title="Add a super admin"
        subtitle="Unrestricted access to the whole portal"
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
        <AdminDialogBody className="space-y-4">
          <div>
            <FieldLabel htmlFor="admin-email">Email *</FieldLabel>
            <input
              id="admin-email"
              type="email"
              className={FIELD_CLASS}
              value={form.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="admin@example.com"
              required
            />
            <p className="text-spc-xs text-spc-body mt-1.5">
              What they will sign in with.
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="admin-password">Password *</FieldLabel>
            <input
              id="admin-password"
              type="password"
              className={FIELD_CLASS}
              value={form.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="Set their first password"
              autoComplete="new-password"
              required
            />
            <ul className="mt-2 space-y-1">
              {checks.map(([label, met]) => (
                <li key={label} className="flex items-center gap-2">
                  {met
                    ? <Check size={14} aria-hidden="true" className="text-spc-ok flex-shrink-0" />
                    : <X size={14} aria-hidden="true" className="text-spc-body flex-shrink-0" />}
                  <span className={`text-spc-xs ${met ? 'text-spc-ink' : 'text-spc-body'}`}>
                    {label}
                  </span>
                  <span className="sr-only">{met ? ' — met' : ' — not yet met'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
            <AlertTriangle size={17} aria-hidden="true" className="text-spc-warn flex-shrink-0 mt-0.5" />
            <p className="text-spc-xs text-spc-ink font-semibold">
              A super admin can see and change everything in the portal — every student,
              every college, the database backups. Only create one for someone you trust with all
              of it.
            </p>
          </div>
        </AdminDialogBody>

        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={processing || !form.email || !allMet}>
            {processing ? 'Creating…' : 'Create super admin'}
          </PrimaryButton>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

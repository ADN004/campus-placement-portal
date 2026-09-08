import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Mail, Save } from 'lucide-react';
import Modal from './Modal';
import PromptShell from './student/PromptShell';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from './admin/AdminDialog';
import { PrimaryButton, SecondaryButton } from './admin/AdminUI';
import GoogleEmailButton from './GoogleEmailButton';
import usePortalMode from '../hooks/usePortalMode';

/**
 * Update a student's email address (self-service or staff-assisted).
 *
 * Changing the email always restarts verification: the backend regenerates
 * the token and emails a fresh link to the new address. The Google account
 * picker is offered so the corrected address is typo-proof, with manual
 * entry always available.
 *
 * Three roles open this same modal, so it takes a `variant`:
 *
 *   'spc'    — the student design system (PromptShell), and the default:
 *              officers open this from their student list and get the same
 *              shell, so only Console needs to say so.
 *   'admin'  — Console, for super admin.
 *
 * Only the *shell* differs. The fields between them are written once, in
 * `EmailFields`, against the role-neutral `spc-*` tokens — those resolve
 * through whichever role scope class is on the page, so the same markup is
 * correct in all three. Duplicating the form per variant is how the Google
 * button ends up wired in one of them and not the others.
 *
 * Props:
 *   currentEmail  — shown for reference
 *   studentName   — optional, shown in staff mode
 *   onSubmit      — async (email) => void; throws on failure (parent's API call)
 *   onClose       — close without changes
 */
/**
 * The fields, written once.
 *
 * Everything here is a role-neutral `spc-*` token, so it resolves correctly
 * under `.spc-student`, `.spc-officer` or `.spc-admin` without knowing which
 * one it is standing in.
 */
function EmailFields({ studentName, currentEmail, email, setEmail, submitting, clientId }) {
  return (
    <>
      <div className="rounded-spc bg-spc-surface-2 border border-spc-line px-4 py-3">
        {studentName && (
          <p className="text-spc-sm font-bold text-spc-ink mb-0.5">{studentName}</p>
        )}
        <p className="text-spc-label font-bold uppercase text-spc-muted">Current email</p>
        <p className="text-spc-sm font-semibold text-spc-ink mt-0.5 break-all">{currentEmail}</p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="new-student-email"
          className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5"
        >
          New email address
        </label>
        <input
          id="new-student-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correct.email@example.com"
          disabled={submitting}
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm
            border border-spc-control outline-none transition-colors
            focus:border-spc-accent focus:ring-2 focus:ring-spc-accent/25 disabled:opacity-60"
        />
        <GoogleEmailButton
          clientId={clientId}
          onEmail={({ email: googleEmail }) => setEmail(googleEmail)}
        />
      </div>

      <p className="text-spc-xs text-spc-muted mt-4 leading-relaxed">
        Your new address has to be verified before you can sign in with it, so
        check that inbox after saving.
      </p>
    </>
  );
}

export default function UpdateStudentEmailModal({
  currentEmail,
  studentName,
  onSubmit,
  onClose,
  variant = 'spc',
}) {
  const admin = variant === 'admin';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const portalMode = usePortalMode();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter or choose the new email address');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed.toLowerCase());
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update email');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = (
    <EmailFields
      studentName={studentName}
      currentEmail={currentEmail}
      email={email}
      setEmail={setEmail}
      submitting={submitting}
      clientId={portalMode.googleClientId}
    />
  );

  if (admin) {
    return (
      <Modal
        onClose={onClose}
        labelledBy="update-email-title"
        panelClassName={adminPanel('md', { scroll: true })}
        overlayClassName={ADMIN_OVERLAY}
      >
        <AdminDialogHeader
          id="update-email-title"
          title="Change the email address"
          subtitle="A fresh verification link goes to the new one"
          onClose={onClose}
        />
        <AdminDialogBody>{fields}</AdminDialogBody>
        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={submitting || !email.trim()}>
            {submitting ? 'Updating…' : 'Update email'}
          </PrimaryButton>
        </AdminDialogFooter>
      </Modal>
    );
  }

  // The student shell is the fallback: officers open this from their
  // student list and get the same one, so only Console differs.
  return (
    <PromptShell
      onClose={onClose}
      labelledBy="update-email-title"
      title="Change your email address"
      eyebrow="We'll send a fresh verification link"
      icon={Mail}
      primary={{
        label: submitting ? 'Updating…' : 'Update email',
        onClick: handleSubmit,
        disabled: submitting || !email.trim(),
      }}
      secondary={{ label: 'Cancel', onClick: onClose, disabled: submitting }}
    >
      {fields}
    </PromptShell>
  );

}

import { AlertTriangle, ShieldCheck, UserRound } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, PrimaryButton, SecondaryButton, DangerButton, formatDate,
} from '../../../components/admin/AdminUI';
import { StatusMark } from './studentsShared';

/**
 * The dialogs the register opens, all on `components/Modal.jsx` — which brings
 * the focus trap, Escape, the scroll lock and focus restore the hand-rolled
 * overlays here did not have. The page kept its own `useEffect` to lock body
 * scroll for one of the five; the primitive does it for all of them.
 *
 * Each destructive one says what actually happens, because "Are you sure?" is
 * not information.
 */

/* ------------------------------------------------------------ view details */

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5
      border-b border-spc-line last:border-b-0">
      <dt className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body flex-shrink-0">
        {label}
      </dt>
      <dd className="text-spc-sm text-spc-ink text-right min-w-0 break-words">
        {value === null || value === undefined || value === '' ? '—' : value}
      </dd>
    </div>
  );
}

/**
 * A student's record.
 *
 * The photograph leads, and its absence is stated rather than drawn as a grey
 * box: students who registered before photographs were required have none, and
 * that is a fact about the record, not a loading state.
 */
export function DetailsDialog({ student, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="student-details-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="student-details-title"
        title={student.name}
        subtitle={`${student.prn} · ${student.college_name}`}
        onClose={onClose}
      />
      <AdminDialogBody className="px-0 py-0">
        <div className="flex justify-center py-5 border-b border-spc-line">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={`Photograph of ${student.name}`}
              className="w-32 h-32 object-cover rounded-spc-admin border border-spc-line-strong"
            />
          ) : (
            <div className="w-32 h-32 rounded-spc-admin border border-spc-line-strong bg-spc-surface-2
              flex flex-col items-center justify-center gap-1.5">
              <UserRound size={40} aria-hidden="true" className="text-spc-body" />
              <span className="text-spc-xs font-bold text-spc-body">No photograph</span>
            </div>
          )}
        </div>

        <dl>
          <Fact label="PRN" value={student.prn} />
          <Fact label="Name" value={student.name} />
          <Fact label="Email" value={student.email} />
          <Fact label="Mobile" value={student.mobile_number} />
          <Fact label="College" value={student.college_name} />
          <Fact label="Region" value={student.region_name} />
          <Fact label="Branch" value={student.branch} />
          <Fact label="Programme CGPA" value={student.programme_cgpa} />
          <Fact label="Backlogs" value={student.backlog_count} />
          <Fact
            label="Date of birth"
            value={student.date_of_birth ? formatDate(student.date_of_birth) : null}
          />
          <Fact label="Status" value={<StatusMark student={student} />} />
          {student.is_blacklisted && student.blacklist_reason && (
            <Fact label="Blacklisted because" value={student.blacklist_reason} />
          )}
        </dl>
      </AdminDialogBody>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------------- delete */

export function DeleteDialog({ student, onConfirm, onClose, deleting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="delete-student-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="delete-student-title"
        title="Delete this student"
        subtitle={`${student.name} · ${student.prn}`}
        onClose={onClose}
      />
      <div className="px-5 py-4 space-y-3">
        <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          <p className="text-spc-xs text-spc-body break-words">{student.email}</p>
        </div>
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-spc-xs text-spc-ink font-semibold">
              The account, the profile and every application go with it. This cannot be undone.
            </p>
            <p className="text-spc-xs text-spc-body mt-1">
              The PRN is freed — they can register again with it from scratch. To bar a student
              while keeping their record, blacklist them instead.
            </p>
          </div>
        </div>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={deleting}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete permanently'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* -------------------------------------------------------------- blacklist */

export function BlacklistDialog({ student, reason, onReasonChange, onConfirm, onClose, processing }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="blacklist-student-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="blacklist-student-title"
        title="Blacklist this student"
        subtitle={`${student.name} · ${student.prn}`}
        onClose={onClose}
      />
      <div className="px-5 py-4 space-y-4">
        <div>
          <FieldLabel htmlFor="blacklist-reason">Reason *</FieldLabel>
          <textarea
            id="blacklist-reason"
            rows="4"
            className={FIELD_CLASS}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Why is this student being barred?"
            required
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Kept on the record, and shown to the officer who asks for them to be whitelisted.
          </p>
        </div>
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <p className="text-spc-xs text-spc-ink font-semibold">
            They can no longer apply to any drive, until whitelisted.
          </p>
        </div>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Blacklisting…' : 'Blacklist'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* -------------------------------------------------------------- whitelist */

export function WhitelistDialog({ student, onConfirm, onClose, processing }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="whitelist-student-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="whitelist-student-title"
        title="Remove the blacklist"
        subtitle={`${student.name} · ${student.prn}`}
        onClose={onClose}
      />
      <div className="px-5 py-4">
        {student.blacklist_reason && (
          <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong mb-3">
            <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">
              Blacklisted because
            </p>
            <p className="text-spc-sm text-spc-ink break-words">{student.blacklist_reason}</p>
          </div>
        )}
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-ok-bg border border-spc-ok/30">
          <ShieldCheck size={17} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
          <p className="text-spc-xs text-spc-ink font-semibold">
            The blacklist is lifted and they can apply for drives again.
          </p>
        </div>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Whitelisting…' : 'Whitelist'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------- correction */

/**
 * Ask an approved student to fix something.
 *
 * This does not un-approve anyone and does not sign them out — the copy says so,
 * because "send back for correction" reads like a rejection and is not one.
 */
export function CorrectionDialog({
  student, note, onNoteChange, requirePhoto, onRequirePhotoChange, onConfirm, onClose, submitting,
}) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="correction-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="correction-title"
        title="Send back for correction"
        subtitle={`${student.name || student.student_name} · ${student.prn}`}
        onClose={onClose}
      />
      <div className="px-5 py-4 space-y-4">
        <p className="text-spc-xs text-spc-body">
          They stay approved and stay signed in — they are simply asked to fix what you note
          below. No re-approval is needed once they have.
        </p>

        <div>
          <FieldLabel htmlFor="correction-note">What should they correct? *</FieldLabel>
          <textarea
            id="correction-note"
            rows="3"
            className={FIELD_CLASS}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. Your branch is wrong, and your photo is not a clear passport photo — please fix both."
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            The student sees exactly this, so say what to change.
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-spc-admin bg-spc-warn-bg
          border border-spc-warn/40 cursor-pointer">
          <input
            type="checkbox"
            checked={requirePhoto}
            onChange={(e) => onRequirePhotoChange(e.target.checked)}
            className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0`}
          />
          <span>
            <span className="block text-spc-sm font-bold text-spc-ink">
              Take down their photograph and require a new one
            </span>
            <span className="block text-spc-xs text-spc-ink mt-0.5">
              The current one is removed immediately — for a wrong or inappropriate image — and they
              must upload a replacement before they can mark the correction done.
            </span>
          </span>
        </label>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={submitting || !note.trim()}>
          {submitting ? 'Sending…' : 'Send for correction'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

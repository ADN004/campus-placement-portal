import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/** Approving a request, which posts the drive to students. */
export function ApproveDialog({ request, onConfirm, onClose, processing }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="approve-request-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="approve-request-title"
        title="Approve this request"
        subtitle={`${request.job_title} · ${request.company_name}`}
        onClose={onClose}
      />
      <div className="px-5 py-4">
        <p className="text-spc-sm text-spc-body">
          The drive is posted as soon as this is approved, and becomes visible to every student
          it targets.
        </p>
        <p className="text-spc-xs text-spc-body mt-2">
          Asked for by {request.officer_name} at {request.college_name}.
        </p>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Approving…' : 'Approve and post'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/**
 * Rejecting a request, which needs a reason.
 *
 * The reason is the whole point of this dialog: the officer who asked sees it,
 * and "rejected" with nothing beside it tells them nothing about what to change.
 */
export function RejectDialog({ request, reason, onReasonChange, onConfirm, onClose, processing }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="reject-request-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="reject-request-title"
        title="Reject this request"
        subtitle={`${request.job_title} · ${request.company_name}`}
        onClose={onClose}
      />
      <div className="px-5 py-4 space-y-4">
        <div>
          <FieldLabel htmlFor="reject-reason">Reason *</FieldLabel>
          <textarea
            id="reject-reason"
            rows="3"
            className={FIELD_CLASS}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="What would need to change for this to be approved?"
            required
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            {request.officer_name} sees this, so say what would need to change.
          </p>
        </div>

        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <p className="text-spc-xs text-spc-ink font-semibold">
            The drive will not be posted. The officer can submit a new request.
          </p>
        </div>
      </div>
      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={processing}>Cancel</SecondaryButton>
        <DangerButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Rejecting…' : 'Reject request'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

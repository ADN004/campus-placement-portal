import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { StatusMark, formatMoment } from './WhitelistBody';

/* ------------------------------------------------------------ the details */

function Row({ label, value }) {
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

function Prose({ label, children, tone }) {
  const box = tone === 'bad' ? 'bg-spc-bad-bg border-spc-bad/30'
    : tone === 'ok' ? 'bg-spc-ok-bg border-spc-ok/30'
      : 'bg-spc-surface-2 border-spc-line-strong';
  return (
    <div className={`p-3 rounded-spc-admin border ${box}`}>
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1">{label}</p>
      <div className="text-spc-sm text-spc-ink break-words whitespace-pre-line">{children}</div>
    </div>
  );
}

/**
 * The whole request.
 *
 * Approve and Reject stay in the footer for a pending request, so a decision can
 * be made from here without going back to the list — the same two controls the
 * old dialog carried.
 */
export function DetailsDialog({ request, onApprove, onReject, onClose }) {
  const pending = request.status === 'pending';
  const reviewed = request.status === 'approved' || request.status === 'rejected';

  return (
    <Modal
      onClose={onClose}
      labelledBy="whitelist-details-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="whitelist-details-title"
        title={request.student_name}
        subtitle={`Request #${request.id} · ${request.student_prn}`}
        onClose={onClose}
      />

      <AdminDialogBody className="px-0 py-0">
        <dl>
          <Row label="Status" value={<StatusMark status={request.status} />} />
          <Row label="PRN" value={request.student_prn} />
          <Row label="Email" value={request.student_email} />
          <Row label="Branch" value={request.student_branch} />
          <Row label="College" value={request.college_name} />
          <Row label="Region" value={request.region_name} />
          <Row label="Asked for by" value={request.officer_name} />
          <Row label="Officer's email" value={request.officer_email} />
          <Row label="Requested" value={formatMoment(request.created_at)} />
        </dl>

        <div className="px-5 py-4 space-y-3 border-t border-spc-line">
          <SectionLabel>The case</SectionLabel>

          <Prose label="Barred because" tone="bad">
            {request.blacklist_reason || '—'}
            {(request.blacklisted_at || request.blacklisted_by) && (
              <span className="block text-spc-xs text-spc-body mt-2">
                {request.blacklisted_at && <>Barred {formatMoment(request.blacklisted_at)}</>}
                {request.blacklisted_at && request.blacklisted_by_name && ' · '}
                {request.blacklisted_by && request.blacklisted_by_name
                  && <>by {request.blacklisted_by_name}</>}
              </span>
            )}
          </Prose>

          <Prose label="The officer's case" tone="ok">
            {request.whitelist_reason || '—'}
          </Prose>

          {reviewed && (
            <Prose
              label={request.status === 'approved' ? 'Approved' : 'Refused'}
              tone={request.status === 'approved' ? 'ok' : 'bad'}
            >
              {request.review_comment || 'No comment was left.'}
              {(request.reviewed_by_name || request.reviewed_at) && (
                <span className="block text-spc-xs text-spc-body mt-2">
                  {request.reviewed_by_name && <>by {request.reviewed_by_name}</>}
                  {request.reviewed_by_name && request.reviewed_at && ' · '}
                  {request.reviewed_at && formatMoment(request.reviewed_at)}
                </span>
              )}
            </Prose>
          )}
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        {pending && (
          <>
            <DangerButton onClick={() => onReject(request)}>Reject</DangerButton>
            <PrimaryButton onClick={() => onApprove(request)}>Approve</PrimaryButton>
          </>
        )}
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------- the action */

/**
 * Approve or refuse, with a comment.
 *
 * The comment is optional on an approval and required on a refusal — the officer
 * has to be told what to do differently, and the handler refuses without one.
 * The consequence of each is stated, because "Approve" alone does not say that
 * the student's account comes back.
 */
export function ActionDialog({
  request, action, comment, onCommentChange, onConfirm, onClose,
}) {
  const approving = action === 'approve';

  return (
    <Modal
      onClose={onClose}
      labelledBy="whitelist-action-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="whitelist-action-title"
        title={approving ? 'Let this student back in' : 'Refuse this request'}
        subtitle={`${request.student_name} · ${request.student_prn}`}
        onClose={onClose}
      />

      <div className="px-5 py-4 space-y-4">
        <div>
          <FieldLabel htmlFor="review-comment">
            {approving ? 'Comment (optional)' : 'Reason *'}
          </FieldLabel>
          <textarea
            id="review-comment"
            rows="4"
            className={FIELD_CLASS}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={approving
              ? 'Anything worth recording about this decision…'
              : 'What would have to change for this to be approved?'}
            required={!approving}
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            {approving
              ? 'Kept on the request, alongside your name and the date.'
              : 'The officer who asked sees this, so say what to do differently.'}
          </p>
        </div>

        {approving ? (
          <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-ok-bg border border-spc-ok/30">
            <ShieldCheck size={17} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
            <p className="text-spc-xs text-spc-ink font-semibold">
              The blacklist is lifted and the account is restored — they can apply for drives again.
            </p>
          </div>
        ) : (
          <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
            <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
            <p className="text-spc-xs text-spc-ink font-semibold">
              The student stays barred, and the officer who asked is notified.
            </p>
          </div>
        )}
      </div>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        {approving ? (
          <PrimaryButton onClick={onConfirm}>Approve request</PrimaryButton>
        ) : (
          <DangerButton onClick={onConfirm}>Reject request</DangerButton>
        )}
      </AdminDialogFooter>
    </Modal>
  );
}

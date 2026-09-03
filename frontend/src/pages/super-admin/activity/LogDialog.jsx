import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import { SectionLabel, PrimaryButton } from '../../../components/admin/AdminUI';
import { ActionMark, RoleMark, formatMoment, readableMetadata } from './activityShared';

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

/**
 * One log entry, in full.
 *
 * The metadata is whatever the action chose to record, so it is shown as
 * formatted JSON rather than interpreted — an audit trail that paraphrases is
 * not one.
 */
export default function LogDialog({ log, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="activity-log-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="activity-log-title"
        title={log.action_type?.replace(/_/g, ' ') || 'Activity'}
        subtitle={`Entry #${log.id} · ${formatMoment(log.created_at)}`}
        onClose={onClose}
      />

      <AdminDialogBody className="px-0 py-0">
        <dl>
          <Row label="Action" value={<ActionMark actionType={log.action_type} />} />
          <Row label="Who" value={log.user_name || 'System'} />
          <Row label="Email" value={log.user_email} />
          <Row label="Role" value={<RoleMark role={log.user_role} />} />
          <Row label="User id" value={log.user_id} />
          <Row label="When" value={formatMoment(log.created_at)} />
          {log.ip_address && <Row label="IP address" value={log.ip_address} />}
          {log.target_type && <Row label="Target" value={log.target_type} />}
          {log.target_type && <Row label="Target id" value={log.target_id} />}
        </dl>

        {log.description && (
          <div className="px-5 py-4 border-t border-spc-line">
            <SectionLabel>Description</SectionLabel>
            <p className="text-spc-sm text-spc-ink break-words whitespace-pre-line">
              {log.description}
            </p>
          </div>
        )}

        {log.metadata && (
          <div className="px-5 py-4 border-t border-spc-line">
            <SectionLabel>Recorded with it</SectionLabel>
            <pre className="p-3 rounded-spc-admin-sm bg-spc-surface-2 border border-spc-line-strong
              text-spc-xs text-spc-ink font-mono overflow-x-auto whitespace-pre-wrap break-words">
              {readableMetadata(log.metadata)}
            </pre>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <PrimaryButton onClick={onClose}>Close</PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

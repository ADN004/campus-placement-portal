import { History, Eye, User, Trash2, Phone, Mail } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, EmptyState, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { OfficerStanding, RecordStanding, formatDay } from './officersShared';

/* ---------------------------------------------------------------- details */

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
 * One officer's record.
 *
 * The standing shown here is the same three-state one the row behind it uses.
 * It used to be a different, two-state function reading a different column, so a
 * suspended officer's own record said "Active" — which is the one thing you open
 * this dialog to check.
 *
 * Super admins cannot upload or delete an officer's photograph; officers manage
 * their own. So the photograph is shown and openable, and nothing more.
 */
export function DetailsDialog({ officer, onViewPhoto, onViewHistory, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="officer-details-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="officer-details-title"
        title={officer.officer_name || 'Placement officer'}
        subtitle={officer.college_name}
        onClose={onClose}
      />

      <AdminDialogBody className="px-0 py-0">
        <div className="flex items-start gap-4 p-5 border-b border-spc-line">
          {officer.photo_url ? (
            <button
              type="button"
              onClick={() => onViewPhoto(officer.photo_url)}
              aria-label={`Open ${officer.officer_name}'s photograph full size`}
              title="Open full size"
              className="flex-shrink-0 rounded-spc-admin overflow-hidden
                border border-spc-line-strong hover:border-spc-accent transition-colors"
            >
              <img
                src={officer.photo_url}
                alt={`Photograph of ${officer.officer_name}`}
                className="w-28 h-28 object-cover block"
              />
            </button>
          ) : (
            <div className="w-28 h-28 flex-shrink-0 rounded-spc-admin bg-spc-surface-2
              border border-spc-line-strong flex items-center justify-center">
              <User size={36} aria-hidden="true" className="text-spc-body" />
            </div>
          )}

          <div className="min-w-0">
            <OfficerStanding officer={officer} />
            {officer.photo_url ? (
              <>
                <SecondaryButton
                  onClick={() => onViewPhoto(officer.photo_url)}
                  className="mt-2"
                >
                  <Eye size={15} aria-hidden="true" />
                  Open photograph
                </SecondaryButton>
                {officer.photo_uploaded_at && (
                  <p className="text-spc-xs text-spc-body mt-1.5">
                    Uploaded {formatDay(officer.photo_uploaded_at)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-spc-xs text-spc-body mt-2">No photograph uploaded.</p>
            )}
            <p className="text-spc-xs text-spc-body mt-1.5">
              Officers manage their own photograph from their dashboard.
            </p>
          </div>
        </div>

        <dl>
          <Row label="Name" value={officer.officer_name} />
          <Row label="Phone" value={officer.phone_number} />
          <Row label="Email" value={officer.officer_email} />
          <Row label="College" value={officer.college_name} />
          <Row label="Region" value={officer.region_name} />
          <Row label="Appointed" value={officer.created_at ? formatDay(officer.created_at) : null} />
          <Row label="Last updated" value={officer.updated_at ? formatDay(officer.updated_at) : null} />
        </dl>

        <div className="px-5 py-4 border-t border-spc-line">
          <SectionLabel>Record ids</SectionLabel>
          <p className="text-spc-xs text-spc-body font-mono tabular-nums break-words">
            officer {officer.id ?? '—'} · user {officer.user_id ?? '—'}
            {' · '}college {officer.college_id ?? '—'} · region {officer.region_id ?? '—'}
          </p>
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={() => onViewHistory(officer)}>
          <History size={15} aria-hidden="true" />
          History
        </SecondaryButton>
        <PrimaryButton onClick={onClose}>Close</PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ---------------------------------------------------------------- history */

/**
 * Who has held this college's seat before.
 *
 * The history is per college, not per officer — it is the college's line of
 * succession — so the dialog is titled by the college.
 *
 * The phone and email icons here were swapped: a phone beside the email address
 * and an envelope beside the phone number.
 */
export function HistoryDialog({ officer, history, loading, onClearHistory, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="officer-history-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="officer-history-title"
        title="Officer history"
        subtitle={officer.college_name}
        onClose={onClose}
      />

      <AdminDialogBody>
        {loading ? (
          <p className="px-4 py-12 text-center text-spc-sm text-spc-body font-medium"
            aria-live="polite">
            Loading the history…
          </p>
        ) : history.length === 0 ? (
          <EmptyState>
            No previous officers on record for this college.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {history.map((record, index) => (
              <li key={record.id || index}
                className="p-3 rounded-spc-admin border border-spc-line-strong bg-spc-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-spc-sm font-bold text-spc-ink break-words min-w-0">
                    {record.officer_name || '—'}
                  </p>
                  {record.status && <RecordStanding status={record.status} />}
                </div>

                <p className="text-spc-xs text-spc-body mt-1.5 flex items-center gap-1.5 break-words">
                  <Mail size={13} aria-hidden="true" className="flex-shrink-0" />
                  {record.email || '—'}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 flex items-center gap-1.5 tabular-nums">
                  <Phone size={13} aria-hidden="true" className="flex-shrink-0" />
                  {record.officer_phone || '—'}
                </p>

                {(record.created_at || record.updated_at) && (
                  <p className="text-spc-xs text-spc-body mt-2 pt-2 border-t border-spc-line">
                    {record.created_at && <>Appointed {formatDay(record.created_at)}</>}
                    {record.created_at && record.updated_at && ' · '}
                    {record.updated_at && <>Updated {formatDay(record.updated_at)}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        {history.length > 0 && (
          <DangerButton onClick={onClearHistory} className="mr-auto">
            <Trash2 size={15} aria-hidden="true" />
            Clear history
          </DangerButton>
        )}
        <PrimaryButton onClick={onClose}>Close</PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

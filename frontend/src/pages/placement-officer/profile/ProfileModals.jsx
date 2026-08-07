import Modal from '../../../components/Modal';
import { SecondaryButton, DangerButton } from '../../../components/officer/OfficerUI';

const PANEL = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

/**
 * Confirm removing an image.
 *
 * Replaces two `window.confirm()` calls. A native confirm cannot say what is
 * actually at stake — and for the college logo something is: the placement
 * poster will not generate without one, which is worth knowing before pressing
 * Remove rather than discovering on the poster page afterwards.
 */
export default function ConfirmRemoveModal({ id, title, children, confirmLabel, busy, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose} labelledBy={id} panelClassName={PANEL} overlayClassName={OVERLAY}>
      <div className="px-5 py-4 border-b-[1.5px] border-spc-rule-structural">
        <h2 id={id} className="text-spc-h2 font-bold text-spc-ink">{title}</h2>
      </div>
      <div className="px-5 py-4">
        <div className="text-spc-xs text-spc-body leading-snug">{children}</div>
      </div>
      <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line">
        <SecondaryButton type="button" onClick={onClose} disabled={busy}>
          Keep it
        </SecondaryButton>
        <DangerButton type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Removing…' : confirmLabel}
        </DangerButton>
      </div>
    </Modal>
  );
}

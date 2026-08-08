import { useState } from 'react';
import Modal from '../Modal';
import {
  PrimaryButton, SecondaryButton, DangerButton, PositiveButton, FieldLabel, FIELD_CLASS,
} from './OfficerUI';
import { OfficerDialogClose } from './OfficerDialog';

/**
 * One confirmation dialog for the officer role, replacing the last of the raw
 * `window.confirm` and `window.prompt` calls.
 *
 * Those were the only browser-chrome popups left in a role that otherwise draws
 * its own dialogs. Beyond looking foreign, a native confirm can only ask a
 * yes/no question in one unstyled line: it cannot name what is about to happen,
 * cannot say how many records it covers, and cannot be read on a phone without
 * the OS deciding how it looks. `window.prompt` was worse — it was collecting
 * the rejection reason that gets shown to the student, as an unlabelled
 * single-line box with no hint about who reads it.
 *
 * Written once and shared, because five call sites had been about to become
 * five more bespoke modals.
 *
 * @param {'positive'|'danger'} tone  Colours the confirm button. Approving is
 *   positive; rejecting and deleting are danger.
 * @param {object|null} reason  When set, the dialog collects free text:
 *   `{ label, hint, placeholder, required }`. The value is handed to onConfirm.
 * @param {(reason: string) => void} onConfirm
 */
export default function OfficerConfirm({
  title,
  subtitle,
  body,
  tone = 'danger',
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  reason = null,
  busy = false,
  onConfirm,
  onClose,
}) {
  const [text, setText] = useState('');
  const Confirm = tone === 'positive' ? PositiveButton : DangerButton;
  const blocked = Boolean(reason?.required) && text.trim() === '';

  return (
    <Modal
      onClose={onClose}
      labelledBy="officer-confirm-title"
      panelClassName="bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4"
      closeOnBackdrop
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-[1.5px] border-spc-rule-structural">
        <div className="min-w-0">
          <h2 id="officer-confirm-title" className="text-spc-h2 font-bold text-spc-ink">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-spc-muted mt-0.5 break-words">{subtitle}</p>}
        </div>
        <OfficerDialogClose onClose={onClose} />
      </div>

      <div className="px-5 py-4 space-y-3">
        {body && <div className="text-spc-xs text-spc-body leading-snug space-y-2">{body}</div>}

        {reason && (
          <div>
            <FieldLabel htmlFor="officer-confirm-reason">{reason.label}</FieldLabel>
            <textarea
              id="officer-confirm-reason"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={reason.placeholder}
              className={`${FIELD_CLASS} resize-y`}
            />
            {reason.hint && <p className="text-xs text-spc-muted mt-1">{reason.hint}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line">
        <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
        <Confirm type="button" onClick={() => onConfirm(text.trim())} disabled={busy || blocked}>
          {busy ? busyLabel : confirmLabel}
        </Confirm>
      </div>
    </Modal>
  );
}

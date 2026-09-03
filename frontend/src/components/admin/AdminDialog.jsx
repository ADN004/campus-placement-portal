import { X } from 'lucide-react';

/**
 * The Console skin for dialogs.
 *
 * `components/Modal.jsx` is the primitive underneath — it owns the focus trap,
 * Escape, the scroll lock and focus restore, and it is shared by all three
 * roles. It deliberately takes no `title`, `size` or `footer`: the shell around
 * the content belongs to whichever role is drawing it. This file is that shell
 * for super admin, mirroring `officer/OfficerDialog.jsx` piece for piece.
 *
 * The scrim is glass. A dialog is one of the few surfaces on Console's short
 * list allowed to be — the page really is behind it — and the officer scrim is
 * deliberately plain for the opposite reason. The panel itself is opaque: it
 * holds a form, and a form is something you read.
 */

export const ADMIN_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/35 backdrop-blur-sm p-4';

const PANEL_BASE = 'bg-spc-surface border border-spc-line-strong rounded-spc-admin-lg w-full';

/** `size` matches the officer widths so dialogs are the same size in both roles. */
export function adminPanel(size = 'md', { scroll = false } = {}) {
  const width = size === 'sm' ? 'max-w-md'
    : size === 'lg' ? 'max-w-2xl'
      : size === 'xl' ? 'max-w-4xl'
        : 'max-w-lg';
  return scroll
    ? `${PANEL_BASE} ${width} spc-dialog-h flex flex-col`
    : `${PANEL_BASE} ${width}`;
}

/**
 * The ✕ in the corner. 44px, so it is a real target rather than a 20px glyph —
 * on a phone Escape does not exist and Cancel can be a scroll away.
 */
export function AdminDialogClose({ onClose, label = 'Close' }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-11 h-11 -mr-2 flex-shrink-0
        rounded-spc-admin-sm text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
    >
      <X size={20} aria-hidden="true" />
    </button>
  );
}

export function AdminDialogHeader({ id, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4
      border-b border-spc-line-strong flex-shrink-0">
      <div className="min-w-0">
        <h2 id={id} className="text-spc-h2 font-bold text-spc-ink break-words">{title}</h2>
        {subtitle && <p className="text-spc-xs text-spc-body mt-0.5 break-words">{subtitle}</p>}
      </div>
      <AdminDialogClose onClose={onClose} />
    </div>
  );
}

export function AdminDialogBody({ children, className = '' }) {
  return (
    <div className={`flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * A checkbox with a label and an optional line of explanation.
 *
 * The Console twin of `OfficerToggleRow`, so a dialog shared by both roles can
 * pick its primitives by variant and write the markup once. Same API, Console's
 * checkbox and radius — the officer's is 3px, and inheriting it is what once
 * made the two roles look identical.
 */
export function AdminToggleRow({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded-[4px] border-spc-control text-spc-accent
          focus:ring-spc-accent/40 flex-shrink-0 mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-spc-sm font-semibold text-spc-ink">{label}</span>
        {hint && <span className="block text-spc-xs text-spc-body mt-0.5 leading-snug">{hint}</span>}
      </span>
    </label>
  );
}

export function AdminDialogFooter({ children }) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-4
      border-t border-spc-line-strong flex-shrink-0">
      {children}
    </div>
  );
}

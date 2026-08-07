/**
 * The officer skin for the modals shared with other roles.
 *
 * Six components under components/ are used by exactly two pages each — the
 * officer's job page and the Super Admin's — and one (StatusBadge) by seven
 * across all three roles. They cannot simply be restyled, because the Super
 * Admin and student roles have not been redesigned yet and must keep rendering
 * byte-for-byte what they render today.
 *
 * So each takes a `variant` prop that defaults to its existing look, and this
 * file holds the officer branch. Two rules make the default safe:
 *
 *   1. The default branch keeps its original class string *verbatim*. Not
 *      rebuilt from parts, not reordered, not interpolated — copied. Tailwind
 *      output depends on class order, and an earlier pass through Layout.jsx
 *      changed non-officer output purely by reordering an interpolated string.
 *   2. Nothing here is imported unless `variant === 'officer'` is possible on
 *      that component, so no other role's bundle changes shape.
 */

/* ------------------------------------------------------------------ shell */

export const OFFICER_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

const PANEL_BASE = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full';

/** `size` follows the widths the originals used, so nothing reflows. */
export function officerPanel(size = 'md', { scroll = false } = {}) {
  const width =
    size === 'sm' ? 'max-w-md'
    : size === 'lg' ? 'max-w-2xl'
    : size === 'xl' ? 'max-w-4xl'
    : 'max-w-lg';
  return scroll
    ? `${PANEL_BASE} ${width} spc-dialog-h flex flex-col`
    : `${PANEL_BASE} ${width}`;
}

/* ----------------------------------------------------------------- header */

/**
 * Title on the structural rule — the direction's signature, and the reason an
 * officer dialog reads as part of the officer role rather than a recoloured
 * version of the old one. No coloured band: colour is reserved for meaning.
 */
export function OfficerDialogHeader({ id, title, subtitle }) {
  return (
    <div className="px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
      <h2 id={id} className="text-spc-h2 font-bold text-spc-ink">{title}</h2>
      {subtitle && <p className="text-xs text-spc-muted mt-0.5 break-words">{subtitle}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- footer */

export function OfficerDialogFooter({ children, split = false }) {
  return (
    <div
      className={`flex items-center gap-2 flex-wrap px-5 py-4 border-t border-spc-line flex-shrink-0
        ${split ? 'justify-between' : 'justify-end'}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ body */

/** Scrolling body for the dialogs that have one. */
export function OfficerDialogBody({ children, className = '' }) {
  return (
    <div className={`flex-1 overflow-y-auto spc-scroll-contain ${className}`}>{children}</div>
  );
}

/* ------------------------------------------------------------------ bits */

/** A labelled group inside a dialog body. */
export function OfficerFieldGroup({ title, hint, children }) {
  return (
    <section className="px-5 py-4 border-b border-spc-line last:border-b-0">
      <h3 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-1">
        {title}
      </h3>
      {hint && <p className="text-xs text-spc-muted mb-3 leading-snug">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

/**
 * A toggle rendered as a real checkbox rather than a painted switch.
 *
 * The originals drew a sliding pill with no input behind it, so it was
 * unreachable by keyboard and announced as nothing.
 */
export function OfficerToggleRow({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))] flex-shrink-0 mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-spc-xs font-bold text-spc-ink">{label}</span>
        {hint && <span className="block text-xs text-spc-muted mt-0.5 leading-snug">{hint}</span>}
      </span>
    </label>
  );
}

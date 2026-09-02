/**
 * The pieces every super-admin page is built from.
 *
 * Deliberately parallel to `officer/OfficerUI.jsx`: same names, same props, so
 * a page reads the same in either role and someone who has worked on one can
 * read the other. What differs is the material, and only the material.
 *
 * Console's rules, which is where the differences come from:
 *
 *   - **Nothing you read is translucent.** Panels, tables, tiles and fields are
 *     opaque. Glass belongs to the chrome that floats above the page, and the
 *     ground behind it carries the washes that make it visible. Text on a
 *     surface has a contrast that can be computed; text on glass over a moving
 *     page does not.
 *   - **No shadows here.** Console permits one on floating chrome and nowhere
 *     else. Depth on the page comes from the surface ladder and hairlines.
 *   - **Rounded, not square.** 12px on controls, 18px on panels — the officer
 *     role is near-square because a register is drawn with rules, and borrowing
 *     its geometry once made the two roles indistinguishable.
 *   - **Colour is meaning.** Grey and one blue for structure; the three status
 *     colours say something about a student, a job or a request, and nothing
 *     else gets to be coloured.
 *
 * Two contrast rules are load-bearing and are the reason for several odd-looking
 * choices below:
 *
 *   - Accent fails as text on `surface-2` (4.32) and `surface-3` (3.94). Accent
 *     text only on ground or surface; on tinted surfaces, ink.
 *   - On the ground, ink and body only — at the deepest wash muted is 4.44 and
 *     accent 3.77. Anything quieter belongs on a surface.
 */

/** Dates read the same across the role: 01-09-2026, never a locale surprise. */
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/* ------------------------------------------------------------------ surfaces */

/** The page's building block: opaque, hairlined, rounded. Never glass. */
export function Panel({ children, className = '' }) {
  return (
    <div className={`bg-spc-surface border border-spc-line-strong rounded-spc-admin ${className}`}>
      {children}
    </div>
  );
}

/** A panel's title bar, with room for one control on the right. */
export function PanelHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-spc-line">
      <h2 className="text-spc-sm font-bold text-spc-ink">{children}</h2>
      {action}
    </div>
  );
}

/**
 * A label above a section. Khand, uppercase, tracked — the one place the
 * condensed face is used, shared with table column headers.
 */
export function SectionLabel({ children, className = '' }) {
  return (
    <p className={`font-khand text-spc-label font-medium uppercase tracking-[0.14em]
      text-spc-body mb-2 ${className}`}>
      {children}
    </p>
  );
}

/** The heading a page opens with. `size` follows the device, not the content. */
export function PageHeading({ eyebrow, title, subline, size = 'md', children }) {
  const titleClass = size === 'sm' ? 'text-spc-h2' : size === 'lg' ? 'text-spc-display' : 'text-spc-h1';
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
      <div className="min-w-0">
        {eyebrow && (
          /* On the ground, so accent is allowed here and only here. */
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-spc-accent mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className={`${titleClass} font-bold text-spc-ink leading-tight`}>{title}</h1>
        {subline && <p className="text-spc-sm text-spc-body mt-1">{subline}</p>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- buttons */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-spc-admin-sm '
  + 'text-spc-xs font-bold transition-colors disabled:opacity-55 disabled:cursor-not-allowed';

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} bg-spc-accent text-spc-on-accent hover:bg-spc-accent/90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} bg-spc-surface text-spc-ink border border-spc-control
        hover:bg-spc-surface-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} bg-spc-bad text-white hover:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- fields */

export const FIELD_CLASS =
  'w-full min-h-[44px] px-3.5 py-2.5 rounded-spc-admin-sm bg-spc-surface text-spc-ink text-spc-sm '
  + 'border border-spc-control outline-none transition-colors '
  + 'focus:border-spc-accent focus:ring-2 focus:ring-spc-accent/25';

export const CHECKBOX_CLASS =
  'h-5 w-5 rounded-[4px] border-spc-control text-spc-accent focus:ring-spc-accent/40';

export function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-spc-label font-bold uppercase text-spc-body mb-1.5">
      {children}
    </label>
  );
}

export function TextField({ label, id, ...props }) {
  return (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input id={id} className={FIELD_CLASS} {...props} />
    </div>
  );
}

export function SelectField({ label, id, children, ...props }) {
  return (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <select id={id} className={FIELD_CLASS} {...props}>
        {children}
      </select>
    </div>
  );
}

/* --------------------------------------------------------------------- misc */

export function EmptyState({ children }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-spc-sm text-spc-body font-medium">{children}</p>
    </div>
  );
}

/** A hairline. The structural rule, used under a section's heading. */
export function Bar({ className = '' }) {
  return <div className={`h-px bg-spc-rule-structural ${className}`} />;
}

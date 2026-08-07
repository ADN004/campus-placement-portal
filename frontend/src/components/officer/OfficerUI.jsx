/**
 * Primitives for the placement-officer role, on the "Register" direction.
 *
 * Hierarchy comes from surfaces, rules and type weight — never shadows or
 * colour blocks. There is no `shadow-*` in this file, and the brass accent is
 * only ever a fill, a focus ring or a dot: as text it measures 4.49:1 on
 * surface-2, just under AA, so it is unsafe on the tinted surfaces.
 *
 * These were written for ManageStudents and lifted here unchanged once
 * JobEligibleStudents needed the same parts. Every officer page imports from
 * here rather than copying, so the geometry cannot drift page to page.
 *
 * Nothing here is student-specific. Anything that knows about registration
 * statuses or backlogs stays in the page module that owns it.
 */

/* ------------------------------------------------------------------ format */

/** DD-MM-YYYY, the format the officer tables and dialogs have always printed. */
export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

/* ------------------------------------------------------------------ panels */

/** Surface, one hairline edge, 4px radius, no shadow. */
export function Panel({ children, className = '' }) {
  return (
    <div
      className={`bg-spc-surface border border-spc-line-strong rounded-spc-panel
        overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

/** Heading that sits on a panel, separated by a hairline. */
export function PanelHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-spc-line">
      <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Section label above a panel. */
export function SectionLabel({ children, className = '' }) {
  return (
    <h2
      className={`text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2 ${className}`}
    >
      {children}
    </h2>
  );
}

/* ----------------------------------------------------------------- heading */

/**
 * Page heading. The 1.5px rule underneath is the structural signature of this
 * direction — it is what says "top of the page" now that the gradient icon
 * tiles are gone.
 */
export function PageHeading({ eyebrow, title, subline, size = 'md', children }) {
  const titleSize = size === 'sm' ? 'text-spc-display' : 'text-spc-display-lg';
  return (
    <header className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            /* Accent is safe here: the eyebrow sits on ground (4.83:1). */
            <p className="text-spc-label font-bold uppercase text-spc-accent mb-1.5 break-words">
              {eyebrow}
            </p>
          )}
          <h1 className={`${titleSize} font-bold text-spc-ink`}>{title}</h1>
          {subline && <p className="text-spc-sm text-spc-muted mt-1">{subline}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- buttons */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-spc-control ' +
  'text-spc-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-accent text-spc-on-accent hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-surface border border-spc-control text-spc-ink
        hover:bg-spc-surface-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Destructive confirm. 7.32:1 white on bad. */
export function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-bad text-white hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Constructive confirm — approving, publishing, whitelisting. 7.13:1 white on ok.
 *
 * The direction reserves colour for meaning, and an action's consequence is
 * meaning: approve and reject are the most semantically loaded controls on
 * these screens. Rendering them in the same green and red the status column
 * already uses means an officer learns one rule — green does, red undoes — and
 * it matches what they are already reading two columns to the left.
 */
export function PositiveButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-ok text-white hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- row actions */

const ACTION_TONE = {
  default: 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink',
  positive: 'text-spc-ok hover:bg-spc-ok-bg',
  danger: 'text-spc-bad hover:bg-spc-bad-bg',
  warn: 'text-spc-warn hover:bg-spc-warn-bg',
};

/**
 * A single row action.
 *
 * `label` is the short visible word ("Approve"); `description` is the full
 * accessible name ("Approve Anjali Ramesh"), which is what a screen reader
 * announces and what the tooltip shows.
 *
 * With `showLabel` the word is rendered beside the icon. Icon-only buttons
 * assume the reader already knows the icon, which is a poor assumption for the
 * people using this — so wherever there is width, the word is shown. Below that
 * width the accessible name still carries it.
 *
 * Every tone was measured: ok 7.13:1 and bad 7.32:1 on surface, and 6.03 / 6.19
 * on the surface-2 the row tints to on hover.
 */
export function ActionButton({
  label, description, tone = 'default', showLabel = false, onClick, children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={description || label}
      title={description || label}
      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] flex-shrink-0
        rounded-spc-control transition-colors ${showLabel ? 'px-2.5' : 'w-11'}
        ${ACTION_TONE[tone] || ACTION_TONE.default}`}
    >
      {children}
      {showLabel && <span className="text-spc-xs font-bold whitespace-nowrap">{label}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ fields */

export function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-1.5"
    >
      {children}
    </label>
  );
}

/**
 * Surface fill, a `control` border (3.71:1 — WCAG 1.4.11 wants 3:1 for the
 * boundary of something you type into), 3px radius, accent focus ring.
 */
export const FIELD_CLASS =
  'w-full min-h-[44px] px-3 rounded-spc-control bg-spc-surface border border-spc-control ' +
  'text-spc-sm text-spc-ink outline-none transition-colors ' +
  'focus:border-spc-accent focus:ring-2 focus:ring-spc-accent/30';

/** Checkbox / radio, sized to be hittable and tinted with the accent. */
export const CHECKBOX_CLASS =
  'w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))] flex-shrink-0';

export function TextField({ label, id, ...props }) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input id={id} className={FIELD_CLASS} {...props} />
    </div>
  );
}

export function SelectField({ label, id, children, ...props }) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <select id={id} className={FIELD_CLASS} {...props}>
        {children}
      </select>
    </div>
  );
}

/** A checkbox row with a real 44px target. */
export function CheckRow({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`${CHECKBOX_CLASS} mt-0.5`}
      />
      <span className="text-spc-xs text-spc-body">{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------- empty */

export function EmptyState({ children }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-spc-sm text-spc-muted font-medium">{children}</p>
    </div>
  );
}

/* --------------------------------------------------------------- skeletons */

/** A neutral shimmer block, shaped by the caller. */
export function Bar({ className = '' }) {
  return <div className={`bg-spc-surface-2 animate-pulse rounded-spc-badge ${className}`} />;
}

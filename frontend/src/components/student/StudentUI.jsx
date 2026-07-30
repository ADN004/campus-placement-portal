import { Search } from 'lucide-react';

/**
 * Small presentational primitives shared across the student pages.
 *
 * These exist so the search box, filter chips and empty/error states look and
 * behave identically on every student screen rather than being re-invented per
 * page. Purely presentational — all state and handlers stay in page containers.
 */

/**
 * Salary packages are entered by hand, so some already carry the unit
 * ("2.04 LPA") and some don't ("1.8 to 3.66"). Appending unconditionally
 * produced "2.04 LPA LPA" on screen. Display-only — the stored value is
 * untouched.
 */
export function formatPackage(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  return /lpa\s*$/i.test(text) ? text : `${text} LPA`;
}

export function SearchField({ value, onChange, placeholder, size = 'md' }) {
  const pad = size === 'lg' ? 'py-3.5 text-spc-body' : 'py-3 text-spc-sm';
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full min-h-[48px] pl-11 pr-4 ${pad} rounded-spc-sm bg-spc-surface
          border border-spc-line-strong text-spc-ink placeholder:text-spc-muted
          outline-none focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25 transition-colors`}
      />
    </div>
  );
}

/**
 * Filter chips.
 *
 * These wrap onto as many rows as they need rather than scrolling sideways. A
 * swipe-scrolling row hid the last filter behind the screen edge with no hint
 * it was there — on a narrow phone every option has to be visible, even if that
 * costs a second row.
 *
 * `compact` tightens the padding for phones so four chips usually fit in two
 * rows. The chips stay 44px tall regardless, so they remain thumb-sized.
 */
export function FilterChips({ filters, active, onChange, compact = false, label = 'Filter' }) {
  const pad = compact ? 'px-3 gap-1' : 'px-4 gap-1.5';

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {filters.map((filter) => {
        const isActive = active === filter.key;
        return (
          <button
            key={filter.key}
            onClick={() => onChange(filter.key)}
            aria-pressed={isActive}
            className={`inline-flex items-center justify-center min-h-[44px] ${pad} rounded-spc-sm
              text-spc-xs font-bold transition-colors
              ${isActive
                ? 'bg-spc-teal text-spc-on-teal'
                : 'bg-spc-surface text-spc-body border border-spc-line-strong hover:bg-spc-surface-2'}`}
          >
            <span>{filter.label}</span>
            <span
              className={`tabular-nums font-extrabold ${
                isActive ? 'text-spc-on-teal-dim' : 'text-spc-muted'
              }`}
            >
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line px-6 py-16 text-center">
      {Icon && (
        <span className="w-12 h-12 rounded-spc-sm bg-spc-teal-soft inline-flex items-center justify-center mb-4">
          <Icon className="text-spc-teal" size={22} />
        </span>
      )}
      <p className="text-spc-h2 font-bold text-spc-ink">{title}</p>
      {message && <p className="text-spc-sm text-spc-muted mt-1.5 max-w-[52ch] mx-auto">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ icon: Icon, error, pendingNote }) {
  const pending = error.type === 'pending';
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line px-6 py-16 text-center">
      {Icon && (
        <span
          className={`w-12 h-12 rounded-spc-sm inline-flex items-center justify-center mb-4
            ${pending ? 'bg-spc-warn-bg' : 'bg-spc-bad-bg'}`}
        >
          <Icon className={pending ? 'text-spc-warn' : 'text-spc-bad'} size={22} />
        </span>
      )}
      <h2 className="text-spc-h1 font-bold text-spc-ink">{error.title}</h2>
      <p className="text-spc-sm text-spc-muted mt-2 max-w-[52ch] mx-auto">{error.message}</p>
      {pending && pendingNote && (
        <p className="mt-6 rounded-spc bg-spc-warn-bg text-spc-body text-spc-sm p-4 max-w-[56ch] mx-auto">
          {pendingNote}
        </p>
      )}
    </div>
  );
}

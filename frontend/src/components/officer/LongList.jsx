import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

/**
 * The parts a list needs once it stops being short.
 *
 * These pages were laid out against the data that exists today — five job
 * requests, two PRN ranges, a handful of sent notifications — and that is the
 * wrong end to design from. This is a statewide portal: an officer accumulates
 * hundreds of sent notifications in a year, a placement drive draws hundreds of
 * applicants, and a college adds a PRN range per branch per intake year. A list
 * that reads well at five and becomes an infinite scroll at three hundred was
 * never finished.
 *
 * Three things fix that, and they belong together:
 *
 *   1. a height the panel cannot exceed, so the page stops growing with the
 *      data and the thing below the list stays reachable
 *   2. a way to narrow, because past a screenful nobody scrolls to find a
 *      known item — they look for it
 *   3. a window on the rows, so three hundred records are not three hundred
 *      DOM nodes, and the count says what is being shown out of what exists
 *
 * Row density is the fourth, and it is the caller's job: a row that wraps to
 * three lines is a row that only fits five of itself on a screen.
 */

/**
 * Filtering + windowing for a long list.
 *
 * `match(item, needle)` decides what searching means for this list; it is only
 * called with a lowercased, trimmed needle. `step` is both the initial window
 * and how much each "show more" adds.
 */
export function useLongList(items, { step = 25, query = '', match } = {}) {
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle || !match) return items;
    return items.filter((item) => match(item, needle));
  }, [items, needle, match]);

  const [limit, setLimit] = useState(step);

  // Narrowing the list should show the top of the new result, not leave the
  // window where it was for the old one.
  useEffect(() => {
    setLimit(step);
  }, [needle, items, step]);

  return {
    filtered,
    visible: filtered.slice(0, limit),
    total: items.length,
    matched: filtered.length,
    shown: Math.min(limit, filtered.length),
    hasMore: filtered.length > limit,
    showMore: () => setLimit((n) => n + step),
    filtering: Boolean(needle),
  };
}

/** Search box for a list. Shown by the caller only once a list is long enough to need one. */
export function ListSearch({ id, value, onChange, placeholder = 'Search' }) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[44px] pl-9 pr-3 rounded-spc-control bg-spc-surface
          border border-spc-control text-spc-xs text-spc-ink outline-none transition-colors
          focus:border-spc-accent focus:ring-2 focus:ring-spc-accent/30"
      />
    </div>
  );
}

/**
 * "Showing 25 of 240" — and it says `matched` against `total` while filtering,
 * so a search that finds nothing says so instead of looking like an empty list.
 */
export function ListCount({ shown, matched, total, filtering, noun = 'item' }) {
  const plural = (n) => `${noun}${n === 1 ? '' : 's'}`;
  if (filtering) {
    return (
      <span className="text-xs text-spc-muted tabular-nums">
        {matched === 0
          ? `No ${plural(0)} match`
          : matched > shown
          ? `${shown} of ${matched} matching`
          : `${matched} matching`}
        <span className="text-spc-muted"> · {total} total</span>
      </span>
    );
  }
  return (
    <span className="text-xs text-spc-muted tabular-nums">
      {total > shown ? `${shown} of ${total} ${plural(total)}` : `${total} ${plural(total)}`}
    </span>
  );
}

/** The row that reveals the next window. Full width so it is a real target. */
export function ShowMore({ onClick, remaining, noun = 'item' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px]
        border-t border-spc-line text-spc-xs font-bold text-spc-ink
        hover:bg-spc-surface-2 transition-colors"
    >
      <ChevronDown size={15} aria-hidden="true" />
      <span>
        Show {Math.min(remaining, 25)} more
        <span className="font-normal text-spc-muted tabular-nums"> · {remaining} left</span>
      </span>
    </button>
  );
}

/**
 * A scroll region with a ceiling.
 *
 * `cap` is a whole literal class per size, because Tailwind cannot see a class
 * assembled at runtime. Panels stop growing at these heights and scroll inside
 * themselves, which is what keeps the page a fixed shape no matter how much
 * data arrives.
 */
const CAPS = {
  sm: 'max-h-[320px]',
  md: 'max-h-[480px]',
  lg: 'max-h-[640px]',
};

export function ListViewport({ cap = 'md', children }) {
  return (
    <div className={`${CAPS[cap] || CAPS.md} overflow-y-auto spc-scroll-contain`}>{children}</div>
  );
}

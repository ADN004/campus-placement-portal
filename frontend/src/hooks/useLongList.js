import { useState, useMemo, useEffect } from 'react';

/**
 * Filtering plus a window on a list, so a page's height stops depending on how
 * much data exists.
 *
 * Theme-neutral on purpose. The officer role and the student role have
 * genuinely different design systems, and this holds none of either — each one
 * imports the hook and draws its own count, search box and "show more" in its
 * own idiom.
 *
 * The problem it exists for: these pages were laid out against the data that
 * exists today. This is a statewide portal — a student sees every job posted to
 * their college over years, an officer accumulates hundreds of sent
 * notifications, a drive draws hundreds of applicants. A list that reads well at
 * five and becomes an endless scroll at three hundred was never finished.
 *
 * `match(item, needle)` decides what searching means for this list; it is only
 * called with a lowercased, trimmed needle. Omit it and `query` is ignored.
 * `step` is both the first window and how much each reveal adds.
 */
export default function useLongList(items, { step = 25, query = '', match } = {}) {
  const list = items || [];
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle || !match) return list;
    return list.filter((item) => match(item, needle));
  }, [list, needle, match]);

  const [limit, setLimit] = useState(step);

  // Narrowing should show the top of the new result, not leave the window
  // where it happened to be for the previous one.
  useEffect(() => {
    setLimit(step);
  }, [needle, list, step]);

  return {
    filtered,
    visible: filtered.slice(0, limit),
    total: list.length,
    matched: filtered.length,
    shown: Math.min(limit, filtered.length),
    remaining: Math.max(0, filtered.length - limit),
    hasMore: filtered.length > limit,
    showMore: () => setLimit((n) => n + step),
    filtering: Boolean(needle),
  };
}

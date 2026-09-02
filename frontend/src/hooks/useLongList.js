import { useState, useMemo } from 'react';

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
 *
 * ---------------------------------------------------------------------------
 * Why the window is keyed rather than reset in an effect
 *
 * This used to reset the window from a `useEffect` whose dependencies included
 * the `items` array itself. That works only while every caller hands over the
 * same array instance between renders, and one did not: the officer's applicant
 * list builds its two arrays with `.filter()` in the component body, so a fresh
 * array arrives on every render. Pressing "show more" then set a larger window,
 * the re-render produced a new array, the effect saw a changed dependency and
 * reset the window to `step` — so the button did nothing at all, on the longest
 * list in the officer role.
 *
 * Nothing warns about this. The array is a legitimate dependency by React's
 * rules and the linter is happy; it simply compares by identity, and identity
 * is the one thing a caller cannot be relied upon to keep stable.
 *
 * So the window is now derived during render from a key describing the result
 * set. No effect, no dependency array, no second render pass, and no way for a
 * caller's array identity to reach the reset decision. Two lists with the same
 * length do not reset when swapped for one another — `slice` bounds the window
 * either way, so the cost is at worst a few extra rows on screen, against a
 * button that used to be inert.
 */
export default function useLongList(items, { step = 25, query = '', match } = {}) {
  const list = items || [];
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle || !match) return list;
    return list.filter((item) => match(item, needle));
  }, [list, needle, match]);

  /*
   * Narrowing should show the top of the new result, not leave the window where
   * it happened to be for the previous one — so the window belongs to the
   * result set that produced it, and any result set not yet expanded starts at
   * `step`.
   *
   * The window is therefore remembered against the search term, the step and
   * the number of results. Clearing a search returns you to a set you had
   * already expanded and restores that expansion, which is what someone
   * retracing their steps expects; a set you have not expanded before opens at
   * one window however you arrived at it.
   */
  const key = `${needle}|${step}|${filtered.length}`;
  const [expanded, setExpanded] = useState({ key, limit: step });
  const limit = expanded.key === key ? expanded.limit : step;

  return {
    filtered,
    visible: filtered.slice(0, limit),
    total: list.length,
    matched: filtered.length,
    shown: Math.min(limit, filtered.length),
    remaining: Math.max(0, filtered.length - limit),
    hasMore: filtered.length > limit,
    showMore: () => setExpanded({ key, limit: limit + step }),
    filtering: Boolean(needle),
  };
}

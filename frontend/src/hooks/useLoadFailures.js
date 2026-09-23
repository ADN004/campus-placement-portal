import { useCallback, useState } from 'react';

/**
 * The parts of a page that did not load, and a way to try them again.
 *
 * Console pages fetch four or five things at once -- the list, the colleges,
 * the regions, a set of templates -- and every one of those catches wrote to
 * console.error and stopped. The page then rendered as though the answer had
 * come back empty, which is a different statement entirely:
 *
 *   - the pending-requests tab said there was nothing waiting
 *   - the drive panel said no drive had been scheduled
 *   - the college picker offered no colleges to pick
 *
 * Each of those is a sentence the page had no business making. An admin acts on
 * them: schedules a second drive, tells an officer their request was never
 * received, or posts a job with no targets.
 *
 * A toast per failure is the wrong shape -- five failed fetches on one page
 * load is five toasts, and they are gone in four seconds while the empty screen
 * they explain stays. So failures collect here and the page shows one standing
 * notice naming what is missing, with a button that retries exactly those.
 *
 * Only for things fetched alongside the main content. A page whose primary list
 * fails should say so where the list would be.
 */
export default function useLoadFailures() {
  const [failures, setFailures] = useState({});

  /** Record that `name` could not be loaded, and how to try it again. */
  const note = useCallback((name, retry) => {
    setFailures((prev) => ({ ...prev, [name]: retry || null }));
  }, []);

  /** Record that `name` loaded after all. Safe to call when it never failed. */
  const clear = useCallback((name) => {
    setFailures((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /**
   * Try every failed part again.
   *
   * Cleared first rather than after: a retry that fails again re-notes itself,
   * and one that succeeds should leave nothing behind. Clearing afterwards
   * would race with whichever finished first.
   */
  const retryAll = useCallback(() => {
    const entries = Object.entries(failures);
    setFailures({});
    entries.forEach(([, retry]) => { if (retry) retry(); });
  }, [failures]);

  return {
    names: Object.keys(failures),
    hasFailures: Object.keys(failures).length > 0,
    note,
    clear,
    retryAll,
  };
}

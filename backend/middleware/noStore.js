/**
 * Marks a response as never cacheable.
 *
 * Every export in this project generates a file from live data, and several of
 * them are GET requests with a stable URL — the same path and query string
 * whether it is asked for now or in an hour. A response carrying no freshness
 * information at all lets the browser apply its own heuristics and hand back
 * whatever it stored last time, so an officer who exports, approves twenty more
 * students and exports again can be given the first file over again. It reads
 * as the export being broken: the figures are wrong and the generated-at line
 * is stale, with nothing to explain why.
 *
 * It was the timestamp that gave it away — the same "Generated 9/8/2026,
 * 9:48:25 pm" on every download of the consolidated student counts, in both
 * environments, because both were serving one cached file.
 *
 * POST exports were never affected, which is why only some of them showed it.
 */
export const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

export default noStore;

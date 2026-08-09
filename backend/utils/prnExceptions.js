/**
 * PRN range exceptions: PRNs inside a range's start–end that must NOT be
 * allowed to register. Officers used to note these in the free-text
 * description ("EXCEPT 2401133557"), which enforced nothing — these are
 * stored structured on the range and enforced at validation/registration.
 */

/** Check if a PRN falls within a range (numeric first, string fallback) */
export const isPRNInRange = (prn, start, end) => {
  if (!isNaN(prn) && !isNaN(start) && !isNaN(end)) {
    const prnNum = parseInt(prn);
    return prnNum >= parseInt(start) && prnNum <= parseInt(end);
  }
  return prn >= start && prn <= end;
};

/**
 * Does this PRN belong to this range?
 *
 * The single answer to that question. Both roles ask it in six places between
 * them — the count on the page, the students list, its export, and disable,
 * enable and delete — and they used to answer it three different ways: numeric
 * bounds, SQL string bounds, and in every case ignoring excepted_prns.
 *
 * Excepted PRNs are outside the range; that is the entire purpose of the field.
 * Registration enforced it (commonController.validatePRN) and nothing else did,
 * so a PRN an officer had deliberately carved out of a range was deactivated
 * when the range was disabled and deleted along with the range — the one
 * student the exception existed to protect was the one it failed to protect.
 *
 * String bounds are the other half: '5000' is inside 999–10000 as a number and
 * outside it as text, so a list read before a delete was not always the set
 * that got deleted. Numeric wins, which is what the destructive paths already
 * used.
 *
 * @param {string} prn
 * @param {{single_prn?: string, range_start?: string, range_end?: string,
 *          excepted_prns?: string[]}} range
 */
export const prnMatchesRange = (prn, range) => {
  if (!prn || !range) return false;
  const excepted = Array.isArray(range.excepted_prns) ? range.excepted_prns : [];
  if (excepted.includes(prn)) return false;
  if (range.single_prn) return prn === range.single_prn;
  if (range.range_start && range.range_end) {
    return isPRNInRange(prn, range.range_start, range.range_end);
  }
  return false;
};

/**
 * Normalize + validate a raw exceptions input (array, or a string separated
 * by commas/spaces/newlines) against the range bounds.
 * Returns { prns } on success or { error } with a user-facing message.
 */
export const parseExceptedPrns = (raw, rangeStart, rangeEnd) => {
  if (raw === undefined || raw === null || raw === '') return { prns: [] };

  const parts = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[\s,;]+/);
  const prns = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];

  if (prns.length === 0) return { prns: [] };

  if (!rangeStart || !rangeEnd) {
    return { error: 'Excepted PRNs only apply to ranges, not single PRN entries' };
  }
  if (prns.length > 200) {
    return { error: 'Too many excepted PRNs (max 200) — consider splitting the range instead' };
  }

  const nonNumeric = prns.filter((p) => !/^\d+$/.test(p));
  if (nonNumeric.length > 0) {
    return { error: `Excepted PRNs must be numbers only: ${nonNumeric.join(', ')}` };
  }

  const outside = prns.filter((p) => !isPRNInRange(p, rangeStart, rangeEnd));
  if (outside.length > 0) {
    return {
      error: `Excepted PRNs must fall inside the range ${rangeStart}–${rangeEnd}: ${outside.join(', ')}`,
    };
  }

  return { prns: prns.sort() };
};

/** True when a PRN is listed in a range's excepted_prns (JSONB array) */
export const isExceptedFromRange = (range, prn) =>
  Array.isArray(range.excepted_prns) && range.excepted_prns.includes(prn);

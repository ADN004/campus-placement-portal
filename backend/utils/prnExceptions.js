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

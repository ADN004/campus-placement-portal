/**
 * Passout-year options for the PRN-range forms (super admin + placement officer).
 *
 * Shows the current year — labelled "(current)" so staff understand it means
 * "passing out this same year" — plus the next 5 years. The window is computed
 * from today's date, so it rolls forward automatically every January and past
 * years drop off on their own (no more 2020 / 2025 lingering in the list).
 *
 * `selected` is the value currently on the form when editing: if an already
 * saved range has a year that has since aged out of the window, we keep it in
 * the list so opening that range to edit never silently blanks its year.
 *
 * Values are strings because prn_ranges.year is VARCHAR.
 */
export function getPassoutYearOptions(selected) {
  const current = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => current + i); // current .. current + 5

  const sel = parseInt(selected, 10);
  if (!Number.isNaN(sel) && !years.includes(sel)) {
    years.push(sel);
    years.sort((a, b) => a - b);
  }

  return years.map((y) => ({
    value: String(y),
    label: y === current ? `${y} (current)` : String(y),
  }));
}

/**
 * Passout year (single) for an academic-year span: "2026-27" -> "2027".
 *
 * The passout year is the year the academic span ends — the same value staff
 * pick as "Passout Year" on a PRN range. Used to show the link between the
 * academic-year reset / archived batches ("2026-27") and PRN ranges ("2027")
 * so the two never get mixed up. Returns '' if it can't parse a start year.
 */
export function passoutYearFromAcademicYear(academicYear) {
  if (!academicYear) return '';
  const start = parseInt(String(academicYear).trim().split('-')[0], 10);
  return Number.isNaN(start) ? '' : String(start + 1);
}

/**
 * Programme CGPA — the one place the derived CGPA is computed.
 *
 * Shared by student registration and the student profile update so both
 * produce the same number from the same semester marks. The browser computes
 * the same average for display (the field is disabled in both forms), but that
 * value is never trusted: programme_cgpa drives every eligibility filter, so
 * the server always recalculates it from the semester marks it stores.
 */

export const SEMESTER_CGPA_FIELDS = [
  'cgpa_sem1',
  'cgpa_sem2',
  'cgpa_sem3',
  'cgpa_sem4',
  'cgpa_sem5',
  'cgpa_sem6',
];

/**
 * True when a semester mark was actually submitted. Blank fields mean "leave
 * this semester alone" — the profile form posts all six on every save, and a
 * semester that was never filled in comes back as an empty string.
 */
export const hasSemesterValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== '';

/**
 * Average of every semester actually filled in, to 2 decimals.
 *
 * Zero and blank semesters are skipped rather than averaged in, so lateral
 * entry students — who enter 0 for semesters 1 and 2 — are not dragged down.
 *
 * @param {Object|Array} semesters - object keyed cgpa_sem1..cgpa_sem6, or the
 *                                   six marks in order
 * @returns {number|null} the CGPA, or null when no semester is filled in
 */
export const calculateProgrammeCgpa = (semesters) => {
  const values = Array.isArray(semesters)
    ? semesters
    : SEMESTER_CGPA_FIELDS.map((field) => semesters[field]);

  const filled = values
    .map((value) => parseFloat(value))
    .filter((num) => !isNaN(num) && num > 0);

  if (filled.length === 0) return null;

  const average = filled.reduce((sum, num) => sum + num, 0) / filled.length;
  return parseFloat(average.toFixed(2));
};

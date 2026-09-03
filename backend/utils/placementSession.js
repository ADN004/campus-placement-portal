/**
 * Which placement session a date belongs to.
 *
 * The session runs June to May, the same boundary the academic-year reset uses
 * (`AcademicYearReset` picks its default year with `month >= 5 ? year : year - 1`).
 * So a student who joined in February 2026 was placed in the **2025-26**
 * session, not in "2026".
 *
 * This exists because the poster printed its year span as
 * `EXTRACT(YEAR FROM MIN(joining_date))`–`EXTRACT(YEAR FROM MAX(joining_date))`,
 * which collapses to the same number whenever every placement happened inside
 * one calendar year — the poster read **"2026—2026"**. A placement year is a
 * span by definition; printing the same year twice says nothing.
 *
 * Derived from the placements' own dates rather than from today, so a poster
 * generated in August for last session's batch still says last session. With no
 * placements at all it falls back to the session in progress.
 */

/** The year a session starts in, for any date inside it. */
export function sessionStartYear(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().getFullYear();
  // getMonth() is 0-indexed, so 5 is June.
  return date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
}

/**
 * The span to print, from the first and last joining dates.
 *
 * Normally both fall in one session and this is `{ start: Y, end: Y + 1 }`. If
 * the placements straddle two sessions the span widens to cover both, which is
 * the honest thing to print rather than picking one.
 */
export function placementSessionSpan(firstJoining, lastJoining) {
  const start = sessionStartYear(firstJoining);
  const lastStart = sessionStartYear(lastJoining || firstJoining);
  return { start, end: Math.max(lastStart + 1, start + 1) };
}

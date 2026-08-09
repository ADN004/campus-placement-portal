/**
 * Turning an age in years into a date of birth, and back.
 *
 * A company states an age requirement three ways: "born on or before
 * 01/01/2005", "born on or after 01/01/2005", or a plain "minimum age 18". The
 * job stores dates, because a date names one fixed set of students and an age
 * in years does not — whoever satisfies "18 or over" changes every day as
 * birthdays pass, so a list exported at the start of a drive would be wrong by
 * the end of it.
 *
 * These convert between the two so an officer handed an age never has to work
 * the date out themselves. The conversion happens once, in the form: what gets
 * saved is always the date.
 */

/** Today as YYYY-MM-DD, in the browser's own timezone. */
export const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The date of birth of someone turning exactly `years` old today.
 *
 * Someone born on this date is `years` today, so it serves both ends: as an
 * "on or before" it is the youngest a candidate may be, and as an "on or after"
 * it is the oldest.
 *
 * 29 February is the one date this cannot answer exactly — subtracting a
 * non-leap number of years leaves a day that does not exist, and JavaScript
 * rolls it forward to 1 March. Clamped back to 28 February instead, so the
 * cutoff never lands a day later than the officer asked for.
 */
export const dateForAge = (years) => {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0 || n > 120) return '';
  const now = new Date();
  const y = now.getFullYear() - Math.floor(n);
  const m = now.getMonth();
  const d = now.getDate();
  const isLeapDay = m === 1 && d === 29;
  const target = new Date(y, m, isLeapDay ? 28 : d);
  const pad = (v) => String(v).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
};

/** How old someone born on `dateStr` is today, or null. */
export const ageForDate = (dateStr) => {
  if (!dateStr) return null;
  const text = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
};

/** "≈ 18 years old today", for showing beside a chosen date. */
export const ageHint = (dateStr) => {
  const age = ageForDate(dateStr);
  return age === null ? '' : `${age} years old today`;
};

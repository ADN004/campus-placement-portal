/**
 * The application deadline, which now carries a time as well as a date.
 *
 * jobs.application_deadline is a TIMESTAMP *without* time zone, and that column
 * means whatever the process reading it thinks local is: '2026-08-18 20:30'
 * comes back as 20:30 IST on a developer's machine and 20:30 UTC — half past
 * two the following morning — on the containers, which run UTC. With a
 * date-only deadline that skew was invisible. With a real time it would move
 * every deadline five and a half hours without anyone noticing.
 *
 * So what gets sent is always a UTC instant, which is what the containers
 * already assume when they read the column, and what gets displayed is always
 * converted back to Indian time. The officer types half past eight in the
 * evening, that is what every student sees, and no environment reinterprets it.
 */

const IST = 'Asia/Kolkata';

/**
 * A datetime-local input's value ('2026-08-18T20:30') as a UTC instant.
 *
 * The typed time is read as Indian time explicitly, not as whatever the browser
 * believes local to be. `new Date('2026-08-18T20:30')` uses the machine's own
 * zone, so a laptop with its clock set to the wrong region — or an officer
 * abroad — would have shifted every deadline it set, silently, while the
 * display side converted through Asia/Kolkata and disagreed with it.
 *
 * IST is UTC+5:30 all year with no daylight saving, so the offset is exact and
 * the arithmetic needs no timezone database.
 *
 * Returns null for an empty box, so clearing the field stores nothing.
 */
const IST_OFFSET_MINUTES = 5 * 60 + 30;

export const localInputToUtc = (value) => {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MINUTES * 60000;
  const dt = new Date(utcMs);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

/**
 * A stored deadline as a datetime-local value, for putting back in the box.
 *
 * Converted through Indian time rather than the browser's own, so an officer
 * travelling — or a machine with its clock set elsewhere — still edits the
 * time the students were shown.
 */
export const utcToLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  // en-CA gives 24-hour parts and ISO-ordered date pieces, which is what the
  // input wants; assembling from parts avoids parsing a formatted string back.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
};

/** '18-08-2026, 8:30 pm IST' — how a deadline reads to a person. */
export const formatDeadline = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const f = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${f.format(d)} IST`;
};

/** Just the day, for places too narrow for the time. */
export const formatDeadlineDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
};

/** Now, as a datetime-local value, for bounding the picker. */
export const nowAsLocalInput = () => utcToLocalInput(new Date().toISOString());

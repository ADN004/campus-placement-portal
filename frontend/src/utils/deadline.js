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

/**
 * The typed deadline read back in words, to be shown under the field.
 *
 * A datetime-local input renders its clock in the browser's locale, and on most
 * setups here that is the 24-hour one. Someone who wants a noon deadline types
 * 1:30, gets 01:30, and has set the deadline for half past one in the morning —
 * the field agrees with them at every step, and the mistake only surfaces when
 * applications close twelve hours early.
 *
 * So the value is echoed back in the form nobody can misread. This deliberately
 * does no timezone conversion: the digits in the box are already the Indian
 * time the officer means, and putting them through a Date would either shift
 * them or convert them back to themselves. The parts are reformatted as they
 * stand, and the weekday is derived through UTC so the date cannot slide by one
 * on a machine set to another zone.
 *
 * Returns null for an empty or half-typed box, so the caller renders nothing
 * rather than "Invalid Date".
 */
export const describeDeadlineInput = (value) => {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;

  const date = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  const day = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);

  const meridiem = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${hour12}:${String(mi).padStart(2, '0')} ${meridiem}`;

  return {
    day,
    time,
    meridiem,
    /*
     * Between midnight and six in the morning almost always means the 24-hour
     * clock was read as a 12-hour one — nobody closes applications at 1:30am on
     * purpose. Flagged rather than blocked: it is a legitimate value, and the
     * officer is the one who knows.
     */
    looksLikeAmPmSlip: h < 6,
  };
};

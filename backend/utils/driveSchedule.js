/**
 * Reading a scheduled drive back out of the database.
 *
 * job_drives holds a DATE and a TIME. node-postgres hands the DATE back as a
 * Date object and the TIME back as the string '14:30:00', and both notify paths
 * dropped them straight into a template literal. The officer's read:
 *
 *   ...is scheduled on Wed Aug 12 2026 00:00:00 GMT+0530 (India Standard Time)
 *   at 14:30:00. Location: ...
 *
 * That is a JavaScript Date's toString() in a message sent to students. The
 * Super Admin's path formatted the date but not the time, so the two roles
 * worded the same event differently.
 */

/**
 * A DATE column as dd-mm-yyyy.
 *
 * Read from the Date's *local* parts rather than converted through a timezone.
 * node-postgres parses a DATE so that its local representation is the calendar
 * date that was stored — midnight local — so the local parts are the answer on
 * any machine. Converting instead would be right on a UTC container and a day
 * out on a developer's laptop, or the reverse, depending which way it was done.
 */
export const formatDriveDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/** A TIME column ('14:30:00') as '2:30 pm'. */
export const formatDriveTime = (value) => {
  if (!value) return null;
  const m = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(value);
  const hours = Number(m[1]);
  const minutes = m[2];
  if (!Number.isFinite(hours) || hours > 23) return String(value);
  const suffix = hours < 12 ? 'am' : 'pm';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${suffix}`;
};

/** True when the row actually carries a scheduled drive. */
export const hasDrive = (row) =>
  Boolean(row && row.drive_date && row.drive_time && row.drive_location);

/**
 * The drive as the student should receive it, or null when none is scheduled.
 * Shaped the same wherever it is returned, so the two roles and the student
 * screens cannot describe one event three ways.
 */
export const driveForStudent = (row) => {
  if (!hasDrive(row)) return null;
  return {
    date: formatDriveDate(row.drive_date),
    time: formatDriveTime(row.drive_time),
    location: row.drive_location,
    instructions: row.additional_instructions || null,
  };
};

/** The sentence both notify paths send. */
export const driveMessage = (jobTitle, companyName, row) => {
  const drive = driveForStudent(row);
  if (!drive) return null;
  const extra = drive.instructions ? ` ${drive.instructions}` : '';
  return `Placement drive for ${jobTitle} at ${companyName} is on ${drive.date} at `
    + `${drive.time}. Venue: ${drive.location}.${extra}`;
};

/* ------------------------------------------------------------- calendar */

/** Escapes the characters iCalendar gives meaning to. */
const icsEscape = (text) =>
  String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/**
 * The drive as a calendar invitation, or null when none is scheduled.
 *
 * A drive is an appointment, and the one thing a student has to be somewhere
 * for. An email they have to remember to re-read is a worse reminder than an
 * entry that puts itself in their calendar with an alarm the evening before.
 *
 * Times are written as local wall-clock with a TZID rather than converted to
 * UTC. The officer typed 2:30 pm meaning half past two in Kerala; converting
 * would make it depend on where the server thinks it is, and a drive an hour
 * out is worse than no calendar entry at all. Two hours is assumed for the
 * length, since job_drives records a start and no end.
 */
export const driveCalendarInvite = (jobTitle, companyName, row) => {
  if (!hasDrive(row)) return null;

  const d = row.drive_date instanceof Date ? row.drive_date : new Date(row.drive_date);
  if (Number.isNaN(d.getTime())) return null;
  const time = String(row.drive_time).match(/^(\d{1,2}):(\d{2})/);
  if (!time) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const startH = Number(time[1]);
  const start = `${day}T${pad(startH)}${time[2]}00`;
  const end = `${day}T${pad((startH + 2) % 24)}${time[2]}00`;

  // A stable identifier, so re-sending an updated drive replaces the entry in
  // the student's calendar instead of adding a second one beside it.
  const uid = `drive-${row.id || `${day}-${companyName}`}@spc.gptcpalakkad.ac.in`
    .replace(/\s+/g, '-');

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//State Placement Cell//Kerala Polytechnics//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Kolkata:${start}`,
    `DTEND;TZID=Asia/Kolkata:${end}`,
    `SUMMARY:${icsEscape(`Placement drive — ${companyName}`)}`,
    `LOCATION:${icsEscape(row.drive_location)}`,
    `DESCRIPTION:${icsEscape(
      `${jobTitle} at ${companyName}.${row.additional_instructions ? ` ${row.additional_instructions}` : ''}`
    )}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT12H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Placement drive tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return {
    filename: 'placement-drive.ics',
    // CRLF, which RFC 5545 requires — some clients reject bare newlines.
    content: `${lines.join('\r\n')}\r\n`,
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
  };
};

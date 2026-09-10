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

/**
 * The most venues one job may be run at.
 *
 * Five, because there are five regions and a drive that the whole state applies
 * to is held region by region. It is a real cap, not a guideline: the composer
 * stops offering Add at five and both write paths refuse a sixth, so the two
 * cannot disagree about it.
 */
export const MAX_DRIVE_SLOTS = 5;

/**
 * One row or a job's whole list, as a list of usable slots.
 *
 * Callers hold either shape — a single row where a drive was fetched with the
 * job, an array where the slots were fetched deliberately — and normalising
 * here means neither has to know which the other passed.
 */
const asDriveRows = (value) =>
  (Array.isArray(value) ? value : [value]).filter(hasDrive);

/** A job's slots as the student should receive them, earliest first. */
export const drivesForStudent = (rows) => asDriveRows(rows).map(driveForStudent);

/**
 * The sentence both notify paths send.
 *
 * One venue reads exactly as it always has — the overwhelming majority of
 * drives, and no reason to reword them. Several are listed numbered, and the
 * message says to attend the one you were told to: which student goes where is
 * settled off the portal, so a message that implied the portal knew would be
 * lying to them.
 *
 * Instructions shared by every slot are printed once at the end rather than
 * repeated five times; where they differ, each slot carries its own.
 */
export const driveMessage = (jobTitle, companyName, rows) => {
  const drives = drivesForStudent(rows);
  if (drives.length === 0) return null;

  if (drives.length === 1) {
    const [drive] = drives;
    const extra = drive.instructions ? ` ${drive.instructions}` : '';
    return `Placement drive for ${jobTitle} at ${companyName} is on ${drive.date} at `
      + `${drive.time}. Venue: ${drive.location}.${extra}`;
  }

  const shared = drives.every((d) => d.instructions === drives[0].instructions)
    ? drives[0].instructions
    : null;

  const list = drives
    .map((d, i) => {
      const own = !shared && d.instructions ? ` ${d.instructions}` : '';
      return `${i + 1}. ${d.date} at ${d.time} — ${d.location}.${own}`;
    })
    .join('\n');

  return `Placement drive for ${jobTitle} at ${companyName} is being held at `
    + `${drives.length} venues. Please attend the one you have been told to:\n\n${list}`
    + `${shared ? `\n\n${shared}` : ''}`;
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
 * One slot as a calendar event, or null when the row is not a usable drive.
 *
 * The UID is built from the slot's own id, so a job with five venues produces
 * five distinct entries and re-sending an updated drive replaces each one in
 * place rather than adding a second beside it.
 */
const driveVevent = (jobTitle, companyName, row) => {
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

  const uid = `drive-${row.id || `${day}-${companyName}`}@spc.gptcpalakkad.ac.in`
    .replace(/\s+/g, '-');

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
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
  ];
};

/**
 * The drive as a calendar invitation, or null when none is scheduled.
 *
 * Takes one row or a job's whole list. A job run in several places becomes
 * several events in one file: which venue a student attends is settled off the
 * portal, so the honest thing is to hand them all of them and let them delete
 * the ones that are not theirs — rather than guess, or send nothing.
 */
export const driveCalendarInvite = (jobTitle, companyName, rows) => {
  const events = asDriveRows(rows)
    .map((row) => driveVevent(jobTitle, companyName, row))
    .filter(Boolean);
  if (events.length === 0) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//State Placement Cell//Kerala Polytechnics//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flat(),
    'END:VCALENDAR',
  ];

  return {
    filename: 'placement-drive.ics',
    // CRLF, which RFC 5545 requires — some clients reject bare newlines.
    content: `${lines.join('\r\n')}\r\n`,
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
  };
};

/* ------------------------------------------------------- who still sees it */

/**
 * Application states that no longer get shown the drive.
 *
 * A student whose application was rejected has been told they are not going
 * forward. Continuing to show them "Upcoming placement drive — turn up here at
 * 10am" is not merely untidy: somebody acts on it and travels to a drive they
 * were dropped from. Every other state is still in the process — submitted and
 * under review are waiting, shortlisted are expected, and selected already
 * attended or will.
 *
 * One list, used by the SQL on the dashboard and by the JavaScript on the job
 * list and the applications page, so the three cannot disagree about it.
 */
export const DRIVE_HIDDEN_STATUSES = ['rejected'];

/** True when an application in this state should still be shown its drive. */
export const applicationSeesDrive = (status) =>
  !DRIVE_HIDDEN_STATUSES.includes(String(status || '').toLowerCase());

/** The same rule as a SQL predicate. */
export const driveVisibleSql = (alias = 'ja') =>
  `(${alias}.application_status IS NULL OR ${alias}.application_status <> ALL(ARRAY[${
    DRIVE_HIDDEN_STATUSES.map((s) => `'${s}'`).join(', ')}]))`;

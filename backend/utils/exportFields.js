/**
 * One description per exportable field, shared by every Excel export.
 *
 * Before this, each export hand-wrote its own `worksheet.columns` array and a
 * matching `addRow` object. Eight of them, each repeating the same knowledge:
 * that a branch may need shortening, that a date is printed in en-IN on Asia/
 * Kolkata, that a boolean reads "Yes"/"No" rather than TRUE/FALSE. Adding
 * field selection to a hand-written list means rewriting the list; adding it to
 * eight means writing the same conversion eight times and getting one of them
 * subtly wrong.
 *
 * So the knowledge lives here once, and an export names the fields it wants.
 *
 * ---------------------------------------------------------------------------
 * Not breaking the exports that already work
 * ---------------------------------------------------------------------------
 *
 * Every one of these endpoints is called today with no field list at all, by
 * officers in the middle of live drives. So each keeps a default list that
 * reproduces its columns exactly — same fields, same order, same header text —
 * and only a caller that explicitly asks for fields gets anything different.
 *
 * Where an endpoint's existing header disagrees with the canonical one (the
 * same column is "Name" in five exports and "Student Name" in a sixth, "DOB"
 * in some and "Date of Birth" in others), the default list carries the legacy
 * spelling as a tuple: `['student_name', 'Name']`. That keeps today's files
 * identical without freezing the odd spellings into the registry, so a caller
 * who picks fields gets the good header and nobody's existing download moves.
 */

import { BRANCH_SHORT_NAMES } from '../constants/branches.js';

/** A day, the way every export already prints one. */
const day = (value) =>
  (value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');

/** A moment — used where the column records an event rather than a date. */
const moment = (value) =>
  (value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');

/*
 * Booleans read as words.
 *
 * NULL becomes "No", matching every existing export rather than what is
 * strictly true. These columns are nullable and reached through a LEFT JOIN to
 * student_extended_profiles, so a student with no extended profile row yields
 * NULL for all four document flags — and there are many. Distinguishing
 * "answered no" from "never asked" would be more honest, but it would silently
 * change a large number of cells in exports officers already rely on, so it
 * belongs in its own change with its own decision, not smuggled in here.
 */
const yesNo = (value) => (value ? 'Yes' : 'No');

/** The first of several source properties that is actually present. */
const firstOf = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return '';
};

/**
 * Every field any Excel export can offer.
 *
 * `from` exists because the same column arrives under different property names
 * depending on which query produced the row — the applicant queries alias the
 * student's name to `name`, the student queries leave it `student_name`, and
 * height is `height` on students but `height_cm` on extended profiles. Naming
 * the alternatives here means neither the SQL nor the caller has to care.
 */
export const EXPORT_FIELDS = {
  prn: { header: 'PRN', width: 15 },
  student_name: { header: 'Student Name', width: 25, from: ['student_name', 'name'] },
  email: { header: 'Email', width: 30 },
  mobile_number: { header: 'Mobile', width: 15, from: ['mobile_number', 'mobile'] },
  college_name: { header: 'College', width: 35 },
  region_name: { header: 'Region', width: 20 },
  branch: {
    header: 'Branch',
    width: (opts) => (opts.useShortNames ? 12 : 30),
    value: (row, opts) =>
      (opts.useShortNames && row.branch ? (BRANCH_SHORT_NAMES[row.branch] || row.branch) : row.branch),
  },
  gender: { header: 'Gender', width: 10 },
  date_of_birth: { header: 'Date of Birth', width: 15, value: (row) => day(row.date_of_birth) },
  age: { header: 'Age', width: 8 },
  complete_address: { header: 'Address', width: 40 },
  district: { header: 'District', width: 15 },

  programme_cgpa: { header: 'CGPA', width: 10 },
  cgpa_sem1: { header: 'Sem 1 CGPA', width: 12 },
  cgpa_sem2: { header: 'Sem 2 CGPA', width: 12 },
  cgpa_sem3: { header: 'Sem 3 CGPA', width: 12 },
  cgpa_sem4: { header: 'Sem 4 CGPA', width: 12 },
  cgpa_sem5: { header: 'Sem 5 CGPA', width: 12 },
  cgpa_sem6: { header: 'Sem 6 CGPA', width: 12 },
  backlog_count: { header: 'Backlogs', width: 12 },
  backlog_details: { header: 'Backlog Details', width: 30 },

  sslc_marks: { header: 'SSLC %', width: 10 },
  sslc_year: { header: 'SSLC Year', width: 12 },
  sslc_board: { header: 'SSLC Board', width: 15 },
  twelfth_marks: { header: '12th %', width: 10 },
  twelfth_year: { header: '12th Year', width: 12 },
  twelfth_board: { header: '12th Board', width: 15 },

  height_cm: { header: 'Height (cm)', width: 12, from: ['height_cm', 'height'] },
  weight_kg: { header: 'Weight (kg)', width: 12, from: ['weight_kg', 'weight'] },
  physically_handicapped: {
    header: 'Disability', width: 12, value: (row) => yesNo(row.physically_handicapped),
  },

  father_name: { header: 'Father Name', width: 25 },
  father_occupation: { header: 'Father Occupation', width: 20 },
  mother_name: { header: 'Mother Name', width: 25 },
  mother_occupation: { header: 'Mother Occupation', width: 20 },

  has_driving_license: {
    header: 'Driving License', width: 12, value: (row) => yesNo(row.has_driving_license),
  },
  has_pan_card: { header: 'PAN Card', width: 10, value: (row) => yesNo(row.has_pan_card) },
  has_aadhar_card: { header: 'Aadhar', width: 10, value: (row) => yesNo(row.has_aadhar_card) },
  has_passport: { header: 'Passport', width: 12, value: (row) => yesNo(row.has_passport) },

  registration_status: { header: 'Registration Status', width: 16 },
  is_blacklisted: { header: 'Blacklisted', width: 12, value: (row) => yesNo(row.is_blacklisted) },
  blacklist_reason: { header: 'Blacklist Reason', width: 30 },
  created_at: { header: 'Registered On', width: 18, value: (row) => moment(row.created_at) },

  application_status: { header: 'Application Status', width: 16 },
  applied_date: { header: 'Applied Date', width: 15, value: (row) => day(row.applied_date) },
  job_title: {
    header: 'Job Title', width: 25, value: (row, opts) => row.job_title ?? opts.jobTitle ?? '',
  },
  company_name: {
    header: 'Company Name', width: 25, value: (row, opts) => row.company_name ?? opts.companyName ?? '',
  },
  placement_package: { header: 'Package (LPA)', width: 12 },
  joining_date: { header: 'Joining Date', width: 12, value: (row) => day(row.joining_date) },
  placement_location: { header: 'Location', width: 20 },

  photo_url: { header: 'Photo URL', width: 50 },
};

/**
 * Normalises a default list or a caller's list into `{ id, header }` pairs.
 *
 * A default entry may be `'prn'` or `['student_name', 'Name']`; a caller sends
 * plain ids. Anything unknown is dropped rather than throwing — a stale field
 * name in a saved preset should cost that column, not the whole export.
 */
const resolve = (fields) =>
  (fields || [])
    .map((entry) => (Array.isArray(entry) ? { id: entry[0], header: entry[1] } : { id: entry, header: null }))
    .filter(({ id }) => Boolean(EXPORT_FIELDS[id]));

/** Which fields an export should use: the caller's choice, or its default. */
export const chooseFields = (requested, fallback) =>
  (Array.isArray(requested) && requested.length > 0 ? resolve(requested) : resolve(fallback));

/** ExcelJS column definitions for the chosen fields. */
export const excelColumns = (chosen, opts = {}) =>
  chosen.map(({ id, header }) => {
    const field = EXPORT_FIELDS[id];
    return {
      header: header || field.header,
      key: id,
      width: typeof field.width === 'function' ? field.width(opts) : field.width,
    };
  });

/** One row's cells, keyed to match `excelColumns`. */
export const excelRow = (row, chosen, opts = {}) => {
  const cells = {};
  chosen.forEach(({ id }) => {
    const field = EXPORT_FIELDS[id];
    if (field.value) cells[id] = field.value(row, opts);
    else if (field.from) cells[id] = firstOf(row, field.from);
    else cells[id] = row[id] ?? '';
  });
  return cells;
};

/** The ids a client may choose from, for the picker to render. */
export const exportableFields = () =>
  Object.entries(EXPORT_FIELDS).map(([id, field]) => ({ key: id, label: field.header }));

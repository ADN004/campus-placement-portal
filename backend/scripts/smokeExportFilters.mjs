#!/usr/bin/env node
/**
 * Does a filtered screen produce a filtered file?
 *
 * The failure this guards against is quiet and expensive: an officer narrows
 * the applicants to "Shortlisted", presses Export, and gets a spreadsheet of
 * everybody -- which looks exactly like a correct one, and goes to a company.
 * Nothing on the page or in the file says the filter was dropped.
 *
 * So each filter is exercised against real rows, with the expected counts
 * worked out by hand from the seed rather than read back from the same query
 * that is under test.
 *
 * Runs against a scratch database, not your real one:
 *   DB_NAME=spc_filter_check node backend/scripts/smokeExportFilters.mjs
 */
import { query, closePool } from '../config/database.js';
import { applicantFilterClauses, filtersFromRequest } from '../utils/applicantFilters.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const OFF = '\x1b[0m';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`${GREEN} ok ${OFF} ${label}`);
  else {
    failures += 1;
    console.log(`${RED}FAIL${OFF} ${label}${detail ? `\n       ${detail}` : ''}`);
  }
};

if ((process.env.DB_NAME || '') === 'campus_placement_portal') {
  console.error('Refusing to run against campus_placement_portal.');
  process.exit(1);
}

/* ------------------------------------------------------------------ seed */

/**
 * Six applicants, chosen so every filter has both a hit and a miss and no two
 * filters select the same set -- otherwise a clause that silently does nothing
 * would still pass.
 */
const PEOPLE = [
  // cgpa, backlogs, dob,          status,         sslc, district
  [9.0, '0', '2004-01-01', 'shortlisted', 90, 'Palakkad'],
  [8.0, '0', '2005-06-15', 'shortlisted', 60, 'Thrissur'],
  [7.0, '2', '2003-03-10', 'under_review', 80, 'Palakkad'],
  [6.0, '5', '2006-11-20', 'under_review', 40, 'Kollam'],
  [8.5, '', '2004-08-05', 'rejected', 70, 'Palakkad'],
  [5.5, '1', '2002-02-28', 'selected', 55, 'Thrissur'],
];

async function seed() {
  await query(`TRUNCATE job_applications, student_extended_profiles, students, jobs,
               placement_officers, colleges, regions, users RESTART IDENTITY CASCADE`);

  const region = await query(
    `INSERT INTO regions (region_name, region_code) VALUES ('R','R1') RETURNING id`
  );
  const college = await query(
    `INSERT INTO colleges (college_name, college_code, region_id) VALUES ('C','C1',$1) RETURNING id`,
    [region.rows[0].id]
  );
  const admin = await query(
    `INSERT INTO users (email, password_hash, role) VALUES ('a@t.local','x','super_admin') RETURNING id`
  );
  const job = await query(
    `INSERT INTO jobs (job_title, company_name, job_description, application_form_url,
       application_start_date, application_deadline, created_by)
     VALUES ('T','Co','d','https://e.com',CURRENT_DATE-30,CURRENT_DATE-1,$1) RETURNING id`,
    [admin.rows[0].id]
  );

  for (let i = 0; i < PEOPLE.length; i += 1) {
    const [cgpa, backlogs, dob, status, sslc, district] = PEOPLE[i];
    const u = await query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1,'x','student') RETURNING id`,
      [`s${i}@t.local`]
    );
    const s = await query(
      `INSERT INTO students (user_id, prn, region_id, college_id, email, mobile_number,
         date_of_birth, programme_cgpa, backlog_count, student_name, registration_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved') RETURNING id`,
      [u.rows[0].id, `P${i}`, region.rows[0].id, college.rows[0].id,
        `s${i}@t.local`, `90000000${i}`, dob, cgpa, backlogs, `S${i}`]
    );
    // Upsert: a trigger creates the extended-profile row with the student, so
    // a plain insert collides on the very first seed.
    await query(
      `INSERT INTO student_extended_profiles (student_id, sslc_marks, district)
       VALUES ($1,$2,$3)
       ON CONFLICT (student_id)
       DO UPDATE SET sslc_marks = EXCLUDED.sslc_marks, district = EXCLUDED.district`,
      [s.rows[0].id, sslc, district]
    );
    await query(
      `INSERT INTO job_applications (job_id, student_id, application_status, status_source)
       VALUES ($1,$2,$3,'student_apply')`,
      [job.rows[0].id, s.rows[0].id, status]
    );
  }
  return job.rows[0].id;
}

/** Run the builder's clauses for real and count what comes back. */
async function countWith(jobId, filters) {
  const params = [jobId];
  const clauses = applicantFilterClauses(filters, params, {
    student: 's', application: 'ja', extended: 'ep',
  });
  const where = clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '';
  const r = await query(
    `SELECT COUNT(*)::int AS n
       FROM job_applications ja
       JOIN students s ON s.id = ja.student_id
       LEFT JOIN student_extended_profiles ep ON ep.student_id = s.id
      WHERE ja.job_id = $1${where}`,
    params
  );
  return r.rows[0].n;
}

/* ----------------------------------------------------------------- tests */

async function main() {
  const jobId = await seed();

  check('no filters returns everybody', (await countWith(jobId, {})) === 6);

  check('stage filter returns only that stage',
    (await countWith(jobId, { application_statuses: ['shortlisted'] })) === 2);

  check('two stages return both',
    (await countWith(jobId, { application_statuses: ['shortlisted', 'selected'] })) === 3);

  // The retired spelling has to come back under the current one, or a filtered
  // export quietly drops people the screen was showing.
  await query(`UPDATE job_applications SET application_status='submitted'
                WHERE id = (SELECT MIN(id) FROM job_applications
                             WHERE application_status='under_review')`);
  check('asking for under_review also finds the retired "submitted" spelling',
    (await countWith(jobId, { application_statuses: ['under_review'] })) === 2,
    'a row still spelled submitted was dropped');

  check('minimum CGPA', (await countWith(jobId, { cgpa_min: 8 })) === 3);
  check('maximum CGPA', (await countWith(jobId, { cgpa_max: 7 })) === 3);
  check('CGPA range', (await countWith(jobId, { cgpa_min: 7, cgpa_max: 8.5 })) === 3);

  // The blank backlog_count has to read as zero rather than raising and
  // failing the whole export -- the column is text and has held blanks.
  check('maximum backlogs, with a blank count read as none',
    (await countWith(jobId, { max_backlogs: 0 })) === 3,
    'expected the two zeroes plus the blank');

  check('backlogs at most 2', (await countWith(jobId, { max_backlogs: 2 })) === 5);

  check('born on or after', (await countWith(jobId, { dob_from: '2004-01-01' })) === 4);
  check('born on or before', (await countWith(jobId, { dob_to: '2004-01-01' })) === 3);
  check('date of birth range',
    (await countWith(jobId, { dob_from: '2004-01-01', dob_to: '2005-12-31' })) === 3);

  check('minimum SSLC marks', (await countWith(jobId, { sslc_min: 70 })) === 3);
  check('district', (await countWith(jobId, { district: 'Palakkad' })) === 3);

  check('filters combine rather than replace each other',
    (await countWith(jobId, { cgpa_min: 8, application_statuses: ['shortlisted'] })) === 2);

  check('a filter that matches nobody returns nobody',
    (await countWith(jobId, { cgpa_min: 9.9 })) === 0);

  /* ------------------------------------------------- request normalising */

  // The two older exports are GETs, so every value arrives as text.
  const fromQuery = filtersFromRequest({
    query: { cgpa_min: '8', application_statuses: 'shortlisted,selected', has_pan: 'true' },
    body: {},
  });
  check('a GET query string is read the same as a JSON body',
    fromQuery.cgpa_min === '8'
      && Array.isArray(fromQuery.application_statuses)
      && fromQuery.application_statuses.length === 2
      && fromQuery.has_pan === true,
    JSON.stringify(fromQuery));

  const empty = filtersFromRequest({ query: {}, body: {} });
  check('an untouched control filters nothing',
    (await countWith(jobId, empty)) === 6,
    'empty filters narrowed the list');

  console.log('');
  if (failures) {
    console.log(`${RED}${failures} check(s) failed${OFF}`);
    process.exitCode = 1;
  } else {
    console.log(`${GREEN}all checks passed${OFF}`);
  }
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await closePool();
}

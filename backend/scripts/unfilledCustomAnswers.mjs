/**
 * Who still owes a job's own extra questions.
 *
 * Some jobs ask their own questions — "10th Maths %", "Aadhaar Number" — and
 * for a long while the answers students typed were dropped on submission: the
 * app sent `tier3_custom_responses` and the handler read
 * `custom_field_responses`. The applications are valid; the answers were never
 * stored, and cannot be recovered. Students are asked a second time through the
 * popup driven by getPendingCustomAnswers, but there is no way to get the list
 * of who still owes out of the portal, and that list is what an officer needs
 * in order to chase them.
 *
 * Read-only. It runs SELECTs and writes one PDF; it changes no row and writes
 * no activity log, so it is safe to run against production.
 *
 * "Still owes" is deliberately the same rule the popup uses (`hasNoAnswers` in
 * enhancedApplicationController): nothing was ever recorded — no row, an empty
 * object, or an object whose every value is blank. A student who answered some
 * questions and left others is NOT listed, because saveCustomAnswers rejects
 * their submission outright with a 409; chasing them would send them at a door
 * that is locked. `--partial` prints that group separately for inspection.
 *
 * Usage, inside the backend container:
 *   node scripts/unfilledCustomAnswers.mjs                    # jobs that ask questions
 *   node scripts/unfilledCustomAnswers.mjs --find Trainee     # find a job id
 *   node scripts/unfilledCustomAnswers.mjs --job 42           # write the PDF
 *   node scripts/unfilledCustomAnswers.mjs --job 42 --status submitted
 *   node scripts/unfilledCustomAnswers.mjs --job 42 --partial
 */
import fs from 'fs';
import { query, closePool } from '../config/database.js';
import { generateStudentPDF } from '../utils/pdfGenerator.js';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : (argv[i + 1] ?? '');
};
const has = (name) => argv.includes(`--${name}`);

/*
 * The columns an officer needs in order to chase someone, and no more. Every
 * key here is one pdfGenerator already knows how to label, so no fieldLabels
 * map is needed — this list carries none of the job's own questions, by
 * definition: the people on it answered none of them.
 */
const FIELDS = ['prn', 'student_name', 'college_name', 'branch', 'email', 'mobile_number'];

/*
 * The answers as a walkable object.
 *
 * jsonb_each_text raises an error on anything that is not an object, and this
 * column is written by more than one path over the years — so a row holding a
 * scalar or an array would take the whole query down rather than skip one
 * student. jsonb_typeof is NULL for a missing row too, which makes the CASE
 * cover the LEFT JOIN miss as well and COALESCE unnecessary.
 */
const ANSWERS = `
  CASE WHEN jsonb_typeof(jae.custom_field_responses) = 'object'
       THEN jae.custom_field_responses
       ELSE '{}'::jsonb END`;

/** Answered nothing at all: no row, `{}`, or every value blank. */
const NO_ANSWERS_SQL = `
  NOT EXISTS (
    SELECT 1 FROM jsonb_each_text(${ANSWERS}) kv
    WHERE btrim(kv.value) <> ''
  )`;

/** Answered some but not all — the group that cannot self-correct. */
const PARTIAL_SQL = `
  EXISTS (
    SELECT 1 FROM jsonb_each_text(${ANSWERS}) kv
    WHERE btrim(kv.value) <> ''
  )
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(${ANSWERS}) kv
    WHERE btrim(kv.value) = ''
  )`;

/**
 * Collects the finished PDF into a file.
 *
 * generateStudentPDF writes to an Express response, and rewriting it to take a
 * stream would change a function five live export routes depend on. This stands
 * in for the response instead, so the generator is used exactly as the portal
 * uses it and the file matches what the export produces.
 */
const fileResponse = (path) => {
  let resolve;
  let reject;
  const done = new Promise((res, rej) => { resolve = res; reject = rej; });
  const res = {
    headersSent: false,
    setHeader() {},
    send(buffer) {
      this.headersSent = true;
      fs.writeFileSync(path, buffer);
      resolve(buffer.length);
    },
    status(code) {
      const self = this;
      return {
        json(body) {
          reject(new Error(`PDF generation failed (${code}): ${JSON.stringify(body)}`));
          return self;
        },
      };
    },
  };
  return { res, done };
};

/** A job's own questions, or [] for anything unparseable. */
const questionsOf = (raw) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
    return Array.isArray(parsed) ? parsed.filter((f) => f && f.field_name) : [];
  } catch {
    return [];
  }
};

const listJobsWithQuestions = async () => {
  const r = await query(`
    SELECT j.id, j.job_title, j.company_name, jrt.custom_fields,
           (SELECT count(*) FROM job_applications ja WHERE ja.job_id = j.id) AS applicants
    FROM jobs j
    JOIN job_requirement_templates jrt ON jrt.job_id = j.id
    ORDER BY j.id DESC`);
  return r.rows
    .map((row) => ({ ...row, questions: questionsOf(row.custom_fields) }))
    .filter((row) => row.questions.length > 0);
};

const main = async () => {
  const find = flag('find');
  if (find !== null) {
    const r = await query(
      `SELECT id, job_title, company_name FROM jobs
       WHERE job_title ILIKE $1 OR company_name ILIKE $1
       ORDER BY id DESC`,
      [`%${find}%`]
    );
    if (r.rows.length === 0) console.log(`No job matches "${find}".`);
    r.rows.forEach((j) => console.log(`  ${String(j.id).padStart(5)}  ${j.job_title} — ${j.company_name}`));
    return;
  }

  const jobId = flag('job');
  if (!jobId) {
    const rows = await listJobsWithQuestions();
    if (rows.length === 0) {
      console.log('No job asks its own questions.');
      return;
    }
    console.log('Jobs that ask their own questions:\n');
    rows.forEach((j) => console.log(
      `  ${String(j.id).padStart(5)}  ${j.questions.length} question(s), ${j.applicants} applicant(s)  ${j.job_title} — ${j.company_name}`
    ));
    console.log('\nRe-run with --job <id>.');
    return;
  }

  if (!/^\d+$/.test(jobId)) throw new Error(`--job takes a number, got "${jobId}". Use --find to look one up.`);

  const jobRow = await query('SELECT id, job_title, company_name FROM jobs WHERE id = $1', [jobId]);
  if (jobRow.rows.length === 0) throw new Error(`No job with id ${jobId}.`);
  const job = jobRow.rows[0];

  const tmpl = await query(
    'SELECT custom_fields FROM job_requirement_templates WHERE job_id = $1',
    [jobId]
  );
  const questions = questionsOf(tmpl.rows[0]?.custom_fields);
  if (questions.length === 0) {
    console.log(`"${job.job_title}" asks no extra questions — nobody can owe anything.`);
    return;
  }

  console.log(`\n${job.job_title} — ${job.company_name}`);
  console.log(`Questions asked: ${questions.map((f) => f.field_label || f.field_name).join(', ')}\n`);

  const status = flag('status');
  const params = [jobId];
  let statusClause = '';
  if (status) {
    params.push(status);
    statusClause = ' AND ja.application_status = $2';
  }

  const listSql = (condition) => `
    SELECT s.prn, s.student_name, s.branch, s.email, s.mobile_number,
           c.college_name, ja.application_status,
           jae.custom_field_responses
    FROM job_applications ja
    JOIN students s ON s.id = ja.student_id
    LEFT JOIN colleges c ON c.id = s.college_id
    LEFT JOIN job_applications_extended jae ON jae.application_id = ja.id
    WHERE ja.job_id = $1
      AND s.registration_status = 'approved'
      AND s.is_blacklisted = FALSE
      ${statusClause}
      AND ${condition}
    ORDER BY c.college_name NULLS LAST, s.prn`;

  if (has('partial')) {
    const r = await query(listSql(PARTIAL_SQL), params);
    console.log(`Answered some questions but not all: ${r.rows.length}`);
    console.log('These cannot correct themselves — saveCustomAnswers rejects them with a 409.\n');
    r.rows.forEach((s) => console.log(
      `  ${s.prn}  ${String(s.student_name).padEnd(32)} ${s.college_name || '—'}  ${JSON.stringify(s.custom_field_responses)}`
    ));
    return;
  }

  const total = await query(
    `SELECT count(*)::int AS n
     FROM job_applications ja
     JOIN students s ON s.id = ja.student_id
     WHERE ja.job_id = $1
       AND s.registration_status = 'approved'
       AND s.is_blacklisted = FALSE${statusClause}`,
    params
  );
  const result = await query(listSql(NO_ANSWERS_SQL), params);
  const students = result.rows;

  console.log(`Applicants: ${total.rows[0].n}`);
  console.log(`Never answered: ${students.length}`);

  const byStatus = students.reduce((acc, s) => {
    acc[s.application_status] = (acc[s.application_status] || 0) + 1;
    return acc;
  }, {});
  const statusLine = Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`By application status: ${statusLine || '—'}`);

  const byCollege = students.reduce((acc, s) => {
    const key = s.college_name || 'Unknown college';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log('\nBy college:');
  Object.entries(byCollege)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, n]) => console.log(`  ${String(n).padStart(4)}  ${name}`));

  if (students.length === 0) {
    console.log('\nNothing to chase — every applicant has answered.');
    return;
  }

  const out = flag('out') || `/tmp/unfilled_job_${jobId}.pdf`;
  const { res, done } = fileResponse(out);
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  await generateStudentPDF(students, {
    selectedFields: FIELDS,
    headerLine1: job.job_title,
    headerLine2: `Extra questions not answered — ${students.length} students as on ${today}`,
    includeSignature: false,
    useShortNames: true,
  }, res);
  const bytes = await done;
  console.log(`\nWrote ${out} (${bytes} bytes, ${students.length} students).`);
};

main()
  .catch((error) => {
    console.error('\nFailed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());

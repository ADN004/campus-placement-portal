/**
 * The date-of-birth and gender criteria, defined once.
 *
 * Whether a student is eligible for a job is decided in four places that must
 * agree: the check behind the student's job list, the check run before the
 * apply form opens, the re-check run when the form is submitted, and a SQL
 * rebuild of the same rules for "eligible but not applied". CGPA, backlogs and
 * branch are each written out longhand in all four, which is how the existing
 * ones drifted — the SQL max_weight clause is missing a guard its three
 * siblings have, so a student with no weight recorded is excluded by the
 * maximum and admitted by the minimum.
 *
 * These two do not get four copies. The predicates below are the answer for
 * every JavaScript caller, and the SQL builders emit the same rule for the one
 * caller that has to ask the database.
 */

export const GENDER_REQUIREMENTS = ['all', 'male', 'female'];

/** How a gender requirement reads to a person. */
export const GENDER_LABELS = {
  all: 'Open to all',
  male: 'Male candidates only',
  female: 'Female candidates only',
};

/** DD-MM-YYYY, matching how dates are shown everywhere else in the product. */
export const formatDob = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/**
 * Normalises a job's cutoff to a plain YYYY-MM-DD string.
 *
 * The column is a DATE, but node-postgres hands DATE back as a Date pinned to
 * local midnight. Comparing that against another Date works; turning it into an
 * ISO string does not, because in any timezone behind UTC local midnight is the
 * previous day, which would silently shift the cutoff by one and change who is
 * eligible. Reading the local parts avoids the round trip entirely.
 */
export const dobCutoffValue = (job, field = 'dob_on_or_before') => {
  const raw = job?.[field];
  if (!raw) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  }
  return String(raw).slice(0, 10);
};

/** The student's own date of birth as YYYY-MM-DD, or null. */
const studentDobValue = (student) => {
  const raw = student?.date_of_birth;
  if (!raw) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  }
  return String(raw).slice(0, 10);
};

/**
 * Why this student fails the job's date-of-birth cutoff, or null if they pass.
 *
 * Compared as YYYY-MM-DD strings, which sort correctly as text and cannot be
 * moved a day by a timezone. students.date_of_birth is NOT NULL, so unlike
 * height and weight there is no "not filled in" case to let through.
 */
export const dobCutoffFailure = (job, student) => {
  const before = dobCutoffValue(job, 'dob_on_or_before');
  const after = dobCutoffValue(job, 'dob_on_or_after');
  if (!before && !after) return null;

  const dob = studentDobValue(student);
  if (!dob) {
    return 'This drive has a date-of-birth requirement and yours is not recorded';
  }
  // "on or before" is the older bound — a minimum age. "on or after" is the
  // younger one — a maximum age. Either may be set alone; together they are a
  // window, and the two messages stay separate so a student is told which end
  // they fall outside rather than just "you do not qualify".
  if (before && dob > before) {
    return `This drive is open to students born on or before ${formatDob(before)}; yours is ${formatDob(dob)}`;
  }
  if (after && dob < after) {
    return `This drive is open to students born on or after ${formatDob(after)}; yours is ${formatDob(dob)}`;
  }
  return null;
};

/**
 * Why this student fails the job's gender requirement, or null if they pass.
 *
 * 'all' is the default and admits everyone. A gendered drive admits only
 * students recorded as exactly that gender: 'Other', and anyone with no gender
 * recorded, are not eligible. That is a deliberate decision rather than an
 * oversight — a company asking for a male-only drive is not asking for
 * everyone-except-women — and it costs those students nothing on the 'all'
 * jobs that are the default and the large majority.
 */
export const genderFailure = (job, student) => {
  const required = (job?.gender_requirement || 'all').toLowerCase();
  if (required === 'all' || !GENDER_REQUIREMENTS.includes(required)) return null;
  const actual = (student?.gender || '').trim().toLowerCase();
  if (actual === required) return null;
  const word = required === 'male' ? 'male' : 'female';
  return `This drive is open to ${word} candidates only`;
};

/**
 * SQL for the same two rules, for the one caller that filters in the database.
 *
 * Pushes onto the caller's params array and returns clauses to AND together, so
 * the rule stays beside its JavaScript twin instead of being written out again
 * three hundred lines away in a different file.
 */
export const eligibilitySqlClauses = (job, params, alias = 's') => {
  const clauses = [];

  const before = dobCutoffValue(job, 'dob_on_or_before');
  if (before) {
    params.push(before);
    clauses.push(`${alias}.date_of_birth <= $${params.length}::date`);
  }
  const after = dobCutoffValue(job, 'dob_on_or_after');
  if (after) {
    params.push(after);
    clauses.push(`${alias}.date_of_birth >= $${params.length}::date`);
  }

  const required = (job?.gender_requirement || 'all').toLowerCase();
  if (required === 'male' || required === 'female') {
    params.push(required);
    // LOWER() because the column stores 'Male'/'Female'/'Other' while the
    // requirement is stored lowercase; comparing raw would match nothing.
    clauses.push(`LOWER(${alias}.gender) = $${params.length}`);
  }

  return clauses;
};

/**
 * Both criteria at once, for callers that just want a reason.
 * Returns the first failure, or null.
 */
export const dobAndGenderFailure = (job, student) =>
  dobCutoffFailure(job, student) || genderFailure(job, student);

/* ------------------------------------------------------------- write side */

/**
 * A submitted cutoff, as YYYY-MM-DD or null.
 *
 * Returns { value } or { error }. An unparseable date is rejected rather than
 * stored as null, because silently dropping an eligibility rule the officer
 * believes they set is the worst of the three outcomes — the drive would admit
 * everybody and nothing on screen would say so.
 */
export const normalizeDobCutoff = (raw) => {
  if (raw === undefined) return { value: undefined };
  if (raw === null || raw === '') return { value: null };
  const text = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { error: 'Date of birth cutoff must be a date (YYYY-MM-DD)' };
  }
  const [y, m, d] = text.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return { error: `${text} is not a real date` };
  }
  // A cutoff in the future admits nobody who is not yet born and, more to the
  // point, is always a typo — 2026 typed where 2006 was meant.
  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (text > todayText) {
    return { error: 'Date of birth cutoff cannot be in the future' };
  }
  return { value: text };
};

/** A submitted gender requirement, lowercased. Returns { value } or { error }. */
export const normalizeGenderRequirement = (raw) => {
  if (raw === undefined) return { value: undefined };
  if (raw === null || raw === '') return { value: 'all' };
  const text = String(raw).trim().toLowerCase();
  if (!GENDER_REQUIREMENTS.includes(text)) {
    return { error: `Gender requirement must be one of: ${GENDER_REQUIREMENTS.join(', ')}` };
  }
  return { value: text };
};

/**
 * Both bounds and the window between them, for a request body.
 *
 * Returns { before, after, error }. `undefined` for either means "not supplied,
 * leave it alone", which is what an update needs; null means "clear it".
 *
 * The window is checked here rather than only at the database so an officer who
 * transposes the two dates gets a sentence instead of a constraint violation.
 */
export const normalizeDobWindow = (body) => {
  const before = normalizeDobCutoff(body?.dob_on_or_before);
  if (before.error) return { error: before.error };
  const after = normalizeDobCutoff(body?.dob_on_or_after);
  if (after.error) return { error: after.error.replace('cutoff', 'earliest date') };

  if (before.value && after.value && after.value > before.value) {
    return {
      error: 'The date-of-birth range is back to front: "on or after" must be the '
        + 'earlier date and "on or before" the later one.',
    };
  }
  return { before: before.value, after: after.value };
};

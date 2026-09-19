/**
 * The filters on the applicants page, as SQL, in one place.
 *
 * There are four export handlers -- a basic and an enhanced one in each of the
 * two staff roles -- and the filters an officer had set on screen reached
 * exactly one of them. Set "Shortlisted", press the plain Export, and you got
 * every applicant on the job with no indication that the filter had been
 * ignored. A filtered list that silently exports unfiltered is worse than one
 * that cannot filter at all: the file looks right, and it goes to a company.
 *
 * So the clauses are written once and every export builds its WHERE from here.
 * The comparisons deliberately mirror what the page does to the rows in the
 * browser, column for column, so the file and the screen agree:
 *
 *   - CGPA against programme_cgpa
 *   - backlogs against backlog_count, the text column the page reads, NOT the
 *     summed backlogs_sem1..6 used for eligibility. The two disagree on real
 *     data, and this filter's job is to reproduce the list on screen rather
 *     than to be the better of the two measures.
 *   - dates against date_of_birth, inclusive at both ends
 *
 * Every value is passed as a parameter; nothing is interpolated.
 */

/** Is this a value the user actually set, rather than an empty control? */
const given = (v) => v !== undefined && v !== null && v !== '';

const asNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Build WHERE fragments for the applicant filters.
 *
 * @param {object} filters  the raw filter values, named as the API takes them
 * @param {Array} params    the query's parameter array, appended to in place
 * @param {object} aliases  table aliases to build column references from
 * @returns {string[]} clauses to AND into the query
 */
export function applicantFilterClauses(filters = {}, params = [], aliases = {}) {
  const s = aliases.student || 's';
  const ja = aliases.application || 'ja';
  const ep = aliases.extended || 'ep';

  const clauses = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  /* ------------------------------------------------- stage and college */

  if (Array.isArray(filters.application_statuses) && filters.application_statuses.length > 0) {
    // 'submitted' is the retired spelling of under_review and may still sit on
    // an older row, so asking for one has to match the other or a filtered
    // export quietly drops people the screen was showing.
    const wanted = new Set(filters.application_statuses);
    if (wanted.has('under_review')) wanted.add('submitted');
    clauses.push(`${ja}.application_status = ANY(${bind([...wanted])})`);
  }

  if (given(filters.college_id)) {
    const id = asNumber(filters.college_id);
    if (id !== null) clauses.push(`${s}.college_id = ${bind(id)}`);
  }

  /* -------------------------------------------------------- academics */

  if (given(filters.cgpa_min)) {
    const v = asNumber(filters.cgpa_min);
    if (v !== null) clauses.push(`${s}.programme_cgpa >= ${bind(v)}`);
  }

  if (given(filters.cgpa_max)) {
    const v = asNumber(filters.cgpa_max);
    if (v !== null) clauses.push(`${s}.programme_cgpa <= ${bind(v)}`);
  }

  if (given(filters.max_backlogs)) {
    const v = asNumber(filters.max_backlogs);
    if (v !== null) {
      // backlog_count is text and has held blanks and stray spacing over the
      // years, so anything that is not a plain number is read as zero rather
      // than raising and failing the whole export.
      clauses.push(
        `COALESCE(NULLIF(regexp_replace(${s}.backlog_count, '[^0-9]', '', 'g'), '')::int, 0) <= ${bind(v)}`
      );
    }
  }

  /* ----------------------------------------------------- date of birth */

  if (given(filters.dob_from)) {
    clauses.push(`${s}.date_of_birth >= ${bind(filters.dob_from)}::date`);
  }

  if (given(filters.dob_to)) {
    clauses.push(`${s}.date_of_birth <= ${bind(filters.dob_to)}::date`);
  }

  /* ------------------------------------------------- extended profile */

  if (given(filters.sslc_min)) {
    const v = asNumber(filters.sslc_min);
    if (v !== null) clauses.push(`COALESCE(${ep}.sslc_marks, 0) >= ${bind(v)}`);
  }

  if (given(filters.twelfth_min)) {
    const v = asNumber(filters.twelfth_min);
    if (v !== null) clauses.push(`COALESCE(${ep}.twelfth_marks, 0) >= ${bind(v)}`);
  }

  if (given(filters.height_min)) {
    const v = asNumber(filters.height_min);
    if (v !== null) clauses.push(`COALESCE(${ep}.height_cm, 0) >= ${bind(v)}`);
  }

  if (given(filters.weight_min)) {
    const v = asNumber(filters.weight_min);
    if (v !== null) clauses.push(`COALESCE(${ep}.weight_kg, 0) >= ${bind(v)}`);
  }

  if (given(filters.district)) {
    clauses.push(`${ep}.district = ${bind(filters.district)}`);
  }

  /* ---------------------------------------------------------- documents */

  // Three-state in the data: true, false, or never asked. Only an explicit
  // true or false filters; undefined means the control was left alone.
  const documents = [
    ['has_passport', `${ep}.has_passport`],
    ['has_aadhar', `${ep}.has_aadhar_card`],
    ['has_pan', `COALESCE(${ep}.has_pan_card, ${s}.has_pan_card)`],
    ['has_driving_license', `${s}.has_driving_license`],
    ['physically_handicapped', `${ep}.physically_handicapped`],
  ];
  for (const [key, column] of documents) {
    if (filters[key] === true || filters[key] === false) {
      clauses.push(`COALESCE(${column}, FALSE) = ${bind(filters[key])}`);
    }
  }

  return clauses;
}

/**
 * Read the filters from a request, whichever way it carries them.
 *
 * The enhanced exports POST a body and the basic ones are GETs with a query
 * string, so the same filter arrives under the same name in two different
 * places. Normalised here so the handlers do not each have to know which.
 */
export function filtersFromRequest(req) {
  const body = req.body || {};
  const q = req.query || {};

  const bool = (v) => {
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return undefined;
  };

  const list = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.length > 0) return v.split(',').filter(Boolean);
    return [];
  };

  const pick = (name) => (body[name] !== undefined ? body[name] : q[name]);

  return {
    application_statuses: list(pick('application_statuses')),
    college_id: pick('college_id'),
    cgpa_min: pick('cgpa_min'),
    cgpa_max: pick('cgpa_max'),
    max_backlogs: pick('max_backlogs'),
    dob_from: pick('dob_from'),
    dob_to: pick('dob_to'),
    sslc_min: pick('sslc_min'),
    twelfth_min: pick('twelfth_min'),
    district: pick('district'),
    height_min: pick('height_min'),
    weight_min: pick('weight_min'),
    has_passport: bool(pick('has_passport')),
    has_aadhar: bool(pick('has_aadhar')),
    has_pan: bool(pick('has_pan')),
    has_driving_license: bool(pick('has_driving_license')),
    physically_handicapped: bool(pick('physically_handicapped')),
  };
}

export default { applicantFilterClauses, filtersFromRequest };

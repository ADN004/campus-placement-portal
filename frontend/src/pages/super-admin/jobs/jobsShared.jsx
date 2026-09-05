/**
 * The pieces both job pages need — the list at `/super-admin/jobs` and the
 * editor at `/super-admin/jobs/new` and `/jobs/:jobId/edit`.
 *
 * They live here rather than in either page because the two must agree about
 * who a job reaches. The list prints it, the editor writes it, and a
 * disagreement between them is how an audience quietly changes on save.
 */

/**
 * The colleges a stored targeting shape actually reaches.
 *
 * Mirrors `collegesReachedBy` on the server, which is what really decides who
 * sees the job. Used for two things that must agree: greying the colleges a job
 * already covers, and converting an older job into the picker's terms when it
 * is opened for editing.
 */
export function reachedCollegeIds(targeting, colleges) {
  if (!targeting) return [];
  const { target_type: type } = targeting;
  const regionIds = new Set((targeting.target_regions || []).map(String));
  const collegeIds = new Set((targeting.target_colleges || []).map(String));
  const inRegions = (c) => regionIds.has(String(c.region_id));
  const named = (c) => collegeIds.has(String(c.id));
  return colleges
    .filter((c) => {
      if (type === 'all') return true;
      if (type === 'region') return inRegions(c);
      if (type === 'college') return named(c);
      if (type === 'specific') return inRegions(c) || named(c);
      return false;
    })
    .map((c) => c.id);
}

/** A blank job. One definition, so create and reset cannot drift apart. */
export const EMPTY_JOB_FORM = {
  title: '',
  company_name: '',
  description: '',
  location: '',
  salary_package: '',
  no_of_vacancies: '',
  application_deadline: '',
  min_cgpa: '',
  max_backlogs: '',
  backlog_policy: 'no_restriction',
  allowed_backlog_semesters: [],
  allowed_branches: [],
  dob_on_or_before: '',
  dob_on_or_after: '',
  gender_requirement: 'all',
  // 'college' means the picker; 'all' means every college, including any
  // added to the portal later.
  target_type: 'college',
  target_regions: [],
  target_colleges: [],
  application_form_url: '',
  // Extended requirements
  requires_academic_extended: false,
  requires_physical_details: false,
  requires_family_details: false,
  requires_personal_details: false,
  requires_document_verification: false,
  requires_education_preferences: false,
  specific_field_requirements: {},
  custom_fields: [],
};

/** The six extended-profile sections a job can demand, in the student's order. */
export const PROFILE_SECTIONS = [
  ['requires_academic_extended', 'Academic', 'SSLC and 12th details'],
  ['requires_physical_details', 'Physical', 'Height, weight, disability'],
  ['requires_family_details', 'Family', 'Parents and siblings'],
  ['requires_personal_details', 'Personal', 'District, address, interests'],
  ['requires_document_verification', 'Documents', 'PAN, Aadhaar, passport'],
  ['requires_education_preferences', 'Education', 'B.Tech / M.Tech interest'],
];

/** A deadline is a day here; the editor keeps the time. */
export function formatDay(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** A deletion is a moment. */
export function formatMoment(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** `[]` for anything unparseable, rather than throwing inside a render. */
function parseList(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Who a job reaches, in words.
 *
 * `specific` is the shape an officer's request produces and it can carry either
 * list, so it is resolved to whichever it actually has before anything else —
 * the original did the same, and without it a request-born job reads "N/A".
 */
/**
 * Name lookups for the audience column, built once per render of the list.
 *
 * `targetDisplay` used to do `colleges.filter(c => ids.includes(c.id))` for
 * every row. That is O(colleges × ids) per row — with sixty colleges and a job
 * aimed at all of them, 3,600 comparisons — so a thousand jobs cost millions of
 * comparisons on every render, and a render happens on every tab click. Two
 * Maps make it O(ids) per row instead, and they are built once for the whole
 * table rather than once per row.
 */
export function nameLookups(regions, colleges) {
  const regionName = new Map(regions.map((r) => [r.id, r.region_name || r.name]));
  const collegeName = new Map(colleges.map((c) => [c.id, c.college_name || c.name]));
  return { regionName, collegeName };
}

export function targetDisplay(job, regions, colleges, lookups) {
  let subject = job;

  if (job.target_type === 'specific') {
    if (job.target_regions) subject = { ...job, target_type: 'region' };
    else if (job.target_colleges) subject = { ...job, target_type: 'college' };
    else return 'Every student';
  }

  if (subject.target_type === 'all') return 'Every student';

  // Built here only when a caller did not hand them in — a single row opened in
  // a dialog does not need the table's shared maps.
  const { regionName, collegeName } = lookups || nameLookups(regions, colleges);

  if ((subject.target_type === 'region' || subject.target_type === 'specific')
    && subject.target_regions) {
    const ids = parseList(subject.target_regions);
    if (ids.length === 0) return '—';
    const names = ids.map((id) => regionName.get(id)).filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  }

  if ((subject.target_type === 'college' || subject.target_type === 'specific')
    && subject.target_colleges) {
    const ids = parseList(subject.target_colleges);
    if (ids.length === 0) return '—';
    const names = ids.map((id) => collegeName.get(id)).filter(Boolean);
    if (names.length === 0) return '—';
    return names.length > 2
      ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
      : names.join(', ');
  }

  return '—';
}

export function JobStanding({ active }) {
  return active
    ? <span className="text-spc-xs font-semibold text-spc-ok">Active</span>
    : <span className="text-spc-xs font-semibold text-spc-body">Inactive</span>;
}

/** A package, or the absence of one, said the same way everywhere. */
export function packageOf(value) {
  return value ? `₹${value} LPA` : 'Not stated';
}

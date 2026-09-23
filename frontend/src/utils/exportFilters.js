/**
 * The filters on screen, as an export payload.
 *
 * Both staff roles have two filter panels and up to four export buttons, and
 * which filters reached which export was decided separately in each place. The
 * result: setting "Shortlisted" and pressing the plain Export gave you every
 * applicant on the job, in a file that looked exactly like a filtered one.
 *
 * Written once so that cannot happen again. Every export in both roles builds
 * its filter payload from here, and a filter added to a panel is sent by all of
 * them the moment it is added to this function.
 *
 * Keys are the names the API takes. Anything the user has not set is left out
 * entirely rather than sent empty — the server reads a missing key as "no
 * filter", and an explicit empty one would mean the same thing less clearly.
 */
export function exportFilterPayload(advancedFilters = {}, enhancedFilters = {}) {
  const payload = {};
  const set = (key, value) => {
    if (value !== undefined && value !== null && value !== '') payload[key] = value;
  };

  // "Additional filters" / "Narrow the list"
  set('cgpa_min', advancedFilters.cgpaMin);
  set('cgpa_max', advancedFilters.cgpaMax);
  set('max_backlogs', advancedFilters.maxBacklogs);
  set('dob_from', advancedFilters.dobFrom);
  set('dob_to', advancedFilters.dobTo);
  set('college_id', advancedFilters.collegeId);

  // "Status & profile"
  if (enhancedFilters.applicationStatuses?.length > 0) {
    payload.application_statuses = enhancedFilters.applicationStatuses;
  }
  set('sslc_min', enhancedFilters.sslcMin);
  set('twelfth_min', enhancedFilters.twelfthMin);
  set('district', enhancedFilters.district);
  set('height_min', enhancedFilters.heightMin);
  set('weight_min', enhancedFilters.weightMin);

  // Three-state: true, false, or never asked. Only an explicit choice filters.
  for (const [key, value] of [
    ['has_passport', enhancedFilters.hasPassport],
    ['has_aadhar', enhancedFilters.hasAadhar],
    ['has_driving_license', enhancedFilters.hasDrivingLicense],
    ['has_pan', enhancedFilters.hasPan],
    ['physically_handicapped', enhancedFilters.physicallyHandicapped],
  ]) {
    if (value === true || value === false) payload[key] = value;
  }

  return payload;
}

/**
 * The same payload flattened for a GET.
 *
 * The two older exports are GETs with a query string rather than POSTs with a
 * body, so arrays and booleans have to survive as text. Axios would serialise
 * an array as repeated keys; the server's normaliser reads a comma-separated
 * list, so that is what it is given.
 */
export function exportFilterParams(advancedFilters, enhancedFilters) {
  const payload = exportFilterPayload(advancedFilters, enhancedFilters);
  const params = {};
  for (const [key, value] of Object.entries(payload)) {
    params[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return params;
}

/**
 * The filters in force, in words, for the export dialog to show.
 *
 * Only what a reader would recognise: the stage names first, because that is
 * what nearly every narrowed export is actually for, then the rest counted
 * rather than spelled out. Returns null when nothing is set, which is the
 * caller's signal to say "everyone" instead.
 */
export function describeExportFilters(advancedFilters = {}, enhancedFilters = {}) {
  const payload = exportFilterPayload(advancedFilters, enhancedFilters);
  const keys = Object.keys(payload);
  if (keys.length === 0) return null;

  const parts = [];

  if (payload.application_statuses) {
    parts.push(payload.application_statuses
      .map((v) => String(v).replace(/_/g, ' '))
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
      .join(' or '));
  }

  const others = keys.filter((k) => k !== 'application_statuses').length;
  if (others > 0) {
    parts.push(`${others} other filter${others === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}

/** Does the reader currently have anything narrowed? For labelling a toast. */
export function hasAnyExportFilter(advancedFilters, enhancedFilters) {
  return Object.keys(exportFilterPayload(advancedFilters, enhancedFilters)).length > 0;
}

export default exportFilterPayload;

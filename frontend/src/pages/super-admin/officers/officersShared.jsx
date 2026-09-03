/**
 * How a placement officer's standing is written, in one place.
 *
 * There were two functions doing this and they disagreed. The table used the
 * three-state one — active, suspended, removed — while the details dialog used a
 * two-state one reading `status`, which collapsed suspended and removed into one
 * word: "Inactive". So the row said *Suspended* and the record you opened to
 * check that said *Inactive*, and it could not tell you whether the officer had
 * been blocked or had left.
 *
 * They are still two functions, because they answer different questions and the
 * fallbacks are not interchangeable:
 *
 *   - `OfficerStanding` is for a serving officer, and reads `officer_status`.
 *   - `RecordStanding` is for a row of tenure history, which carries only
 *     `status`. Passing one of those through the officer version would call an
 *     'inactive' record active, because any non-empty string is truthy.
 */

/** A serving officer: active, suspended, or removed. */
export function OfficerStanding({ officer }) {
  const state = officer.officer_status || (officer.status ? 'active' : 'removed');
  if (state === 'suspended') {
    return <span className="text-spc-xs font-bold text-spc-warn">Suspended</span>;
  }
  if (state === 'removed') {
    return <span className="text-spc-xs font-semibold text-spc-bad">Removed</span>;
  }
  return <span className="text-spc-xs font-semibold text-spc-ok">Active</span>;
}

/** A history row: it only ever knew active from not-active. */
export function RecordStanding({ status }) {
  if (status === 'active' || status === 1 || status === true) {
    return <span className="text-spc-xs font-semibold text-spc-ok">Active</span>;
  }
  return <span className="text-spc-xs font-semibold text-spc-bad">Inactive</span>;
}

/** Dates on this page are days, not moments. */
export function formatDay(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

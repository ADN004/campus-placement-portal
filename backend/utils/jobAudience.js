/**
 * Which colleges a job actually reaches, and whether an edit narrows that.
 *
 * Freezing targeting outright once students have applied was too blunt. Adding
 * a college harms nobody: everyone already on the job stays on it, and the new
 * college's students gain a posting they could not see before — which is a
 * normal thing to want halfway through a drive, when a company agrees to widen
 * the intake. Removing one is the damaging direction, because the students who
 * have already applied are left attached to a job their college is no longer
 * part of.
 *
 * So the rule is not "targeting cannot change", it is "the audience may only
 * grow". Expressed as a set comparison rather than a diff of the three columns,
 * because the same audience can be described several ways — a job for every
 * college in a region and a job naming those colleges one by one reach exactly
 * the same students — and a field-by-field check would call a harmless
 * rewording a removal.
 */

import { query } from '../config/database.js';
import { normalizeBranch } from './branchName.js';

/** jsonb columns arrive parsed from the driver but stringified from the form. */
const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * The colleges a given targeting shape reaches, as a Map of id to name.
 *
 * The rule is copied from getJobs, which is what actually decides whether a
 * student sees the job. A resolver that disagreed with it would either accuse
 * an edit of dropping colleges it never reached, or wave through one that
 * really did.
 */
export const collegesReachedBy = async ({ target_type, target_regions, target_colleges }) => {
  const regions = JSON.stringify(asArray(target_regions));
  const colleges = JSON.stringify(asArray(target_colleges));

  const result = await query(
    `SELECT c.id, c.college_name
       FROM colleges c
      WHERE $1 = 'all'
         OR ($1 = 'region'  AND $2::jsonb @> to_jsonb(c.region_id))
         OR ($1 = 'college' AND $3::jsonb @> to_jsonb(c.id))
         OR ($1 = 'specific' AND (
               $2::jsonb @> to_jsonb(c.region_id)
            OR $3::jsonb @> to_jsonb(c.id)
         ))`,
    [target_type || 'all', regions, colleges]
  );

  return new Map(result.rows.map((row) => [row.id, row.college_name]));
};

/**
 * Names of the colleges an edit would cut off, empty when the audience only grows.
 *
 * Named rather than counted so the refusal can say which ones, since "this
 * removes 3 colleges" leaves the admin to work out where the mistake is.
 */
export const collegesLosingAccess = (before, after) =>
  [...before.entries()]
    .filter(([id]) => !after.has(id))
    .map(([, name]) => name);

/**
 * Branches an edit would shut out, empty when the list only opens up.
 *
 * The same reasoning as colleges: adding a branch lets more students apply and
 * leaves everyone who already has exactly where they were, while removing one
 * strands whoever applied from it. So the list may be added to and not cut.
 *
 * An empty list means no branch restriction at all, which is the widest the
 * job can be — so clearing it always passes, and going from empty to a named
 * list is the largest possible narrowing rather than a first-time setting.
 * Read the other way round this reads backwards, which is why it is stated
 * here rather than left to a subset check on two arrays.
 *
 * Compared through normalizeBranch because the same branch is written several
 * ways; without it, re-saving "Electronics & Communication" as "Electronics
 * and Communication" would look like dropping one branch and adding another.
 */
export const branchesLosingAccess = (before, after) => {
  const asList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const beforeList = asList(before);
  const afterList = asList(after);

  // Was open to every branch; still is only if it stays open.
  if (beforeList.length === 0) return afterList.length === 0 ? [] : ['every other branch'];
  // Becoming open to every branch cannot exclude anyone.
  if (afterList.length === 0) return [];

  const afterSet = new Set(afterList.map(normalizeBranch));
  return beforeList.filter((branch) => !afterSet.has(normalizeBranch(branch)));
};

/* --------------------------------------------------------- eligibility rules */

const asNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
/*
 * A DATE column arrives from the driver as a Date object, and String(date) is
 * "Mon Jan 01 2004 ..." — slicing ten characters off that yields "Mon Jan 01",
 * which compares as nonsense against an ISO day and made every age-window edit
 * look like a tightening.
 *
 * Its local parts are read rather than converted through UTC: the driver builds
 * these at local midnight, so toISOString would slide the day backwards for
 * anyone east of Greenwich, which is everyone here.
 */
const asDay = (v) => {
  if (!v) return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v).slice(0, 10);
};
const asNums = (v) => {
  if (Array.isArray(v)) return v.map(Number).filter((n) => !Number.isNaN(n));
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(Number).filter((n) => !Number.isNaN(n)) : [];
    } catch { return []; }
  }
  return [];
};

/**
 * Which eligibility rules an edit would make stricter, in plain words.
 *
 * Every one of these has a safe direction. Lowering a CGPA bar, allowing more
 * backlogs, widening an age window, opening a job to both genders — each lets
 * more students apply and moves nobody who already has. Only tightening strands
 * an applicant, leaving them sitting in a list that the criteria now say they
 * never qualified for.
 *
 * So the rule is "eligibility may be loosened, never tightened" rather than
 * "eligibility is frozen". The blunt version refused a company that agreed
 * mid-drive to consider one more branch or one more backlog, which is an
 * ordinary thing to happen and was impossible to record.
 *
 * A field that is submitted **unchanged** is never a complaint. That matters as
 * much as the direction: the old check objected to the mere presence of a
 * field, so correctness depended on the browser stripping values before
 * sending, and any form that posted its whole state — as the Super Admin's
 * does — was refused for fields nobody had touched. The message then blamed
 * eligibility for a save that had only altered a job title.
 *
 * Empty means "no restriction" throughout, which is the widest a rule can be:
 * clearing one is always allowed, and setting one where there was none is
 * always a tightening.
 */
export const eligibilityTightened = (before, after) => {
  const out = [];
  const sent = (k) => Object.prototype.hasOwnProperty.call(after, k) && after[k] !== undefined;

  if (sent('min_cgpa')) {
    const b = asNum(before.min_cgpa);
    const a = asNum(after.min_cgpa);
    if (a !== null && (b === null || a > b)) {
      out.push(`the minimum CGPA would rise from ${b === null ? 'none' : b} to ${a}`);
    }
  }

  if (sent('max_backlogs')) {
    const b = asNum(before.max_backlogs);
    const a = asNum(after.max_backlogs);
    if (a !== null && (b === null || a < b)) {
      out.push(`backlogs allowed would fall from ${b === null ? 'no limit' : b} to ${a}`);
    }
  }

  // Backlogs are permitted up to this semester, so a lower number is stricter.
  if (sent('backlog_max_semester')) {
    const b = asNum(before.backlog_max_semester);
    const a = asNum(after.backlog_max_semester);
    if (a !== null && (b === null || a < b)) {
      out.push(`backlogs would be confined to semester ${a} and earlier`);
    }
  }

  // The semesters a backlog may sit in. Empty is no restriction at all, so
  // naming any is a tightening; otherwise none of the named may be withdrawn.
  if (sent('allowed_backlog_semesters')) {
    const b = asNums(before.allowed_backlog_semesters);
    const a = asNums(after.allowed_backlog_semesters);
    if (b.length === 0 && a.length > 0) {
      out.push(`backlogs would be restricted to semester ${a.join(', ')}`);
    } else if (b.length > 0 && a.length > 0) {
      const lost = b.filter((s) => !a.includes(s));
      if (lost.length > 0) out.push(`semester ${lost.join(', ')} would no longer permit backlogs`);
    }
  }

  // "Born on or before" is a minimum age: an earlier date demands they be older.
  if (sent('dob_on_or_before')) {
    const b = asDay(before.dob_on_or_before);
    const a = asDay(after.dob_on_or_before);
    if (a !== null && (b === null || a < b)) {
      out.push(`the earliest-birth cutoff would move back to ${a}`);
    }
  }

  // "Born on or after" is a maximum age: a later date shuts out older students.
  if (sent('dob_on_or_after')) {
    const b = asDay(before.dob_on_or_after);
    const a = asDay(after.dob_on_or_after);
    if (a !== null && (b === null || a > b)) {
      out.push(`the latest-birth cutoff would move forward to ${a}`);
    }
  }

  // 'all' is the widest. Anything else, unless it is what it already was,
  // shuts somebody out — male to female excludes as surely as all to female.
  if (sent('gender_requirement')) {
    const b = before.gender_requirement || 'all';
    const a = after.gender_requirement || 'all';
    if (a !== 'all' && a !== b) {
      out.push(`the job would be limited to ${a} candidates`);
    }
  }

  return out;
};

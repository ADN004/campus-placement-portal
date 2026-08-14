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

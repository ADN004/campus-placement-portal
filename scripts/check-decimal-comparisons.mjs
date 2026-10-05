#!/usr/bin/env node
/**
 * Is every DECIMAL compared as a number?
 *
 * node-postgres returns DECIMAL and NUMERIC as strings. It is right to: a
 * Postgres NUMERIC can hold values no JavaScript number represents exactly, so
 * the driver will not guess. INTEGER comes back as a number.
 *
 * The schema mixes the two freely, and the difference is invisible at the call
 * site -- `student.programme_cgpa` and `student.backlogs_sem1` look alike and
 * behave differently. Comparing two strings with < or > compares them by code
 * unit, so "10.00" < "9.00" is TRUE: it stops at "1" against "9" and never
 * reaches the rest.
 *
 * That shipped. `studentCgpa < requirements.min_cgpa` ran in three places, and
 * it was wrong in both directions at once: every student holding a perfect
 * 10.00 was refused by every job asking for 2.00 to 9.99, and a student on
 * 9.50 was admitted to a job demanding 10.00. The refusal screen printed
 * "YOURS 10.00, REQUIRED 9.00" underneath, because the display read the same
 * two values and never compared them.
 *
 * It only breaks when BOTH sides are strings. A string against a number
 * coerces to numeric and is accidentally right, which is why the backlog checks
 * sitting beside it -- INTEGER, so numbers -- never showed the fault.
 *
 * This looks for a DECIMAL-backed field on either side of an ordering operator
 * in JavaScript, with nothing numeric wrapped around it. It cannot prove a
 * comparison is right, only that the raw values are not being ordered directly.
 *
 * Usage
 *   node scripts/check-decimal-comparisons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/*
 * The DECIMAL and NUMERIC columns, from database/schema.sql. INTEGER columns
 * are deliberately absent: backlogs_sem1..6, max_backlogs, height_cm,
 * min_height and max_height arrive as numbers and order correctly on their own.
 */
const DECIMAL_FIELDS = [
  'programme_cgpa',
  'cgpa_sem1', 'cgpa_sem2', 'cgpa_sem3', 'cgpa_sem4', 'cgpa_sem5', 'cgpa_sem6',
  'min_cgpa',
  'weight_kg', 'min_weight', 'max_weight',
];

/* Wrapped in any of these, the value is already a number. */
const COERCED = /\b(asNumber|belowMinimum|parseFloat|parseInt|Number)\s*\(/;

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'uploads', 'logs', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.m?js$/.test(entry.name)) files.push(full);
  }
}(path.join(ROOT, 'backend')));

const fieldAlternation = DECIMAL_FIELDS.join('|');
// A decimal field on the left of an ordering operator, or on the right of one.
const LEFT = new RegExp(`\\b(?:${fieldAlternation})\\b\\s*(?:<|>)=?[^=]`);
const RIGHT = new RegExp(`(?:<|>)=?\\s*[A-Za-z_$][\\w.$]*\\b(?:${fieldAlternation})\\b`);
// Any mention at all, for the count of sites verified. Compiled once: building
// it inside the per-line loop also cost a RegExp per line of the backend.
const MENTIONS = new RegExp(`\\b(?:${fieldAlternation})\\b`);

const problems = [];
let checked = 0;

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;

    /*
     * SQL is not JavaScript. Postgres orders a DECIMAL column numerically
     * whatever the driver later does with the result, so `s.programme_cgpa >=
     * $3` inside a query string is correct and must not be reported. These
     * lines are recognised by the bound parameter or the SQL keyword beside
     * them, which no JavaScript comparison carries.
     */
    if (/\$\d|\$\{|\bAND\b|\bWHERE\b|\bSELECT\b|\bHAVING\b|\bCAST\b/.test(line)) return;

    const mentionsDecimal = MENTIONS.test(line);
    const ordered = LEFT.test(line) || RIGHT.test(line);

    /*
     * Count every place a DECIMAL is handled, not only the raw ones, so a
     * clean run reports how much was verified rather than how little was
     * wrong. Reporting "0 checked" on a green run reads as though the check
     * found nothing to look at -- which is how a checker that matches nothing
     * passes forever without anybody noticing.
     */
    if (mentionsDecimal && (ordered || COERCED.test(line))) checked += 1;

    if (!ordered) return;
    if (COERCED.test(line)) return;

    problems.push({
      where: `${path.relative(ROOT, file).split(path.sep).join('/')}:${i + 1}`,
      line: trimmed.slice(0, 90),
    });
  });
}

if (problems.length) {
  console.log(`${RED}FAIL${OFF} ${problems.length} DECIMAL value(s) ordered as strings`);
  console.log(`${DIM}       node-postgres returns DECIMAL as a string, and "10.00" < "9.00" is true${OFF}`);
  console.log(`${DIM}       use belowMinimum() or asNumber() from utils/jobEligibility.js${OFF}`);
  problems.forEach((p) => {
    console.log(`       ${p.where}`);
    console.log(`${DIM}         ${p.line}${OFF}`);
  });
  process.exit(1);
}

console.log(
  `${GREEN} ok ${OFF} every DECIMAL comparison goes through a numeric conversion  ${DIM}(${checked} checked)${OFF}`
);

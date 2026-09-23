#!/usr/bin/env node
/**
 * Is every branch comparison going through the normaliser?
 *
 * The same branch is written differently depending on who typed it. Seventeen
 * colleges offer "Electrical & Electronics Engineering"; the job form calls it
 * "Electrical and Electronics Engineering". One college has "Bio-Medical
 * Engineering" where the list says "Biomedical Engineering". Students carry
 * whichever spelling their own college used, because that is the list they
 * registered from.
 *
 * So a literal comparison refuses students whose branch is plainly in the list
 * printed underneath the refusal -- and the failure is silent in the other
 * direction too: a job's eligible list quietly omits them, an officer never
 * sees them, and nobody involved has any reason to suspect the two strings are
 * different. normalizeBranch and NORMALIZED_BRANCH_SQL exist for this, and are
 * only worth anything if nothing bypasses them.
 *
 * This checks the places that compare a student's branch against a job's
 * allowed list. It cannot prove a comparison is right, only that the raw
 * strings are not being compared where they obviously should not be.
 *
 * Usage
 *   node scripts/check-branch-matching.mjs
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

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'uploads', 'logs'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.m?js$/.test(entry.name)) files.push(full);
  }
}(path.join(ROOT, 'backend')));

const problems = [];
let checked = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;

    /*
     * A JavaScript comparison of the allowed list against a branch value.
     * `.includes(student.branch)` is the exact shape that was wrong in
     * extendedProfileController: a literal membership test on the raw strings.
     */
    const jsRaw = /allowed_?[Bb]ranches\s*\.\s*(includes|indexOf)\s*\(/.test(line)
      || /\.includes\(\s*student\.branch\s*\)/.test(line);

    // A SQL comparison of the branch column that is not wrapped.
    const sqlRaw = /\bs\.branch\s*(=|<>|!=|\bIN\b|=\s*ANY)/.test(line)
      && !/NORMALIZED_BRANCH_SQL|regexp_replace/.test(line);

    // Every comparison site, normalised or not, so a clean run reports how
    // many places were verified rather than how many were wrong.
    const normalised = /NORMALIZED_BRANCH_SQL\(|normalizeBranch\(/.test(line);
    if (jsRaw || sqlRaw || normalised) checked += 1;

    /*
     * No context escape.
     *
     * This used to clear a raw comparison when the line above mentioned the
     * normaliser -- and the very bug it was written for sits directly under
     * `const studentBranchNorm = normalizeBranch(student.branch)`, so the
     * checker read the correct-looking line above and passed the wrong one
     * below. Normalising one side while comparing the other raw IS the
     * mistake, so proximity to the normaliser is evidence of nothing.
     *
     * The SQL test already excludes a wrapped column on its own line, and the
     * correct JavaScript form does not match the raw patterns at all.
     */
    if (!jsRaw && !sqlRaw) return;

    problems.push({
      where: `${path.relative(ROOT, file)}:${i + 1}`,
      kind: jsRaw ? 'JavaScript' : 'SQL',
      line: trimmed.slice(0, 90),
    });
  });
}

if (problems.length) {
  console.log(`${RED}FAIL${OFF} ${problems.length} branch comparison(s) use the raw strings`);
  console.log(`${DIM}       "Electrical & Electronics" and "Electrical and Electronics" are one${OFF}`);
  console.log(`${DIM}       branch and 17 colleges spell it the first way${OFF}`);
  problems.forEach((p) => {
    console.log(`       ${p.where}  (${p.kind})`);
    console.log(`${DIM}         ${p.line}${OFF}`);
  });
  process.exit(1);
}

console.log(
  `${GREEN} ok ${OFF} every branch comparison goes through the normaliser  ${DIM}(${checked} checked)${OFF}`
);

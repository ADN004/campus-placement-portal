#!/usr/bin/env node
/**
 * Does every export send the filters the reader set?
 *
 * The applicants pages call the export endpoints from several handlers each,
 * and the filters have to be attached at every one of them. Miss a single call
 * site and that button silently exports the whole job while the buttons beside
 * it export the filtered set -- which is what happened: the officer's Basic
 * Excel and Basic PDF came from a handler nobody had touched, so they returned
 * every applicant while Enhanced returned the right ones, from the same dialog.
 *
 * Nothing catches that. It builds, it runs, and the file looks plausible; the
 * only way to notice is to count rows in a spreadsheet against a screen. So the
 * call sites are checked here instead.
 *
 * The rule: any call to an applicant-export endpoint must be inside a function
 * that also mentions one of the shared filter builders. The not-applied export
 * is exempt -- it lists students who never applied, so an application-status
 * filter has nothing to select from.
 *
 * Usage
 *   node scripts/check-export-filters.mjs
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

const PAGES = [
  'frontend/src/pages/placement-officer/JobApplicants.jsx',
  'frontend/src/pages/super-admin/JobApplicants.jsx',
];

/** Endpoints that return a filtered list of applicants. */
const GUARDED = /\b(enhancedExportJobApplicants|exportJobApplicants)\s*\(/;

/** Lists that no application filter applies to. */
const EXEMPT = /\bexportEligibleNotApplied\s*\(/;

/** The shared builders. A handler must use one of them. */
const BUILDER = /exportFilterPayload|exportFilterParams/;

/**
 * The handler a line sits in.
 *
 * Handlers on these pages are all `const name = async (...) => {` or
 * `const name = (...) => {` at two spaces of indent, so the enclosing one is
 * the nearest such declaration above the line, and it ends at the next one.
 */
const DECL = /^ {2}const (\w+) = (async )?\(/;

const problems = [];
let checked = 0;

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    problems.push(`${rel} — not found`);
    continue;
  }

  const lines = fs.readFileSync(file, 'utf8').split('\n');

  // Where each handler starts, so a call can be attributed to one.
  const starts = [];
  lines.forEach((line, i) => {
    const m = DECL.exec(line);
    if (m) starts.push({ line: i, name: m[1] });
  });

  lines.forEach((line, i) => {
    if (!GUARDED.test(line) || EXEMPT.test(line)) return;

    // Which handler is this in?
    let owner = null;
    for (const s of starts) {
      if (s.line <= i) owner = s;
      else break;
    }
    if (!owner) return;

    const end = starts.find((s) => s.line > owner.line)?.line ?? lines.length;
    const body = lines.slice(owner.line, end).join('\n');

    checked += 1;
    if (!BUILDER.test(body)) {
      problems.push(
        `${rel}:${i + 1} — ${owner.name}() exports without sending the page's filters`
      );
    }
  });
}

/*
 * The tick boxes have to offer every stage there is.
 *
 * They are a second, hand-written list of the statuses, and a fifth status
 * added to the vocabulary would simply not appear on the export -- silently,
 * with no error and no empty space to notice. Anyone at that stage would be
 * unreachable by any export in either role.
 */
const stagesModule = await import(
  new URL('../frontend/src/utils/exportFilters.js', import.meta.url).href
);
const vocabModule = await import(
  new URL('../frontend/src/utils/applicationStatus.js', import.meta.url).href
);

const offered = stagesModule.EXPORT_STAGES.map(([stage]) => stage).sort();
const real = [...vocabModule.APPLICATION_STATUSES].sort();

if (offered.join() !== real.join()) {
  const missing = real.filter((v) => !offered.includes(v));
  const extra = offered.filter((v) => !real.includes(v));
  problems.push(
    'frontend/src/utils/exportFilters.js — EXPORT_STAGES does not match the status vocabulary'
    + (missing.length ? `; never exportable: ${missing.join(', ')}` : '')
    + (extra.length ? `; offered but not a real status: ${extra.join(', ')}` : '')
  );
}

// Every stage needs a label and a description: the boxes are the only place
// the difference between them is explained to whoever is ticking one.
for (const entry of stagesModule.EXPORT_STAGES) {
  const [stage, label, description] = entry;
  if (!label || !description) {
    problems.push(`frontend/src/utils/exportFilters.js — stage "${stage}" has no ${label ? 'description' : 'label'}`);
  }
}

if (checked === 0) {
  console.log(`${RED}FAIL${OFF} no export call sites found — has the code moved?`);
  process.exit(1);
}

if (problems.length) {
  console.log(`${RED}FAIL${OFF} ${problems.length} problem(s) with what the exports contain`);
  console.log(`${DIM}       a wrong file here looks exactly like a right one, and goes to a company${OFF}`);
  problems.forEach((p) => console.log(`       ${p}`));
  process.exit(1);
}

console.log(
  `${GREEN} ok ${OFF} every export sends the filters on screen  ${DIM}(${checked} call sites)${OFF}`
);
console.log(
  `${GREEN} ok ${OFF} every application stage can be exported  ${DIM}(${offered.length} stages, all described)${OFF}`
);

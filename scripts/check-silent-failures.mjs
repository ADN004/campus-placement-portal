#!/usr/bin/env node
/**
 * Does anything tell the user when a request fails?
 *
 * A catch block that only writes to console.error is invisible. The button does
 * nothing, no message appears, and the honest reading is that the click was not
 * registered -- so the person clicks again, which is how a failed bulk action
 * becomes two failed bulk actions. The server said why; nobody passed it on.
 *
 * Reported, not enforced: some catches are legitimately silent. A background
 * refresh that fails should not interrupt someone mid-task, and a best-effort
 * read behind a panel that simply does not appear is fine. So this prints what
 * it finds and leaves the judgement to a person, rather than failing a build on
 * a rule it cannot actually decide.
 *
 * Usage
 *   node scripts/check-silent-failures.mjs [path ...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const DIM = '\x1b[2m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const OFF = '\x1b[0m';

const roots = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['frontend/src/pages', 'frontend/src/components'];

const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
};
roots.forEach((r) => walk(path.join(ROOT, r)));

/** The body of a block, given the index of its opening brace. */
const blockBody = (src, open) => {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i += 1;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i += 1;
        i += 1;
      }
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
};

// Anything that reaches the person: a toast, an error rendered into state, a
// thrown error for a caller to handle, or a deliberate re-read of the page.
const REACHES_USER = /toast|setError|setLoadError|setFetchError|setMessage|alert\(|throw |navigate\(|window\.location|loadFailures\.note|\bnote\(|set\w*(?:Failed|Error)\(/;

// Names that say the call was never meant to interrupt anybody.
const BACKGROUND = /silent|background|refresh|poll|prefetch|optimistic/i;

const findings = [];
let checked = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /catch\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = blockBody(src, m.index + m[0].length - 1);
    if (body === null) continue;
    checked += 1;

    if (REACHES_USER.test(body)) continue;
    // An empty catch is its own thing, and usually deliberate (a parse that may
    // fail, a cleanup that may already have run).
    if (body.trim() === '' || /^\s*\/[/*]/.test(body.trim()) && !/console/.test(body)) continue;

    const line = src.slice(0, m.index).split('\n').length;
    // The enclosing function's name, for the report to be readable.
    const before = src.slice(0, m.index);
    const fn = [...before.matchAll(/(?:const|function)\s+(\w+)\s*[=(]/g)].pop();
    const name = fn ? fn[1] : '(top level)';
    const likelyBackground = BACKGROUND.test(name);

    findings.push({
      where: `${path.relative(ROOT, file)}:${line}`,
      name,
      likelyBackground,
    });
  }
}

const loud = findings.filter((f) => !f.likelyBackground);
const quiet = findings.filter((f) => f.likelyBackground);

if (findings.length === 0) {
  console.log(`${GREEN} ok ${OFF} every catch tells the user something  ${DIM}(${checked} checked)${OFF}`);
  process.exit(0);
}

console.log(
  `${YELLOW}note${OFF} ${loud.length} catch block(s) fail without telling anyone  ${DIM}(${checked} checked)${OFF}`
);
console.log(`${DIM}       the click appears to do nothing, so it gets clicked again${OFF}`);
loud.forEach((f) => console.log(`       ${f.where}  ${f.name}()`));

if (quiet.length) {
  console.log('');
  console.log(`${DIM}       ${quiet.length} more look deliberate (background work, named as such):${OFF}`);
  quiet.forEach((f) => console.log(`${DIM}       ${f.where}  ${f.name}()${OFF}`));
}

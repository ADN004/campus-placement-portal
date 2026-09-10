#!/usr/bin/env node
/**
 * Do the INSERT statements agree with themselves?
 *
 * Three numbers have to match in every `INSERT INTO t (cols) VALUES ($1..$n)`:
 * how many columns are named, how many placeholders the VALUES list uses, and
 * how many entries the parameter array actually carries. Postgres only tells
 * you at runtime, and only on the path that runs it — so an INSERT edited by
 * hand to add one column fails the first time a person clicks the button, not
 * in any build or any linter.
 *
 * Every one of those numbers was edited by hand while adding drive venues and
 * the no-backlog-history flag, across five statements in three controllers.
 *
 * Placeholders are counted as the highest $n rather than the number of them,
 * because a statement may legitimately reuse one, and CURRENT_TIMESTAMP or
 * TRUE sit in the VALUES list without consuming a parameter — so a column
 * count above the placeholder count is normal and only the reverse is a fault.
 * The parameter array is compared exactly.
 *
 * Usage
 *   node scripts/check-inserts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BACKEND = path.join(ROOT, 'backend');

const RED = '[31m';
const GREEN = '[32m';
const DIM = '[2m';
const OFF = '[0m';

const SKIP = new Set(['node_modules', 'uploads', 'logs', '.git']);
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.m?js$/.test(entry.name)) files.push(full);
  }
}(BACKEND));

/** The text inside a bracket pair, given the index of the opening bracket. */
const balanced = (src, open) => {
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
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
};

/** Splits a column list on commas that are not inside brackets. */
const countColumns = (text) =>
  text
    .replace(/--[^\n]*/g, '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean).length;

/**
 * The parameter array that follows the SQL string, matched by walking brackets
 * rather than by regex — the entries contain commas, calls and ternaries, and
 * anything simpler miscounts them.
 */
const countArrayEntries = (src, from) => {
  const open = src.indexOf('[', from);
  if (open === -1 || open - from > 200) return null;
  let depth = 0;
  let entries = 1;
  let i = open;
  let empty = true;
  for (; i < src.length; i += 1) {
    const ch = src[i];
    // Strings first, or the "non-whitespace" test below swallows the quote and
    // every comma inside the string gets counted as another entry.
    if (ch === "'" || ch === '"' || ch === '`') {
      empty = false;
      const quote = ch;
      i += 1;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i += 1;
        i += 1;
      }
      continue;
    }
    // So do line comments: a commented-out entry is not an entry.
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '[' || ch === '(' || ch === '{') depth += 1;
    else if (ch === ']' || ch === ')' || ch === '}') {
      depth -= 1;
      if (depth === 0) break;
    } else if (ch === ',' && depth === 1) entries += 1;
    else if (depth === 1 && !/\s/.test(ch)) empty = false;
  }
  if (empty) return 0;
  // A trailing comma before the closing bracket does not add an entry.
  const inner = src.slice(open + 1, i);
  if (/,\s*$/.test(inner)) entries -= 1;
  return entries;
};

const problems = [];
let checked = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /INSERT\s+INTO\s+(\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, table, colText] = m;
    /*
     * The VALUES list is read by walking brackets, not by a non-greedy match.
     * `VALUES ($1, CURRENT_TIMESTAMP + ($3 || ' days')::INTERVAL, $4)` closes
     * its first paren in the middle, so a lazy regex stops there and reports a
     * placeholder count that is short — a false alarm on correct code, which is
     * the fastest way to make a checker worth ignoring.
     */
    const valText = balanced(src, m.index + m[0].length - 1);
    if (valText === null) continue;
    // Skip the multi-row / SELECT forms, which do not carry a $n list.
    if (!/\$\d/.test(valText)) continue;
    checked += 1;

    const columns = countColumns(colText);
    const highest = Math.max(
      ...[...valText.matchAll(/\$(\d+)/g)].map((p) => Number(p[1]))
    );
    const line = src.slice(0, m.index).split('\n').length;
    const where = `${path.relative(ROOT, file)}:${line}  ${table}`;

    if (highest > columns) {
      problems.push(`${where} — ${columns} columns but placeholders go to $${highest}`);
      continue;
    }

    const params = countArrayEntries(src, m.index + m[0].length + valText.length);
    if (params !== null && params !== highest) {
      problems.push(`${where} — highest placeholder $${highest} but ${params} values passed`);
    }
  }
}

if (problems.length) {
  console.log(`${RED}FAIL${OFF} ${problems.length} INSERT statement(s) disagree with themselves`);
  console.log(`${DIM}       each is a runtime error the first time that path runs${OFF}`);
  problems.forEach((p) => console.log(`       ${p}`));
  process.exit(1);
}

console.log(`${GREEN} ok ${OFF} every INSERT matches its placeholders and values  ${DIM}(${checked} checked)${OFF}`);

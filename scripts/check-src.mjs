#!/usr/bin/env node
/**
 * The file-level checks, across every file in `src` — not just the pages.
 *
 * `check-page.mjs` takes a page and scans that page plus its own module folder.
 * That leaves everything in `components/` unchecked, and three separate faults
 * have now come from exactly there:
 *
 *   1. Shared dialogs still on the legacy look, reported as "clean" because the
 *      sweep looked at where files live rather than what a page can reach.
 *   2. Props renamed at a call site so the shared component never received them
 *      — `onSubmit` to a dialog reading `onSave`.
 *   3. `ReferenceError: officer is not defined`, shipped to staging, from a
 *      half-finished rename inside `ChangePassword.jsx`. The build says nothing
 *      about an identifier that is merely never declared, and the per-page
 *      checker never opened the file.
 *
 * The third is the one this exists for. An undeclared identifier is a
 * ReferenceError the moment that line runs, and it is invisible to a green
 * build. Running the check over the whole tree costs a few seconds and removes
 * a whole class of "it compiled, so it works".
 *
 * Usage
 *   node scripts/check-src.mjs
 *
 * Exit code is 1 if anything failed, so it can gate a commit.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'frontend', 'src');
const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const parser = require('@babel/parser');
const traverseMod = require('@babel/traverse');
const traverse = traverseMod.default || traverseMod;

const RED = '[31m';
const GREEN = '[32m';
const DIM = '[2m';
const OFF = '[0m';

const parse = (src) => parser.parse(src, {
  sourceType: 'module',
  plugins: ['jsx'],
  errorRecovery: true,
});

/*
 * Names a file may use without declaring them. Kept in step with the same list
 * in check-page.mjs — a name missing here is reported as a fault on a file that
 * is perfectly correct, and a checker that cries wolf is one nobody reads.
 */
const GLOBALS = new Set([
  'window', 'document', 'console', 'localStorage', 'sessionStorage', 'navigator',
  'fetch', 'Blob', 'URL', 'Date', 'Math', 'JSON', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Promise', 'Set', 'Map', 'Error', 'parseInt', 'parseFloat',
  'isNaN', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'React',
  'undefined', 'NaN', 'Infinity', 'FormData', 'File', 'Intl', 'RegExp', 'alert',
  'confirm', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'crypto',
  'AbortController', 'IntersectionObserver', 'ResizeObserver', 'structuredClone',
  'process', 'globalThis', 'Symbol', 'WeakMap', 'WeakSet', 'BigInt', 'queueMicrotask',
  'URLSearchParams', 'FileReader', 'Image', 'Audio', 'Notification', 'CustomEvent',
  'Event', 'DOMParser', 'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'history',
  'location', 'screen', 'performance', 'Element', 'HTMLElement', 'Node', 'Function',
  'encodeURIComponent', 'decodeURIComponent', 'AudioContext', 'MutationObserver',
  // Added after the first run flagged `constants/branches.js`, which is correct.
  'Proxy', 'Reflect',
]);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
}(SRC));

const undeclared = [];
const unparsed = [];

for (const file of files) {
  let ast;
  try {
    ast = parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    unparsed.push(`${path.relative(ROOT, file)} — ${error.message.split('\n')[0]}`);
    continue;
  }
  traverse(ast, {
    ReferencedIdentifier(node) {
      const name = node.node.name;
      if (GLOBALS.has(name)) return;
      if (node.scope.hasBinding(name, true)) return;
      undeclared.push(`${path.relative(ROOT, file)}:${node.node.loc?.start.line ?? 0}  ${name}`);
    },
  });
}

let failed = false;

if (unparsed.length) {
  failed = true;
  console.log(`${RED}FAIL${OFF} ${unparsed.length} file(s) would not parse`);
  unparsed.slice(0, 10).forEach((u) => console.log(`       ${u}`));
} else {
  console.log(`${GREEN} ok ${OFF} every file parses  ${DIM}(${files.length} scanned)${OFF}`);
}

if (undeclared.length) {
  failed = true;
  console.log(`${RED}FAIL${OFF} ${undeclared.length} identifier(s) used but never declared or imported`);
  console.log(`${DIM}       each one is a ReferenceError the moment that line runs${OFF}`);
  // Deduplicated by file+name: one rename can leave the same name in many spots.
  const seen = new Set();
  for (const u of undeclared) {
    const key = u.replace(/:\d+/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`       ${u}`);
    if (seen.size >= 25) break;
  }
} else {
  console.log(`${GREEN} ok ${OFF} nothing used without being declared or imported`);
}

process.exit(failed ? 1 : 0);

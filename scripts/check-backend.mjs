#!/usr/bin/env node
/**
 * The same undeclared-identifier check as check-src.mjs, over the server.
 *
 * `check-src.mjs` covers `frontend/src`. The backend had nothing, and the gap
 * is not theoretical: refactoring the Excel exports, a global search-and-replace
 * introduced `chosenCustom` into two handlers that never declared it. Both
 * files passed `node --check`, because an identifier that is merely never bound
 * is valid syntax — it is a ReferenceError at the moment that line runs, which
 * for an export handler means the first officer to click the button.
 *
 * There is no build step here to catch it either. The server starts fine and
 * the fault waits inside whichever branch was not exercised.
 *
 * Usage
 *   node scripts/check-backend.mjs
 *
 * Exit code is 1 if anything failed, so it can gate a commit.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BACKEND = path.join(ROOT, 'backend');
const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const parser = require('@babel/parser');
const traverseMod = require('@babel/traverse');
const traverse = traverseMod.default || traverseMod;

const RED = '[31m';
const GREEN = '[32m';
const DIM = '[2m';
const OFF = '[0m';

/** Directories that are not ours to check. */
const SKIP = new Set(['node_modules', 'uploads', 'logs', 'assets', '.git']);

const parse = (src) => parser.parse(src, {
  sourceType: 'module',
  errorRecovery: true,
});

/*
 * Names a file may use without declaring them.
 *
 * Node's globals rather than the browser's — no `window`, no `document`, but
 * `process`, `Buffer` and the timer functions, which server code uses
 * constantly. A name missing here is reported as a fault on a file that is
 * perfectly correct, and a checker that cries wolf is one nobody reads.
 */
const GLOBALS = new Set([
  'process', 'Buffer', 'console', 'globalThis', 'module', 'require', 'exports',
  '__dirname', '__filename', 'setTimeout', 'clearTimeout', 'setInterval',
  'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask',
  'Date', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Error', 'TypeError',
  'RangeError', 'SyntaxError', 'Symbol', 'Proxy', 'Reflect', 'BigInt',
  'RegExp', 'Function', 'Intl', 'URL', 'URLSearchParams', 'TextEncoder',
  'TextDecoder', 'AbortController', 'AbortSignal', 'Event', 'EventTarget',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity',
  'encodeURIComponent', 'decodeURIComponent', 'atob', 'btoa', 'structuredClone',
  'fetch', 'Blob', 'File', 'FormData', 'Headers', 'Request', 'Response',
  'ReadableStream', 'WritableStream', 'TransformStream', 'crypto', 'performance',
]);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.m?js$/.test(entry.name)) files.push(full);
  }
}(BACKEND));

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

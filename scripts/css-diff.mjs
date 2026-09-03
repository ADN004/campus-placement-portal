#!/usr/bin/env node
/**
 * What did this change do to the stylesheet?
 *
 * A page rewrite replaces markup, and Tailwind's output is generated from the
 * markup that exists — so a utility can disappear because the page that used it
 * was rewritten (fine), or because a *different* page's class was quietly
 * broken (not fine). The two look identical in the build output.
 *
 * So this compares two built stylesheets and answers three questions:
 *
 *   - did any existing selector CHANGE? Should always be zero. A rule whose
 *     declarations moved means another role's appearance moved with it.
 *   - what was REMOVED, and is any of it still referenced in `src`? A removed
 *     utility that something still asks for is a page rendering unstyled.
 *   - what was added? Informational.
 *
 * Selectors inside `@media` and `@supports` are compared individually. Comparing
 * whole rules treats Tailwind's entire `lg:` block as one unit, which is far too
 * coarse to prove anything — an earlier check did exactly that and could not
 * have caught a change inside it.
 *
 * Usage
 *   node scripts/css-diff.mjs <before.css> <after.css>
 *
 * Exit code is 1 if anything changed, or if a removed utility is still used.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'frontend', 'src');

const RED = '[31m';
const GREEN = '[32m';
const DIM = '[2m';
const OFF = '[0m';

/** Every selector in the sheet, keyed by its at-rule context plus its own text. */
function flatten(css) {
  const out = new Map();
  const walk = (text, prefix) => {
    let i = 0;
    let depth = 0;
    let start = 0;
    let head = '';
    while (i < text.length) {
      const ch = text[i];
      if (ch === '{') {
        if (depth === 0) head = text.slice(start, i).trim();
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const body = text.slice(text.indexOf('{', start) + 1, i);
          if (head.startsWith('@media') || head.startsWith('@supports')) {
            walk(body, `${prefix + head} `);
          } else {
            out.set(prefix + head, body.trim());
          }
          start = i + 1;
        }
      }
      i += 1;
    }
  };
  walk(css, '');
  return out;
}

/** The class a selector is for, with its variants and escapes stripped off. */
function classOf(selector) {
  const bare = selector.replace(/^.*\s/, '').replace(/^\./, '');
  return bare
    .replace(/\\/g, '')
    .replace(/:(hover|focus|active|disabled|last-child|first-child|checked)$/, '')
    .replace(/:has\([^)]*\)$/, '')
    .replace(/::(before|after|placeholder)$/, '');
}

const sourceFiles = [];
(function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full);
    else if (/\.(jsx?|css)$/.test(entry.name)) sourceFiles.push(full);
  }
}(SRC));

/**
 * Is this class still asked for anywhere?
 *
 * As a whole token, not a substring: `gap-0.5` contains `p-0.5`, and a
 * substring check once reported a removed utility as used by eight files.
 */
const BOUNDARY = /[\s"'`{}]/;

/**
 * The start of the line a match sits on — enough to tell an `@apply` from a
 * class attribute.
 */
function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  return text.slice(start, index);
}

function stillUsed(cls) {
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    let from = 0;
    for (;;) {
      const at = text.indexOf(cls, from);
      if (at === -1) break;
      const before = at === 0 ? ' ' : text[at - 1];
      const after = text[at + cls.length] ?? ' ';
      /*
       * An `@apply` is not a reference to the generated utility.
       *
       * `@apply text-purple-800` copies that utility's *declarations* into the
       * rule at build time; it does not link to the class Tailwind emits, and
       * it keeps working after the standalone `.text-purple-800` has been
       * purged. Counting it raised a failure twice on this pass — once for
       * `hover:from-red-700` in `.btn-danger`, once for `text-purple-800` in
       * `.badge-primary` — and both times the component class was byte-identical
       * in the two builds. A check that cries wolf is a check you stop reading.
       */
      if (BOUNDARY.test(before) && BOUNDARY.test(after) && !/@apply\b/.test(lineAt(text, at))) {
        return path.relative(ROOT, file);
      }
      from = at + 1;
    }
  }
  return null;
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node scripts/css-diff.mjs <before.css> <after.css>');
  process.exit(2);
}

const before = flatten(fs.readFileSync(beforePath, 'utf8'));
const after = flatten(fs.readFileSync(afterPath, 'utf8'));

const changed = [];
const removed = [];
for (const [selector, body] of before) {
  if (!after.has(selector)) removed.push(selector);
  else if (after.get(selector) !== body) changed.push(selector);
}
const added = [...after.keys()].filter((s) => !before.has(s));

let failed = false;

if (changed.length === 0) {
  console.log(`${GREEN} ok ${OFF} no existing selector changed  ${DIM}(${before.size} compared)${OFF}`);
} else {
  failed = true;
  console.log(`${RED}FAIL${OFF} ${changed.length} selector(s) changed — another page's appearance moved`);
  changed.slice(0, 15).forEach((s) => {
    console.log(`       ${s.slice(0, 90)}`);
    console.log(`${DIM}         was: ${before.get(s).slice(0, 76)}${OFF}`);
    console.log(`${DIM}         now: ${after.get(s).slice(0, 76)}${OFF}`);
  });
}

if (removed.length === 0) {
  console.log(`${GREEN} ok ${OFF} nothing removed`);
} else {
  const orphans = [];
  for (const selector of removed) {
    const cls = classOf(selector);
    const user = stillUsed(cls);
    if (user) orphans.push(`${cls} — still asked for by ${user}`);
  }
  if (orphans.length === 0) {
    console.log(`${GREEN} ok ${OFF} ${removed.length} removed, none still referenced  ${DIM}(checked as whole tokens)${OFF}`);
  } else {
    failed = true;
    console.log(`${RED}FAIL${OFF} ${orphans.length} removed utility/utilities are still referenced`);
    orphans.forEach((o) => console.log(`       ${o}`));
  }
}

console.log(`${DIM} ..  ${added.length} added${OFF}`);
console.log(failed ? `\n${RED}stylesheet check failed${OFF}\n` : `\n${GREEN}stylesheet check passed${OFF}\n`);
process.exit(failed ? 1 : 0);

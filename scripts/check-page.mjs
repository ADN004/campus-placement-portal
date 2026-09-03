#!/usr/bin/env node
/**
 * The checks a page rewrite has to pass, done mechanically.
 *
 * The redesign moves a page from one long file into a container plus per-device
 * layouts. Three failures survive that move without the build noticing, and all
 * three have already happened at least once:
 *
 *   1. A handler disappears. The rewrite anchors on the wrong line, half the
 *      file goes, and the build still passes because the layouts simply receive
 *      undefined instead of a function. Nothing breaks until someone clicks.
 *   2. A layout reads a prop the container never passes. Same silence.
 *   3. A class name is assembled at runtime — `bg-${tone}` — so Tailwind, which
 *      scans the source as text, never generates it. The page renders unstyled
 *      in exactly one state.
 *
 * A green build proves none of these. This does.
 *
 * Usage
 *   node scripts/check-page.mjs <container.jsx>            check a page
 *   node scripts/check-page.mjs <container.jsx> --save     record its handlers
 *   node scripts/check-page.mjs --consumers <file>         who imports this?
 *
 * Record the handlers BEFORE a rewrite, check AFTER. The snapshot lives in
 * .page-checks/ beside the repo and is not committed — it is scaffolding for
 * one piece of work, not a fixture.
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
const SNAPSHOTS = path.join(ROOT, '.page-checks');

const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const parser = require('@babel/parser');
const traverseModule = require('@babel/traverse');
const traverse = traverseModule.default || traverseModule;

const RED = '[31m';
const GREEN = '[32m';
const DIM = '[2m';
const OFF = '[0m';

let failures = 0;
const fail = (title, detail) => {
  failures++;
  console.log(`${RED}FAIL${OFF} ${title}`);
  (Array.isArray(detail) ? detail : [detail]).filter(Boolean)
    .forEach((d) => console.log(`       ${d}`));
};
const pass = (title, detail = '') => console.log(`${GREEN} ok ${OFF} ${title}${detail ? `  ${DIM}${detail}${OFF}` : ''}`);

const parse = (code) => parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
  errorRecovery: true,
});

const read = (file) => fs.readFileSync(file, 'utf8');

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

/* ------------------------------------------------------------ handlers */

/**
 * Names that look like behaviour rather than data: handleSave, onPick,
 * fetchStudents, and plain function declarations. Data variables are excluded
 * deliberately — a page has hundreds and they are not what goes missing.
 */
const isHandlerName = (name) => /^(handle|on|fetch|load|submit|save|refresh|toggle|open|close|do)[A-Z]/.test(name);

const collectHandlers = (ast) => {
  const found = new Map();
  traverse(ast, {
    VariableDeclarator(p) {
      const id = p.node.id;
      const init = p.node.init;
      if (id?.type !== 'Identifier' || !isHandlerName(id.name)) return;
      if (!init) return;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        found.set(id.name, p.node.loc?.start.line ?? 0);
      }
    },
    FunctionDeclaration(p) {
      const name = p.node.id?.name;
      if (name && isHandlerName(name)) found.set(name, p.node.loc?.start.line ?? 0);
    },
  });
  return found;
};

/** Every identifier read anywhere, so a definition can be told from a use. */
const collectReferences = (ast) => {
  const uses = new Map();
  const bump = (name) => uses.set(name, (uses.get(name) || 0) + 1);
  traverse(ast, {
    Identifier(p) {
      // Skip the declaration site itself and object keys like `{ handleX: 1 }`.
      if (p.parent.type === 'VariableDeclarator' && p.parent.id === p.node) return;
      if (p.parent.type === 'FunctionDeclaration' && p.parent.id === p.node) return;
      if (p.parent.type === 'ObjectProperty' && p.parent.key === p.node && !p.parent.computed) return;
      if (p.parent.type === 'MemberExpression' && p.parent.property === p.node && !p.parent.computed) return;
      if (p.parent.type === 'ImportSpecifier' || p.parent.type === 'ImportDefaultSpecifier') return;
      bump(p.node.name);
    },
    JSXIdentifier(p) {
      if (p.parent.type === 'JSXAttribute' && p.parent.name === p.node) return;
      bump(p.node.name);
    },
  });
  return uses;
};

/* --------------------------------------------------------------- props */

/** What a layout reads: `p.onSave`, and names destructured from its props. */
const collectPropsRead = (ast) => {
  const read = new Set();

  /*
   * `p` only means the props bag when it is the component's own parameter.
   * `.map((p) => p.trim())` shadows it, and counting that reported `trim` as a
   * prop nobody passes.
   */
  const componentFns = new Set();
  traverse(ast, {
    ExportDefaultDeclaration(node) {
      let fn = node.node.declaration;
      if (fn.type === 'Identifier') {
        const binding = node.scope.getBinding(fn.name);
        fn = binding?.path.node.init || binding?.path.node;
      }
      if (fn && /^(FunctionDeclaration|ArrowFunctionExpression|FunctionExpression)$/.test(fn.type)) {
        componentFns.add(fn);
      }
    },
    ExportNamedDeclaration(node) {
      const decl = node.node.declaration;
      if (decl?.type === 'FunctionDeclaration') componentFns.add(decl);
      if (decl?.type === 'VariableDeclaration') {
        decl.declarations.forEach((d) => {
          if (d.init && /Function/.test(d.init.type)) componentFns.add(d.init);
        });
      }
    },
  });

  traverse(ast, {
    MemberExpression(node) {
      const { object, property, computed } = node.node;
      if (computed || object.type !== 'Identifier' || property.type !== 'Identifier') return;
      if (object.name !== 'p') return;
      const binding = node.scope.getBinding('p');
      // A parameter of the component, not a local that happens to be called p —
      // `const p = extendedProfile?.profile` is a different thing entirely.
      if (!binding || binding.kind !== 'param') return;
      if (!componentFns.has(binding.scope.block)) return;
      read.add(property.name);
    },
    /*
     * Only the file's default export. A layout file also holds small helper
     * components — a table Cell taking {children, align, bold} — and those are
     * handed their props from inside the file, not by the container. Counting
     * them reported forty imaginary missing props on a page that was correct.
     */
    ExportDefaultDeclaration(p) {
      let fn = p.node.declaration;
      if (fn.type === 'Identifier') {
        const binding = p.scope.getBinding(fn.name);
        fn = binding?.path.node.init || binding?.path.node;
      }
      if (!fn || !/^(FunctionDeclaration|ArrowFunctionExpression|FunctionExpression)$/.test(fn.type)) return;
      const [first] = fn.params;
      if (first?.type !== 'ObjectPattern') return;
      first.properties.forEach((prop) => {
        if (prop.type === 'RestElement') { read.add('...rest'); return; }
        if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') return;
        // `{ dismissible = true }` is optional by construction. A caller that
        // omits it is using the default, not forgetting a prop.
        if (prop.value?.type === 'AssignmentPattern') return;
        read.add(prop.key.name);
      });
    },
  });
  return read;
};

/** What a container hands over: keys of a `...Props` object and JSX attributes. */
const collectPropsSupplied = (ast) => {
  const supplied = new Set();
  let spreadsSomething = false;
  traverse(ast, {
    ObjectProperty(p) {
      if (p.node.key.type === 'Identifier') supplied.add(p.node.key.name);
      if (p.node.key.type === 'StringLiteral') supplied.add(p.node.key.value);
    },
    SpreadElement() { spreadsSomething = true; },
    JSXAttribute(p) {
      if (p.node.name.type === 'JSXIdentifier') supplied.add(p.node.name.name);
    },
    JSXSpreadAttribute() { spreadsSomething = true; },
  });
  return { supplied, spreadsSomething };
};

/* ---------------------------------------------------- undeclared identifiers */

/**
 * Names a file may use without declaring them.
 *
 * Anything outside this list that is referenced but never declared, imported or
 * bound as a parameter is a `ReferenceError` the moment that line runs — and the
 * build will not say a word about it.
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
  // Added after the first run reported these as undefined on pages that are
  // perfectly correct. A checker that cries wolf is one nobody reads.
  'URLSearchParams', 'FileReader', 'Image', 'Audio', 'Notification', 'CustomEvent',
  'Event', 'DOMParser', 'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'history',
  'location', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'HTMLElement', 'Node', 'AbortSignal', 'Headers', 'Request', 'Response', 'WebSocket',
]);

/** Everything referenced here that nothing in scope provides. */
const collectUndeclared = (ast) => {
  const missing = new Map();
  traverse(ast, {
    ReferencedIdentifier(node) {
      const name = node.node.name;
      if (GLOBALS.has(name)) return;
      if (node.scope.hasBinding(name, true)) return;
      if (!missing.has(name)) missing.set(name, node.node.loc?.start.line ?? 0);
    },
  });
  return missing;
};

/* ------------------------------------------------------------- imports */

const collectImports = (ast) => {
  const names = [];
  traverse(ast, {
    ImportDeclaration(p) {
      p.node.specifiers.forEach((spec) => {
        if (spec.local?.type === 'Identifier') {
          names.push({ name: spec.local.name, line: spec.loc?.start.line ?? 0 });
        }
      });
    },
  });
  return names;
};

/* ------------------------------------------------------- class literals */

/**
 * A class name Tailwind cannot see: an expression glued onto a partial class,
 * like `bg-${tone}` or `hover:${t.text}`. A whole class inside a ternary is
 * fine — Tailwind finds it as text — so only a quasi ending mid-token counts.
 */
const collectRuntimeClasses = (ast) => {
  const bad = [];

  /*
   * Every template literal inside the expression, not just the outermost one.
   *
   * `check` used to return unless the expression *itself* was a template
   * literal, so the common shape
   *
   *   className={`base ${on ? `border-${tone}-500` : 'border-gray-200'}`}
   *
   * was waved through: the outer literal's quasi ends in a space, and the inner
   * one — the one Tailwind cannot see — lives inside an expression that was
   * never opened. Found on ManageJobs, where the export dialog's selected
   * format button builds three classes that way. They happened to exist because
   * other files use them, which is exactly why it went unnoticed.
   */
  const eachTemplate = (node, fn) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((child) => eachTemplate(child, fn)); return; }
    if (node.type === 'TemplateLiteral') fn(node);
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = node[key];
      if (child && typeof child === 'object') eachTemplate(child, fn);
    }
  };

  const check = (node, line) => eachTemplate(node, (tpl) => inspect(tpl, line));

  const inspect = (node, line) => {
    node.quasis.forEach((quasi, i) => {
      if (i >= node.expressions.length) return;
      const text = quasi.value.raw;
      if (text.length === 0) return;
      // Glued to the end of a partial class name, rather than after a space.
      if (!/[\s]$/.test(text)) {
        const tail = text.split(/\s/).pop();
        if (tail && /[a-zA-Z0-9]-$|:$/.test(tail)) bad.push({ line, fragment: `${tail}\${…}` });
      }
    });
  };
  traverse(ast, {
    JSXAttribute(p) {
      if (p.node.name.name !== 'className') return;
      const v = p.node.value;
      if (v?.type === 'JSXExpressionContainer') check(v.expression, p.node.loc?.start.line ?? 0);
    },
    VariableDeclarator(p) {
      if (/class|Class/.test(p.node.id?.name || '')) check(p.node.init, p.node.loc?.start.line ?? 0);
    },
  });
  return bad;
};

/* ----------------------------------------------------------------- run */

/*
 * Who imports this file, resolved rather than matched by name. Matching on the
 * basename reported the officer role's `branches/branchesShared.jsx` as a
 * consumer of the super admin's file of the same name — the two roles use
 * parallel names on purpose, so a name is not an identity.
 */
const consumersOf = (target) => {
  const abs = path.resolve(target);
  const hits = [];
  for (const file of walkFiles(SRC)) {
    if (path.resolve(file) === abs) continue;
    let ast;
    try {
      ast = parse(read(file));
    } catch {
      continue;
    }
    let found = false;
    traverse(ast, {
      ImportDeclaration(node) {
        if (found) return;
        const spec = node.node.source.value;
        if (!spec.startsWith('.')) return;
        const base = path.resolve(path.dirname(file), spec);
        for (const candidate of [base, base + '.jsx', base + '.js', path.join(base, 'index.jsx')]) {
          if (path.resolve(candidate) === abs) { found = true; return; }
        }
      },
    });
    if (found) hits.push(path.relative(ROOT, file));
  }
  return hits;
};

const args = process.argv.slice(2);
if (args[0] === '--consumers') {
  const target = args[1];
  if (!target) { console.error('usage: --consumers <file>'); process.exit(2); }
  const hits = consumersOf(target);
  console.log(`${hits.length} file(s) import ${path.relative(ROOT, path.resolve(target))}:`);
  hits.forEach((h) => console.log(`  ${h}`));
  process.exit(0);
}

const containerPath = args[0];
const save = args.includes('--save');
if (!containerPath) {
  console.error('usage: node scripts/check-page.mjs <container.jsx> [--save]');
  process.exit(2);
}

const container = path.resolve(containerPath);
if (!fs.existsSync(container)) { console.error(`no such file: ${container}`); process.exit(2); }

const name = path.basename(container).replace(/\.jsx?$/, '');

/*
 * The layouts are found through the container's own imports rather than by
 * guessing a folder name. The convention names them for the subject, not the
 * page — ManageStudents imports from students/, JobEligibleStudents from
 * jobEligible/ — so a name-derived path silently finds nothing and every check
 * that depends on the layouts quietly passes.
 */
const containerDir = path.dirname(container);
const resolveImport = (spec) => {
  const base = path.resolve(containerDir, spec);
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};

const layoutFolders = new Set();
traverse(parse(read(container)), {
  ImportDeclaration(p) {
    const spec = p.node.source.value;
    if (!spec.startsWith('./')) return;
    const resolved = resolveImport(spec);
    if (!resolved) return;
    const dir = path.dirname(resolved);
    if (dir !== containerDir && dir.startsWith(containerDir)) layoutFolders.add(dir);
  },
});
const moduleFiles = [...layoutFolders].flatMap((dir) => walkFiles(dir));
const layoutDirs = new Set(layoutFolders);

console.log(`\n${DIM}page${OFF} ${path.relative(ROOT, container)}`);
console.log(`${DIM}layouts${OFF} ${moduleFiles.length ? moduleFiles.map((f) => path.basename(f)).join(', ') : '(none yet)'}\n`);

const containerAst = parse(read(container));
const handlers = collectHandlers(containerAst);
const refs = collectReferences(containerAst);

/* 1. handlers still referenced */
const orphaned = [...handlers.keys()].filter((h) => (refs.get(h) || 0) === 0);
if (orphaned.length) {
  fail(`${orphaned.length} handler(s) defined but never used`,
    orphaned.map((h) => `${h}  (line ${handlers.get(h)})`));
} else {
  pass(`all ${handlers.size} handlers are referenced`);
}

/* 2. against the snapshot */
fs.mkdirSync(SNAPSHOTS, { recursive: true });
/*
 * Keyed by path, not by file name. Both roles have a page called
 * ManageCollegeBranches.jsx, so a name-keyed snapshot had them sharing one
 * file — and the officer page was then checked against the super admin's
 * handlers and reported as having lost one it never had.
 */
const snapKey = path.relative(SRC, container).split(path.sep).join('__').replace(/\.jsx?$/, '');
const snapFile = path.join(SNAPSHOTS, `${snapKey}.json`);
if (save) {
  fs.writeFileSync(snapFile, JSON.stringify({ handlers: [...handlers.keys()].sort() }, null, 2));
  console.log(`${DIM}saved ${handlers.size} handler names to ${path.relative(ROOT, snapFile)}${OFF}`);
} else if (fs.existsSync(snapFile)) {
  const before = JSON.parse(read(snapFile)).handlers || [];
  /*
   * Searched across the container AND its module files, not the container
   * alone.
   *
   * The whole point of a split is that some handlers move: a form's
   * `toggleBranch` belongs in the form, not in the page that renders it.
   * Checking the container alone reported those as deleted, which trains you to
   * wave the check through — and then it is no use on the day something really
   * did vanish. The question this check exists to answer is "does it still
   * exist anywhere in this page's code", and that is what it now asks.
   */
  const elsewhere = new Map();
  for (const file of moduleFiles) {
    for (const name of collectHandlers(parse(read(file))).keys()) {
      if (!elsewhere.has(name)) elsewhere.set(name, path.basename(file));
    }
  }
  const missing = before.filter((h) => !handlers.has(h) && !elsewhere.has(h));
  const moved = before.filter((h) => !handlers.has(h) && elsewhere.has(h));
  if (missing.length) {
    fail(`${missing.length} handler(s) present before the rewrite are now gone`, missing);
  } else {
    pass(`all ${before.length} handlers from before the rewrite survive`);
    if (moved.length) {
      console.log(`${DIM} ..  ${moved.length} moved out of the container: `
        + `${moved.map((h) => `${h} → ${elsewhere.get(h)}`).join(', ')}${OFF}`);
    }
  }
} else {
  console.log(`${DIM} ..  no snapshot yet — run with --save before rewriting${OFF}`);
}

/* 3. props the layouts read are supplied */
if (moduleFiles.length) {
  /*
   * Each file is checked against whoever actually renders it. The container
   * renders the device layouts; a device layout renders the filter panel and
   * the modals. Checking every file against the container alone reports props
   * as missing that are passed perfectly well one level down.
   */
  const allFiles = [container, ...moduleFiles];
  const suppliedBy = new Map();
  let anySpread = false;
  for (const file of allFiles) {
    const { supplied, spreadsSomething } = collectPropsSupplied(parse(read(file)));
    suppliedBy.set(file, supplied);
    anySpread = anySpread || spreadsSomething;
  }

  /*
   * Resolved from the import statements themselves rather than matched by name.
   * A regex over the source got this silently wrong once already — one lost
   * backslash and it matched nothing, so every file looked unrendered and the
   * whole prop check passed by doing nothing at all.
   */
  const importsIn = (file) => {
    const found = new Set();
    traverse(parse(read(file)), {
      ImportDeclaration(node) {
        const spec = node.node.source.value;
        if (!spec.startsWith('.')) return;
        const base = path.resolve(path.dirname(file), spec);
        for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')]) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            found.add(path.resolve(candidate));
            return;
          }
        }
      },
    });
    return found;
  };
  const importMap = new Map(allFiles.map((f) => [f, importsIn(f)]));
  const importersOf = (file) =>
    allFiles.filter((other) => other !== file && importMap.get(other).has(path.resolve(file)));

  /*
   * A renderer that spreads — <JobEligibleBody {...p} /> — passes everything it
   * has without naming anything, so nothing can be called missing there. This
   * is the normal shape in these pages: the container builds one props object
   * and every device layout spreads it onward. Reporting those as missing
   * buried the real findings under forty imaginary ones.
   */
  const spreadTargets = (file) => {
    const targets = new Set();
    const ast = parse(read(file));
    const localNames = new Map();
    traverse(ast, {
      ImportDeclaration(node) {
        const spec = node.node.source.value;
        if (!spec.startsWith('.')) return;
        node.node.specifiers.forEach((sp) => {
          if (sp.local?.name) localNames.set(sp.local.name, spec);
        });
      },
      JSXOpeningElement(node) {
        const nameNode = node.node.name;
        if (nameNode.type !== 'JSXIdentifier') return;
        if (!node.node.attributes.some((a) => a.type === 'JSXSpreadAttribute')) return;
        const spec = localNames.get(nameNode.name);
        if (!spec) return;
        const base = path.resolve(path.dirname(file), spec);
        for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')]) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            targets.add(path.resolve(candidate));
            return;
          }
        }
      },
    });
    return targets;
  };
  const spreadMap = new Map(allFiles.map((f) => [f, spreadTargets(f)]));

  const missingProps = [];
  let spreadFed = 0;
  for (const file of moduleFiles) {
    const renderers = importersOf(file);
    if (renderers.length === 0) continue;          // nothing renders it yet
    if (renderers.some((r) => spreadMap.get(r).has(path.resolve(file)))) { spreadFed++; continue; }
    const available = new Set();
    renderers.forEach((r) => suppliedBy.get(r).forEach((prop) => available.add(prop)));
    for (const prop of collectPropsRead(parse(read(file)))) {
      // `children` arrives as JSX children, never as a named attribute.
      if (prop === '...rest' || prop === 'children') continue;
      if (!available.has(prop)) {
        missingProps.push(`${path.basename(file)} reads p.${prop}, but `
          + `${renderers.map((r) => path.basename(r)).join(' / ')} never passes it`);
      }
    }
  }
  if (missingProps.length) {
    fail(`${missingProps.length} prop(s) read but never passed`, missingProps.slice(0, 12));
  } else {
    pass('every prop each file reads is passed by whoever renders it',
      spreadFed ? `(${spreadFed} file(s) are fed by a spread and cannot be checked this way)` : '');
  }
}

/* 3b. props handed to shared components this page renders */

/*
 * Check 3 only looks inside the page's own module folder. A page also renders
 * shared components out of `components/`, and a prop renamed at the call site
 * is invisible there: the component simply never receives it, React passes the
 * stray along silently, and the build says nothing.
 *
 * That is exactly how `JobApplicants` came to hand `onSubmit` to a dialog that
 * reads `onSave` — scheduling a drive threw on `onSave is not a function` — and
 * `onFilterChange` to a panel that reads `onChange`, which broke every control
 * in it. Both survived a green run of every other check here.
 *
 * Only the passed-but-never-read direction is reported. The reverse is normal:
 * plenty of props are optional and deliberately left out.
 */
const IGNORED_PROPS = new Set(['key', 'ref', 'children', 'className', 'style']);

/**
 * The props a component destructures from its first parameter.
 *
 * `null` when that cannot be known — the component does not destructure, or it
 * collects a rest element, in which case an unrecognised prop may well be used.
 * Guessing there would produce exactly the noise that gets a check ignored.
 */
const declaredProps = (file) => {
  const src = read(file);
  const ast = parse(src);
  let props = null;
  let hasRest = false;
  const fromParams = (params) => {
    const first = params && params[0];
    if (!first || first.type !== 'ObjectPattern') return;
    props = [];
    for (const prop of first.properties) {
      if (prop.type === 'RestElement') { hasRest = true; continue; }
      if (prop.key?.type === 'Identifier') props.push(prop.key.name);
    }
  };
  traverse(ast, {
    ExportDefaultDeclaration(p) {
      const d = p.node.declaration;
      if (d.params) fromParams(d.params);
    },
    VariableDeclarator(p) {
      if (props) return;
      const init = p.node.init;
      if (!init || !init.params) return;
      const name = p.node.id?.name;
      // Only the component this file actually exports by default.
      if (!name || !new RegExp(`export default ${name}\\b`).test(src)) return;
      fromParams(init.params);
    },
  });
  return props && !hasRest ? props : null;
};

const sharedUses = [];
const ownFiles = new Set([container, ...moduleFiles].map((f) => path.resolve(f)));
for (const file of [container, ...moduleFiles]) {
  const ast = parse(read(file));
  const localToFile = new Map();
  traverse(ast, {
    ImportDeclaration(p) {
      const spec = p.node.source.value;
      if (!spec.startsWith('.')) return;
      const base = path.resolve(path.dirname(file), spec);
      let resolved = null;
      for (const c of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) { resolved = c; break; }
      }
      // Files inside the page's own module are check 3's business.
      if (!resolved || ownFiles.has(path.resolve(resolved))) return;
      for (const s of p.node.specifiers) {
        if (s.type === 'ImportDefaultSpecifier') localToFile.set(s.local.name, resolved);
      }
    },
  });
  if (localToFile.size === 0) continue;
  traverse(ast, {
    JSXOpeningElement(p) {
      if (p.node.name.type !== 'JSXIdentifier') return;
      const target = localToFile.get(p.node.name.name);
      if (!target) return;
      const attrs = new Set();
      let spread = false;
      for (const a of p.node.attributes) {
        if (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier') attrs.add(a.name.name);
        if (a.type === 'JSXSpreadAttribute') spread = true;
      }
      sharedUses.push({ file, name: p.node.name.name, target, attrs, spread });
    },
  });
}

const strayProps = [];
let unreadable = 0;
const declaredCache = new Map();
for (const use of sharedUses) {
  if (use.spread) { unreadable += 1; continue; }
  if (!declaredCache.has(use.target)) declaredCache.set(use.target, declaredProps(use.target));
  const declared = declaredCache.get(use.target);
  if (!declared) { unreadable += 1; continue; }
  const unknown = [...use.attrs]
    .filter((a) => !IGNORED_PROPS.has(a) && !declared.includes(a));
  for (const prop of unknown) {
    strayProps.push(`${use.name} ← ${prop}  (${path.basename(use.file)}; it reads ${declared.join(', ')})`);
  }
}

if (sharedUses.length === 0) {
  pass('no shared components rendered here');
} else if (strayProps.length) {
  fail(`${strayProps.length} prop(s) passed to a shared component that never reads them`,
    strayProps.slice(0, 10));
} else {
  pass(`every prop reaches the shared component it was meant for  ${DIM}(${sharedUses.length} render site(s))${OFF}`,
    unreadable ? `(${unreadable} take a spread or a rest and cannot be checked this way)` : '');
}

/* 4. unused imports, across the page's files */
const unused = [];
for (const file of [container, ...moduleFiles]) {
  const ast = parse(read(file));
  const used = collectReferences(ast);
  collectImports(ast).forEach(({ name: importName, line }) => {
    if ((used.get(importName) || 0) === 0) unused.push(`${path.basename(file)}:${line}  ${importName}`);
  });
}
if (unused.length) fail(`${unused.length} unused import(s) — the build does not catch these`, unused);
else pass('no unused imports');

/*
 * The dangerous half. An unused import is harmless; a *missing* one is a white
 * screen the moment the line runs, and the build is equally silent about both.
 * This check exists because a page assembled from moved code lost three imports
 * — useCallback, useAutoRefresh and compareStudents — and shipped. The build
 * passed, every other check passed, and the page threw "useCallback is not
 * defined" on open.
 */
const undeclared = [];
for (const file of [container, ...moduleFiles]) {
  collectUndeclared(parse(read(file))).forEach((line, name) => {
    undeclared.push(`${path.basename(file)}:${line}  ${name}`);
  });
}
if (undeclared.length) {
  fail(`${undeclared.length} identifier(s) used but never declared or imported`, undeclared);
} else {
  pass('nothing used without being declared or imported');
}

/* 5. class names Tailwind cannot see */
const runtime = [];
for (const file of [container, ...moduleFiles]) {
  collectRuntimeClasses(parse(read(file)))
    .forEach((r) => runtime.push(`${path.basename(file)}:${r.line}  ${r.fragment}`));
}
if (runtime.length) {
  fail(`${runtime.length} class name(s) built at runtime — Tailwind will not generate them`, runtime);
} else {
  pass('every class name is a whole literal');
}

/* 6. who else depends on this page's files */
const shared = [];
for (const file of moduleFiles) {
  const own = new Set([container, ...moduleFiles].map((f) => path.resolve(f)));
  const others = consumersOf(file).filter((c) => !own.has(path.resolve(ROOT, c)));
  if (others.length) shared.push(`${path.basename(file)} → ${others.join(', ')}`);
}
if (shared.length) {
  console.log(`${DIM} ..  used outside this page — check these too:${OFF}`);
  shared.forEach((s) => console.log(`       ${s}`));
}

console.log(failures === 0
  ? `\n${GREEN}all checks passed${OFF}\n`
  : `\n${RED}${failures} check(s) failed${OFF}\n`);
process.exit(failures === 0 ? 0 : 1);

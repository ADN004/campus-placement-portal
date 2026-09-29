# Automated checks

Added 29 September 2026.

Nothing here runs during a build or a deploy. These catch a specific set of
mistakes that reached production before, and they are designed to stay green so
that a red run means something.

## What runs, and when

`.github/workflows/checks.yml` runs on push and pull request to `main` and
`develop`:

| Step | What it catches |
|---|---|
| `npm run lint` (frontend) | A React hook called conditionally — see below |
| `scripts/check-export-filters.mjs` | An export that ignores the filters on screen |
| `scripts/check-branch-matching.mjs` | A branch compared as a raw string instead of through the normaliser |
| `scripts/check-silent-failures.mjs` | A request whose error is dropped on the floor |

Each of the three scripts was written after the bug it looks for had already
shipped. They read files only — no database, no build, no network — so they run
anywhere and take seconds.

## It does not block deploys, deliberately

`checks.yml` is a **separate workflow** from `docker-hub.yml`. GitHub runs the
two independently, so a failing check puts a red X on the commit but does not
stop an image being built or a deploy going out.

That is a starting position, not a principle. These checks are new, and a check
nobody trusts yet should not be able to hold up a fix to production at 11pm.
Once it has run green for a while, make it blocking by adding **Checks** as a
required status check on `main` and `develop` in the repository's branch
protection settings. No file needs to change for that.

## Linting: one rule on purpose

`frontend/eslint.config.js` enables exactly two rules:

- `react-hooks/rules-of-hooks` — **error**
- `react-hooks/exhaustive-deps` — **warning**

Baseline on the day it was added: **0 errors, 33 warnings**. `npm run lint`
fails on errors only, so the run is green today and goes red the first time
somebody writes a conditional hook.

### Why this rule

A `useMemo` sat four lines below an early return in
`frontend/src/pages/super-admin/JobApplicants.jsx`. The first render bailed out
at the guard and never reached the hook; the render after the job loaded ran it.
Two renders, two hook counts, and React tears the tree down rather than guess
which state belongs to which hook — so the page rendered **nothing at all** in
production and the console showed a minified error number.

The rule was verified by putting the bug back and watching ESLint fail with
*"Did you accidentally call a React Hook after an early return?"*

The tree also already carried five `// eslint-disable-next-line
react-hooks/exhaustive-deps` comments before any ESLint was installed. The code
was written as though this plugin ran.

### Do not turn on `recommended`

A recommended or airbnb preset over a codebase that has never been linted
produces hundreds of findings at once. They do not then get fixed: the run goes
red, people learn to ignore red, and within a fortnight somebody deletes the
step. A check that is ignored is worse than no check, because it also costs CI
time and tells you that you are covered.

Add rules **one at a time**, and only once the tree is already clean of that
rule, so `npm run lint` never has a red baseline.

### Do not upgrade to ESLint 10 yet

ESLint 10 requires Node `^20.19 || ^22.13 || >=24`. `frontend/Dockerfile` builds
on `node:18-alpine`, so every image build would emit `EBADENGINE`. And
`eslint-plugin-react-hooks@5` peer-caps at ESLint `^9`, so there is no supported
plugin to pair with 10.

If you want it, the order is: `Dockerfile` → `node:20-alpine`, then the plugin,
then ESLint.

### `npm install`, not `npm ci`

`frontend/.gitignore` line 12 ignores `package-lock.json`, so there is no
lockfile in the repository for `npm ci` to read or for `actions/setup-node` to
key a cache on — both would fail on the first run. `frontend/Dockerfile`
installs the same way, so CI matches how the image is actually built.

(The root `.gitignore` carries a comment saying lockfiles are kept. The
frontend's own `.gitignore` overrides it. The backend lockfile *is* tracked.)

If the frontend lockfile is ever committed, CI can switch to `npm ci` with
`cache: npm`.

### Lint cannot break a build

`npm run build` is Vite alone and no lint plugin is registered in
`vite.config.js`. Lint runs in your editor and in CI, never in the build, so a
lint failure cannot stop a deploy.

## Checks that are not in CI

`backend/scripts/checkBranchCoverage.mjs` compares
`KERALA_POLYTECHNIC_BRANCHES` against the branches colleges actually offer, in
both directions. It needs a live database, so it runs on the server rather than
in CI — after a deploy, and after any change to the branch list or to a
college's branches:

```bash
docker compose -f docker-compose.hub.yml exec backend node scripts/checkBranchCoverage.mjs
```

The `backend/scripts/smoke*.mjs` scripts are the same kind of thing: they need a
database and are run by hand against staging.

## Adding a new check

The three in `scripts/` are the pattern. A good one:

- reads files, needs no database, and finishes in seconds
- exits non-zero **only** on the shape of a bug that has actually shipped
- prints the file and line, and says in one line why it matters
- is verified by re-introducing the original bug and watching it fail

That last point is not optional. `check-branch-matching.mjs` passed its own test
on the first attempt for the wrong reason — it cleared any raw comparison whose
preceding line mentioned the normaliser, and the real bug sat directly under
`const studentBranchNorm = normalizeBranch(...)`. A check that cannot catch the
bug it was written for is worse than none.

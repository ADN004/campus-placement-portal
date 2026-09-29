import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * One rule, on purpose.
 *
 * This config exists because of a single bug. A useMemo sat four lines below
 * `if (showSkeleton || !selectedJob) return <ApplicantsSkeleton />` in the
 * Super Admin applicant page. The first render bailed out at the guard and
 * never reached the hook; the render after the job loaded ran it. Two renders,
 * two hook counts, and React unmounts the tree rather than guess which state
 * belongs to which hook -- so the page went white in production and the console
 * showed a minified error number. react-hooks/rules-of-hooks flags that shape
 * the moment it is typed.
 *
 * The codebase was already written as though this plugin ran. There were five
 * `// eslint-disable-next-line react-hooks/exhaustive-deps` comments in the
 * tree before this file existed, suppressing a linter nobody had installed.
 *
 * WHY ONLY TWO RULES, AND WHY NOT `recommended`
 *
 * Turning on a recommended or airbnb preset over 250 files that have never been
 * linted produces hundreds of findings at once. What happens then is not that
 * they get fixed: the run goes red, everybody learns to ignore red, and within
 * a fortnight somebody deletes the step. A check that is ignored is worse than
 * no check, because it also costs CI time and it tells you that you are covered.
 *
 * So this starts green and stays green. rules-of-hooks is an error because
 * breaking it is not a style question -- it is a blank page. exhaustive-deps is
 * a warning because the five suppressions above are deliberate (effects that
 * must run once for the lifetime of a mount), and promoting it to an error
 * would demand either churn or more suppressions on day one.
 *
 * Adding rules later is welcome. Add them one at a time, and only after the
 * tree is clean of that rule, so `npm run lint` never has a red baseline.
 *
 * DO NOT UPGRADE TO ESLINT 10 YET
 *
 * ESLint 10 requires Node ^20.19 || ^22.13 || >=24. frontend/Dockerfile builds
 * on node:18-alpine, so every image build would emit EBADENGINE. And
 * eslint-plugin-react-hooks@5 peer-depends on eslint <=9, so 10 has no
 * supported plugin to pair with. Move the Dockerfile to node:20-alpine first,
 * then the plugin, then ESLint -- in that order.
 *
 * This is never run by the build. `npm run build` is Vite alone, and no lint
 * plugin is registered in vite.config.js, so a lint failure cannot stop a
 * deploy. It runs in your editor, and in the checks workflow.
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // A blank page, not a style preference. See the note above.
      'react-hooks/rules-of-hooks': 'error',
      // Warn only: the deliberate run-once effects already carry suppressions.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

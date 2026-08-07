import { AlertCircle } from 'lucide-react';
import { Panel, PanelHeading } from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three ManageCollegeBranches presenters.
 *
 * A branch here is just a string. Students carry the branch name they picked at
 * registration, and job eligibility matches it with `s.branch = ANY(...)` — an
 * exact, case-sensitive comparison. That single fact drives most of this file:
 * two spellings of the same branch are two different branches as far as the
 * database is concerned, so the page works hard to stop a second spelling from
 * ever being created, and shows the officer when one already exists.
 */

/**
 * The comparison key for "is this the same branch?".
 *
 * Case-folded and whitespace-collapsed, because "computer engineering" and
 * "Computer  Engineering" are the same branch to a human and two different ones
 * to `= ANY()`.
 */
export function branchKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Does `name` already appear in `list`, ignoring case and spacing? */
export function findSameBranch(list, name) {
  const key = branchKey(name);
  if (!key) return null;
  return list.find((item) => branchKey(item) === key) || null;
}

/* ------------------------------------------------------------------ counts */

/** One number and what it counts. Numbers are right-aligned and tabular. */
export function CountBlock({ label, value, hint, tone = 'default' }) {
  return (
    <div className="px-4 py-3 border-b border-spc-line last:border-b-0 sm:border-b-0 sm:border-r
      sm:last:border-r-0 sm:flex-1 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</p>
        {hint && <p className="text-xs text-spc-muted mt-0.5">{hint}</p>}
      </div>
      <p
        className={`text-spc-display font-bold tabular-nums flex-shrink-0 ${
          tone === 'bad' ? 'text-spc-bad' : 'text-spc-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ tables */

/**
 * The configured branches, as a table.
 *
 * The student count is the useful column: it is what tells an officer whether
 * removing a branch would strand anyone. It counts approved, non-blacklisted
 * students, which is what the branches endpoint returns, so the heading says so.
 */
export function BranchTable({ rows }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Branches your college offers, with the number of approved students in each.
        </caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            <th
              scope="col"
              className="px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
                text-spc-xs text-spc-muted text-left"
            >
              Branch
            </th>
            <th
              scope="col"
              className="px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
                text-spc-xs text-spc-muted text-right whitespace-nowrap"
            >
              Students
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors"
            >
              <th scope="row" className="px-3 py-2.5 text-left font-normal">
                <span className="text-spc-sm font-bold text-spc-ink">{row.name}</span>
              </th>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                {row.students > 0 ? (
                  <span className="text-spc-sm text-spc-ink tabular-nums">{row.students}</span>
                ) : (
                  <span className="text-spc-xs text-spc-muted">none yet</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The same rows as a ruled list, for tablet and phone. */
export function BranchList({ rows }) {
  if (rows.length === 0) return null;

  return (
    <ul>
      {rows.map((row) => (
        <li
          key={row.name}
          className="flex items-baseline justify-between gap-3 px-4 py-3
            border-b border-spc-line last:border-b-0"
        >
          <span className="text-spc-sm font-bold text-spc-ink min-w-0 break-words">{row.name}</span>
          {row.students > 0 ? (
            <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0 whitespace-nowrap">
              {row.students} student{row.students === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-spc-xs text-spc-muted flex-shrink-0 whitespace-nowrap">none yet</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------- notices */

/** A stated consequence. Warn tone for "fix this", bad tone for "this is broken". */
export function Notice({ tone = 'warn', title, children }) {
  const skin =
    tone === 'bad'
      ? 'bg-spc-bad-bg border-spc-bad/40 text-spc-bad'
      : 'bg-spc-warn-bg border-spc-warn/40 text-spc-warn';
  return (
    <div className={`rounded-spc-panel border p-4 ${skin}`}>
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-spc-xs font-bold text-spc-ink">{title}</p>
          <div className="text-spc-xs text-spc-body mt-1 leading-snug">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Branches students are registered under that are not in the configured list.
 *
 * A state the old page could not show, because it only ever read the configured
 * list. Two things land here. The obvious one is a branch removed after students
 * had already registered into it. The quiet one is a spelling that drifted —
 * "computer engineering" against a configured "Computer Engineering" — which
 * reads as identical and is not, because eligibility compares the strings
 * exactly. Either way the students are unreachable by any job that limits itself
 * to the configured branches, which is worth saying out loud.
 */
export function OrphanBranches({ rows }) {
  if (rows.length === 0) return null;

  return (
    <Panel>
      <PanelHeading>Students in branches that are not on your list</PanelHeading>
      <p className="px-4 py-3 text-spc-xs text-spc-body border-b border-spc-line leading-snug">
        These students registered under a branch name that your list does not contain. Their
        accounts work normally and they still appear in Manage Students, but no new student can
        pick these branches, and a job that limits itself to your configured branches will not
        reach them. Check the spelling against your list first — a difference in capitals or
        spacing counts as a different branch. Add the branch back if it belongs, or ask the Super
        Admin to correct the students&rsquo; records if the name is wrong.
      </p>
      <ul>
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex items-baseline justify-between gap-3 px-4 py-3
              border-b border-spc-line last:border-b-0"
          >
            <span className="text-spc-sm font-bold text-spc-ink min-w-0 break-words">{row.name}</span>
            <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0 whitespace-nowrap">
              {row.students} student{row.students === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------- explainer */

export const BRANCH_POINTS = [
  'Students registering for your college can only pick a branch from this list.',
  'If the list is empty, nobody from your college can finish registering.',
  'Removing a branch does not change students already registered under it — it only stops new registrations for that branch.',
  'Spelling matters: a branch typed a second way counts as a different branch when jobs check who is eligible.',
];

export function HowBranchesWork({ points = BRANCH_POINTS }) {
  return (
    <Panel>
      <PanelHeading>How branches work</PanelHeading>
      <ul>
        {points.map((point) => (
          <li
            key={point}
            className="px-4 py-3 text-spc-xs text-spc-body leading-snug border-b border-spc-line last:border-b-0"
          >
            {point}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

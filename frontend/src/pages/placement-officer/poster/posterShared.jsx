import { Check, X } from 'lucide-react';
import { Panel, PanelHeading, EmptyState } from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three PlacementPoster presenters.
 *
 * The page's job is to answer two questions before an officer presses a button
 * that produces a document with their college's name on it: can it be generated
 * at all, and are the numbers it will print the right ones. Everything here
 * serves one of those two.
 */

/* --------------------------------------------------------------- readiness */

/**
 * One condition, met or not, with what to do about it.
 *
 * Both blocking conditions are decided by the same values the Generate button
 * is disabled on, so the tick and the button can never disagree — they did
 * before, because the checklist tested `logo_url !== null` while the button and
 * the server both tested it for falsiness, so an empty string showed a green
 * tick on an enabled button that failed the moment it was pressed.
 */
export function ReadinessItem({ met, label, children, blocking = true }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-spc-line last:border-b-0">
      <span
        aria-hidden="true"
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
          ${met ? 'bg-spc-ok-bg text-spc-ok' : blocking ? 'bg-spc-bad-bg text-spc-bad' : 'bg-spc-surface-2 text-spc-muted'}`}
      >
        {met ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
      </span>
      <div className="min-w-0">
        <p className="text-spc-xs font-bold text-spc-ink">
          {label}
          <span className="sr-only">{met ? ' — ready' : ' — not ready'}</span>
        </p>
        <p className="text-spc-xs text-spc-body mt-0.5 leading-snug">{children}</p>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------- figures */

/** One figure and what it counts. Numbers right-aligned and tabular. */
export function Figure({ label, value, hint }) {
  return (
    <div className="px-4 py-3 border-b border-spc-line last:border-b-0
      sm:border-b-0 sm:border-r sm:last:border-r-0 sm:flex-1 min-w-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</p>
      <p className="text-spc-display font-bold text-spc-ink tabular-nums mt-1 break-words">
        {value}
      </p>
      {hint && <p className="text-xs text-spc-muted mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

/**
 * The four figures the poster is built from.
 *
 * "Companies" used to be a single card showing `recruiting_companies ||
 * total_companies` under the description "Recruiting companies (N placed)".
 * Those are two unrelated numbers: one counts companies with a live job
 * targeting this college, the other counts companies that actually hired
 * someone. Sitting beside "Students Placed" the first reads as an achievement
 * it is not, and the `||` meant the card silently switched meaning when no job
 * was live. The poster prints the second number, so that is the one shown here;
 * recruiting activity is reported separately, below, in its own words.
 */
export function PosterFigures({ stats }) {
  const lpa = (value) => (value ? `${value} LPA` : '—');
  return (
    <Panel>
      <div className="sm:flex sm:items-stretch">
        <Figure
          label="Students placed"
          value={stats.total_students_placed || 0}
          hint="Marked selected, with a package"
        />
        <Figure
          label="Companies"
          value={stats.total_companies || 0}
          hint="That hired at least one student"
        />
        <Figure label="Highest package" value={lpa(stats.highest_package)} hint="Best offer" />
        <Figure label="Average package" value={lpa(stats.average_package)} hint="Across placements" />
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- companies */

export function CompanyTable({ companies }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Companies that hired students from your college, with package and headcount.
        </caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            <th scope="col" className="px-3 py-2 font-khand font-medium uppercase
              tracking-[0.06em] text-spc-xs text-spc-muted text-left">
              Company
            </th>
            <th scope="col" className="px-3 py-2 font-khand font-medium uppercase
              tracking-[0.06em] text-spc-xs text-spc-muted text-right whitespace-nowrap">
              Package (LPA)
            </th>
            <th scope="col" className="px-3 py-2 font-khand font-medium uppercase
              tracking-[0.06em] text-spc-xs text-spc-muted text-right whitespace-nowrap">
              Students
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company, index) => (
            <tr
              key={`${company.company_name}-${company.lpa}-${index}`}
              className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors"
            >
              <th scope="row" className="px-3 py-2.5 text-left font-normal">
                <span className="text-spc-sm font-bold text-spc-ink">{company.company_name}</span>
              </th>
              <td className="px-3 py-2.5 text-right text-spc-sm text-spc-ink tabular-nums whitespace-nowrap">
                {company.lpa}
              </td>
              <td className="px-3 py-2.5 text-right text-spc-sm text-spc-ink tabular-nums">
                {company.student_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompanyList({ companies }) {
  return (
    <ul>
      {companies.map((company, index) => (
        <li
          key={`${company.company_name}-${company.lpa}-${index}`}
          className="px-4 py-3 border-b border-spc-line last:border-b-0"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-spc-sm font-bold text-spc-ink min-w-0 break-words">
              {company.company_name}
            </span>
            <span className="text-spc-sm font-bold text-spc-ink tabular-nums flex-shrink-0 whitespace-nowrap">
              {company.lpa} LPA
            </span>
          </div>
          <p className="text-xs text-spc-muted mt-0.5 tabular-nums">
            {company.student_count} student{company.student_count === 1 ? '' : 's'}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- explainer */

export const POSTER_POINTS = [
  'Every student marked “selected” whose job carries a package is included.',
  'Students are grouped by company and ordered by package, highest first.',
  'Each student appears with their photo, name and branch.',
  'Your college logo is placed on the poster, so it must be uploaded first.',
  'Fix a wrong package or selection in Job Applicants, then refresh here before generating.',
];

export function WhatsOnThePoster({ points = POSTER_POINTS }) {
  return (
    <Panel>
      <PanelHeading>What goes on the poster</PanelHeading>
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

export { EmptyState };

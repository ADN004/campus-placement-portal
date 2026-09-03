import { Search, X, Plus, Check, AlertCircle } from 'lucide-react';
import {
  Panel, SectionLabel, FIELD_CLASS, FieldLabel, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The pieces the College Branches page is built from, shared by its table and
 * its list so the two cannot drift.
 */

/* -------------------------------------------------------------- how a college stands */

/**
 * A college's configuration state, as one fact.
 *
 * The page this replaces coloured this three ways — red for none, yellow for
 * fewer than three, green for three or more — which spent all three status
 * colours on a threshold nobody set. None configured is a genuine problem and
 * keeps its colour; the rest is just a count.
 */
export function branchStatus(college) {
  const count = college.branches?.length || 0;
  if (count === 0) return { count, tone: 'bad', text: 'None configured', Icon: AlertCircle };
  return { count, tone: 'plain', text: `${count} ${count === 1 ? 'branch' : 'branches'}`, Icon: Check };
}

export function BranchCount({ college }) {
  const { tone, text, Icon } = branchStatus(college);
  const isBad = tone === 'bad';
  return (
    <span className={`inline-flex items-center gap-1.5 text-spc-xs font-semibold
      ${isBad ? 'text-spc-bad' : 'text-spc-ink'}`}>
      <Icon size={14} aria-hidden="true" className="flex-shrink-0" />
      {text}
    </span>
  );
}

/** The first few branch names, with the rest counted rather than listed. */
export function BranchPreview({ branches, limit = 2 }) {
  if (!branches || branches.length === 0) {
    return <span className="text-spc-xs text-spc-body">No branches configured</span>;
  }
  const shown = branches.slice(0, limit);
  const rest = branches.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((branch) => (
        <span
          key={branch}
          className="inline-block px-2 py-0.5 rounded-spc-admin-sm bg-spc-surface-2
            text-spc-xs text-spc-ink"
        >
          {branch}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-block px-2 py-0.5 text-spc-xs text-spc-body">+{rest} more</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------------ controls */

export function BranchFilters({ layout, searchQuery, onSearch, regions, selectedRegion, onRegion }) {
  const columns = layout === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2';
  return (
    <div className={`grid ${columns} gap-3 mb-4`}>
      <div className="relative min-w-0">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none"
        />
        <input
          id="college-search"
          type="text"
          value={searchQuery}
          onChange={onSearch}
          placeholder="Search by college name or code…"
          aria-label="Search colleges"
          className={`${FIELD_CLASS} pl-10`}
        />
      </div>
      <div>
        <select
          id="region-filter"
          value={selectedRegion}
          onChange={onRegion}
          aria-label="Filter by region"
          className={FIELD_CLASS}
        >
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>{region.region_name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** The four counts above the register. Figures, not coloured cards. */
export function BranchSummary({ layout, total, none, few, full }) {
  const columns = layout === 'desktop' ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const items = [
    { label: 'Colleges', value: total },
    { label: 'None configured', value: none, bad: none > 0 },
    { label: 'Fewer than three', value: few },
    { label: 'Three or more', value: full },
  ];
  return (
    <div className={`grid grid-cols-2 ${columns} gap-3 mb-5`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin"
        >
          <p className={`text-spc-metric font-bold tabular-nums
            ${item.bad ? 'text-spc-bad' : 'text-spc-ink'}`}>
            {item.value}
          </p>
          <p className="text-spc-xs text-spc-body mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- the register */

/** Desktop: a real table, with the accessibility a table is supposed to carry. */
export function CollegeTable({ colleges, onEdit }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">
            Colleges and the branches configured for each, with a control to edit them.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {['College', 'Region', 'Configured', 'Branches'].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5"
                >
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {colleges.map((college) => (
              <tr key={college.id} className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left font-normal align-top">
                  <span className="block text-spc-sm font-bold text-spc-ink">{college.college_name}</span>
                  <span className="block text-spc-xs text-spc-body tabular-nums">{college.college_code}</span>
                </th>
                <td className="px-4 py-3 text-spc-xs text-spc-body align-top">{college.region_name}</td>
                <td className="px-4 py-3 align-top"><BranchCount college={college} /></td>
                <td className="px-4 py-3 align-top"><BranchPreview branches={college.branches} /></td>
                <td className="px-4 py-3 text-right align-top">
                  <SecondaryButton onClick={() => onEdit(college)}>
                    Edit branches
                  </SecondaryButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Phone and tablet: the same register as a ruled list, no sideways scrolling. */
export function CollegeList({ colleges, onEdit }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {colleges.map((college) => (
          <li key={college.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink break-words">{college.college_name}</p>
                <p className="text-spc-xs text-spc-body tabular-nums">
                  {college.college_code} · {college.region_name}
                </p>
              </div>
              <BranchCount college={college} />
            </div>
            <div className="mt-2">
              <BranchPreview branches={college.branches} limit={3} />
            </div>
            <SecondaryButton onClick={() => onEdit(college)} className="w-full mt-3">
              Edit branches
            </SecondaryButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------------- the editor */

/**
 * The contents of the edit dialog: what is chosen, a box to type a new one, and
 * the standard list to pick from.
 *
 * `addError` is why the last attempt to add was refused — a second spelling of
 * a branch already chosen. The rule itself lives in `utils/branchName`, so the
 * browser and the database agree on what "the same branch" means.
 */
export function BranchEditor({
  selected, onRemove, custom, onCustomChange, onAddCustom, templates, onAdd,
  addError, submitting,
}) {
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Chosen ({selected.length})</SectionLabel>
        <div className="min-h-[84px] p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          {selected.length === 0 ? (
            <p className="text-spc-xs text-spc-body text-center py-4">Nothing chosen yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {selected.map((branch) => (
                <li key={branch}>
                  <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-spc-admin-sm
                    bg-spc-surface border border-spc-line-strong text-spc-xs text-spc-ink">
                    {branch}
                    <button
                      type="button"
                      onClick={() => onRemove(branch)}
                      disabled={submitting}
                      aria-label={`Remove ${branch}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-spc-admin-sm
                        text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="custom-branch">Add one not on the list</FieldLabel>
        <div className="flex gap-2">
          <input
            id="custom-branch"
            type="text"
            value={custom}
            onChange={onCustomChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddCustom();
              }
            }}
            placeholder="Branch name…"
            className={FIELD_CLASS}
            disabled={submitting}
          />
          <SecondaryButton onClick={onAddCustom} disabled={submitting || !custom.trim()}>
            <Plus size={15} aria-hidden="true" />
            Add
          </SecondaryButton>
        </div>
        {addError && (
          <p role="alert" className="text-spc-xs text-spc-bad font-semibold mt-1.5">{addError}</p>
        )}
      </div>

      <div>
        <SectionLabel>Or pick from the standard list</SectionLabel>
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
          {templates.map((branch) => {
            const chosen = selected.includes(branch);
            return (
              <button
                key={branch}
                type="button"
                onClick={() => onAdd(branch)}
                disabled={submitting || chosen}
                aria-pressed={chosen}
                className={`inline-flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-spc-admin-sm
                  text-spc-xs font-semibold border transition-colors
                  ${chosen
                    ? 'bg-spc-selected border-spc-line-strong text-spc-ink cursor-default'
                    : 'bg-spc-surface border-spc-control text-spc-ink hover:bg-spc-surface-2'}`}
              >
                {chosen ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                {branch}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

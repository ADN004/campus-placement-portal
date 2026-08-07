import { Panel, TextField, SecondaryButton } from '../../../components/officer/OfficerUI';

/**
 * The page's own "additional filters" — the five that narrow the applicant list
 * beyond whatever the job itself requires.
 *
 * Same five fields bound to the same container state and change handler, so the
 * filtering behaves exactly as before. Only `columns` differs by device, and
 * every field now has an id so its label is associated with it.
 */
export default function AdditionalFilters({
  columns = 3,
  filters,
  onChange,
  onClear,
  hasActiveFilters,
  shownCount,
}) {
  const grid = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Panel>
      <div className={`grid ${grid} gap-4 p-4`}>
        <TextField
          id="je-cgpa-min"
          label="Additional min CGPA"
          type="number"
          value={filters.cgpaMin}
          onChange={(e) => onChange('cgpaMin', e.target.value)}
          placeholder="e.g. 7.0"
          min="0"
          max="10"
          step="0.1"
        />
        <TextField
          id="je-cgpa-max"
          label="Additional max CGPA"
          type="number"
          value={filters.cgpaMax}
          onChange={(e) => onChange('cgpaMax', e.target.value)}
          placeholder="e.g. 9.0"
          min="0"
          max="10"
          step="0.1"
        />
        <TextField
          id="je-max-backlogs"
          label="Max backlogs (stricter)"
          type="number"
          value={filters.maxBacklogs}
          onChange={(e) => onChange('maxBacklogs', e.target.value)}
          placeholder="0 for none"
          min="0"
        />
        <TextField
          id="je-dob-from"
          label="Date of birth (from)"
          type="date"
          value={filters.dobFrom}
          onChange={(e) => onChange('dobFrom', e.target.value)}
        />
        <TextField
          id="je-dob-to"
          label="Date of birth (to)"
          type="date"
          value={filters.dobTo}
          onChange={(e) => onChange('dobTo', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-spc-line">
        <p className="text-spc-xs text-spc-muted">
          Showing <span className="font-bold text-spc-ink tabular-nums">{shownCount}</span> applicants
        </p>
        <SecondaryButton onClick={onClear} disabled={!hasActiveFilters}>
          Clear filters
        </SecondaryButton>
      </div>
    </Panel>
  );
}

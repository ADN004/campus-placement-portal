import { Panel, TextField, SelectField, FieldLabel, FIELD_CLASS, SecondaryButton } from './studentsShared';

/**
 * The advanced-filter panel, shared by all three presenters.
 *
 * Same fourteen filters as before, bound to the same container state and the
 * same change handlers — nothing was added, removed or renamed, so the query
 * parameters the page sends are unchanged.
 *
 * Only `columns` differs by device. Every field is a labelled control at 44px
 * minimum, which the old panel was not: its inputs carried no `id`, so the
 * labels were not programmatically associated with anything.
 */
export default function AdvancedFilters({
  columns = 3,
  advancedFilters,
  onFilterChange,
  filterDocuments,
  onDocumentChange,
  filterDistricts,
  onDistrictsChange,
  availableDistricts,
  collegeBranches,
  onClear,
  hasActiveFilters,
  shownCount,
  totalStudents,
}) {
  const grid =
    columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';
  // The district picker always takes the full width of whatever grid it is in.
  const wide = columns === 1 ? '' : columns === 2 ? 'col-span-2' : 'col-span-3';

  return (
    <Panel>
      <div className={`grid ${grid} gap-4 p-4`}>
        <TextField
          id="filter-cgpa-min"
          label="Minimum CGPA"
          type="number"
          value={advancedFilters.cgpaMin}
          onChange={(e) => onFilterChange('cgpaMin', e.target.value)}
          placeholder="e.g. 6.0"
          min="0"
          max="10"
          step="0.1"
        />
        <TextField
          id="filter-cgpa-max"
          label="Maximum CGPA"
          type="number"
          value={advancedFilters.cgpaMax}
          onChange={(e) => onFilterChange('cgpaMax', e.target.value)}
          placeholder="e.g. 9.0"
          min="0"
          max="10"
          step="0.1"
        />
        <TextField
          id="filter-backlogs"
          label="Maximum backlogs"
          type="number"
          value={advancedFilters.backlogCount}
          onChange={(e) => onFilterChange('backlogCount', e.target.value)}
          placeholder="0 for none"
          min="0"
        />

        <SelectField
          id="filter-branch"
          label="Branch"
          value={advancedFilters.branch}
          onChange={(e) => onFilterChange('branch', e.target.value)}
        >
          <option value="">All branches</option>
          {collegeBranches.map((branch) => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </SelectField>

        <div className="min-w-0">
          <TextField
            id="filter-dob-from"
            label="Date of birth (from)"
            type="date"
            value={advancedFilters.dobFrom}
            onChange={(e) => onFilterChange('dobFrom', e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <TextField
            id="filter-dob-to"
            label="Date of birth (to)"
            type="date"
            value={advancedFilters.dobTo}
            onChange={(e) => onFilterChange('dobTo', e.target.value)}
          />
          {advancedFilters.dobFrom && !advancedFilters.dobTo && (
            <p className="text-xs text-spc-muted mt-1">Defaults to today if not set</p>
          )}
        </div>

        <TextField
          id="filter-height-min"
          label="Min height (cm)"
          type="number"
          value={advancedFilters.heightMin}
          onChange={(e) => onFilterChange('heightMin', e.target.value)}
          placeholder="e.g. 155"
          min="140"
          max="220"
        />
        <TextField
          id="filter-height-max"
          label="Max height (cm)"
          type="number"
          value={advancedFilters.heightMax}
          onChange={(e) => onFilterChange('heightMax', e.target.value)}
          placeholder="e.g. 190"
          min="140"
          max="220"
        />
        <TextField
          id="filter-weight-min"
          label="Min weight (kg)"
          type="number"
          value={advancedFilters.weightMin}
          onChange={(e) => onFilterChange('weightMin', e.target.value)}
          placeholder="e.g. 45"
          min="30"
          max="150"
          step="0.1"
        />
        <TextField
          id="filter-weight-max"
          label="Max weight (kg)"
          type="number"
          value={advancedFilters.weightMax}
          onChange={(e) => onFilterChange('weightMax', e.target.value)}
          placeholder="e.g. 100"
          min="30"
          max="150"
          step="0.1"
        />

        <SelectField
          id="filter-dl"
          label="Driving licence"
          value={filterDocuments.driving_license}
          onChange={(e) => onDocumentChange('driving_license', e.target.value)}
        >
          <option value="">Any</option>
          <option value="yes">Has DL</option>
          <option value="no">No DL</option>
        </SelectField>
        <SelectField
          id="filter-pan"
          label="PAN card"
          value={filterDocuments.pan_card}
          onChange={(e) => onDocumentChange('pan_card', e.target.value)}
        >
          <option value="">Any</option>
          <option value="yes">Has PAN</option>
          <option value="no">No PAN</option>
        </SelectField>
        <SelectField
          id="filter-aadhar"
          label="Aadhaar card"
          value={filterDocuments.aadhar_card}
          onChange={(e) => onDocumentChange('aadhar_card', e.target.value)}
        >
          <option value="">Any</option>
          <option value="yes">Has Aadhaar</option>
          <option value="no">No Aadhaar</option>
        </SelectField>
        <SelectField
          id="filter-passport"
          label="Passport"
          value={filterDocuments.passport}
          onChange={(e) => onDocumentChange('passport', e.target.value)}
        >
          <option value="">Any</option>
          <option value="yes">Has passport</option>
          <option value="no">No passport</option>
        </SelectField>

        <div className={`min-w-0 ${wide}`}>
          <FieldLabel htmlFor="filter-districts">District(s)</FieldLabel>
          <select
            id="filter-districts"
            multiple
            size="4"
            value={filterDistricts}
            onChange={(e) =>
              onDistrictsChange(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
            className={`${FIELD_CLASS} py-2 h-auto min-h-[112px]`}
          >
            {availableDistricts.map((district) => (
              <option key={district} value={district} className="py-1">
                {district}
              </option>
            ))}
          </select>
          <p className="text-xs text-spc-muted mt-1">
            Hold Ctrl (Cmd on Mac) to pick more than one. Selected:{' '}
            <span className="tabular-nums font-bold text-spc-ink">{filterDistricts.length}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-spc-line">
        <p className="text-spc-xs text-spc-muted">
          Showing <span className="font-bold text-spc-ink tabular-nums">{shownCount}</span> of{' '}
          <span className="font-bold text-spc-ink tabular-nums">{totalStudents}</span> students
        </p>
        <SecondaryButton onClick={onClear} disabled={!hasActiveFilters}>
          Clear filters
        </SecondaryButton>
      </div>
    </Panel>
  );
}

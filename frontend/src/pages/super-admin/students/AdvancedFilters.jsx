import {
  Panel, PanelHeading, SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The narrower filters, behind a toggle.
 *
 * Fourteen of them, and every field here now has an `id` its label points at —
 * they had none, so clicking a label did nothing and a screen reader announced
 * an unnamed input.
 *
 * Two things carried over deliberately:
 *
 *   - The document filters send `yes` / `no` / empty, which is what the query
 *     compares against. They are three-state on purpose: a checkbox cannot ask
 *     for students *without* a PAN card, which is the question actually put when
 *     chasing missing paperwork.
 *   - Branch stays tied to college. The list is that college's branches, fetched
 *     when one is picked, so it is disabled until then and says why.
 *
 * The district picker was a native `multiple` select needing Ctrl-click — which
 * is unusable on a phone and undiscoverable on a laptop. Same values, same
 * parameter; a checkbox list instead.
 */
const DOCUMENTS = [
  ['driving_license', 'Driving licence'],
  ['pan_card', 'PAN card'],
  ['aadhar_card', 'Aadhaar card'],
  ['passport', 'Passport'],
];

export default function AdvancedFilters({
  layout, advancedFilters, onAdvancedChange,
  branches, filterBranch, onBranch, collegeChosen,
  dobFrom, dobTo, onDobFrom, onDobTo,
  heightMin, heightMax, weightMin, weightMax,
  onHeightMin, onHeightMax, onWeightMin, onWeightMax,
  filterDocuments, onDocumentChange,
  availableDistricts, filterDistricts, onDistrictToggle,
  onClear, hasActiveFilters, shownCount, totalCount,
}) {
  const columns = layout === 'desktop' ? 'lg:grid-cols-4' : 'sm:grid-cols-2';

  const num = (id, label, value, onChange, props = {}) => (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input id={id} type="number" className={FIELD_CLASS} value={value}
        onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );

  return (
    <Panel className="mb-4">
      <PanelHeading
        action={(
          <SecondaryButton onClick={onClear} disabled={!hasActiveFilters}>
            Clear all
          </SecondaryButton>
        )}
      >
        Narrow the register
      </PanelHeading>

      <div className="p-4 space-y-4">
        <div className={`grid grid-cols-1 ${columns} gap-3`}>
          <div>
            <FieldLabel htmlFor="af-branch">Branch</FieldLabel>
            <select
              id="af-branch"
              className={FIELD_CLASS}
              value={filterBranch}
              onChange={(e) => onBranch(e.target.value)}
              disabled={!collegeChosen}
            >
              <option value="">{collegeChosen ? 'All branches' : 'Pick a college first'}</option>
              {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
            </select>
            {!collegeChosen && (
              <p className="text-spc-xs text-spc-body mt-1">
                Branches differ by college, so one has to be chosen first.
              </p>
            )}
          </div>

          {num('af-cgpa', 'Minimum CGPA', advancedFilters.cgpaMin,
            (v) => onAdvancedChange('cgpaMin', v),
            { min: '0', max: '10', step: '0.1', placeholder: 'e.g. 6.0' })}

          {num('af-backlogs', 'Maximum backlogs', advancedFilters.backlogCount,
            (v) => onAdvancedChange('backlogCount', v),
            { min: '0', placeholder: 'e.g. 0 for none' })}

          <div>
            <FieldLabel htmlFor="af-dob-from">Born on or after</FieldLabel>
            <input id="af-dob-from" type="date" className={FIELD_CLASS} value={dobFrom}
              onChange={(e) => onDobFrom(e.target.value)} />
          </div>

          <div>
            <FieldLabel htmlFor="af-dob-to">Born on or before</FieldLabel>
            <input id="af-dob-to" type="date" className={FIELD_CLASS} value={dobTo}
              onChange={(e) => onDobTo(e.target.value)} />
            {dobFrom && !dobTo && (
              <p className="text-spc-xs text-spc-body mt-1">Today, unless you set one.</p>
            )}
          </div>

          {num('af-height-min', 'Height at least (cm)', heightMin, onHeightMin,
            { min: '140', max: '220', placeholder: 'e.g. 155' })}
          {num('af-height-max', 'Height at most (cm)', heightMax, onHeightMax,
            { min: '140', max: '220', placeholder: 'e.g. 200' })}
          {num('af-weight-min', 'Weight at least (kg)', weightMin, onWeightMin,
            { min: '30', max: '150', step: '0.1', placeholder: 'e.g. 45' })}
          {num('af-weight-max', 'Weight at most (kg)', weightMax, onWeightMax,
            { min: '30', max: '150', step: '0.1', placeholder: 'e.g. 100' })}
        </div>

        <div>
          <SectionLabel>Documents</SectionLabel>
          <div className={`grid grid-cols-1 ${columns} gap-3`}>
            {DOCUMENTS.map(([key, label]) => (
              <div key={key}>
                <FieldLabel htmlFor={`af-doc-${key}`}>{label}</FieldLabel>
                <select
                  id={`af-doc-${key}`}
                  className={FIELD_CLASS}
                  value={filterDocuments[key]}
                  onChange={(e) => onDocumentChange(key, e.target.value)}
                >
                  <option value="">Either way</option>
                  <option value="yes">Has one</option>
                  <option value="no">Does not</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {availableDistricts.length > 0 && (
          <div>
            <SectionLabel>
              Districts{filterDistricts.length > 0 && ` — ${filterDistricts.length} chosen`}
            </SectionLabel>
            <div className="max-h-44 overflow-y-auto border border-spc-line-strong rounded-spc-admin-sm">
              {availableDistricts.map((district) => (
                <label
                  key={district}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-spc-line
                    last:border-b-0 ${filterDistricts.includes(district)
                      ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
                >
                  <input
                    type="checkbox"
                    checked={filterDistricts.includes(district)}
                    onChange={() => onDistrictToggle(district)}
                    className={CHECKBOX_CLASS}
                  />
                  <span className="text-spc-xs text-spc-ink">{district}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <p className="text-spc-xs text-spc-body tabular-nums">
          {shownCount.toLocaleString()} of {totalCount.toLocaleString()} students on this page.
        </p>
      </div>
    </Panel>
  );
}

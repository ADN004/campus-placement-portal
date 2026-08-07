import React from 'react';
import { formatStatus } from '../utils/formatStatus';
import {
  Panel, PanelHeading, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
} from './officer/OfficerUI';

const DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
  'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur',
  'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad',
  'Kannur', 'Kasaragod',
];

const STATUSES = ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'];

/** Documents the filter can require. Each is two-state in the data: required, or not asked. */
const DOCUMENTS = [
  ['hasDrivingLicense', 'Driving licence'],
  ['hasPan', 'PAN card'],
  ['hasAadhar', 'Aadhaar'],
  ['hasPassport', 'Passport'],
];

/**
 * The officer branch of EnhancedFilterPanel.
 *
 * Same filter object, same keys, same semantics — what changes is that the
 * controls say what they are. The document filters were buttons that toggled
 * between `true` and `null`, which is exactly a checkbox, so they are
 * checkboxes; disability is genuinely three-state (`null` / `false` / `true`)
 * and two buttons could not show which of the three was chosen, so it is a
 * select with all three named.
 */
function OfficerFilterPanel({ filters, onChange, onClear, activeCount }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const statuses = filters.applicationStatuses || [];

  const toggleStatus = (status) =>
    set({
      applicationStatuses: statuses.includes(status)
        ? statuses.filter((s) => s !== status)
        : [...statuses, status],
    });

  return (
    <Panel>
      <PanelHeading
        action={
          activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-bold text-spc-bad underline underline-offset-2
                min-h-[44px] px-1 hover:opacity-80 transition-opacity"
            >
              Clear all
            </button>
          ) : null
        }
      >
        Advanced filters
        {activeCount > 0 && (
          <span className="ml-2 font-normal normal-case tracking-normal tabular-nums">
            ({activeCount} on)
          </span>
        )}
      </PanelHeading>

      <fieldset className="px-4 py-3 border-b border-spc-line">
        <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-1">
          Application status
        </legend>
        <div className="grid grid-cols-2 gap-x-4">
          {STATUSES.map((status) => (
            <label key={status} className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={statuses.includes(status)}
                onChange={() => toggleStatus(status)}
                className={CHECKBOX_CLASS}
              />
              <span className="text-spc-xs text-spc-ink">{formatStatus(status)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="px-4 py-3 border-b border-spc-line space-y-3">
        <div>
          <FieldLabel htmlFor="filter-sslc">Minimum SSLC %</FieldLabel>
          <input
            id="filter-sslc"
            type="number" step="0.01" min="0" max="100"
            value={filters.sslcMin || ''}
            onChange={(e) => set({ sslcMin: e.target.value })}
            className={FIELD_CLASS}
            placeholder="e.g. 70"
          />
        </div>
        <div>
          <FieldLabel htmlFor="filter-twelfth">Minimum 12th %</FieldLabel>
          <input
            id="filter-twelfth"
            type="number" step="0.01" min="0" max="100"
            value={filters.twelfthMin || ''}
            onChange={(e) => set({ twelfthMin: e.target.value })}
            className={FIELD_CLASS}
            placeholder="e.g. 75"
          />
        </div>
        <div>
          <FieldLabel htmlFor="filter-district">District</FieldLabel>
          <select
            id="filter-district"
            value={filters.district || ''}
            onChange={(e) => set({ district: e.target.value })}
            className={FIELD_CLASS}
          >
            <option value="">Any district</option>
            {DISTRICTS.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="px-4 py-3 border-b border-spc-line">
        <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-1">
          Must have
        </legend>
        <div className="grid grid-cols-2 gap-x-4">
          {DOCUMENTS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key] === true}
                onChange={() => set({ [key]: filters[key] === true ? null : true })}
                className={CHECKBOX_CLASS}
              />
              <span className="text-spc-xs text-spc-ink">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="px-4 py-3 space-y-3">
        <div>
          <FieldLabel htmlFor="filter-height">Minimum height (cm)</FieldLabel>
          <input
            id="filter-height"
            type="number" step="1" min="0" max="250"
            value={filters.heightMin || ''}
            onChange={(e) => set({ heightMin: e.target.value })}
            className={FIELD_CLASS}
            placeholder="e.g. 150"
          />
        </div>
        <div>
          <FieldLabel htmlFor="filter-weight">Minimum weight (kg)</FieldLabel>
          <input
            id="filter-weight"
            type="number" step="0.1" min="0" max="200"
            value={filters.weightMin || ''}
            onChange={(e) => set({ weightMin: e.target.value })}
            className={FIELD_CLASS}
            placeholder="e.g. 45"
          />
        </div>
        <div>
          {/* Three states, three options. The old pair of buttons could show
              "with" or "without" but had no way to show "not filtering". */}
          <FieldLabel htmlFor="filter-disability">Physical disability</FieldLabel>
          <select
            id="filter-disability"
            value={
              filters.physicallyHandicapped === true ? 'yes'
              : filters.physicallyHandicapped === false ? 'no'
              : 'any'
            }
            onChange={(e) =>
              set({
                physicallyHandicapped:
                  e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null,
              })
            }
            className={FIELD_CLASS}
          >
            <option value="any">Not filtering</option>
            <option value="no">Without a disability</option>
            <option value="yes">With a disability</option>
          </select>
        </div>
      </div>
    </Panel>
  );
}

const EnhancedFilterPanel = ({ filters, onChange, onClear, variant }) => {
  const statuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'];

  const districts = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur',
    'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad',
    'Kannur', 'Kasaragod'
  ];

  const toggleStatus = (status) => {
    const current = filters.applicationStatuses || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onChange({ ...filters, applicationStatuses: updated });
  };

  const hasActiveFilters = () => {
    return filters.applicationStatuses?.length > 0 ||
           filters.sslcMin ||
           filters.twelfthMin ||
           filters.district ||
           filters.hasPassport !== null ||
           filters.hasAadhar !== null ||
           filters.hasDrivingLicense !== null ||
           filters.hasPan !== null ||
           filters.heightMin ||
           filters.weightMin ||
           filters.physicallyHandicapped !== null;
  };

  const activeCount = [
    filters.applicationStatuses?.length || 0,
    filters.sslcMin ? 1 : 0,
    filters.twelfthMin ? 1 : 0,
    filters.district ? 1 : 0,
    filters.hasPassport !== null ? 1 : 0,
    filters.hasAadhar !== null ? 1 : 0,
    filters.hasDrivingLicense !== null ? 1 : 0,
    filters.hasPan !== null ? 1 : 0,
    filters.heightMin ? 1 : 0,
    filters.weightMin ? 1 : 0,
    filters.physicallyHandicapped !== null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (variant === 'officer') {
    return (
      <OfficerFilterPanel
        filters={filters}
        onChange={onChange}
        onClear={onClear}
        activeCount={activeCount}
      />
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Advanced Filters</h3>
        {hasActiveFilters() && (
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Application Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Application Status
        </label>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                (filters.applicationStatuses || []).includes(status)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {formatStatus(status)}
            </button>
          ))}
        </div>
      </div>

      {/* SSLC Marks Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum SSLC %
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={filters.sslcMin || ''}
          onChange={(e) => onChange({ ...filters, sslcMin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., 70"
        />
      </div>

      {/* 12th Marks Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum 12th %
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={filters.twelfthMin || ''}
          onChange={(e) => onChange({ ...filters, twelfthMin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., 75"
        />
      </div>

      {/* District Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          District
        </label>
        <select
          value={filters.district || ''}
          onChange={(e) => onChange({ ...filters, district: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      {/* Document Filters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Document Filters
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ ...filters, hasDrivingLicense: filters.hasDrivingLicense === true ? null : true })}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.hasDrivingLicense === true
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            Has DL
          </button>
          <button
            onClick={() => onChange({ ...filters, hasPan: filters.hasPan === true ? null : true })}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.hasPan === true
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            Has PAN
          </button>
          <button
            onClick={() => onChange({ ...filters, hasAadhar: filters.hasAadhar === true ? null : true })}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.hasAadhar === true
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            Has Aadhar
          </button>
          <button
            onClick={() => onChange({ ...filters, hasPassport: filters.hasPassport === true ? null : true })}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.hasPassport === true
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            Has Passport
          </button>
        </div>
      </div>

      {/* Physical Details Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Height (cm)
        </label>
        <input
          type="number"
          step="1"
          min="0"
          max="250"
          value={filters.heightMin || ''}
          onChange={(e) => onChange({ ...filters, heightMin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., 150"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Weight (kg)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="200"
          value={filters.weightMin || ''}
          onChange={(e) => onChange({ ...filters, weightMin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., 45"
        />
      </div>

      {/* Physical Disability Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Physical Disability
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...filters, physicallyHandicapped: filters.physicallyHandicapped === false ? null : false })}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.physicallyHandicapped === false
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            No Disability
          </button>
          <button
            onClick={() => onChange({ ...filters, physicallyHandicapped: filters.physicallyHandicapped === true ? null : true })}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              filters.physicallyHandicapped === true
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            With Disability
          </button>
        </div>
      </div>

      {/* Active Filters Count */}
      {hasActiveFilters() && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-600">
              {[
                filters.applicationStatuses?.length || 0,
                filters.sslcMin ? 1 : 0,
                filters.twelfthMin ? 1 : 0,
                filters.district ? 1 : 0,
                filters.hasPassport !== null ? 1 : 0,
                filters.hasAadhar !== null ? 1 : 0,
                filters.hasDrivingLicense !== null ? 1 : 0,
                filters.hasPan !== null ? 1 : 0,
                filters.heightMin ? 1 : 0,
                filters.weightMin ? 1 : 0,
                filters.physicallyHandicapped !== null ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
            {' '}filter(s) active
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedFilterPanel;

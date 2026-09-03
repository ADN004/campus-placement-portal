import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The two things only some drives need: a floor on a specific profile figure,
 * and questions of the company's own.
 *
 * Behind a toggle because most jobs use neither, and putting them in the main
 * flow would make every posting look like it needs them.
 */

/** A minimum on one extended-profile number. */
const FIGURES = [
  ['height_cm', 'Minimum height (cm)', '155'],
  ['weight_kg', 'Minimum weight (kg)', '45'],
  ['sslc_marks', 'Minimum SSLC (%)', '60'],
  ['twelfth_marks', 'Minimum 12th (%)', '60'],
];

const FIELD_TYPES = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['boolean', 'Yes / No'],
  ['select', 'Dropdown'],
  ['textarea', 'Long text'],
];

const EMPTY_CUSTOM_FIELD = {
  field_name: '',
  field_label: '',
  field_type: 'text',
  required: true,
  options: [],
};

export default function AdvancedConfig({
  formData, onSpecificFieldChange, onAddCustomField, onRemoveCustomField,
}) {
  const [newCustomField, setNewCustomField] = useState(EMPTY_CUSTOM_FIELD);

  const add = () => {
    onAddCustomField(newCustomField);
    // Cleared only if the parent accepted it — it refuses a field with no name
    // or label, and clearing regardless would wipe what the admin typed.
    if (newCustomField.field_name && newCustomField.field_label) {
      setNewCustomField(EMPTY_CUSTOM_FIELD);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Minimums on profile figures</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIGURES.map(([key, label, placeholder]) => (
            <div key={key}>
              <FieldLabel htmlFor={`figure-${key}`}>{label}</FieldLabel>
              <input
                id={`figure-${key}`}
                type="number"
                className={FIELD_CLASS}
                value={formData.specific_field_requirements[key]?.min || ''}
                onChange={(e) => onSpecificFieldChange(key, 'min', e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <p className="text-spc-xs text-spc-body mt-2">
          Leave blank for no bar. A student who has not filled that part of their extended profile
          cannot meet a minimum on it, so only set one the drive really needs.
        </p>
      </div>

      <div>
        <SectionLabel>
          The company&apos;s own questions
          {formData.custom_fields.length > 0 && ` — ${formData.custom_fields.length}`}
        </SectionLabel>

        {formData.custom_fields.length > 0 && (
          <ul className="mb-3 border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
            {formData.custom_fields.map((field, index) => (
              <li key={`${field.field_name}-${index}`}
                className="flex items-start justify-between gap-3 px-3 py-2.5
                  border-b border-spc-line last:border-b-0">
                <div className="min-w-0">
                  <p className="text-spc-sm font-bold text-spc-ink break-words">
                    {field.field_label}
                  </p>
                  <p className="text-spc-xs text-spc-body font-mono break-words">
                    {field.field_name} · {field.field_type}
                    {field.required ? ' · required' : ' · optional'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCustomField(index)}
                  aria-label={`Remove the question "${field.field_label}"`}
                  title="Remove"
                  className="inline-flex items-center justify-center w-11 h-11 flex-shrink-0
                    rounded-spc-admin-sm text-spc-body hover:bg-spc-bad-bg
                    hover:text-spc-bad transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-2">
            Add a question
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="custom-label">What the student sees *</FieldLabel>
              <input
                id="custom-label"
                type="text"
                className={FIELD_CLASS}
                value={newCustomField.field_label}
                onChange={(e) => setNewCustomField((p) => ({ ...p, field_label: e.target.value }))}
                placeholder="Have you applied for SITTTR?"
              />
            </div>
            <div>
              <FieldLabel htmlFor="custom-name">Name in the export *</FieldLabel>
              <input
                id="custom-name"
                type="text"
                className={`${FIELD_CLASS} font-mono`}
                value={newCustomField.field_name}
                onChange={(e) => setNewCustomField((p) => ({ ...p, field_name: e.target.value }))}
                placeholder="sitttr_applied"
              />
            </div>
            <div>
              <FieldLabel htmlFor="custom-type">Answer type</FieldLabel>
              <select
                id="custom-type"
                className={FIELD_CLASS}
                value={newCustomField.field_type}
                onChange={(e) => setNewCustomField((p) => ({ ...p, field_type: e.target.value }))}
              >
                {FIELD_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={newCustomField.required}
                  onChange={(e) => setNewCustomField((p) => ({ ...p, required: e.target.checked }))}
                  className={`${CHECKBOX_CLASS} flex-shrink-0`}
                />
                <span className="text-spc-sm text-spc-ink">They must answer it</span>
              </label>
            </div>
          </div>

          <SecondaryButton onClick={add} className="mt-3">
            <Plus size={15} aria-hidden="true" />
            Add the question
          </SecondaryButton>

          <p className="text-spc-xs text-spc-body mt-2">
            Asked when the student applies, and carried into the applicant export under the name
            above.
          </p>
        </div>
      </div>
    </div>
  );
}

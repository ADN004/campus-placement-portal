import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  SecondaryButton, FieldLabel, FIELD_CLASS, CheckRow,
} from '../../../components/officer/OfficerUI';

/**
 * The optional extras on a job request: physical/academic cut-offs, and any
 * extra question the company wants asked at application time.
 *
 * This block was the last piece of the page still wearing the old look —
 * rounded-xl inputs with 2px grey borders and a green button — because the
 * rewrite moved the rest of the form into this module and left it behind.
 */

/* ------------------------------------------------------------- cut-offs */

const CUTOFFS = [
  { key: 'height_cm', label: 'Minimum height', unit: 'cm', step: '1', max: '250', hint: 'e.g. 155' },
  { key: 'weight_kg', label: 'Minimum weight', unit: 'kg', step: '0.1', max: '200', hint: 'e.g. 45' },
  { key: 'sslc_marks', label: 'Minimum SSLC', unit: '%', step: '0.01', max: '100', hint: 'e.g. 60' },
  { key: 'twelfth_marks', label: 'Minimum 12th / diploma', unit: '%', step: '0.01', max: '100', hint: 'e.g. 60' },
];

/* -------------------------------------------------------- custom fields */

/**
 * What a student sees, in the officer's words.
 *
 * The old editor asked for three things: a "Field Name (for database)", a
 * "Field Label (shown to students)" and a "Field Type". The first is a
 * developer's concern that had leaked into a placement officer's screen — it is
 * never shown to anyone, never printed, and never searched; it is only the key
 * the answer is stored under. Asking staff to invent `sitttr_applied` is asking
 * them to name a database column, and getting it wrong is silent.
 *
 * So it is derived from the question instead, and the officer writes the one
 * thing they actually have in mind: the question. "Field Type" becomes what the
 * answer looks like, in the four shapes the student form can actually render.
 */
const ANSWER_TYPES = [
  { value: 'text', label: 'Short answer', hint: 'One line of text' },
  { value: 'textarea', label: 'Long answer', hint: 'A few sentences' },
  { value: 'number', label: 'Number', hint: 'Digits only' },
  { value: 'boolean', label: 'Yes or no', hint: 'A tick box' },
];

const typeLabel = (value) =>
  (ANSWER_TYPES.find((t) => t.value === value) || ANSWER_TYPES[0]).label;

/**
 * Turn the question into the storage key.
 *
 * Lowercase words joined by underscores, trimmed to something readable, with a
 * numeric suffix if that key is already taken — two questions worded similarly
 * must not collide, because the second would overwrite the first's answer.
 * Falls back to `question_N` when a question has no usable characters at all
 * (an all-punctuation or non-Latin question would otherwise slug to nothing).
 */
export function deriveFieldName(question, existing = []) {
  const taken = new Set(existing.map((f) => f.field_name));
  const base =
    String(question || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || `question_${existing.length + 1}`;

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

const EMPTY_FIELD = { field_label: '', field_type: 'text', required: true };

function CustomFieldEditor({ fields, onAdd, onRemove }) {
  const [draft, setDraft] = useState(EMPTY_FIELD);
  const [error, setError] = useState('');

  const add = () => {
    const question = draft.field_label.trim();
    if (!question) {
      setError('Write the question you want students to answer.');
      return;
    }
    if (fields.some((f) => f.field_label.trim().toLowerCase() === question.toLowerCase())) {
      setError('That question is already on the list.');
      return;
    }
    onAdd({
      field_name: deriveFieldName(question, fields),
      field_label: question,
      field_type: draft.field_type,
      required: draft.required,
      options: [],
    });
    setDraft(EMPTY_FIELD);
    setError('');
  };

  return (
    <div>
      <p className="text-spc-xs text-spc-body leading-snug mb-3">
        Anything else this company wants to know, asked on the application form. Students answer it
        when they apply, and the answers come back with their application.
      </p>

      {fields.length > 0 && (
        <ul className="mb-4 rounded-spc-control border border-spc-line-strong overflow-hidden">
          {fields.map((field, index) => (
            <li
              key={field.field_name || index}
              className="flex items-start justify-between gap-3 px-3 py-2.5 border-b border-spc-line last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-spc-xs font-bold text-spc-ink break-words">{field.field_label}</p>
                <p className="text-xs text-spc-muted mt-0.5">
                  {typeLabel(field.field_type)}
                  {field.required ? ' · must be answered' : ' · optional'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove question: ${field.field_label}`}
                title="Remove this question"
                className="inline-flex items-center justify-center w-11 h-11 -mr-1 flex-shrink-0
                  rounded-spc-control text-spc-body hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-spc-control border border-spc-line-strong p-3 space-y-3">
        <div>
          <FieldLabel htmlFor="custom-question">The question</FieldLabel>
          <input
            id="custom-question"
            type="text"
            value={draft.field_label}
            onChange={(e) => {
              setDraft({ ...draft, field_label: e.target.value });
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. Have you applied for SITTTR?"
            className={FIELD_CLASS}
            aria-invalid={error ? 'true' : undefined}
          />
          <p className="text-xs text-spc-muted mt-1">
            Write it exactly as the student should read it.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="custom-type">How they answer</FieldLabel>
          <select
            id="custom-type"
            value={draft.field_type}
            onChange={(e) => setDraft({ ...draft, field_type: e.target.value })}
            className={FIELD_CLASS}
          >
            {ANSWER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
        </div>

        <CheckRow
          checked={draft.required}
          onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
        >
          They cannot submit the application without answering this
        </CheckRow>

        {error && (
          <p className="text-xs text-spc-bad" role="alert">
            {error}
          </p>
        )}

        <SecondaryButton type="button" onClick={add} disabled={!draft.field_label.trim()}>
          <Plus size={15} aria-hidden="true" />
          <span>Add question</span>
        </SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ block */

export default function AdvancedRequirements({
  formData,
  onSpecificFieldChange,
  onAddCustomField,
  onRemoveCustomField,
  columns = 2,
}) {
  const requirements = formData.specific_field_requirements || {};
  const fields = formData.custom_fields || [];

  return (
    <div className="mt-4 space-y-5">
      <section>
        <h4 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-1">
          Cut-offs beyond CGPA and backlogs
        </h4>
        <p className="text-xs text-spc-muted mb-3 leading-snug">
          Leave any of these blank to not check it. A student below a cut-off you set will not be
          able to apply.
        </p>
        <div className={`grid ${columns === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {CUTOFFS.map((cut) => (
            <div key={cut.key}>
              <FieldLabel htmlFor={`cutoff-${cut.key}`}>
                {cut.label} ({cut.unit})
              </FieldLabel>
              <input
                id={`cutoff-${cut.key}`}
                type="number"
                step={cut.step}
                min="0"
                max={cut.max}
                value={requirements[cut.key]?.min || ''}
                onChange={(e) => onSpecificFieldChange(cut.key, 'min', e.target.value)}
                className={FIELD_CLASS}
                placeholder={cut.hint}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4 border-t border-spc-line">
        <h4 className="font-khand font-medium uppercase tracking-[0.06em] text-spc-sm text-spc-ink mb-1">
          Extra questions for this company
        </h4>
        <CustomFieldEditor
          fields={fields}
          onAdd={onAddCustomField}
          onRemove={onRemoveCustomField}
        />
      </section>
    </div>
  );
}


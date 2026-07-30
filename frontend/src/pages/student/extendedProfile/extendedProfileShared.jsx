import { CheckCircle } from 'lucide-react';
import AcademicExtendedSection from '../../../components/extendedProfile/AcademicExtendedSection';
import PhysicalDetailsSection from '../../../components/extendedProfile/PhysicalDetailsSection';
import FamilyDetailsSection from '../../../components/extendedProfile/FamilyDetailsSection';
import PersonalDetailsSection from '../../../components/extendedProfile/PersonalDetailsSection';
import DocumentVerificationSection from '../../../components/extendedProfile/DocumentVerificationSection';
import EducationPreferencesSection from '../../../components/extendedProfile/EducationPreferencesSection';

/**
 * Pieces shared by the three ExtendedProfile presenters.
 *
 * The section switch lives here rather than in each presenter: it wires six
 * forms to six save handlers, and repeating that three times would be three
 * chances to mis-wire one.
 */

/* ------------------------------------------------------------- completion */

/** Ring used where there's room for it — tablet and desktop. */
export function CompletionRing({ percent, size = 128 }) {
  const stroke = 8;
  const r = size / 2 - stroke;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-spc-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          strokeLinecap="round"
          className="text-spc-teal transition-all duration-1000"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-spc-metric font-extrabold text-spc-ink">
        {percent}%
      </span>
    </div>
  );
}

/** Bar used on phones, where a 128px ring costs a third of the screen. */
export function CompletionBar({ percent }) {
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-spc-label font-bold uppercase text-spc-muted">Profile completion</span>
        <span className="text-spc-h1 font-extrabold text-spc-ink">{percent}%</span>
      </div>
      <div
        className="w-full bg-spc-line rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Extended profile completion"
      >
        <div className="bg-spc-teal h-2 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-spc-xs text-spc-muted mt-2.5">
        Fill at least one field in each section. The more you complete, the better your job matches.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------- section picker */

/**
 * One section in the picker. `variant="row"` is the desktop sidebar entry;
 * `variant="tile"` is the compact grid cell used on phones and tablets.
 */
export function SectionButton({ section, active, percent, complete, onSelect, variant = 'row' }) {
  const Icon = section.icon;
  const base = `text-left rounded-spc-sm border transition-colors ${
    active
      ? 'bg-spc-teal-soft border-spc-teal'
      : 'bg-spc-surface border-spc-line hover:border-spc-line-strong'
  }`;

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={() => onSelect(section.id)}
        aria-current={active ? 'true' : undefined}
        className={`${base} w-full min-h-[76px] p-3 flex flex-col gap-1.5`}
      >
        <span className="flex items-center justify-between gap-2">
          <Icon size={17} className={active ? 'text-spc-teal' : 'text-spc-muted'} />
          {complete ? (
            <CheckCircle size={15} className="text-spc-ok" />
          ) : (
            <span className="text-xs font-bold tabular-nums text-spc-muted">{percent}%</span>
          )}
        </span>
        <span className={`text-spc-xs font-bold leading-tight ${active ? 'text-spc-ink' : 'text-spc-body'}`}>
          {section.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      aria-current={active ? 'true' : undefined}
      className={`${base} w-full min-h-[64px] p-3 flex items-center gap-3`}
    >
      {/* Fixed 32px icon box so every label starts on the same vertical line. */}
      <span
        className={`w-8 h-8 rounded-spc-sm flex items-center justify-center flex-shrink-0
          ${active ? 'bg-spc-teal' : 'bg-spc-surface-2'}`}
      >
        <Icon size={16} className={active ? 'text-spc-on-teal' : 'text-spc-muted'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-spc-xs font-bold leading-tight ${active ? 'text-spc-ink' : 'text-spc-body'}`}>
          {section.name}
        </span>
        <span className="block text-xs text-spc-muted truncate">{section.description}</span>
      </span>
      <span className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-spc-sm
            ${complete ? 'bg-spc-ok-bg text-spc-ok' : 'bg-spc-surface-2 text-spc-muted'}`}
        >
          {percent}%
        </span>
        {complete && <CheckCircle size={15} className="text-spc-ok" />}
      </span>
    </button>
  );
}

/* -------------------------------------------------------- section content */

/**
 * Renders whichever section is active. Every form, setter and save handler is
 * passed through untouched from the container.
 */
export function SectionContent({
  activeSection,
  academicForm,
  setAcademicForm,
  physicalForm,
  setPhysicalForm,
  familyForm,
  setFamilyForm,
  personalForm,
  setPersonalForm,
  documentForm,
  setDocumentForm,
  educationForm,
  setEducationForm,
  onSave,
  saving,
  getSectionStatus,
}) {
  const common = { onSave: () => onSave(activeSection), saving, isCompleted: getSectionStatus(activeSection) };

  switch (activeSection) {
    case 'academic_extended':
      return <AcademicExtendedSection formData={academicForm} setFormData={setAcademicForm} {...common} />;
    case 'physical_details':
      return <PhysicalDetailsSection formData={physicalForm} setFormData={setPhysicalForm} {...common} />;
    case 'family_details':
      return <FamilyDetailsSection formData={familyForm} setFormData={setFamilyForm} {...common} />;
    case 'personal_details':
      return <PersonalDetailsSection formData={personalForm} setFormData={setPersonalForm} {...common} />;
    case 'document_verification':
      return <DocumentVerificationSection formData={documentForm} setFormData={setDocumentForm} {...common} />;
    case 'education_preferences':
      return <EducationPreferencesSection formData={educationForm} setFormData={setEducationForm} {...common} />;
    default:
      return null;
  }
}

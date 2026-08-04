import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  FileText,
  XCircle,
} from 'lucide-react';
import AcademicExtendedSection from '../../extendedProfile/AcademicExtendedSection';
import PhysicalDetailsSection from '../../extendedProfile/PhysicalDetailsSection';
import FamilyDetailsSection from '../../extendedProfile/FamilyDetailsSection';
import PersonalDetailsSection from '../../extendedProfile/PersonalDetailsSection';
import DocumentVerificationSection from '../../extendedProfile/DocumentVerificationSection';
import EducationPreferencesSection from '../../extendedProfile/EducationPreferencesSection';

/**
 * Body content for the apply flow, shared by the three device presenters.
 *
 * Only the *shell* differs per device (full-screen sheet on a phone, centred
 * dialog on tablet/desktop) — the information itself is identical everywhere,
 * so it lives here once. `dense` tightens padding for the phone shell.
 *
 * Nothing in this file holds state or talks to the API. Every value and every
 * handler is passed down from SmartApplicationModal.
 */

const SECTION_COMPONENTS = {
  academic_extended: AcademicExtendedSection,
  physical_details: PhysicalDetailsSection,
  family_details: FamilyDetailsSection,
  personal_details: PersonalDetailsSection,
  document_verification: DocumentVerificationSection,
  education_preferences: EducationPreferencesSection,
};

export function getSectionComponent(sectionId) {
  return SECTION_COMPONENTS[sectionId];
}

/* ---------------------------------------------------------------- notices */

const TONES = {
  bad: {
    wrap: 'bg-spc-bad-bg border-spc-bad/25',
    icon: 'text-spc-bad',
  },
  warn: {
    wrap: 'bg-spc-warn-bg border-spc-warn/25',
    icon: 'text-spc-warn',
  },
  ok: {
    wrap: 'bg-spc-ok-bg border-spc-ok/25',
    icon: 'text-spc-ok',
  },
  teal: {
    wrap: 'bg-spc-teal-soft border-spc-teal/20',
    icon: 'text-spc-teal',
  },
};

export function Notice({ tone = 'teal', icon: Icon, title, children }) {
  const t = TONES[tone] || TONES.teal;
  return (
    <div className={`rounded-spc border ${t.wrap} p-4 flex items-start gap-3`}>
      {Icon && <Icon size={19} className={`${t.icon} flex-shrink-0 mt-0.5`} />}
      <div className="min-w-0">
        <p className="text-spc-h3 font-bold text-spc-ink">{title}</p>
        {children && <div className="text-spc-sm text-spc-body mt-1">{children}</div>}
      </div>
    </div>
  );
}

/** Plain surface card — replaces GlassCard, whose hover lift and pointer
 *  cursor made a form section look like it was clickable. */
export function SectionCard({ dense, children }) {
  return (
    <div className={`rounded-spc bg-spc-surface border border-spc-line ${dense ? 'p-4' : 'p-6'}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ step rail */

/**
 * Only shown when the flow genuinely has two screens (details to fill AND an
 * external company form). A rail for a single-screen flow would be noise.
 */
export function StepRail({ flow, currentStep }) {
  if (!flow) return null;
  const activeIndex = flow.findIndex((s) => s.key === currentStep);

  return (
    <ol className="flex items-center gap-2">
      {flow.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.key} className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 min-w-0 rounded-spc-sm px-2.5 py-1 text-xs font-bold
                ${active ? 'bg-spc-teal text-spc-on-teal' : ''}
                ${done ? 'bg-spc-teal-soft text-spc-teal' : ''}
                ${!active && !done ? 'bg-spc-surface-2 text-spc-muted' : ''}`}
            >
              {done ? <CheckCircle size={13} /> : <span>{index + 1}</span>}
              <span className="truncate">{step.label}</span>
            </span>
            {index < flow.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-0.5 w-4 rounded-full ${done ? 'bg-spc-teal' : 'bg-spc-line'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------------------------------------- blocked */

export function BlockedBody({ readinessData }) {
  const blocking = readinessData?.missing_fields?.filter((f) => f.blocking) || [];

  return (
    <div className="space-y-4">
      <Notice tone="bad" icon={AlertCircle} title="You can't apply for this one">
        Your profile doesn&apos;t meet the eligibility criteria this company has set.
      </Notice>

      {blocking.map((field, index) => (
        <div key={index} className="rounded-spc bg-spc-surface border border-spc-bad/30 p-4">
          <div className="flex items-start gap-2.5">
            <XCircle size={18} className="text-spc-bad flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-spc-h3 font-bold text-spc-ink">{field.label}</p>
              <p className="text-spc-sm text-spc-body mt-1">{field.message}</p>
              {field.current_value && field.required_value && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div>
                    <p className="text-spc-label font-bold uppercase text-spc-muted">Yours</p>
                    <p className="text-spc-sm font-bold text-spc-bad mt-0.5">{field.current_value}</p>
                  </div>
                  <div>
                    <p className="text-spc-label font-bold uppercase text-spc-muted">Required</p>
                    <p className="text-spc-sm font-bold text-spc-ok mt-0.5">{field.required_value}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <p className="text-spc-xs text-spc-muted leading-relaxed">
        These requirements are set by the company and can&apos;t be changed. Have a look at
        the other openings that match your profile.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- collect */

function CustomFieldInput({ field, value, onChange }) {
  const inputClass =
    'w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm ' +
    'border border-spc-control outline-none transition-colors ' +
    'focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25';

  if (field.field_type === 'boolean') {
    return (
      <label
        htmlFor={field.field_name}
        className="flex items-center gap-3 min-h-[48px] px-3.5 rounded-spc-sm bg-spc-surface border border-spc-line-strong cursor-pointer"
      >
        <input
          type="checkbox"
          id={field.field_name}
          checked={value === true || value === 'true' || value === 'yes'}
          onChange={(e) => onChange(field.field_name, e.target.checked ? 'yes' : 'no')}
          className="h-5 w-5 rounded border-spc-line-strong text-spc-teal focus:ring-spc-teal/40"
        />
        <span className="text-spc-sm text-spc-ink font-semibold">Yes</span>
      </label>
    );
  }

  if (field.field_type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(field.field_name, e.target.value)}
        placeholder={field.field_label}
        className={inputClass}
        required={field.required}
      />
    );
  }

  if (field.field_type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(field.field_name, e.target.value)}
        placeholder={field.field_label}
        rows="3"
        className={inputClass}
        required={field.required}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(field.field_name, e.target.value)}
      placeholder={field.field_label}
      className={inputClass}
      required={field.required}
    />
  );
}

export function CollectBody({
  dense,
  hasMissingSections,
  sectionsToShow,
  sectionForms,
  onSectionChange,
  customFields,
  customFieldResponses,
  onCustomFieldChange,
  onGoToExtendedProfile,
}) {
  return (
    <div className={dense ? 'space-y-5' : 'space-y-6'}>
      {hasMissingSections && (
        <>
          <Notice tone="teal" icon={AlertTriangle} title="A few more details needed">
            This job asks for information you haven&apos;t filled in yet. Add it below, or
            open your Extended Profile to fill it in there.
          </Notice>

          <button
            type="button"
            onClick={onGoToExtendedProfile}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
              bg-spc-surface text-spc-teal text-spc-sm font-bold border border-spc-teal/35
              hover:bg-spc-teal-soft transition-colors"
          >
            <ExternalLink size={16} />
            <span>Open my Extended Profile instead</span>
          </button>

          {sectionsToShow.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px flex-1 bg-spc-line" />
                <span className="text-spc-label font-bold uppercase text-spc-muted">
                  Or fill it in here
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-spc-line" />
              </div>

              {sectionsToShow.map((sectionId) => {
                const SectionComponent = getSectionComponent(sectionId);
                if (!SectionComponent) return null;

                return (
                  <SectionCard key={sectionId} dense={dense}>
                    <SectionComponent
                      formData={sectionForms[sectionId] || {}}
                      setFormData={(dataOrUpdater) => onSectionChange(sectionId, dataOrUpdater)}
                      onSave={() => {}} // no individual save inside the apply flow
                      saving={false}
                      isCompleted={false}
                      mode="compact"
                    />
                  </SectionCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {customFields && customFields.length > 0 && (
        <div className={hasMissingSections ? 'pt-5 border-t border-spc-line' : ''}>
          <Notice tone="teal" icon={FileText} title="Questions from the company">
            These are specific to this job.
          </Notice>

          <div className="space-y-4 mt-4">
            {customFields.map((customField, index) => (
              <div key={index}>
                <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
                  {customField.field_label}
                  {customField.required && <span className="text-spc-bad ml-1">*</span>}
                </label>
                <CustomFieldInput
                  field={customField}
                  value={customFieldResponses[customField.field_name] || ''}
                  onChange={onCustomFieldChange}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- external form */

export function ExternalFormBody({
  dense,
  externalFormOpened,
  onOpenExternalForm,
  formCompletionAcknowledged,
  onAcknowledgeChange,
}) {
  const steps = [
    'Open the company’s form using the button below',
    'Fill in everything it asks for',
    'Submit that form',
    'Come back here and tick the box',
  ];

  return (
    <div className={dense ? 'space-y-5' : 'space-y-6'}>
      <Notice tone="warn" icon={AlertTriangle} title="This company has its own form">
        You need to fill in their form before your application here can be submitted.
      </Notice>

      <div className={`rounded-spc bg-spc-surface border border-spc-line ${dense ? 'p-4' : 'p-5'}`}>
        <p className="text-spc-label font-bold uppercase text-spc-muted mb-3">What to do</p>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-spc-teal-soft text-spc-teal text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span className="text-spc-sm text-spc-body">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col items-stretch gap-2.5">
        <button
          type="button"
          onClick={onOpenExternalForm}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
            bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity"
        >
          <ExternalLink size={18} />
          <span>{externalFormOpened ? 'Reopen the form' : 'Open the form'}</span>
        </button>
        {externalFormOpened && (
          <p className="inline-flex items-center justify-center gap-1.5 text-spc-xs font-semibold text-spc-ok">
            <CheckCircle size={15} />
            <span>Opened in a new tab</span>
          </p>
        )}
      </div>

      <label
        className={`block rounded-spc border-2 p-4 cursor-pointer transition-colors ${
          formCompletionAcknowledged
            ? 'border-spc-ok/45 bg-spc-ok-bg'
            : 'border-spc-line-strong bg-spc-surface'
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formCompletionAcknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-spc-line-strong text-spc-ok focus:ring-spc-ok/40"
          />
          <div className="min-w-0">
            <span className="text-spc-sm font-bold text-spc-ink">
              I have completed and submitted the company&apos;s form
            </span>
            <p className="text-spc-xs text-spc-muted mt-1.5 leading-relaxed">
              Ticking this confirms you filled in everything they asked for. Giving false
              information can get your application rejected.
            </p>
          </div>
        </div>
      </label>

      {!formCompletionAcknowledged && (
        <p className="text-spc-xs text-spc-muted">
          Tick the box above once you&apos;ve done it — the submit button unlocks then.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- submit */

export function SubmitBody() {
  return (
    <div className="space-y-4">
      <Notice tone="ok" icon={CheckCircle} title="You're eligible — ready to apply">
        Your profile meets everything this company asked for.
      </Notice>
      <p className="text-spc-sm text-spc-muted">
        Submitting marks you as applied for this job, and it can&apos;t be undone.
      </p>
    </div>
  );
}

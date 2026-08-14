import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import {
  Panel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, SecondaryButton, CheckRow,
} from '../../../components/officer/OfficerUI';
import { FormSection, FieldGrid, RequiredMark } from './jobRequestShared';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../../constants/branches';
import { dateForAge, ageForDate } from '../../../utils/ageCutoff';
import { nowAsLocalInput } from '../../../utils/deadline';
import DeadlineEcho from '../../../components/DeadlineEcho';

/* Bound for the cutoff picker. A cutoff in the future is always a typo — 2026
   typed where 2006 was meant — and the server refuses it either way. */
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * The create-job-request form.
 *
 * Sections are ruled rather than boxed — see FormSection — and the only thing
 * that changes between devices is how many columns each field grid runs.
 *
 * Every field is bound to the same container state and the same handlers as
 * before, so what gets submitted is unchanged. What is new is that each input
 * carries an id, so its label is actually associated with it; none of them did.
 */
export default function JobRequestForm({
  layout,
  formData,
  onFieldChange,
  templates,
  selectedTemplate,
  onApplyTemplate,
  regions,
  collegesByRegion,
  loadingColleges,
  expandedRegions,
  onRegionExpand,
  onCollegeToggle,
  onSelectAllCollegesInRegion,
  onBranchToggle,
  requireJobApproval,
  extendedSections,
  onSubmit,
  onCancel,
  children,
}) {
  const cols = layout === 'mobile' ? 1 : layout === 'tablet' ? 2 : 3;
  const pairCols = layout === 'mobile' ? 1 : 2;
  const set = (key, value) => onFieldChange({ ...formData, [key]: value });

  return (
    <form onSubmit={onSubmit} className="px-5 py-4">
      {templates.length > 0 && (
        <FormSection title="Quick start" hint="Apply a saved requirement template, then adjust.">
          <select
            id="jr-template"
            aria-label="Apply a requirement template"
            className={FIELD_CLASS}
            value={selectedTemplate}
            onChange={(e) => onApplyTemplate(e.target.value)}
          >
            <option value="">No template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.template_name || t.name}</option>
            ))}
          </select>
        </FormSection>
      )}

      <FormSection title="Basic information">
        <FieldGrid columns={pairCols}>
          <div className="min-w-0">
            <FieldLabel htmlFor="jr-title">Job title <RequiredMark /></FieldLabel>
            <input id="jr-title" type="text" required className={FIELD_CLASS}
              value={formData.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Software Engineer" />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="jr-company">Company name <RequiredMark /></FieldLabel>
            <input id="jr-company" type="text" required className={FIELD_CLASS}
              value={formData.company_name} onChange={(e) => set('company_name', e.target.value)}
              placeholder="e.g. Google" />
          </div>
        </FieldGrid>

        <div className="mt-4">
          <FieldLabel htmlFor="jr-description">Job description <RequiredMark /></FieldLabel>
          <textarea id="jr-description" rows="4" required className={`${FIELD_CLASS} py-2 h-auto`}
            value={formData.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Role, responsibilities and what the company is looking for…" />
        </div>

        <div className="mt-4">
          <FieldGrid columns={cols}>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-location">Location</FieldLabel>
              <input id="jr-location" type="text" className={FIELD_CLASS}
                value={formData.location} onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Kochi" />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-package">Salary package</FieldLabel>
              <input id="jr-package" type="text" className={FIELD_CLASS}
                value={formData.salary_package} onChange={(e) => set('salary_package', e.target.value)}
                placeholder="e.g. 12-15 LPA" />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-vacancies">No. of vacancies</FieldLabel>
              <input id="jr-vacancies" type="number" min="1" className={FIELD_CLASS}
                value={formData.no_of_vacancies} onChange={(e) => set('no_of_vacancies', e.target.value)}
                placeholder="e.g. 10" />
            </div>
          </FieldGrid>
        </div>

        <div className="mt-4">
          <FieldGrid columns={pairCols}>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-deadline">Application deadline <RequiredMark /></FieldLabel>
              {/* A past deadline creates a job no student can see — the list only
                  returns rows closing today or later. Blocked here and again on
                  submit and on the server. */}
              <input id="jr-deadline" type="datetime-local" required className={FIELD_CLASS}
                min={nowAsLocalInput()}
                value={formData.application_deadline}
                onChange={(e) => set('application_deadline', e.target.value)} />
              {/* The clock note and the spelled-out deadline live in DeadlineEcho,
                  which every deadline field shares. A separate hint here said the
                  same thing a third time. */}
              <DeadlineEcho value={formData.application_deadline} variant="officer" />
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-form-url">Application form URL</FieldLabel>
              <input id="jr-form-url" type="url" className={FIELD_CLASS}
                value={formData.application_form_url}
                onChange={(e) => set('application_form_url', e.target.value)}
                placeholder="https://forms.google.com/… (optional)" />
            </div>
          </FieldGrid>
        </div>
      </FormSection>

      <FormSection title="Eligibility">
        <FieldGrid columns={pairCols}>
          <div className="min-w-0">
            <FieldLabel htmlFor="jr-cgpa">Minimum CGPA</FieldLabel>
            <input id="jr-cgpa" type="number" min="0" max="10" step="0.1" className={FIELD_CLASS}
              value={formData.min_cgpa} onChange={(e) => set('min_cgpa', e.target.value)}
              placeholder="e.g. 7.0" />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="jr-backlog-policy">Backlog policy</FieldLabel>
            <select
              id="jr-backlog-policy"
              className={FIELD_CLASS}
              value={formData.backlog_policy}
              onChange={(e) => {
                const policy = e.target.value;
                if (policy === 'no_restriction') {
                  onFieldChange({ ...formData, backlog_policy: policy, max_backlogs: '', allowed_backlog_semesters: [] });
                } else if (policy === 'no_backlogs') {
                  onFieldChange({ ...formData, backlog_policy: policy, max_backlogs: '0', allowed_backlog_semesters: [] });
                } else {
                  onFieldChange({ ...formData, backlog_policy: policy, max_backlogs: formData.max_backlogs || '1', allowed_backlog_semesters: [] });
                }
              }}
            >
              <option value="no_restriction">No restriction</option>
              <option value="no_backlogs">No backlogs allowed</option>
              <option value="limited">Allow limited backlogs</option>
            </select>
          </div>
        </FieldGrid>

        {/*
          Dates are what get saved, because a date names one fixed set of
          students and an age in years does not — "18 or over" admits somebody
          new every day as birthdays pass, so a list exported at the start of a
          drive would be wrong by the end.

          But a company states the requirement three ways: on or before, on or
          after, or a plain minimum age. The age boxes convert, so an officer
          handed "minimum 18" never works the date out themselves, and can see
          and correct whatever it produced.
        */}
        <div className="mt-5">
          <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Age / date of birth
          </p>
          <FieldGrid columns={pairCols}>
            <div className="min-w-0">
              <FieldLabel htmlFor="jr-dob-before">Born on or before</FieldLabel>
              <input
                id="jr-dob-before" type="date" max={TODAY} className={FIELD_CLASS}
                value={formData.dob_on_or_before || ''}
                onChange={(e) => set('dob_on_or_before', e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="jr-min-age" className="text-xs text-spc-muted whitespace-nowrap">
                  or minimum age
                </label>
                <input
                  id="jr-min-age" type="number" min="1" max="99"
                  className={`${FIELD_CLASS} w-20`} placeholder="18"
                  value={ageForDate(formData.dob_on_or_before) ?? ''}
                  onChange={(e) => set('dob_on_or_before', dateForAge(e.target.value))}
                />
                <span className="text-xs text-spc-muted">years</span>
              </div>
              <p className="mt-1 text-xs text-spc-muted">
                The older end. Leave both blank for no minimum age.
              </p>
            </div>

            <div className="min-w-0">
              <FieldLabel htmlFor="jr-dob-after">Born on or after</FieldLabel>
              <input
                id="jr-dob-after" type="date" max={TODAY} className={FIELD_CLASS}
                value={formData.dob_on_or_after || ''}
                onChange={(e) => set('dob_on_or_after', e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="jr-max-age" className="text-xs text-spc-muted whitespace-nowrap">
                  or maximum age
                </label>
                <input
                  id="jr-max-age" type="number" min="1" max="99"
                  className={`${FIELD_CLASS} w-20`} placeholder="25"
                  value={ageForDate(formData.dob_on_or_after) ?? ''}
                  onChange={(e) => set('dob_on_or_after', dateForAge(e.target.value))}
                />
                <span className="text-xs text-spc-muted">years</span>
              </div>
              <p className="mt-1 text-xs text-spc-muted">
                The younger end. Leave both blank for no maximum age.
              </p>
            </div>
          </FieldGrid>

          {/* Said before the server has to say it. Both ends set the wrong way
              round admits nobody at all. */}
          {formData.dob_on_or_before && formData.dob_on_or_after
            && formData.dob_on_or_after > formData.dob_on_or_before && (
            <p className="mt-2 text-spc-xs font-bold text-spc-bad">
              These are back to front — &ldquo;on or after&rdquo; must be the earlier date.
              As set, no student can qualify.
            </p>
          )}
        </div>

        <FieldGrid columns={pairCols} className="mt-4">
          <div className="min-w-0">
            <FieldLabel htmlFor="jr-gender">Open to</FieldLabel>
            <select
              id="jr-gender"
              className={FIELD_CLASS}
              value={formData.gender_requirement || 'all'}
              onChange={(e) => set('gender_requirement', e.target.value)}
            >
              <option value="all">All candidates</option>
              <option value="male">Male candidates only</option>
              <option value="female">Female candidates only</option>
            </select>
            <p className="mt-1 text-xs text-spc-muted">
              {formData.gender_requirement === 'male' || formData.gender_requirement === 'female'
                ? `Only students recorded as ${formData.gender_requirement} will be able to apply.`
                : 'Optional. Restrict only when the company has asked for it.'}
            </p>
          </div>
        </FieldGrid>

        {formData.backlog_policy === 'limited' && (
          <div className="mt-4">
            <FieldLabel htmlFor="jr-max-backlogs">Maximum backlogs allowed</FieldLabel>
            <select id="jr-max-backlogs" className={FIELD_CLASS}
              value={formData.max_backlogs} onChange={(e) => set('max_backlogs', e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>

            <fieldset className="mt-4">
              <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
                Allowed backlog semesters
                <span className="ml-2 font-semibold normal-case tracking-normal">
                  (leave unchecked for any)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((sem) => (
                  <label key={sem}
                    className="flex items-center gap-2 min-h-[44px] px-3 rounded-spc-control
                      border border-spc-control bg-spc-surface-2 cursor-pointer
                      hover:bg-spc-surface-3 transition-colors">
                    <input type="checkbox" className={CHECKBOX_CLASS}
                      checked={formData.allowed_backlog_semesters.includes(sem)}
                      onChange={() => {
                        const cur = formData.allowed_backlog_semesters;
                        set('allowed_backlog_semesters',
                          cur.includes(sem) ? cur.filter((s) => s !== sem) : [...cur, sem].sort((a, b) => a - b));
                      }} />
                    <span className="text-spc-xs font-bold text-spc-ink">Sem {sem}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        <fieldset className="mt-4">
          <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Allowed branches <RequiredMark />
          </legend>
          <div className={`grid ${pairCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-3
            max-h-64 overflow-y-auto spc-scroll-contain border border-spc-line rounded-spc-control px-3`}>
            {KERALA_POLYTECHNIC_BRANCHES.map((branch) => (
              <label key={branch} className="flex items-center gap-2 min-h-[40px] cursor-pointer min-w-0">
                <input type="checkbox" className={CHECKBOX_CLASS}
                  checked={formData.allowed_branches.includes(branch)}
                  onChange={() => onBranchToggle(branch)} />
                <span className="text-xs text-spc-body truncate">{branch}</span>
              </label>
            ))}
          </div>
          {formData.allowed_branches.length === 0 && (
            <p className="text-xs text-spc-bad font-bold mt-1">Select at least one branch.</p>
          )}
        </fieldset>
      </FormSection>

      <FormSection title="Who can see this">
        <fieldset>
          <legend className="sr-only">Target audience</legend>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                value: 'college',
                label: 'My college only',
                note: requireJobApproval
                  ? 'Goes to the Super Admin for approval.'
                  : 'Published to your students immediately. No approval needed.',
              },
              { value: 'region', label: 'Choose regions and colleges', note: 'Goes to the Super Admin for approval.' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-spc-control border cursor-pointer transition-colors
                  ${formData.target_type === option.value
                    ? 'border-spc-accent bg-spc-accent-soft'
                    : 'border-spc-control bg-spc-surface-2 hover:bg-spc-surface-3'}`}
              >
                <input
                  type="radio"
                  name="target_type"
                  value={option.value}
                  checked={formData.target_type === option.value}
                  onChange={(e) =>
                    onFieldChange({ ...formData, target_type: e.target.value, target_regions: [], target_colleges: [] })
                  }
                  className={`${CHECKBOX_CLASS} mt-0.5`}
                />
                <span className="min-w-0">
                  <span className="block text-spc-xs font-bold text-spc-ink">{option.label}</span>
                  <span className="block text-xs text-spc-muted mt-0.5">{option.note}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {formData.target_type !== 'college' && (
          <div className="mt-4">
            <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
              Regions and colleges
            </p>
            <Panel>
              {regions.length === 0 ? (
                <p className="px-4 py-6 text-spc-xs text-spc-muted text-center">No regions available.</p>
              ) : (
                regions.map((region, i) => {
                  const regionColleges = collegesByRegion[region.id] || [];
                  const selectedHere = formData.target_colleges.filter((cId) =>
                    regionColleges.some((c) => c.id === cId)
                  );
                  const allSelected =
                    regionColleges.length > 0 && selectedHere.length === regionColleges.length;
                  const expanded = expandedRegions[region.id];

                  return (
                    <div key={region.id} className={i > 0 ? 'border-t border-spc-line' : ''}>
                      <div className="flex items-center justify-between gap-2 pr-3">
                        <button
                          type="button"
                          onClick={() => onRegionExpand(region.id)}
                          aria-expanded={Boolean(expanded)}
                          className="flex items-center gap-2 flex-1 min-w-0 px-4 py-3 min-h-[52px] text-left
                            hover:bg-spc-surface-2 transition-colors"
                        >
                          {expanded
                            ? <ChevronDown size={16} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
                            : <ChevronRight size={16} className="text-spc-muted flex-shrink-0" aria-hidden="true" />}
                          <MapPin size={14} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
                          <span className="text-spc-xs font-bold text-spc-ink truncate">
                            {region.region_name || region.name}
                          </span>
                          {selectedHere.length > 0 && (
                            <span className="text-xs text-spc-muted tabular-nums flex-shrink-0">
                              {selectedHere.length} selected
                            </span>
                          )}
                        </button>
                        {expanded && regionColleges.length > 0 && (
                          <SecondaryButton
                            className="min-h-[36px] px-2 flex-shrink-0"
                            onClick={() => onSelectAllCollegesInRegion(region.id, !allSelected)}
                          >
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </SecondaryButton>
                        )}
                      </div>

                      {expanded && (
                        <div className="border-t border-spc-line px-4 py-2">
                          {loadingColleges[region.id] ? (
                            <p className="py-3 text-xs text-spc-muted">Loading colleges…</p>
                          ) : regionColleges.length === 0 ? (
                            <p className="py-3 text-xs text-spc-muted">No colleges in this region.</p>
                          ) : (
                            <div className={`grid ${pairCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}
                              gap-x-3 ${layout === 'mobile' ? '' : 'max-h-56 overflow-y-auto spc-scroll-contain'}`}>
                              {/*
                                Two changes here.

                                The college code used to sit under each name —
                                GPC_CHK, MPC_KZM. It is an internal slug: it
                                identifies nothing an officer needs, because
                                every active college name is already distinct,
                                and it cost a second line on every row in a list
                                that scrolls. The name alone is the choice being
                                made here.

                                And the box caps and scrolls on desktop and
                                tablet, where a dozen colleges under an expanded
                                region would push the rest of the form off
                                screen — but not on a phone, where this already
                                sits inside a dialog that scrolls, and a
                                scrolling box inside a scrolling dialog gives a
                                thumb two things it might move with nothing on
                                screen saying which.
                              */}
                              {regionColleges.map((college) => (
                                <label key={college.id}
                                  className="flex items-center gap-2.5 min-h-[44px] cursor-pointer min-w-0">
                                  <input type="checkbox" className={CHECKBOX_CLASS}
                                    checked={formData.target_colleges.includes(college.id)}
                                    onChange={() => onCollegeToggle(college.id, region.id)} />
                                  <span className="text-xs text-spc-body min-w-0 break-words">
                                    {college.college_name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </Panel>
            {formData.target_colleges.length > 0 && (
              <p className="text-xs text-spc-muted mt-2">
                <span className="tabular-nums font-bold text-spc-ink">
                  {formData.target_colleges.length}
                </span>{' '}
                college(s) selected
              </p>
            )}

            {/*
              Only shown on a multi-college request, which is the only kind that
              has other colleges to tell. The notice itself is not optional —
              every included college is told in their portal when the Super
              Admin approves this — so the choice is worded as the extra email
              rather than as whether to notify at all, which is what it is.
            */}
            <div className="mt-4 pt-4 border-t border-spc-line">
              <CheckRow
                checked={Boolean(formData.notify_by_email)}
                onChange={(e) => set('notify_by_email', e.target.checked)}
              >
                Also email the other colleges&rsquo; officers
              </CheckRow>
              <p className="text-xs text-spc-muted mt-1 ml-7">
                They are notified in the portal either way once this is approved.
              </p>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection
        title="What students must complete"
        hint="Sections a student has to fill in before they can apply."
      >
        <div className={`grid ${pairCols === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4`}>
          {extendedSections.map((section) => (
            <CheckRow
              key={section.key}
              checked={Boolean(formData[section.key])}
              onChange={(e) => set(section.key, e.target.checked)}
            >
              {section.label}
            </CheckRow>
          ))}
        </div>
        {/* Specific-field and custom-field editors are passed through from the
            container, which still owns their handlers. */}
        {children}
      </FormSection>

      <div className="flex items-center justify-end gap-2 flex-wrap pt-5 mt-5 border-t border-spc-line">
        <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4
            rounded-spc-control text-spc-xs font-bold bg-spc-accent text-spc-on-accent
            hover:opacity-95 transition-colors"
        >
          Submit request
        </button>
      </div>
    </form>
  );
}

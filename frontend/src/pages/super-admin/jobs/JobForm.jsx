import { ArrowLeft, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../../constants/branches';
import { dateForAge, ageForDate } from '../../../utils/ageCutoff';
import DeadlineEcho from '../../../components/DeadlineEcho';
import { PROFILE_SECTIONS } from './jobsShared';
import TargetPicker from './TargetPicker';
import AdvancedConfig from './AdvancedConfig';

/**
 * Posting a job, as a page.
 *
 * It was a dialog, and it is the largest form in the product: a company and a
 * deadline, an eligibility rule with four different shapes, thirty branches, a
 * sixty-college audience, six profile sections and any number of the company's
 * own questions. None of that belongs behind a scrim, least of all on a phone.
 *
 * The order is the order the decisions get made in — what the job is, who can
 * apply, who it reaches, what they must have filled in — with the rarely-used
 * configuration last and folded away.
 */
export default function JobForm(p) {
  const { layout, formData, set, eligibilityLocked, editApplicantCount, editMode } = p;
  const today = new Date().toISOString().slice(0, 10);
  const twoUp = layout === 'desktop' ? 'sm:grid-cols-2' : '';

  return (
    <form onSubmit={p.onSubmit}>
      <div className="mb-3">
        <Link
          to="/super-admin/jobs"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
            text-spc-accent hover:underline"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to jobs
        </Link>
      </div>

      <PageHeading
        eyebrow="Jobs"
        title={editMode ? 'Edit job' : 'New job'}
        subline={editMode
          ? formData.title || 'Change what this drive asks for'
          : 'What the drive is, who can apply, and who sees it'}
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      {/* ------------------------------------------------------- a template */}
      {!editMode && p.templates.length > 0 && (
        <Panel className="p-4 mb-4">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={13} aria-hidden="true" />
              Start from a template
            </span>
          </SectionLabel>
          <div className="max-w-md">
            <select
              id="job-template"
              className={FIELD_CLASS}
              value={p.selectedTemplate}
              onChange={(e) => p.onApplyTemplate(e.target.value)}
              aria-label="Apply a requirement template"
            >
              <option value="">No template</option>
              {p.templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </div>
          <p className="text-spc-xs text-spc-body mt-2">
            Fills in the eligibility and profile requirements below. Everything stays editable
            afterwards.
          </p>
        </Panel>
      )}

      {/* ---------------------------------------------------------- the job */}
      <Panel className="mb-4">
        <PanelHeading>The job</PanelHeading>
        <div className="p-4 space-y-4">
          <div className={`grid grid-cols-1 ${twoUp} gap-3`}>
            <div>
              <FieldLabel htmlFor="job-title">Job title *</FieldLabel>
              <input id="job-title" type="text" className={FIELD_CLASS}
                value={formData.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Graduate Engineer Trainee" required />
            </div>
            <div>
              <FieldLabel htmlFor="job-company">Company *</FieldLabel>
              <input id="job-company" type="text" className={FIELD_CLASS}
                value={formData.company_name}
                onChange={(e) => set({ company_name: e.target.value })}
                placeholder="Who is hiring" required />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="job-description">Description *</FieldLabel>
            <textarea id="job-description" rows="4" className={FIELD_CLASS}
              value={formData.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="What the role is, and anything a student should know before applying"
              required />
          </div>

          <div className={`grid grid-cols-1 ${twoUp} gap-3`}>
            <div>
              <FieldLabel htmlFor="job-location">Location</FieldLabel>
              <input id="job-location" type="text" className={FIELD_CLASS}
                value={formData.location}
                onChange={(e) => set({ location: e.target.value })}
                placeholder="e.g. Kochi" />
            </div>
            <div>
              <FieldLabel htmlFor="job-package">Package (LPA)</FieldLabel>
              <input id="job-package" type="text" className={FIELD_CLASS}
                value={formData.salary_package}
                onChange={(e) => set({ salary_package: e.target.value })}
                placeholder="e.g. 4.5" />
            </div>
            <div>
              <FieldLabel htmlFor="job-vacancies">Vacancies</FieldLabel>
              <input id="job-vacancies" type="number" className={FIELD_CLASS}
                value={formData.no_of_vacancies}
                onChange={(e) => set({ no_of_vacancies: e.target.value })}
                placeholder="e.g. 12" />
            </div>
            <div>
              <FieldLabel htmlFor="job-deadline">Applications close *</FieldLabel>
              <input id="job-deadline" type="datetime-local" className={FIELD_CLASS}
                value={formData.application_deadline}
                onChange={(e) => set({ application_deadline: e.target.value })}
                required />
              <DeadlineEcho value={formData.application_deadline} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="job-form-url">The company&apos;s own form</FieldLabel>
            <input id="job-form-url" type="url" className={FIELD_CLASS}
              value={formData.application_form_url}
              onChange={(e) => set({ application_form_url: e.target.value })}
              placeholder="https://forms.gle/…" />
            <p className="text-spc-xs text-spc-body mt-1.5">
              Optional. Shown to students alongside the application on this portal.
            </p>
          </div>
        </div>
      </Panel>

      {/* -------------------------------------------------------- who can apply */}
      <Panel className="mb-4">
        <PanelHeading>
          Who can apply
          {eligibilityLocked && (
            <span className="ml-2 text-spc-xs font-normal text-spc-warn">
              — can be relaxed, not tightened
            </span>
          )}
        </PanelHeading>

        <div className="p-4 space-y-4">
          {eligibilityLocked && (
            <p className="text-spc-xs text-spc-ink font-semibold p-3 rounded-spc-admin
              bg-spc-warn-bg border border-spc-warn/40">
              {editApplicantCount} student{editApplicantCount === 1 ? ' has' : 's have'} already
              applied. You can still relax these — a lower CGPA, more backlogs, a wider age range,
              opening it to all genders — but not tighten them, because those students applied
              under the current rules. The server is what enforces that, field by field, which is
              why nothing here is greyed out: a blanket lock would block the relaxations too.
            </p>
          )}

          <div className={`grid grid-cols-1 ${twoUp} gap-3`}>
            <div>
              <FieldLabel htmlFor="job-cgpa">Minimum CGPA</FieldLabel>
              <input id="job-cgpa" type="number" min="0" max="10" step="0.01"
                className={FIELD_CLASS}
                value={formData.min_cgpa}
                onChange={(e) => set({ min_cgpa: e.target.value })}
                placeholder="e.g. 7.0" />
            </div>

            <div>
              <FieldLabel htmlFor="job-gender">Open to</FieldLabel>
              <select id="job-gender" className={FIELD_CLASS}
                value={formData.gender_requirement}
                onChange={(e) => set({ gender_requirement: e.target.value })}>
                <option value="all">All candidates</option>
                <option value="male">Male candidates only</option>
                <option value="female">Female candidates only</option>
              </select>
              {formData.gender_requirement !== 'all' && (
                <p className="text-spc-xs text-spc-body mt-1.5">
                  Only students recorded as {formData.gender_requirement} will be able to apply.
                </p>
              )}
            </div>

            {/*
              A cutoff date rather than an age in years: it is how a company
              words the requirement, and it names one fixed set of students
              instead of one that changes as birthdays pass during the drive.
              The age box is a second way to type the same date.
            */}
            <div>
              <FieldLabel htmlFor="job-dob-before">Born on or before</FieldLabel>
              <input id="job-dob-before" type="date" max={today} className={FIELD_CLASS}
                value={formData.dob_on_or_before}
                onChange={(e) => set({ dob_on_or_before: e.target.value })} />
              <div className="flex items-center gap-2 mt-2">
                <label htmlFor="job-age-min" className="text-spc-xs text-spc-body whitespace-nowrap">
                  or minimum age
                </label>
                <input id="job-age-min" type="number" min="1" max="99"
                  className={`${FIELD_CLASS} w-20`} placeholder="18"
                  value={ageForDate(formData.dob_on_or_before) ?? ''}
                  onChange={(e) => set({ dob_on_or_before: dateForAge(e.target.value) })} />
                <span className="text-spc-xs text-spc-body">years</span>
              </div>
              <p className="text-spc-xs text-spc-body mt-1.5">The older end. Optional.</p>
            </div>

            <div>
              <FieldLabel htmlFor="job-dob-after">Born on or after</FieldLabel>
              <input id="job-dob-after" type="date" max={today} className={FIELD_CLASS}
                value={formData.dob_on_or_after}
                onChange={(e) => set({ dob_on_or_after: e.target.value })} />
              <div className="flex items-center gap-2 mt-2">
                <label htmlFor="job-age-max" className="text-spc-xs text-spc-body whitespace-nowrap">
                  or maximum age
                </label>
                <input id="job-age-max" type="number" min="1" max="99"
                  className={`${FIELD_CLASS} w-20`} placeholder="25"
                  value={ageForDate(formData.dob_on_or_after) ?? ''}
                  onChange={(e) => set({ dob_on_or_after: dateForAge(e.target.value) })} />
                <span className="text-spc-xs text-spc-body">years</span>
              </div>
              <p className="text-spc-xs text-spc-body mt-1.5">The younger end. Optional.</p>
            </div>
          </div>

          {/* --------------------------------------------------------- backlogs */}
          <div>
            <FieldLabel htmlFor="job-backlog-policy">Backlogs</FieldLabel>
            <select id="job-backlog-policy" className={`${FIELD_CLASS} max-w-md`}
              value={formData.backlog_policy}
              onChange={(e) => p.onBacklogPolicy(e.target.value)}>
              <option value="no_restriction">No restriction</option>
              <option value="no_backlogs">None allowed</option>
              <option value="limited">Allow a limited number</option>
            </select>
          </div>

          {formData.backlog_policy === 'limited' && (
            <div className="space-y-3 p-3 rounded-spc-admin bg-spc-surface-2
              border border-spc-line-strong">
              <div className="max-w-xs">
                <FieldLabel htmlFor="job-max-backlogs">At most</FieldLabel>
                <select id="job-max-backlogs" className={FIELD_CLASS}
                  value={formData.max_backlogs}
                  onChange={(e) => set({ max_backlogs: e.target.value })}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Only in these semesters</FieldLabel>
                <p className="text-spc-xs text-spc-body mb-2">
                  Ticking a semester <span className="font-bold text-spc-ink">narrows</span> the
                  job: a student with a backlog in any semester you do not tick becomes ineligible.
                  Leave all unticked to accept a backlog in any semester.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <label key={sem}
                      className={`flex items-center gap-2 px-3 min-h-[44px] rounded-spc-admin-sm
                        border cursor-pointer transition-colors
                        ${formData.allowed_backlog_semesters.includes(sem)
                          ? 'bg-spc-selected border-spc-accent'
                          : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}>
                      <input
                        type="checkbox"
                        checked={formData.allowed_backlog_semesters.includes(sem)}
                        onChange={() => p.onBacklogSemesterToggle(sem)}
                        className={`${CHECKBOX_CLASS} flex-shrink-0`}
                      />
                      <span className="text-spc-xs font-bold text-spc-ink">Sem {sem}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------- branches */}
          {/*
            Branches are the one part of eligibility that still opens up after
            people apply: adding one lets more students in and moves nobody who
            already applied, while removing one strands whoever applied from it.
            So the ones already on the job are fixed and the rest stay tickable.
          */}
          <div>
            <FieldLabel>
              Branches *
              {eligibilityLocked && (
                <span className="ml-2 font-normal normal-case text-spc-warn">
                  — can only be added to
                </span>
              )}
            </FieldLabel>
            {eligibilityLocked && (
              <p className="text-spc-xs text-spc-body mb-2">
                Branches already on the job are fixed — tick any others you want to add.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-56
              overflow-y-auto border border-spc-line-strong rounded-spc-admin-sm p-1">
              {KERALA_POLYTECHNIC_BRANCHES.map((branch) => {
                const locked = eligibilityLocked && p.lockedBranches.includes(branch);
                return (
                  <label key={branch}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded-spc-admin-sm cursor-pointer
                      ${formData.allowed_branches.includes(branch)
                        ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                    <input
                      type="checkbox"
                      checked={formData.allowed_branches.includes(branch)}
                      onChange={() => p.onBranchToggle(branch)}
                      disabled={locked}
                      className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0
                        disabled:opacity-60 disabled:cursor-not-allowed`}
                    />
                    <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                      {branch}
                      {locked && <span className="text-spc-body"> (already on the job)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------------------ reaches */}
      <Panel className="mb-4">
        <PanelHeading>Who sees it</PanelHeading>
        <div className="p-4">
          <TargetPicker
            formData={formData}
            regions={p.regions}
            collegesByRegion={p.collegesByRegion}
            expandedRegions={p.expandedRegions}
            onToggleRegion={p.onToggleRegion}
            onTargetChange={p.onTargetChange}
            onSelectAllInRegion={p.onSelectAllInRegion}
            onAllCollegesChange={p.onAllCollegesChange}
            targetLocked={p.targetLocked}
            lockedAllColleges={p.lockedAllColleges}
            eligibilityLocked={eligibilityLocked}
          />
        </div>
      </Panel>

      {/* ------------------------------------------------------- requirements */}
      <Panel className="mb-4">
        <PanelHeading>What they must have filled in</PanelHeading>
        <div className="p-4">
          <p className="text-spc-xs text-spc-body mb-3">
            A student who has not completed a ticked section cannot apply, so tick only what the
            company actually asked for.
          </p>
          <div className="space-y-1">
            {PROFILE_SECTIONS.map(([key, label, hint]) => (
              <label key={key}
                className={`flex items-start gap-3 p-2.5 rounded-spc-admin-sm cursor-pointer
                  ${formData[key] ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                <input
                  type="checkbox"
                  checked={formData[key]}
                  onChange={(e) => set({ [key]: e.target.checked })}
                  className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0`}
                />
                <span className="min-w-0">
                  <span className="block text-spc-sm font-semibold text-spc-ink">{label}</span>
                  <span className="block text-spc-xs text-spc-body">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Panel>

      {/* ----------------------------------------------------------- advanced */}
      <Panel className="mb-4">
        <button
          type="button"
          onClick={p.onToggleAdvanced}
          aria-expanded={p.showAdvanced}
          className="w-full flex items-center justify-between gap-3 px-4 py-3
            border-b border-spc-line hover:bg-spc-surface-2 transition-colors"
        >
          <span className="text-spc-sm font-bold text-spc-ink">
            Figures and the company&apos;s own questions
          </span>
          <span className="flex items-center gap-1.5 text-spc-xs font-bold text-spc-body">
            {p.showAdvanced ? 'Hide' : 'Show'}
            {p.showAdvanced
              ? <ChevronDown size={15} aria-hidden="true" />
              : <ChevronRight size={15} aria-hidden="true" />}
          </span>
        </button>
        {p.showAdvanced && (
          <div className="p-4">
            <AdvancedConfig
              formData={formData}
              onSpecificFieldChange={p.onSpecificFieldChange}
              onAddCustomField={p.onAddCustomField}
              onRemoveCustomField={p.onRemoveCustomField}
            />
          </div>
        )}
      </Panel>

      {/* ------------------------------------------------------------ actions */}
      <Panel className="p-4 flex items-center justify-end gap-2 flex-wrap">
        <SecondaryButton onClick={p.onCancel} disabled={p.submitting}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={p.submitting}>
          {p.submitting ? 'Saving…' : editMode ? 'Save changes' : 'Post the job'}
        </PrimaryButton>
      </Panel>
    </form>
  );
}

import {
  ChevronDown,
  Plus,
  Trash2,
  X,
  Target,
  MapPin,
  Code,
  BookOpen,
  Briefcase,
  Award,
  Users,
  FileText,
  Download,
  Edit,
  Save,
  AlertCircle,
} from 'lucide-react';

/**
 * The resume builder's sections, shared by all three device presenters.
 *
 * Shared rather than duplicated: nine sections each with a view mode and an
 * edit mode, several of them repeating lists. Writing that three times would be
 * three places for the add/remove wiring to go wrong.
 */

const controlClass =
  `w-full min-h-[48px] px-3.5 py-2.5 rounded-spc-sm bg-spc-surface text-spc-ink text-spc-sm
   border border-spc-line-strong outline-none transition-colors
   focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25`;

function Input(props) {
  return <input {...props} className={controlClass} />;
}

function Area(props) {
  return <textarea {...props} className={`${controlClass} resize-y`} />;
}

/* ------------------------------------------------------------- collapsible */

export function Collapsible({ id, title, icon: Icon, open, onToggle, filled, children }) {
  return (
    <section className="rounded-spc bg-spc-surface border border-spc-line overflow-hidden">
      <h3>
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          aria-controls={`resume-${id}`}
          className="w-full flex items-center gap-3 min-h-[60px] px-4 text-left hover:bg-spc-surface-2 transition-colors"
        >
          {/* Fixed 32px icon box keeps every title on the same vertical line. */}
          <span className="w-8 h-8 rounded-spc-sm bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-spc-teal" />
          </span>
          <span className="flex-1 text-spc-h3 font-bold text-spc-ink">{title}</span>
          {filled !== undefined && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-spc-sm flex-shrink-0
                ${filled ? 'bg-spc-ok-bg text-spc-ok' : 'bg-spc-surface-2 text-spc-muted'}`}
            >
              {filled ? 'Added' : 'Empty'}
            </span>
          )}
          <ChevronDown
            size={19}
            className={`text-spc-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      {open && (
        <div id={`resume-${id}`} className="px-4 pb-4 pt-1 border-t border-spc-line">
          {children}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- chip list */

function ChipList({ label, items, editMode, onRemove, onAdd, value, onValueChange, placeholder }) {
  const commit = () => {
    onAdd(value);
    onValueChange('');
  };

  return (
    <div>
      <p className="text-spc-label font-bold uppercase text-spc-muted mb-2">{label}</p>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1.5"
            >
              {item}
              {editMode && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${item}`}
                  className="hover:text-spc-bad transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        !editMode && <p className="text-spc-xs text-spc-muted mb-3">None added.</p>
      )}

      {editMode && (
        <div className="flex gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
          />
          <button
            type="button"
            onClick={commit}
            aria-label={`Add ${label.toLowerCase()}`}
            className="flex-shrink-0 w-12 min-h-[48px] rounded-spc-sm bg-spc-teal text-spc-on-teal
              flex items-center justify-center hover:opacity-95 transition-opacity"
          >
            <Plus size={19} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- repeater */

/**
 * A repeating list of objects — projects, experience, certifications,
 * achievements. `fields` drives both the editor and the read view.
 */
function Repeater({ items, editMode, fields, onAdd, onUpdate, onRemove, addLabel, emptyLabel }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-spc-sm bg-spc-surface-2 p-4">
          {editMode ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove entry ${index + 1}`}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-spc-sm
                    text-xs font-bold text-spc-muted hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              </div>
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-spc-label font-bold uppercase text-spc-muted mb-1.5">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <Area
                      value={item[field.key] || ''}
                      onChange={(e) => onUpdate(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={item[field.key] || ''}
                      onChange={(e) => onUpdate(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-spc-h3 font-bold text-spc-ink break-words">
                {item[fields[0].key] || 'Untitled'}
              </p>
              {fields.slice(1).map((field) =>
                item[field.key] ? (
                  <p key={field.key} className="text-spc-xs text-spc-body mt-1 break-words whitespace-pre-wrap">
                    <span className="font-semibold text-spc-muted">{field.label}: </span>
                    {item[field.key]}
                  </p>
                ) : null
              )}
            </div>
          )}
        </div>
      ))}

      {editMode && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full min-h-[48px] rounded-spc-sm border border-dashed border-spc-line-strong
            text-spc-xs font-bold text-spc-body hover:bg-spc-surface-2 transition-colors
            flex items-center justify-center gap-2"
        >
          <Plus size={17} />
          {addLabel}
        </button>
      )}

      {!editMode && items.length === 0 && (
        <p className="text-spc-xs text-spc-muted">{emptyLabel}</p>
      )}
    </div>
  );
}

const PROJECT_FIELDS = [
  { key: 'title', label: 'Title', placeholder: 'Project name' },
  { key: 'description', label: 'Description', placeholder: 'What it does and what you built', type: 'textarea' },
  { key: 'technologies', label: 'Technologies', placeholder: 'e.g. React, Node.js, PostgreSQL' },
  { key: 'duration', label: 'Duration', placeholder: 'e.g. Jan 2026 – Apr 2026' },
];

const EXPERIENCE_FIELDS = [
  { key: 'company', label: 'Company', placeholder: 'Organisation name' },
  { key: 'role', label: 'Role', placeholder: 'e.g. Software Intern' },
  { key: 'duration', label: 'Duration', placeholder: 'e.g. Jun 2026 – Aug 2026' },
  { key: 'description', label: 'Description', placeholder: 'What you worked on', type: 'textarea' },
];

const CERTIFICATION_FIELDS = [
  { key: 'name', label: 'Certificate', placeholder: 'Certificate name' },
  { key: 'issuer', label: 'Issued by', placeholder: 'Issuing organisation' },
  { key: 'year', label: 'Year', placeholder: 'e.g. 2026' },
];

const ACHIEVEMENT_FIELDS = [
  { key: 'title', label: 'Achievement', placeholder: 'What you achieved' },
  { key: 'description', label: 'Description', placeholder: 'Any detail worth adding', type: 'textarea' },
  { key: 'year', label: 'Year', placeholder: 'e.g. 2026' },
];

const CUSTOM_FIELDS = [
  { key: 'title', label: 'Section title', placeholder: 'e.g. Publications' },
  { key: 'content', label: 'Content', placeholder: 'Section content', type: 'textarea' },
];

/* ------------------------------------------------------------ action panel */

/**
 * `showActions` / `showChecklist` let the phone layout split the two apart: the
 * buttons go in the bottom bar where a thumb can reach them, while the list of
 * what's still missing stays inline near the top where it reads as guidance
 * rather than an error hanging over the screen.
 */
export function ActionPanel({
  canDownload,
  missingSections,
  downloading,
  editMode,
  saving,
  onDownload,
  onEdit,
  onSave,
  onCancel,
  stacked = false,
  showActions = true,
  showChecklist = true,
  bare = false,
  equal = false,
}) {
  // `equal` makes buttons share a row evenly — used on phones, where two
  // natural-width buttons wrap awkwardly.
  const buttonWidth = stacked ? 'w-full' : equal ? 'flex-1 min-w-0' : '';
  const shell = bare ? '' : 'rounded-spc bg-spc-surface border border-spc-line p-4';

  return (
    <div className={shell}>
      {showActions && (
      <div className={`flex gap-2.5 ${stacked ? 'flex-col' : 'flex-wrap items-center'}`}>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading || !canDownload}
          className={`${buttonWidth} inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
            bg-spc-teal text-spc-on-teal text-spc-sm font-bold hover:opacity-95 transition-opacity
            disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:opacity-45`}
        >
          <Download size={17} />
          <span>{downloading ? 'Downloading…' : 'Download PDF'}</span>
        </button>

        {editMode ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={`${buttonWidth} inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
                bg-spc-ok text-white text-spc-sm font-bold hover:opacity-95 transition-opacity disabled:opacity-50`}
            >
              <Save size={17} />
              <span>{saving ? 'Saving…' : 'Save changes'}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`${buttonWidth} inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
                bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-sm font-bold
                hover:bg-spc-surface-2 transition-colors`}
            >
              <X size={17} />
              <span>Cancel</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className={`${buttonWidth} inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
              bg-spc-surface text-spc-ink border border-spc-line-strong text-spc-sm font-bold
              hover:bg-spc-surface-2 transition-colors`}
          >
            <Edit size={17} />
            <span>Edit resume</span>
          </button>
        )}
      </div>
      )}

      {showChecklist && !canDownload && (
        <div className={`rounded-spc-sm bg-spc-warn-bg p-3.5 ${showActions ? 'mt-4' : ''}`}>
          <p className="flex items-start gap-2 text-spc-xs font-bold text-spc-warn">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>Add these before you can download:</span>
          </p>
          <ul className="mt-2 ml-6 space-y-1 list-disc text-spc-xs text-spc-body">
            {missingSections.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {showChecklist && canDownload && !editMode && (
        <p className={`text-spc-xs text-spc-muted ${showActions ? 'mt-3' : ''}`}>
          Your resume combines your profile details with everything below.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- all the sections */

export function ResumeSections({
  resumeData,
  setResumeData,
  editMode,
  expandedSections,
  onToggle,
  tempInputs,
  setTempInputs,
  extendedProfileAddress,
  handlers,
}) {
  const set = (field, value) => setResumeData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-3">
      <Collapsible
        id="objective"
        title="Career objective"
        icon={Target}
        open={expandedSections.objective}
        onToggle={onToggle}
        filled={Boolean(resumeData.career_objective)}
      >
        <div className="pt-3">
          {editMode ? (
            <Area
              value={resumeData.career_objective}
              onChange={(e) => set('career_objective', e.target.value)}
              placeholder="A short statement of what you're aiming for and what you bring."
              rows={4}
            />
          ) : (
            <p className="text-spc-sm text-spc-body leading-relaxed whitespace-pre-wrap">
              {resumeData.career_objective || 'Not set yet. Use “Edit resume” to add one.'}
            </p>
          )}
        </div>
      </Collapsible>

      <Collapsible
        id="address"
        title="Address"
        icon={MapPin}
        open={expandedSections.address}
        onToggle={onToggle}
        filled={Boolean(resumeData.address || extendedProfileAddress)}
      >
        <div className="pt-3">
          {editMode ? (
            <>
              <Area
                value={resumeData.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Your complete address as it should appear on the resume."
                rows={3}
              />
              {!resumeData.address && extendedProfileAddress && (
                <button
                  type="button"
                  onClick={() => set('address', extendedProfileAddress)}
                  className="mt-2 text-spc-xs font-bold text-spc-teal underline underline-offset-4 text-left"
                >
                  Use the address from your extended profile
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-spc-sm text-spc-body leading-relaxed whitespace-pre-wrap">
                {resumeData.address || extendedProfileAddress || 'Not set yet. Use “Edit resume” to add one.'}
              </p>
              {!resumeData.address && extendedProfileAddress && (
                <p className="text-xs text-spc-muted mt-1.5">Taken from your extended profile.</p>
              )}
            </>
          )}
        </div>
      </Collapsible>

      <Collapsible
        id="skills"
        title="Skills"
        icon={Code}
        open={expandedSections.skills}
        onToggle={onToggle}
        filled={resumeData.technical_skills.length > 0}
      >
        <div className="pt-3 space-y-5">
          <ChipList
            label="Technical skills"
            items={resumeData.technical_skills}
            editMode={editMode}
            onRemove={(i) => handlers.removeFromArray('technical_skills', i)}
            onAdd={(v) => handlers.addToArray('technical_skills', v)}
            value={tempInputs.technical_skill}
            onValueChange={(v) => setTempInputs((p) => ({ ...p, technical_skill: v }))}
            placeholder="e.g. Python, React"
          />
          <ChipList
            label="Soft skills"
            items={resumeData.soft_skills}
            editMode={editMode}
            onRemove={(i) => handlers.removeFromArray('soft_skills', i)}
            onAdd={(v) => handlers.addToArray('soft_skills', v)}
            value={tempInputs.soft_skill}
            onValueChange={(v) => setTempInputs((p) => ({ ...p, soft_skill: v }))}
            placeholder="e.g. Leadership, Communication"
          />
          <ChipList
            label="Languages known"
            items={resumeData.languages_known}
            editMode={editMode}
            onRemove={(i) => handlers.removeFromArray('languages_known', i)}
            onAdd={(v) => handlers.addToArray('languages_known', v)}
            value={tempInputs.language}
            onValueChange={(v) => setTempInputs((p) => ({ ...p, language: v }))}
            placeholder="e.g. English, Malayalam"
          />
        </div>
      </Collapsible>

      <Collapsible
        id="projects"
        title="Projects"
        icon={BookOpen}
        open={expandedSections.projects}
        onToggle={onToggle}
        filled={resumeData.projects.length > 0}
      >
        <div className="pt-3">
          <Repeater
            items={resumeData.projects}
            editMode={editMode}
            fields={PROJECT_FIELDS}
            onAdd={handlers.addProject}
            onUpdate={handlers.updateProject}
            onRemove={handlers.removeProject}
            addLabel="Add project"
            emptyLabel="No projects added yet."
          />
        </div>
      </Collapsible>

      <Collapsible
        id="experience"
        title="Work experience & internships"
        icon={Briefcase}
        open={expandedSections.experience}
        onToggle={onToggle}
        filled={resumeData.work_experience.length > 0}
      >
        <div className="pt-3">
          <Repeater
            items={resumeData.work_experience}
            editMode={editMode}
            fields={EXPERIENCE_FIELDS}
            onAdd={handlers.addExperience}
            onUpdate={handlers.updateExperience}
            onRemove={handlers.removeExperience}
            addLabel="Add experience"
            emptyLabel="No experience added yet."
          />
        </div>
      </Collapsible>

      <Collapsible
        id="certifications"
        title="Certifications"
        icon={Award}
        open={expandedSections.certifications}
        onToggle={onToggle}
        filled={resumeData.certifications.length > 0}
      >
        <div className="pt-3">
          <Repeater
            items={resumeData.certifications}
            editMode={editMode}
            fields={CERTIFICATION_FIELDS}
            onAdd={handlers.addCertification}
            onUpdate={handlers.updateCertification}
            onRemove={handlers.removeCertification}
            addLabel="Add certification"
            emptyLabel="No certifications added yet."
          />
        </div>
      </Collapsible>

      <Collapsible
        id="achievements"
        title="Achievements & awards"
        icon={Award}
        open={expandedSections.achievements}
        onToggle={onToggle}
        filled={resumeData.achievements.length > 0}
      >
        <div className="pt-3">
          <Repeater
            items={resumeData.achievements}
            editMode={editMode}
            fields={ACHIEVEMENT_FIELDS}
            onAdd={handlers.addAchievement}
            onUpdate={handlers.updateAchievement}
            onRemove={handlers.removeAchievement}
            addLabel="Add achievement"
            emptyLabel="No achievements added yet."
          />
        </div>
      </Collapsible>

      <Collapsible
        id="extracurricular"
        title="Extracurricular activities"
        icon={Users}
        open={expandedSections.extracurricular}
        onToggle={onToggle}
        filled={resumeData.extracurricular_activities.length > 0}
      >
        <div className="pt-3 space-y-3">
          {resumeData.extracurricular_activities.map((activity, index) => (
            <div key={index} className="flex gap-2 items-start">
              {editMode ? (
                <>
                  <Input
                    type="text"
                    value={activity}
                    onChange={(e) => handlers.updateExtracurricular(index, e.target.value)}
                    placeholder="e.g. NSS volunteer, college football team"
                  />
                  <button
                    type="button"
                    onClick={() => handlers.removeExtracurricular(index)}
                    aria-label={`Remove activity ${index + 1}`}
                    className="flex-shrink-0 w-12 min-h-[48px] rounded-spc-sm text-spc-muted
                      hover:bg-spc-bad-bg hover:text-spc-bad transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={17} />
                  </button>
                </>
              ) : (
                <p className="text-spc-sm text-spc-body break-words">• {activity}</p>
              )}
            </div>
          ))}
          {editMode && (
            <button
              type="button"
              onClick={handlers.addExtracurricular}
              className="w-full min-h-[48px] rounded-spc-sm border border-dashed border-spc-line-strong
                text-spc-xs font-bold text-spc-body hover:bg-spc-surface-2 transition-colors
                flex items-center justify-center gap-2"
            >
              <Plus size={17} />
              Add activity
            </button>
          )}
          {!editMode && resumeData.extracurricular_activities.length === 0 && (
            <p className="text-spc-xs text-spc-muted">No activities added yet.</p>
          )}
        </div>
      </Collapsible>

      <Collapsible
        id="custom"
        title="Custom sections"
        icon={FileText}
        open={expandedSections.custom}
        onToggle={onToggle}
        filled={resumeData.custom_sections.length > 0}
      >
        <div className="pt-3">
          <Repeater
            items={resumeData.custom_sections}
            editMode={editMode}
            fields={CUSTOM_FIELDS}
            onAdd={handlers.addCustomSection}
            onUpdate={handlers.updateCustomSection}
            onRemove={handlers.removeCustomSection}
            addLabel="Add custom section"
            emptyLabel="No custom sections added yet."
          />
        </div>
      </Collapsible>

      <section className="rounded-spc bg-spc-surface border border-spc-line p-4">
        <h3 className="text-spc-h3 font-bold text-spc-ink mb-3">Declaration</h3>
        {editMode ? (
          <Area
            value={resumeData.declaration_text}
            onChange={(e) => set('declaration_text', e.target.value)}
            rows={2}
          />
        ) : (
          <p className="text-spc-sm text-spc-body italic leading-relaxed">{resumeData.declaration_text}</p>
        )}
      </section>
    </div>
  );
}

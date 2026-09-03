import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * Requirement templates — a saved set of eligibility rules an officer can drop
 * onto a job request instead of re-typing it.
 *
 * A template is small: a CGPA floor, a backlog ceiling, a list of branches, and
 * which extended-profile sections the student has to have completed. The old
 * card said all of that in five different visual languages — a gradient tile, a
 * grey key/value box, blue branch pills, and five differently-coloured section
 * badges — so nothing on it had any weight. Here it is one list of facts, and
 * the only colour is on the sections a template actually requires.
 */

/** The extended-profile sections, in the order the student's form asks for them. */
export const SECTIONS = [
  ['requires_academic_extended', 'Academic', 'SSLC and 12th details'],
  ['requires_physical_details', 'Physical', 'Height, weight, disability'],
  ['requires_family_details', 'Family', 'Parents and siblings'],
  ['requires_personal_details', 'Personal', 'District, address, interests'],
  ['requires_document_verification', 'Documents', 'PAN, Aadhaar, passport'],
  ['requires_education_preferences', 'Education', 'B.Tech / M.Tech interest'],
];

/**
 * `allowed_branches` comes back as JSON text from some endpoints and as a real
 * array from others. One reader for both, rather than the same ternary written
 * out at each of the three places that needed it.
 */
export function branchesOf(template) {
  const raw = template?.allowed_branches;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{label}</p>
      <p className="text-spc-sm text-spc-ink break-words">{value}</p>
    </div>
  );
}

function TemplateCard({ template, onView, onEdit, onDelete }) {
  const branches = branchesOf(template);
  const required = SECTIONS.filter(([key]) => template[key]);

  return (
    <Panel className="overflow-hidden flex flex-col">
      <PanelHeading>
        <span className="block min-w-0 break-words">{template.template_name}</span>
      </PanelHeading>

      <div className="p-4 flex-1">
        {template.description && (
          <p className="text-spc-xs text-spc-body break-words mb-3">{template.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Fact
            label="Min CGPA"
            value={template.min_cgpa ? String(template.min_cgpa) : 'No bar'}
          />
          <Fact
            label="Max backlogs"
            value={template.max_backlogs !== null && template.max_backlogs !== undefined
              ? String(template.max_backlogs) : 'No bar'}
          />
        </div>

        <div className="mb-3">
          <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1">
            Branches
          </p>
          {branches.length === 0 ? (
            <p className="text-spc-sm text-spc-ink">Every branch</p>
          ) : (
            <p className="text-spc-sm text-spc-ink break-words">
              {branches.slice(0, 3).join(', ')}
              {branches.length > 3 && ` and ${branches.length - 3} more`}
            </p>
          )}
        </div>

        <div>
          <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1.5">
            Student must complete
          </p>
          {required.length === 0 ? (
            <p className="text-spc-sm text-spc-ink">Nothing extra</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {required.map(([key, label]) => (
                <li key={key}
                  className="px-2 py-0.5 rounded-spc-admin-sm bg-spc-surface-2 text-spc-xs text-spc-ink">
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-spc-line">
        <SecondaryButton onClick={() => onView(template)} className="flex-1">
          <Eye size={15} aria-hidden="true" />
          View
        </SecondaryButton>
        <SecondaryButton onClick={() => onEdit(template)} className="flex-1">
          <Edit size={15} aria-hidden="true" />
          Edit
        </SecondaryButton>
        <button
          type="button"
          onClick={() => onDelete(template.id, template.template_name)}
          aria-label={`Delete the template "${template.template_name}"`}
          title="Delete template"
          className="inline-flex items-center justify-center w-11 h-11 flex-shrink-0
            rounded-spc-admin-sm text-spc-body border border-spc-control
            hover:bg-spc-bad-bg hover:text-spc-bad transition-colors"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

export default function TemplatesBody(p) {
  const { layout } = p;
  const columns = layout === 'desktop' ? 'lg:grid-cols-3 sm:grid-cols-2'
    : layout === 'tablet' ? 'sm:grid-cols-2' : 'grid-cols-1';

  return (
    <div>
      <PageHeading
        eyebrow="Jobs"
        title="Requirement Templates"
        subline="Saved eligibility rules officers can apply to a job request"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={p.onCreate}>
          <Plus size={15} aria-hidden="true" />
          New template
        </PrimaryButton>
      </PageHeading>

      {p.templates.length === 0 ? (
        <Panel>
          <EmptyState>
            No templates yet. One saves a CGPA floor, a backlog ceiling, the branches
            and the profile sections a drive needs, so an officer does not retype them.
          </EmptyState>
          <div className="flex justify-center pb-8">
            <PrimaryButton onClick={p.onCreate}>
              <Plus size={15} aria-hidden="true" />
              Create the first one
            </PrimaryButton>
          </div>
        </Panel>
      ) : (
        <>
          <SectionLabel>
            {p.templates.length} {p.templates.length === 1 ? 'template' : 'templates'}
          </SectionLabel>
          <div className={`grid grid-cols-1 ${columns} gap-3 items-start`}>
            {p.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onView={p.onView}
                onEdit={p.onEdit}
                onDelete={p.onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

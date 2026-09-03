import { Check, Minus } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import { SectionLabel, PrimaryButton, SecondaryButton } from '../../../components/admin/AdminUI';
import { SECTIONS, branchesOf } from './TemplatesBody';

/**
 * A template, read-only.
 *
 * The section list is the whole point of this dialog, so all six are shown —
 * required and not — with a tick or a dash. Listing only the required ones
 * cannot tell you whether a section was deliberately left out or simply
 * forgotten when the template was written.
 */
export default function TemplateView({ template, onEdit, onClose }) {
  const branches = branchesOf(template);

  return (
    <Modal
      onClose={onClose}
      labelledBy="template-view-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="template-view-title"
        title={template.template_name}
        subtitle="Requirement template"
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        {template.description && (
          <p className="text-spc-sm text-spc-body break-words whitespace-pre-line">
            {template.description}
          </p>
        )}

        <div>
          <SectionLabel>Eligibility</SectionLabel>
          <div className="grid grid-cols-2 gap-3 p-3 rounded-spc-admin
            bg-spc-surface-2 border border-spc-line-strong">
            <div>
              <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">
                Minimum CGPA
              </p>
              <p className="text-spc-h2 font-bold text-spc-ink tabular-nums">
                {template.min_cgpa || 'No bar'}
              </p>
            </div>
            <div>
              <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">
                Maximum backlogs
              </p>
              <p className="text-spc-h2 font-bold text-spc-ink tabular-nums">
                {template.max_backlogs !== null && template.max_backlogs !== undefined
                  ? template.max_backlogs
                  : 'No bar'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>
            Branches {branches.length > 0 && `— ${branches.length}`}
          </SectionLabel>
          {branches.length === 0 ? (
            <p className="text-spc-sm text-spc-ink">
              Open to every branch — none were singled out.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {branches.map((branch) => (
                <li key={branch}
                  className="px-2 py-1 rounded-spc-admin-sm bg-spc-surface-2
                    border border-spc-line-strong text-spc-xs text-spc-ink">
                  {branch}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionLabel>Profile sections</SectionLabel>
          <ul className="border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
            {SECTIONS.map(([key, label, hint]) => {
              const on = Boolean(template[key]);
              return (
                <li key={key}
                  className="flex items-start gap-3 px-3 py-2.5 border-b border-spc-line last:border-b-0">
                  {on ? (
                    <Check size={17} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
                  ) : (
                    <Minus size={17} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />
                  )}
                  <span className="min-w-0">
                    <span className={`block text-spc-sm ${on
                      ? 'font-semibold text-spc-ink' : 'text-spc-body'}`}>
                      {label}
                      <span className="sr-only">{on ? ' — required' : ' — not required'}</span>
                    </span>
                    <span className="block text-spc-xs text-spc-body">{hint}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        <PrimaryButton onClick={onEdit}>Edit template</PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

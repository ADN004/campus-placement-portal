import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS, PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';
import { KERALA_POLYTECHNIC_BRANCHES } from '../../../constants/branches';
import { SECTIONS, branchesOf } from './TemplatesBody';

/**
 * Create or edit a template.
 *
 * The form's own state stays here — it is a form, and its half-filled values
 * belong to the dialog that is open, not to the page. What leaves is the
 * finished payload; the container owns the API call, the toast and the refetch,
 * so there is one place that talks to the server.
 *
 * `min_cgpa` and `max_backlogs` are sent as `null` when blank, which is what
 * "no bar" means to the backend — an empty string would be coerced to 0 and
 * silently turn "any number of backlogs" into "none allowed".
 */
export default function TemplateForm({ template, onSave, onClose }) {
  const isEdit = !!template;
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    min_cgpa: template?.min_cgpa || '',
    max_backlogs: template?.max_backlogs ?? '',
    allowed_branches: branchesOf(template),
    requires_academic_extended: template?.requires_academic_extended || false,
    requires_physical_details: template?.requires_physical_details || false,
    requires_family_details: template?.requires_family_details || false,
    requires_personal_details: template?.requires_personal_details || false,
    requires_document_verification: template?.requires_document_verification || false,
    requires_education_preferences: template?.requires_education_preferences || false,
  });
  const [submitting, setSubmitting] = useState(false);

  const branchOptions = KERALA_POLYTECHNIC_BRANCHES;

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleBranch = (branch) => {
    setFormData(prev => ({
      ...prev,
      allowed_branches: prev.allowed_branches.includes(branch)
        ? prev.allowed_branches.filter(b => b !== branch)
        : [...prev.allowed_branches, branch]
    }));
  };

  const toggleAllBranches = () => {
    setFormData(prev => ({
      ...prev,
      allowed_branches: prev.allowed_branches.length === branchOptions.length
        ? []
        : [...branchOptions],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        allowed_branches: formData.allowed_branches,
        min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : null,
        max_backlogs: formData.max_backlogs !== '' ? parseInt(formData.max_backlogs) : null,
      }, isEdit);
    } finally {
      setSubmitting(false);
    }
  };

  const allBranchesOn = formData.allowed_branches.length === branchOptions.length;

  return (
    <Modal
      onClose={onClose}
      labelledBy="template-form-title"
      panelClassName={adminPanel('xl', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="template-form-title"
        title={isEdit ? 'Edit template' : 'New template'}
        subtitle="Rules an officer can apply to a job request in one click"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <AdminDialogBody className="space-y-5">
          <div>
            <FieldLabel htmlFor="template-name">Template name *</FieldLabel>
            <input
              id="template-name"
              type="text"
              className={FIELD_CLASS}
              value={formData.template_name}
              onChange={(e) => set('template_name', e.target.value)}
              placeholder="e.g. Thoughtworks STEP Program"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="template-description">Description</FieldLabel>
            <textarea
              id="template-description"
              rows="3"
              className={FIELD_CLASS}
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What kind of drive is this for?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="template-cgpa">Minimum CGPA</FieldLabel>
              <input
                id="template-cgpa"
                type="number"
                className={FIELD_CLASS}
                value={formData.min_cgpa}
                onChange={(e) => set('min_cgpa', e.target.value)}
                placeholder="e.g. 7.0"
                min="0"
                max="10"
                step="0.01"
              />
              <p className="text-spc-xs text-spc-body mt-1.5">Leave blank for no bar.</p>
            </div>
            <div>
              <FieldLabel htmlFor="template-backlogs">Maximum backlogs</FieldLabel>
              <input
                id="template-backlogs"
                type="number"
                className={FIELD_CLASS}
                value={formData.max_backlogs}
                onChange={(e) => set('max_backlogs', e.target.value)}
                placeholder="e.g. 0"
                min="0"
              />
              <p className="text-spc-xs text-spc-body mt-1.5">
                Blank is no bar. <span className="font-bold text-spc-ink">0</span> means none allowed.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <SectionLabel className="mb-0">
                Branches — {formData.allowed_branches.length === 0
                  ? 'every branch'
                  : `${formData.allowed_branches.length} of ${branchOptions.length}`}
              </SectionLabel>
              <SecondaryButton onClick={toggleAllBranches}>
                {allBranchesOn ? 'Clear all' : 'Select all'}
              </SecondaryButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1
              max-h-56 overflow-y-auto border border-spc-line-strong rounded-spc-admin-sm p-1">
              {branchOptions.map((branch) => (
                <label
                  key={branch}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-spc-admin-sm cursor-pointer
                    ${formData.allowed_branches.includes(branch)
                      ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.allowed_branches.includes(branch)}
                    onChange={() => toggleBranch(branch)}
                    className={`${CHECKBOX_CLASS} flex-shrink-0`}
                  />
                  <span className="text-spc-xs text-spc-ink min-w-0 break-words">{branch}</span>
                </label>
              ))}
            </div>
            <p className="text-spc-xs text-spc-body mt-1.5">
              Tick none to leave the drive open to every branch.
            </p>
          </div>

          <div>
            <SectionLabel>Profile sections the student must complete first</SectionLabel>
            <div className="space-y-1">
              {SECTIONS.map(([key, label, hint]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-2.5 rounded-spc-admin-sm cursor-pointer
                    ${formData[key] ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
                >
                  <input
                    type="checkbox"
                    checked={formData[key]}
                    onChange={(e) => set(key, e.target.checked)}
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
        </AdminDialogBody>

        <AdminDialogFooter>
          <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
          </PrimaryButton>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

import { Plus, Save, Edit2, Trash2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * The regions, added and edited in place.
 *
 * One form at the top that doubles as the editor — it says which region it is
 * editing, because a form that silently changes what it will save is how the
 * wrong row gets renamed. Each region carries its dependent counts, so it is
 * clear before clicking delete why a region with colleges in it will refuse.
 */
export default function RegionsModal({
  regions, form, onChange, editing, onEdit, onCancelEdit, onSave, onDelete, onClose, submitting,
}) {
  const canSave = form.region_name.trim() && form.region_code.trim();

  return (
    <Modal
      onClose={onClose}
      labelledBy="regions-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="regions-title"
        title="Regions"
        subtitle="Every college belongs to one"
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        <div className="p-3 rounded-spc-admin bg-spc-surface-2 border border-spc-line-strong">
          <SectionLabel>
            {editing ? `Editing ${editing.region_name}` : 'Add a region'}
          </SectionLabel>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <div>
              <FieldLabel htmlFor="region-name">Name *</FieldLabel>
              <input
                id="region-name"
                type="text"
                className={FIELD_CLASS}
                value={form.region_name}
                onChange={(e) => onChange({ region_name: e.target.value })}
                placeholder="e.g. North Zone"
                disabled={submitting}
              />
            </div>
            <div>
              <FieldLabel htmlFor="region-code">Code *</FieldLabel>
              <input
                id="region-code"
                type="text"
                className={FIELD_CLASS}
                value={form.region_code}
                onChange={(e) => onChange({ region_code: e.target.value.toUpperCase() })}
                placeholder="e.g. NZ"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <PrimaryButton onClick={onSave} disabled={submitting || !canSave}>
              {editing
                ? <><Save size={15} aria-hidden="true" />Save changes</>
                : <><Plus size={15} aria-hidden="true" />Add region</>}
            </PrimaryButton>
            {editing && (
              <SecondaryButton onClick={onCancelEdit} disabled={submitting}>
                Cancel edit
              </SecondaryButton>
            )}
          </div>
        </div>

        <div>
          <SectionLabel>
            {regions.length} {regions.length === 1 ? 'region' : 'regions'}
          </SectionLabel>
          {regions.length === 0 ? (
            <p className="px-4 py-8 text-center text-spc-sm text-spc-body font-medium
              border border-spc-line-strong rounded-spc-admin-sm">
              No regions yet.
            </p>
          ) : (
            <ul className="border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
              {regions.map((region) => (
                <li key={region.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5
                    border-b border-spc-line last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-spc-sm font-bold text-spc-ink break-words">
                      {region.region_name}
                    </p>
                    <p className="text-spc-xs text-spc-body tabular-nums">
                      {region.region_code} · {region.college_count} colleges
                      {' · '}{region.student_count} students
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(region)}
                      disabled={submitting}
                      aria-label={`Edit ${region.region_name}`}
                      title="Edit region"
                      className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
                        text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors
                        disabled:opacity-55"
                    >
                      <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(region)}
                      disabled={submitting}
                      aria-label={`Delete ${region.region_name}`}
                      title="Delete region (only when empty)"
                      className="inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm
                        text-spc-body hover:bg-spc-bad-bg hover:text-spc-bad transition-colors
                        disabled:opacity-55"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Close</SecondaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

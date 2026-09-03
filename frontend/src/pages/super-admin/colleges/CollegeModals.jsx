import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  FieldLabel, FIELD_CLASS, PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';

/* ------------------------------------------------------------ add / edit */

/**
 * A college's name, code, region and sort order.
 *
 * Branches can only be given when creating one, because on an existing college
 * they are edited on their own page — the field is replaced by a line saying so
 * rather than shown and quietly ignored.
 */
export function CollegeFormDialog({ editing, form, onChange, regions, onSave, onClose, submitting }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="college-form-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="college-form-title"
        title={editing ? 'Edit college' : 'Add a college'}
        subtitle={editing ? editing.college_name : 'It appears in registration once it has a region'}
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-4">
        <div>
          <FieldLabel htmlFor="college-name">College name *</FieldLabel>
          <input
            id="college-name"
            type="text"
            className={FIELD_CLASS}
            value={form.college_name}
            onChange={(e) => onChange({ college_name: e.target.value })}
            placeholder="e.g. Government Polytechnic College Example"
            disabled={submitting}
          />
        </div>

        <div>
          <FieldLabel htmlFor="college-code">College code *</FieldLabel>
          <input
            id="college-code"
            type="text"
            className={FIELD_CLASS}
            value={form.college_code}
            onChange={(e) => onChange({ college_code: e.target.value.toUpperCase() })}
            placeholder="e.g. GPC_EXM"
            disabled={submitting}
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Short and unique. It is what you type to confirm a mode switch.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="college-region">Region *</FieldLabel>
          <select
            id="college-region"
            className={FIELD_CLASS}
            value={form.region_id}
            onChange={(e) => onChange({ region_id: e.target.value })}
            disabled={submitting}
          >
            <option value="">Choose a region…</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>{region.region_name}</option>
            ))}
          </select>
          {regions.length === 0 && (
            <p className="text-spc-xs text-spc-warn font-semibold mt-1.5">
              There are no regions yet — create one under &ldquo;Regions&rdquo; first.
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="college-sort">Sort order</FieldLabel>
          <input
            id="college-sort"
            type="number"
            className={FIELD_CLASS}
            value={form.sort_order}
            onChange={(e) => onChange({ sort_order: e.target.value })}
            placeholder="999"
            disabled={submitting}
          />
          <p className="text-spc-xs text-spc-body mt-1.5">
            Lower numbers come first in every dropdown. Blank means 999 — the end.
          </p>
        </div>

        {editing ? (
          <p className="text-spc-xs text-spc-body">
            Branches are edited on the College Branches page.
          </p>
        ) : (
          <div>
            <FieldLabel htmlFor="college-branches">Branches</FieldLabel>
            <textarea
              id="college-branches"
              rows="2"
              className={FIELD_CLASS}
              value={form.branches}
              onChange={(e) => onChange({ branches: e.target.value })}
              placeholder="e.g. Computer Engineering, Electronics Engineering, Mechanical Engineering"
              disabled={submitting}
            />
            <p className="text-spc-xs text-spc-body mt-1.5">
              Comma-separated, and optional — they can be added on the College Branches page
              later. The college also needs a placement officer before it is usable.
            </p>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create college'}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ----------------------------------------------------------- mode switch */

/**
 * Deactivate every college but one, reversibly.
 *
 * A testing tool with a production-sized blast radius, so it asks for the
 * surviving college's code to be typed out. The consequences are listed before
 * the controls, not after them.
 */
export function ModeSwitchDialog({
  colleges, collegeId, onCollegeId, confirmCode, onConfirmCode, onSwitch, onClose, submitting,
}) {
  const activeColleges = colleges.filter((c) => c.is_active);
  const chosen = activeColleges.find((c) => c.id === parseInt(collegeId, 10));
  const codeMatches = chosen
    && confirmCode.trim().toUpperCase() === chosen.college_code.toUpperCase();

  return (
    <Modal
      onClose={onClose}
      labelledBy="mode-switch-title"
      panelClassName={adminPanel('lg', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="mode-switch-title"
        title="Switch to a single college"
        subtitle="A reversible testing tool — never on a live portal"
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-4">
        <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
          <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
          <div className="text-spc-xs text-spc-ink space-y-1.5">
            <p className="font-semibold">Read this first.</p>
            <ul className="list-disc ml-4 space-y-1 text-spc-body">
              <li>Every other college is <span className="font-bold text-spc-ink">deactivated</span> until you restore.</li>
              <li>Their students can still sign in, but stop matching any new job.</li>
              <li>Those colleges vanish from registration, from filters and from notifications.</li>
              <li>Their placement officers&rsquo; pages will not work normally.</li>
              <li>
                <span className="font-bold text-spc-ink">Nothing is deleted.</span> A snapshot is
                kept, and the restore puts back exactly the colleges switched off here.
              </li>
            </ul>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="mode-switch-college">The college that stays active *</FieldLabel>
          <select
            id="mode-switch-college"
            className={FIELD_CLASS}
            value={collegeId}
            onChange={(e) => onCollegeId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Choose a college…</option>
            {activeColleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.college_name} ({college.college_code})
              </option>
            ))}
          </select>
        </div>

        {chosen && (
          <div>
            <FieldLabel htmlFor="mode-switch-code">
              Type {chosen.college_code} to confirm *
            </FieldLabel>
            <input
              id="mode-switch-code"
              type="text"
              className={`${FIELD_CLASS} font-mono`}
              value={confirmCode}
              onChange={(e) => onConfirmCode(e.target.value.toUpperCase())}
              placeholder={chosen.college_code}
              disabled={submitting}
            />
            <p className="text-spc-xs text-spc-body mt-1.5 tabular-nums">
              {activeColleges.length - 1} colleges will be deactivated.
            </p>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton onClick={onClose} disabled={submitting}>Cancel</SecondaryButton>
        <DangerButton onClick={onSwitch} disabled={submitting || !codeMatches}>
          {submitting ? 'Switching…' : 'Switch mode'}
        </DangerButton>
      </AdminDialogFooter>
    </Modal>
  );
}

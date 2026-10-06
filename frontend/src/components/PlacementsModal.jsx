import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import Modal from './Modal';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogBody, OfficerDialogFooter,
} from './officer/OfficerDialog';
import { SecondaryButton } from './officer/OfficerUI';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from './admin/AdminDialog';
import { SecondaryButton as AdminSecondary } from './admin/AdminUI';

/**
 * Where a student is already placed, and on what terms.
 *
 * An applicant who already has an offer is shown in a section of their own on
 * the applicants page, in both roles, headed "Already placed elsewhere". That
 * told an officer the fact and withheld everything that makes it useful: which
 * company, for what role, at what package. Deciding whether to shortlist
 * somebody who is already placed is exactly a question about the offer they
 * hold, and the page answered none of it.
 *
 * The data was there the whole time. Both controllers already select
 * previous_placements -- company, job title and package for every other job the
 * student was selected for -- and nothing in the frontend had ever read it.
 *
 * The officer's table did carry an "Already placed at" column. It read
 * student.placed_company, which no endpoint has ever returned, so it printed a
 * dash on every row of every job since it was written, and the mobile line
 * guarded by the same field never appeared at all. A column that is always
 * empty reads as "we checked and there is nothing", which is worse than not
 * having asked.
 *
 * A dialog rather than more columns. A student can hold more than one offer, so
 * the honest cell is a list of unknown length, and both tables are already wide
 * enough to need a pinned actions column. The trigger is one narrow button that
 * says how many there are; the detail opens where there is room for it.
 *
 * The two role branches are one branch, as in DriveScheduleModal: officer and
 * Console expose the same dialog primitives under the same names, so the set is
 * chosen once and the markup written once.
 */

const OFFICER_UI = {
  overlay: OFFICER_OVERLAY,
  panel: officerPanel,
  Header: OfficerDialogHeader,
  Body: OfficerDialogBody,
  Footer: OfficerDialogFooter,
  Secondary: SecondaryButton,
};

const ADMIN_UI = {
  overlay: ADMIN_OVERLAY,
  panel: adminPanel,
  Header: AdminDialogHeader,
  Body: AdminDialogBody,
  Footer: AdminDialogFooter,
  Secondary: AdminSecondary,
};

/**
 * previous_placements as the API sends it, or nothing.
 *
 * json_agg returns NULL rather than an empty array when no rows match, and the
 * column is absent entirely on older cached responses, so neither can be
 * assumed away. Rows without a company name are dropped: they cannot be
 * rendered usefully and would otherwise count towards the badge.
 */
export const placementsOf = (student) => {
  const raw = student?.previous_placements;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p) => p && p.company_name);
};

/** "Infosys" · "Infosys +2" — the trigger has to fit inside a table cell. */
const triggerLabel = (placements) => {
  const [first, ...rest] = placements;
  return rest.length > 0
    ? `${first.company_name} +${rest.length}`
    : first.company_name;
};

/**
 * The cell itself: a button when there is something to show, a dash when there
 * is not.
 *
 * Holds its own open state. Nothing here is fetched and nothing is saved, so
 * threading it up to the container would buy nothing and would mean every
 * applicants page carrying a piece of state about a dialog.
 */
export function PlacementsCell({ student, variant = 'officer', className = '' }) {
  const [open, setOpen] = useState(false);
  const placements = placementsOf(student);

  if (placements.length === 0) {
    return <span className={`text-spc-body ${className}`}>–</span>;
  }

  const accent = variant === 'admin' ? 'text-spc-accent' : 'text-spc-teal';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`See where ${student.name || student.student_name} is placed`}
        aria-label={`See the ${placements.length} placement${placements.length === 1 ? '' : 's'} held by ${student.name || student.student_name}`}
        className={`inline-flex items-center gap-1.5 text-left font-semibold
          ${accent} hover:underline ${className}`}
      >
        <Briefcase size={14} aria-hidden="true" className="flex-shrink-0" />
        <span className="break-words">{triggerLabel(placements)}</span>
      </button>

      {open && (
        <PlacementsModal
          student={student}
          placements={placements}
          variant={variant}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function PlacementsModal({ student, placements, variant = 'officer', onClose }) {
  const ui = variant === 'admin' ? ADMIN_UI : OFFICER_UI;
  const name = student.name || student.student_name || 'This student';

  return (
    <Modal
      onClose={onClose}
      labelledBy="placements-title"
      panelClassName={ui.panel('md', { scroll: true })}
      overlayClassName={ui.overlay}
    >
      <ui.Header
        id="placements-title"
        title="Already placed"
        subtitle={`${name} holds ${placements.length} offer${placements.length === 1 ? '' : 's'}`}
        onClose={onClose}
      />

      <ui.Body className="space-y-3">
        {placements.map((placement, i) => (
          <div
            // No id comes back with these, and a company can run two drives, so
            // neither the name nor the title is reliably unique. The list is
            // read-only and never reorders, so the index is a safe key here.
            key={`${placement.company_name}-${i}`}
            className="p-3 rounded-spc border border-spc-line"
          >
            <p className="text-spc-sm font-bold text-spc-ink break-words">
              {placement.company_name}
            </p>
            {placement.job_title && (
              <p className="text-spc-xs text-spc-body mt-0.5 break-words">
                {placement.job_title}
              </p>
            )}
            {/*
              salary_package is free text -- "1.8 to 3.66", "Negotiable", "4 LPA"
              have all been entered -- so it is printed as written and never
              parsed. Absent means the officer did not record one, which is not
              the same as zero and must not render as it.
            */}
            <p className="text-spc-xs mt-1.5">
              <span className="text-spc-body">Package: </span>
              {placement.placement_package
                ? <span className="font-bold text-spc-ink">{placement.placement_package}</span>
                : <span className="text-spc-body italic">not recorded</span>}
            </p>
          </div>
        ))}

        <p className="text-spc-xs text-spc-body">
          Offers already accepted elsewhere. This student can still be shortlisted
          for this job — the portal does not block it.
        </p>
      </ui.Body>

      <ui.Footer>
        <ui.Secondary type="button" onClick={onClose}>Close</ui.Secondary>
      </ui.Footer>
    </Modal>
  );
}

export default PlacementsModal;

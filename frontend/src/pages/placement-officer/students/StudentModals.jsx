import Modal from '../../../components/Modal';
import UpdateStudentEmailModal from '../../../components/UpdateStudentEmailModal';
import {
  PrimaryButton, SecondaryButton, DangerButton, FieldLabel, FIELD_CLASS,
  StatusMark, BlacklistMark, BacklogCount, formatDate, totalBacklogs,
} from './studentsShared';

/**
 * Every dialog on ManageStudents, rendered from the container so all three
 * devices get identical behaviour.
 *
 * All of them go through `components/Modal.jsx`, the behaviour-only primitive:
 * focus trap, Escape to close, body scroll lock and focus restore to whatever
 * opened it. Previously only the details modal locked page scroll — the other
 * nine let the list scroll behind them — and none of them trapped focus.
 *
 * `Modal` defaults its panel to a white rounded card with a shadow, so every
 * call site passes `panelClassName`: this role has no shadows.
 */

const PANEL = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-md';
const PANEL_WIDE = 'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-3xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

/** Shared dialog chrome: a titled header on a rule, then the body. */
function Dialog({ id, title, onClose, children, wide = false }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy={id}
      panelClassName={wide ? PANEL_WIDE : PANEL}
      overlayClassName={OVERLAY}
      closeOnBackdrop
    >
      <div className="px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
        <h2 id={id} className="text-spc-h2 font-bold text-spc-ink">{title}</h2>
      </div>
      {children}
    </Modal>
  );
}

function Footer({ children }) {
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap px-5 py-4 border-t border-spc-line flex-shrink-0">
      {children}
    </div>
  );
}

/** A labelled read-only fact inside the details dialog. */
function Fact({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</p>
      <div className={`text-spc-sm text-spc-ink mt-0.5 break-words ${mono ? 'tabular-nums font-bold' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="pt-4 mt-4 border-t-[1.5px] border-spc-rule-structural first:mt-0 first:pt-0 first:border-t-0">
      <h3 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function StudentModals({
  // details
  showDetailsModal, selectedStudent, onCloseDetails, onApprove, onReject,
  // email fix
  emailFixStudent, onEmailFixSubmit, onCloseEmailFix,
  // correction
  showCorrectionModal, correctionNote, onCorrectionNoteChange,
  correctionRequirePhoto, onCorrectionRequirePhotoChange,
  correctionSubmitting, onConfirmCorrection, onCloseCorrection,
  // blacklist
  showBlacklistModal, blacklistReason, onBlacklistReasonChange,
  onConfirmBlacklist, onCloseBlacklist,
  // whitelist
  showWhitelistModal, whitelistReason, onWhitelistReasonChange,
  onConfirmWhitelist, onCloseWhitelist,
  // cgpa / backlog unlock
  showCgpaUnlockModal, unlockDays, onUnlockDaysChange, unlockReason, onUnlockReasonChange,
  cgpaProcessing, onConfirmCgpaUnlock, onCloseCgpaUnlock,
  showBacklogUnlockModal, backlogUnlockDays, onBacklogUnlockDaysChange,
  backlogUnlockReason, onBacklogUnlockReasonChange, backlogProcessing,
  onConfirmBacklogUnlock, onCloseBacklogUnlock,
}) {
  return (
    <>
      {/* ---------------------------------------------------------- details */}
      {showDetailsModal && selectedStudent && (
        <Dialog id="student-details-title" title="Student details" onClose={onCloseDetails} wide>
          <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4">
            <div className="flex items-start gap-4 mb-4">
              {selectedStudent.photo_url ? (
                <img
                  src={selectedStudent.photo_url}
                  alt={`Photograph of ${selectedStudent.name || selectedStudent.prn}`}
                  className="w-24 h-24 object-cover rounded-spc-panel border border-spc-line-strong flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-spc-panel border border-spc-line-strong bg-spc-surface-2
                  flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-spc-muted text-center px-2">No photo</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-spc-h2 font-bold text-spc-ink break-words">
                  {selectedStudent.name || '–'}
                </p>
                <p className="text-spc-sm text-spc-muted tabular-nums mt-0.5">{selectedStudent.prn}</p>
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <StatusMark status={selectedStudent.registration_status} />
                  <BlacklistMark isBlacklisted={selectedStudent.is_blacklisted} />
                </div>
              </div>
            </div>

            <Section title="Contact">
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Email">{selectedStudent.email}</Fact>
                <Fact label="Mobile">{selectedStudent.mobile_number || '–'}</Fact>
              </div>
            </Section>

            <Section title="College">
              <div className="grid grid-cols-2 gap-4">
                <Fact label="College">{selectedStudent.college_name || '–'}</Fact>
                <Fact label="Region">{selectedStudent.region_name || '–'}</Fact>
                <Fact label="Branch">{selectedStudent.branch || '–'}</Fact>
              </div>
            </Section>

            <Section title="Academic">
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Programme CGPA" mono>{selectedStudent.programme_cgpa || '–'}</Fact>
                <Fact label="Backlogs" mono>
                  <BacklogCount total={totalBacklogs(selectedStudent)} />
                </Fact>
              </div>
              {selectedStudent.backlog_details && (
                <div className="mt-3">
                  <Fact label="Backlog details">{selectedStudent.backlog_details}</Fact>
                </div>
              )}
            </Section>

            <Section title="Registration">
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Registered on" mono>{formatDate(selectedStudent.created_at)}</Fact>
              </div>
            </Section>
          </div>

          <Footer>
            {/* Decide right where you reviewed: approve/reject from the dialog. */}
            {selectedStudent.registration_status === 'pending' && !selectedStudent.is_blacklisted && (
              <>
                <DangerButton onClick={() => onReject(selectedStudent.id)}>Reject</DangerButton>
                <PrimaryButton onClick={() => onApprove(selectedStudent.id)}>Approve</PrimaryButton>
              </>
            )}
            <SecondaryButton onClick={onCloseDetails}>Close</SecondaryButton>
          </Footer>
        </Dialog>
      )}

      {/* --------------------------------------------------------- email fix */}
      {emailFixStudent && (
        <UpdateStudentEmailModal
          currentEmail={emailFixStudent.email}
          studentName={`${emailFixStudent.name || emailFixStudent.student_name || ''} (PRN ${emailFixStudent.prn})`}
          onSubmit={onEmailFixSubmit}
          onClose={onCloseEmailFix}
          variant="spc"
        />
      )}

      {/* -------------------------------------------------------- correction */}
      {showCorrectionModal && selectedStudent && (
        <Dialog
          id="correction-title"
          title="Send back for correction"
          onClose={onCloseCorrection}
        >
          <div className="px-5 py-4">
            <p className="text-spc-xs text-spc-body mb-4">
              <span className="font-bold text-spc-ink">
                {selectedStudent.student_name || selectedStudent.name}
              </span>{' '}
              stays approved and signed in — they&rsquo;ll be asked to fix what you note below.
              No re-approval needed.
            </p>

            <FieldLabel htmlFor="correction-note">What should they correct?</FieldLabel>
            <textarea
              id="correction-note"
              rows="3"
              value={correctionNote}
              onChange={onCorrectionNoteChange}
              placeholder="e.g. Your branch is wrong, and your photo is not a clear passport photo — please fix both."
              className={`${FIELD_CLASS} py-2 h-auto`}
            />

            <label className="flex items-start gap-3 mt-4 p-3 rounded-spc-control bg-spc-warn-bg cursor-pointer">
              <input
                type="checkbox"
                checked={correctionRequirePhoto}
                onChange={onCorrectionRequirePhotoChange}
                className="mt-0.5 w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))]"
              />
              <span className="text-xs text-spc-body">
                <span className="font-bold text-spc-ink">
                  Take down their photo and require a new one.
                </span>{' '}
                The current photo is removed immediately (use this for a wrong or inappropriate
                image) and the student must upload a replacement before they can mark the
                correction done.
              </span>
            </label>
          </div>

          <Footer>
            <SecondaryButton onClick={onCloseCorrection}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={onConfirmCorrection}
              disabled={correctionSubmitting || !correctionNote.trim()}
            >
              {correctionSubmitting ? 'Sending…' : 'Send for correction'}
            </PrimaryButton>
          </Footer>
        </Dialog>
      )}

      {/* --------------------------------------------------------- blacklist */}
      {showBlacklistModal && selectedStudent && (
        <Dialog id="blacklist-title" title="Blacklist student" onClose={onCloseBlacklist}>
          <div className="px-5 py-4">
            <p className="text-spc-xs text-spc-body mb-4">
              You are about to blacklist{' '}
              <span className="font-bold text-spc-ink tabular-nums">{selectedStudent.prn}</span>.
              This will prevent them from applying to jobs.
            </p>
            <FieldLabel htmlFor="blacklist-reason">Reason for blacklisting</FieldLabel>
            <textarea
              id="blacklist-reason"
              rows="4"
              value={blacklistReason}
              onChange={onBlacklistReasonChange}
              placeholder="Please provide a detailed reason for blacklisting this student…"
              className={`${FIELD_CLASS} py-2 h-auto`}
            />
          </div>
          <Footer>
            <SecondaryButton onClick={onCloseBlacklist}>Cancel</SecondaryButton>
            <DangerButton onClick={onConfirmBlacklist}>Confirm blacklist</DangerButton>
          </Footer>
        </Dialog>
      )}

      {/* --------------------------------------------------------- whitelist */}
      {showWhitelistModal && selectedStudent && (
        <Dialog id="whitelist-title" title="Request whitelist" onClose={onCloseWhitelist}>
          <div className="px-5 py-4">
            <p className="text-spc-xs text-spc-body mb-4">
              Submit a request to the Super Admin to whitelist{' '}
              <span className="font-bold text-spc-ink tabular-nums">{selectedStudent.prn}</span>.
            </p>
            <FieldLabel htmlFor="whitelist-reason">Reason for the request</FieldLabel>
            <textarea
              id="whitelist-reason"
              rows="4"
              value={whitelistReason}
              onChange={onWhitelistReasonChange}
              placeholder="Please explain why this student should be whitelisted…"
              className={`${FIELD_CLASS} py-2 h-auto`}
            />
          </div>
          <Footer>
            <SecondaryButton onClick={onCloseWhitelist}>Cancel</SecondaryButton>
            <PrimaryButton onClick={onConfirmWhitelist}>Submit request</PrimaryButton>
          </Footer>
        </Dialog>
      )}

      {/* ------------------------------------------------------ cgpa unlock */}
      {showCgpaUnlockModal && (
        <UnlockDialog
          id="cgpa-unlock-title"
          title="Open CGPA editing"
          description="Students will be able to edit their CGPA for this many days, then it locks again automatically."
          days={unlockDays}
          onDaysChange={onUnlockDaysChange}
          reason={unlockReason}
          onReasonChange={onUnlockReasonChange}
          reasonPlaceholder="Semester results update"
          processing={cgpaProcessing}
          onConfirm={onConfirmCgpaUnlock}
          onClose={onCloseCgpaUnlock}
        />
      )}

      {/* --------------------------------------------------- backlog unlock */}
      {showBacklogUnlockModal && (
        <UnlockDialog
          id="backlog-unlock-title"
          title="Open backlog editing"
          description="Students will be able to edit their backlogs for this many days, then it locks again automatically."
          days={backlogUnlockDays}
          onDaysChange={onBacklogUnlockDaysChange}
          reason={backlogUnlockReason}
          onReasonChange={onBacklogUnlockReasonChange}
          reasonPlaceholder="Exam results update"
          processing={backlogProcessing}
          onConfirm={onConfirmBacklogUnlock}
          onClose={onCloseBacklogUnlock}
        />
      )}
    </>
  );
}

/**
 * CGPA and backlog unlock are the same dialog with different words, so they are
 * one component. The 1–30 day bound matches the check the handlers already do.
 */
function UnlockDialog({
  id, title, description, days, onDaysChange, reason, onReasonChange,
  reasonPlaceholder, processing, onConfirm, onClose,
}) {
  return (
    <Dialog id={id} title={title} onClose={onClose}>
      <div className="px-5 py-4">
        <p className="text-spc-xs text-spc-body mb-4">{description}</p>

        <div className="mb-4">
          <FieldLabel htmlFor={`${id}-days`}>Duration (days)</FieldLabel>
          <input
            id={`${id}-days`}
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={onDaysChange}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <FieldLabel htmlFor={`${id}-reason`}>Reason (optional)</FieldLabel>
          <input
            id={`${id}-reason`}
            type="text"
            value={reason}
            onChange={onReasonChange}
            placeholder={reasonPlaceholder}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <Footer>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onConfirm} disabled={processing}>
          {processing ? 'Opening…' : 'Open for editing'}
        </PrimaryButton>
      </Footer>
    </Dialog>
  );
}

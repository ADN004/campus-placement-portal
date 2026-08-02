import { Building2, X } from 'lucide-react';
import Modal from '../../Modal';
import { StepRail } from './applyShared';

/**
 * The three device shells for the apply flow.
 *
 *   phone   : full-screen sheet. The old dialog was one long scroll with the
 *             buttons at the very bottom, so on a job needing three profile
 *             sections the student had to scroll past all of them to find
 *             Submit. Here the header and the actions are pinned and only the
 *             middle scrolls.
 *   tablet  : centred dialog, same pinned header/footer, roomier padding.
 *   desktop : centred dialog with a teal identity header and right-aligned
 *             actions, which is what a desktop dialog is expected to look like.
 *
 * `body` is the step content, built by SmartApplicationModal from applyShared.
 * All three receive the same props and call the same handlers.
 */

/* ------------------------------------------------------------------ bits */

function JobIdentity({ job, size = 'base', onTeal = false }) {
  return (
    <div className="min-w-0">
      <p
        className={`text-spc-label font-bold uppercase truncate ${
          onTeal ? 'text-spc-on-teal-dim' : 'text-spc-muted'
        }`}
      >
        {job.company_name}
      </p>
      <h2
        id="smart-apply-title"
        className={`font-extrabold leading-tight mt-0.5 ${
          size === 'lg' ? 'text-spc-h1-lg' : 'text-spc-h1'
        } ${onTeal ? 'text-spc-on-teal' : 'text-spc-ink'}`}
      >
        {job.title}
      </h2>
    </div>
  );
}

function CloseButton({ onClose, onTeal = false }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={`w-11 h-11 -mr-1.5 rounded-spc-sm flex items-center justify-center flex-shrink-0 transition-colors ${
        onTeal
          ? 'text-spc-on-teal-dim hover:text-spc-on-teal hover:bg-spc-on-teal/15'
          : 'text-spc-muted hover:text-spc-ink hover:bg-spc-surface-2'
      }`}
    >
      <X size={21} />
    </button>
  );
}

const primaryClass =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm ' +
  'bg-spc-teal text-spc-on-teal text-spc-sm font-bold transition-opacity ' +
  'hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed';

const secondaryClass =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm ' +
  'bg-spc-surface text-spc-body text-spc-sm font-bold border border-spc-line-strong ' +
  'transition-colors hover:bg-spc-surface-2 disabled:opacity-45 disabled:cursor-not-allowed';

/* ----------------------------------------------------------------- phone */

export function MobileApply({ job, body, flow, currentStep, primary, secondary, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="smart-apply-title"
      overlayClassName="fixed inset-0 z-50 bg-spc-ink/55"
      panelClassName="spc-sheet-full fixed inset-0 bg-spc-ground flex flex-col outline-none"
    >
      <header className="flex-shrink-0 bg-spc-surface border-b border-spc-line px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <JobIdentity job={job} />
          <CloseButton onClose={onClose} />
        </div>
        {flow && (
          <div className="mt-3">
            <StepRail flow={flow} currentStep={currentStep} />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">{body}</div>

      <footer
        className="flex-shrink-0 bg-spc-surface border-t border-spc-line px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col gap-2.5">
          {primary && (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              className={`${primaryClass} w-full`}
            >
              {primary.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={secondary.disabled}
            className={`${secondaryClass} w-full`}
          >
            {secondary.label}
          </button>
        </div>
      </footer>
    </Modal>
  );
}

/* ---------------------------------------------------------------- tablet */

export function TabletApply({ job, body, flow, currentStep, primary, secondary, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="smart-apply-title"
      overlayClassName="fixed inset-0 z-50 bg-spc-ink/55 backdrop-blur-sm flex items-center justify-center p-6"
      panelClassName="spc-dialog-h w-full max-w-2xl bg-spc-ground rounded-spc-lg border border-spc-line shadow-2xl flex flex-col overflow-hidden outline-none"
    >
      <header className="flex-shrink-0 bg-spc-surface border-b border-spc-line px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-11 h-11 rounded-spc bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
              <Building2 size={21} className="text-spc-teal" />
            </span>
            <JobIdentity job={job} />
          </div>
          <CloseButton onClose={onClose} />
        </div>
        {flow && (
          <div className="mt-4">
            <StepRail flow={flow} currentStep={currentStep} />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">{body}</div>

      <footer className="flex-shrink-0 bg-spc-surface border-t border-spc-line px-6 py-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={secondary.disabled}
            className={`${secondaryClass} flex-1`}
          >
            {secondary.label}
          </button>
          {primary && (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              className={`${primaryClass} flex-1`}
            >
              {primary.label}
            </button>
          )}
        </div>
      </footer>
    </Modal>
  );
}

/* --------------------------------------------------------------- desktop */

export function DesktopApply({ job, body, flow, currentStep, primary, secondary, onClose }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="smart-apply-title"
      overlayClassName="fixed inset-0 z-50 bg-spc-ink/55 backdrop-blur-sm flex items-center justify-center p-8"
      panelClassName="spc-dialog-h w-full max-w-3xl bg-spc-ground rounded-spc-lg shadow-2xl flex flex-col overflow-hidden outline-none"
    >
      {/* Teal band — on desktop the dialog floats free of the page, so it needs
          its own identity rather than borrowing the page's white. */}
      <header className="flex-shrink-0 bg-spc-teal px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <span className="w-12 h-12 rounded-spc bg-spc-on-teal/15 flex items-center justify-center flex-shrink-0">
              <Building2 size={23} className="text-spc-on-teal" />
            </span>
            <JobIdentity job={job} size="lg" onTeal />
          </div>
          <CloseButton onClose={onClose} onTeal />
        </div>
      </header>

      {flow && (
        <div className="flex-shrink-0 bg-spc-surface border-b border-spc-line px-8 py-3">
          <StepRail flow={flow} currentStep={currentStep} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-7">{body}</div>

      <footer className="flex-shrink-0 bg-spc-surface border-t border-spc-line px-8 py-4">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={secondary.disabled}
            className={`${secondaryClass} min-w-[120px]`}
          >
            {secondary.label}
          </button>
          {primary && (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              className={`${primaryClass} min-w-[190px]`}
            >
              {primary.label}
            </button>
          )}
        </div>
      </footer>
    </Modal>
  );
}

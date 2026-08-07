import Modal from '../../../components/Modal';
import { ExternalLink } from 'lucide-react';
import { SecondaryButton, formatDate } from '../../../components/officer/OfficerUI';
import { RequestStatus } from './jobRequestShared';

/**
 * The two dialogs on CreateJobRequest: the create form's shell, and the
 * read-only detail view of a submitted request.
 *
 * Both go through components/Modal.jsx — focus trap, Escape, body scroll lock,
 * focus restored to whatever opened them. The originals were hand-rolled
 * overlays that trapped nothing.
 */

const PANEL =
  'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-3xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

function Dialog({ id, title, subtitle, onClose, children }) {
  return (
    <Modal
      onClose={onClose}
      labelledBy={id}
      panelClassName={PANEL}
      overlayClassName={OVERLAY}
      closeOnBackdrop
    >
      <div className="px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
        <h2 id={id} className="text-spc-h2 font-bold text-spc-ink break-words">{title}</h2>
        {subtitle && <p className="text-spc-xs text-spc-muted mt-0.5 break-words">{subtitle}</p>}
      </div>
      {children}
    </Modal>
  );
}

/** The create form, in a dialog. The form itself is JobRequestForm. */
export function CreateRequestModal({ onClose, children }) {
  return (
    <Dialog
      id="create-request-title"
      title="New job request"
      subtitle="A request for your own college publishes immediately; anything wider goes to the Super Admin."
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto spc-scroll-contain">{children}</div>
    </Dialog>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</p>
      <div className="text-spc-sm text-spc-ink mt-0.5 break-words">{children}</div>
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

/** Read-only view of a submitted request and what became of it. */
export function RequestDetailsModal({ request, onClose }) {
  const backlogRule = () => {
    if (request.max_backlogs === 0) return 'No backlogs';
    const sems =
      Array.isArray(request.allowed_backlog_semesters) && request.allowed_backlog_semesters.length > 0
        ? request.allowed_backlog_semesters
        : null;
    return sems
      ? `Max ${request.max_backlogs} in Sem ${sems.join(', ')}`
      : `Max ${request.max_backlogs} (any semester)`;
  };

  return (
    <Dialog
      id="request-details-title"
      title={request.job_title}
      subtitle={request.company_name}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4">
        <Section title="Status">
          <RequestStatus status={request.status} jobDeleted={request.job_exists === false} />
          {/* The outcome the officer most needs, said plainly rather than left
              to a badge colour. */}
          {request.status === 'rejected' && request.review_comment && (
            <div className="mt-3 rounded-spc-control bg-spc-bad-bg p-3">
              <p className="text-spc-xs font-bold text-spc-ink">Why it was rejected</p>
              <p className="text-spc-xs text-spc-body mt-1 whitespace-pre-wrap">
                {request.review_comment}
              </p>
            </div>
          )}
          {request.job_exists === false && (
            <div className="mt-3 rounded-spc-control bg-spc-warn-bg p-3">
              <p className="text-spc-xs font-bold text-spc-ink">The job was deleted</p>
              <p className="text-spc-xs text-spc-body mt-1">
                This request was approved, but the job created from it has since been removed, so
                students can no longer see or apply to it.
              </p>
            </div>
          )}
        </Section>

        <Section title="Role">
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Location">{request.location || '–'}</Fact>
            <Fact label="Salary">
              {request.salary_range ? `${request.salary_range} LPA` : '–'}
            </Fact>
            <Fact label="Vacancies">
              <span className="tabular-nums">{request.no_of_vacancies || '–'}</span>
            </Fact>
            <Fact label="Deadline">
              <span className="tabular-nums">{formatDate(request.application_deadline)}</span>
            </Fact>
          </div>
          {request.application_form_url && (
            <div className="mt-3">
              <a
                href={request.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
                  text-spc-accent hover:underline underline-offset-4 break-all"
              >
                <ExternalLink size={14} aria-hidden="true" />
                <span>Open the application form</span>
              </a>
            </div>
          )}
        </Section>

        <Section title="Description">
          <p className="text-spc-xs text-spc-body whitespace-pre-wrap leading-relaxed">
            {request.job_description}
          </p>
        </Section>

        {(request.min_cgpa || (request.max_backlogs !== null && request.max_backlogs !== undefined)) && (
          <Section title="Eligibility">
            <div className="grid grid-cols-2 gap-4">
              {request.min_cgpa && (
                <Fact label="Minimum CGPA">
                  <span className="tabular-nums font-bold">{request.min_cgpa}</span>
                </Fact>
              )}
              {request.max_backlogs !== null && request.max_backlogs !== undefined && (
                <Fact label="Backlogs">{backlogRule()}</Fact>
              )}
            </div>
          </Section>
        )}

        {Array.isArray(request.allowed_branches) && request.allowed_branches.length > 0 && (
          <Section title={`Allowed branches (${request.allowed_branches.length})`}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {request.allowed_branches.map((branch) => (
                <li key={branch} className="text-spc-xs text-spc-body py-1 break-words">
                  {branch}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <div className="flex items-center justify-end px-5 py-4 border-t border-spc-line flex-shrink-0">
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </div>
    </Dialog>
  );
}

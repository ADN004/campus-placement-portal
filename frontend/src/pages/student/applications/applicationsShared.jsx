import { CheckCircle, Clock, XCircle, Award, X, Calendar } from 'lucide-react';
import Modal from '../../../components/Modal';
import { formatPackage } from '../../../components/student/StudentUI';

/**
 * Pieces shared by the three StudentApplications presenters.
 *
 * All presentation. Every filter predicate, handler and piece of state stays in
 * the StudentApplications container.
 */

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Longer form used inside the detail modal, where the time matters. */
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ status */

/**
 * One status map for the whole page. Previously the list and the modal each had
 * their own copy, and the modal's was missing `selected` entirely — a selected
 * application fell through to a plain grey chip there while the table showed it
 * properly. Sharing the map means that can't happen again.
 *
 * `selected` is the only filled chip: it is the outcome that matters most, and
 * filling it makes it findable at a glance in a long list.
 */
const STATUS_META = {
  pending: { label: 'Pending', Icon: Clock, classes: 'bg-spc-warn-bg text-spc-warn' },
  shortlisted: { label: 'Shortlisted', Icon: CheckCircle, classes: 'bg-spc-ok-bg text-spc-ok' },
  selected: { label: 'Selected', Icon: Award, classes: 'bg-spc-teal text-spc-on-teal' },
  rejected: { label: 'Rejected', Icon: XCircle, classes: 'bg-spc-bad-bg text-spc-bad' },
};

export function StatusPill({ status, size = 'sm' }) {
  const dims = size === 'md' ? 'text-spc-xs px-3 py-1.5 gap-1.5' : 'text-xs px-2.5 py-1.5 gap-1.5';
  const meta = STATUS_META[status];

  if (!meta) {
    return (
      <span className={`inline-flex items-center rounded-spc-sm font-bold bg-spc-surface-2 text-spc-body ${dims}`}>
        {status}
      </span>
    );
  }

  const { label, Icon, classes } = meta;
  return (
    <span className={`inline-flex items-center rounded-spc-sm font-bold ${classes} ${dims}`}>
      <Icon size={size === 'md' ? 15 : 13} />
      <span>{label}</span>
    </span>
  );
}

/** The one-line summary shown beside the status inside the detail modal. */
const STATUS_NOTE = {
  shortlisted: 'Congratulations — you have been shortlisted for this position.',
  selected: 'Congratulations — you have been selected for this position.',
  rejected: 'Unfortunately, your application was not selected for this position.',
  pending: 'Your application is under review.',
};

/* -------------------------------------------------------------- list card */

export function ApplicationCard({ application, onViewDetails, size = 'sm' }) {
  const pad = size === 'lg' ? 'p-5' : 'p-4';
  const heading = size === 'sm' ? 'text-spc-h3' : 'text-spc-h2';

  return (
    <div
      className={`flex flex-col h-full rounded-spc bg-spc-surface border border-spc-line ${pad}
        hover:border-spc-line-strong transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${heading} font-bold text-spc-ink leading-tight break-words`}>
            {application.company_name}
          </p>
          <p className="text-spc-xs text-spc-muted mt-0.5 break-words">{application.job_title}</p>
        </div>
        <div className="flex-shrink-0">
          <StatusPill status={application.status} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-auto pt-4">
        <span className="text-xs text-spc-muted font-semibold">
          Applied {formatDate(application.applied_at)}
        </span>
        <button
          onClick={() => onViewDetails(application)}
          className="min-h-[44px] px-4 rounded-spc-sm bg-spc-surface text-spc-ink
            border border-spc-line-strong text-spc-xs font-bold
            hover:bg-spc-surface-2 active:scale-[0.99] transition-all"
        >
          View
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ details modal */

export function ApplicationDetailsModal({ application, onClose }) {
  const note = STATUS_NOTE[application.status];

  return (
    <Modal
      onClose={onClose}
      labelledBy="app-details-title"
      overlayClassName="fixed inset-0 bg-spc-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      panelClassName="w-full max-w-3xl"
    >
      <div
        className="w-full max-h-[92vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain
          bg-spc-surface rounded-t-spc-lg sm:rounded-spc-lg border border-spc-line"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-spc-surface border-b border-spc-line px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="app-details-title" className="text-spc-h1 font-extrabold text-spc-ink break-words">
              {application.company_name}
            </h2>
            <p className="text-spc-sm text-spc-muted mt-0.5 break-words">{application.job_title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 w-10 h-10 rounded-spc-sm flex items-center justify-center
              text-spc-muted hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Status */}
          <section>
            <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">Status</h3>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={application.status} size="md" />
              {note && <p className="text-spc-sm text-spc-body">{note}</p>}
            </div>
          </section>

          {/* Role facts */}
          {(application.location || application.salary_package) && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">Role</h3>
              <div className="flex flex-wrap gap-2">
                {application.location && (
                  <span className="inline-flex items-center rounded-spc-sm bg-spc-surface-2 text-spc-body text-xs font-semibold px-2.5 py-1.5">
                    {application.location}
                  </span>
                )}
                {application.salary_package && (
                  <span className="inline-flex items-center rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1.5">
                    ₹{formatPackage(application.salary_package)}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">Timeline</h3>
            <div className="rounded-spc bg-spc-surface-2 divide-y divide-spc-line">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Calendar size={16} className="text-spc-muted flex-shrink-0" />
                <span className="text-spc-xs text-spc-muted font-semibold">Applied</span>
                <span className="text-spc-xs font-bold text-spc-ink ml-auto text-right">
                  {formatDateTime(application.applied_at)}
                </span>
              </div>
              {application.updated_at && application.updated_at !== application.applied_at && (
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <Calendar size={16} className="text-spc-muted flex-shrink-0" />
                  <span className="text-spc-xs text-spc-muted font-semibold">Last updated</span>
                  <span className="text-spc-xs font-bold text-spc-ink ml-auto text-right">
                    {formatDateTime(application.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Description */}
          {application.description && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
                Job description
              </h3>
              <p className="text-spc-sm text-spc-body whitespace-pre-wrap leading-relaxed">
                {application.description}
              </p>
            </section>
          )}

          {/* Eligibility */}
          {(application.min_cgpa || application.max_backlogs !== null) && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
                Eligibility criteria
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {application.min_cgpa && (
                  <div className="rounded-spc bg-spc-surface border border-spc-line p-4">
                    <p className="text-spc-label font-bold uppercase text-spc-muted">Minimum CGPA</p>
                    <p className="text-spc-metric font-extrabold text-spc-ink mt-1">
                      {application.min_cgpa}
                    </p>
                  </div>
                )}
                {application.max_backlogs !== null && application.max_backlogs !== undefined && (
                  <div className="rounded-spc bg-spc-surface border border-spc-line p-4">
                    <p className="text-spc-label font-bold uppercase text-spc-muted">Backlogs</p>
                    <p className="text-spc-h2 font-bold text-spc-ink mt-1">
                      {application.max_backlogs === 0
                        ? 'None allowed'
                        : application.backlog_max_semester
                        ? `Max ${application.max_backlogs} within Sem 1–${application.backlog_max_semester}`
                        : `Max ${application.max_backlogs}`}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* External form */}
          {application.application_form_url && (
            <section className="rounded-spc bg-spc-teal-soft p-4">
              <p className="text-spc-sm font-bold text-spc-ink">Application form</p>
              <a
                href={application.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 min-h-[44px] px-4 rounded-spc-sm
                  bg-spc-teal text-spc-on-teal text-spc-xs font-bold hover:opacity-95 transition-opacity"
              >
                View application form
              </a>
            </section>
          )}

          {/* Notes */}
          {application.notes && (
            <section className="rounded-spc bg-spc-warn-bg p-4">
              <h3 className="text-spc-label font-bold uppercase text-spc-warn mb-1.5">Notes</h3>
              <p className="text-spc-sm text-spc-body whitespace-pre-wrap">{application.notes}</p>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 bg-spc-surface border-t border-spc-line px-5 sm:px-6 py-4">
          <button
            onClick={onClose}
            className="w-full min-h-[48px] rounded-spc-sm bg-spc-surface text-spc-ink
              border border-spc-line-strong text-spc-sm font-bold hover:bg-spc-surface-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

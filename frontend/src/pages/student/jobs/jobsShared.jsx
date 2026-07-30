import {
  Briefcase,
  Building2,
  CheckCircle,
  XCircle,
  Calendar,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import Modal from '../../../components/Modal';

/**
 * Pieces shared by the three StudentJobs presenters.
 *
 * All presentation. Every filter predicate, handler and piece of state stays in
 * the StudentJobs container — these components only render what they are given.
 */

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isDeadlinePassed(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

/**
 * The Apply button's label, which encodes why it is disabled. Same four
 * outcomes and same precedence as before.
 */
export function applyButtonLabel(job, deadlinePassed) {
  if (job.has_applied) return 'Applied';
  if (deadlinePassed) return 'Deadline passed';
  if (!job.is_active) return 'Inactive';
  return 'Apply';
}

export function isApplyDisabled(job, deadlinePassed) {
  return job.has_applied || deadlinePassed || !job.is_active;
}

/* ------------------------------------------------------------------ badges */

export function JobBadges({ job, deadlinePassed }) {
  return (
    <div className="flex flex-wrap gap-2">
      {job.has_applied && (
        <span className="inline-flex items-center rounded-spc-sm bg-spc-teal-soft text-spc-teal text-xs font-bold px-2.5 py-1">
          Applied
        </span>
      )}
      {!job.is_active && (
        <span className="inline-flex items-center rounded-spc-sm bg-spc-surface-2 text-spc-muted text-xs font-bold px-2.5 py-1">
          Inactive
        </span>
      )}
      {deadlinePassed && !job.has_applied ? (
        <span className="inline-flex items-center rounded-spc-sm bg-spc-warn-bg text-spc-warn text-xs font-bold px-2.5 py-1">
          Missed opportunity
        </span>
      ) : job.is_eligible ? (
        <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-xs font-bold px-2.5 py-1">
          <CheckCircle size={12} />
          <span>Eligible</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-spc-sm bg-spc-warn-bg text-spc-warn text-xs font-bold px-2.5 py-1">
          <XCircle size={12} />
          <span>Not eligible</span>
        </span>
      )}
    </div>
  );
}

/** Location / package / deadline, as chips. */
export function JobFacts({ job, className = '' }) {
  if (!job.location && !job.salary_package && !job.application_deadline) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {job.location && <Fact>{job.location}</Fact>}
      {job.salary_package && <Fact strong>{job.salary_package} LPA</Fact>}
      {job.application_deadline && <Fact>{formatDate(job.application_deadline)}</Fact>}
    </div>
  );
}

function Fact({ children, strong }) {
  return (
    <span
      className={`inline-flex items-center rounded-spc-sm px-2.5 py-1.5 text-xs font-semibold
        ${strong ? 'bg-spc-teal-soft text-spc-teal' : 'bg-spc-surface-2 text-spc-body'}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- search bar */

export function SearchField({ value, onChange, size = 'md' }) {
  const pad = size === 'lg' ? 'py-3.5 text-spc-body' : 'py-3 text-spc-sm';
  return (
    <div className="relative">
      <Search
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder="Search by company, title, or location…"
        value={value}
        onChange={onChange}
        className={`w-full min-h-[48px] pl-11 pr-4 ${pad} rounded-spc-sm bg-spc-surface
          border border-spc-line-strong text-spc-ink placeholder:text-spc-muted
          outline-none focus:border-spc-teal focus:ring-2 focus:ring-spc-teal/25 transition-colors`}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- filters */

/**
 * Filter chips. `scroll` lays them out in one horizontally scrollable row for
 * phones — contained, so the page itself never scrolls sideways.
 */
export function FilterChips({ filters, active, onChange, scroll = false }) {
  const wrap = scroll
    ? 'flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    : 'flex flex-wrap gap-2';

  return (
    <div className={wrap} role="group" aria-label="Filter jobs">
      {filters.map((filter) => {
        const isActive = active === filter.key;
        return (
          <button
            key={filter.key}
            onClick={() => onChange(filter.key)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-spc-sm
              text-spc-xs font-bold whitespace-nowrap flex-shrink-0 transition-colors
              ${isActive
                ? 'bg-spc-teal text-spc-on-teal'
                : 'bg-spc-surface text-spc-body border border-spc-line-strong hover:bg-spc-surface-2'}`}
          >
            <span>{filter.label}</span>
            <span
              className={`tabular-nums font-extrabold ${
                isActive ? 'text-spc-on-teal-dim' : 'text-spc-muted'
              }`}
            >
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- job card */

/**
 * A job in the list. Shared across devices deliberately: what changes per
 * device is the grid around it and the page header, not what a job *is*. Only
 * padding and heading size vary, via `size`.
 */
export function JobCard({ job, onViewDetails, onApply, size = 'sm' }) {
  const deadlinePassed = isDeadlinePassed(job.application_deadline);
  const disabled = isApplyDisabled(job, deadlinePassed);

  const pad = size === 'lg' ? 'p-5' : 'p-4';
  const heading = size === 'sm' ? 'text-spc-h3' : 'text-spc-h2';

  return (
    <div
      className={`flex flex-col h-full rounded-spc bg-spc-surface border border-spc-line ${pad}
        hover:border-spc-line-strong transition-colors`}
    >
      <p className={`${heading} font-bold text-spc-ink leading-tight break-words`}>
        {job.company_name}
      </p>
      <p className="text-spc-xs text-spc-muted mt-0.5 break-words">{job.title}</p>

      <div className="mt-3">
        <JobBadges job={job} deadlinePassed={deadlinePassed} />
      </div>

      <JobFacts job={job} className="mt-3" />

      <div className="flex gap-2.5 mt-auto pt-4">
        <button
          onClick={() => onViewDetails(job)}
          className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-surface text-spc-ink
            border border-spc-line-strong text-spc-xs font-bold
            hover:bg-spc-surface-2 active:scale-[0.99] transition-all"
        >
          Details
        </button>
        <button
          onClick={() => onApply(job)}
          disabled={disabled}
          className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-teal text-spc-on-teal
            text-spc-xs font-bold hover:opacity-95 active:scale-[0.99] transition-all
            disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:opacity-45"
        >
          {applyButtonLabel(job, deadlinePassed)}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ empty/error */

export function JobsEmptyState({ filtered }) {
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line px-6 py-16 text-center">
      <span className="w-12 h-12 rounded-spc-sm bg-spc-teal-soft inline-flex items-center justify-center mb-4">
        <Briefcase className="text-spc-teal" size={22} />
      </span>
      <p className="text-spc-h2 font-bold text-spc-ink">
        {filtered ? 'No jobs match your filters' : 'No jobs available at the moment'}
      </p>
      <p className="text-spc-sm text-spc-muted mt-1.5">
        {filtered ? 'Try a different filter or clear your search.' : 'Check back later for new opportunities.'}
      </p>
    </div>
  );
}

export function JobsErrorState({ error }) {
  const pending = error.type === 'pending';
  return (
    <div className="rounded-spc bg-spc-surface border border-spc-line px-6 py-16 text-center">
      <span
        className={`w-12 h-12 rounded-spc-sm inline-flex items-center justify-center mb-4
          ${pending ? 'bg-spc-warn-bg' : 'bg-spc-bad-bg'}`}
      >
        <Briefcase className={pending ? 'text-spc-warn' : 'text-spc-bad'} size={22} />
      </span>
      <h2 className="text-spc-h1 font-bold text-spc-ink">{error.title}</h2>
      <p className="text-spc-sm text-spc-muted mt-2 max-w-[52ch] mx-auto">{error.message}</p>
      {pending && (
        <p className="mt-6 rounded-spc bg-spc-warn-bg text-spc-body text-spc-sm p-4 max-w-[56ch] mx-auto">
          Please wait for your placement officer to approve your registration. You&apos;ll be able to
          view and apply for jobs once approved.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ details modal */

/**
 * Full job detail. One responsive implementation rather than three — a modal is
 * a constrained viewport by nature, so it reflows rather than being relaid out.
 */
export function JobDetailsModal({ job, onClose, onApply }) {
  const deadlinePassed = isDeadlinePassed(job.application_deadline);

  const branches = job.allowed_branches
    ? Array.isArray(job.allowed_branches)
      ? job.allowed_branches
      : typeof job.allowed_branches === 'string'
      ? JSON.parse(job.allowed_branches)
      : []
    : [];

  return (
    <Modal
      onClose={onClose}
      labelledBy="job-details-title"
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
            <h2 id="job-details-title" className="text-spc-h1 font-extrabold text-spc-ink break-words">
              {job.title}
            </h2>
            <p className="text-spc-sm text-spc-muted mt-0.5 break-words">{job.company_name}</p>
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
          <div className="flex flex-wrap gap-2">
            {job.has_applied && (
              <span className="inline-flex items-center rounded-spc-sm bg-spc-teal-soft text-spc-teal text-spc-xs font-bold px-3 py-1.5">
                You have applied
              </span>
            )}
            {job.is_eligible ? (
              <span className="inline-flex items-center gap-1.5 rounded-spc-sm bg-spc-ok-bg text-spc-ok text-spc-xs font-bold px-3 py-1.5">
                <CheckCircle size={14} />
                <span>You are eligible</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-spc-sm bg-spc-bad-bg text-spc-bad text-spc-xs font-bold px-3 py-1.5">
                <XCircle size={14} />
                <span>Not eligible</span>
              </span>
            )}
            {deadlinePassed && (
              <span className="inline-flex items-center rounded-spc-sm bg-spc-bad-bg text-spc-bad text-spc-xs font-bold px-3 py-1.5">
                Deadline passed
              </span>
            )}
          </div>

          {/* Company facts */}
          <div className="rounded-spc bg-spc-surface-2 p-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-spc-sm bg-spc-teal-soft flex items-center justify-center flex-shrink-0">
                <Building2 className="text-spc-teal" size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-spc-h3 font-bold text-spc-ink break-words">{job.company_name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.location && <Fact>{job.location}</Fact>}
                  {job.salary_package && <Fact strong>{job.salary_package} LPA</Fact>}
                  {job.no_of_vacancies && <Fact>{job.no_of_vacancies} vacancies</Fact>}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
                Job description
              </h3>
              <p className="text-spc-sm text-spc-body whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </section>
          )}

          {/* Eligibility */}
          <section>
            <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
              Eligibility criteria
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {job.min_cgpa && (
                <div className="rounded-spc bg-spc-surface border border-spc-line p-4">
                  <p className="text-spc-label font-bold uppercase text-spc-muted">Minimum CGPA</p>
                  <p className="text-spc-metric font-extrabold text-spc-ink mt-1">{job.min_cgpa}</p>
                </div>
              )}
              {job.max_backlogs !== null && job.max_backlogs !== undefined && (
                <div className="rounded-spc bg-spc-surface border border-spc-line p-4">
                  <p className="text-spc-label font-bold uppercase text-spc-muted">Backlogs</p>
                  <p className="text-spc-h2 font-bold text-spc-ink mt-1">
                    {job.max_backlogs === 0
                      ? 'None allowed'
                      : job.backlog_max_semester
                      ? `Max ${job.max_backlogs} within Sem 1–${job.backlog_max_semester}`
                      : `Max ${job.max_backlogs}`}
                  </p>
                </div>
              )}
            </div>

            {!job.is_eligible && job.eligibility_reason && (
              <div className="mt-3 rounded-spc bg-spc-bad-bg p-4">
                <p className="text-spc-label font-bold uppercase text-spc-bad">
                  Why you&apos;re not eligible
                </p>
                <p className="text-spc-sm text-spc-body mt-1">{job.eligibility_reason}</p>
              </div>
            )}
          </section>

          {/* Branches */}
          {branches.length > 0 && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
                Allowed branches
              </h3>
              <div className="flex flex-wrap gap-2">
                {branches.map((branch, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-spc-sm bg-spc-surface-2 text-spc-body text-xs font-semibold px-2.5 py-1.5"
                  >
                    {branch}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Deadline */}
          {job.application_deadline && (
            <section>
              <h3 className="text-spc-label font-bold uppercase text-spc-muted mb-2">
                Application deadline
              </h3>
              <p className="inline-flex items-center gap-2 rounded-spc-sm bg-spc-surface-2 px-3 py-2 text-spc-sm font-bold text-spc-ink">
                <Calendar size={16} className="text-spc-muted" />
                {formatDate(job.application_deadline)}
              </p>
            </section>
          )}

          {/* External form */}
          {job.application_form_url && (
            <section className="rounded-spc bg-spc-teal-soft p-4">
              <p className="text-spc-sm font-bold text-spc-ink">
                This job requires an external application form.
              </p>
              <a
                href={job.application_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 min-h-[44px] px-4 rounded-spc-sm
                  bg-spc-teal text-spc-on-teal text-spc-xs font-bold hover:opacity-95 transition-opacity"
              >
                <ExternalLink size={16} />
                <span>Open application form</span>
              </a>
            </section>
          )}
        </div>

        {/* Actions — pinned so Apply is always reachable on a long description */}
        <div className="sticky bottom-0 bg-spc-surface border-t border-spc-line px-5 sm:px-6 py-4 flex gap-3">
          {!job.has_applied && !deadlinePassed && job.is_active && (
            <button
              onClick={onApply}
              className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-teal text-spc-on-teal
                text-spc-sm font-bold hover:opacity-95 transition-opacity"
            >
              Apply now
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-spc-sm bg-spc-surface text-spc-ink
              border border-spc-line-strong text-spc-sm font-bold hover:bg-spc-surface-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

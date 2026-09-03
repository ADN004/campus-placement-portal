import { Check, X, ExternalLink } from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, EmptyState,
  PrimaryButton, DangerButton, formatDate,
} from '../../../components/admin/AdminUI';

/**
 * Job requests waiting on a decision, at every width.
 *
 * An officer has asked for a drive to be posted; this is where it is approved or
 * refused. The page it replaces showed each request as a shadowed card on an
 * orange gradient, with the criteria buried in it. What matters when deciding is
 * who asked, what the job is, and who it would reach — so those lead, and the
 * eligibility rules sit under them as plain facts.
 */

/** One eligibility rule as a labelled fact rather than a coloured pill. */
function Criterion({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body">{label}</p>
      <p className="text-spc-sm text-spc-ink break-words">{value}</p>
    </div>
  );
}

/** Who the drive would be open to, in words rather than ids. */
function audienceOf(request) {
  if (request.target_type === 'all' || !request.target_type) return 'Every college';
  if (request.target_type === 'region') {
    const count = (request.target_regions || []).length;
    return `${count} ${count === 1 ? 'region' : 'regions'}`;
  }
  if (request.target_type === 'college') {
    const count = (request.target_colleges || []).length;
    return `${count} ${count === 1 ? 'college' : 'colleges'}`;
  }
  return 'Specific students';
}

/** The extended-profile sections this drive would require a student to complete. */
const REQUIREMENTS = [
  ['requires_academic_extended', 'Academic details'],
  ['requires_physical_details', 'Physical details'],
  ['requires_family_details', 'Family details'],
  ['requires_document_verification', 'Documents'],
  ['requires_education_preferences', 'Education preferences'],
  ['requires_personal_details', 'Personal details'],
];

function RequestCard({ layout, request, onApprove, onReject }) {
  const columns = layout === 'desktop' ? 'sm:grid-cols-4' : 'sm:grid-cols-2';
  const required = REQUIREMENTS.filter(([key]) => request[key]).map(([, label]) => label);

  return (
    <Panel className="overflow-hidden">
      <PanelHeading
        action={(
          <div className="flex items-center gap-2">
            <DangerButton onClick={() => onReject(request)}>
              <X size={15} aria-hidden="true" />
              Reject
            </DangerButton>
            <PrimaryButton onClick={() => onApprove(request)}>
              <Check size={15} aria-hidden="true" />
              Approve
            </PrimaryButton>
          </div>
        )}
      >
        <span className="block min-w-0">
          <span className="block text-spc-sm font-bold text-spc-ink break-words">
            {request.job_title}
          </span>
          <span className="block text-spc-xs font-normal text-spc-body break-words">
            {request.company_name}
          </span>
        </span>
      </PanelHeading>

      <div className="p-4">
        <p className="text-spc-xs text-spc-body mb-3">
          Asked for by <span className="font-bold text-spc-ink">{request.officer_name}</span>
          {' · '}{request.college_name}
          {' · '}requested {formatDate(request.created_at)}
        </p>

        <div className={`grid grid-cols-2 ${columns} gap-3 mb-3`}>
          <Criterion label="Reaches" value={audienceOf(request)} />
          <Criterion
            label="Min CGPA"
            value={request.min_cgpa ? String(request.min_cgpa) : 'No bar'}
          />
          <Criterion
            label="Max backlogs"
            value={request.max_backlogs !== null && request.max_backlogs !== undefined
              ? String(request.max_backlogs) : 'No bar'}
          />
          <Criterion label="Closes" value={formatDate(request.application_deadline)} />
        </div>

        <div className={`grid grid-cols-2 ${columns} gap-3`}>
          {request.location && <Criterion label="Location" value={request.location} />}
          {request.no_of_vacancies && (
            <Criterion label="Vacancies" value={String(request.no_of_vacancies)} />
          )}
          {request.salary_range && <Criterion label="Package" value={request.salary_range} />}
          {request.allowed_branches?.length > 0 && (
            <Criterion label="Branches" value={`${request.allowed_branches.length} allowed`} />
          )}
        </div>

        {request.job_description && (
          <div className="mt-3 pt-3 border-t border-spc-line">
            <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1">
              About the job
            </p>
            <p className="text-spc-xs text-spc-body break-words whitespace-pre-line">
              {request.job_description}
            </p>
          </div>
        )}

        {required.length > 0 && (
          <div className="mt-3 pt-3 border-t border-spc-line">
            <p className="text-spc-xs font-bold uppercase tracking-[0.1em] text-spc-body mb-1.5">
              Students must complete first
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {required.map((label) => (
                <li
                  key={label}
                  className="px-2 py-0.5 rounded-spc-admin-sm bg-spc-surface-2 text-spc-xs text-spc-ink"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.application_form_url && (
          <a
            href={request.application_form_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[44px] mt-2 text-spc-xs font-bold
              text-spc-accent hover:underline"
          >
            <ExternalLink size={14} aria-hidden="true" />
            The company's own form
          </a>
        )}
      </div>
    </Panel>
  );
}

export default function RequestsBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Jobs"
        title="Job Requests"
        subline="Drives officers have asked to have posted"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin mb-5 inline-block min-w-[180px]">
        <p className="text-spc-metric font-bold text-spc-ink tabular-nums">{p.requests.length}</p>
        <p className="text-spc-xs text-spc-body mt-0.5">
          {p.requests.length === 1 ? 'waiting on you' : 'waiting on you'}
        </p>
      </div>

      {p.requests.length === 0 ? (
        <Panel>
          <EmptyState>
            Nothing waiting. Requests appear here when an officer asks for a drive to be posted.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <SectionLabel>Pending</SectionLabel>
          <div className="space-y-3">
            {p.requests.map((request) => (
              <RequestCard
                key={request.id}
                layout={layout}
                request={request}
                onApprove={p.onApprove}
                onReject={p.onReject}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

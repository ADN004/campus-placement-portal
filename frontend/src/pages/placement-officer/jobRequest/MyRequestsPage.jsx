import { Plus, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeading, Panel, PanelHeading, SectionLabel, SecondaryButton, formatDate,
} from '../../../components/officer/OfficerUI';
import {
  StatBlock, RequestFilterTabs, RequestTable, RequestList,
} from './jobRequestShared';

/**
 * My Job Requests — the officer's own requests and what became of them.
 *
 * Reuses the request table, list, status mark and stat block from the create
 * page, since both screens render exactly the same records from the same
 * endpoint. What is different here is the filter strip and that a published
 * request can be downloaded as a PDF.
 */
export default function MyRequestsPage({
  layout,
  requests,
  filteredRequests,
  filter,
  counts,
  onFilterChange,
  onViewRequest,
  onDownloadPdf,
}) {
  const isTable = layout === 'desktop';
  const statColumns = layout === 'mobile' ? 1 : 3;

  return (
    <div className={layout === 'mobile' ? 'pb-2' : undefined}>
      <PageHeading
        title="My Job Requests"
        subline="Every request you have submitted, and what the Super Admin did with it"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <Link
          to="/placement-officer/create-job-request"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4
            rounded-spc-control text-spc-xs font-bold bg-spc-accent text-spc-on-accent
            hover:opacity-95 transition-opacity"
        >
          <Plus size={15} aria-hidden="true" />
          <span>New request</span>
        </Link>
      </PageHeading>

      <section className="mb-5">
        <StatBlock requests={requests} columns={statColumns} />
      </section>

      <div className="mb-4">
        <RequestFilterTabs
          active={filter}
          counts={counts}
          onChange={onFilterChange}
          scroll={layout === 'mobile'}
        />
      </div>

      <section>
        <SectionLabel>
          {filter === 'all' ? 'All requests' : `${filter} requests`}
        </SectionLabel>
        <Panel>
          <PanelHeading>
            {filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'}
          </PanelHeading>

          {filteredRequests.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-spc-sm text-spc-muted font-medium">
                {filter === 'all'
                  ? 'You have not submitted any job requests yet.'
                  : `No ${filter} requests.`}
              </p>
            </div>
          ) : isTable ? (
            <RequestTable requests={filteredRequests} onView={onViewRequest} />
          ) : (
            <RequestList requests={filteredRequests} onView={onViewRequest} />
          )}
        </Panel>
      </section>

      {/* Downloading a published request as a PDF is the one action this page
          has that the create page does not, so it sits on its own rather than
          being buried in each row. */}
      {filteredRequests.some((r) => r.status === 'approved' || r.status === 'auto_approved') && (
        <section className="mt-5">
          <Panel>
            <PanelHeading>Published requests</PanelHeading>
            <ul>
              {filteredRequests
                .filter((r) => r.status === 'approved' || r.status === 'auto_approved')
                .map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between gap-3 px-4 py-3
                      border-b border-spc-line last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-spc-xs font-bold text-spc-ink break-words">
                        {request.job_title}
                      </p>
                      <p className="text-xs text-spc-muted mt-0.5 tabular-nums break-words">
                        {request.company_name}
                        {request.reviewed_date ? ` · reviewed ${formatDate(request.reviewed_date)}` : ''}
                      </p>
                    </div>
                    <SecondaryButton
                      className="min-h-[40px] px-3 flex-shrink-0"
                      onClick={() => onDownloadPdf(request)}
                      aria-label={`Download job details for ${request.job_title} as PDF`}
                    >
                      <Download size={15} aria-hidden="true" />
                      <span>PDF</span>
                    </SecondaryButton>
                  </li>
                ))}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}

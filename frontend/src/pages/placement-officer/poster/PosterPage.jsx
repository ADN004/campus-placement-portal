import { Download, RefreshCw } from 'lucide-react';
import {
  PageHeading, Panel, PanelHeading, SectionLabel, PrimaryButton, SecondaryButton, EmptyState,
} from '../../../components/officer/OfficerUI';
import {
  ReadinessItem, PosterFigures, CompanyTable, CompanyList, WhatsOnThePoster,
} from './posterShared';

/**
 * Placement Poster.
 *
 * Pressing the button produces a PDF with the college's name on it, so the page
 * leads with whether it can be produced and what it will say, and only then
 * offers the button. Readiness is stated in words, not a green badge.
 *
 * The exported PDF's own design is not touched here — that is its own decision.
 */
export default function PosterPage({
  layout,
  stats,
  hasLogo,
  hasPlacements,
  canGenerate,
  generating,
  refreshing,
  onGenerate,
  onRefresh,
}) {
  const isDesktop = layout === 'desktop';
  const isMobile = layout === 'mobile';
  const companies = stats.company_breakdown || [];
  const CompanyView = isDesktop ? CompanyTable : CompanyList;

  /*
   * The headline counts distinct students; the table counts selections. A
   * student picked by two companies is one in "Students placed" and appears
   * under both companies below, so the column does not add up to the headline
   * and there is no way to tell that from either number. Said out loud, and
   * only when it is actually happening.
   */
  const selectionTotal = companies.reduce(
    (sum, company) => sum + (Number(company.student_count) || 0),
    0
  );
  const placedTotal = stats.total_students_placed || 0;
  const doubleCounted = selectionTotal > placedTotal;

  const companiesPanel = (
    <section>
      <SectionLabel>Who hired, and for how much</SectionLabel>
      <Panel>
        <PanelHeading>
          {companies.length} compan{companies.length === 1 ? 'y' : 'ies'}
        </PanelHeading>
        {companies.length === 0 ? (
          <EmptyState>
            No placements recorded yet.
            <span className="block text-xs mt-1">
              Mark students as selected in Job Applicants, then refresh.
            </span>
          </EmptyState>
        ) : (
          <>
            {doubleCounted && (
              <p className="px-4 py-3 text-xs text-spc-body border-b border-spc-line leading-snug">
                These add up to{' '}
                <span className="tabular-nums font-bold text-spc-ink">{selectionTotal}</span>, not{' '}
                <span className="tabular-nums font-bold text-spc-ink">{placedTotal}</span>, because{' '}
                {selectionTotal - placedTotal === 1 ? 'a student was' : 'some students were'}{' '}
                selected by more than one company. The headline counts each student once; this
                table lists them under every company that picked them.
              </p>
            )}
            <CompanyView companies={companies} />
          </>
        )}
      </Panel>
    </section>
  );

  return (
    <div className={isMobile ? 'pb-2' : undefined}>
      <PageHeading
        eyebrow={stats.college_name || undefined}
        title="Placement Poster"
        subline={`Academic year ${stats.placement_year_start}–${stats.placement_year_end}, worked out from student joining dates`}
        size={isMobile ? 'sm' : 'md'}
      >
        <div className={isMobile ? 'flex flex-col gap-2 w-full' : 'flex items-center gap-2'}>
          <PrimaryButton
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className={isMobile ? 'w-full' : undefined}
          >
            <Download size={15} aria-hidden="true" />
            <span>{generating ? 'Generating…' : 'Generate poster'}</span>
          </PrimaryButton>
          <SecondaryButton
            onClick={onRefresh}
            disabled={refreshing || generating}
            className={isMobile ? 'w-full' : undefined}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing…' : 'Refresh figures'}</span>
          </SecondaryButton>
        </div>
      </PageHeading>

      {/* Why the button is off, before the button is reached for. Both items
          read the same values the button's disabled state does. */}
      <section className="mb-5">
        <SectionLabel>Before you generate</SectionLabel>
        <Panel>
          <ul>
            <ReadinessItem met={hasLogo} label="College logo">
              {hasLogo
                ? 'Uploaded. It will be placed on the poster.'
                : 'Not uploaded yet. Add it on your Profile page — the poster cannot be generated without it.'}
            </ReadinessItem>
            <ReadinessItem met={hasPlacements} label="Placement data">
              {hasPlacements
                ? `${stats.total_students_placed} student${
                    stats.total_students_placed === 1 ? '' : 's'
                  } placed across ${stats.total_companies} compan${
                    stats.total_companies === 1 ? 'y' : 'ies'
                  }.`
                : 'Nobody is marked as selected yet. Mark students in Job Applicants, then refresh this page.'}
            </ReadinessItem>
          </ul>
        </Panel>
      </section>

      <section className="mb-5">
        <SectionLabel>What the poster will say</SectionLabel>
        <PosterFigures stats={stats} />
        {/* Kept, but out of the placement figures: a company with a live job is
            not a company that hired anyone, and next to "students placed" it
            reads like one. */}
        <p className="text-xs text-spc-muted mt-2">
          Separately,{' '}
          <span className="tabular-nums font-bold text-spc-body">
            {stats.recruiting_companies || 0}
          </span>{' '}
          compan{stats.recruiting_companies === 1 ? 'y is' : 'ies are'} currently recruiting from
          your college. That is hiring activity, not placements, and does not appear on the poster.
        </p>
      </section>

      {isDesktop ? (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
          {companiesPanel}
          <section>
            <SectionLabel>Reference</SectionLabel>
            <WhatsOnThePoster />
          </section>
        </div>
      ) : (
        <>
          {companiesPanel}
          <section className="mt-5">
            <WhatsOnThePoster />
          </section>
        </>
      )}
    </div>
  );
}

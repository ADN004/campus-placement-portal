import { Plus, Hash, Lock, ChevronRight } from 'lucide-react';
import {
  PageHeading, Panel, PanelHeading, SectionLabel, PrimaryButton, SecondaryButton, SelectField,
} from '../../../components/officer/OfficerUI';
import useLongList from '../../../hooks/useLongList';
import { ShowMore } from '../../../components/officer/LongList';
import { RangeTable, RangeList, HowPrnRangesWork } from './prnRangesShared';

/**
 * Manage PRN Ranges.
 *
 * A range decides who may register, so the page leads with whether the Super
 * Admin has frozen it, then the officer's own ranges, then the read-only ones
 * the Super Admin added.
 */
export default function PrnRangesPage({
  layout,
  locked,
  ownRanges,
  filteredOwn,
  closedRanges = [],
  availableYears = [],
  viewFilter,
  onViewFilterChange,
  onAddRange,
  onAddSingle,
  actionHandlers,
}) {
  const isTable = layout === 'desktop';
  const RangeView = isTable ? RangeTable : RangeList;

  // A college adds a range per branch per intake year, plus a single PRN for
  // every student who falls outside one, so this grows every year it is used.
  // The year filter above narrows it; this bounds what is left.
  const rangeWindow = useLongList(filteredOwn, { step: 25 });
  // Newest closed year first — the one an officer is most likely to look for.
  const closedYears = [...new Set(closedRanges.map((r) => r.closed_for_year))].sort().reverse();

  return (
    <div className={layout === 'mobile' ? 'pb-2' : undefined}>
      <PageHeading
        title="PRN Ranges"
        subline="Decide which PRNs are allowed to register for your college"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        {!locked && (
          <div className="flex items-center gap-2 flex-wrap">
            <PrimaryButton onClick={onAddRange}>
              <Plus size={15} aria-hidden="true" />
              <span>Add range</span>
            </PrimaryButton>
            <SecondaryButton onClick={onAddSingle}>
              <Hash size={15} aria-hidden="true" />
              <span>Add single PRN</span>
            </SecondaryButton>
          </div>
        )}
      </PageHeading>

      {/* The one thing that changes what an officer can do here, so it comes
          before anything else rather than sitting beside the ranges. */}
      {locked && (
        <div className="mb-5 rounded-spc-panel bg-spc-warn-bg border border-spc-warn/40 p-4">
          <div className="flex items-start gap-3">
            <Lock size={18} className="text-spc-warn flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-spc-xs font-bold text-spc-ink">
                PRN range management is locked
              </p>
              <p className="text-spc-xs text-spc-body mt-1">
                The Super Admin has frozen changes for your college. You can still see the ranges
                and the students inside them, but not add, edit, enable or disable anything. Contact
                the Super Admin to unlock it.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="mb-5">
        <HowPrnRangesWork />
      </section>

      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div className={layout === 'mobile' ? 'w-full' : 'w-64'}>
          {/* The per-year options were computed and passed but never rendered,
              so filtering to one year was impossible even though the container
              still understood the value. */}
          <SelectField id="prn-view-filter" label="Show" value={viewFilter} onChange={onViewFilterChange}>
            <option value="active">Active ranges</option>
            <option value="all">All years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <section>
        <SectionLabel>Your college&rsquo;s ranges</SectionLabel>
        <Panel>
          <PanelHeading>
            {filteredOwn.length} range{filteredOwn.length === 1 ? '' : 's'}
          </PanelHeading>
          <RangeView
            ranges={rangeWindow.visible}
            locked={locked}
            actionHandlers={actionHandlers}
            emptyTitle={
              ownRanges.length === 0
                ? 'No PRN ranges defined yet.'
                : viewFilter === 'active'
                ? 'No active ranges for your college.'
                : 'No ranges match this filter.'
            }
            emptyHint={
              ownRanges.length === 0
                ? 'Add one so your students can register.'
                : 'Switch the filter to see past-year or disabled ranges.'
            }
          />
          {rangeWindow.hasMore && (
            <ShowMore
              onClick={rangeWindow.showMore}
              remaining={rangeWindow.remaining}
              noun="range"
            />
          )}
        </Panel>
      </section>

      {/*
        There was a collapsed "Added by the Super Admin — read only" section
        here. It listed every range the Super Admin had created anywhere in the
        state, because the endpoint returned them all, so an officer could read
        other colleges' PRN blocks out of it. The endpoint is scoped to the
        officer's own college now, and a Super-Admin range that does belong to
        this college simply sits in the list above with its actions locked —
        one list, in PRN order, instead of the same college's ranges split
        across two panels by who happened to type them in.
      */}

      {/*
        Ranges the year-end reset closed. Kept out of the working list above:
        they belong to intakes that have passed out and can never be reopened,
        and after a few resets they would outnumber the live ones. Collapsed,
        grouped by the year they were closed for, so the history is there
        without being in the way.
      */}
      {closedRanges.length > 0 && (
        <section className="mt-6">
          <details className="group">
            <summary
              className="flex items-center gap-2 cursor-pointer list-none min-h-[44px]
                text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted
                hover:text-spc-ink transition-colors"
            >
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="transition-transform group-open:rotate-90 flex-shrink-0"
              />
              <span>
                Closed by year-end reset ({closedRanges.length})
              </span>
            </summary>

            <div className="mt-3 space-y-4">
              <p className="text-xs text-spc-muted">
                These belonged to intakes that have passed out. They cannot be reopened —
                doing so would restore those students&rsquo; accounts. Add a new range for the
                current intake instead.
              </p>
              {closedYears.map((year) => (
                <Panel key={year}>
                  <PanelHeading>{year}</PanelHeading>
                  {/* Not `locked`: RangeActions gives a closed range its own
                      short menu — look at who was in it, or clear it away. */}
                  <RangeView
                    ranges={closedRanges.filter((r) => r.closed_for_year === year)}
                    actionHandlers={actionHandlers}
                    emptyTitle="No ranges."
                  />
                </Panel>
              ))}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

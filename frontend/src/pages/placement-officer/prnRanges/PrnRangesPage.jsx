import { Plus, Hash, Lock } from 'lucide-react';
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
    </div>
  );
}

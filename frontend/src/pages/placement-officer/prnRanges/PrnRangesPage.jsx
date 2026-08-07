import { Plus, Hash, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import {
  PageHeading, Panel, PanelHeading, SectionLabel, PrimaryButton, SecondaryButton, SelectField,
} from '../../../components/officer/OfficerUI';
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
  systemRanges,
  showSystemRanges,
  onToggleSystemRanges,
  viewFilter,
  onViewFilterChange,
  onAddRange,
  onAddSingle,
  actionHandlers,
}) {
  const isTable = layout === 'desktop';
  const RangeView = isTable ? RangeTable : RangeList;

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
          <SelectField id="prn-view-filter" label="Show" value={viewFilter} onChange={onViewFilterChange}>
            <option value="active">Active ranges</option>
            <option value="all">All years</option>
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
            ranges={filteredOwn}
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
        </Panel>
      </section>

      {systemRanges.length > 0 && (
        <section className="mt-5">
          <Panel>
            <button
              type="button"
              onClick={onToggleSystemRanges}
              aria-expanded={showSystemRanges}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[52px]
                text-left hover:bg-spc-surface-2 transition-colors"
            >
              <span className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                Added by the Super Admin ({systemRanges.length}) — read only
              </span>
              {showSystemRanges
                ? <ChevronDown size={17} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
                : <ChevronRight size={17} className="text-spc-muted flex-shrink-0" aria-hidden="true" />}
            </button>
            {showSystemRanges && (
              <div className="border-t border-spc-line">
                {/* Locked regardless of the college's own lock: these are not
                    the officer's to change. */}
                <RangeView
                  ranges={systemRanges}
                  locked
                  actionHandlers={actionHandlers}
                  emptyTitle="None."
                />
              </div>
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}

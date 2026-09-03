import { Plus, Hash } from 'lucide-react';
import { PageHeading, Panel, EmptyState, PrimaryButton, SecondaryButton } from '../../../components/admin/AdminUI';
import { RangeFilters, RangeGroups, GroupControls } from './prnRangesShared';

/**
 * PRN Ranges, at every width.
 *
 * The register is grouped by college and collapsed by default — sixty colleges'
 * ranges in one flat list is not readable, and the group heading carries the
 * counts that tell you whether to open it.
 *
 * The page it replaces had three blurred colour circles drifting behind the
 * content. Console has no decorative colour on a page at all; the depth here is
 * the chrome above it.
 */
export default function RangesBody(p) {
  const { layout } = p;

  return (
    <div>
      <PageHeading
        eyebrow="Students"
        title="PRN Ranges"
        subline="Which PRNs are allowed to register, and for which college"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryButton onClick={p.onAddSingle}>
            <Hash size={15} aria-hidden="true" />
            Add single PRN
          </SecondaryButton>
          <PrimaryButton onClick={p.onAddRange}>
            <Plus size={15} aria-hidden="true" />
            Add range
          </PrimaryButton>
        </div>
      </PageHeading>

      <RangeFilters
        layout={layout}
        search={p.search}
        onSearch={p.onSearch}
        yearFilter={p.yearFilter}
        onYear={p.onYear}
        years={p.years}
      />

      <GroupControls
        shown={p.groups.length}
        total={p.totalGroups}
        onExpandAll={p.onExpandAll}
        onCollapseAll={p.onCollapseAll}
      />

      {p.groups.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.search || p.yearFilter !== 'active'
              ? 'No ranges match those filters.'
              : 'No PRN ranges yet. Add one to let students register.'}
          </EmptyState>
        </Panel>
      ) : (
        <RangeGroups
          layout={layout}
          groups={p.groups}
          isExpanded={p.isGroupExpanded}
          onToggleGroup={p.onToggleGroup}
          onEdit={p.onEdit}
          onToggle={p.onToggleEnable}
          onDelete={p.onDelete}
        />
      )}
    </div>
  );
}

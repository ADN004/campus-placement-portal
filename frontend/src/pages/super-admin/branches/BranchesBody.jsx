import { PageHeading, SectionLabel, EmptyState, Panel } from '../../../components/admin/AdminUI';
import {
  BranchFilters, BranchSummary, CollegeTable, CollegeList,
} from './branchesShared';

/**
 * College Branches, at every width.
 *
 * Desktop keeps a real table — this is a register of sixty colleges and a table
 * is the right shape for it. Below `lg` the same rows become a ruled list, so a
 * phone reads them down the page instead of scrolling a five-column table
 * sideways.
 */
export default function BranchesBody(p) {
  const { layout } = p;
  const isTable = layout === 'desktop';
  const Register = isTable ? CollegeTable : CollegeList;

  return (
    <div>
      <PageHeading
        eyebrow="Colleges"
        title="College Branches"
        subline="Which branches each college offers"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <BranchSummary
        layout={layout}
        total={p.summary.total}
        none={p.summary.none}
        few={p.summary.few}
        full={p.summary.full}
      />

      <BranchFilters
        layout={layout}
        searchQuery={p.searchQuery}
        onSearch={p.onSearch}
        regions={p.regions}
        selectedRegion={p.selectedRegion}
        onRegion={p.onRegion}
      />

      <SectionLabel>
        {p.colleges.length} of {p.summary.total} colleges
      </SectionLabel>

      {p.colleges.length === 0 ? (
        <Panel>
          <EmptyState>
            {p.searchQuery || p.selectedRegion
              ? 'No colleges match those filters.'
              : 'No colleges yet.'}
          </EmptyState>
        </Panel>
      ) : (
        <Register colleges={p.colleges} onEdit={p.onEdit} />
      )}
    </div>
  );
}

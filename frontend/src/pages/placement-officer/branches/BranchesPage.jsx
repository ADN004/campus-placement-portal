import { Edit2, Plus } from 'lucide-react';
import {
  PageHeading, Panel, PanelHeading, SectionLabel, PrimaryButton, EmptyState,
} from '../../../components/officer/OfficerUI';
import {
  BranchTable, BranchList, CountBlock, HowBranchesWork, Notice, OrphanBranches,
} from './branchesShared';

/**
 * Manage College Branches.
 *
 * The list on this page is what a student sees in the branch dropdown when they
 * register, so the page leads with whether that list is usable at all, then
 * shows it with the number of students already in each branch — the one number
 * that tells an officer whether a removal would cost them anything.
 */
export default function BranchesPage({
  layout,
  collegeName,
  rows,
  orphans,
  totalStudents,
  onEdit,
}) {
  const isDesktop = layout === 'desktop';
  const isMobile = layout === 'mobile';
  const BranchView = isDesktop ? BranchTable : BranchList;
  const empty = rows.length === 0;

  const branchesPanel = (
    <section>
      <SectionLabel>Branches offered</SectionLabel>
      <Panel>
        <PanelHeading>
          {rows.length} branch{rows.length === 1 ? '' : 'es'}
        </PanelHeading>
        {empty ? (
          <EmptyState>Nothing configured yet.</EmptyState>
        ) : (
          <BranchView rows={rows} />
        )}
      </Panel>
    </section>
  );

  return (
    <div className={isMobile ? 'pb-2' : undefined}>
      <PageHeading
        eyebrow={collegeName || undefined}
        title="College Branches"
        subline="The branches students may pick when they register for your college"
        size={isMobile ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={onEdit}>
          {empty ? <Plus size={15} aria-hidden="true" /> : <Edit2 size={15} aria-hidden="true" />}
          <span>{empty ? 'Add branches' : 'Edit branches'}</span>
        </PrimaryButton>
      </PageHeading>

      {/* The one state that breaks something outright comes before anything
          else, and says what is broken rather than colouring a badge red. */}
      {empty && (
        <div className="mb-5">
          <Notice tone="bad" title="No branches configured">
            Students from your college cannot finish registering until at least one branch is
            added, because the branch dropdown on the registration form is empty.
          </Notice>
        </div>
      )}

      <section className="mb-5">
        <Panel>
          <div className="sm:flex sm:items-stretch">
            <CountBlock label="Branches" value={rows.length} tone={empty ? 'bad' : 'default'} />
            <CountBlock
              label="Students"
              value={totalStudents}
              hint="Approved, across all branches"
            />
            {orphans.length > 0 && (
              <CountBlock
                label="Unlisted branches"
                value={orphans.length}
                hint="Students are in them, you no longer offer them"
                tone="bad"
              />
            )}
          </div>
        </Panel>
      </section>

      {isDesktop ? (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
          {branchesPanel}
          <section>
            <SectionLabel>Reference</SectionLabel>
            <HowBranchesWork />
          </section>
        </div>
      ) : (
        <>
          {branchesPanel}
          <section className="mt-5">
            <HowBranchesWork />
          </section>
        </>
      )}

      {orphans.length > 0 && (
        <section className="mt-5">
          <OrphanBranches rows={orphans} />
        </section>
      )}
    </div>
  );
}

import { Plus } from 'lucide-react';
import { PageHeading, Panel, PanelHeading, SectionLabel, PrimaryButton } from '../../../components/officer/OfficerUI';
import { StatBlock, HowItWorks, HOW_IT_WORKS_POINTS, RequestTable, RequestList } from './jobRequestShared';

/**
 * Everything on the Create Job Request page, shared by the three presenters.
 *
 * The devices differ only in how many columns the stat block runs and whether
 * the requests render as a table or a ruled list — not in what is on the page.
 */
export default function JobRequestBody({ layout, requests, onCreate, onViewRequest }) {
  const isTable = layout === 'desktop';
  const statColumns = layout === 'mobile' ? 1 : 3;

  return (
    <div className={layout === 'mobile' ? 'pb-2' : undefined}>
      <PageHeading
        title="Job Requests"
        subline="Post a job to your own students, or ask the Super Admin to publish it wider"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <PrimaryButton onClick={onCreate}>
          <Plus size={15} aria-hidden="true" />
          <span>New request</span>
        </PrimaryButton>
      </PageHeading>

      <section className="mb-5">
        <StatBlock requests={requests} columns={statColumns} />
      </section>

      <section className="mb-5">
        <HowItWorks points={HOW_IT_WORKS_POINTS} />
      </section>

      <section>
        <SectionLabel>Your requests</SectionLabel>
        <Panel>
          <PanelHeading>{requests.length} request{requests.length === 1 ? '' : 's'}</PanelHeading>
          {isTable ? (
            <RequestTable requests={requests} onView={onViewRequest} />
          ) : (
            <RequestList requests={requests} onView={onViewRequest} />
          )}
        </Panel>
      </section>
    </div>
  );
}

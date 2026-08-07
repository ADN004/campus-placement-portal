import { PageHeading } from '../../../components/officer/OfficerUI';
import JobEligibleBody from './JobEligibleBody';

/**
 * Mobile (below `md`) presenter.
 *
 * Everything runs in one column: the job picker is a plain ruled list, stats go
 * two across so the figures stay readable, filters open one field per line, and
 * the applicant lists are ruled lists with the actions on their own row inside
 * thumb reach.
 */
export default function MobileJobEligibleStudents(props) {
  return (
    <div className="pb-2">
      <PageHeading title="Job Applicants" size="sm" />
      <JobEligibleBody layout="mobile" {...props} />
    </div>
  );
}

import { PageHeading } from '../../../components/officer/OfficerUI';
import JobEligibleBody from './JobEligibleBody';

/**
 * Tablet (`md` up to below `lg`) presenter.
 *
 * The applicant lists become ruled lists rather than tables: nine columns
 * inside ~700px is the squeeze this redesign exists to remove, and a two-line
 * ruled row carries the same facts legibly. Stats go four across instead of
 * seven, the job picker two across, filters two columns.
 */
export default function TabletJobEligibleStudents(props) {
  return (
    <div>
      <PageHeading
        title="Job Applicants"
        subline={
          props.isHost
            ? 'Applications across all colleges (host)'
            : 'Applications for your college'
        }
      />
      <JobEligibleBody layout="tablet" {...props} />
    </div>
  );
}

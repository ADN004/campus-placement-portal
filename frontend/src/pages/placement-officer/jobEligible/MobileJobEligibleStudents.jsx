import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '../../../components/officer/OfficerUI';
import JobEligibleBody from './JobEligibleBody';

/**
 * Mobile (below `md`) presenter.
 *
 * Everything runs in one column: stats go two across so the figures stay
 * readable, filters open one field per line, and the applicant lists are ruled
 * lists with the actions on their own row inside thumb reach.
 *
 * The page opens at the job itself — picking a drive happens on the list page
 * now, so there is no longer a picker to scroll past to reach the students.
 */
export default function MobileJobEligibleStudents(props) {
  return (
    <div className="pb-2">
      {/* Back to the list. The browser Back button works too now that the job
          has its own address, but a visible way out matters most on a phone. */}
      <Link
        to="/placement-officer/job-eligible-students"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-spc-xs font-bold
          text-spc-accent hover:underline underline-offset-4"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span>All jobs</span>
      </Link>

      <PageHeading
        title={props.job?.job_title || 'Job Applicants'}
        subline={props.job?.company_name}
        size="sm"
      />
      <JobEligibleBody layout="mobile" {...props} />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
      {/* Back to the list. The browser Back button works too now that the job
          has its own address, but a visible way out matters on a phone. */}
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

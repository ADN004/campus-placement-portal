import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '../../../components/officer/OfficerUI';
import JobEligibleBody from './JobEligibleBody';

/**
 * Desktop (`lg` and up) presenter.
 *
 * The applicant lists stay real tables here — columns of PRNs, CGPAs and
 * branches are what a table is for, and an officer comparing candidates needs
 * them aligned. Seven placement stats fit across in one ruled block, the job
 * picker runs three across, and the filters open three columns wide.
 */
export default function DesktopJobEligibleStudents(props) {
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
            ? 'View, manage and track applications across all colleges (host)'
            : 'View, manage and track applications for your college'
        }
      />
      <JobEligibleBody layout="desktop" {...props} />
    </div>
  );
}

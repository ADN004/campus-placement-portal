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
      <PageHeading
        title="Job Applicants"
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

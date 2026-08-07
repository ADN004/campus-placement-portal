import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import JobListPage from './jobEligible/JobListPage';
import {
  DesktopJobEligibleSkeleton,
  TabletJobEligibleSkeleton,
  MobileJobEligibleSkeleton,
} from './jobEligible/JobEligibleSkeleton';

/**
 * The job list at /placement-officer/job-eligible-students.
 *
 * This page used to be the whole applicants screen with a picker on top:
 * choosing a job revealed stats, a drive panel, filters and three tables
 * underneath, so an officer on a phone picked a job and then scrolled past it
 * to reach the students. Opening a job on its own address instead gives it a
 * working Back button and a URL that survives a refresh, and keeps this list
 * usable as the number of drives grows.
 *
 * The applicants screen itself is JobApplicants.jsx.
 */
export default function JobEligibleStudents() {
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getJobs();
      const activeJobs = (response.data.data || []).filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileJobEligibleSkeleton />;
    if (deviceType === 'tablet') return <TabletJobEligibleSkeleton />;
    return <DesktopJobEligibleSkeleton />;
  }

  // Filtering happens here rather than on the server: the officer's active job
  // list is small enough that a round trip per keystroke would cost more than
  // it saves, and it keeps the endpoint unchanged.
  const term = searchQuery.trim().toLowerCase();
  const visibleJobs = term
    ? jobs.filter(
        (job) =>
          (job.job_title || '').toLowerCase().includes(term) ||
          (job.company_name || '').toLowerCase().includes(term)
      )
    : jobs;

  return (
    <JobListPage
      layout={deviceType}
      jobs={visibleJobs}
      searchQuery={searchQuery}
      onSearchChange={(e) => setSearchQuery(e.target.value)}
      onOpenJob={(job) => navigate(`/placement-officer/job-eligible-students/${job.id}`)}
      onDownloadJobPdf={async (job) => {
        // Loaded on click: jsPDF is ~384K and most visits never download one.
        const { generateJobDetailsPDF } = await import('../../utils/jobDetailsPdf');
        generateJobDetailsPDF({ ...job, title: job.job_title, description: job.job_description });
      }}
    />
  );
}

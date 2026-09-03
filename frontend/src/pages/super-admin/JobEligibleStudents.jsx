import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import JobListPage from './jobEligible/JobListPage';
import JobListSkeleton from './jobEligible/JobListSkeleton';

/**
 * The drives to choose from — container.
 *
 * This page used to be the whole thing: picking a job revealed the applicants,
 * the stats, the filters and three tables underneath the picker, so on a phone
 * you chose a drive and then scrolled past sixty cards to reach the students.
 * A drive opens on its own address now, at
 * /super-admin/job-eligible-students/:jobId, which gives it a Back button, a
 * URL that survives a refresh, and a list that stays usable as drives
 * accumulate. The same split the officer role got.
 */
export default function SuperAdminJobEligibleStudents() {
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getJobs();
      // Filter to show only active jobs
      const activeJobs = response.data.data.filter((job) => job.is_active);
      setJobs(activeJobs);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (showSkeleton) return <JobListSkeleton layout={deviceType} />;

  /*
   * Searched here rather than on the server: sixty-odd drives is small enough
   * that a round trip per keystroke would cost more than it saves, and it keeps
   * the endpoint unchanged.
   */
  const term = searchQuery.trim().toLowerCase();
  const visibleJobs = term
    ? jobs.filter(
      (job) => (job.job_title || '').toLowerCase().includes(term)
        || (job.company_name || '').toLowerCase().includes(term),
    )
    : jobs;

  return (
    <JobListPage
      layout={deviceType}
      jobs={visibleJobs}
      searchQuery={searchQuery}
      onSearchChange={(e) => setSearchQuery(e.target.value)}
      onOpenJob={(job) => navigate(`/super-admin/job-eligible-students/${job.id}`)}
    />
  );
}

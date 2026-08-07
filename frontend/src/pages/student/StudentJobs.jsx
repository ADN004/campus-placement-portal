import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SmartApplicationModal from '../../components/SmartApplicationModal';
import useDeviceType from '../../hooks/useDeviceType';
import useLongList from '../../hooks/useLongList';
import { JobDetailsModal } from './jobs/jobsShared';
import DesktopStudentJobs, { DesktopJobsSkeleton } from './jobs/DesktopStudentJobs';
import TabletStudentJobs, { TabletJobsSkeleton } from './jobs/TabletStudentJobs';
import MobileStudentJobs, { MobileJobsSkeleton } from './jobs/MobileStudentJobs';

/**
 * StudentJobs — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions. Nothing is reimplemented per device.
 */
export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [error, setError] = useState(null);
  const deviceType = useDeviceType();

  // Above the skeleton's early return on purpose: a hook has to run on every
  // render, and this one sat below it — so the loading render called fewer
  // hooks than the one after it and React tore the tree down.
  // Identical props for all three presenters — same values, same functions.
  //
  // `visibleJobs` rather than `filteredJobs` is what the presenters render. A
  // student sees every job ever posted to their college, so this list only
  // grows: by final year it is the whole history, and rendering all of it makes
  // the page's height a function of how long they have been enrolled. Searching
  // and the eligibility filter already narrow it; this bounds what is left.
  // `filteredJobs` still goes through so the count can say "25 of 240".
  const jobWindow = useLongList(filteredJobs, { step: 25 });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobsData();
  }, [searchQuery, filterEligibility, jobs]);

  // Skeleton loading gate
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // Lock scroll during skeleton
  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  const fetchJobs = async () => {
    try {
      const response = await studentAPI.getEligibleJobs();
      setJobs(response.data.data || []);
      setError(null);
    } catch (error) {
      if (error.response?.status === 403) {
        setError({
          title: 'Account Pending Approval',
          message: error.response?.data?.message || 'Your registration is pending approval from placement officer',
          type: 'pending'
        });
      } else {
        setError({
          title: 'Failed to Load Jobs',
          message: 'Unable to fetch available jobs. Please try again later.',
          type: 'error'
        });
        toast.error('Failed to load jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterJobsData = () => {
    let filtered = jobs;

    if (filterEligibility === 'all') {
      filtered = filtered.filter((job) => !job.deadline_passed || job.has_applied);
    } else if (filterEligibility === 'eligible') {
      filtered = filtered.filter((job) => job.is_eligible && (!job.deadline_passed || job.has_applied));
    } else if (filterEligibility === 'not-eligible') {
      filtered = filtered.filter((job) => !job.is_eligible && (!job.deadline_passed || job.has_applied));
    } else if (filterEligibility === 'missed') {
      filtered = filtered.filter((job) => job.deadline_passed && !job.has_applied);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  const handleApplyClick = (job) => {
    if (job.has_applied) {
      toast.error('You have already applied for this job');
      return;
    }
    if (job.deadline_passed) {
      toast.error('Application deadline has passed');
      return;
    }
    if (!job.is_active) {
      toast.error('This job is no longer active');
      return;
    }
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    fetchJobs();
  };

  // Named for passing to the presenters — same calls as the inline handlers
  // they replace.
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedJob(null);
  };

  const handleApplyFromDetails = () => {
    setShowDetailsModal(false);
    handleApplyClick(selectedJob);
  };

  const handleCloseApplication = () => {
    setShowApplicationModal(false);
    setSelectedJob(null);
  };

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileJobsSkeleton />;
    if (deviceType === 'tablet') return <TabletJobsSkeleton />;
    return <DesktopJobsSkeleton />;
  }

  // Counts for the filter chips, using exactly the predicates filterJobsData
  // applies, so a chip can never disagree with the list it produces.
  const filters = [
    {
      key: 'all',
      label: 'All jobs',
      count: jobs.filter((j) => !j.deadline_passed || j.has_applied).length,
    },
    {
      key: 'eligible',
      label: 'Eligible',
      count: jobs.filter((j) => j.is_eligible && (!j.deadline_passed || j.has_applied)).length,
    },
    {
      key: 'not-eligible',
      label: 'Check eligibility',
      count: jobs.filter((j) => !j.is_eligible && (!j.deadline_passed || j.has_applied)).length,
    },
    {
      key: 'missed',
      label: 'Missed',
      count: jobs.filter((j) => j.deadline_passed && !j.has_applied).length,
    },
  ];

  const presenterProps = {
    error,
    jobs,
    filteredJobs,
    visibleJobs: jobWindow.visible,
    shownCount: jobWindow.shown,
    totalCount: jobWindow.total,
    hasMore: jobWindow.hasMore,
    remaining: jobWindow.remaining,
    onShowMore: jobWindow.showMore,
    filters,
    filterEligibility,
    searchQuery,
    onSearchChange: handleSearchChange,
    onFilterChange: setFilterEligibility,
    onViewDetails: handleViewDetails,
    onApply: handleApplyClick,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileStudentJobs {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletStudentJobs {...presenterProps} />
      ) : (
        <DesktopStudentJobs {...presenterProps} />
      )}

      {/* Job Details Modal */}
      {showDetailsModal && selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={handleCloseDetails}
          onApply={handleApplyFromDetails}
        />
      )}

      {/* Smart Application Modal */}
      {showApplicationModal && selectedJob && (
        <SmartApplicationModal
          job={selectedJob}
          onClose={handleCloseApplication}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </>
  );
}

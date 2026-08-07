import { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useDeviceType from '../../hooks/useDeviceType';
import useLongList from '../../hooks/useLongList';
import { ApplicationDetailsModal } from './applications/applicationsShared';
import DesktopStudentApplications, {
  DesktopApplicationsSkeleton,
} from './applications/DesktopStudentApplications';
import TabletStudentApplications, {
  TabletApplicationsSkeleton,
} from './applications/TabletStudentApplications';
import MobileStudentApplications, {
  MobileApplicationsSkeleton,
} from './applications/MobileStudentApplications';

/**
 * StudentApplications — container.
 *
 * Owns every piece of state, effect, API call and handler; renders exactly one
 * of the three device presenters with the same data and the *same* handler
 * functions.
 */
export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [error, setError] = useState(null);
  const deviceType = useDeviceType();

  // Above the skeleton's early return on purpose: a hook has to run on every
  // render, and this one sat below it — so the loading render called fewer
  // hooks than the one after it and React tore the tree down.
  // Identical props for all three presenters — same values, same functions.
  // Every application a student has ever made stays here — this list only
  // ever grows, and by final year it is their whole history.
  const applicationWindow = useLongList(filteredApplications, { step: 25 });

  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, statusFilter, applications]);

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

  const fetchApplications = async () => {
    try {
      const response = await studentAPI.getMyApplications();
      const applicationsData = response.data.data || [];
      setApplications(applicationsData);
      calculateStatusCounts(applicationsData);
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
          title: 'Failed to Load Applications',
          message: 'Unable to fetch your applications. Please try again later.',
          type: 'error'
        });
        toast.error('Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStatusCounts = (applicationsData) => {
    const counts = {
      all: applicationsData.length,
      pending: applicationsData.filter((a) => a.status === 'pending').length,
      shortlisted: applicationsData.filter((a) => a.status === 'shortlisted').length,
      selected: applicationsData.filter((a) => a.status === 'selected').length,
      rejected: applicationsData.filter((a) => a.status === 'rejected').length,
    };
    setStatusCounts(counts);
  };

  const filterApplications = () => {
    let filtered = applications;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (app) =>
          app.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  // Named for passing to the presenters — same calls as the inline handlers
  // they replace.
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedApplication(null);
  };

  if (loading || showSkeleton) {
    if (deviceType === 'mobile') return <MobileApplicationsSkeleton />;
    if (deviceType === 'tablet') return <TabletApplicationsSkeleton />;
    return <DesktopApplicationsSkeleton />;
  }

  const filters = [
    { key: 'all', label: 'All', count: statusCounts.all },
    { key: 'pending', label: 'Pending', count: statusCounts.pending },
    { key: 'shortlisted', label: 'Shortlisted', count: statusCounts.shortlisted },
    { key: 'selected', label: 'Selected', count: statusCounts.selected },
    { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
  ];


  const presenterProps = {
    visibleApplications: applicationWindow.visible,
    shownCount: applicationWindow.shown,
    totalCount: applicationWindow.total,
    hasMore: applicationWindow.hasMore,
    remaining: applicationWindow.remaining,
    onShowMore: applicationWindow.showMore,
    error,
    applications,
    filteredApplications,
    filters,
    statusFilter,
    searchQuery,
    onSearchChange: handleSearchChange,
    onFilterChange: setStatusFilter,
    onViewDetails: handleViewDetails,
  };

  return (
    <>
      {deviceType === 'mobile' ? (
        <MobileStudentApplications {...presenterProps} />
      ) : deviceType === 'tablet' ? (
        <TabletStudentApplications {...presenterProps} />
      ) : (
        <DesktopStudentApplications {...presenterProps} />
      )}

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          onClose={handleCloseDetails}
        />
      )}
    </>
  );
}

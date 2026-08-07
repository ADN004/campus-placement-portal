import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import MyRequestsPage from './jobRequest/MyRequestsPage';
import { RequestDetailsModal } from './jobRequest/JobRequestModals';
import {
  DesktopJobRequestSkeleton,
  TabletJobRequestSkeleton,
  MobileJobRequestSkeleton,
} from './jobRequest/JobRequestSkeleton';

/**
 * MyJobRequests — container.
 *
 * Owns the fetch, the filter and the detail dialog; the presenter renders what
 * it is handed. The request table, list, status mark and stat block come from
 * the create page's module, because both screens show the same records from
 * the same endpoint.
 */
export default function MyJobRequests() {
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchJobRequests();
  }, []);

  const fetchJobRequests = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getMyJobRequests();
      setJobRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load job requests');
    } finally {
      setLoading(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileJobRequestSkeleton />;
    if (deviceType === 'tablet') return <TabletJobRequestSkeleton />;
    return <DesktopJobRequestSkeleton />;
  }

  // A published own-college request carries status 'auto_approved', so counting
  // only 'approved' would under-report it — which the old tabs did.
  const isApproved = (r) => r.status === 'approved' || r.status === 'auto_approved';

  const filteredRequests = jobRequests.filter((request) => {
    if (filter === 'all') return true;
    if (filter === 'approved') return isApproved(request);
    return request.status === filter;
  });

  const counts = {
    all: jobRequests.length,
    pending: jobRequests.filter((r) => r.status === 'pending').length,
    approved: jobRequests.filter(isApproved).length,
    rejected: jobRequests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <>
      <MyRequestsPage
        layout={deviceType}
        requests={jobRequests}
        filteredRequests={filteredRequests}
        filter={filter}
        counts={counts}
        onFilterChange={setFilter}
        onViewRequest={setSelectedRequest}
        onDownloadPdf={async (request) => {
          // jsPDF builds into a ~384K chunk and pulls html2canvas with it.
          // Imported here rather than at the top of the file so it downloads on
          // the first Download press instead of on every visit to this page.
          const { generateJobDetailsPDF } = await import('../../utils/jobDetailsPdf');
          generateJobDetailsPDF({
            company_name: request.company_name,
            title: request.job_title,
            job_description: request.job_description,
            salary_package: request.salary_range,
            location: request.location,
            no_of_vacancies: request.no_of_vacancies,
            min_cgpa: request.min_cgpa,
            max_backlogs: request.max_backlogs,
            backlog_max_semester: request.backlog_max_semester,
            allowed_branches: request.allowed_branches,
            target_type: request.target_type,
            target_regions: request.target_regions,
            target_colleges: request.target_colleges,
            application_deadline: request.application_deadline,
            application_form_url: request.application_form_url,
            is_active: true,
          });
        }}
      />

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  );
}

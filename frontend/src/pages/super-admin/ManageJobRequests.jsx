import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import RequestsBody from './jobRequests/RequestsBody';
import RequestsSkeleton from './jobRequests/RequestsSkeleton';
import { ApproveDialog, RejectDialog } from './jobRequests/RequestModals';

/**
 * Job requests — container.
 *
 * All state, effects and handlers; the body and the two dialogs draw them.
 * Same endpoints, same toasts, same refusal when a rejection has no reason.
 */
export default function ManageJobRequests() {
  const deviceType = useDeviceType();
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchJobRequests();
  }, []);

  const fetchJobRequests = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getPendingJobRequests();
      setJobRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load job requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await superAdminAPI.approveJobRequest(selectedRequest.id);
      toast.success('Job request approved successfully');
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchJobRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve job request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await superAdminAPI.rejectJobRequest(selectedRequest.id);
      toast.success('Job request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchJobRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject job request');
    } finally {
      setProcessing(false);
    }
  };

  if (showSkeleton) return <RequestsSkeleton layout={deviceType} />;

  return (
    <>
      <RequestsBody
        layout={deviceType}
        requests={jobRequests}
        onApprove={(request) => { setSelectedRequest(request); setShowApproveModal(true); }}
        onReject={(request) => {
          setSelectedRequest(request);
          setRejectReason('');
          setShowRejectModal(true);
        }}
      />

      {showApproveModal && selectedRequest && (
        <ApproveDialog
          request={selectedRequest}
          onConfirm={handleApprove}
          onClose={() => { setShowApproveModal(false); setSelectedRequest(null); }}
          processing={processing}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectDialog
          request={selectedRequest}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={handleReject}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectReason('');
          }}
          processing={processing}
        />
      )}
    </>
  );
}

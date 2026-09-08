import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import WhitelistBody from './whitelist/WhitelistBody';
import WhitelistSkeleton from './whitelist/WhitelistSkeleton';
import { DetailsDialog, ActionDialog } from './whitelist/WhitelistModals';

/**
 * Whitelist requests — container.
 *
 * All state, effects and handlers; the body and the two dialogs draw them. Same
 * endpoints, same toasts, same refusal when a rejection carries no reason.
 */
export default function ManageWhitelistRequests() {
  const deviceType = useDeviceType();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [activeTab, setActiveTab] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [reviewComment, setReviewComment] = useState('');
  // Whether the decision dialog was reached from the record, so closing it
  // knows whether to step back there or out to the list.
  const [actionFromDetails, setActionFromDetails] = useState(false);
  /*
   * In flight, so the confirm button cannot be pressed twice.
   *
   * There was no such state at all: a double-click sent approve twice, and a
   * whitelist approval is not idempotent — the second call lands on a request
   * that is no longer pending and fails, so the officer saw a success toast
   * and an error toast for one action.
   */
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await superAdminAPI.getWhitelistRequests();
      setRequests(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load whitelist requests');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  /*
   * The visible list, derived rather than stored.
   *
   * It used to live in its own `useState` kept in step by an effect on
   * `[requests, activeTab]`, which means every tab click rendered the old list
   * once before the effect corrected it. Same filter, one render.
   */
  const filteredRequests = activeTab === 'all'
    ? requests
    : requests.filter((req) => req.status === activeTab);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  /*
   * The decision dialog replaces the record rather than stacking on top of it.
   *
   * Approve and Reject can be reached from inside Details, and leaving Details
   * mounted underneath meant two dialogs and two focus traps at once. Closing
   * the decision now steps back to the record if that is where it was opened
   * from, and to the list otherwise — the same shape `StudentJobs` uses for
   * Details → Apply.
   */
  const handleOpenActionModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setReviewComment('');
    setActionFromDetails(showDetailsModal);
    setShowDetailsModal(false);
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionType(null);
    setReviewComment('');
    if (actionFromDetails) {
      setActionFromDetails(false);
      setShowDetailsModal(true);
    } else {
      setSelectedRequest(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || processing) return;

    try {
      setProcessing(true);
      await superAdminAPI.approveWhitelistRequest(selectedRequest.id, reviewComment);
      toast.success('Whitelist request approved successfully');
      setShowActionModal(false);
      setShowDetailsModal(false);
      setActionFromDetails(false);
      setSelectedRequest(null);
      setReviewComment('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || processing) return;

    if (!reviewComment.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      await superAdminAPI.rejectWhitelistRequest(selectedRequest.id, reviewComment);
      toast.success('Whitelist request rejected');
      setShowActionModal(false);
      setShowDetailsModal(false);
      setActionFromDetails(false);
      setSelectedRequest(null);
      setReviewComment('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitAction = () => {
    if (actionType === 'approve') {
      handleApprove();
    } else if (actionType === 'reject') {
      handleReject();
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  if (showSkeleton) return <WhitelistSkeleton layout={deviceType} />;

  return (
    <>
      <WhitelistBody
        layout={deviceType}
        requests={filteredRequests}
        stats={stats}
        activeTab={activeTab}
        onTab={setActiveTab}
        onView={handleViewDetails}
        onApprove={(request) => handleOpenActionModal(request, 'approve')}
        onReject={(request) => handleOpenActionModal(request, 'reject')}
      />

      {showDetailsModal && selectedRequest && (
        <DetailsDialog
          request={selectedRequest}
          onApprove={(request) => handleOpenActionModal(request, 'approve')}
          onReject={(request) => handleOpenActionModal(request, 'reject')}
          onClose={() => { setShowDetailsModal(false); setSelectedRequest(null); }}
        />
      )}

      {showActionModal && selectedRequest && (
        <ActionDialog
          request={selectedRequest}
          action={actionType}
          comment={reviewComment}
          onCommentChange={setReviewComment}
          onConfirm={handleSubmitAction}
          onClose={closeActionModal}
          processing={processing}
        />
      )}
    </>
  );
}

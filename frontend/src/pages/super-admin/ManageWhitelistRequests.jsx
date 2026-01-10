import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  User,
  Mail,
  Building2,
  Calendar,
  FileText,
  History,
  MessageSquare,
} from 'lucide-react';

export default function ManageWhitelistRequests() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, activeTab]);

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

  const filterRequests = () => {
    let filtered = requests;

    if (activeTab !== 'all') {
      filtered = filtered.filter((req) => req.status === activeTab);
    }

    setFilteredRequests(filtered);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleOpenActionModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setReviewComment('');
    setShowActionModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await superAdminAPI.approveWhitelistRequest(selectedRequest.id, reviewComment);
      toast.success('Whitelist request approved successfully');
      setShowActionModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
      setReviewComment('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!reviewComment.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await superAdminAPI.rejectWhitelistRequest(selectedRequest.id, reviewComment);
      toast.success('Whitelist request rejected');
      setShowActionModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
      setReviewComment('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleSubmitAction = () => {
    if (actionType === 'approve') {
      handleApprove();
    } else if (actionType === 'reject') {
      handleReject();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-secondary">Unknown</span>;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-pink-50 pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600 rounded-2xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <FileText className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Whitelist Requests
              </h1>
              <p className="text-rose-100 text-lg">
                Review and manage whitelist requests from placement officers for blacklisted students
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <button onClick={() => setActiveTab('all')} className="text-left transform hover:scale-105 transition-transform duration-200">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg">
                <FileText className="text-white" size={28} />
              </div>
            </div>
          </div>
        </button>
        <button onClick={() => setActiveTab('pending')} className="text-left transform hover:scale-105 transition-transform duration-200">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">{stats.pending}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg">
                <AlertTriangle className="text-white" size={28} />
              </div>
            </div>
          </div>
        </button>
        <button onClick={() => setActiveTab('approved')} className="text-left transform hover:scale-105 transition-transform duration-200">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-4xl font-bold text-green-600 mt-2">{stats.approved}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg">
                <CheckCircle className="text-white" size={28} />
              </div>
            </div>
          </div>
        </button>
        <button onClick={() => setActiveTab('rejected')} className="text-left transform hover:scale-105 transition-transform duration-200">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-4xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl shadow-lg">
                <XCircle className="text-white" size={28} />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-2xl shadow-lg p-2">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'approved'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'rejected'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Rejected ({stats.rejected})
          </button>
        </nav>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th>Student Details</th>
                <th>College</th>
                <th>Blacklist Reason</th>
                <th>Whitelist Reason</th>
                <th>Requested By</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-gray-500 py-8">
                    No {activeTab !== 'all' ? activeTab : ''} whitelist requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">{request.student_name}</p>
                        <p className="text-sm text-gray-600">PRN: {request.student_prn}</p>
                        <p className="text-sm text-gray-500">{request.student_email}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Building2 size={16} className="text-gray-400" />
                        <span className="text-sm">{request.college_name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {request.blacklist_reason || 'N/A'}
                      </p>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {request.whitelist_reason || 'N/A'}
                      </p>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{request.officer_name}</p>
                        <p className="text-sm text-gray-500">{request.officer_email}</p>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">{formatDate(request.created_at)}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOpenActionModal(request, 'approve')}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(request, 'reject')}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {filteredRequests.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {requests.length} whitelist requests
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Whitelist Request Details</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Request ID: #{selectedRequest.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Request Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Request Status:</span>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Student Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <User size={20} className="text-primary-600" />
                  <span>Student Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Student Name</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.student_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">PRN</p>
                    <p className="font-mono font-semibold text-gray-900">{selectedRequest.student_prn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm text-gray-900">{selectedRequest.student_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Branch</p>
                    <p className="text-gray-900">{selectedRequest.student_branch || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* College Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <Building2 size={20} className="text-primary-600" />
                  <span>College Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">College Name</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.college_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Region</p>
                    <p className="text-gray-900">{selectedRequest.region_name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Blacklist Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <AlertTriangle size={20} className="text-red-600" />
                  <span>Blacklist Information</span>
                </h3>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Blacklist Reason</p>
                  <p className="text-gray-900">{selectedRequest.blacklist_reason || 'N/A'}</p>
                  {selectedRequest.blacklisted_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Blacklisted on: {formatDate(selectedRequest.blacklisted_at)}
                    </p>
                  )}
                  {selectedRequest.blacklisted_by && (
                    <p className="text-xs text-gray-500">
                      Blacklisted by: {selectedRequest.blacklisted_by_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Whitelist Request Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <MessageSquare size={20} className="text-green-600" />
                  <span>Whitelist Request</span>
                </h3>
                <div className="bg-green-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Whitelist Reason</p>
                    <p className="text-gray-900">{selectedRequest.whitelist_reason || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Requested By</p>
                      <p className="font-medium text-gray-900">{selectedRequest.officer_name}</p>
                      <p className="text-xs text-gray-500">{selectedRequest.officer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Request Date</p>
                      <p className="text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Information (if reviewed) */}
              {(selectedRequest.status === 'approved' || selectedRequest.status === 'rejected') && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                    <History size={20} className="text-primary-600" />
                    <span>Review Information</span>
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    selectedRequest.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {selectedRequest.review_comment && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">Review Comment</p>
                        <p className="text-gray-900">{selectedRequest.review_comment}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedRequest.reviewed_by_name && (
                        <div>
                          <p className="text-gray-600">Reviewed By</p>
                          <p className="font-medium text-gray-900">{selectedRequest.reviewed_by_name}</p>
                        </div>
                      )}
                      {selectedRequest.reviewed_at && (
                        <div>
                          <p className="text-gray-600">Reviewed On</p>
                          <p className="text-gray-900">{formatDate(selectedRequest.reviewed_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end space-x-3">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleOpenActionModal(selectedRequest, 'reject')}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      <XCircle size={18} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleOpenActionModal(selectedRequest, 'approve')}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <CheckCircle size={18} />
                      <span>Approve</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Whitelist Request
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Student</p>
                <p className="font-semibold text-gray-900">{selectedRequest.student_name}</p>
                <p className="text-sm text-gray-600 mt-1">PRN: {selectedRequest.student_prn}</p>
              </div>

              <div>
                <label className="label">
                  {actionType === 'approve' ? 'Comment (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  className="input"
                  rows="4"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any comments about this approval...'
                      : 'Provide a clear reason for rejecting this request...'
                  }
                  required={actionType === 'reject'}
                />
              </div>

              <div className={`p-3 rounded-lg ${
                actionType === 'approve' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="text-sm font-medium text-gray-900">
                  {actionType === 'approve'
                    ? 'This will remove the student from the blacklist and restore their account.'
                    : 'This will keep the student blacklisted and notify the placement officer.'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionType(null);
                  setReviewComment('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                className={`btn flex-1 ${
                  actionType === 'approve' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

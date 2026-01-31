import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { placementOfficerAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Briefcase, CheckCircle, XCircle, Clock, Plus, Calendar, Building2, IndianRupee } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';

export default function MyJobRequests() {
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

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

  const filteredRequests = jobRequests.filter((request) => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };

    const icons = {
      pending: <Clock size={16} />,
      approved: <CheckCircle size={16} />,
      rejected: <XCircle size={16} />,
    };

    return (
      <span className={`w-fit inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 ${styles[status]}`}>
        {icons[status]}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  if (loading) return <LoadingSpinner />;

  const pendingCount = jobRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = jobRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = jobRequests.filter((r) => r.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <DashboardHeader
          icon={Briefcase}
          title="My Job Requests"
          subtitle="Track status of your job posting requests"
        />
        <Link
          to="/placement-officer/create-job-request"
          className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>New Job Request</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <GlassCard
          variant="elevated"
          className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            filter === 'all' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setFilter('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Total Requests</p>
              <p className="text-4xl font-bold text-blue-600">{jobRequests.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-3 shadow-lg">
              <Briefcase className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            filter === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => setFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Pending</p>
              <p className="text-4xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-3 shadow-lg">
              <Clock className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            filter === 'approved' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setFilter('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Approved</p>
              <p className="text-4xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-3 shadow-lg">
              <CheckCircle className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          variant="elevated"
          className={`p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            filter === 'rejected' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => setFilter('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Rejected</p>
              <p className="text-4xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-3 shadow-lg">
              <XCircle className="text-white" size={32} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter Tabs */}
      <GlassCard variant="elevated" className="p-6 mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({jobRequests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              filter === 'pending'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              filter === 'approved'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              filter === 'rejected'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </GlassCard>

      {/* Job Requests List */}
      {filteredRequests.length === 0 ? (
        <GlassCard variant="elevated" className="p-12 text-center">
          <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-xl font-bold mb-2">
            {filter === 'all' ? 'No job requests yet' : `No ${filter} requests`}
          </p>
          <p className="text-gray-500 text-sm font-medium">
            {filter === 'all' && 'Create a new job request to get started'}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {filteredRequests.map((request) => (
            <GlassCard
              key={request.id}
              variant="elevated"
              className="p-8 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
                      <Briefcase className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {request.job_title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Building2 size={18} className="text-gray-500" />
                        <p className="text-gray-600 font-semibold">{request.company_name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-3 font-medium">
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} className="text-blue-600" />
                      <span>Requested: {new Date(request.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    {request.reviewed_at && (
                      <div className="flex items-center space-x-1">
                        <Calendar size={16} className="text-green-600" />
                        <span>Reviewed: {new Date(request.reviewed_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-5 border-2 border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Briefcase size={16} className="mr-2 text-blue-600" />
                    Job Description
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3 font-medium">{request.job_description}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200">
                  <p className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <IndianRupee size={16} className="mr-2 text-green-600" />
                    Salary Package
                  </p>
                  <p className="text-lg text-green-700 font-bold">{request.salary_range || 'Not specified'}</p>
                </div>
              </div>

              {request.status === 'rejected' && request.review_comment && (
                <div className="mt-4 p-5 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl">
                  <div className="flex items-start space-x-3">
                    <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700 font-medium">{request.review_comment}</p>
                    </div>
                  </div>
                </div>
              )}

              {request.status === 'approved' && request.review_comment && (
                <div className="mt-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-green-800 mb-1">Admin Comment:</p>
                      <p className="text-sm text-green-700 font-medium">{request.review_comment}</p>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

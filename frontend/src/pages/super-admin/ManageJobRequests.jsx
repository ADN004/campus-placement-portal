import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Briefcase, Building, MapPin, Calendar, User,
  DollarSign, Clock, GraduationCap, AlertCircle, FileText, Globe,
  Target, BookOpen, Ruler, Weight, FileCheck, Users, Home, Award
} from 'lucide-react';

export default function ManageJobRequests() {
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-grid-white/[0.05]"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Briefcase className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Pending Job Requests
              </h1>
              <p className="text-orange-100 text-lg">
                Review and approve job posting requests from Placement Officers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pending</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{jobRequests.length}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg">
              <Briefcase className="text-white" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Job Requests List */}
      {jobRequests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg text-center py-16">
          <div className="flex justify-center mb-4">
            <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
              <Briefcase className="text-gray-400" size={56} />
            </div>
          </div>
          <p className="text-gray-700 text-xl font-semibold mb-2">No pending job requests</p>
          <p className="text-gray-500">
            All job requests have been processed
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-orange-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Briefcase className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {request.job_title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Building size={16} className="text-orange-600" />
                          <span className="text-lg font-semibold text-orange-800">{request.company_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {request.location && (
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                          <MapPin size={16} className="text-orange-500" />
                          <span className="font-medium">{request.location}</span>
                        </div>
                      )}
                      {request.no_of_vacancies && (
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                          <Users size={16} className="text-blue-500" />
                          <span className="font-medium">{request.no_of_vacancies} Vacancies</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        <Calendar size={16} className="text-purple-500" />
                        <span className="font-medium">
                          Requested {new Date(request.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 bg-orange-100 px-3 py-1.5 rounded-lg">
                        <User size={16} className="text-orange-700" />
                        <span className="font-semibold text-orange-900">
                          {request.officer_name}
                        </span>
                        <span className="text-orange-600">•</span>
                        <span className="text-orange-700">{request.college_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveModal(true);
                      }}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 transform hover:scale-105"
                    >
                      <CheckCircle size={20} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 transform hover:scale-105"
                    >
                      <XCircle size={20} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-5">
                    {/* Job Description */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={18} className="text-blue-600" />
                        <h4 className="font-bold text-gray-900">Job Description</h4>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        {request.job_description || 'No description provided'}
                      </p>
                    </div>

                    {/* Company Description */}
                    {request.company_description && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Building size={18} className="text-purple-600" />
                          <h4 className="font-bold text-gray-900">About Company</h4>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                          {request.company_description}
                        </p>
                      </div>
                    )}

                    {/* Application Form URL */}
                    {request.application_form_url && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe size={18} className="text-green-600" />
                          <h4 className="font-bold text-gray-900">Application Link</h4>
                        </div>
                        <a
                          href={request.application_form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline break-all inline-flex items-center gap-1"
                        >
                          {request.application_form_url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    {/* Key Information */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={18} className="text-amber-600" />
                        <h4 className="font-bold text-gray-900">Key Information</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <DollarSign size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Salary Package</p>
                            <p className="text-base font-bold text-gray-900 mt-0.5">
                              {request.salary_range || 'Not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Application Deadline</p>
                            <p className="text-base font-bold text-gray-900 mt-0.5">
                              {request.application_deadline
                                ? new Date(request.application_deadline).toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Eligibility Criteria */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap size={18} className="text-indigo-600" />
                        <h4 className="font-bold text-gray-900">Eligibility Criteria</h4>
                      </div>
                      <div className="space-y-2.5">
                        {request.min_cgpa && (
                          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                            <span className="text-sm font-medium text-gray-600">Minimum CGPA</span>
                            <span className="text-sm font-bold text-indigo-700">{request.min_cgpa}</span>
                          </div>
                        )}
                        {request.max_backlogs !== null && request.max_backlogs !== undefined && (
                          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                            <span className="text-sm font-medium text-gray-600">Max Backlogs</span>
                            <span className="text-sm font-bold text-indigo-700">{request.max_backlogs}</span>
                          </div>
                        )}
                        {(!request.min_cgpa && (request.max_backlogs === null || request.max_backlogs === undefined)) && (
                          <p className="text-sm text-gray-500 italic">No specific criteria</p>
                        )}
                      </div>
                    </div>

                    {/* Allowed Branches */}
                    {request.allowed_branches && request.allowed_branches.length > 0 && (
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen size={18} className="text-teal-600" />
                          <h4 className="font-bold text-gray-900">Allowed Branches</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {request.allowed_branches.map((branch, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold shadow-sm"
                            >
                              {branch}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Information */}
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Target size={18} className="text-rose-600" />
                        <h4 className="font-bold text-gray-900">Target Scope</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                          <span className="text-sm font-medium text-gray-600">Target Type</span>
                          <span className="text-sm font-bold text-rose-700 capitalize">
                            {request.target_type || 'All'}
                          </span>
                        </div>
                        {request.target_regions && request.target_regions.length > 0 && (
                          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Target Regions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {request.target_regions.map((region, idx) => (
                                <span key={idx} className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium">
                                  {region}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {request.target_colleges && request.target_colleges.length > 0 && (
                          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Target Colleges</p>
                            <div className="flex flex-wrap gap-1.5">
                              {request.target_colleges.map((college, idx) => (
                                <span key={idx} className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium">
                                  {college}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extended Profile Requirements */}
                    {(request.requires_academic_extended || request.requires_physical_details ||
                      request.requires_family_details || request.requires_personal_details ||
                      request.requires_education_preferences ||
                      (request.specific_field_requirements && Object.keys(request.specific_field_requirements).length > 0)) && (
                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Award size={18} className="text-violet-600" />
                          <h4 className="font-bold text-gray-900">Extended Profile Requirements</h4>
                        </div>
                        <div className="space-y-2">
                          {request.requires_academic_extended && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <GraduationCap size={16} className="text-violet-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">Academic Details (10th/12th marks required)</span>
                            </div>
                          )}
                          {request.requires_physical_details && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <Ruler size={16} className="text-violet-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">Physical Details (Height, Weight required)</span>
                            </div>
                          )}
                          {request.requires_family_details && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <Users size={16} className="text-violet-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">Family Details required</span>
                            </div>
                          )}
                          {request.requires_personal_details && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <Home size={16} className="text-violet-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">Personal Details required</span>
                            </div>
                          )}
                          {request.requires_education_preferences && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <BookOpen size={16} className="text-violet-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">Education Preferences required</span>
                            </div>
                          )}

                          {/* Specific Field Requirements */}
                          {request.specific_field_requirements && Object.keys(request.specific_field_requirements).length > 0 && (
                            <div className="bg-violet-100 rounded-lg px-3 py-2 mt-2">
                              <p className="text-xs font-semibold text-violet-900 mb-2">Specific Requirements:</p>
                              <div className="space-y-1.5">
                                {Object.entries(request.specific_field_requirements).map(([field, req]) => (
                                  <div key={field} className="bg-white rounded px-2 py-1.5 text-xs">
                                    <span className="font-semibold text-gray-700 capitalize">
                                      {field.replace(/_/g, ' ')}:
                                    </span>{' '}
                                    {req.min && <span className="text-violet-700">Min: {req.min}</span>}
                                    {req.max && <span className="text-violet-700 ml-2">Max: {req.max}</span>}
                                    {req.required && <span className="text-red-600 ml-2">(Required)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Required Documents */}
                    {request.requires_document_verification && (
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3">
                          <FileCheck size={18} className="text-emerald-600" />
                          <h4 className="font-bold text-gray-900">Required Documents</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">PAN Card</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">Aadhar Card</span>
                          </div>
                          {request.specific_field_requirements?.has_passport?.required && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Passport</span>
                            </div>
                          )}
                          {request.specific_field_requirements?.has_driving_license?.required && (
                            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Driving License</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">Approve Job Request</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6 space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <p className="text-gray-700 mb-3">
                    You are about to approve the following job posting:
                  </p>
                  <div className="space-y-2 bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-green-600" />
                      <span className="font-bold text-gray-900">{selectedRequest.job_title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-green-600" />
                      <span className="font-semibold text-gray-700">{selectedRequest.company_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-blue-900">
                    This will create a new job posting and make it visible to all eligible students. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors duration-200"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={processing}
                >
                  <CheckCircle size={18} />
                  <span>{processing ? 'Approving...' : 'Approve Job'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <XCircle className="text-white" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">Reject Job Request</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6 space-y-4">
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                  <p className="text-gray-700 mb-3">
                    You are about to reject the following job request:
                  </p>
                  <div className="space-y-2 bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-red-600" />
                      <span className="font-bold text-gray-900">{selectedRequest.job_title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-red-600" />
                      <span className="font-semibold text-gray-700">{selectedRequest.company_name}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                    rows="4"
                    placeholder="Provide a reason for rejection to help the placement officer understand the decision..."
                  />
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-amber-900">
                    The placement officer will be notified about this rejection. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectReason('');
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors duration-200"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={processing}
                >
                  <XCircle size={18} />
                  <span>{processing ? 'Rejecting...' : 'Reject Request'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

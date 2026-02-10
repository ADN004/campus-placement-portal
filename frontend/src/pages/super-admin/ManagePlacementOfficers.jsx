import { useState, useEffect, useRef } from 'react';
import { superAdminAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Eye,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  History,
  Plus,
  Trash2,
  AlertTriangle,
  Key,
  Camera,
  Upload,
  User,
} from 'lucide-react';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';

export default function ManagePlacementOfficers() {
  const [officers, setOfficers] = useState([]);
  const [filteredOfficers, setFilteredOfficers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [officerHistory, setOfficerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [formData, setFormData] = useState({
    college_id: '',
    officer_name: '',
    phone_number: '',
    designation: '',
    officer_email: '',
    college_email: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    filterOfficers();
  }, [officers, searchQuery, selectedRegion]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [officersRes, regionsRes, collegesRes] = await Promise.all([
        superAdminAPI.getPlacementOfficers(),
        commonAPI.getRegions(),
        commonAPI.getColleges(),
      ]);

      setOfficers(officersRes.data.data || []);
      setRegions(regionsRes.data.data || []);
      setColleges(collegesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOfficers = () => {
    let filtered = officers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (officer) =>
          officer.officer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          officer.college_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          officer.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by region
    if (selectedRegion) {
      filtered = filtered.filter(
        (officer) => officer.region_id === parseInt(selectedRegion)
      );
    }

    setFilteredOfficers(filtered);
  };

  const handleViewDetails = (officer) => {
    setSelectedOfficer(officer);
    setShowDetailsModal(true);
  };

  const handleViewHistory = async (officer) => {
    setSelectedOfficer(officer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setOfficerHistory([]);

    try {
      const response = await superAdminAPI.getOfficerHistory(officer.college_id);
      setOfficerHistory(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load officer history');
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddOfficer = () => {
    setFormData({
      college_id: '',
      officer_name: '',
      phone_number: '',
      designation: '',
      officer_email: '',
      college_email: '',
    });
    setShowAddModal(true);
  };

  const handleSubmitAddOfficer = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await superAdminAPI.addPlacementOfficer(formData);
      toast.success('Placement officer added successfully');
      setShowAddModal(false);
      fetchInitialData(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add placement officer');
      console.error('Error adding officer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveOfficer = (officer) => {
    setSelectedOfficer(officer);
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedOfficer) return;

    setSubmitting(true);
    try {
      await superAdminAPI.deletePlacementOfficer(selectedOfficer.id);
      toast.success('Placement officer removed successfully');
      setShowRemoveModal(false);
      setSelectedOfficer(null);
      fetchInitialData(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove placement officer');
      console.error('Error removing officer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearHistory = () => {
    setConfirmText('');
    setShowClearHistoryModal(true);
  };

  const handleConfirmClearHistory = async () => {
    if (confirmText !== 'DELETE' || !selectedOfficer) return;

    setSubmitting(true);
    try {
      await superAdminAPI.clearOfficerHistory(selectedOfficer.college_id);
      toast.success('Officer history cleared successfully');
      setShowClearHistoryModal(false);
      setConfirmText('');
      // Refresh history
      const response = await superAdminAPI.getOfficerHistory(selectedOfficer.college_id);
      setOfficerHistory(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear history');
      console.error('Error clearing history:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = (officer) => {
    setSelectedOfficer(officer);
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedOfficer) return;

    setSubmitting(true);
    try {
      await superAdminAPI.resetPlacementOfficerPassword(selectedOfficer.id);
      toast.success('Password reset to default (123) successfully');
      setShowResetPasswordModal(false);
      setSelectedOfficer(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
      console.error('Error resetting password:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active' || status === 1 || status === true) {
      return <span className="badge badge-success">Active</span>;
    }
    return <span className="badge badge-danger">Inactive</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // View officer photo in new tab (Super admins cannot upload/delete officer photos)
  const handleViewPhoto = (photoUrl) => {
    if (photoUrl) {
      window.open(photoUrl, '_blank');
    }
  };

  if (showSkeleton) return <TablePageSkeleton tableColumns={6} hasSearch={true} hasFilters={true} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 pb-8">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        <AnimatedSection delay={0}>
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 rounded-3xl shadow-2xl mb-8 p-10">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 animate-pulse"></div>
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-3xl blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-white/20 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30">
                  <User className="text-white" size={40} />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                  Manage Placement Officers
                </h1>
                <p className="text-purple-100 text-lg font-medium">
                  View and manage placement officers across all 60 colleges
                </p>
              </div>
            </div>
            <button
              onClick={handleAddOfficer}
              className="px-7 py-4 bg-white/95 backdrop-blur-sm text-purple-700 hover:bg-white hover:shadow-2xl rounded-2xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-white/50"
            >
              <Plus size={22} />
              <span className="text-lg">Add Officer</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Total Officers</p>
                <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{officers.length}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <Building2 className="text-white" size={32} />
              </div>
            </div>
          </div>
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Active Officers</p>
                <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {officers.filter((o) => o.status === 'active' || o.status === 1).length}
                </p>
              </div>
              <div className="p-5 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <CheckCircle className="text-white" size={32} />
              </div>
            </div>
          </div>
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 p-8 border border-white/50 overflow-hidden hover:scale-105 transform">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Regions Covered</p>
                <p className="text-5xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{regions.length}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-400 via-purple-500 to-violet-600 rounded-2xl shadow-xl group-hover:rotate-12 transition-transform duration-500">
                <MapPin className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>
        </AnimatedSection>

        <AnimatedSection delay={0.08}>
        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 mb-8 border border-white/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name, college, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Region Filter */}
          <div>
            <label className="label">Filter by Region</label>
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="input pl-10"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.region_name || region.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || selectedRegion) && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <span className="badge badge-info">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {selectedRegion && (
              <span className="badge badge-info">
                Region: {regions.find((r) => r.id === parseInt(selectedRegion))?.region_name || regions.find((r) => r.id === parseInt(selectedRegion))?.name}
                <button
                  onClick={() => setSelectedRegion('')}
                  className="ml-2 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRegion('');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
        </AnimatedSection>

        <AnimatedSection delay={0.16}>
        {/* Officers Table */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Officer Name</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Email</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">College</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Region</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-100">
                {filteredOfficers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16">
                      <User className="mx-auto mb-4 text-gray-300" size={64} />
                      <p className="text-gray-500 text-lg font-semibold">
                        {searchQuery || selectedRegion
                          ? 'No officers found matching your filters'
                          : 'No placement officers found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOfficers.map((officer) => (
                    <tr key={officer.id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-200 group">
                      <td className="px-6 py-5 font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{officer.officer_name || 'N/A'}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                          <Phone size={16} className="text-purple-400" />
                          <span className="text-sm">{officer.phone_number || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                          <Mail size={16} className="text-pink-400" />
                          <span className="text-sm">{officer.officer_email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Building2 size={16} className="text-blue-400" />
                          <span className="truncate text-sm">{officer.college_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} className="text-rose-400" />
                          <span className="text-sm">{officer.region_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">{getStatusBadge(officer.status)}</td>
                      <td className="px-6 py-5">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(officer)}
                            className="p-2 text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleViewHistory(officer)}
                            className="p-2 text-purple-600 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-violet-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="View History"
                          >
                            <History size={18} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(officer)}
                            className="p-2 text-orange-600 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Reset Password to Default"
                          >
                            <Key size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveOfficer(officer)}
                            className="p-2 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Remove Officer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {filteredOfficers.length > 0 && (
          <div className="px-8 py-6 bg-gradient-to-r from-purple-50 to-pink-50 border-t-2 border-purple-200 rounded-b-3xl">
            <p className="text-sm font-bold text-gray-700">
              Showing <span className="text-purple-600">{filteredOfficers.length}</span> of <span className="text-purple-600">{officers.length}</span> placement officers
            </p>
          </div>
        )}
        </div>
        </AnimatedSection>
      </div>

    {/* Officer Details Modal */}
    {showDetailsModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Officer Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOfficer(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <Building2 size={20} className="text-primary-600" />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Officer Name</p>
                    <p className="font-semibold text-gray-900">
                      {selectedOfficer.officer_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedOfficer.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium text-gray-900 flex items-center space-x-2">
                      <Phone size={16} className="text-gray-400" />
                      <span>{selectedOfficer.phone_number || 'N/A'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-medium text-gray-900 flex items-center space-x-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-sm">{selectedOfficer.officer_email || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Photo */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <Camera size={20} className="text-primary-600" />
                  <span>Profile Photo</span>
                </h3>

                <div className="flex items-start space-x-4">
                  {selectedOfficer.photo_url ? (
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => handleViewPhoto(selectedOfficer.photo_url)}
                      title="Click to view full size"
                    >
                      <img
                        src={selectedOfficer.photo_url}
                        alt="Officer Profile"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye size={24} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User size={48} className="text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    {selectedOfficer.photo_url ? (
                      <div>
                        <button
                          onClick={() => handleViewPhoto(selectedOfficer.photo_url)}
                          className="btn btn-secondary flex items-center space-x-2"
                        >
                          <Eye size={18} />
                          <span>View Photo</span>
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Officers manage their own profile photos
                        </p>
                        {selectedOfficer.photo_uploaded_at && (
                          <p className="text-xs text-gray-600 mt-1">
                            Uploaded: {formatDate(selectedOfficer.photo_uploaded_at)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">No profile photo uploaded</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Officers can upload photos from their own dashboard
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* College & Region Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center space-x-2">
                  <MapPin size={20} className="text-primary-600" />
                  <span>College & Region</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">College Name</p>
                    <p className="font-semibold text-gray-900">
                      {selectedOfficer.college_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Region</p>
                    <p className="font-semibold text-gray-900">
                      {selectedOfficer.region_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">College ID</p>
                    <p className="font-mono text-gray-700">{selectedOfficer.college_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Region ID</p>
                    <p className="font-mono text-gray-700">{selectedOfficer.region_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Account Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-mono text-gray-700">{selectedOfficer.user_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Officer ID</p>
                    <p className="font-mono text-gray-700">{selectedOfficer.id || 'N/A'}</p>
                  </div>
                  {selectedOfficer.created_at && (
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="text-gray-700">{formatDate(selectedOfficer.created_at)}</p>
                    </div>
                  )}
                  {selectedOfficer.updated_at && (
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="text-gray-700">{formatDate(selectedOfficer.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleViewHistory(selectedOfficer)}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <History size={18} />
                  <span>View History</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOfficer(null);
                  }}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Officer History Modal */}
      {showHistoryModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Officer History</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOfficer.college_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedOfficer(null);
                    setOfficerHistory([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : officerHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">No history records found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    This college has no previous placement officers on record
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {officerHistory.map((record, index) => (
                    <div
                      key={record.id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {record.officer_name || 'N/A'}
                            </h3>
                            {record.status && getStatusBadge(record.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Phone size={14} />
                              <span>{record.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Mail size={14} />
                              <span>{record.officer_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(record.created_at || record.updated_at) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                          <div className="flex space-x-4">
                            {record.created_at && (
                              <span>Created: {formatDate(record.created_at)}</span>
                            )}
                            {record.updated_at && (
                              <span>Updated: {formatDate(record.updated_at)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between">
                {officerHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Trash2 size={18} />
                    <span>Clear History</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedOfficer(null);
                    setOfficerHistory([]);
                  }}
                  className="btn btn-primary ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Officer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Add Placement Officer</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitAddOfficer} className="p-6 space-y-4">
              <div>
                <label className="label">College *</label>
                <select
                  value={formData.college_id}
                  onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select College</option>
                  {colleges.map((college) => (
                    <option key={college.id} value={college.id}>
                      {college.college_name || college.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Officer Name *</label>
                <input
                  type="text"
                  value={formData.officer_name}
                  onChange={(e) => setFormData({ ...formData, officer_name: e.target.value })}
                  className="input"
                  placeholder="Enter officer name"
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="input"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="label">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="input"
                  placeholder="e.g., Placement Coordinator"
                />
              </div>

              <div>
                <label className="label">Officer Email</label>
                <input
                  type="email"
                  value={formData.officer_email}
                  onChange={(e) => setFormData({ ...formData, officer_email: e.target.value })}
                  className="input"
                  placeholder="officer@example.com"
                />
              </div>

              <div>
                <label className="label">College Email</label>
                <input
                  type="email"
                  value={formData.college_email}
                  onChange={(e) => setFormData({ ...formData, college_email: e.target.value })}
                  className="input"
                  placeholder="college@example.com"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If this college already has an active officer, they will be automatically moved to history and their account will be deactivated.
                </p>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Adding...' : 'Add Officer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Officer Confirmation Modal */}
      {showRemoveModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Remove Placement Officer</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-2">
                    Are you sure you want to remove this officer?
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Officer:</strong> {selectedOfficer.officer_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>College:</strong> {selectedOfficer.college_name}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>This action will:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 ml-4">
                  <li>• Deactivate the officer's account</li>
                  <li>• Move officer details to history</li>
                  <li>• Prevent officer from logging in</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleConfirmRemove}
                  disabled={submitting}
                  className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
                >
                  {submitting ? 'Removing...' : 'Yes, Remove Officer'}
                </button>
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setSelectedOfficer(null);
                  }}
                  disabled={submitting}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Warning Modal */}
      {showClearHistoryModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-red-900">⚠️ Clear Officer History</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-red-900 font-bold mb-2">
                    This action cannot be undone!
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    You are about to permanently delete all officer history records for:
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedOfficer.college_name}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="text-sm text-red-900 font-semibold mb-2">
                  Warning: This will permanently delete:
                </p>
                <ul className="text-sm text-red-800 space-y-1 ml-4">
                  <li>• All historical officer records</li>
                  <li>• Officer appointment dates</li>
                  <li>• Officer removal reasons</li>
                  <li>• Complete officer change history</li>
                </ul>
              </div>

              <div>
                <label className="label text-red-900 font-semibold">
                  Type "DELETE" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input border-red-300 focus:border-red-500"
                  placeholder="Type DELETE"
                  autoComplete="off"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleConfirmClearHistory}
                  disabled={submitting || confirmText !== 'DELETE'}
                  className="btn bg-red-600 text-white hover:bg-red-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Clearing...' : 'Delete History Forever'}
                </button>
                <button
                  onClick={() => {
                    setShowClearHistoryModal(false);
                    setConfirmText('');
                  }}
                  disabled={submitting}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordModal && selectedOfficer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Reset Password to Default</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Key className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-gray-900 font-medium mb-2">
                    Are you sure you want to reset the password for this officer?
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Officer:</strong> {selectedOfficer.officer_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>College:</strong> {selectedOfficer.college_name}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>This action will:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
                  <li>• Reset the officer's password to <strong>123</strong></li>
                  <li>• Allow them to login with their phone number and password 123</li>
                  <li>• Not affect any of their data or college information</li>
                  <li>• They should change this password after logging in</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleConfirmResetPassword}
                  disabled={submitting}
                  className="btn bg-orange-600 text-white hover:bg-orange-700 flex-1"
                >
                  {submitting ? 'Resetting...' : 'Yes, Reset Password'}
                </button>
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedOfficer(null);
                  }}
                  disabled={submitting}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

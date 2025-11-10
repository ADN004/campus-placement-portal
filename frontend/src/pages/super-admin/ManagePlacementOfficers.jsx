import { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function ManagePlacementOfficers() {
  const [officers, setOfficers] = useState([]);
  const [filteredOfficers, setFilteredOfficers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
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

  const getStatusBadge = (status) => {
    if (status === 'active' || status === 1 || status === true) {
      return <span className="badge badge-success">Active</span>;
    }
    return <span className="badge badge-danger">Inactive</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Placement Officers</h1>
          <p className="text-gray-600 mt-2">
            View and manage placement officers across all 60 colleges
          </p>
        </div>
        <button
          onClick={handleAddOfficer}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Officer</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Officers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{officers.length}</p>
            </div>
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
              <Building2 size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Officers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {officers.filter((o) => o.status === 'active' || o.status === 1).length}
              </p>
            </div>
            <div className="p-4 rounded-full bg-green-100 text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Regions Covered</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{regions.length}</p>
            </div>
            <div className="p-4 rounded-full bg-purple-100 text-purple-600">
              <MapPin size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
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

      {/* Officers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Officer Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>College</th>
                <th>Region</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-8">
                    {searchQuery || selectedRegion
                      ? 'No officers found matching your filters'
                      : 'No placement officers found'}
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => (
                  <tr key={officer.id}>
                    <td className="font-semibold">{officer.officer_name || 'N/A'}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Phone size={16} className="text-gray-400" />
                        <span>{officer.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-sm">{officer.officer_phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <div className="flex items-center space-x-2">
                        <Building2 size={16} className="text-gray-400" />
                        <span className="truncate">{officer.college_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{officer.region_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(officer.status)}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(officer)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleViewHistory(officer)}
                          className="text-purple-600 hover:text-purple-800"
                          title="View History"
                        >
                          <History size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveOfficer(officer)}
                          className="text-red-600 hover:text-red-800"
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
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredOfficers.length} of {officers.length} placement officers
            </p>
          </div>
        )}
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
                      <span>{selectedOfficer.email || 'N/A'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-medium text-gray-900 flex items-center space-x-2">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-sm">{selectedOfficer.officer_phone || 'N/A'}</span>
                    </p>
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
    </div>
  );
}

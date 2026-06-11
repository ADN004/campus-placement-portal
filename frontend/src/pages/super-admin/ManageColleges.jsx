import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Check,
  Power,
  Users,
  UserCheck,
  Globe2,
  GraduationCap,
  UploadCloud,
} from 'lucide-react';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';
import BulkImportModal from '../../components/BulkImportModal';

const EMPTY_COLLEGE_FORM = {
  college_name: '',
  college_code: '',
  region_id: '',
  sort_order: '',
  branches: '',
};

export default function ManageColleges() {
  const [colleges, setColleges] = useState([]);
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // College add/edit modal
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [collegeForm, setCollegeForm] = useState(EMPTY_COLLEGE_FORM);

  // Bulk import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Region management modal
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionForm, setRegionForm] = useState({ region_name: '', region_code: '' });
  const [editingRegion, setEditingRegion] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterColleges();
  }, [colleges, searchQuery, selectedRegion, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [collegesRes, regionsRes] = await Promise.all([
        superAdminAPI.getAllColleges(),
        superAdminAPI.getAllRegions(),
      ]);
      setColleges(collegesRes.data.data || []);
      setRegions(regionsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load colleges');
      console.error('Error fetching colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [collegesRes, regionsRes] = await Promise.all([
        superAdminAPI.getAllColleges(),
        superAdminAPI.getAllRegions(),
      ]);
      setColleges(collegesRes.data.data || []);
      setRegions(regionsRes.data.data || []);
    } catch (error) {
      console.error('Error refreshing colleges:', error);
    }
  };

  const filterColleges = () => {
    let filtered = colleges;

    if (searchQuery) {
      filtered = filtered.filter(
        (college) =>
          college.college_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          college.college_code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter(
        (college) => college.region_id === parseInt(selectedRegion)
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((college) => college.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((college) => !college.is_active);
    }

    setFilteredColleges(filtered);
  };

  // ========================================
  // COLLEGE HANDLERS
  // ========================================

  const openAddCollege = () => {
    setEditingCollege(null);
    setCollegeForm(EMPTY_COLLEGE_FORM);
    setShowCollegeModal(true);
  };

  const openEditCollege = (college) => {
    setEditingCollege(college);
    setCollegeForm({
      college_name: college.college_name,
      college_code: college.college_code,
      region_id: String(college.region_id),
      sort_order: college.sort_order === 999 ? '' : String(college.sort_order),
      branches: '',
    });
    setShowCollegeModal(true);
  };

  const closeCollegeModal = () => {
    setShowCollegeModal(false);
    setEditingCollege(null);
    setCollegeForm(EMPTY_COLLEGE_FORM);
  };

  const handleSaveCollege = async () => {
    if (!collegeForm.college_name.trim() || !collegeForm.college_code.trim() || !collegeForm.region_id) {
      toast.error('Please fill in college name, code and region');
      return;
    }

    const payload = {
      college_name: collegeForm.college_name.trim(),
      college_code: collegeForm.college_code.trim(),
      region_id: parseInt(collegeForm.region_id),
    };
    if (collegeForm.sort_order !== '' && !isNaN(parseInt(collegeForm.sort_order))) {
      payload.sort_order = parseInt(collegeForm.sort_order);
    }
    if (!editingCollege && collegeForm.branches.trim()) {
      payload.branches = collegeForm.branches.split(',').map((b) => b.trim()).filter(Boolean);
    }

    setSubmitting(true);
    try {
      if (editingCollege) {
        await superAdminAPI.updateCollege(editingCollege.id, payload);
        toast.success('College updated successfully');
      } else {
        await superAdminAPI.createCollege(payload);
        toast.success('College created — configure its branches next');
      }
      closeCollegeModal();
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save college');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (college) => {
    const action = college.is_active ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} ${college.college_name}?`)) return;

    try {
      await superAdminAPI.toggleCollegeActive(college.id);
      toast.success(`College ${college.is_active ? 'deactivated' : 'activated'}`);
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteCollege = async (college) => {
    if (
      !window.confirm(
        `Permanently delete ${college.college_name}? This only works when the college has no students, officers or other records.`
      )
    )
      return;

    try {
      await superAdminAPI.deleteCollege(college.id);
      toast.success('College deleted');
      await refreshData();
    } catch (error) {
      const deps = error.response?.data?.data?.dependencies;
      if (deps) {
        toast.error(
          `Cannot delete: ${deps.students} students, ${deps.officers} officers, ${deps.prn_ranges} PRN ranges linked. Deactivate it instead.`,
          { duration: 6000 }
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete college');
      }
    }
  };

  // ========================================
  // REGION HANDLERS
  // ========================================

  const resetRegionForm = () => {
    setRegionForm({ region_name: '', region_code: '' });
    setEditingRegion(null);
  };

  const handleSaveRegion = async () => {
    if (!regionForm.region_name.trim() || !regionForm.region_code.trim()) {
      toast.error('Please fill in region name and code');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRegion) {
        await superAdminAPI.updateRegion(editingRegion.id, regionForm);
        toast.success('Region updated');
      } else {
        await superAdminAPI.createRegion(regionForm);
        toast.success('Region created');
      }
      resetRegionForm();
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save region');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRegion = async (region) => {
    if (!window.confirm(`Delete region ${region.region_name}? This only works when no colleges belong to it.`)) return;

    try {
      await superAdminAPI.deleteRegion(region.id);
      toast.success('Region deleted');
      await refreshData();
    } catch (error) {
      const deps = error.response?.data?.data?.dependencies;
      if (deps) {
        toast.error(
          `Cannot delete: ${deps.colleges} colleges and ${deps.students} students are linked to this region.`,
          { duration: 6000 }
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete region');
      }
    }
  };

  if (showSkeleton) return <TablePageSkeleton tableColumns={5} hasSearch={true} hasFilters={true} />;

  const activeCount = colleges.filter((c) => c.is_active).length;

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Colleges</h1>
                <p className="text-sm text-gray-600">
                  Add, edit and organize the colleges and regions on this portal
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium transition-colors"
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                Bulk Import
              </button>
              <button
                onClick={() => setShowRegionModal(true)}
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                <Globe2 className="h-4 w-4 mr-2" />
                Manage Regions
              </button>
              <button
                onClick={openAddCollege}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add College
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by college name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.region_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Power className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center justify-end">
              <span className="font-medium">
                {filteredColleges.length} of {colleges.length} colleges
              </span>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Statistics */}
      <AnimatedSection delay={0.08}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Colleges</p>
                <p className="text-2xl font-bold text-gray-900">{colleges.length}</p>
              </div>
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <Check className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{colleges.length - activeCount}</p>
              </div>
              <Power className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regions</p>
                <p className="text-2xl font-bold text-gray-900">{regions.length}</p>
              </div>
              <Globe2 className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Colleges Table */}
      <AnimatedSection delay={0.16}>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    College
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Officer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredColleges.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No colleges found. Click “Add College” to create the first one.
                    </td>
                  </tr>
                )}
                {filteredColleges.map((college) => (
                  <tr key={college.id} className={`hover:bg-gray-50 ${!college.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{college.college_name}</div>
                        <div className="text-sm text-gray-500">{college.college_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {college.region_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        {college.student_count}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {parseInt(college.active_officer_count) > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          college.is_active
                            ? 'text-green-600 bg-green-50'
                            : 'text-gray-600 bg-gray-100'
                        }`}
                      >
                        {college.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditCollege(college)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                          title="Edit college details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(college)}
                          className={`inline-flex items-center px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
                            college.is_active
                              ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                              : 'border-green-600 text-green-600 hover:bg-green-50'
                          }`}
                          title={college.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCollege(college)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                          title="Delete (only when unused)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-sm text-gray-500 flex items-center">
            <GraduationCap className="h-4 w-4 mr-2" />
            Branches for each college are configured on the{' '}
            <Link to="/super-admin/college-branches" className="text-blue-600 hover:underline ml-1">
              College Branches
            </Link>{' '}
            page.
          </div>
        </div>
      </AnimatedSection>

      {/* Add / Edit College Modal */}
      {showCollegeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCollege ? 'Edit College' : 'Add College'}
              </h2>
              <button
                onClick={closeCollegeModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={collegeForm.college_name}
                  onChange={(e) => setCollegeForm({ ...collegeForm, college_name: e.target.value })}
                  placeholder="e.g. Government Polytechnic College Example"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={collegeForm.college_code}
                  onChange={(e) =>
                    setCollegeForm({ ...collegeForm, college_code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. GPC_EXM (short, unique)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region <span className="text-red-500">*</span>
                </label>
                <select
                  value={collegeForm.region_id}
                  onChange={(e) => setCollegeForm({ ...collegeForm, region_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                >
                  <option value="">Select region...</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.region_name}
                    </option>
                  ))}
                </select>
                {regions.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No regions yet — create one via “Manage Regions” first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="number"
                  value={collegeForm.sort_order}
                  onChange={(e) => setCollegeForm({ ...collegeForm, sort_order: e.target.value })}
                  placeholder="Lower numbers appear first (default 999)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {!editingCollege ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branches <span className="text-gray-400">(optional, comma-separated)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={collegeForm.branches}
                    onChange={(e) => setCollegeForm({ ...collegeForm, branches: e.target.value })}
                    placeholder="e.g. Computer Engineering, Electronics Engineering, Mechanical Engineering"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can also add or refine branches later on the College Branches page. Don’t
                    forget to assign a placement officer on the Placement Officers page.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Branches are edited on the College Branches page.
                </p>
              )}
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={closeCollegeModal}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCollege}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCollege ? 'Save Changes' : 'Create College'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportModal
          onClose={() => setShowImportModal(false)}
          onImported={refreshData}
        />
      )}

      {/* Manage Regions Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Manage Regions</h2>
              <button
                onClick={() => {
                  setShowRegionModal(false);
                  resetRegionForm();
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Add / edit region form */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {editingRegion ? `Editing: ${editingRegion.region_name}` : 'Add New Region'}
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={regionForm.region_name}
                    onChange={(e) => setRegionForm({ ...regionForm, region_name: e.target.value })}
                    placeholder="Region name (e.g. North Zone)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <input
                    type="text"
                    value={regionForm.region_code}
                    onChange={(e) =>
                      setRegionForm({ ...regionForm, region_code: e.target.value.toUpperCase() })
                    }
                    placeholder="Code (e.g. NZ)"
                    className="w-full sm:w-36 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <button
                    onClick={handleSaveRegion}
                    disabled={submitting || !regionForm.region_name.trim() || !regionForm.region_code.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {editingRegion ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </button>
                  {editingRegion && (
                    <button
                      onClick={resetRegionForm}
                      disabled={submitting}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Region list */}
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {regions.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No regions yet</p>
                )}
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{region.region_name}</p>
                      <p className="text-xs text-gray-500">
                        {region.region_code} · {region.college_count} colleges · {region.student_count}{' '}
                        students
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRegion(region);
                          setRegionForm({
                            region_name: region.region_name,
                            region_code: region.region_code,
                          });
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit region"
                        disabled={submitting}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRegion(region)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete region (only when empty)"
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

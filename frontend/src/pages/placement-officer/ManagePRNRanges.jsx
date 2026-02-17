import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X, Lock, Hash, Calendar, BookOpen, Shield, Eye, Download, ToggleLeft, ToggleRight, AlertCircle, User } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';

export default function ManagePRNRanges() {
  const [prnRanges, setPrnRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [rangeStudents, setRangeStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [formData, setFormData] = useState({
    start_prn: '',
    end_prn: '',
    single_prn: '',
    year: '',
    description: '',
  });

  useEffect(() => {
    fetchPRNRanges();
  }, []);

  const fetchPRNRanges = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getPRNRanges();
      setPrnRanges(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load PRN ranges');
      console.error('Error fetching PRN ranges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      start_prn: '',
      end_prn: '',
      single_prn: '',
      year: '',
      description: '',
    });
    setEditingId(null);
    setShowAddModal(false);
    setShowAddSingleModal(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!formData.start_prn || !formData.end_prn || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await placementOfficerAPI.addPRNRange(formData);
      toast.success('PRN range added successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add PRN range');
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();

    if (!formData.single_prn || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await placementOfficerAPI.addPRNRange({ single_prn: formData.single_prn, year: formData.year, description: formData.description });
      toast.success('Single PRN added successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add single PRN');
    }
  };

  const handleEdit = (range) => {
    if (range.single_prn) {
      setFormData({
        start_prn: '',
        end_prn: '',
        single_prn: range.single_prn,
        year: range.year,
        description: range.description || '',
      });
      setEditingId(range.id);
      setShowAddSingleModal(true);
    } else {
      setFormData({
        start_prn: range.start_prn,
        end_prn: range.end_prn,
        single_prn: '',
        year: range.year,
        description: range.description || '',
      });
      setEditingId(range.id);
      setShowAddModal(true);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const isSingle = showAddSingleModal;
    if (isSingle) {
      if (!formData.single_prn || !formData.year) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!formData.start_prn || !formData.end_prn || !formData.year) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    try {
      const updateData = isSingle
        ? { single_prn: formData.single_prn, year: formData.year, description: formData.description }
        : { start_prn: formData.start_prn, end_prn: formData.end_prn, year: formData.year, description: formData.description };
      await placementOfficerAPI.updatePRNRange(editingId, updateData);
      toast.success(isSingle ? 'Single PRN updated successfully' : 'PRN range updated successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update PRN range');
    }
  };

  const handleDelete = async (id, createdBy) => {
    if (createdBy === 'super_admin') {
      toast.error('You cannot delete PRN ranges created by Super Admin');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this PRN range?')) {
      return;
    }

    try {
      await placementOfficerAPI.deletePRNRange(id);
      toast.success('PRN range deleted successfully');
      fetchPRNRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete PRN range');
    }
  };

  const handleToggleEnable = async (range) => {
    if (range.created_by === 'super_admin') {
      toast.error('You cannot modify PRN ranges created by Super Admin');
      return;
    }

    if (range.is_enabled) {
      // If currently enabled, show modal to ask for disable reason
      setSelectedRange(range);
      setDisableReason('');
      setShowDisableModal(true);
    } else {
      // If currently disabled, enable it directly
      await handleEnableRange(range.id);
    }
  };

  const handleEnableRange = async (id) => {
    try {
      await placementOfficerAPI.updatePRNRange(id, { is_enabled: true });
      toast.success('PRN range enabled successfully');
      fetchPRNRanges();
    } catch (error) {
      toast.error('Failed to enable PRN range');
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableReason.trim()) {
      toast.error('Please provide a reason for disabling this PRN range');
      return;
    }

    try {
      await placementOfficerAPI.updatePRNRange(selectedRange.id, {
        is_enabled: false,
        disabled_reason: disableReason,
      });
      toast.success('PRN range disabled successfully');
      setShowDisableModal(false);
      setSelectedRange(null);
      setDisableReason('');
      fetchPRNRanges();
    } catch (error) {
      toast.error('Failed to disable PRN range');
    }
  };

  const handleViewStudents = async (range) => {
    setSelectedRange(range);
    setShowViewStudentsModal(true);
    setLoadingStudents(true);
    setRangeStudents([]);

    try {
      const response = await placementOfficerAPI.getStudentsByPRNRange(range.id);
      setRangeStudents(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load students');
      setRangeStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);

  const handleExportRangeStudents = async () => {
    if (!selectedRange) return;

    setExportingStudents(true);
    try {
      const response = await placementOfficerAPI.exportStudentsByPRNRange(selectedRange.id);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rangeLabel = selectedRange.single_prn
        ? selectedRange.single_prn
        : `${selectedRange.start_prn}_${selectedRange.end_prn}`;
      a.download = `students_prn_range_${rangeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Students exported successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export students');
    } finally {
      setExportingStudents(false);
    }
  };

  if (showSkeleton) {
    return <TablePageSkeleton statCards={0} tableColumns={8} tableRows={6} hasSearch={false} hasFilters={false} />;
  }

  return (
    <div>
      {/* Header */}
      <AnimatedSection delay={0}>
        <div className="mb-8 flex justify-between items-start">
          <DashboardHeader
            icon={Hash}
            title="Manage PRN Ranges"
            subtitle="Define valid PRN ranges for student registration at your college"
          />
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add PRN Range</span>
            </button>
            <button
              onClick={() => setShowAddSingleModal(true)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
            >
              <User size={20} />
              <span>Add Single PRN</span>
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* Info Box */}
      <AnimatedSection delay={0.1}>
      <GlassCard variant="elevated" className="p-6 mb-8 border-l-4 border-blue-500">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
            <Shield className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-xl mb-3">About PRN Ranges</h3>
            <ul className="text-gray-700 space-y-2 font-medium">
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                PRN ranges define valid registration numbers for your college
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                Students can only register if their PRN falls within a defined range
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                You can edit or delete ranges you created
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                Ranges created by Super Admin are read-only (marked with lock icon)
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
      </AnimatedSection>

      {/* PRN Ranges Table */}
      <AnimatedSection delay={0.2}>
      <GlassCard variant="elevated" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Start PRN</th>
                <th className="px-6 py-4 text-left font-bold">End PRN</th>
                <th className="px-6 py-4 text-left font-bold">Year</th>
                <th className="px-6 py-4 text-left font-bold">College</th>
                <th className="px-6 py-4 text-left font-bold">Description</th>
                <th className="px-6 py-4 text-left font-bold">Status</th>
                <th className="px-6 py-4 text-left font-bold">Created By</th>
                <th className="px-6 py-4 text-left font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prnRanges.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-gray-500 py-12">
                    <Hash className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="font-bold text-lg">No PRN ranges defined yet</p>
                    <p className="text-sm mt-2">Click "Add PRN Range" to create one</p>
                  </td>
                </tr>
              ) : (
                prnRanges.map((range, index) => (
                  <tr
                    key={range.id}
                    className={`hover:bg-blue-50 transition-colors ${
                      range.created_by === 'super_admin' ? 'bg-purple-50/30' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {range.single_prn ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">Single</span>
                          {range.single_prn}
                        </span>
                      ) : range.start_prn}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{range.single_prn ? '-' : range.end_prn}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{range.year || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {range.college_name ? (
                        <span className="inline-flex items-center space-x-1.5 bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-200">
                          <span>{range.college_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200">
                          All Colleges
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{range.description || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {range.is_enabled !== undefined ? (
                          range.is_enabled ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-800 w-fit">Enabled</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800 w-fit">Disabled</span>
                          )
                        ) : (
                          range.is_active ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-800 w-fit">Active</span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800 w-fit">Inactive</span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {range.created_by === 'super_admin' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-purple-100 text-purple-800 text-sm font-bold px-4 py-2 rounded-xl border-2 border-purple-200">
                          <Lock size={14} />
                          <span>Super Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-bold px-4 py-2 rounded-xl border-2 border-blue-200">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewStudents(range)}
                          className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all transform hover:scale-110"
                          title="View Students"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleEnable(range)}
                          className={`p-2 rounded-xl transition-all transform hover:scale-110 ${
                            range.is_enabled
                              ? 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100'
                              : 'text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100'
                          } ${range.created_by === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={range.is_enabled ? 'Disable Range' : 'Enable Range'}
                          disabled={range.created_by === 'super_admin'}
                        >
                          {range.is_enabled ? (
                            <ToggleRight size={20} />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                        {range.created_by === 'placement_officer' ? (
                          <>
                            <button
                              onClick={() => handleEdit(range)}
                              className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all transform hover:scale-110"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(range.id, range.created_by)}
                              className="p-2 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl transition-all transform hover:scale-110"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm flex items-center space-x-1 bg-gray-50 px-3 py-2 rounded-xl font-medium">
                            <Lock size={14} />
                            <span>Read-only</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
      </AnimatedSection>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3 shadow-lg">
                {editingId ? <Edit2 className="text-white" size={24} /> : <Plus className="text-white" size={24} />}
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                {editingId ? 'Edit PRN Range' : 'Add New PRN Range'}
              </h2>
            </div>

            <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Start PRN <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="start_prn"
                  value={formData.start_prn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="e.g., 2025001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  End PRN <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="end_prn"
                  value={formData.end_prn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="e.g., 2025100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Year <span className="text-red-600">*</span>
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium"
                  required
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 26 }, (_, i) => 2025 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  rows="3"
                  placeholder="Additional notes about this PRN range..."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t-2 border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Save size={20} />
                  <span>{editingId ? 'Update' : 'Add'} PRN Range</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-4 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <X size={20} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Add Single PRN Modal */}
      {showAddSingleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-3 shadow-lg">
                <User className="text-white" size={24} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                {editingId ? 'Edit Single PRN' : 'Add Single PRN'}
              </h2>
            </div>

            <form onSubmit={editingId ? handleUpdate : handleAddSingle} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  PRN <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="single_prn"
                  value={formData.single_prn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="e.g., 2301150323"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Year <span className="text-red-600">*</span>
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 font-medium"
                  required
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 26 }, (_, i) => 2025 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  rows="3"
                  placeholder="e.g., Special admission student"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t-2 border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Save size={20} />
                  <span>{editingId ? 'Update' : 'Add'} Single PRN</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-4 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <X size={20} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Disable PRN Range Modal */}
      {showDisableModal && selectedRange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Disable PRN Range</h2>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">PRN Range</p>
              <p className="font-mono font-semibold text-gray-900">
                {selectedRange.single_prn
                  ? selectedRange.single_prn
                  : `${selectedRange.start_prn} - ${selectedRange.end_prn}`}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Reason for Disabling *
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900"
                rows="4"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="Provide a detailed reason for disabling this PRN range..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This reason will be stored for future reference and audit purposes.
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-sm font-medium text-red-900">
                Warning: Students with PRNs in this range will not be able to register while it's disabled.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setSelectedRange(null);
                  setDisableReason('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisable}
                disabled={!disableReason.trim()}
                className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable Range
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* View Students in Range Modal */}
      {showViewStudentsModal && selectedRange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard variant="elevated" className="p-0 w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students in PRN Range</h2>
                <p className="text-sm text-gray-600 mt-1 font-mono">
                  {selectedRange.single_prn
                    ? selectedRange.single_prn
                    : `${selectedRange.start_prn} - ${selectedRange.end_prn}`}
                  {selectedRange.is_enabled ? (
                    <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-800">Enabled</span>
                  ) : (
                    <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800">Disabled</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewStudentsModal(false);
                  setSelectedRange(null);
                  setRangeStudents([]);
                }}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading students...</p>
                  </div>
                </div>
              ) : rangeStudents.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Eye size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">No students found in this PRN range</p>
                    <p className="text-sm text-gray-500 mt-1">Students who register within this range will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRN</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rangeStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                            {student.prn}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {student.student_name || student.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {student.branch}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {student.is_blacklisted ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800">Blacklisted</span>
                            ) : student.registration_status === 'approved' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                            ) : student.registration_status === 'pending' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold">{rangeStudents.length}</span> student(s)
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowViewStudentsModal(false);
                    setSelectedRange(null);
                    setRangeStudents([]);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-xl transition-all"
                >
                  Close
                </button>
                {rangeStudents.length > 0 && (
                  <button
                    onClick={handleExportRangeStudents}
                    disabled={exportingStudents}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Download size={18} />
                    <span>{exportingStudents ? 'Exporting...' : 'Export to Excel'}</span>
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

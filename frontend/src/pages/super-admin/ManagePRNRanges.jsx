import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, Eye, Download, ExternalLink, Edit2 } from 'lucide-react';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';

export default function ManagePRNRanges() {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [showAddRange, setShowAddRange] = useState(false);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [rangeStudents, setRangeStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [formData, setFormData] = useState({
    range_start: '',
    range_end: '',
    single_prn: '',
    description: '',
    year: '',
  });

  useEffect(() => {
    fetchRanges();
  }, []);

  const fetchRanges = async () => {
    try {
      const response = await superAdminAPI.getPRNRanges();
      setRanges(response.data.data);
    } catch (error) {
      toast.error('Failed to load PRN ranges');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRange = async (e) => {
    e.preventDefault();
    try {
      if (editingRange) {
        // Update existing range
        await superAdminAPI.updatePRNRange(editingRange.id, {
          range_start: formData.range_start,
          range_end: formData.range_end,
          description: formData.description,
          year: formData.year,
        });
        toast.success('PRN range updated successfully');
      } else {
        // Add new range
        await superAdminAPI.addPRNRange({
          range_start: formData.range_start,
          range_end: formData.range_end,
          description: formData.description,
          year: formData.year,
        });
        toast.success('PRN range added successfully');
      }
      setShowAddRange(false);
      setEditingRange(null);
      setFormData({ range_start: '', range_end: '', single_prn: '', description: '', year: '' });
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingRange ? 'update' : 'add'} PRN range`);
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    try {
      if (editingRange) {
        // Update existing single PRN
        await superAdminAPI.updatePRNRange(editingRange.id, {
          single_prn: formData.single_prn,
          description: formData.description,
          year: formData.year,
        });
        toast.success('Single PRN updated successfully');
      } else {
        // Add new single PRN
        await superAdminAPI.addPRNRange({
          single_prn: formData.single_prn,
          description: formData.description,
          year: formData.year,
        });
        toast.success('Single PRN added successfully');
      }
      setShowAddSingle(false);
      setEditingRange(null);
      setFormData({ range_start: '', range_end: '', single_prn: '', description: '', year: '' });
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editingRange ? 'update' : 'add'} single PRN`);
    }
  };

  const handleToggleEnable = async (range) => {
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
      await superAdminAPI.updatePRNRange(id, { is_enabled: true });
      toast.success('PRN range enabled successfully');
      fetchRanges();
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
      await superAdminAPI.updatePRNRange(selectedRange.id, {
        is_enabled: false,
        disabled_reason: disableReason,
      });
      toast.success('PRN range disabled successfully');
      setShowDisableModal(false);
      setSelectedRange(null);
      setDisableReason('');
      fetchRanges();
    } catch (error) {
      toast.error('Failed to disable PRN range');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PRN range?')) return;
    try {
      await superAdminAPI.deletePRNRange(id);
      toast.success('PRN range deleted');
      fetchRanges();
    } catch (error) {
      toast.error('Failed to delete PRN range');
    }
  };

  const handleEdit = (range) => {
    setEditingRange(range);
    setFormData({
      range_start: range.range_start || '',
      range_end: range.range_end || '',
      single_prn: range.single_prn || '',
      description: range.description || '',
      year: range.year || '',
    });

    if (range.single_prn) {
      setShowAddSingle(true);
    } else {
      setShowAddRange(true);
    }
  };

  const handleViewStudents = async (range) => {
    setSelectedRange(range);
    setShowViewStudentsModal(true);
    setLoadingStudents(true);
    setRangeStudents([]);

    try {
      const response = await superAdminAPI.getStudentsByPRNRange(range.id);
      setRangeStudents(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load students');
      setRangeStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleExportRangeStudents = async () => {
    if (!selectedRange) return;

    setExportingStudents(true);
    try {
      const response = await superAdminAPI.exportStudentsByPRNRange(selectedRange.id);

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rangeLabel = selectedRange.single_prn
        ? selectedRange.single_prn
        : `${selectedRange.range_start}_${selectedRange.range_end}`;
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

  if (showSkeleton) return <TablePageSkeleton tableColumns={5} hasSearch={false} hasFilters={false} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-8">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header Section with Gradient */}
        <AnimatedSection delay={0}>
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-3xl shadow-2xl mb-8 p-10">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 animate-pulse"></div>
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center space-x-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-3xl blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-white/20 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30">
                  <AlertCircle className="text-white" size={40} />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                  Manage PRN Ranges
                </h1>
                <p className="text-teal-100 text-lg font-medium">
                  Control which PRNs are valid for student registration
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddRange(true)}
                className="px-7 py-4 bg-white/95 backdrop-blur-sm text-teal-700 hover:bg-white hover:shadow-2xl rounded-2xl font-bold shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-white/50"
              >
                <Plus size={22} />
                <span className="text-lg">Add Range</span>
              </button>
              <button
                onClick={() => setShowAddSingle(true)}
                className="px-7 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3"
              >
                <Plus size={22} />
                <span className="text-lg">Add Single PRN</span>
              </button>
            </div>
          </div>
        </div>
        </AnimatedSection>

        {/* Info Alert */}
        <AnimatedSection delay={0.08}>
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl p-8 mb-8 border-l-8 border-blue-500">
          <div className="flex items-start">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl mr-5 shadow-lg">
              <AlertCircle className="text-white" size={28} />
            </div>
            <div>
              <h4 className="font-black text-blue-900 text-2xl mb-3">About PRN Ranges</h4>
              <p className="text-blue-800 text-lg leading-relaxed">
                Only students with PRNs within active ranges can register. You can add ranges (e.g., 2301150100-2301150999)
                or individual PRNs. Deactivated ranges will not allow new registrations.
              </p>
            </div>
          </div>
        </div>
        </AnimatedSection>

      {/* Add Range Modal */}
      {showAddRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingRange ? 'Update PRN Range' : 'Add PRN Range'}</h2>
            <form onSubmit={handleAddRange} className="space-y-4">
              <div>
                <label className="label">Range Start</label>
                <input
                  type="text"
                  className="input"
                  value={formData.range_start}
                  onChange={(e) => setFormData({ ...formData, range_start: e.target.value })}
                  placeholder="e.g., 2301150100"
                  required
                />
              </div>
              <div>
                <label className="label">Range End</label>
                <input
                  type="text"
                  className="input"
                  value={formData.range_end}
                  onChange={(e) => setFormData({ ...formData, range_end: e.target.value })}
                  placeholder="e.g., 2301150999"
                  required
                />
              </div>
              <div>
                <label className="label">Year (Optional)</label>
                <select
                  className="input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., 2023 Batch Computer Engineering"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingRange ? 'Update Range' : 'Add Range'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRange(false);
                    setEditingRange(null);
                    setFormData({ range_start: '', range_end: '', single_prn: '', description: '', year: '' });
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single PRN Modal */}
      {showAddSingle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingRange ? 'Update Single PRN' : 'Add Single PRN'}</h2>
            <form onSubmit={handleAddSingle} className="space-y-4">
              <div>
                <label className="label">PRN</label>
                <input
                  type="text"
                  className="input"
                  value={formData.single_prn}
                  onChange={(e) => setFormData({ ...formData, single_prn: e.target.value })}
                  placeholder="e.g., 2301150323"
                  required
                />
              </div>
              <div>
                <label className="label">Year (Optional)</label>
                <select
                  className="input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Special admission"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingRange ? 'Update PRN' : 'Add PRN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSingle(false);
                    setEditingRange(null);
                    setFormData({ range_start: '', range_end: '', single_prn: '', description: '', year: '' });
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* PRN Ranges Table */}
        <AnimatedSection delay={0.16}>
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Range / PRN</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Year</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">College</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Description</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Added</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-100">
                {ranges.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16">
                      <AlertCircle className="mx-auto mb-4 text-gray-300" size={64} />
                      <p className="text-gray-500 text-lg font-semibold">No PRN ranges added yet. Add ranges to allow student registration.</p>
                    </td>
                  </tr>
                ) : (
                  ranges.map((range) => (
                    <tr key={range.id} className="hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50 transition-all duration-200 group">
                      <td className="px-6 py-5">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs font-bold shadow-md">
                          {range.single_prn ? 'Single' : 'Range'}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {range.single_prn
                          ? range.single_prn
                          : `${range.range_start} - ${range.range_end}`}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700 font-medium">
                        {range.year || '-'}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700 font-medium">
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
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {range.description || '-'}
                      </td>
                    <td className="px-6 py-5">
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
                        {range.disabled_reason && (
                          <span className="text-xs text-gray-500" title={range.disabled_reason}>
                            (Reason provided)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {new Date(range.created_at).toLocaleDateString('en-IN')}
                    </td>
                      <td className="px-6 py-5">
                        <div className="flex space-x-2">
                          <Link
                            to={`/super-admin/prn-ranges/${range.id}/students`}
                            className="p-2 text-blue-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110 flex items-center space-x-1"
                            title="View Students in Range"
                          >
                            <Eye size={18} />
                            <ExternalLink size={12} />
                          </Link>
                          <button
                            onClick={() => handleEdit(range)}
                            className="p-2 text-amber-600 hover:text-white hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleEnable(range)}
                            className={`p-2 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110 ${
                              range.is_enabled
                                ? 'text-green-600 hover:text-white hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-500'
                                : 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-gray-400 hover:to-gray-600'
                            }`}
                            title={range.is_enabled ? 'Disable Range' : 'Enable Range'}
                          >
                            {range.is_enabled ? (
                              <ToggleRight size={20} />
                            ) : (
                              <ToggleLeft size={20} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(range.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-500 rounded-xl transition-all duration-200 hover:shadow-lg transform hover:scale-110"
                            title="Delete"
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
        </div>
        </AnimatedSection>

      {/* Disable PRN Range Modal */}
      {showDisableModal && selectedRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Disable PRN Range</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">PRN Range</p>
                <p className="font-mono font-semibold text-gray-900">
                  {selectedRange.single_prn
                    ? selectedRange.single_prn
                    : `${selectedRange.range_start} - ${selectedRange.range_end}`}
                </p>
              </div>

              <div>
                <label className="label">
                  Reason for Disabling *
                </label>
                <textarea
                  className="input"
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

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900">
                  Warning: Students with PRNs in this range will not be able to register while it's disabled.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setSelectedRange(null);
                  setDisableReason('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisable}
                disabled={!disableReason.trim()}
                className="btn bg-yellow-600 hover:bg-yellow-700 text-white flex-1 disabled:opacity-50"
              >
                Disable Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Students in Range Modal */}
      {showViewStudentsModal && selectedRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students in PRN Range</h2>
                <p className="text-sm text-gray-600 mt-1 font-mono">
                  {selectedRange.single_prn
                    ? selectedRange.single_prn
                    : `${selectedRange.range_start} - ${selectedRange.range_end}`}
                  {selectedRange.is_enabled ? (
                    <span className="ml-3 badge badge-success">Enabled</span>
                  ) : (
                    <span className="ml-3 badge badge-warning">Disabled</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewStudentsModal(false);
                  setSelectedRange(null);
                  setRangeStudents([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <AlertCircle size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingStudents ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
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
                            {student.name || student.student_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {student.college_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {student.branch}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {student.is_blacklisted ? (
                              <span className="badge badge-danger">Blacklisted</span>
                            ) : student.registration_status === 'approved' ? (
                              <span className="badge badge-success">Approved</span>
                            ) : student.registration_status === 'pending' ? (
                              <span className="badge badge-warning">Pending</span>
                            ) : (
                              <span className="badge badge-danger">Rejected</span>
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
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {rangeStudents.length > 0 && (
                  <button
                    onClick={handleExportRangeStudents}
                    disabled={exportingStudents}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Download size={18} />
                    <span>{exportingStudents ? 'Exporting...' : 'Export to Excel'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

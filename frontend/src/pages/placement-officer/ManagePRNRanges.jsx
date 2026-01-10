import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X, Lock, Hash, Calendar, BookOpen, Shield } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';

export default function ManagePRNRanges() {
  const [prnRanges, setPrnRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    start_prn: '',
    end_prn: '',
    year: '',
    branch: '',
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
      year: '',
      branch: '',
      description: '',
    });
    setEditingId(null);
    setShowAddModal(false);
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

  const handleEdit = (range) => {
    setFormData({
      start_prn: range.start_prn,
      end_prn: range.end_prn,
      year: range.year,
      branch: range.branch || '',
      description: range.description || '',
    });
    setEditingId(range.id);
    setShowAddModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!formData.start_prn || !formData.end_prn || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await placementOfficerAPI.updatePRNRange(editingId, formData);
      toast.success('PRN range updated successfully');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading PRN ranges...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <DashboardHeader
          icon={Hash}
          title="Manage PRN Ranges"
          subtitle="Define valid PRN ranges for student registration at your college"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add PRN Range</span>
        </button>
      </div>

      {/* Info Box */}
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

      {/* PRN Ranges Table */}
      <GlassCard variant="elevated" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Start PRN</th>
                <th className="px-6 py-4 text-left font-bold">End PRN</th>
                <th className="px-6 py-4 text-left font-bold">Year</th>
                <th className="px-6 py-4 text-left font-bold">Branch</th>
                <th className="px-6 py-4 text-left font-bold">Description</th>
                <th className="px-6 py-4 text-left font-bold">Created By</th>
                <th className="px-6 py-4 text-left font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prnRanges.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-12">
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
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{range.start_prn}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{range.end_prn}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{range.year}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{range.branch || 'All Branches'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{range.description || '-'}</td>
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
                <label className="block text-sm font-bold text-gray-700 mb-2">Branch (Optional)</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="e.g., Computer Science, leave blank for all branches"
                />
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
    </div>
  );
}

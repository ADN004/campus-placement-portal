import { useState, useEffect } from 'react';
import { superAdminAPI, commonAPI } from '../../services/api';
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
  AlertCircle,
  Check,
  GraduationCap,
} from 'lucide-react';

export default function ManageCollegeBranches() {
  const [colleges, setColleges] = useState([]);
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [regions, setRegions] = useState([]);
  const [branchTemplates, setBranchTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [editingCollege, setEditingCollege] = useState(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [customBranch, setCustomBranch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    filterColleges();
  }, [colleges, searchQuery, selectedRegion]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [collegesRes, regionsRes, templatesRes] = await Promise.all([
        superAdminAPI.getAllCollegeBranches(),
        commonAPI.getRegions(),
        superAdminAPI.getBranchTemplates(),
      ]);

      setColleges(collegesRes.data.data || []);
      setRegions(regionsRes.data.data || []);
      setBranchTemplates(templatesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

    setFilteredColleges(filtered);
  };

  const handleEditCollege = (college) => {
    setEditingCollege(college);
    setSelectedBranches(college.branches || []);
    setShowAddBranchModal(true);
  };

  const handleAddBranch = (branch) => {
    if (!selectedBranches.includes(branch)) {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleAddCustomBranch = () => {
    if (customBranch.trim() && !selectedBranches.includes(customBranch.trim())) {
      setSelectedBranches([...selectedBranches, customBranch.trim()]);
      setCustomBranch('');
    }
  };

  const handleRemoveBranch = (branchToRemove) => {
    setSelectedBranches(selectedBranches.filter((b) => b !== branchToRemove));
  };

  const handleSaveBranches = async () => {
    if (!editingCollege) return;

    setSubmitting(true);
    try {
      const response = await superAdminAPI.updateCollegeBranches(
        editingCollege.id,
        selectedBranches
      );

      if (response.data.success) {
        toast.success('College branches updated successfully');

        // Update local state
        setColleges(
          colleges.map((c) =>
            c.id === editingCollege.id
              ? { ...c, branches: selectedBranches }
              : c
          )
        );

        setShowAddBranchModal(false);
        setEditingCollege(null);
        setSelectedBranches([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update branches');
      console.error('Error updating branches:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddBranchModal(false);
    setEditingCollege(null);
    setSelectedBranches([]);
    setCustomBranch('');
  };

  const getBranchCount = (college) => {
    return college.branches?.length || 0;
  };

  const getBranchStatus = (college) => {
    const count = getBranchCount(college);
    if (count === 0) {
      return { text: 'No Branches', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    } else if (count < 3) {
      return { text: `${count} Branch${count > 1 ? 'es' : ''}`, color: 'text-yellow-600 bg-yellow-50', icon: AlertCircle };
    } else {
      return { text: `${count} Branches`, color: 'text-green-600 bg-green-50', icon: Check };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage College Branches</h1>
            <p className="text-sm text-gray-600">
              Configure branches for all 60 colleges across Kerala
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="text-sm text-gray-600 flex items-center justify-end">
            <span className="font-medium">
              {filteredColleges.length} of {colleges.length} colleges
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
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
              <p className="text-sm text-gray-600">No Branches</p>
              <p className="text-2xl font-bold text-red-600">
                {colleges.filter((c) => getBranchCount(c) === 0).length}
              </p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Few Branches (&lt;3)</p>
              <p className="text-2xl font-bold text-yellow-600">
                {colleges.filter((c) => {
                  const count = getBranchCount(c);
                  return count > 0 && count < 3;
                }).length}
              </p>
            </div>
            <AlertCircle className="h-10 w-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fully Configured</p>
              <p className="text-2xl font-bold text-green-600">
                {colleges.filter((c) => getBranchCount(c) >= 3).length}
              </p>
            </div>
            <Check className="h-10 w-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Colleges List */}
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branches
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredColleges.map((college) => {
                const status = getBranchStatus(college);
                const StatusIcon = status.icon;
                return (
                  <tr key={college.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {college.college_name}
                        </div>
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
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                      >
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {college.branches && college.branches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {college.branches.slice(0, 2).map((branch, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                              >
                                {branch}
                              </span>
                            ))}
                            {college.branches.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                                +{college.branches.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No branches configured</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditCollege(college)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Manage Branches
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Branches Modal */}
      {showAddBranchModal && editingCollege && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Branches</h2>
                  <p className="text-sm text-gray-600">{editingCollege.college_name}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={submitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Selected Branches */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Branches ({selectedBranches.length})
                </h3>
                <div className="border border-gray-200 rounded-lg p-4 min-h-[100px] bg-gray-50">
                  {selectedBranches.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedBranches.map((branch, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white"
                        >
                          {branch}
                          <button
                            onClick={() => handleRemoveBranch(branch)}
                            className="ml-2 hover:bg-blue-700 rounded-full p-0.5"
                            disabled={submitting}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center">No branches selected</p>
                  )}
                </div>
              </div>

              {/* Add Custom Branch */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Add Custom Branch</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomBranch()}
                    placeholder="Enter custom branch name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <button
                    onClick={handleAddCustomBranch}
                    disabled={!customBranch.trim() || submitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Available Templates */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Available Branch Templates
                </h3>
                <div className="border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {branchTemplates.map((branch, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddBranch(branch)}
                        disabled={selectedBranches.includes(branch) || submitting}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedBranches.includes(branch)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        {branch}
                        {selectedBranches.includes(branch) && (
                          <Check className="h-4 w-4 inline ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBranches}
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
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

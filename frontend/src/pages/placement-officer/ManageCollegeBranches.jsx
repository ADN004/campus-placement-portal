import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Plus,
  X,
  Save,
  AlertCircle,
  Check,
  Building2,
  Edit2,
} from 'lucide-react';

export default function ManageCollegeBranches() {
  const [collegeData, setCollegeData] = useState(null);
  const [branchTemplates, setBranchTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [customBranch, setCustomBranch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [collegeRes, templatesRes] = await Promise.all([
        placementOfficerAPI.getOwnCollegeBranches(),
        placementOfficerAPI.getBranchTemplates(),
      ]);

      setCollegeData(collegeRes.data.data);
      setBranchTemplates(templatesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranches = () => {
    setSelectedBranches(collegeData?.branches || []);
    setShowEditModal(true);
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
    setSubmitting(true);
    try {
      const response = await placementOfficerAPI.updateOwnCollegeBranches(selectedBranches);

      if (response.data.success) {
        toast.success('College branches updated successfully');

        // Update local state
        setCollegeData({
          ...collegeData,
          branches: selectedBranches,
        });

        setShowEditModal(false);
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
    setShowEditModal(false);
    setSelectedBranches([]);
    setCustomBranch('');
  };

  const getBranchCount = () => {
    return collegeData?.branches?.length || 0;
  };

  const getBranchStatus = () => {
    const count = getBranchCount();
    if (count === 0) {
      return {
        text: 'No Branches Configured',
        color: 'text-red-600 bg-red-50',
        icon: AlertCircle,
      };
    } else if (count < 3) {
      return {
        text: `${count} Branch${count > 1 ? 'es' : ''} - Add More`,
        color: 'text-yellow-600 bg-yellow-50',
        icon: AlertCircle,
      };
    } else {
      return {
        text: `${count} Branches Configured`,
        color: 'text-green-600 bg-green-50',
        icon: Check,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const status = getBranchStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage College Branches</h1>
            <p className="text-sm text-gray-600">
              Configure branches for your college
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Important Information</p>
              <p>
                Students from your college can only select branches that are configured here
                during registration. Please ensure all offered branches are added to avoid
                registration issues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* College Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Building2 className="h-8 w-8 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {collegeData?.college_name}
              </h2>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}
                >
                  <StatusIcon className="h-4 w-4 mr-1.5" />
                  {status.text}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleEditBranches}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Branches
          </button>
        </div>

        {/* Current Branches */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Branches</h3>
          {collegeData?.branches && collegeData.branches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collegeData.branches.map((branch, idx) => (
                <div
                  key={idx}
                  className="flex items-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <Check className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-900">{branch}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
              <p className="text-red-800 font-medium mb-1">No Branches Configured</p>
              <p className="text-sm text-red-600 mb-4">
                Students from your college will not be able to complete registration until
                branches are configured.
              </p>
              <button
                onClick={handleEditBranches}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Branches Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Branches</p>
              <p className="text-3xl font-bold text-gray-900">{getBranchCount()}</p>
            </div>
            <GraduationCap className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Templates</p>
              <p className="text-3xl font-bold text-gray-900">{branchTemplates.length}</p>
            </div>
            <Building2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Configuration Status</p>
              <p className="text-lg font-bold text-gray-900">
                {getBranchCount() === 0 ? 'Not Configured' : getBranchCount() < 3 ? 'Incomplete' : 'Complete'}
              </p>
            </div>
            {getBranchCount() === 0 ? (
              <AlertCircle className="h-10 w-10 text-red-600" />
            ) : getBranchCount() < 3 ? (
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            ) : (
              <Check className="h-10 w-10 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* Edit Branches Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Branches</h2>
                  <p className="text-sm text-gray-600">{collegeData?.college_name}</p>
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

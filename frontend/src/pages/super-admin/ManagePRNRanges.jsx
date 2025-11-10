import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';

export default function ManagePRNRanges() {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRange, setShowAddRange] = useState(false);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [formData, setFormData] = useState({
    range_start: '',
    range_end: '',
    single_prn: '',
    description: '',
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
      await superAdminAPI.addPRNRange({
        range_start: formData.range_start,
        range_end: formData.range_end,
        description: formData.description,
      });
      toast.success('PRN range added successfully');
      setShowAddRange(false);
      setFormData({ range_start: '', range_end: '', single_prn: '', description: '' });
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add PRN range');
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.addPRNRange({
        single_prn: formData.single_prn,
        description: formData.description,
      });
      toast.success('Single PRN added successfully');
      setShowAddSingle(false);
      setFormData({ range_start: '', range_end: '', single_prn: '', description: '' });
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add single PRN');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await superAdminAPI.togglePRNRange(id);
      toast.success(`PRN range ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchRanges();
    } catch (error) {
      toast.error('Failed to update PRN range');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage PRN Ranges</h1>
          <p className="text-gray-600 mt-1">
            Control which PRNs are valid for student registration
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddRange(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Range</span>
          </button>
          <button
            onClick={() => setShowAddSingle(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Single PRN</span>
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">About PRN Ranges</h4>
            <p className="text-sm text-blue-800">
              Only students with PRNs within active ranges can register. You can add ranges (e.g., 2301150100-2301150999)
              or individual PRNs. Deactivated ranges will not allow new registrations.
            </p>
          </div>
        </div>
      </div>

      {/* Add Range Modal */}
      {showAddRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add PRN Range</h2>
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
                  Add Range
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRange(false);
                    setFormData({ range_start: '', range_end: '', single_prn: '', description: '' });
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
            <h2 className="text-xl font-bold mb-4">Add Single PRN</h2>
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
                  Add PRN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSingle(false);
                    setFormData({ range_start: '', range_end: '', single_prn: '', description: '' });
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
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Range / PRN</th>
                <th>Description</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranges.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 py-8">
                    No PRN ranges added yet. Add ranges to allow student registration.
                  </td>
                </tr>
              ) : (
                ranges.map((range) => (
                  <tr key={range.id}>
                    <td>
                      <span className="badge badge-info">
                        {range.single_prn ? 'Single' : 'Range'}
                      </span>
                    </td>
                    <td className="font-mono font-semibold">
                      {range.single_prn
                        ? range.single_prn
                        : `${range.range_start} - ${range.range_end}`}
                    </td>
                    <td className="text-sm text-gray-600">
                      {range.description || '-'}
                    </td>
                    <td>
                      {range.is_active ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(range.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleActive(range.id, range.is_active)}
                          className="text-blue-600 hover:text-blue-800"
                          title={range.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {range.is_active ? (
                            <ToggleRight size={20} />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(range.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={20} />
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
    </div>
  );
}

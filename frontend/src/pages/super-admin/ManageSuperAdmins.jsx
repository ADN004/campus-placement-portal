import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { UserPlus, Shield, CheckCircle, XCircle, Mail, Trash2 } from 'lucide-react';

export default function ManageSuperAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getSuperAdmins();
      setAdmins(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load super admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    if (!newAdmin.email || !newAdmin.password) {
      toast.error('Please fill all fields');
      return;
    }

    if (newAdmin.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setProcessing(true);
      await superAdminAPI.createSuperAdmin(newAdmin);
      toast.success('Super Admin created successfully');
      setShowAddModal(false);
      setNewAdmin({ email: '', password: '' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create super admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} this super admin?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      if (currentStatus) {
        await superAdminAPI.deactivateSuperAdmin(adminId);
        toast.success('Super Admin deactivated');
      } else {
        await superAdminAPI.activateSuperAdmin(adminId);
        toast.success('Super Admin activated');
      }
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} super admin`);
    }
  };

  const handleDeleteAdmin = async (adminId, adminEmail) => {
    const confirmMessage = `Are you sure you want to permanently delete the super admin "${adminEmail}"? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await superAdminAPI.deleteSuperAdmin(adminId);
      toast.success('Super Admin deleted successfully');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete super admin');
    }
  };

  if (loading) return <LoadingSpinner />;

  const activeCount = admins.filter((a) => a.is_active).length;
  const inactiveCount = admins.filter((a) => !a.is_active).length;

  return (
    <div className="min-h-screen pb-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-pink-600 to-rose-600 rounded-2xl shadow-2xl mb-8 p-8">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Shield className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Manage Super Admins
              </h1>
              <p className="text-red-100 text-lg">
                Create and manage super administrator accounts
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-white text-red-600 hover:bg-red-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
          >
            <UserPlus size={20} />
            <span>Add Super Admin</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Admins</p>
              <p className="text-4xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">{admins.length}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg">
              <Shield className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Active</p>
              <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">{activeCount}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg">
              <CheckCircle className="text-white" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Inactive</p>
              <p className="text-4xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mt-2">{inactiveCount}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl shadow-lg">
              <XCircle className="text-white" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-red-50 to-pink-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-pink-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{admin.email}</td>
                  <td className="px-6 py-4">
                    {admin.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {admin.last_login ? (
                      new Date(admin.last_login).toLocaleDateString()
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          admin.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {admin.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {!admin.is_active && (
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-800 text-white transition-colors flex items-center gap-2"
                          title="Delete Super Admin"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-6">Add New Super Admin</h2>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="label">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="input"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  className="input"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must contain at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Warning:</strong> Super Admins have full access to the system.
                  Only create accounts for trusted personnel.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAdmin({ email: '', password: '' });
                  }}
                  className="btn btn-secondary"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing}
                >
                  {processing ? 'Creating...' : 'Create Super Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

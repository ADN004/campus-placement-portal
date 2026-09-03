import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import AdminsBody from './admins/AdminsBody';
import AdminsSkeleton from './admins/AdminsSkeleton';
import AddAdminDialog, { PASSWORD_RULES } from './admins/AddAdminDialog';

/**
 * Super admins — container.
 *
 * A short list of accounts that can do anything, so the page is about care
 * rather than volume. Same endpoints, same confirmations, and delete still only
 * offered on an account that has already been deactivated.
 */
export default function ManageSuperAdmins() {
  const deviceType = useDeviceType();
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
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

    /*
     * The same four rules `createSuperAdmin` enforces, checked here too.
     *
     * The page only checked the length while its hint described all four, so
     * eight lowercase letters passed this side and came back refused a round
     * trip later. Same rules, same outcome, said before the request instead of
     * after it.
     */
    const unmet = PASSWORD_RULES.find(([, test]) => !test(newAdmin.password));
    if (unmet) {
      toast.error(`Password needs: ${unmet[0].toLowerCase()}`);
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

  if (showSkeleton) return <AdminsSkeleton layout={deviceType} />;

  const activeCount = admins.filter((a) => a.is_active).length;
  const inactiveCount = admins.filter((a) => !a.is_active).length;

  return (
    <>
      <AdminsBody
        layout={deviceType}
        admins={admins}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        /*
         * The server refuses to let anyone deactivate or delete their own
         * account. The page offered both buttons on your own row anyway, so the
         * only way to learn the rule was to click into the error. Your row says
         * it instead.
         */
        currentUserId={user?.id}
        onAdd={() => setShowAddModal(true)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteAdmin}
      />

      {showAddModal && (
        <AddAdminDialog
          form={newAdmin}
          onChange={(patch) => setNewAdmin((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleAddAdmin}
          onClose={() => {
            setShowAddModal(false);
            setNewAdmin({ email: '', password: '' });
          }}
          processing={processing}
        />
      )}
    </>
  );
}

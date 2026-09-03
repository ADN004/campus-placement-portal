import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import OfficersBody from './officers/OfficersBody';
import OfficersSkeleton from './officers/OfficersSkeleton';
import { DetailsDialog, HistoryDialog } from './officers/OfficerRecord';
import {
  AddOfficerDialog, RemoveOfficerDialog, ClearHistoryDialog, ResetPasswordDialog,
} from './officers/OfficerDialogs';

const EMPTY_OFFICER_FORM = {
  college_id: '',
  officer_name: '',
  phone_number: '',
  designation: '',
  officer_email: '',
  college_email: '',
};

/**
 * Placement officers — container.
 *
 * All state and every call to the server; the body and the six dialogs draw
 * them. Same endpoints, same confirmations, same DELETE-to-confirm on the one
 * action that destroys records.
 */
export default function ManagePlacementOfficers() {
  const deviceType = useDeviceType();
  const [officers, setOfficers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [officerHistory, setOfficerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [formData, setFormData] = useState(EMPTY_OFFICER_FORM);

  useEffect(() => {
    fetchInitialData();
  }, []);

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

  /*
   * The visible list, derived rather than stored. It was a `useState` kept in
   * step by an effect, so every keystroke rendered the previous list once before
   * the effect corrected it.
   */
  const filteredOfficers = officers.filter((officer) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hit = officer.officer_name?.toLowerCase().includes(q)
        || officer.college_name?.toLowerCase().includes(q)
        || officer.email?.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (selectedRegion && officer.region_id !== parseInt(selectedRegion)) return false;
    return true;
  });

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
    setFormData(EMPTY_OFFICER_FORM);
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

  const handleResetPassword = (officer) => {
    setSelectedOfficer(officer);
    setShowResetPasswordModal(true);
  };

  // Suspend / reactivate — reversible, and distinct from Remove: a suspended
  // officer keeps holding their college's seat, so no replacement can be
  // appointed until they are reactivated or removed.
  const handleToggleSuspend = async (officer) => {
    const suspending = officer.officer_status !== 'suspended';
    const message = suspending
      ? `Suspend ${officer.officer_name}?\n\nThey will be signed out immediately and blocked from signing in.\n\nThey keep holding ${officer.college_name}'s officer seat, so you cannot appoint a replacement until they are reactivated or removed.`
      : `Reactivate ${officer.officer_name}?\n\nThey will be able to sign in again (they will need to log in fresh).`;

    if (!window.confirm(message)) return;

    try {
      const res = await superAdminAPI.setPlacementOfficerActive(officer.id, !suspending);
      toast.success(res.data?.message || (suspending ? 'Officer suspended' : 'Officer reactivated'));
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update officer status');
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedOfficer) return;

    setSubmitting(true);
    try {
      await superAdminAPI.resetPlacementOfficerPassword(selectedOfficer.id);
      toast.success('Password reset to default (123) successfully');
      setShowResetPasswordModal(false);
      setSelectedOfficer(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
      console.error('Error resetting password:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Super admins cannot upload or delete an officer's photograph — officers
   * manage their own — so this only opens it. `noopener` because the opened tab
   * can otherwise reach back through `window.opener`.
   */
  const handleViewPhoto = (photoUrl) => {
    if (photoUrl) {
      window.open(photoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (showSkeleton) return <OfficersSkeleton layout={deviceType} />;

  /*
   * "Active officers" was `o.status === 'active' || o.status === 1` and it could
   * never be true.
   *
   * `status` is `u.is_active` aliased in the query — a PostgreSQL boolean, which
   * node-postgres hands back as `true`/`false`. It is never the string 'active'
   * and never the number 1, so that filter matched nothing and the card read
   * **0 whatever the data was**.
   *
   * Counted from `officer_status` now, which is the column the rows have always
   * used and the only one that knows the difference between serving, suspended
   * and removed.
   */
  const activeCount = officers.filter((o) => o.officer_status === 'active').length;
  const suspendedCount = officers.filter((o) => o.officer_status === 'suspended').length;

  return (
    <>
      <OfficersBody
        layout={deviceType}
        officers={officers}
        filteredOfficers={filteredOfficers}
        regions={regions}
        activeCount={activeCount}
        suspendedCount={suspendedCount}

        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        selectedRegion={selectedRegion}
        onRegion={setSelectedRegion}
        onClearFilters={() => { setSearchQuery(''); setSelectedRegion(''); }}

        actions={{
          onView: handleViewDetails,
          onHistory: handleViewHistory,
          onResetPassword: handleResetPassword,
          onToggleSuspend: handleToggleSuspend,
          onRemove: handleRemoveOfficer,
        }}

        onAddOfficer={handleAddOfficer}
      />

      {showDetailsModal && selectedOfficer && (
        <DetailsDialog
          officer={selectedOfficer}
          onViewPhoto={handleViewPhoto}
          onViewHistory={handleViewHistory}
          onClose={() => { setShowDetailsModal(false); setSelectedOfficer(null); }}
        />
      )}

      {showHistoryModal && selectedOfficer && (
        <HistoryDialog
          officer={selectedOfficer}
          history={officerHistory}
          loading={loadingHistory}
          onClearHistory={handleClearHistory}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedOfficer(null);
            setOfficerHistory([]);
          }}
        />
      )}

      {showAddModal && (
        <AddOfficerDialog
          form={formData}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          colleges={colleges}
          onSubmit={handleSubmitAddOfficer}
          onClose={() => setShowAddModal(false)}
          submitting={submitting}
        />
      )}

      {showRemoveModal && selectedOfficer && (
        <RemoveOfficerDialog
          officer={selectedOfficer}
          onConfirm={handleConfirmRemove}
          onClose={() => { setShowRemoveModal(false); setSelectedOfficer(null); }}
          submitting={submitting}
        />
      )}

      {showClearHistoryModal && selectedOfficer && (
        <ClearHistoryDialog
          officer={selectedOfficer}
          confirmText={confirmText}
          onConfirmText={setConfirmText}
          onConfirm={handleConfirmClearHistory}
          onClose={() => { setShowClearHistoryModal(false); setConfirmText(''); }}
          submitting={submitting}
        />
      )}

      {showResetPasswordModal && selectedOfficer && (
        <ResetPasswordDialog
          officer={selectedOfficer}
          onConfirm={handleConfirmResetPassword}
          onClose={() => { setShowResetPasswordModal(false); setSelectedOfficer(null); }}
          submitting={submitting}
        />
      )}
    </>
  );
}

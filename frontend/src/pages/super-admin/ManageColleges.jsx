import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import CollegesBody from './colleges/CollegesBody';
import CollegesSkeleton from './colleges/CollegesSkeleton';
import { CollegeFormDialog, ModeSwitchDialog } from './colleges/CollegeModals';
import RegionsModal from './colleges/RegionsModal';
import BulkImportModal from './colleges/BulkImportModal';

const EMPTY_COLLEGE_FORM = {
  college_name: '',
  college_code: '',
  region_id: '',
  sort_order: '',
  branches: '',
};

/**
 * Colleges and regions — container.
 *
 * Every call to the server, and the state the dialogs read. Same endpoints,
 * same confirmations, and the same dependency-aware refusals when something
 * cannot be deleted because records point at it.
 */
export default function ManageColleges() {
  const deviceType = useDeviceType();
  const [colleges, setColleges] = useState([]);
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

  // Portal settings (single-college policies)
  const [portalSettings, setPortalSettings] = useState(null);

  // Mode switch (testing tool, env-gated)
  const [showModeSwitchModal, setShowModeSwitchModal] = useState(false);
  const [modeSwitchCollegeId, setModeSwitchCollegeId] = useState('');
  const [modeSwitchConfirmCode, setModeSwitchConfirmCode] = useState('');

  // Region management modal
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionForm, setRegionForm] = useState({ region_name: '', region_code: '' });
  const [editingRegion, setEditingRegion] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * The three requests this page lives on.
   *
   * `fetchData` and `refreshData` were the same eleven lines twice, which is how
   * one of them ends up fetching something the other does not. They differ in
   * exactly two ways — the skeleton, and whether a failure is worth a toast —
   * so that is all that is left of the difference.
   */
  const loadAll = async () => {
    const [collegesRes, regionsRes, settingsRes] = await Promise.all([
      superAdminAPI.getAllColleges(),
      superAdminAPI.getAllRegions(),
      superAdminAPI.getPortalSettings(),
    ]);
    setColleges(collegesRes.data.data || []);
    setRegions(regionsRes.data.data || []);
    setPortalSettings(settingsRes.data.data || null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await loadAll();
    } catch (error) {
      toast.error('Failed to load colleges');
      console.error('Error fetching colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      await loadAll();
    } catch (error) {
      console.error('Error refreshing colleges:', error);
    }
  };

  const handleModeSwitch = async () => {
    setSubmitting(true);
    try {
      const response = await superAdminAPI.switchToSingleCollege({
        keep_college_id: parseInt(modeSwitchCollegeId),
        confirm_code: modeSwitchConfirmCode,
      });
      toast.success(response.data.message, { duration: 6000 });
      setShowModeSwitchModal(false);
      setModeSwitchCollegeId('');
      setModeSwitchConfirmCode('');
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mode switch failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeRestore = async () => {
    if (!window.confirm('Restore multi-college mode? All colleges from the snapshot will be re-activated.')) return;
    setSubmitting(true);
    try {
      const response = await superAdminAPI.restoreMultiCollege();
      toast.success(response.data.message, { duration: 6000 });
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Restore failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleJobApprovalPolicy = async () => {
    const newValue = !portalSettings?.single_college_require_job_approval;
    try {
      await superAdminAPI.updatePortalSettings({
        single_college_require_job_approval: newValue,
      });
      toast.success(
        newValue
          ? 'Officer job posts now require your approval'
          : 'Officer job posts now publish directly (auto-approved)'
      );
      await refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update policy');
    }
  };

  /*
   * The visible list, derived rather than stored. It was a `useState` kept in
   * step by an effect on four dependencies, so every keystroke in the search box
   * rendered the previous list once before the effect corrected it.
   */
  const filteredColleges = colleges.filter((college) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hit = college.college_name?.toLowerCase().includes(q)
        || college.college_code?.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (selectedRegion && college.region_id !== parseInt(selectedRegion)) return false;
    if (statusFilter === 'active' && !college.is_active) return false;
    if (statusFilter === 'inactive' && college.is_active) return false;
    return true;
  });

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

  if (showSkeleton) return <CollegesSkeleton layout={deviceType} />;

  const activeCount = colleges.filter((c) => c.is_active).length;

  return (
    <>
      <CollegesBody
        layout={deviceType}
        colleges={colleges}
        filteredColleges={filteredColleges}
        regions={regions}
        activeCount={activeCount}
        portalSettings={portalSettings}
        submitting={submitting}

        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        selectedRegion={selectedRegion}
        onRegion={setSelectedRegion}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}

        actions={{
          onEdit: openEditCollege,
          onToggle: handleToggleActive,
          onDelete: handleDeleteCollege,
        }}

        onAddCollege={openAddCollege}
        onOpenImport={() => setShowImportModal(true)}
        onOpenRegions={() => setShowRegionModal(true)}
        onToggleJobApproval={handleToggleJobApprovalPolicy}
        onOpenModeSwitch={() => setShowModeSwitchModal(true)}
        onModeRestore={handleModeRestore}
      />

      {showCollegeModal && (
        <CollegeFormDialog
          editing={editingCollege}
          form={collegeForm}
          onChange={(patch) => setCollegeForm((prev) => ({ ...prev, ...patch }))}
          regions={regions}
          onSave={handleSaveCollege}
          onClose={closeCollegeModal}
          submitting={submitting}
        />
      )}

      {showModeSwitchModal && (
        <ModeSwitchDialog
          colleges={colleges}
          collegeId={modeSwitchCollegeId}
          onCollegeId={(value) => { setModeSwitchCollegeId(value); setModeSwitchConfirmCode(''); }}
          confirmCode={modeSwitchConfirmCode}
          onConfirmCode={setModeSwitchConfirmCode}
          onSwitch={handleModeSwitch}
          onClose={() => setShowModeSwitchModal(false)}
          submitting={submitting}
        />
      )}

      {showImportModal && (
        <BulkImportModal
          layout={deviceType}
          onClose={() => setShowImportModal(false)}
          onImported={refreshData}
        />
      )}

      {showRegionModal && (
        <RegionsModal
          regions={regions}
          form={regionForm}
          onChange={(patch) => setRegionForm((prev) => ({ ...prev, ...patch }))}
          editing={editingRegion}
          onEdit={(region) => {
            setEditingRegion(region);
            setRegionForm({
              region_name: region.region_name,
              region_code: region.region_code,
            });
          }}
          onCancelEdit={resetRegionForm}
          onSave={handleSaveRegion}
          onDelete={handleDeleteRegion}
          onClose={() => { setShowRegionModal(false); resetRegionForm(); }}
          submitting={submitting}
        />
      )}
    </>
  );
}

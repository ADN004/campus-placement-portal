import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import Modal from '../../components/Modal';
import { PrimaryButton, SecondaryButton } from '../../components/admin/AdminUI';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../components/admin/AdminDialog';
import BranchesBody from './branches/BranchesBody';
import BranchesSkeleton from './branches/BranchesSkeleton';
import { BranchEditor } from './branches/branchesShared';

/**
 * College Branches — container.
 *
 * All state, effects and handlers; the body and the editor draw them. Behaviour
 * is unchanged: the same three requests on mount, the same client-side search
 * and region filter, the same save, the same optimistic local update.
 *
 * One thing is added and it is a warning, not a rule. `handleAddCustomBranch`
 * only ever refused an exact string match, so "Civil Engineering" could be
 * added to a college that already had "Civil-Engineering" or "civil
 * engineering" — and two spellings of one branch are two branches everywhere
 * else in the system: eligibility, filters, exports. The page now says so when
 * it spots one. It still lets it through, because refusing outright would be a
 * behaviour change and is the user's call.
 */

/** The comparison the backend uses: letters and digits, nothing else. */
const normalizeBranch = (value) =>
  String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

export default function ManageCollegeBranches() {
  const deviceType = useDeviceType();
  const [colleges, setColleges] = useState([]);
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [regions, setRegions] = useState([]);
  const [branchTemplates, setBranchTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
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
          college.college_name?.toLowerCase().includes(searchQuery.toLowerCase())
          || college.college_code?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (selectedRegion) {
      filtered = filtered.filter(
        (college) => college.region_id === parseInt(selectedRegion, 10),
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
    const trimmed = customBranch.trim();
    if (trimmed && !selectedBranches.includes(trimmed)) {
      setSelectedBranches([...selectedBranches, trimmed]);
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
        selectedBranches,
      );

      if (response.data.success) {
        toast.success('College branches updated successfully');

        // Update local state
        setColleges(
          colleges.map((c) => (c.id === editingCollege.id
            ? { ...c, branches: selectedBranches }
            : c)),
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

  if (showSkeleton) return <BranchesSkeleton layout={deviceType} />;

  const branchCount = (college) => college.branches?.length || 0;
  const summary = {
    total: colleges.length,
    none: colleges.filter((c) => branchCount(c) === 0).length,
    few: colleges.filter((c) => branchCount(c) > 0 && branchCount(c) < 3).length,
    full: colleges.filter((c) => branchCount(c) >= 3).length,
  };

  /*
   * Only a warning. What is typed is compared the way the backend compares
   * branches — letters and digits alone — so "Civil-Engineering" and "Civil
   * Engineering" are recognised as the same branch rather than looking like two.
   */
  const typed = customBranch.trim();
  const clash = typed
    ? selectedBranches.find(
      (b) => b !== typed && normalizeBranch(b) === normalizeBranch(typed),
    )
    : null;
  const duplicateWarning = clash
    ? `This college already has "${clash}", which is the same branch spelt differently. `
      + 'Two spellings count as two branches in eligibility, filters and exports.'
    : null;

  return (
    <>
      <BranchesBody
        layout={deviceType}
        colleges={filteredColleges}
        summary={summary}
        regions={regions}
        searchQuery={searchQuery}
        onSearch={(e) => setSearchQuery(e.target.value)}
        selectedRegion={selectedRegion}
        onRegion={(e) => setSelectedRegion(e.target.value)}
        onEdit={handleEditCollege}
      />

      {showAddBranchModal && editingCollege && (
        <Modal
          onClose={handleCloseModal}
          labelledBy="admin-branches-title"
          panelClassName={adminPanel('lg', { scroll: true })}
          overlayClassName={ADMIN_OVERLAY}
        >
          <AdminDialogHeader
            id="admin-branches-title"
            title="Edit branches"
            subtitle={editingCollege.college_name}
            onClose={handleCloseModal}
          />
          <AdminDialogBody>
            <BranchEditor
              selected={selectedBranches}
              onRemove={handleRemoveBranch}
              custom={customBranch}
              onCustomChange={(e) => setCustomBranch(e.target.value)}
              onAddCustom={handleAddCustomBranch}
              templates={branchTemplates}
              onAdd={handleAddBranch}
              duplicateWarning={duplicateWarning}
              submitting={submitting}
            />
          </AdminDialogBody>
          <AdminDialogFooter>
            <SecondaryButton onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSaveBranches} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save branches'}
            </PrimaryButton>
          </AdminDialogFooter>
        </Modal>
      )}
    </>
  );
}

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
import { findSameBranch } from '../../utils/branchName';
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
 * One behaviour did change, on the user's instruction. Adding a branch used to
 * refuse only an exact string match, so "Civil Engineering" could be added to a
 * college that already had "Civil-Engineering" — and two spellings of one
 * branch are two branches everywhere else: eligibility, filters, exports. That
 * is how 1,556 students became invisible to branch filters on production. A
 * second spelling is now refused outright, naming the one already there.
 */

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
  const [addError, setAddError] = useState('');
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
    setAddError('');
    setShowAddBranchModal(true);
  };

  const handleAddBranch = (branch) => {
    // Picked from the standard list, so it cannot be a new spelling — but it can
    // still collide with one already chosen by hand.
    const clash = findSameBranch(selectedBranches, branch);
    if (clash) {
      setAddError(clash === branch
        ? `${clash} is already in the list.`
        : `${clash} is already in the list — that is the same branch, spelled differently.`);
      return;
    }
    setSelectedBranches([...selectedBranches, branch]);
    setAddError('');
  };

  const handleAddCustomBranch = () => {
    const trimmed = customBranch.trim();
    if (!trimmed) return;

    const clash = findSameBranch(selectedBranches, trimmed);
    if (clash) {
      setAddError(clash === trimmed
        ? `${clash} is already in the list.`
        : `${clash} is already in the list — that is the same branch, spelled differently. `
          + 'Remove it first if the spelling needs to change.');
      return;
    }

    setSelectedBranches([...selectedBranches, trimmed]);
    setCustomBranch('');
    setAddError('');
  };

  const handleRemoveBranch = (branchToRemove) => {
    setSelectedBranches(selectedBranches.filter((b) => b !== branchToRemove));
    setAddError('');
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
    setAddError('');
  };

  if (showSkeleton) return <BranchesSkeleton layout={deviceType} />;

  const branchCount = (college) => college.branches?.length || 0;
  const summary = {
    total: colleges.length,
    none: colleges.filter((c) => branchCount(c) === 0).length,
    few: colleges.filter((c) => branchCount(c) > 0 && branchCount(c) < 3).length,
    full: colleges.filter((c) => branchCount(c) >= 3).length,
  };

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
              addError={addError}
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

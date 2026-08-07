import { useState, useEffect, useMemo } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import BranchesPage from './branches/BranchesPage';
import EditBranchesModal from './branches/BranchModals';
import { findSameBranch } from './branches/branchesShared';
import {
  DesktopBranchesSkeleton,
  TabletBranchesSkeleton,
  MobileBranchesSkeleton,
} from './branches/BranchesSkeleton';

/**
 * ManageCollegeBranches — container.
 *
 * Owns the two fetches, the edit dialog and the save; the presenter renders
 * what it is handed.
 *
 * A third fetch was added: `/placement-officer/branches`, which returns the
 * branches students are actually registered under with a count for each.
 * Without it the page could only ever show the configured list, so removing a
 * branch that 80 students sat in looked exactly like removing an empty one.
 */
export default function ManageCollegeBranches() {
  const [collegeData, setCollegeData] = useState(null);
  const [branchTemplates, setBranchTemplates] = useState([]);
  const [studentBranches, setStudentBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [customBranch, setCustomBranch] = useState('');
  const [addError, setAddError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // The student-branch counts are a nice-to-have: if that call fails the
      // page still works, so it is settled separately rather than failing the
      // whole load alongside the two it cannot do without.
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

    try {
      // `getBranches` -> /placement-officer/branches, the one that groups
      // students by branch and returns [{ branch, student_count }]. Not
      // `getCollegeBranches`, which despite the name hits /college/branches and
      // returns the same configured list as the call above — the two endpoints
      // read alike and return completely different shapes.
      const countsRes = await placementOfficerAPI.getBranches();
      setStudentBranches(Array.isArray(countsRes.data.data) ? countsRes.data.data : []);
    } catch (error) {
      console.error('Error fetching student branch counts:', error);
    }
  };

  /* --------------------------------------------------------------- derived */

  const configured = useMemo(() => collegeData?.branches || [], [collegeData]);

  /** Branch name -> number of approved students registered under it. */
  const countsByBranch = useMemo(() => {
    const map = new Map();
    studentBranches.forEach((row) => {
      map.set(row.branch, Number(row.student_count) || 0);
    });
    return map;
  }, [studentBranches]);

  const rows = useMemo(
    () => configured.map((name) => ({ name, students: countsByBranch.get(name) || 0 })),
    [configured, countsByBranch]
  );

  /**
   * Branches students sit in that the college does not list.
   *
   * Compared exactly, not on the folded key, and that is deliberate: job
   * eligibility runs `s.branch = ANY(...)` against the configured names, so a
   * student stored under "computer engineering" while the list says "Computer
   * Engineering" is unreachable by every job — even though the two look
   * identical to a reader. Folding the case here would decide those students are
   * fine and hide them, which is the opposite of what this list is for. The
   * folded key belongs in the duplicate guard, where it stops a new split being
   * created; here we want to see the splits that already exist.
   */
  const orphans = useMemo(() => {
    const configuredNames = new Set(configured);
    return studentBranches
      .filter((row) => !configuredNames.has(row.branch))
      .map((row) => ({ name: row.branch, students: Number(row.student_count) || 0 }));
  }, [studentBranches, configured]);

  const totalStudents = useMemo(
    () => studentBranches.reduce((sum, row) => sum + (Number(row.student_count) || 0), 0),
    [studentBranches]
  );

  /* -------------------------------------------------------------- handlers */

  const handleEditBranches = () => {
    setSelectedBranches(collegeData?.branches || []);
    setCustomBranch('');
    setAddError('');
    setShowEditModal(true);
  };

  const handleAddBranch = (branch) => {
    if (!findSameBranch(selectedBranches, branch)) {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  /**
   * Add a typed branch.
   *
   * The old check was `!selectedBranches.includes(trimmed)` — an exact match, so
   * typing "computer engineering" beside an existing "Computer Engineering"
   * added a second entry. Students would then split across two spellings that
   * look identical in a dropdown, and a job listing one of them would silently
   * miss everyone who picked the other. Same-branch is now decided on the folded
   * key, and a rejection says so instead of doing nothing.
   */
  const handleAddCustomBranch = () => {
    const trimmed = customBranch.trim();
    if (!trimmed) return;

    const clash = findSameBranch(selectedBranches, trimmed);
    if (clash) {
      setAddError(
        clash === trimmed
          ? `${clash} is already in the list.`
          : `${clash} is already in the list — that is the same branch, spelled differently.`
      );
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
        setCustomBranch('');
        setAddError('');
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
    setAddError('');
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobileBranchesSkeleton />;
    if (deviceType === 'tablet') return <TabletBranchesSkeleton />;
    return <DesktopBranchesSkeleton />;
  }

  return (
    <>
      <BranchesPage
        layout={deviceType}
        collegeName={collegeData?.college_name}
        rows={rows}
        orphans={orphans}
        totalStudents={totalStudents}
        onEdit={handleEditBranches}
      />

      {showEditModal && (
        <EditBranchesModal
          collegeName={collegeData?.college_name}
          original={configured}
          selected={selectedBranches}
          templates={branchTemplates}
          countsByBranch={countsByBranch}
          customBranch={customBranch}
          addError={addError}
          submitting={submitting}
          onCustomChange={(value) => {
            setCustomBranch(value);
            if (addError) setAddError('');
          }}
          onAddCustom={handleAddCustomBranch}
          onAddTemplate={handleAddBranch}
          onRemove={handleRemoveBranch}
          onSave={handleSaveBranches}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

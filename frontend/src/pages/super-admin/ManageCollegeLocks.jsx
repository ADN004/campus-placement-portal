import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import LocksBody, { LOCK_LABELS } from './locks/LocksBody';
import LocksSkeleton from './locks/LocksSkeleton';
import { LockDialog, AllowedPrnsDialog } from './locks/LockDialogs';

/**
 * Registration and PRN-range locks — container.
 *
 * All state and every call to the server. Same endpoints, same confirmation
 * before an unlock, and the same escape hatch for named PRNs.
 */
export default function ManageCollegeLocks() {
  const deviceType = useDeviceType();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [search, setSearch] = useState('');

  // Lock modal state: { collegeId: number | 'all', lockType, collegeName }
  const [lockTarget, setLockTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Allowed-PRNs editor state: { collegeId, collegeName, current: string[] }
  const [allowTarget, setAllowTarget] = useState(null);
  const [allowText, setAllowText] = useState('');
  const [savingAllow, setSavingAllow] = useState(false);

  useEffect(() => {
    fetchLocks();
  }, []);

  const fetchLocks = async () => {
    try {
      const res = await superAdminAPI.getCollegeLocks();
      // `|| []` because the very next thing this page does is `.filter` on it.
      // A response without `data` left `colleges` undefined and blanked the page
      // with a TypeError rather than showing an empty table.
      setColleges(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load college locks');
    } finally {
      setLoading(false);
    }
  };

  const openLockModal = (collegeId, lockType, collegeName) => {
    setLockTarget({ collegeId, lockType, collegeName });
    setReason('');
  };

  const submitLock = async () => {
    if (!lockTarget) return;
    setSubmitting(true);
    try {
      await superAdminAPI.lockCollege({
        college_id: lockTarget.collegeId,
        lock_type: lockTarget.lockType,
        reason: reason.trim() || undefined,
      });
      toast.success(
        lockTarget.collegeId === 'all'
          ? `Locked ${LOCK_LABELS[lockTarget.lockType]} for all colleges`
          : `Locked ${LOCK_LABELS[lockTarget.lockType]} for ${lockTarget.collegeName}`
      );
      setLockTarget(null);
      fetchLocks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (collegeId, lockType, collegeName) => {
    const label = LOCK_LABELS[lockType];
    const who = collegeId === 'all' ? 'ALL colleges' : collegeName;
    if (!window.confirm(`Unlock ${label} for ${who}? This lets them proceed again immediately.`)) return;
    try {
      await superAdminAPI.unlockCollege(collegeId, lockType);
      toast.success(`Unlocked ${label} for ${who}`);
      fetchLocks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlock');
    }
  };

  const openAllowModal = (college) => {
    setAllowTarget({
      collegeId: college.college_id,
      collegeName: college.college_name,
      current: college.registration.allowed_prns || [],
    });
    setAllowText((college.registration.allowed_prns || []).join(', '));
  };

  const saveAllowedPrns = async () => {
    if (!allowTarget) return;
    setSavingAllow(true);
    try {
      await superAdminAPI.setAllowedPrns(allowTarget.collegeId, allowText);
      toast.success('Allowed PRNs saved');
      setAllowTarget(null);
      fetchLocks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save allowed PRNs');
    } finally {
      setSavingAllow(false);
    }
  };

  const filtered = colleges.filter(
    (c) =>
      c.college_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.region_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Counts for the summary chips
  const regLocked = colleges.filter((c) => c.registration.locked).length;
  const prnLocked = colleges.filter((c) => c.prn_ranges.locked).length;

  if (showSkeleton) return <LocksSkeleton layout={deviceType} />;

  return (
    <>
      <LocksBody
        layout={deviceType}
        colleges={colleges}
        filtered={filtered}
        regLocked={regLocked}
        prnLocked={prnLocked}
        search={search}
        onSearch={setSearch}
        onLock={openLockModal}
        onUnlock={handleUnlock}
        onAllowPrns={openAllowModal}
      />

      {lockTarget && (
        <LockDialog
          target={lockTarget}
          reason={reason}
          onReasonChange={setReason}
          onConfirm={submitLock}
          onClose={() => setLockTarget(null)}
          submitting={submitting}
        />
      )}

      {allowTarget && (
        <AllowedPrnsDialog
          target={allowTarget}
          text={allowText}
          onTextChange={setAllowText}
          onSave={saveAllowedPrns}
          onClose={() => setAllowTarget(null)}
          saving={savingAllow}
        />
      )}
    </>
  );
}

import { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Lock, Unlock, Search, ShieldCheck, AlertTriangle, X, UserCheck } from 'lucide-react';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import TablePageSkeleton from '../../components/skeletons/TablePageSkeleton';

// Human labels for the two lock types
const LOCK_LABELS = {
  registration: 'Student Registration',
  prn_ranges: 'PRN Range Editing',
};

export default function ManageCollegeLocks() {
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
      setColleges(res.data.data);
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

  if (showSkeleton) return <TablePageSkeleton />;

  const LockCell = ({ college, lockType }) => {
    const state = college[lockType];
    return (
      <td className="px-4 py-4">
        {state.locked ? (
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
              <Lock className="w-3 h-3" /> Locked
            </span>
            {state.reason && (
              <span className="text-xs text-gray-500 max-w-[220px]" title={state.reason}>
                {state.reason}
              </span>
            )}
            {state.locked_at && (
              <span className="text-[11px] text-gray-400">
                {new Date(state.locked_at).toLocaleDateString('en-IN')}
                {state.locked_by_name ? ` · ${state.locked_by_name}` : ''}
              </span>
            )}
            {lockType === 'registration' && (
              <button
                onClick={() => openAllowModal(college)}
                className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                title="PRNs allowed to register despite the lock"
              >
                <UserCheck className="w-3 h-3" />
                {(state.allowed_prns?.length || 0) > 0
                  ? `${state.allowed_prns.length} allowed`
                  : 'Allow PRNs'}
              </button>
            )}
            <button
              onClick={() => handleUnlock(college.college_id, lockType, college.college_name)}
              className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-md text-xs font-semibold text-green-700 hover:bg-green-50 border border-green-200"
            >
              <Unlock className="w-3 h-3" /> Unlock
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
              <ShieldCheck className="w-3 h-3" /> Open
            </span>
            <button
              onClick={() => openLockModal(college.college_id, lockType, college.college_name)}
              className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-md text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200"
            >
              <Lock className="w-3 h-3" /> Lock
            </button>
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <AnimatedSection delay={0}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-600" /> Registration &amp; PRN-Range Locks
          </h1>
          <p className="text-gray-600 mt-1 text-sm max-w-3xl">
            Freeze a college once its deadline passes. A <strong>registration</strong> lock blocks
            only NEW student registrations — already-approved students keep logging in. A{' '}
            <strong>PRN-range</strong> lock stops that college's placement officer from adding or
            editing ranges. You are never blocked; unlock any time to reopen.
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.05}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-semibold">
            <Lock className="w-4 h-4" /> {regLocked} registration · {prnLocked} PRN-range locked
          </div>
          <div className="flex-1" />
          {/* Bulk controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openLockModal('all', 'registration', null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700"
            >
              Lock ALL registration
            </button>
            <button
              onClick={() => handleUnlock('all', 'registration', null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700"
            >
              Unlock ALL registration
            </button>
            <button
              onClick={() => openLockModal('all', 'prn_ranges', null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700"
            >
              Lock ALL PRN ranges
            </button>
            <button
              onClick={() => handleUnlock('all', 'prn_ranges', null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700"
            >
              Unlock ALL PRN ranges
            </button>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search college or region…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Student Registration</th>
                <th className="px-4 py-3">PRN Range Editing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No colleges match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((college) => (
                  <tr key={college.college_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-semibold text-gray-900">{college.college_name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{college.region_name || '-'}</td>
                    <LockCell college={college} lockType="registration" />
                    <LockCell college={college} lockType="prn_ranges" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnimatedSection>

      {/* Lock reason modal */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Lock {LOCK_LABELS[lockTarget.lockType]}
              </h2>
              <button onClick={() => setLockTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {lockTarget.collegeId === 'all' ? (
                <>This will lock <strong>{LOCK_LABELS[lockTarget.lockType]}</strong> for <strong>every college</strong>.</>
              ) : (
                <>This will lock <strong>{LOCK_LABELS[lockTarget.lockType]}</strong> for <strong>{lockTarget.collegeName}</strong>.</>
              )}
              {lockTarget.lockType === 'registration'
                ? ' New registrations will be refused; approved students are unaffected.'
                : " That college's placement officer will not be able to add or edit PRN ranges."}
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Registration deadline (July 15) has passed"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLockTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitLock}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" /> {submitting ? 'Locking…' : 'Confirm Lock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allowed-PRNs editor modal */}
      {allowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                PRNs allowed past the lock
              </h2>
              <button onClick={() => setAllowTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Registration is locked for <strong>{allowTarget.collegeName}</strong>. PRNs listed here
              can still register despite the lock — an escape hatch for specific stragglers everyone
              else stays blocked. Separate with commas, spaces or new lines.
            </p>
            <textarea
              value={allowText}
              onChange={(e) => setAllowText(e.target.value)}
              rows={4}
              placeholder="e.g. 2401031856, 2401031999"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAllowTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveAllowedPrns}
                disabled={savingAllow}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" /> {savingAllow ? 'Saving…' : 'Save Allowed PRNs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

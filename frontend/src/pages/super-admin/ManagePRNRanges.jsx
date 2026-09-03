import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import RangesBody from './prnRanges/RangesBody';
import RangesSkeleton from './prnRanges/RangesSkeleton';
import { RangeDialog, SinglePrnDialog, DisableDialog } from './prnRanges/RangeModals';

const EMPTY_FORM = {
  range_start: '',
  range_end: '',
  single_prn: '',
  description: '',
  year: '',
  exceptions: '',
};

/**
 * PRN Ranges — container.
 *
 * All state, effects and handlers; the body and the dialogs draw them. Every
 * request, payload, toast and validation rule is carried over unchanged.
 *
 * Two things were removed, both unreachable rather than unused:
 *
 *   - a "view students in range" modal, with its own fetch, its own export and
 *     about 130 lines of markup. The button beside each range has been a `Link`
 *     to `/super-admin/prn-ranges/:id/students` for some time, so nothing could
 *     open the modal. The feature still works; it lives on that page.
 *   - three blurred colour circles drifting behind the content. Console has no
 *     decorative colour on a page.
 *
 * `handleViewStudents` and `handleExportRangeStudents` went with the modal, so
 * the handler snapshot for this page is two names shorter than it was. That is
 * the intended change, not a rewrite dropping something.
 */
export default function ManagePRNRanges() {
  const deviceType = useDeviceType();
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);
  const [showAddRange, setShowAddRange] = useState(false);
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  const [editingRange, setEditingRange] = useState(null);
  const [yearFilter, setYearFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchRanges();
  }, []);

  const fetchRanges = async () => {
    try {
      const response = await superAdminAPI.getPRNRanges();
      setRanges(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load PRN ranges');
    } finally {
      setLoading(false);
    }
  };

  const closeForms = () => {
    setShowAddRange(false);
    setShowAddSingle(false);
    setEditingRange(null);
    setFormData(EMPTY_FORM);
  };

  const handleAddRange = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        range_start: formData.range_start,
        range_end: formData.range_end,
        description: formData.description,
        year: formData.year,
        exceptions: formData.exceptions,
      };
      if (editingRange) {
        await superAdminAPI.updatePRNRange(editingRange.id, payload);
        toast.success('PRN range updated successfully');
      } else {
        await superAdminAPI.addPRNRange(payload);
        toast.success('PRN range added successfully');
      }
      closeForms();
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message
        || `Failed to ${editingRange ? 'update' : 'add'} PRN range`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        single_prn: formData.single_prn,
        description: formData.description,
        year: formData.year,
      };
      if (editingRange) {
        await superAdminAPI.updatePRNRange(editingRange.id, payload);
        toast.success('Single PRN updated successfully');
      } else {
        await superAdminAPI.addPRNRange(payload);
        toast.success('Single PRN added successfully');
      }
      closeForms();
      fetchRanges();
    } catch (error) {
      toast.error(error.response?.data?.message
        || `Failed to ${editingRange ? 'update' : 'add'} single PRN`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnable = async (range) => {
    if (range.is_enabled) {
      // Disabling needs a reason, so it goes through its own dialog.
      setSelectedRange(range);
      setDisableReason('');
      setShowDisableModal(true);
    } else {
      await handleEnableRange(range.id);
    }
  };

  const handleEnableRange = async (id) => {
    try {
      await superAdminAPI.updatePRNRange(id, { is_enabled: true });
      toast.success('PRN range enabled successfully');
      fetchRanges();
    } catch (error) {
      toast.error('Failed to enable PRN range');
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableReason.trim()) {
      toast.error('Please provide a reason for disabling this PRN range');
      return;
    }
    setSubmitting(true);
    try {
      await superAdminAPI.updatePRNRange(selectedRange.id, {
        is_enabled: false,
        disabled_reason: disableReason,
      });
      toast.success('PRN range disabled successfully');
      setShowDisableModal(false);
      setSelectedRange(null);
      setDisableReason('');
      fetchRanges();
    } catch (error) {
      toast.error('Failed to disable PRN range');
    } finally {
      setSubmitting(false);
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

  const handleEdit = (range) => {
    setEditingRange(range);
    setFormData({
      range_start: range.range_start || '',
      range_end: range.range_end || '',
      single_prn: range.single_prn || '',
      description: range.description || '',
      year: range.year || '',
      exceptions: (range.excepted_prns || []).join(', '),
    });

    if (range.single_prn) {
      setShowAddSingle(true);
    } else {
      setShowAddRange(true);
    }
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (showSkeleton) return <RangesSkeleton layout={deviceType} />;

  const availableYears = [...new Set(ranges.map((r) => r.year).filter(Boolean))]
    .sort((a, b) => b - a);

  const searchQuery = search.trim().toLowerCase();

  // Year/active filter first, then search: a query matches a range by its
  // college name, PRN digits, year or description
  const filteredRanges = ranges.filter((range) => {
    if (yearFilter === 'active' && !range.is_enabled) return false;
    if (yearFilter !== 'active' && yearFilter !== 'all' && String(range.year) !== yearFilter) return false;
    if (!searchQuery) return true;
    const collegeLabel = range.college_name || 'system-wide all colleges super admin';
    if (collegeLabel.toLowerCase().includes(searchQuery)) return true;
    const haystack = [range.range_start, range.range_end, range.single_prn, range.description, range.year]
      .filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(searchQuery);
  });

  // Group into one collapsible section per college, with Super-Admin
  // system-wide entries (college_id NULL) in their own section on top
  const SYSTEM_KEY = '__system__';
  const groupMap = new Map();
  for (const range of filteredRanges) {
    const key = range.college_name || SYSTEM_KEY;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(range);
  }
  const groups = [...groupMap.entries()]
    .map(([key, groupRanges]) => ({
      key,
      label: key === SYSTEM_KEY ? 'System-wide (all colleges)' : key,
      isSystemWide: key === SYSTEM_KEY,
      ranges: groupRanges,
      rangeCount: groupRanges.filter((r) => !r.single_prn).length,
      singleCount: groupRanges.filter((r) => r.single_prn).length,
      disabledCount: groupRanges.filter((r) => !r.is_enabled).length,
    }))
    .sort((a, b) => {
      if (a.isSystemWide) return -1;
      if (b.isSystemWide) return 1;
      return a.label.localeCompare(b.label);
    });

  // A search opens every group it matched: hiding results behind a collapsed
  // heading would make the search look broken.
  const isGroupExpanded = (key) => (searchQuery ? true : expandedGroups.has(key));

  const totalGroups = new Set(ranges.map((r) => r.college_name || SYSTEM_KEY)).size;

  return (
    <>
      <RangesBody
        layout={deviceType}
        groups={groups}
        totalGroups={totalGroups}
        years={availableYears}
        search={search}
        onSearch={(e) => setSearch(e.target.value)}
        yearFilter={yearFilter}
        onYear={(e) => setYearFilter(e.target.value)}
        isGroupExpanded={isGroupExpanded}
        onToggleGroup={toggleGroup}
        onExpandAll={() => setExpandedGroups(new Set(groups.map((g) => g.key)))}
        onCollapseAll={() => setExpandedGroups(new Set())}
        onAddRange={() => { setEditingRange(null); setFormData(EMPTY_FORM); setShowAddRange(true); }}
        onAddSingle={() => { setEditingRange(null); setFormData(EMPTY_FORM); setShowAddSingle(true); }}
        onEdit={handleEdit}
        onToggleEnable={handleToggleEnable}
        onDelete={handleDelete}
      />

      {showAddRange && (
        <RangeDialog
          editing={editingRange}
          formData={formData}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleAddRange}
          onClose={closeForms}
          submitting={submitting}
        />
      )}

      {showAddSingle && (
        <SinglePrnDialog
          editing={editingRange}
          formData={formData}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleAddSingle}
          onClose={closeForms}
          submitting={submitting}
        />
      )}

      {showDisableModal && selectedRange && (
        <DisableDialog
          range={selectedRange}
          reason={disableReason}
          onReasonChange={setDisableReason}
          onConfirm={handleConfirmDisable}
          onClose={() => {
            setShowDisableModal(false);
            setSelectedRange(null);
            setDisableReason('');
          }}
          submitting={submitting}
        />
      )}
    </>
  );
}

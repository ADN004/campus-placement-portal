import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import PrnRangesPage from './prnRanges/PrnRangesPage';
import {
  RangeFormModal,
  SinglePrnModal,
  DisableRangeModal,
  RangeStudentsModal,
} from './prnRanges/PrnRangeModals';
import {
  DesktopPrnRangesSkeleton,
  TabletPrnRangesSkeleton,
  MobilePrnRangesSkeleton,
} from './prnRanges/PrnRangesSkeleton';

export default function ManagePRNRanges() {
  const [prnRanges, setPrnRanges] = useState([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  // Main list shows only THIS college's ranges, Active by default — old-year
  // disabled ranges pile up after every academic reset, so hide them unless
  // asked. SA system-wide ranges live in their own collapsed section.
  const [viewFilter, setViewFilter] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [rangeStudents, setRangeStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [formData, setFormData] = useState({
    start_prn: '',
    end_prn: '',
    single_prn: '',
    year: '',
    description: '',
    exceptions: '',
  });

  useEffect(() => {
    fetchPRNRanges();
  }, []);

  const fetchPRNRanges = async () => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getPRNRanges();
      setPrnRanges(response.data.data || []);
      setLocked(response.data.prn_ranges_locked === true);
    } catch (error) {
      toast.error('Failed to load PRN ranges');
      console.error('Error fetching PRN ranges:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear the form and close whichever dialog was open.
   *
   * This existed before the redesign and I deleted it while moving the dialogs
   * into prnRanges/, without noticing the three handlers that still call it.
   * The result was invisible to the build and to a reference audit that only
   * asked whether handlers were *called*, not whether what they call *exists*:
   * every add and every edit saved correctly on the server, showed "added
   * successfully", then threw ReferenceError on this line, hit the catch, and
   * showed "Failed to add PRN range" on top of the success — with the dialog
   * still open. The natural response is to press the button again, which
   * creates a duplicate.
   */
  const resetForm = () => {
    setFormData({
      start_prn: '',
      end_prn: '',
      single_prn: '',
      year: '',
      description: '',
      exceptions: '',
    });
    setEditingId(null);
    setShowAddModal(false);
    setShowAddSingleModal(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!formData.start_prn || !formData.end_prn || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await placementOfficerAPI.addPRNRange(formData);
      toast.success('PRN range added successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add PRN range');
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();

    if (!formData.single_prn || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await placementOfficerAPI.addPRNRange({ single_prn: formData.single_prn, year: formData.year, description: formData.description });
      toast.success('Single PRN added successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add single PRN');
    }
  };

  const handleEdit = (range) => {
    if (range.single_prn) {
      setFormData({
        start_prn: '',
        end_prn: '',
        single_prn: range.single_prn,
        year: range.year,
        description: range.description || '',
      });
      setEditingId(range.id);
      setShowAddSingleModal(true);
    } else {
      setFormData({
        start_prn: range.start_prn,
        end_prn: range.end_prn,
        single_prn: '',
        year: range.year,
        description: range.description || '',
        exceptions: (range.excepted_prns || []).join(', '),
      });
      setEditingId(range.id);
      setShowAddModal(true);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const isSingle = showAddSingleModal;
    if (isSingle) {
      if (!formData.single_prn || !formData.year) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else {
      if (!formData.start_prn || !formData.end_prn || !formData.year) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    try {
      const updateData = isSingle
        ? { single_prn: formData.single_prn, year: formData.year, description: formData.description }
        : { start_prn: formData.start_prn, end_prn: formData.end_prn, year: formData.year, description: formData.description, exceptions: formData.exceptions };
      await placementOfficerAPI.updatePRNRange(editingId, updateData);
      toast.success(isSingle ? 'Single PRN updated successfully' : 'PRN range updated successfully');
      fetchPRNRanges();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update PRN range');
    }
  };

  const handleDelete = async (id, createdBy) => {
    if (createdBy === 'super_admin') {
      toast.error('You cannot delete PRN ranges created by Super Admin');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this PRN range?')) {
      return;
    }

    try {
      await placementOfficerAPI.deletePRNRange(id);
      toast.success('PRN range deleted successfully');
      fetchPRNRanges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete PRN range');
    }
  };

  const handleToggleEnable = async (range) => {
    if (range.created_by === 'super_admin') {
      toast.error('You cannot modify PRN ranges created by Super Admin');
      return;
    }

    if (range.is_enabled) {
      // If currently enabled, show modal to ask for disable reason
      setSelectedRange(range);
      setDisableReason('');
      setShowDisableModal(true);
    } else {
      // If currently disabled, enable it directly
      await handleEnableRange(range.id);
    }
  };

  const handleEnableRange = async (id) => {
    try {
      await placementOfficerAPI.updatePRNRange(id, { is_enabled: true });
      toast.success('PRN range enabled successfully');
      fetchPRNRanges();
    } catch (error) {
      toast.error('Failed to enable PRN range');
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableReason.trim()) {
      toast.error('Please provide a reason for disabling this PRN range');
      return;
    }

    try {
      await placementOfficerAPI.updatePRNRange(selectedRange.id, {
        is_enabled: false,
        disabled_reason: disableReason,
      });
      toast.success('PRN range disabled');
      setShowDisableModal(false);
      setSelectedRange(null);
      setDisableReason('');
      /*
       * Show it, rather than letting it vanish.
       *
       * The list defaults to "Active ranges", so the moment a range is disabled
       * it stops matching the filter and disappears from the page. Nothing says
       * where it went, and an officer who has just pressed Disable has every
       * reason to read that as Delete — with no way back, because re-enabling
       * it means first knowing to change a dropdown they were never pointed at.
       *
       * Switching the view is the smaller surprise: the row they just acted on
       * stays on screen, now marked Disabled, with its Enable button in reach.
       */
      if (viewFilter === 'active') setViewFilter('all');
      fetchPRNRanges();
    } catch (error) {
      toast.error('Failed to disable PRN range');
    }
  };

  const handleViewStudents = async (range) => {
    setSelectedRange(range);
    setShowViewStudentsModal(true);
    setLoadingStudents(true);
    setRangeStudents([]);

    try {
      const response = await placementOfficerAPI.getStudentsByPRNRange(range.id);
      setRangeStudents(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load students');
      setRangeStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);
  const deviceType = useDeviceType();

  const handleExportRangeStudents = async (format) => {
    if (!selectedRange) return;

    setExportingStudents(true);
    setShowExportMenu(false);
    try {
      const response = await placementOfficerAPI.exportStudentsByPRNRange(selectedRange.id, format);

      const blob = new Blob([response.data], {
        type: format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rangeLabel = selectedRange.single_prn
        ? selectedRange.single_prn
        : `${selectedRange.start_prn}_${selectedRange.end_prn}`;
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      a.download = `students_prn_range_${rangeLabel}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Students exported as ${format === 'pdf' ? 'PDF' : 'Excel'} successfully`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export students');
    } finally {
      setExportingStudents(false);
    }
  };

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobilePrnRangesSkeleton />;
    if (deviceType === 'tablet') return <TabletPrnRangesSkeleton />;
    return <DesktopPrnRangesSkeleton />;
  }

  // One list. The endpoint returns this college's ranges and nothing else now,
  // so there is no longer a "system-wide" set to separate out — a Super-Admin
  // range that belongs to this college is one of this college's ranges, shown
  // in PRN order with the rest and marked read-only on its own row.
  const ownRanges = prnRanges;

  const availableYears = [...new Set(ownRanges.map(r => r.year).filter(Boolean))].sort((a, b) => b - a);

  const filteredOwn = ownRanges.filter(range => {
    if (viewFilter === 'active') return range.is_enabled;
    if (viewFilter === 'all') return true;
    return String(range.year) === viewFilter;
  });

  const actionHandlers = {
    onViewStudents: handleViewStudents,
    onToggle: handleToggleEnable,
    onEdit: handleEdit,
    onDelete: handleDelete,
  };

  return (
    <>
      <PrnRangesPage
        layout={deviceType}
        locked={locked}
        ownRanges={ownRanges}
        filteredOwn={filteredOwn}
        availableYears={availableYears}
        viewFilter={viewFilter}
        onViewFilterChange={(e) => setViewFilter(e.target.value)}
        onAddRange={() => {
          setEditingId(null);
          setFormData({ start_prn: '', end_prn: '', single_prn: '', year: '', description: '', exceptions: '' });
          setShowAddModal(true);
        }}
        onAddSingle={() => {
          setEditingId(null);
          setFormData({ start_prn: '', end_prn: '', single_prn: '', year: '', description: '', exceptions: '' });
          setShowAddSingleModal(true);
        }}
        actionHandlers={actionHandlers}
      />

      {showAddModal && (
        <RangeFormModal
          editing={Boolean(editingId)}
          formData={formData}
          onChange={setFormData}
          onSubmit={editingId ? handleUpdate : handleAdd}
          onClose={() => { setShowAddModal(false); setEditingId(null); }}
        />
      )}

      {showAddSingleModal && (
        <SinglePrnModal
          editing={Boolean(editingId)}
          formData={formData}
          onChange={setFormData}
          onSubmit={editingId ? handleUpdate : handleAddSingle}
          onClose={() => { setShowAddSingleModal(false); setEditingId(null); }}
        />
      )}

      {showDisableModal && selectedRange && (
        <DisableRangeModal
          range={selectedRange}
          reason={disableReason}
          onReasonChange={(e) => setDisableReason(e.target.value)}
          onConfirm={handleConfirmDisable}
          onClose={() => { setShowDisableModal(false); setDisableReason(''); }}
        />
      )}

      {showViewStudentsModal && selectedRange && (
        <RangeStudentsModal
          range={selectedRange}
          students={rangeStudents}
          loading={loadingStudents}
          exporting={exportingStudents}
          showExportMenu={showExportMenu}
          onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
          onExport={handleExportRangeStudents}
          onClose={() => { setShowViewStudentsModal(false); setShowExportMenu(false); }}
        />
      )}
    </>
  );
}

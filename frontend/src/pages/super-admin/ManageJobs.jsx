import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import JobsBody from './jobs/JobsBody';
import JobsSkeleton from './jobs/JobsSkeleton';
import { DetailsDialog, DeleteDialog, ExportDialog } from './jobs/JobDialogs';

/**
 * Jobs — the list, container.
 *
 * Creating and editing used to be a 707-line dialog inside this file. A job
 * carries a deadline, an eligibility rule, a sixty-college audience and a set of
 * profile requirements — that is a page, not something to squeeze behind a
 * scrim, so it lives at `/super-admin/jobs/new` and `/jobs/:jobId/edit` now.
 *
 * `handleCreateJob` and `handleEditJob` survive by name and still mean the same
 * thing to whoever clicks them; what they do is navigate rather than open a
 * dialog. Everything they used to set up — the form shape, the applicant lock,
 * the targeting resolution — moved with the form.
 */
export default function ManageJobs() {
  const deviceType = useDeviceType();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'deleted'
  const [jobs, setJobs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showSkeleton } = useSkeleton(loading);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Export Applicants modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTargetJob, setExportTargetJob] = useState(null);
  const [exportScope, setExportScope] = useState('all'); // 'all' | 'region' | 'colleges'
  const [exportSelectedRegion, setExportSelectedRegion] = useState('');
  const [exportSelectedColleges, setExportSelectedColleges] = useState([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchJobs(),
        fetchPendingRequests(),
        fetchRegions(),
        fetchColleges(),
        fetchDeletedJobs(),
      ]);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await superAdminAPI.getJobs();
      setJobs(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load jobs');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await superAdminAPI.getPendingJobRequests();
      setPendingRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const fetchDeletedJobs = async () => {
    try {
      const response = await superAdminAPI.getDeletedJobsHistory();
      setDeletedJobs(response.data.data || []);
    } catch (error) {
      console.error('Failed to load deleted jobs:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await commonAPI.getRegions();
      setRegions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load regions:', error);
    }
  };

  const fetchColleges = async () => {
    try {
      const response = await commonAPI.getColleges();
      setColleges(response.data.data || []);
    } catch (error) {
      console.error('Failed to load colleges:', error);
    }
  };

  const handleCreateJob = () => navigate('/super-admin/jobs/new');

  const handleEditJob = (job) => navigate(`/super-admin/jobs/${job.id}/edit`);

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  const handleOpenDeleteModal = (job) => {
    setJobToDelete(job);
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setJobToDelete(null);
    setDeleteReason('');
  };

  const handleSoftDelete = async () => {
    if (!jobToDelete) return;

    try {
      await superAdminAPI.deleteJob(jobToDelete.id);
      toast.success('Job moved to deleted history');
      fetchJobs();
      fetchDeletedJobs();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    }
  };

  const handlePermanentDelete = async (reason) => {
    if (!jobToDelete) return;

    if (!reason || !reason.trim()) {
      toast.error('Reason is required for permanent deletion');
      return;
    }

    try {
      await superAdminAPI.permanentlyDeleteJob(jobToDelete.id, reason);
      toast.success('Job permanently deleted');
      fetchJobs();
      fetchDeletedJobs();
      handleCloseDeleteModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to permanently delete job');
    }
  };

  const handleClearDeletedHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all deleted jobs history? This action cannot be undone.')) {
      return;
    }

    try {
      await superAdminAPI.clearDeletedJobsHistory();
      toast.success('Deleted jobs history cleared');
      fetchDeletedJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear deleted history');
    }
  };

  const handleToggleStatus = async (jobId, currentStatus) => {
    try {
      await superAdminAPI.toggleJobStatus(jobId);
      toast.success(`Job ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  const handleSAExport = async () => {
    try {
      setExporting(true);
      let college_ids = [];
      if (exportScope === 'region') {
        college_ids = colleges.filter((c) => String(c.region_id) === String(exportSelectedRegion)).map((c) => c.id);
      } else if (exportScope === 'colleges') {
        college_ids = exportSelectedColleges;
      }

      const loadingToast = toast.loading(`Preparing ${exportFormat === 'pdf' ? 'PDF' : 'Excel'} export...`);
      const response = await superAdminAPI.enhancedExportJobApplicants(exportTargetJob.id, {
        format: exportFormat,
        college_ids,
      });

      const mimeType = exportFormat === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExt = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      const scopeLabel = exportScope === 'all' ? 'all' : exportScope === 'region' ? `region_${exportSelectedRegion}` : 'selected_colleges';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `applicants_${exportTargetJob.job_title.replace(/\s+/g, '_')}_${scopeLabel}_${Date.now()}.${fileExt}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Export downloaded successfully');
      setShowExportModal(false);
    } catch (error) {
      console.error('SA export error:', error);
      toast.error('Failed to export applicants');
    } finally {
      setExporting(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this job request?')) {
      return;
    }

    try {
      await superAdminAPI.approveJobRequest(requestId);
      toast.success('Job request approved successfully');
      fetchJobs();
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve job request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this job request?')) {
      return;
    }

    try {
      await superAdminAPI.rejectJobRequest(requestId);
      toast.success('Job request rejected successfully');
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject job request');
    }
  };

  const openExport = (job) => {
    setExportTargetJob(job);
    setExportScope('all');
    setExportSelectedRegion('');
    setExportSelectedColleges([]);
    setExportFormat('excel');
    setShowExportModal(true);
  };

  if (showSkeleton) return <JobsSkeleton layout={deviceType} />;

  return (
    <>
      <JobsBody
        layout={deviceType}
        activeTab={activeTab}
        onTab={setActiveTab}
        jobs={jobs}
        pendingRequests={pendingRequests}
        deletedJobs={deletedJobs}
        regions={regions}
        colleges={colleges}
        actions={{
          onView: handleViewDetails,
          onEdit: handleEditJob,
          onToggleStatus: handleToggleStatus,
          onExport: openExport,
          onDelete: handleOpenDeleteModal,
        }}
        onCreate={handleCreateJob}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        onClearHistory={handleClearDeletedHistory}
      />

      {showDetailsModal && selectedJob && (
        <DetailsDialog
          job={selectedJob}
          regions={regions}
          colleges={colleges}
          onClose={() => { setShowDetailsModal(false); setSelectedJob(null); }}
        />
      )}

      {showDeleteModal && jobToDelete && (
        <DeleteDialog
          job={jobToDelete}
          reason={deleteReason}
          onReasonChange={setDeleteReason}
          onSoftDelete={handleSoftDelete}
          /*
           * The second gate is the one the page always had, word for word. Only
           * the reason moved out of `window.prompt` and into a field — a prompt
           * gives you one line, no validation, and hides the job you are about
           * to destroy while you type into it.
           */
          onPermanentDelete={() => {
            if (window.confirm(
              '⚠️ WARNING: This will PERMANENTLY delete this job and all related data.\n\nThis action CANNOT be undone. Are you absolutely sure?'
            )) {
              handlePermanentDelete(deleteReason);
            }
          }}
          onClose={handleCloseDeleteModal}
        />
      )}

      {showExportModal && exportTargetJob && (
        <ExportDialog
          job={exportTargetJob}
          regions={regions}
          colleges={colleges}
          scope={exportScope}
          onScope={(value) => {
            setExportScope(value);
            setExportSelectedRegion('');
            setExportSelectedColleges([]);
          }}
          selectedRegion={exportSelectedRegion}
          onSelectedRegion={setExportSelectedRegion}
          selectedColleges={exportSelectedColleges}
          onToggleCollege={(id) => setExportSelectedColleges((prev) => (
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
          ))}
          onAllColleges={() => setExportSelectedColleges(colleges.map((c) => c.id))}
          onNoColleges={() => setExportSelectedColleges([])}
          format={exportFormat}
          onFormat={setExportFormat}
          onExport={handleSAExport}
          onClose={() => setShowExportModal(false)}
          exporting={exporting}
        />
      )}
    </>
  );
}

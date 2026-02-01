import express from 'express';
import {
  getDashboard,
  getProfile,
  updateProfile,
  getStudents,
  approveStudent,
  rejectStudent,
  bulkApproveStudents,
  bulkRejectStudents,
  blacklistStudent,
  requestWhitelist,
  sendNotification,
  exportStudents,
  getJobs,
  createJobRequest,
  getJobRequests,
  getJobApplicants,
  getPRNRanges,
  addPRNRange,
  updatePRNRange,
  deletePRNRange,
  getStudentsByPRNRange,
  exportStudentsByPRNRange,
  getCollegeBranches as getBranchesForNotifications,
} from '../controllers/placementOfficerController.js';
import {
  uploadOwnPhoto,
  deleteOwnPhoto,
  customExportStudents,
  getCollegeBranches,
  exportJobApplicants,
  createOrUpdateJobRequestRequirements,
  getJobRequestRequirements,
  getDetailedStudentProfile,
  updateApplicationStatus,
  bulkUpdateApplicationStatus,
  updatePlacementDetails,
  createOrUpdateJobDrive,
  getJobDrive,
  notifyApplicationStatus,
  getJobPlacementStats,
  enhancedExportJobApplicants,
  getPlacementPosterStats,
  generatePlacementPoster,
  uploadCollegeLogo,
  deleteCollegeLogo,
  manuallyAddStudentToJob,
  validateStudentForManualAddition,
  getCgpaLockStatusPO,
  unlockCgpaPO,
  lockCgpaPO,
} from '../controllers/placementOfficerControllerExtensions.js';
import {
  downloadStudentResumePO,
  getStudentResumeStatusPO,
} from '../controllers/resumeController.js';
import {
  getOwnCollegeBranches,
  updateOwnCollegeBranches,
  getBranchTemplates,
} from '../controllers/collegeBranchController.js';
import { protect, authorize } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes are protected and require placement_officer role
router.use(protect);
router.use(authorize('placement_officer'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/photo', uploadOwnPhoto);
router.delete('/profile/photo', deleteOwnPhoto);
router.get('/students', getStudents);
router.get('/students/export', exportStudents);
router.post('/students/custom-export', customExportStudents);
router.put('/students/bulk-approve', bulkApproveStudents);
router.put('/students/bulk-reject', bulkRejectStudents);
router.put('/students/:id/approve', approveStudent);
router.put('/students/:id/reject', rejectStudent);
router.put('/students/:id/blacklist', blacklistStudent);
router.post('/students/:id/whitelist-request', requestWhitelist);
router.get('/branches', getBranchesForNotifications); // Get branches for notifications
router.post('/send-notification', sendNotification);
router.get('/jobs', getJobs);
router.get('/jobs/:jobId/applicants', getJobApplicants);
router.get('/jobs/:jobId/applicants/export', exportJobApplicants);
router.post('/job-requests', createJobRequest);
router.get('/job-requests', getJobRequests);
router.get('/college/branches', getCollegeBranches);

// Enhanced Job Applicants Management Routes (College-Scoped)
router.get('/students/:studentId/detailed-profile', getDetailedStudentProfile);

// Student Resume Download Routes
router.get('/students/:studentId/resume/status', getStudentResumeStatusPO);
router.get('/students/:studentId/resume/download', downloadStudentResumePO);

router.put('/applications/:applicationId/status', updateApplicationStatus);
router.post('/applications/bulk-update-status', bulkUpdateApplicationStatus);
router.put('/applications/:applicationId/placement', updatePlacementDetails);
router.post('/applications/notify', notifyApplicationStatus);
router.get('/jobs/:jobId/placement-stats', getJobPlacementStats);
router.post('/jobs/:jobId/drive', createOrUpdateJobDrive);
router.get('/jobs/:jobId/drive', getJobDrive);
router.post('/jobs/:jobId/applicants/enhanced-export', enhancedExportJobApplicants);

// College Branch Management Routes
router.get('/college-branches', getOwnCollegeBranches);
router.put('/college-branches', updateOwnCollegeBranches);
router.get('/branch-templates', getBranchTemplates);

// PRN Range Management Routes
router.get('/prn-ranges', getPRNRanges);
router.post('/prn-ranges', addPRNRange);
router.put('/prn-ranges/:id', updatePRNRange);
router.delete('/prn-ranges/:id', deletePRNRange);
router.get('/prn-ranges/:id/students', getStudentsByPRNRange);
router.get('/prn-ranges/:id/students/export', exportStudentsByPRNRange);

// Job Request Requirements Routes
router.post('/job-requests/:jobRequestId/requirements', createOrUpdateJobRequestRequirements);
router.get('/job-requests/:jobRequestId/requirements', getJobRequestRequirements);

// Placement Poster Routes
router.get('/placement-poster/stats', getPlacementPosterStats);
router.post('/placement-poster/generate', exportLimiter, generatePlacementPoster);

// College Logo Management Routes
router.post('/college/logo', uploadCollegeLogo);
router.delete('/college/logo', deleteCollegeLogo);

// Manual Student Addition Routes
router.post('/manually-add-student-to-job', manuallyAddStudentToJob);
router.post('/validate-student-for-manual-addition', validateStudentForManualAddition);

// CGPA Lock/Unlock Management Routes
router.get('/cgpa-lock-status', getCgpaLockStatusPO);
router.post('/cgpa-unlock', unlockCgpaPO);
router.post('/cgpa-lock', lockCgpaPO);

export default router;

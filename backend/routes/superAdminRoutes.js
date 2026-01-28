import express from 'express';
import {
  getDashboard,
  getProfile,
  updateProfile,
  getPRNRanges,
  addPRNRange,
  updatePRNRange,
  deletePRNRange,
  getPlacementOfficers,
  getOfficerHistory,
  addPlacementOfficer,
  updatePlacementOfficer,
  resetPlacementOfficerPassword,
  deletePlacementOfficer,
  clearOfficerHistory,
  createJob,
  getJobs,
  updateJob,
  deleteJob,
  toggleJobStatus,
  getWhitelistRequests,
  approveWhitelistRequest,
  rejectWhitelistRequest,
  getActivityLogs,
  getAllStudents,
  searchStudentByPRN,
  blacklistStudent,
  whitelistStudent,
  deleteStudent,
  customExportStudents,
  getJobApplicants,
  getPendingJobRequests,
  approveJobRequest,
  rejectJobRequest,
  getSuperAdmins,
  createSuperAdmin,
  deactivateSuperAdmin,
  activateSuperAdmin,
  deleteSuperAdmin,
  getAvailableDistricts,
  getCollegesForNotifications,
  getBranchesForColleges,
  sendNotification,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  getAdminNotificationUnreadCount,
} from '../controllers/superAdminController.js';
import {
  bulkDeleteStudentPhotos,
  permanentlyDeleteJob,
  getDeletedJobsHistory,
  clearDeletedJobsHistory,
  getCollegeBranches,
  enhancedCustomExport,
  getNormalizedBranches,
  getStudentsByPRNRange,
  exportStudentsByPRNRange,
  exportJobApplicants,
  getDetailedStudentProfile,
  updateApplicationStatus,
  bulkUpdateApplicationStatus,
  updatePlacementDetails,
  createOrUpdateJobDrive,
  getJobDrive,
  notifyApplicationStatus,
  getJobPlacementStats,
  enhancedExportJobApplicants,
  getPlacementPosterStatsForCollege,
  generatePlacementPosterForCollege,
  generateMultiCollegePlacementPoster,
  manuallyAddStudentToJob,
  validateStudentForManualAddition,
} from '../controllers/superAdminControllerExtensions.js';
import {
  getAllCollegeBranches,
  updateCollegeBranches,
  getBranchTemplates,
  getAllBranches,
  updateBranchShortName,
} from '../controllers/collegeBranchController.js';
import {
  superAdminCreateOrUpdateJobRequirements,
  getJobRequirements,
  getAllCompanyTemplates,
} from '../controllers/jobRequirementsController.js';
import {
  downloadStudentStandardResumeSA,
  downloadStudentCustomResumeSA,
  getStudentResumeStatusSA,
} from '../controllers/resumeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes are protected and require super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Dashboard & Profile
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// PRN Management
router.get('/prn-ranges', getPRNRanges);
router.post('/prn-ranges', addPRNRange);
router.put('/prn-ranges/:id', updatePRNRange);
router.delete('/prn-ranges/:id', deletePRNRange);
router.get('/prn-ranges/:id/students', getStudentsByPRNRange);
router.get('/prn-ranges/:id/students/export', exportStudentsByPRNRange);

// Placement Officer Management
router.get('/placement-officers', getPlacementOfficers);
router.get('/placement-officers/history/:collegeId', getOfficerHistory);
router.post('/placement-officers', addPlacementOfficer);
router.put('/placement-officers/:id', updatePlacementOfficer);
router.put('/placement-officers/:id/reset-password', resetPlacementOfficerPassword);
router.delete('/placement-officers/:id', deletePlacementOfficer);
router.delete('/placement-officers/history/:collegeId', clearOfficerHistory);
// NOTE: Placement officer photo management removed - officers manage their own photos

// Job Management
// IMPORTANT: Specific routes must come BEFORE parameterized routes (:id, :jobId)
router.get('/jobs/deleted-history', getDeletedJobsHistory);
router.delete('/jobs/deleted-history', clearDeletedJobsHistory);
router.get('/jobs', getJobs);
router.post('/jobs', createJob);
router.get('/jobs/:jobId/applicants', getJobApplicants);
router.post('/jobs/:jobId/applicants/export', exportJobApplicants);
router.post('/jobs/:jobId/applicants/enhanced-export', enhancedExportJobApplicants);
router.get('/jobs/:jobId/placement-stats', getJobPlacementStats);
router.post('/jobs/:jobId/drive', createOrUpdateJobDrive);
router.get('/jobs/:jobId/drive', getJobDrive);
router.post('/jobs/:jobId/requirements', superAdminCreateOrUpdateJobRequirements);
router.put('/jobs/:jobId/requirements', superAdminCreateOrUpdateJobRequirements);
router.get('/jobs/:jobId/requirements', getJobRequirements);
router.put('/jobs/:id', updateJob);
router.put('/jobs/:id/toggle-status', toggleJobStatus);
router.delete('/jobs/:id', deleteJob);
router.delete('/jobs/:id/permanent', permanentlyDeleteJob);

// Job Requests Management
router.get('/jobs/pending-requests', getPendingJobRequests);
router.put('/jobs/requests/:id/approve', approveJobRequest);
router.put('/jobs/requests/:id/reject', rejectJobRequest);

// Whitelist Requests
router.get('/whitelist-requests', getWhitelistRequests);
router.put('/whitelist-requests/:id/approve', approveWhitelistRequest);
router.put('/whitelist-requests/:id/reject', rejectWhitelistRequest);

// Activity Logs
router.get('/activity-logs', getActivityLogs);

// Students
router.get('/students', getAllStudents);
router.get('/students/search/:prn', searchStudentByPRN);
router.get('/students/:studentId/detailed-profile', getDetailedStudentProfile);
// Student Resume Download Routes
router.get('/students/:studentId/resume/status', getStudentResumeStatusSA);
router.get('/students/:studentId/resume/standard', downloadStudentStandardResumeSA);
router.get('/students/:studentId/resume/custom', downloadStudentCustomResumeSA);
router.post('/students/custom-export', customExportStudents);
router.post('/students/enhanced-export', enhancedCustomExport);
router.post('/students/bulk-delete-photos', bulkDeleteStudentPhotos);
router.put('/students/:id/blacklist', blacklistStudent);
router.put('/students/:id/whitelist', whitelistStudent);
router.delete('/students/:id', deleteStudent);
router.get('/districts', getAvailableDistricts);

// Application Management
router.put('/applications/:applicationId/status', updateApplicationStatus);
router.post('/applications/bulk-update-status', bulkUpdateApplicationStatus);
router.put('/applications/:applicationId/placement', updatePlacementDetails);
router.post('/applications/notify', notifyApplicationStatus);

// Branches
router.get('/branches', getNormalizedBranches);
router.get('/colleges/:id/branches', getCollegeBranches);

// College Branch Management
router.get('/college-branches', getAllCollegeBranches);
router.put('/college-branches/:collegeId', updateCollegeBranches);
router.get('/branch-templates', getBranchTemplates);

// Branch Reference Management (with short names)
router.get('/branch-references', getAllBranches);
router.put('/branch-references/:branchId', updateBranchShortName);

// Super Admin Management
router.get('/admins', getSuperAdmins);
router.post('/admins', createSuperAdmin);
router.put('/admins/:id/deactivate', deactivateSuperAdmin);
router.put('/admins/:id/activate', activateSuperAdmin);
router.delete('/admins/:id', deleteSuperAdmin);

// Requirement Templates
router.get('/requirement-templates', getAllCompanyTemplates);

// Notification Management
router.get('/colleges-for-notifications', getCollegesForNotifications);
router.post('/branches-for-colleges', getBranchesForColleges);
router.post('/send-notification', sendNotification);

// Placement Poster Routes
router.get('/placement-poster/stats/:collegeId', getPlacementPosterStatsForCollege);
router.post('/placement-poster/generate/:collegeId', exportLimiter, generatePlacementPosterForCollege);
router.post('/placement-poster/generate-multi', exportLimiter, generateMultiCollegePlacementPoster);

// Manual Student Addition Routes
router.post('/manually-add-student-to-job', manuallyAddStudentToJob);
router.post('/validate-student-for-manual-addition', validateStudentForManualAddition);

// Admin Notifications (Auto-approved jobs, system alerts)
router.get('/admin-notifications', getAdminNotifications);
router.get('/admin-notifications/unread-count', getAdminNotificationUnreadCount);
router.put('/admin-notifications/mark-all-read', markAllAdminNotificationsRead);
router.put('/admin-notifications/:id/read', markAdminNotificationRead);

export default router;

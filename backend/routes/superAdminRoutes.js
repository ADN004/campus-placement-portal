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
  deletePlacementOfficer,
  clearOfficerHistory,
  createJob,
  getJobs,
  updateJob,
  deleteJob,
  getWhitelistRequests,
  approveWhitelistRequest,
  rejectWhitelistRequest,
  getActivityLogs,
  getAllStudents,
  deleteStudent,
  getJobApplicants,
  getPendingJobRequests,
  approveJobRequest,
  rejectJobRequest,
} from '../controllers/superAdminController.js';
import { protect, authorize } from '../middleware/auth.js';

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

// Placement Officer Management
router.get('/placement-officers', getPlacementOfficers);
router.get('/placement-officers/history/:collegeId', getOfficerHistory);
router.post('/placement-officers', addPlacementOfficer);
router.put('/placement-officers/:id', updatePlacementOfficer);
router.delete('/placement-officers/:id', deletePlacementOfficer);
router.delete('/placement-officers/history/:collegeId', clearOfficerHistory);

// Job Management
router.get('/jobs', getJobs);
router.get('/jobs/:jobId/applicants', getJobApplicants);
router.post('/jobs', createJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);

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
router.delete('/students/:id', deleteStudent);

export default router;

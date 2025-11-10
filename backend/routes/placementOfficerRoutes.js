import express from 'express';
import {
  getDashboard,
  getProfile,
  updateProfile,
  getStudents,
  approveStudent,
  rejectStudent,
  blacklistStudent,
  requestWhitelist,
  sendNotification,
  exportStudents,
  getJobs,
  createJobRequest,
  getJobRequests,
  getJobApplicants,
} from '../controllers/placementOfficerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require placement_officer role
router.use(protect);
router.use(authorize('placement_officer'));

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/students', getStudents);
router.get('/students/export', exportStudents);
router.put('/students/:id/approve', approveStudent);
router.put('/students/:id/reject', rejectStudent);
router.put('/students/:id/blacklist', blacklistStudent);
router.post('/students/:id/whitelist-request', requestWhitelist);
router.post('/send-notification', sendNotification);
router.get('/jobs', getJobs);
router.get('/jobs/:jobId/applicants', getJobApplicants);
router.post('/job-requests', createJobRequest);
router.get('/job-requests', getJobRequests);

export default router;

import express from 'express';
import {
  getDashboard,
  getProfile,
  updateProfile,
  getEligibleJobs,
  applyForJob,
  getMyApplications,
  getNotifications,
  markNotificationRead,
} from '../controllers/studentController.js';
import {
  resendVerificationEmail,
  getVerificationStatus,
} from '../controllers/studentControllerExtensions.js';
import { protect, authorize, checkStudentApproval } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require student role
router.use(protect);
router.use(authorize('student'));

// Routes accessible to all students (pending or approved)
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.post('/resend-verification', resendVerificationEmail);
router.get('/verification-status', getVerificationStatus);

// Routes that require approved status
router.get('/eligible-jobs', checkStudentApproval, getEligibleJobs);
router.post('/apply/:jobId', checkStudentApproval, applyForJob);
router.get('/my-applications', checkStudentApproval, getMyApplications);

export default router;

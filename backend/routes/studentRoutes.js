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
  getCgpaLockStatus,
  getBacklogLockStatus,
} from '../controllers/studentController.js';
import {
  resendVerificationEmail,
  getVerificationStatus,
} from '../controllers/studentControllerExtensions.js';
import {
  getStudentResume,
  updateStudentResume,
  downloadOwnResume,
} from '../controllers/resumeController.js';
import {
  reuploadStudentPhoto,
  resolveStudentCorrection,
  getCorrectionStatus,
} from '../controllers/correctionController.js';
import { protect, authorize, checkStudentApproval, blockPendingStudent } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require student role
router.use(protect);
router.use(authorize('student'));

// A student awaiting approval gets nothing from this router. Their only screen
// is the waiting page, which is served entirely by /auth/me. Reads included:
// there is no reason for them to pull notifications, dashboard figures or
// verification quota before an officer has accepted their registration.
router.use(blockPendingStudent);

// Routes accessible to approved (and blacklisted) students
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
// Approved-only. A pending student's record is what the officer is reviewing,
// and CGPA/backlog locks in updateProfile only engage once approved — so an
// unguarded write here would let a student change the numbers their approval
// is being judged on, and have the new values locked in on approval.
router.put('/profile', checkStudentApproval, updateProfile);

// Send-back-for-correction (student side)
router.get('/correction-status', getCorrectionStatus);
router.post('/photo', checkStudentApproval, reuploadStudentPhoto);
router.post('/correction/resolve', checkStudentApproval, resolveStudentCorrection);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.post('/resend-verification', resendVerificationEmail);
router.get('/verification-status', getVerificationStatus);
router.get('/cgpa-lock-status', getCgpaLockStatus);
router.get('/backlog-lock-status', getBacklogLockStatus);

// Resume Routes (accessible to all students)
router.get('/resume', getStudentResume);
router.put('/resume', checkStudentApproval, updateStudentResume);
router.get('/resume/download', downloadOwnResume);

// Routes that require approved status
router.get('/eligible-jobs', checkStudentApproval, getEligibleJobs);
router.post('/apply/:jobId', checkStudentApproval, applyForJob);
router.get('/my-applications', checkStudentApproval, getMyApplications);

export default router;

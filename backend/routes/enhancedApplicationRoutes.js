/**
 * Enhanced Application Routes
 *
 * Routes for the smart job application flow with requirement validation
 */

import express from 'express';
import { protect, authorize, checkStudentApproval } from '../middleware/auth.js';
import {
  checkApplicationReadiness,
  submitEnhancedApplication,
  getMissingFields,
  getPendingCustomAnswers,
  saveCustomAnswers
} from '../controllers/enhancedApplicationController.js';

const router = express.Router();

// All routes require authentication and an approved, non-blacklisted student.
// apply-enhanced is the endpoint that actually creates the application row, so
// the status gate belongs here — not only on the legacy /students/apply route.
router.use(protect);
router.use(authorize('student'));
router.use(checkStudentApproval);

/**
 * @route   POST /api/students/jobs/:jobId/check-readiness
 * @desc    Check if student is ready to apply for a job
 * @access  Private (Student)
 */
/*
 * Declared before the ':jobId' routes so it is matched as a literal. It is a
 * single segment and those are two, so nothing would capture it today — but the
 * next one-segment route added here would be a silent 'jobId' of
 * "pending-custom-answers".
 */
router.get('/pending-custom-answers', getPendingCustomAnswers);

router.post('/:jobId/check-readiness', checkApplicationReadiness);

/**
 * @route   GET /api/students/jobs/:jobId/missing-fields
 * @desc    Get missing fields required for job application
 * @access  Private (Student)
 */
router.get('/:jobId/missing-fields', getMissingFields);

/**
 * @route   POST /api/students/jobs/:jobId/apply-enhanced
 * @desc    Submit enhanced job application with all tiers of data
 * @access  Private (Student)
 */
router.post('/:jobId/apply-enhanced', submitEnhancedApplication);

/**
 * @route   PUT /api/students/jobs/:jobId/custom-answers
 * @desc    Record answers owed on an application already submitted
 * @access  Private (Student)
 */
router.put('/:jobId/custom-answers', saveCustomAnswers);

export default router;

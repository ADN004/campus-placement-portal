/**
 * Extended Profile Routes
 *
 * Routes for managing student extended profiles (Tier 2 data)
 */

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getExtendedProfile,
  updateAcademicExtended,
  updatePhysicalDetails,
  updateFamilyDetails,
  updatePersonalDetails,
  updateDocumentDetails,
  updateEducationPreferences,
  getProfileCompletion,
  checkJobEligibility
} from '../controllers/extendedProfileController.js';

const router = express.Router();

// All routes require authentication and student role
router.use(protect);
router.use(authorize('student'));

/**
 * @route   GET /api/students/extended-profile
 * @desc    Get student's extended profile
 * @access  Private (Student)
 */
router.get('/', getExtendedProfile);

/**
 * @route   GET /api/students/extended-profile/completion
 * @desc    Get profile completion status
 * @access  Private (Student)
 */
router.get('/completion', getProfileCompletion);

/**
 * @route   PUT /api/students/extended-profile/academic
 * @desc    Update academic extended section
 * @access  Private (Student)
 */
router.put('/academic', updateAcademicExtended);

/**
 * @route   PUT /api/students/extended-profile/physical
 * @desc    Update physical details section
 * @access  Private (Student)
 */
router.put('/physical', updatePhysicalDetails);

/**
 * @route   PUT /api/students/extended-profile/family
 * @desc    Update family details section
 * @access  Private (Student)
 */
router.put('/family', updateFamilyDetails);

/**
 * @route   PUT /api/students/extended-profile/personal
 * @desc    Update personal details section
 * @access  Private (Student)
 */
router.put('/personal', updatePersonalDetails);

/**
 * @route   PUT /api/students/extended-profile/documents
 * @desc    Update document verification section
 * @access  Private (Student)
 */
router.put('/documents', updateDocumentDetails);

/**
 * @route   PUT /api/students/extended-profile/education-preferences
 * @desc    Update education preferences section
 * @access  Private (Student)
 */
router.put('/education-preferences', updateEducationPreferences);

/**
 * @route   GET /api/students/extended-profile/check-eligibility/:jobId
 * @desc    Check if student is eligible for a specific job
 * @access  Private (Student)
 */
router.get('/check-eligibility/:jobId', checkJobEligibility);

export default router;

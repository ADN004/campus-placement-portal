/**
 * Job Requirements Routes
 *
 * Routes for managing job requirements and company templates
 */

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createOrUpdateJobRequirements,
  getJobRequirements,
  createCompanyTemplate,
  getAllCompanyTemplates,
  applyTemplateToJob,
  getEligibleStudentsCount,
  deleteCompanyTemplate,
  updateCompanyTemplate
} from '../controllers/jobRequirementsController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/jobs/:jobId/requirements
 * @desc    Get job requirements
 * @access  Private (All authenticated users)
 */
router.get('/:jobId/requirements', getJobRequirements);

/**
 * Super Admin Routes
 */

/**
 * @route   POST /api/super-admin/jobs/:jobId/requirements
 * @desc    Create or update job requirements
 * @access  Private (Super Admin)
 */
router.post(
  '/super-admin/jobs/:jobId/requirements',
  authorize('super_admin'),
  createOrUpdateJobRequirements
);

/**
 * @route   GET /api/super-admin/requirement-templates
 * @desc    Get all company requirement templates
 * @access  Private (Super Admin)
 */
router.get(
  '/super-admin/requirement-templates',
  authorize('super_admin'),
  getAllCompanyTemplates
);

/**
 * @route   POST /api/super-admin/requirement-templates
 * @desc    Create a company requirement template
 * @access  Private (Super Admin)
 */
router.post(
  '/super-admin/requirement-templates',
  authorize('super_admin'),
  createCompanyTemplate
);

/**
 * @route   PUT /api/super-admin/requirement-templates/:templateId
 * @desc    Update a company requirement template
 * @access  Private (Super Admin)
 */
router.put(
  '/super-admin/requirement-templates/:templateId',
  authorize('super_admin'),
  updateCompanyTemplate
);

/**
 * @route   DELETE /api/super-admin/requirement-templates/:templateId
 * @desc    Delete a company requirement template
 * @access  Private (Super Admin)
 */
router.delete(
  '/super-admin/requirement-templates/:templateId',
  authorize('super_admin'),
  deleteCompanyTemplate
);

export default router;

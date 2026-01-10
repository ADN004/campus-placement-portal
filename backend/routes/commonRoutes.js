import express from 'express';
import {
  getRegions,
  getColleges,
  getCollegeBranches,
  validatePRN,
  getJobDetails,
} from '../controllers/commonController.js';
import { getBranchMapping } from '../controllers/collegeBranchController.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/regions', getRegions);
router.get('/colleges', getColleges);
router.get('/colleges/:collegeId/branches', getCollegeBranches);
router.post('/validate-prn', validatePRN);
router.get('/jobs/:id', getJobDetails);
router.get('/branch-mapping', getBranchMapping);

export default router;

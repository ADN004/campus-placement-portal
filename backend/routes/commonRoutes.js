import express from 'express';
import {
  getRegions,
  getColleges,
  validatePRN,
  getJobDetails,
} from '../controllers/commonController.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/regions', getRegions);
router.get('/colleges', getColleges);
router.post('/validate-prn', validatePRN);
router.get('/jobs/:id', getJobDetails);

export default router;

import { query } from '../config/database.js';
import { getPortalCounts, getPortalSetting } from '../utils/portalMode.js';

// @desc    Portal mode info — lets the UI adapt to single-college deployments
// @route   GET /api/common/portal-info
// @access  Public
export const getPortalInfo = async (req, res) => {
  try {
    const counts = await getPortalCounts();
    const requireJobApproval =
      counts.active_colleges === 1 &&
      (await getPortalSetting('single_college_require_job_approval')) === true;

    res.status(200).json({
      success: true,
      data: {
        active_colleges: counts.active_colleges,
        regions: counts.regions,
        single_college: counts.active_colleges === 1,
        single_region: counts.regions === 1,
        single_college_require_job_approval: requireJobApproval,
        // OAuth client IDs are public identifiers (the secret never leaves
        // Google). null = "Choose Google Account" is hidden on registration.
        google_client_id: process.env.GOOGLE_CLIENT_ID || null,
      },
    });
  } catch (error) {
    console.error('Get portal info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching portal info',
    });
  }
};

// @desc    Get all regions
// @route   GET /api/common/regions
// @access  Public
export const getRegions = async (req, res) => {
  try {
    const regionsResult = await query(
      'SELECT * FROM regions ORDER BY region_name'
    );

    res.status(200).json({
      success: true,
      count: regionsResult.rows.length,
      data: regionsResult.rows,
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching regions',
      error: error.message,
    });
  }
};

// @desc    Get all colleges
// @route   GET /api/common/colleges
// @access  Public
export const getColleges = async (req, res) => {
  try {
    const { region_id } = req.query;

    let queryText = `
      SELECT c.*, r.region_name
      FROM colleges c
      JOIN regions r ON c.region_id = r.id
      WHERE c.is_active = TRUE
    `;
    const params = [];

    if (region_id) {
      queryText += ' AND c.region_id = $1';
      params.push(region_id);
    }

    queryText += ' ORDER BY c.college_name';

    const collegesResult = await query(queryText, params);

    res.status(200).json({
      success: true,
      count: collegesResult.rows.length,
      data: collegesResult.rows,
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges',
      error: error.message,
    });
  }
};

// @desc    Validate PRN before registration
// @route   POST /api/common/validate-prn
// @access  Public
export const validatePRN = async (req, res) => {
  try {
    // Trimmed exactly like registerStudent, so the live pre-check and the
    // actual registration always agree on the same PRN value
    const prn = typeof req.body.prn === 'string' ? req.body.prn.trim() : req.body.prn;

    if (!prn) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a PRN',
      });
    }

    // Check if PRN already exists. A rejected registration does NOT block
    // the PRN — re-registering replaces it (see registerStudent).
    const existingStudent = await query(
      'SELECT id, registration_status FROM students WHERE prn = $1',
      [prn]
    );

    let previousRejected = false;
    if (existingStudent.rows.length > 0) {
      if (existingStudent.rows[0].registration_status === 'rejected') {
        previousRejected = true;
      } else {
        return res.status(400).json({
          success: false,
          message: 'This PRN is already registered',
          valid: false,
        });
      }
    }

    // Get all active PRN ranges
    const rangesResult = await query(
      'SELECT range_start, range_end, single_prn FROM prn_ranges WHERE is_active = TRUE'
    );

    const ranges = rangesResult.rows;

    if (ranges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active PRN ranges found. Please contact administrator.',
        valid: false,
      });
    }

    const validResponse = {
      success: true,
      message: previousRejected
        ? 'PRN is valid — your previous registration was rejected, submitting again will replace it'
        : 'PRN is valid',
      valid: true,
      previous_rejected: previousRejected,
    };

    // Check single PRNs
    const singlePRNs = ranges.filter((r) => r.single_prn !== null);
    if (singlePRNs.some((r) => r.single_prn === prn)) {
      return res.status(200).json(validResponse);
    }

    // Check PRN ranges
    const rangesPRNs = ranges.filter((r) => r.range_start !== null);
    for (const range of rangesPRNs) {
      if (isPRNInRange(prn, range.range_start, range.range_end)) {
        return res.status(200).json(validResponse);
      }
    }

    return res.status(400).json({
      success: false,
      message: 'PRN is not in the valid range for registration',
      valid: false,
    });
  } catch (error) {
    console.error('Validate PRN error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating PRN',
      error: error.message,
    });
  }
};

// Helper function to check if PRN is in range
const isPRNInRange = (prn, start, end) => {
  // Handle numeric comparison
  if (!isNaN(prn) && !isNaN(start) && !isNaN(end)) {
    const prnNum = parseInt(prn);
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    return prnNum >= startNum && prnNum <= endNum;
  }

  // Handle string comparison
  return prn >= start && prn <= end;
};

// @desc    Get branches for a specific college
// @route   GET /api/common/colleges/:collegeId/branches
// @access  Public
export const getCollegeBranches = async (req, res) => {
  try {
    const { collegeId } = req.params;

    const collegeResult = await query(
      'SELECT id, college_name, branches FROM colleges WHERE id = $1 AND is_active = TRUE',
      [collegeId]
    );

    if (collegeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const college = collegeResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        college_id: college.id,
        college_name: college.college_name,
        branches: college.branches || [],
      },
    });
  } catch (error) {
    console.error('Get college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching college branches',
      error: error.message,
    });
  }
};

// @desc    Get job details
// @route   GET /api/common/jobs/:id
// @access  Public
export const getJobDetails = async (req, res) => {
  try {
    const jobId = req.params.id;

    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Get eligibility criteria
    const criteriaResult = await query(
      'SELECT * FROM job_eligibility_criteria WHERE job_id = $1',
      [jobId]
    );

    const job = jobResult.rows[0];
    job.eligibility_criteria = criteriaResult.rows;

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job details',
      error: error.message,
    });
  }
};

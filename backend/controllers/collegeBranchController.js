import { query } from '../config/database.js';
import { KERALA_POLYTECHNIC_BRANCHES, BRANCH_SHORT_NAMES, getBranchShortName } from '../constants/branches.js';

// ============================================
// SUPER ADMIN CONTROLLERS
// ============================================

// @desc    Get all colleges with their branches (Super Admin)
// @route   GET /api/super-admin/college-branches
// @access  Private - Super Admin only
export const getAllCollegeBranches = async (req, res) => {
  try {
    const { region_id } = req.query;

    let queryText = `
      SELECT
        c.id,
        c.college_name,
        c.college_code,
        c.branches,
        c.region_id,
        r.region_name,
        c.is_active
      FROM colleges c
      JOIN regions r ON c.region_id = r.id
    `;
    const params = [];

    if (region_id) {
      queryText += ' WHERE c.region_id = $1';
      params.push(region_id);
    }

    queryText += ' ORDER BY r.region_name, c.college_name';

    const result = await query(queryText, params);

    // Ensure branches is always an array
    const colleges = result.rows.map((college) => ({
      ...college,
      branches: college.branches || [],
    }));

    res.status(200).json({
      success: true,
      count: colleges.length,
      data: colleges,
    });
  } catch (error) {
    console.error('Get all college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching college branches',
      error: error.message,
    });
  }
};

// @desc    Update branches for a specific college (Super Admin)
// @route   PUT /api/super-admin/college-branches/:collegeId
// @access  Private - Super Admin only
export const updateCollegeBranches = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { branches } = req.body;

    // Validate input
    if (!Array.isArray(branches)) {
      return res.status(400).json({
        success: false,
        message: 'Branches must be an array',
      });
    }

    // Verify college exists
    const collegeCheck = await query('SELECT id, college_name FROM colleges WHERE id = $1', [
      collegeId,
    ]);

    if (collegeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    // Update branches
    const result = await query(
      'UPDATE colleges SET branches = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, college_name, branches',
      [JSON.stringify(branches), collegeId]
    );

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action_type, action_description, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'UPDATE_COLLEGE_BRANCHES',
        `Updated branches for college: ${collegeCheck.rows[0].college_name}`,
        'college',
        collegeId,
        JSON.stringify({
          college_name: collegeCheck.rows[0].college_name,
          branches_count: branches.length,
          updated_by: req.user.email,
        }),
      ]
    );

    res.status(200).json({
      success: true,
      message: 'College branches updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating college branches',
      error: error.message,
    });
  }
};

// @desc    Get available branch templates/options
// @route   GET /api/super-admin/branch-templates
// @access  Private - Super Admin only
export const getBranchTemplates = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: KERALA_POLYTECHNIC_BRANCHES,
    });
  } catch (error) {
    console.error('Get branch templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branch templates',
      error: error.message,
    });
  }
};

// @desc    Get all branches with their short names from database
// @route   GET /api/super-admin/branches
// @access  Private - Super Admin only
export const getAllBranches = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, branch_name, short_name, is_active, display_order
       FROM branches
       ORDER BY display_order, branch_name`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message,
    });
  }
};

// @desc    Update a branch short name
// @route   PUT /api/super-admin/branches/:branchId
// @access  Private - Super Admin only
export const updateBranchShortName = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { short_name } = req.body;

    // Validate input
    if (!short_name || short_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Short name is required',
      });
    }

    // Validate short name format (2-4 letters excluding brackets)
    const shortNameWithoutBrackets = short_name.replace(/\([^)]*\)/g, '');
    if (shortNameWithoutBrackets.length < 2 || shortNameWithoutBrackets.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Short name must be 2-4 letters (excluding brackets)',
      });
    }

    // Check if branch exists
    const branchCheck = await query(
      'SELECT id, branch_name, short_name FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Check if short name is already taken by another branch
    const duplicateCheck = await query(
      'SELECT id, branch_name FROM branches WHERE short_name = $1 AND id != $2',
      [short_name, branchId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Short name '${short_name}' is already used by ${duplicateCheck.rows[0].branch_name}`,
      });
    }

    const oldShortName = branchCheck.rows[0].short_name;

    // Update branch short name
    const result = await query(
      'UPDATE branches SET short_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [short_name, branchId]
    );

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action_type, action_description, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'UPDATE_BRANCH_SHORT_NAME',
        `Updated short name for branch: ${branchCheck.rows[0].branch_name}`,
        'branch',
        branchId,
        JSON.stringify({
          branch_name: branchCheck.rows[0].branch_name,
          old_short_name: oldShortName,
          new_short_name: short_name,
          updated_by: req.user.email,
        }),
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Branch short name updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update branch short name error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating branch short name',
      error: error.message,
    });
  }
};

// @desc    Get branch mapping (full name to short name)
// @route   GET /api/common/branch-mapping
// @access  Public or Private (available to all authenticated users)
export const getBranchMapping = async (req, res) => {
  try {
    const result = await query(
      `SELECT branch_name, short_name
       FROM branches
       WHERE is_active = TRUE
       ORDER BY branch_name`
    );

    // Convert to mapping object
    const mapping = {};
    result.rows.forEach((row) => {
      mapping[row.branch_name] = row.short_name;
    });

    res.status(200).json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error('Get branch mapping error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branch mapping',
      error: error.message,
    });
  }
};

// ============================================
// PLACEMENT OFFICER CONTROLLERS
// ============================================

// @desc    Get branches for officer's own college
// @route   GET /api/placement-officer/college-branches
// @access  Private - Placement Officer only
export const getOwnCollegeBranches = async (req, res) => {
  try {
    // Get officer's college
    const officerResult = await query(
      `SELECT po.college_id, c.college_name, c.branches
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1 AND po.is_active = TRUE`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const college = officerResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        college_id: college.college_id,
        college_name: college.college_name,
        branches: college.branches || [],
      },
    });
  } catch (error) {
    console.error('Get own college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching college branches',
      error: error.message,
    });
  }
};

// @desc    Update branches for officer's own college
// @route   PUT /api/placement-officer/college-branches
// @access  Private - Placement Officer only
export const updateOwnCollegeBranches = async (req, res) => {
  try {
    const { branches } = req.body;

    // Validate input
    if (!Array.isArray(branches)) {
      return res.status(400).json({
        success: false,
        message: 'Branches must be an array',
      });
    }

    // Get officer's college
    const officerResult = await query(
      `SELECT po.college_id, c.college_name
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1 AND po.is_active = TRUE`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;
    const collegeName = officerResult.rows[0].college_name;

    // Update branches
    const result = await query(
      'UPDATE colleges SET branches = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, college_name, branches',
      [JSON.stringify(branches), collegeId]
    );

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, action_type, action_description, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'UPDATE_OWN_COLLEGE_BRANCHES',
        `Placement Officer updated branches for their college: ${collegeName}`,
        'college',
        collegeId,
        JSON.stringify({
          college_name: collegeName,
          branches_count: branches.length,
          updated_by: req.user.email,
        }),
      ]
    );

    res.status(200).json({
      success: true,
      message: 'College branches updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update own college branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating college branches',
      error: error.message,
    });
  }
};

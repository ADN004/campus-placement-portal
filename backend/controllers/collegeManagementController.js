import { query } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

/**
 * College & Region Management Controller
 *
 * Super-admin CRUD for colleges and regions, so a deployment can be set up
 * entirely from the UI instead of editing database/seed-data.sql.
 *
 * Deletion safety: regions cascade-delete their colleges, and colleges
 * cascade-delete placement officers, PRN ranges and job requests. To avoid
 * accidental data loss, DELETE endpoints refuse to run while dependent
 * records exist and report the counts instead. Deactivation (is_active)
 * is the safe everyday alternative.
 */

// ========================================
// HELPERS
// ========================================

/**
 * Count records that depend on a college. Used to guard hard deletes
 * and to show usage info in the admin UI.
 */
const getCollegeDependencies = async (collegeId) => {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM students WHERE college_id = $1) AS students,
       (SELECT COUNT(*) FROM placement_officers WHERE college_id = $1) AS officers,
       (SELECT COUNT(*) FROM placement_officer_history WHERE college_id = $1) AS officer_history,
       (SELECT COUNT(*) FROM job_requests WHERE college_id = $1) AS job_requests,
       (SELECT COUNT(*) FROM prn_ranges WHERE college_id = $1) AS prn_ranges`,
    [collegeId]
  );

  const counts = result.rows[0];
  const total = Object.values(counts).reduce((sum, n) => sum + parseInt(n), 0);
  return { counts, total };
};

/**
 * Validate a branches value: must be an array of non-empty strings.
 * Returns the cleaned array, or null if invalid.
 */
const cleanBranches = (branches) => {
  if (branches === undefined || branches === null) return [];
  if (!Array.isArray(branches)) return null;
  const cleaned = branches
    .map((b) => (typeof b === 'string' ? b.trim() : ''))
    .filter((b) => b.length > 0);
  return cleaned;
};

// ========================================
// COLLEGES
// ========================================

// @desc    Get all colleges (including inactive) with usage counts
// @route   GET /api/super-admin/colleges
// @access  Private (Super Admin)
export const getAllCollegesAdmin = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         c.id, c.college_name, c.college_code, c.region_id, c.branches,
         c.sort_order, c.is_active, c.created_at, c.updated_at,
         r.region_name, r.region_code,
         (SELECT COUNT(*) FROM students s WHERE s.college_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM placement_officers po WHERE po.college_id = c.id AND po.is_active = TRUE) AS active_officer_count
       FROM colleges c
       JOIN regions r ON c.region_id = r.id
       ORDER BY r.region_name, c.sort_order, c.college_name`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all colleges (admin) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges',
    });
  }
};

// @desc    Create a college
// @route   POST /api/super-admin/colleges
// @access  Private (Super Admin)
export const createCollege = async (req, res) => {
  try {
    const { college_name, college_code, region_id, branches, sort_order } = req.body;

    const name = typeof college_name === 'string' ? college_name.trim() : '';
    const code = typeof college_code === 'string' ? college_code.trim().toUpperCase() : '';

    if (!name || !code || !region_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college name, college code and region',
      });
    }

    const cleanedBranches = cleanBranches(branches);
    if (cleanedBranches === null) {
      return res.status(400).json({
        success: false,
        message: 'Branches must be a list of branch names',
      });
    }

    const regionResult = await query('SELECT id FROM regions WHERE id = $1', [region_id]);
    if (regionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected region does not exist',
      });
    }

    const duplicate = await query(
      'SELECT id, college_name, college_code FROM colleges WHERE LOWER(college_name) = LOWER($1) OR LOWER(college_code) = LOWER($2)',
      [name, code]
    );
    if (duplicate.rows.length > 0) {
      const existing = duplicate.rows[0];
      const field =
        existing.college_code.toLowerCase() === code.toLowerCase() ? 'code' : 'name';
      return res.status(400).json({
        success: false,
        message: `A college with this ${field} already exists (${existing.college_name})`,
      });
    }

    const insertResult = await query(
      `INSERT INTO colleges (college_name, college_code, region_id, branches, sort_order)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING *`,
      [name, code, region_id, JSON.stringify(cleanedBranches), sort_order || 999]
    );

    const college = insertResult.rows[0];

    await logActivity(
      req.user.id,
      'CREATE_COLLEGE',
      `Created college: ${name} (${code})`,
      'college',
      college.id,
      req,
      { college_name: name, college_code: code, region_id }
    );

    res.status(201).json({
      success: true,
      message: 'College created successfully',
      data: college,
    });
  } catch (error) {
    console.error('Create college error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating college',
    });
  }
};

// @desc    Update a college (name, code, region, sort order)
// @route   PUT /api/super-admin/colleges/:id
// @access  Private (Super Admin)
export const updateCollege = async (req, res) => {
  try {
    const collegeId = req.params.id;
    const { college_name, college_code, region_id, sort_order } = req.body;

    const existingResult = await query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }
    const existing = existingResult.rows[0];

    const name =
      typeof college_name === 'string' && college_name.trim()
        ? college_name.trim()
        : existing.college_name;
    const code =
      typeof college_code === 'string' && college_code.trim()
        ? college_code.trim().toUpperCase()
        : existing.college_code;
    const newRegionId = region_id || existing.region_id;
    const newSortOrder =
      sort_order === undefined || sort_order === null ? existing.sort_order : sort_order;

    const regionResult = await query('SELECT id FROM regions WHERE id = $1', [newRegionId]);
    if (regionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected region does not exist',
      });
    }

    const duplicate = await query(
      `SELECT id, college_name, college_code FROM colleges
       WHERE (LOWER(college_name) = LOWER($1) OR LOWER(college_code) = LOWER($2)) AND id != $3`,
      [name, code, collegeId]
    );
    if (duplicate.rows.length > 0) {
      const conflicting = duplicate.rows[0];
      const field =
        conflicting.college_code.toLowerCase() === code.toLowerCase() ? 'code' : 'name';
      return res.status(400).json({
        success: false,
        message: `Another college already uses this ${field} (${conflicting.college_name})`,
      });
    }

    const updateResult = await query(
      `UPDATE colleges
       SET college_name = $1, college_code = $2, region_id = $3, sort_order = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, code, newRegionId, newSortOrder, collegeId]
    );

    await logActivity(
      req.user.id,
      'UPDATE_COLLEGE',
      `Updated college: ${name} (${code})`,
      'college',
      parseInt(collegeId),
      req,
      {
        previous: {
          college_name: existing.college_name,
          college_code: existing.college_code,
          region_id: existing.region_id,
          sort_order: existing.sort_order,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'College updated successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update college error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating college',
    });
  }
};

// @desc    Activate / deactivate a college
// @route   PUT /api/super-admin/colleges/:id/toggle-active
// @access  Private (Super Admin)
export const toggleCollegeActive = async (req, res) => {
  try {
    const collegeId = req.params.id;

    const existingResult = await query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const newStatus = !existingResult.rows[0].is_active;
    const updateResult = await query(
      `UPDATE colleges SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [newStatus, collegeId]
    );

    await logActivity(
      req.user.id,
      newStatus ? 'ACTIVATE_COLLEGE' : 'DEACTIVATE_COLLEGE',
      `${newStatus ? 'Activated' : 'Deactivated'} college: ${existingResult.rows[0].college_name}`,
      'college',
      parseInt(collegeId),
      req,
      {}
    );

    res.status(200).json({
      success: true,
      message: `College ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Toggle college active error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating college status',
    });
  }
};

// @desc    Delete a college (only when nothing depends on it)
// @route   DELETE /api/super-admin/colleges/:id
// @access  Private (Super Admin)
export const deleteCollege = async (req, res) => {
  try {
    const collegeId = req.params.id;

    const existingResult = await query('SELECT * FROM colleges WHERE id = $1', [collegeId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }
    const college = existingResult.rows[0];

    const { counts, total } = await getCollegeDependencies(collegeId);
    if (total > 0) {
      return res.status(409).json({
        success: false,
        message:
          'This college has linked records and cannot be deleted. Deactivate it instead.',
        data: { dependencies: counts },
      });
    }

    await query('DELETE FROM colleges WHERE id = $1', [collegeId]);

    await logActivity(
      req.user.id,
      'DELETE_COLLEGE',
      `Deleted college: ${college.college_name} (${college.college_code})`,
      'college',
      parseInt(collegeId),
      req,
      { college_name: college.college_name, college_code: college.college_code }
    );

    res.status(200).json({
      success: true,
      message: 'College deleted successfully',
    });
  } catch (error) {
    console.error('Delete college error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting college',
    });
  }
};

// ========================================
// REGIONS
// ========================================

// @desc    Get all regions with college counts
// @route   GET /api/super-admin/regions
// @access  Private (Super Admin)
export const getAllRegionsAdmin = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM colleges c WHERE c.region_id = r.id) AS college_count,
              (SELECT COUNT(*) FROM students s WHERE s.region_id = r.id) AS student_count
       FROM regions r
       ORDER BY r.region_name`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all regions (admin) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching regions',
    });
  }
};

// @desc    Create a region
// @route   POST /api/super-admin/regions
// @access  Private (Super Admin)
export const createRegion = async (req, res) => {
  try {
    const { region_name, region_code } = req.body;

    const name = typeof region_name === 'string' ? region_name.trim() : '';
    const code = typeof region_code === 'string' ? region_code.trim().toUpperCase() : '';

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide region name and region code',
      });
    }

    const duplicate = await query(
      'SELECT id FROM regions WHERE LOWER(region_name) = LOWER($1) OR LOWER(region_code) = LOWER($2)',
      [name, code]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A region with this name or code already exists',
      });
    }

    const insertResult = await query(
      'INSERT INTO regions (region_name, region_code) VALUES ($1, $2) RETURNING *',
      [name, code]
    );

    await logActivity(
      req.user.id,
      'CREATE_REGION',
      `Created region: ${name} (${code})`,
      'region',
      insertResult.rows[0].id,
      req,
      { region_name: name, region_code: code }
    );

    res.status(201).json({
      success: true,
      message: 'Region created successfully',
      data: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Create region error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating region',
    });
  }
};

// @desc    Update a region
// @route   PUT /api/super-admin/regions/:id
// @access  Private (Super Admin)
export const updateRegion = async (req, res) => {
  try {
    const regionId = req.params.id;
    const { region_name, region_code } = req.body;

    const existingResult = await query('SELECT * FROM regions WHERE id = $1', [regionId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Region not found',
      });
    }
    const existing = existingResult.rows[0];

    const name =
      typeof region_name === 'string' && region_name.trim()
        ? region_name.trim()
        : existing.region_name;
    const code =
      typeof region_code === 'string' && region_code.trim()
        ? region_code.trim().toUpperCase()
        : existing.region_code;

    const duplicate = await query(
      `SELECT id FROM regions
       WHERE (LOWER(region_name) = LOWER($1) OR LOWER(region_code) = LOWER($2)) AND id != $3`,
      [name, code, regionId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another region already uses this name or code',
      });
    }

    const updateResult = await query(
      `UPDATE regions SET region_name = $1, region_code = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [name, code, regionId]
    );

    await logActivity(
      req.user.id,
      'UPDATE_REGION',
      `Updated region: ${name} (${code})`,
      'region',
      parseInt(regionId),
      req,
      { previous: { region_name: existing.region_name, region_code: existing.region_code } }
    );

    res.status(200).json({
      success: true,
      message: 'Region updated successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update region error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating region',
    });
  }
};

// @desc    Delete a region (only when no colleges or students reference it)
// @route   DELETE /api/super-admin/regions/:id
// @access  Private (Super Admin)
export const deleteRegion = async (req, res) => {
  try {
    const regionId = req.params.id;

    const existingResult = await query('SELECT * FROM regions WHERE id = $1', [regionId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Region not found',
      });
    }
    const region = existingResult.rows[0];

    const usage = await query(
      `SELECT
         (SELECT COUNT(*) FROM colleges WHERE region_id = $1) AS colleges,
         (SELECT COUNT(*) FROM students WHERE region_id = $1) AS students`,
      [regionId]
    );
    const counts = usage.rows[0];
    if (parseInt(counts.colleges) > 0 || parseInt(counts.students) > 0) {
      return res.status(409).json({
        success: false,
        message:
          'This region has colleges or students linked to it and cannot be deleted.',
        data: { dependencies: counts },
      });
    }

    await query('DELETE FROM regions WHERE id = $1', [regionId]);

    await logActivity(
      req.user.id,
      'DELETE_REGION',
      `Deleted region: ${region.region_name} (${region.region_code})`,
      'region',
      parseInt(regionId),
      req,
      { region_name: region.region_name, region_code: region.region_code }
    );

    res.status(200).json({
      success: true,
      message: 'Region deleted successfully',
    });
  } catch (error) {
    console.error('Delete region error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting region',
    });
  }
};

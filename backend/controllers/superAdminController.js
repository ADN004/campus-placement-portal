import bcrypt from 'bcrypt';
import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

// ========================================
// PRN MANAGEMENT
// ========================================

// @desc    Get all PRN ranges
// @route   GET /api/super-admin/prn-ranges
// @access  Private (Super Admin)
export const getPRNRanges = async (req, res) => {
  try {
    const rangesResult = await query(
      `SELECT pr.*, u.email as added_by_email
       FROM prn_ranges pr
       LEFT JOIN users u ON pr.added_by = u.id
       ORDER BY pr.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: rangesResult.rows.length,
      data: rangesResult.rows,
    });
  } catch (error) {
    console.error('Get PRN ranges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PRN ranges',
      error: error.message,
    });
  }
};

// @desc    Add PRN range or single PRN
// @route   POST /api/super-admin/prn-ranges
// @access  Private (Super Admin)
export const addPRNRange = async (req, res) => {
  try {
    const { range_start, range_end, single_prn, description } = req.body;

    // Validate input
    if ((!range_start || !range_end) && !single_prn) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a range (start and end) or a single PRN',
      });
    }

    if ((range_start || range_end) && single_prn) {
      return res.status(400).json({
        success: false,
        message: 'Cannot provide both range and single PRN',
      });
    }

    const result = await query(
      `INSERT INTO prn_ranges (range_start, range_end, single_prn, description, added_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [range_start || null, range_end || null, single_prn || null, description, req.user.id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'ADD_PRN_RANGE',
      single_prn
        ? `Added single PRN: ${single_prn}`
        : `Added PRN range: ${range_start}-${range_end}`,
      'prn_range',
      result.rows[0].id,
      { range_start, range_end, single_prn },
      req
    );

    res.status(201).json({
      success: true,
      message: 'PRN range added successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding PRN range',
      error: error.message,
    });
  }
};

// @desc    Update PRN range
// @route   PUT /api/super-admin/prn-ranges/:id
// @access  Private (Super Admin)
export const updatePRNRange = async (req, res) => {
  try {
    const { is_active, description } = req.body;
    const rangeId = req.params.id;

    const result = await query(
      `UPDATE prn_ranges
       SET is_active = COALESCE($1, is_active),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [is_active, description, rangeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PRN_RANGE',
      `Updated PRN range ID: ${rangeId}`,
      'prn_range',
      rangeId,
      { is_active, description },
      req
    );

    res.status(200).json({
      success: true,
      message: 'PRN range updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PRN range',
      error: error.message,
    });
  }
};

// @desc    Delete PRN range
// @route   DELETE /api/super-admin/prn-ranges/:id
// @access  Private (Super Admin)
export const deletePRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    const result = await query('DELETE FROM prn_ranges WHERE id = $1 RETURNING *', [
      rangeId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_PRN_RANGE',
      `Deleted PRN range ID: ${rangeId}`,
      'prn_range',
      rangeId,
      result.rows[0],
      req
    );

    res.status(200).json({
      success: true,
      message: 'PRN range deleted successfully',
    });
  } catch (error) {
    console.error('Delete PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PRN range',
      error: error.message,
    });
  }
};

// ========================================
// PLACEMENT OFFICER MANAGEMENT
// ========================================

// @desc    Get all placement officers
// @route   GET /api/super-admin/placement-officers
// @access  Private (Super Admin)
export const getPlacementOfficers = async (req, res) => {
  try {
    const officersResult = await query(
      `SELECT po.*, c.college_name, r.id as region_id, r.region_name, u.email,
              appointed_by_user.email as appointed_by_email
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       JOIN users u ON po.user_id = u.id
       LEFT JOIN users appointed_by_user ON po.appointed_by = appointed_by_user.id
       ORDER BY c.college_name`
    );

    res.status(200).json({
      success: true,
      count: officersResult.rows.length,
      data: officersResult.rows,
    });
  } catch (error) {
    console.error('Get placement officers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching placement officers',
      error: error.message,
    });
  }
};

// @desc    Get placement officer history for a college
// @route   GET /api/super-admin/placement-officers/history/:collegeId
// @access  Private (Super Admin)
export const getOfficerHistory = async (req, res) => {
  try {
    const collegeId = req.params.collegeId;

    const historyResult = await query(
      `SELECT poh.*, removed_by_user.email as removed_by_email
       FROM placement_officer_history poh
       LEFT JOIN users removed_by_user ON poh.removed_by = removed_by_user.id
       WHERE poh.college_id = $1
       ORDER BY poh.removed_date DESC`,
      [collegeId]
    );

    res.status(200).json({
      success: true,
      count: historyResult.rows.length,
      data: historyResult.rows,
    });
  } catch (error) {
    console.error('Get officer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching officer history',
      error: error.message,
    });
  }
};

// @desc    Add/Change placement officer for a college
// @route   POST /api/super-admin/placement-officers
// @access  Private (Super Admin)
export const addPlacementOfficer = async (req, res) => {
  try {
    const { college_id, officer_name, phone_number, designation, officer_email, college_email } =
      req.body;

    // Validation
    if (!college_id || !officer_name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide college, officer name, and phone number',
      });
    }

    await transaction(async (client) => {
      // Check if college already has an active officer
      const existingOfficerResult = await client.query(
        'SELECT * FROM placement_officers WHERE college_id = $1 AND is_active = TRUE',
        [college_id]
      );

      if (existingOfficerResult.rows.length > 0) {
        // Move existing officer to history
        const existingOfficer = existingOfficerResult.rows[0];

        await client.query(
          `INSERT INTO placement_officer_history
           (college_id, officer_name, phone_number, designation, officer_email, appointed_date, removed_by, removal_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            existingOfficer.college_id,
            existingOfficer.officer_name,
            existingOfficer.phone_number,
            existingOfficer.designation,
            existingOfficer.officer_email,
            existingOfficer.appointed_date,
            req.user.id,
            'Replaced by new officer',
          ]
        );

        // Deactivate old officer
        await client.query(
          'UPDATE placement_officers SET is_active = FALSE WHERE id = $1',
          [existingOfficer.id]
        );

        // Deactivate old user account
        await client.query('UPDATE users SET is_active = FALSE WHERE id = $1', [
          existingOfficer.user_id,
        ]);
      }

      // Hash default password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);

      // Create new user account
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'placement_officer')
         RETURNING id`,
        [phone_number, hashedPassword]
      );

      const userId = userResult.rows[0].id;

      // Create new placement officer
      await client.query(
        `INSERT INTO placement_officers
         (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email, appointed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, college_id, officer_name, phone_number, designation, officer_email, college_email, req.user.id]
      );
    });

    // Log activity
    await logActivity(
      req.user.id,
      'ADD_PLACEMENT_OFFICER',
      `Added placement officer ${officer_name} for college ID ${college_id}`,
      'placement_officer',
      null,
      { college_id, officer_name, phone_number },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Placement officer added successfully',
    });
  } catch (error) {
    console.error('Add placement officer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding placement officer',
      error: error.message,
    });
  }
};

// @desc    Update placement officer phone number
// @route   PUT /api/super-admin/placement-officers/:id
// @access  Private (Super Admin)
export const updatePlacementOfficer = async (req, res) => {
  try {
    const officerId = req.params.id;
    const { phone_number, designation, officer_email } = req.body;

    const result = await query(
      `UPDATE placement_officers
       SET phone_number = COALESCE($1, phone_number),
           designation = COALESCE($2, designation),
           officer_email = COALESCE($3, officer_email)
       WHERE id = $4
       RETURNING *`,
      [phone_number, designation, officer_email, officerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PLACEMENT_OFFICER',
      `Updated placement officer ID: ${officerId}`,
      'placement_officer',
      officerId,
      { phone_number, designation, officer_email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Placement officer updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update placement officer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating placement officer',
      error: error.message,
    });
  }
};

// @desc    Remove/Deactivate placement officer
// @route   DELETE /api/super-admin/placement-officers/:id
// @access  Private (Super Admin)
export const deletePlacementOfficer = async (req, res) => {
  try {
    const officerId = req.params.id;

    await transaction(async (client) => {
      // Get officer details before deletion
      const officerResult = await client.query(
        'SELECT * FROM placement_officers WHERE id = $1',
        [officerId]
      );

      if (officerResult.rows.length === 0) {
        throw new Error('Placement officer not found');
      }

      const officer = officerResult.rows[0];

      // Move to history
      await client.query(
        `INSERT INTO placement_officer_history
         (college_id, officer_name, phone_number, designation, officer_email, appointed_date, removed_by, removal_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          officer.college_id,
          officer.officer_name,
          officer.phone_number,
          officer.designation,
          officer.officer_email,
          officer.appointed_date,
          req.user.id,
          'Manually removed by super admin',
        ]
      );

      // Deactivate officer
      await client.query(
        'UPDATE placement_officers SET is_active = FALSE WHERE id = $1',
        [officerId]
      );

      // Deactivate user account
      await client.query(
        'UPDATE users SET is_active = FALSE WHERE id = $1',
        [officer.user_id]
      );

      // Log activity
      await logActivity(
        req.user.id,
        'DELETE_PLACEMENT_OFFICER',
        `Removed placement officer ${officer.officer_name} (ID: ${officerId})`,
        'placement_officer',
        officerId,
        { officer_name: officer.officer_name, college_id: officer.college_id },
        req
      );
    });

    res.status(200).json({
      success: true,
      message: 'Placement officer removed successfully',
    });
  } catch (error) {
    console.error('Delete placement officer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing placement officer',
    });
  }
};

// @desc    Clear officer history for a college
// @route   DELETE /api/super-admin/placement-officers/history/:collegeId
// @access  Private (Super Admin)
export const clearOfficerHistory = async (req, res) => {
  try {
    const collegeId = req.params.collegeId;

    const result = await query(
      'DELETE FROM placement_officer_history WHERE college_id = $1',
      [collegeId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'CLEAR_OFFICER_HISTORY',
      `Cleared officer history for college ID: ${collegeId}`,
      'placement_officer_history',
      null,
      { college_id: collegeId, deleted_count: result.rowCount },
      req
    );

    res.status(200).json({
      success: true,
      message: `Successfully cleared ${result.rowCount} history record(s)`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error('Clear officer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing officer history',
      error: error.message,
    });
  }
};

// ========================================
// JOB MANAGEMENT
// ========================================

// @desc    Create job posting
// @route   POST /api/super-admin/jobs
// @access  Private (Super Admin)
export const createJob = async (req, res) => {
  try {
    const {
      title,
      company_name,
      description,
      location,
      job_type,
      salary_package,
      application_form_url,
      application_deadline,
      min_cgpa,
      max_backlogs,
      allowed_branches,
      target_type,
      target_regions,
      target_colleges,
    } = req.body;

    // Validation
    if (
      !title ||
      !company_name ||
      !description ||
      !application_form_url ||
      !application_deadline
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const result = await transaction(async (client) => {
      // Create job
      const jobResult = await client.query(
        `INSERT INTO jobs
         (job_title, company_name, job_description, job_location, job_type, salary_package,
          application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs, allowed_branches,
          target_type, target_regions, target_colleges, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11, $12, $13, $14, $15, TRUE)
         RETURNING *`,
        [
          title,
          company_name,
          description,
          location || null,
          job_type || 'Full-time',
          salary_package || null,
          application_form_url,
          application_deadline,
          min_cgpa || null,
          max_backlogs !== undefined && max_backlogs !== '' ? max_backlogs : null,
          allowed_branches ? (typeof allowed_branches === 'string' ? allowed_branches : JSON.stringify(allowed_branches)) : null,
          target_type || 'all',
          target_regions ? (typeof target_regions === 'string' ? target_regions : JSON.stringify(target_regions)) : null,
          target_colleges ? (typeof target_colleges === 'string' ? target_colleges : JSON.stringify(target_colleges)) : null,
          req.user.id,
        ]
      );

      return jobResult.rows[0];
    });

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE_JOB',
      `Created job posting: ${title} at ${company_name}`,
      'job',
      result.id,
      { title, company_name },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message,
    });
  }
};

// @desc    Get all jobs
// @route   GET /api/super-admin/jobs
// @access  Private (Super Admin)
export const getJobs = async (req, res) => {
  try {
    const jobsResult = await query(
      `SELECT j.*, u.email as created_by_email,
              COUNT(DISTINCT ja.id) as applications_count
       FROM jobs j
       LEFT JOIN users u ON j.created_by = u.id
       LEFT JOIN job_applications ja ON j.id = ja.job_id
       GROUP BY j.id, u.email
       ORDER BY j.created_at DESC`
    );

    // Map field names and parse JSONB fields to arrays
    const jobs = jobsResult.rows.map((job) => ({
      ...job,
      // Map database field names to frontend expected names
      title: job.job_title,
      description: job.job_description,
      location: job.job_location,
      // Parse JSONB fields to arrays
      allowed_branches: job.allowed_branches
        ? (typeof job.allowed_branches === 'string' ? JSON.parse(job.allowed_branches) : job.allowed_branches)
        : [],
      target_regions: job.target_regions
        ? (typeof job.target_regions === 'string' ? JSON.parse(job.target_regions) : job.target_regions)
        : [],
      target_colleges: job.target_colleges
        ? (typeof job.target_colleges === 'string' ? JSON.parse(job.target_colleges) : job.target_colleges)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message,
    });
  }
};

// @desc    Update job
// @route   PUT /api/super-admin/jobs/:id
// @access  Private (Super Admin)
export const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      title,
      company_name,
      description,
      location,
      job_type,
      salary_package,
      application_form_url,
      application_deadline,
      min_cgpa,
      max_backlogs,
      allowed_branches,
      target_type,
      target_regions,
      target_colleges,
      is_active,
    } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`job_title = $${paramCount++}`);
      values.push(title);
    }
    if (company_name !== undefined) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(company_name);
    }
    if (description !== undefined) {
      updates.push(`job_description = $${paramCount++}`);
      values.push(description);
    }
    if (location !== undefined) {
      updates.push(`job_location = $${paramCount++}`);
      values.push(location);
    }
    if (job_type !== undefined) {
      updates.push(`job_type = $${paramCount++}`);
      values.push(job_type);
    }
    if (salary_package !== undefined) {
      updates.push(`salary_package = $${paramCount++}`);
      values.push(salary_package);
    }
    if (application_form_url !== undefined) {
      updates.push(`application_form_url = $${paramCount++}`);
      values.push(application_form_url);
    }
    if (application_deadline !== undefined) {
      updates.push(`application_deadline = $${paramCount++}`);
      values.push(application_deadline);
    }
    if (min_cgpa !== undefined) {
      updates.push(`min_cgpa = $${paramCount++}`);
      values.push(min_cgpa || null);
    }
    if (max_backlogs !== undefined) {
      updates.push(`max_backlogs = $${paramCount++}`);
      values.push(max_backlogs !== '' ? max_backlogs : null);
    }
    if (allowed_branches !== undefined) {
      updates.push(`allowed_branches = $${paramCount++}`);
      values.push(allowed_branches ? (typeof allowed_branches === 'string' ? allowed_branches : JSON.stringify(allowed_branches)) : null);
    }
    if (target_type !== undefined) {
      updates.push(`target_type = $${paramCount++}`);
      values.push(target_type);
    }
    if (target_regions !== undefined) {
      updates.push(`target_regions = $${paramCount++}`);
      values.push(target_regions ? (typeof target_regions === 'string' ? target_regions : JSON.stringify(target_regions)) : null);
    }
    if (target_colleges !== undefined) {
      updates.push(`target_colleges = $${paramCount++}`);
      values.push(target_colleges ? (typeof target_colleges === 'string' ? target_colleges : JSON.stringify(target_colleges)) : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    values.push(jobId);
    const result = await query(
      `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Convert JSONB fields to strings for response
    const updatedJob = {
      ...result.rows[0],
      allowed_branches: result.rows[0].allowed_branches ? (typeof result.rows[0].allowed_branches === 'string' ? result.rows[0].allowed_branches : JSON.stringify(result.rows[0].allowed_branches)) : null,
      target_regions: result.rows[0].target_regions ? (typeof result.rows[0].target_regions === 'string' ? result.rows[0].target_regions : JSON.stringify(result.rows[0].target_regions)) : null,
      target_colleges: result.rows[0].target_colleges ? (typeof result.rows[0].target_colleges === 'string' ? result.rows[0].target_colleges : JSON.stringify(result.rows[0].target_colleges)) : null,
    };

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_JOB',
      `Updated job: ${updatedJob.job_title} at ${updatedJob.company_name}`,
      'job',
      jobId,
      req.body,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob,
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message,
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/super-admin/jobs/:id
// @access  Private (Super Admin)
export const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    // Get job details before deletion for activity log
    const jobResult = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobResult.rows[0];

    // Delete the job
    await query('DELETE FROM jobs WHERE id = $1', [jobId]);

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_JOB',
      `Deleted job: ${job.job_title} at ${job.company_name}`,
      'job',
      jobId,
      null,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message,
    });
  }
};

// ========================================
// WHITELIST REQUESTS
// ========================================

// @desc    Get all whitelist requests
// @route   GET /api/super-admin/whitelist-requests
// @access  Private (Super Admin)
export const getWhitelistRequests = async (req, res) => {
  try {
    const requestsResult = await query(
      `SELECT wr.*, s.prn, s.email as student_email, c.college_name,
              po.officer_name, po.phone_number as officer_phone
       FROM whitelist_requests wr
       JOIN students s ON wr.student_id = s.id
       JOIN colleges c ON s.college_id = c.id
       JOIN placement_officers po ON wr.requested_by = po.user_id
       ORDER BY wr.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: requestsResult.rows.length,
      data: requestsResult.rows,
    });
  } catch (error) {
    console.error('Get whitelist requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching whitelist requests',
      error: error.message,
    });
  }
};

// @desc    Approve whitelist request
// @route   PUT /api/super-admin/whitelist-requests/:id/approve
// @access  Private (Super Admin)
export const approveWhitelistRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { review_comment } = req.body;

    await transaction(async (client) => {
      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM whitelist_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Whitelist request not found');
      }

      const request = requestResult.rows[0];

      // Update request status
      await client.query(
        `UPDATE whitelist_requests
         SET status = 'approved', reviewed_by = $1, review_comment = $2, reviewed_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [req.user.id, review_comment, requestId]
      );

      // Remove blacklist from student
      await client.query(
        `UPDATE students
         SET is_blacklisted = FALSE, blacklist_reason = NULL
         WHERE id = $1`,
        [request.student_id]
      );
    });

    // Log activity
    await logActivity(
      req.user.id,
      'APPROVE_WHITELIST',
      `Approved whitelist request ID: ${requestId}`,
      'whitelist_request',
      requestId,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Whitelist request approved successfully',
    });
  } catch (error) {
    console.error('Approve whitelist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving whitelist request',
      error: error.message,
    });
  }
};

// @desc    Reject whitelist request
// @route   PUT /api/super-admin/whitelist-requests/:id/reject
// @access  Private (Super Admin)
export const rejectWhitelistRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { review_comment } = req.body;

    await query(
      `UPDATE whitelist_requests
       SET status = 'rejected', reviewed_by = $1, review_comment = $2, reviewed_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [req.user.id, review_comment, requestId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'REJECT_WHITELIST',
      `Rejected whitelist request ID: ${requestId}`,
      'whitelist_request',
      requestId,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Whitelist request rejected successfully',
    });
  } catch (error) {
    console.error('Reject whitelist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting whitelist request',
      error: error.message,
    });
  }
};

// ========================================
// ACTIVITY LOGS
// ========================================

// @desc    Get activity logs
// @route   GET /api/super-admin/activity-logs
// @access  Private (Super Admin)
export const getActivityLogs = async (req, res) => {
  try {
    const {
      limit = 50,
      page = 1,
      user_id,
      action_type,
      user_role,
      search,
      date_from,
      date_to,
      export: exportCsv
    } = req.query;

    // Parse limit and page as integers
    const limitInt = parseInt(limit) || 50;
    const pageInt = parseInt(page) || 1;

    let queryText = `
      SELECT al.*, u.email as user_email, u.role as user_role,
             COALESCE(po.officer_name, s.name, u.email) as user_name
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN placement_officers po ON u.id = po.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filter by user_id
    if (user_id) {
      paramCount++;
      queryText += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
    }

    // Filter by action_type
    if (action_type) {
      paramCount++;
      queryText += ` AND al.action_type = $${paramCount}`;
      params.push(action_type);
    }

    // Filter by user_role (convert display name to database value)
    if (user_role) {
      paramCount++;
      queryText += ` AND u.role = $${paramCount}`;
      const roleMap = {
        'Super Admin': 'super_admin',
        'Placement Officer': 'placement_officer',
        'Student': 'student'
      };
      params.push(roleMap[user_role] || user_role);
    }

    // Filter by search (email or description)
    if (search) {
      paramCount++;
      queryText += ` AND (u.email ILIKE $${paramCount} OR al.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Filter by date_from
    if (date_from) {
      paramCount++;
      queryText += ` AND al.created_at >= $${paramCount}`;
      params.push(date_from);
    }

    // Filter by date_to
    if (date_to) {
      paramCount++;
      queryText += ` AND al.created_at <= $${paramCount}::date + interval '1 day'`;
      params.push(date_to);
    }

    // If CSV export is requested
    if (exportCsv === 'csv') {
      queryText += ` ORDER BY al.created_at DESC`;
      const logsResult = await query(queryText, params);

      // Generate CSV
      const csvRows = [];
      csvRows.push(['Timestamp', 'User Email', 'User Role', 'Action Type', 'Description', 'Target Type', 'Target ID'].join(','));

      logsResult.rows.forEach(log => {
        csvRows.push([
          log.created_at,
          log.user_email || '',
          log.user_role || '',
          log.action_type || '',
          `"${(log.description || '').replace(/"/g, '""')}"`,
          log.target_type || '',
          log.target_id || ''
        ].join(','));
      });

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
      return res.send(csv);
    }

    // Count total for pagination - rebuild query instead of replace
    let countQueryText = `
      SELECT COUNT(*) as total
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN placement_officers po ON u.id = po.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE 1=1
    `;

    // Apply same filters
    let countParamNum = 0;
    if (user_id) {
      countParamNum++;
      countQueryText += ` AND al.user_id = $${countParamNum}`;
    }
    if (action_type) {
      countParamNum++;
      countQueryText += ` AND al.action_type = $${countParamNum}`;
    }
    if (user_role) {
      countParamNum++;
      countQueryText += ` AND u.role = $${countParamNum}`;
    }
    if (search) {
      countParamNum++;
      countQueryText += ` AND (u.email ILIKE $${countParamNum} OR al.description ILIKE $${countParamNum})`;
    }
    if (date_from) {
      countParamNum++;
      countQueryText += ` AND al.created_at >= $${countParamNum}`;
    }
    if (date_to) {
      countParamNum++;
      countQueryText += ` AND al.created_at <= $${countParamNum}::date + interval '1 day'`;
    }

    const countResult = await query(countQueryText, params);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitInt);

    // Add pagination
    const offset = (pageInt - 1) * limitInt;
    paramCount++;
    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
    params.push(limitInt);
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const logsResult = await query(queryText, params);

    res.status(200).json({
      success: true,
      count: logsResult.rows.length,
      total: total,
      currentPage: pageInt,
      totalPages: totalPages,
      data: logsResult.rows,
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message,
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/super-admin/dashboard
// @access  Private (Super Admin)
export const getDashboard = async (req, res) => {
  try {
    const totalStudents = await query('SELECT COUNT(*) as count FROM students');
    const approvedStudents = await query(
      "SELECT COUNT(*) as count FROM students WHERE registration_status = 'approved'"
    );
    const pendingStudents = await query(
      "SELECT COUNT(*) as count FROM students WHERE registration_status = 'pending'"
    );
    const blacklistedStudents = await query(
      'SELECT COUNT(*) as count FROM students WHERE is_blacklisted = TRUE'
    );
    const totalJobs = await query('SELECT COUNT(*) as count FROM jobs');
    const activeJobs = await query(
      'SELECT COUNT(*) as count FROM jobs WHERE is_active = TRUE'
    );
    const totalColleges = await query('SELECT COUNT(*) as count FROM colleges');
    const totalOfficers = await query('SELECT COUNT(*) as count FROM placement_officers WHERE is_active = TRUE');
    const activePrnRanges = await query('SELECT COUNT(*) as count FROM prn_ranges WHERE is_active = TRUE');
    const pendingWhitelistRequests = await query(
      "SELECT COUNT(*) as count FROM whitelist_requests WHERE status = 'pending'"
    );
    const recentActivitiesCount = await query(
      'SELECT COUNT(*) as count FROM activity_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL \'7 days\''
    );

    res.status(200).json({
      success: true,
      data: {
        // Snake case for frontend compatibility
        total_students: parseInt(totalStudents.rows[0].count),
        approved_students: parseInt(approvedStudents.rows[0].count),
        pending_students: parseInt(pendingStudents.rows[0].count),
        blacklisted_students: parseInt(blacklistedStudents.rows[0].count),
        total_jobs: parseInt(totalJobs.rows[0].count),
        active_jobs: parseInt(activeJobs.rows[0].count),
        total_colleges: parseInt(totalColleges.rows[0].count),
        total_officers: parseInt(totalOfficers.rows[0].count),
        active_prn_ranges: parseInt(activePrnRanges.rows[0].count),
        pending_whitelist_requests: parseInt(pendingWhitelistRequests.rows[0].count),
        recent_activities_count: parseInt(recentActivitiesCount.rows[0].count),
        // Also include camelCase for backward compatibility
        totalStudents: parseInt(totalStudents.rows[0].count),
        approvedStudents: parseInt(approvedStudents.rows[0].count),
        pendingStudents: parseInt(pendingStudents.rows[0].count),
        blacklistedStudents: parseInt(blacklistedStudents.rows[0].count),
        activeJobs: parseInt(activeJobs.rows[0].count),
        pendingWhitelistRequests: parseInt(pendingWhitelistRequests.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

// @desc    Get super admin profile
// @route   GET /api/super-admin/profile
// @access  Private (Super Admin)
export const getProfile = async (req, res) => {
  try {
    const profileResult = await query(
      `SELECT sa.*, u.email, u.last_login
       FROM super_admins sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: profileResult.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Update super admin profile
// @route   PUT /api/super-admin/profile
// @access  Private (Super Admin)
export const updateProfile = async (req, res) => {
  try {
    const { name, phone_number } = req.body;

    // Validation
    if (!name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits',
      });
    }

    // Update profile
    const result = await query(
      `UPDATE super_admins
       SET name = $1, phone_number = $2
       WHERE user_id = $3
       RETURNING *`,
      [name, phone_number, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'PROFILE_UPDATE',
      'Updated profile information',
      'super_admin',
      result.rows[0].id,
      { name, phone_number },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// @desc    Get all students (for job eligibility checking)
// @route   GET /api/super-admin/students
// @access  Private (Super Admin)
export const getAllStudents = async (req, res) => {
  try {
    const studentsResult = await query(
      `SELECT s.*, c.college_name, r.region_name
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       JOIN regions r ON s.region_id = r.id
       WHERE s.registration_status = 'approved'
       AND s.is_blacklisted = FALSE
       ORDER BY s.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: studentsResult.rows.length,
      data: studentsResult.rows,
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// @desc    Delete student completely from database
// @route   DELETE /api/super-admin/students/:id
// @access  Private (Super Admin)
export const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get student details before deletion
    const studentResult = await query(
      'SELECT s.*, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = studentResult.rows[0];
    const userId = student.user_id;

    // Delete student and related user in transaction
    await transaction(async (client) => {
      // Delete job applications first (foreign key constraint)
      await client.query('DELETE FROM job_applications WHERE student_id = $1', [studentId]);

      // Delete whitelist requests
      await client.query('DELETE FROM whitelist_requests WHERE student_id = $1', [studentId]);

      // Delete notification recipients
      await client.query('DELETE FROM notification_recipients WHERE user_id = $1', [userId]);

      // Delete activity logs
      await client.query('DELETE FROM activity_logs WHERE user_id = $1', [userId]);

      // Delete student profile
      await client.query('DELETE FROM students WHERE id = $1', [studentId]);

      // Delete user account
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    // Log activity
    await logActivity(
      req.user.id,
      'STUDENT_DELETE',
      `Deleted student: ${student.prn} - ${student.name}`,
      'student',
      studentId,
      { prn: student.prn, email: student.email },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
};

// @desc    Get students who have applied to a specific job (across all colleges)
// @route   GET /api/super-admin/jobs/:jobId/applicants
// @access  Private (Super Admin)
export const getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get all students who have applied to this job across all colleges
    const applicantsResult = await query(
      `SELECT
        s.id, s.prn, s.name, s.email, s.mobile_number, s.branch, s.cgpa,
        s.backlog_count, s.date_of_birth, s.college_id, s.registration_status, s.region_id,
        c.college_name,
        r.region_name,
        ja.id as application_id, ja.applied_date, ja.application_status,
        j.job_title, j.company_name, j.min_cgpa, j.max_backlogs, j.allowed_branches
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN regions r ON s.region_id = r.id
      WHERE ja.job_id = $1
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
      ORDER BY ja.applied_date DESC`,
      [jobId]
    );

    // Parse allowed_branches if it's a string
    const applicants = applicantsResult.rows.map((applicant) => ({
      ...applicant,
      allowed_branches: applicant.allowed_branches
        ? (typeof applicant.allowed_branches === 'string'
            ? JSON.parse(applicant.allowed_branches)
            : applicant.allowed_branches)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: applicants.length,
      data: applicants,
    });
  } catch (error) {
    console.error('Get job applicants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job applicants',
      error: error.message,
    });
  }
};

// ========================================
// JOB REQUESTS MANAGEMENT
// ========================================

// @desc    Get pending job requests from placement officers
// @route   GET /api/super-admin/jobs/pending-requests
// @access  Private (Super Admin)
export const getPendingJobRequests = async (req, res) => {
  try {
    const jobRequestsResult = await query(
      `SELECT jr.*,
              po.officer_name,
              c.college_name,
              r.region_name
       FROM job_requests jr
       JOIN placement_officers po ON jr.placement_officer_id = po.id
       JOIN colleges c ON jr.college_id = c.id
       JOIN regions r ON c.region_id = r.id
       WHERE jr.status = 'pending'
       ORDER BY jr.created_at DESC`
    );

    // Map field names and parse JSON fields safely
    const jobRequests = jobRequestsResult.rows.map((request) => ({
      ...request,
      // Map database field names to frontend expected names
      title: request.job_title,
      description: request.job_description,
      location: request.location,
      // Parse JSONB fields to arrays
      allowed_branches: request.allowed_branches
        ? (typeof request.allowed_branches === 'string' ? JSON.parse(request.allowed_branches) : request.allowed_branches)
        : [],
      target_regions: request.target_regions
        ? (typeof request.target_regions === 'string' ? JSON.parse(request.target_regions) : request.target_regions)
        : [],
      target_colleges: request.target_colleges
        ? (typeof request.target_colleges === 'string' ? JSON.parse(request.target_colleges) : request.target_colleges)
        : [],
    }));

    res.status(200).json({
      success: true,
      count: jobRequests.length,
      data: jobRequests,
    });
  } catch (error) {
    console.error('Get pending job requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending job requests',
      error: error.message,
    });
  }
};

// @desc    Approve job request and create job
// @route   PUT /api/super-admin/jobs/requests/:id/approve
// @access  Private (Super Admin)
export const approveJobRequest = async (req, res) => {
  let jobRequest; // Declare outside try block for error logging

  try {
    const { id } = req.params;

    // Get job request details
    const jobRequestResult = await query(
      'SELECT * FROM job_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (jobRequestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or already processed',
      });
    }

    jobRequest = jobRequestResult.rows[0];

    // Determine target type - convert from job_requests format to jobs format
    let targetType = 'all';
    let targetRegions = jobRequest.target_regions;
    let targetColleges = jobRequest.target_colleges;

    if (jobRequest.target_type === 'specific') {
      if (targetRegions && (Array.isArray(targetRegions) ? targetRegions.length > 0 : true)) {
        targetType = 'region';
      } else if (targetColleges && (Array.isArray(targetColleges) ? targetColleges.length > 0 : true)) {
        targetType = 'college';
      }
    } else if (jobRequest.target_type === 'college' || jobRequest.target_type === 'region') {
      targetType = jobRequest.target_type;
    }

    // Create job from job request using transaction
    const result = await transaction(async (client) => {
      // Create the job
      const jobResult = await client.query(
        `INSERT INTO jobs
         (job_title, company_name, job_description, job_location, job_type, salary_package,
          application_form_url, application_start_date, application_deadline, min_cgpa, max_backlogs,
          allowed_branches, target_type, target_regions, target_colleges, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14::jsonb, $15, TRUE)
         RETURNING *`,
        [
          jobRequest.job_title,
          jobRequest.company_name,
          jobRequest.job_description,
          jobRequest.location || null,
          jobRequest.job_type || 'Full-time',
          jobRequest.salary_range || null,
          jobRequest.application_form_url,
          jobRequest.application_deadline,
          jobRequest.min_cgpa || null,
          jobRequest.max_backlogs !== null && jobRequest.max_backlogs !== undefined ? jobRequest.max_backlogs : null,
          JSON.stringify(jobRequest.allowed_branches || null),
          targetType,
          JSON.stringify(targetRegions || null),
          JSON.stringify(targetColleges || null),
          req.user.id,
        ]
      );

      // Update job request status
      await client.query(
        `UPDATE job_requests
         SET status = $1, reviewed_by = $2, reviewed_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['approved', req.user.id, id]
      );

      return jobResult.rows[0];
    });

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_APPROVE',
      `Approved job request and created job: ${jobRequest.company_name} - ${jobRequest.job_title}`,
      'job',
      result.id,
      { job_request_id: id },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job request approved and job created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Approve job request error:', error);
    console.error('Error stack:', error.stack);
    console.error('Job request data:', jobRequest);
    res.status(500).json({
      success: false,
      message: 'Error approving job request',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Reject job request
// @route   PUT /api/super-admin/jobs/requests/:id/reject
// @access  Private (Super Admin)
export const rejectJobRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_comment } = req.body;

    // Update job request status
    const result = await query(
      `UPDATE job_requests
       SET status = $1, reviewed_by = $2, review_comment = $3, reviewed_date = CURRENT_TIMESTAMP
       WHERE id = $4 AND status = $5
       RETURNING *`,
      ['rejected', req.user.id, review_comment || 'Rejected by Super Admin', id, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or already processed',
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_REJECT',
      `Rejected job request: ${result.rows[0].company_name} - ${result.rows[0].job_title}`,
      'job_request',
      id,
      { review_comment },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job request rejected successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Reject job request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting job request',
      error: error.message,
    });
  }
};

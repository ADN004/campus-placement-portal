/**
 * Job Requirements Controller
 *
 * Handles job requirement templates and validation
 * - Create/update job requirements
 * - Manage company templates
 * - Validate applications against requirements
 */

import { query, transaction } from '../config/database.js';

/**
 * Create or Update Job Requirements
 *
 * @route POST /api/placement-officer/jobs/:jobId/requirements
 * @access Placement Officer
 */
export const createOrUpdateJobRequirements = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      min_cgpa,
      max_backlogs,
      backlog_max_semester,
      allowed_backlog_semesters,
      allowed_branches,
      requires_academic_extended,
      requires_physical_details,
      requires_family_details,
      requires_document_verification,
      requires_education_preferences,
      specific_field_requirements,
      custom_fields
    } = req.body;

    // Verify job exists and belongs to this placement officer's college
    const jobCheck = await query(
      `SELECT j.* FROM jobs j
       JOIN users u ON u.college_id = (SELECT college_id FROM users WHERE id = $1)
       WHERE j.id = $2`,
      [req.user.id, jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or access denied'
      });
    }

    // Upsert job requirements
    const result = await query(
      `INSERT INTO job_requirement_templates (
        job_id, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
        requires_academic_extended, requires_physical_details,
        requires_family_details, requires_document_verification,
        requires_education_preferences, specific_field_requirements,
        custom_fields, requires_personal_details
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (job_id) DO UPDATE SET
        min_cgpa = $2,
        max_backlogs = $3,
        backlog_max_semester = $4,
        allowed_backlog_semesters = $5::jsonb,
        allowed_branches = $6,
        requires_academic_extended = $7,
        requires_physical_details = $8,
        requires_family_details = $9,
        requires_document_verification = $10,
        requires_education_preferences = $11,
        specific_field_requirements = $12,
        custom_fields = $13,
        requires_personal_details = $14,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        jobId,
        min_cgpa,
        max_backlogs,
        backlog_max_semester || null,
        JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
        JSON.stringify(allowed_branches || []),
        requires_academic_extended || false,
        requires_physical_details || false,
        requires_family_details || false,
        requires_document_verification || false,
        requires_education_preferences || false,
        JSON.stringify(specific_field_requirements || {}),
        JSON.stringify(custom_fields || []),
        false // requires_personal_details - not in req.body for this function
      ]
    );

    res.json({
      success: true,
      message: 'Job requirements saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating job requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job requirements',
      error: error.message
    });
  }
};

/**
 * Get Job Requirements
 *
 * @route GET /api/jobs/:jobId/requirements
 * @access All authenticated users
 */
export const getJobRequirements = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await query(
      `SELECT jrt.*,
              j.job_title,
              j.company_name
       FROM job_requirement_templates jrt
       JOIN jobs j ON j.id = jrt.job_id
       WHERE jrt.job_id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No specific requirements defined',
        data: null
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching job requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job requirements',
      error: error.message
    });
  }
};

/**
 * Create Company Requirement Template
 *
 * @route POST /api/super-admin/requirement-templates
 * @access Super Admin
 */
export const createCompanyTemplate = async (req, res) => {
  try {
    const {
      template_name,
      company_name,
      description,
      min_cgpa,
      max_backlogs,
      backlog_max_semester,
      allowed_backlog_semesters,
      allowed_branches,
      requires_academic_extended,
      requires_physical_details,
      requires_family_details,
      requires_document_verification,
      requires_education_preferences,
      specific_field_requirements,
      custom_fields
    } = req.body;

    // Check if template name already exists
    const existingTemplate = await query(
      'SELECT id FROM company_requirement_templates WHERE template_name = $1',
      [template_name]
    );

    if (existingTemplate.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists'
      });
    }

    const result = await query(
      `INSERT INTO company_requirement_templates (
        template_name, company_name, description,
        min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
        requires_academic_extended, requires_physical_details,
        requires_family_details, requires_document_verification,
        requires_education_preferences, specific_field_requirements,
        custom_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        template_name,
        company_name,
        description,
        min_cgpa,
        max_backlogs,
        backlog_max_semester || null,
        JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
        JSON.stringify(allowed_branches || []),
        requires_academic_extended || false,
        requires_physical_details || false,
        requires_family_details || false,
        requires_document_verification || false,
        requires_education_preferences || false,
        JSON.stringify(specific_field_requirements || {}),
        JSON.stringify(custom_fields || []),
        req.user.id
      ]
    );

    res.json({
      success: true,
      message: 'Company template created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating company template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company template',
      error: error.message
    });
  }
};

/**
 * Get All Company Templates
 *
 * @route GET /api/placement-officer/requirement-templates
 * @access Placement Officer, Super Admin
 */
export const getAllCompanyTemplates = async (req, res) => {
  try {
    const result = await query(
      `SELECT
        crt.*,
        u.email as created_by_email
       FROM company_requirement_templates crt
       LEFT JOIN users u ON u.id = crt.created_by
       ORDER BY crt.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching company templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company templates',
      error: error.message
    });
  }
};

/**
 * Delete Company Template
 *
 * @route DELETE /api/super-admin/requirement-templates/:templateId
 * @access Super Admin
 */
export const deleteCompanyTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const result = await query(
      'DELETE FROM company_requirement_templates WHERE id = $1 RETURNING *',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

/**
 * Update Company Template
 *
 * @route PUT /api/super-admin/requirement-templates/:templateId
 * @access Super Admin
 */
export const updateCompanyTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      template_name,
      company_name,
      description,
      min_cgpa,
      max_backlogs,
      backlog_max_semester,
      allowed_backlog_semesters,
      allowed_branches,
      requires_academic_extended,
      requires_physical_details,
      requires_family_details,
      requires_document_verification,
      requires_education_preferences,
      specific_field_requirements,
      custom_fields
    } = req.body;

    const result = await query(
      `UPDATE company_requirement_templates
       SET template_name = COALESCE($1, template_name),
           company_name = COALESCE($2, company_name),
           description = COALESCE($3, description),
           min_cgpa = COALESCE($4, min_cgpa),
           max_backlogs = COALESCE($5, max_backlogs),
           backlog_max_semester = $6,
           allowed_backlog_semesters = COALESCE($7::jsonb, allowed_backlog_semesters),
           allowed_branches = COALESCE($8, allowed_branches),
           requires_academic_extended = COALESCE($9, requires_academic_extended),
           requires_physical_details = COALESCE($10, requires_physical_details),
           requires_family_details = COALESCE($11, requires_family_details),
           requires_document_verification = COALESCE($12, requires_document_verification),
           requires_education_preferences = COALESCE($13, requires_education_preferences),
           specific_field_requirements = COALESCE($14, specific_field_requirements),
           custom_fields = COALESCE($15, custom_fields),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        template_name,
        company_name,
        description,
        min_cgpa,
        max_backlogs,
        backlog_max_semester || null,
        allowed_backlog_semesters ? JSON.stringify(allowed_backlog_semesters) : null,
        allowed_branches ? JSON.stringify(allowed_branches) : null,
        requires_academic_extended,
        requires_physical_details,
        requires_family_details,
        requires_document_verification,
        requires_education_preferences,
        specific_field_requirements ? JSON.stringify(specific_field_requirements) : null,
        custom_fields ? JSON.stringify(custom_fields) : null,
        templateId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

/**
 * Create or Update Job Requirements (Super Admin)
 *
 * @route POST /api/super-admin/jobs/:jobId/requirements
 * @access Super Admin
 */
export const superAdminCreateOrUpdateJobRequirements = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      min_cgpa,
      max_backlogs,
      backlog_max_semester,
      allowed_backlog_semesters,
      allowed_branches,
      requires_academic_extended,
      requires_physical_details,
      requires_family_details,
      requires_personal_details,
      requires_document_verification,
      requires_education_preferences,
      specific_field_requirements,
      custom_fields
    } = req.body;

    // Verify job exists
    const jobCheck = await query(
      'SELECT id FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Upsert job requirements
    const result = await query(
      `INSERT INTO job_requirement_templates (
        job_id, min_cgpa, max_backlogs, backlog_max_semester, allowed_backlog_semesters, allowed_branches,
        requires_academic_extended, requires_physical_details,
        requires_family_details, requires_document_verification,
        requires_education_preferences, specific_field_requirements,
        custom_fields, requires_personal_details
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (job_id) DO UPDATE SET
        min_cgpa = $2,
        max_backlogs = $3,
        backlog_max_semester = $4,
        allowed_backlog_semesters = $5::jsonb,
        allowed_branches = $6,
        requires_academic_extended = $7,
        requires_physical_details = $8,
        requires_family_details = $9,
        requires_document_verification = $10,
        requires_education_preferences = $11,
        specific_field_requirements = $12,
        custom_fields = $13,
        requires_personal_details = $14,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        jobId,
        min_cgpa,
        max_backlogs,
        backlog_max_semester || null,
        JSON.stringify(allowed_backlog_semesters && allowed_backlog_semesters.length > 0 ? allowed_backlog_semesters : []),
        JSON.stringify(allowed_branches || []),
        requires_academic_extended || false,
        requires_physical_details || false,
        requires_family_details || false,
        requires_document_verification || false,
        requires_education_preferences || false,
        JSON.stringify(specific_field_requirements || {}),
        JSON.stringify(custom_fields || []),
        requires_personal_details || false
      ]
    );

    res.json({
      success: true,
      message: 'Job requirements saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating job requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job requirements',
      error: error.message
    });
  }
};

export default {
  createOrUpdateJobRequirements,
  getJobRequirements,
  createCompanyTemplate,
  getAllCompanyTemplates,
  deleteCompanyTemplate,
  updateCompanyTemplate,
  superAdminCreateOrUpdateJobRequirements
};

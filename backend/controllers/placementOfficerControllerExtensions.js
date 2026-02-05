import { query, getClient } from '../config/database.js';
import { uploadImage, deleteImage, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';
import logActivity from '../middleware/activityLogger.js';
import ExcelJS from 'exceljs';
import { generateStudentPDF, generatePlacementPosterPDF } from '../utils/pdfGenerator.js';
import { BRANCH_SHORT_NAMES } from '../constants/branches.js';
import {
  sendDriveScheduleEmail,
  sendSelectionEmail,
  sendRejectionEmail,
  sendShortlistEmail,
} from '../config/emailService.js';

// ========================================
// CONSTANTS
// ========================================
const MAX_PHOTO_SIZE_MB = 0.5; // 500KB max photo size
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024; // 524288 bytes (500KB)

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Validate base64 image size
 * Base64 encoded images are ~33% larger than original binary
 *
 * @param   {string} base64String - Base64 encoded image string (with or without data URI prefix)
 * @returns {Object} Validation result with valid flag, message, and size in bytes
 */
const validateImageSize = (base64String) => {
  try {
    // Remove data URI prefix if present (data:image/png;base64,)
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    // Calculate actual file size from base64
    // Formula: size = (base64_length * 3) / 4
    // Subtract padding characters (=) from length
    const paddingCount = (base64Data.match(/=/g) || []).length;
    const actualSizeBytes = ((base64Data.length * 3) / 4) - paddingCount;

    const sizeMB = (actualSizeBytes / (1024 * 1024)).toFixed(2);

    if (actualSizeBytes > MAX_PHOTO_SIZE_BYTES) {
      return {
        valid: false,
        message: `Image size (${sizeMB} MB) exceeds maximum allowed size of ${MAX_PHOTO_SIZE_MB} MB`,
        sizeBytes: actualSizeBytes,
      };
    }

    return {
      valid: true,
      message: `Image size OK (${sizeMB} MB)`,
      sizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Invalid image format',
      sizeBytes: 0,
    };
  }
};

// ========================================
// PLACEMENT OFFICER PHOTO MANAGEMENT (Self)
// ========================================

// @desc    Upload/Update own profile photo
// @route   POST /api/placement-officer/profile/photo
// @access  Private (Placement Officer)
export const uploadOwnPhoto = async (req, res) => {
  try {
    const { photo } = req.body; // Base64 encoded image

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a photo',
      });
    }

    // Validate photo size (max 1MB)
    const photoValidation = validateImageSize(photo);
    if (!photoValidation.valid) {
      return res.status(400).json({
        success: false,
        message: photoValidation.message,
      });
    }

    // Get officer details with college name
    const officerResult = await query(
      `SELECT po.*, c.college_name, c.college_code
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Sanitize college name for folder path (remove spaces and special characters)
    const collegeFolderName = officer.college_name
      .replace(/[^a-zA-Z0-9]/g, '_')  // Replace special chars with underscore
      .replace(/_+/g, '_')             // Replace multiple underscores with single
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores

    console.log('🏛️ College Name:', officer.college_name);
    console.log('📁 Sanitized Folder Name:', collegeFolderName);

    // Delete old photo from Cloudinary if exists (saves space!)
    if (officer.photo_cloudinary_id) {
      try {
        await deleteImage(officer.photo_cloudinary_id);
        console.log(`✅ Deleted old photo: ${officer.photo_cloudinary_id}`);

        // Delete folder if it exists (for nested folder structures)
        const folderPath = extractFolderPath(officer.photo_cloudinary_id);
        if (folderPath) {
          await deleteFolderOnly(folderPath);
          console.log(`✅ Deleted folder: ${folderPath}`);
        }
      } catch (error) {
        console.error('❌ Error deleting old officer photo:', error);
        // Continue even if deletion fails
      }
    }

    // Upload new photo to placement_officers/{college_name}/officer_{id}
    // This organizes photos by college since officers change but colleges remain constant
    const folderPath = `placement_officers/${collegeFolderName}`;
    const publicId = `officer_${officer.id}_${Date.now()}`;

    console.log('📤 Uploading to folder:', folderPath);
    console.log('📤 Public ID:', publicId);

    const uploadResult = await uploadImage(
      photo,
      folderPath,
      publicId
    );

    console.log('✅ Upload successful! Full public ID:', uploadResult.publicId);

    // Update database
    const result = await query(
      `UPDATE placement_officers
       SET photo_url = $1,
           photo_cloudinary_id = $2,
           photo_uploaded_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [uploadResult.url, uploadResult.publicId, officer.id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'UPLOAD_OWN_PHOTO',
      `Updated profile photo`,
      'placement_officer',
      officer.id,
      {},
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Upload own photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message,
    });
  }
};

// @desc    Delete own profile photo
// @route   DELETE /api/placement-officer/profile/photo
// @access  Private (Placement Officer)
export const deleteOwnPhoto = async (req, res) => {
  try {
    // Get officer details
    const officerResult = await query(
      'SELECT * FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    if (!officer.photo_cloudinary_id) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo to delete',
      });
    }

    // Delete from Cloudinary
    await deleteImage(officer.photo_cloudinary_id);

    // Delete folder if it exists (for nested folder structures)
    const folderPath = extractFolderPath(officer.photo_cloudinary_id);
    if (folderPath) {
      try {
        await deleteFolderOnly(folderPath);
        console.log(`✅ Deleted folder: ${folderPath}`);
      } catch (folderError) {
        console.warn(`⚠️ Could not delete folder ${folderPath}:`, folderError.message);
        // Continue even if folder deletion fails
      }
    }

    // Update database
    await query(
      `UPDATE placement_officers
       SET photo_url = NULL,
           photo_cloudinary_id = NULL,
           photo_uploaded_at = NULL
       WHERE id = $1`,
      [officer.id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'DELETE_OWN_PHOTO',
      `Deleted profile photo`,
      'placement_officer',
      officer.id,
      {},
      req
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  } catch (error) {
    console.error('Delete own photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile photo',
      error: error.message,
    });
  }
};

// ========================================
// CUSTOM EXPORT FOR PLACEMENT OFFICERS
// ========================================

// @desc    Custom export students from officer's college
// @route   POST /api/placement-officer/students/custom-export
// @access  Private (Placement Officer)
export const customExportStudents = async (req, res) => {
  try {
    const {
      branches, fields, include_photo_url, status, format = 'excel',
      company_name, drive_date, include_signature, separate_colleges, use_short_names,
      // Advanced filters
      search, cgpa_min, cgpa_max, backlog_count, branch,
      dob_from, dob_to, height_min, height_max, weight_min, weight_max,
      has_driving_license, has_pan_card, has_aadhar_card, has_passport,
      districts
    } = req.body;

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    if (!fields || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one field to export',
      });
    }

    // Define available fields mapping
    const fieldMapping = {
      prn: 's.prn',
      student_name: 's.student_name',
      email: 's.email',
      mobile_number: 's.mobile_number',
      age: 's.age',
      gender: 's.gender',
      date_of_birth: 's.date_of_birth',
      branch: 's.branch',
      programme_cgpa: 's.programme_cgpa',
      cgpa_sem1: 's.cgpa_sem1',
      cgpa_sem2: 's.cgpa_sem2',
      cgpa_sem3: 's.cgpa_sem3',
      cgpa_sem4: 's.cgpa_sem4',
      cgpa_sem5: 's.cgpa_sem5',
      cgpa_sem6: 's.cgpa_sem6',
      backlog_count: 's.backlog_count',
      has_driving_license: 's.has_driving_license',
      has_pan_card: 's.has_pan_card',
      registration_status: 's.registration_status',
    };

    if (include_photo_url) {
      fieldMapping.photo_url = 's.photo_url';
    }

    // Build SELECT clause
    const selectFields = [];
    const columnHeaders = {};

    for (const field of fields) {
      if (fieldMapping[field]) {
        selectFields.push(`${fieldMapping[field]} AS ${field}`);
        columnHeaders[field] = field
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    if (include_photo_url && fieldMapping.photo_url) {
      selectFields.push(`${fieldMapping.photo_url} AS photo_url`);
      columnHeaders.photo_url = 'Photo URL';
    }

    // Build query
    let queryText = `
      SELECT ${selectFields.join(', ')}
      FROM students s
      WHERE s.college_id = $1
    `;

    const params = [collegeId];
    let paramCount = 1;

    // Filter by status
    if (status === 'blacklisted') {
      queryText += ` AND s.is_blacklisted = TRUE`;
    } else if (status === 'approved') {
      queryText += ` AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`;
    } else if (status === 'pending') {
      queryText += ` AND s.registration_status = 'pending' AND s.is_blacklisted = FALSE`;
    } else {
      // Default: exclude blacklisted
      queryText += ` AND s.is_blacklisted = FALSE`;
    }

    // Filter by branches (from custom export modal)
    if (branches && branches.length > 0) {
      paramCount++;
      queryText += ` AND s.branch = ANY($${paramCount})`;
      params.push(branches);
    }

    // Filter by single branch (from page-level filter)
    if (branch && (!branches || branches.length === 0)) {
      paramCount++;
      queryText += ` AND s.branch = $${paramCount}`;
      params.push(branch);
    }

    // Search filter
    if (search) {
      paramCount++;
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.student_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // CGPA filters
    if (cgpa_min) {
      paramCount++;
      queryText += ` AND s.programme_cgpa >= $${paramCount}`;
      params.push(parseFloat(cgpa_min));
    }
    if (cgpa_max) {
      paramCount++;
      queryText += ` AND s.programme_cgpa <= $${paramCount}`;
      params.push(parseFloat(cgpa_max));
    }

    // Backlog count filter
    if (backlog_count !== undefined && backlog_count !== '') {
      paramCount++;
      queryText += ` AND s.backlog_count <= $${paramCount}`;
      params.push(parseInt(backlog_count));
    }

    // Date of Birth filters
    if (dob_from) {
      paramCount++;
      queryText += ` AND s.date_of_birth >= $${paramCount}`;
      params.push(dob_from);
    }
    if (dob_to) {
      paramCount++;
      queryText += ` AND s.date_of_birth <= $${paramCount}`;
      params.push(dob_to);
    }

    // Height filters
    if (height_min) {
      paramCount++;
      queryText += ` AND s.height >= $${paramCount}`;
      params.push(parseFloat(height_min));
    }
    if (height_max) {
      paramCount++;
      queryText += ` AND s.height <= $${paramCount}`;
      params.push(parseFloat(height_max));
    }

    // Weight filters
    if (weight_min) {
      paramCount++;
      queryText += ` AND s.weight >= $${paramCount}`;
      params.push(parseFloat(weight_min));
    }
    if (weight_max) {
      paramCount++;
      queryText += ` AND s.weight <= $${paramCount}`;
      params.push(parseFloat(weight_max));
    }

    // Document filters
    if (has_driving_license === 'yes') {
      queryText += ` AND s.has_driving_license = TRUE`;
    } else if (has_driving_license === 'no') {
      queryText += ` AND s.has_driving_license = FALSE`;
    }

    if (has_pan_card === 'yes') {
      queryText += ` AND s.has_pan_card = TRUE`;
    } else if (has_pan_card === 'no') {
      queryText += ` AND s.has_pan_card = FALSE`;
    }

    if (has_aadhar_card === 'yes') {
      queryText += ` AND s.has_aadhar_card = TRUE`;
    } else if (has_aadhar_card === 'no') {
      queryText += ` AND s.has_aadhar_card = FALSE`;
    }

    if (has_passport === 'yes') {
      queryText += ` AND s.has_passport = TRUE`;
    } else if (has_passport === 'no') {
      queryText += ` AND s.has_passport = FALSE`;
    }

    // District filter
    if (districts && districts.length > 0) {
      paramCount++;
      queryText += ` AND s.district = ANY($${paramCount})`;
      params.push(districts);
    }

    // Sort by branch first, then by PRN for organized export
    queryText += ' ORDER BY s.branch, s.prn';

    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;

    // Branch based on export format
    if (format === 'pdf') {
      // Get college name for header
      const collegeResult = await query(
        'SELECT college_name FROM colleges WHERE id = $1',
        [collegeId]
      );
      const collegeName = collegeResult.rows.length > 0 ? collegeResult.rows[0].college_name : '';

      return generateStudentPDF(students, {
        selectedFields: fields,
        collegeName: collegeName,
        companyName: company_name || null,
        driveDate: drive_date || null,
        includeSignature: include_signature === true,
        separateColleges: separate_colleges === true,
        useShortNames: use_short_names === true,
      }, res);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Export');

    // Define columns
    const columns = fields.map(field => ({
      header: columnHeaders[field],
      key: field,
      width: 15,
    }));

    if (include_photo_url) {
      columns.push({
        header: 'Photo URL',
        key: 'photo_url',
        width: 50,
      });
    }

    worksheet.columns = columns;

    // Process students data to use short names if requested
    const processedStudents = students.map(student => {
      const processedStudent = { ...student };
      if (use_short_names && processedStudent.branch) {
        processedStudent.branch = BRANCH_SHORT_NAMES[processedStudent.branch] || processedStudent.branch;
      }
      return processedStudent;
    });

    // Add rows
    worksheet.addRows(processedStudents);

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students-export-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity
    await logActivity(
      req.user.id,
      'CUSTOM_EXPORT_STUDENTS',
      `Exported ${students.length} students to ${format.toUpperCase()} with custom fields`,
      'student',
      null,
      {
        branches,
        fields,
        include_photo_url,
        status,
        format,
        count: students.length
      },
      req
    );
  } catch (error) {
    console.error('Custom export students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

// @desc    Get branches available in officer's college
// @route   GET /api/placement-officer/college/branches
// @access  Private (Placement Officer)
export const getCollegeBranches = async (req, res) => {
  try {
    // Get officer's college
    const officerResult = await query(
      `SELECT c.id, c.college_name, c.branches
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const college = officerResult.rows[0];
    let branches = [];

    if (college.branches) {
      branches = typeof college.branches === 'string'
        ? JSON.parse(college.branches)
        : college.branches;
    }

    res.status(200).json({
      success: true,
      data: {
        college_id: college.id,
        college_name: college.college_name,
        branches: branches
      }
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

// @desc    Export job applicants to Excel or PDF
// @route   GET /api/placement-officer/jobs/:jobId/applicants/export?format=excel|pdf
// @access  Private (Placement Officer)
export const exportJobApplicants = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const format = req.query.format || 'excel';
    const useShortNames = req.query.use_short_names !== 'false'; // Default to true

    // Get officer's college
    const officerResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const collegeId = officerResult.rows[0].college_id;

    // Get job applicants from officer's college only
    const applicantsResult = await query(
      `SELECT s.id, s.prn, s.student_name as name, s.email, s.mobile_number,
              s.branch, s.programme_cgpa, s.backlog_count, s.date_of_birth,
              c.college_name,
              ja.applied_date,
              j.job_title, j.company_name,
              ep.height_cm, ep.weight_kg, ep.sslc_marks, ep.twelfth_marks
       FROM students s
       JOIN job_applications ja ON s.id = ja.student_id
       JOIN jobs j ON ja.job_id = j.id
       LEFT JOIN colleges c ON s.college_id = c.id
       LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
       WHERE ja.job_id = $1
         AND s.college_id = $2
         AND s.registration_status = 'approved'
         AND s.is_blacklisted = FALSE
       ORDER BY ja.applied_date DESC`,
      [jobId, collegeId]
    );

    const applicants = applicantsResult.rows;

    if (applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applicants found for this job',
      });
    }

    const jobTitle = applicants[0].job_title;
    const companyName = applicants[0].company_name;

    // Generate PDF if requested
    if (format === 'pdf') {
      const { generateJobApplicantsPDF } = await import('../utils/pdfGenerator.js');

      await logActivity(
        req.user.id,
        'EXPORT_JOB_APPLICANTS',
        `Exported ${applicants.length} applicants as PDF for job: ${jobTitle}`,
        'job',
        jobId,
        { count: applicants.length, format: 'pdf', company: companyName },
        req
      );

      return await generateJobApplicantsPDF(applicants, { jobTitle, companyName, isSuperAdmin: false, useShortNames }, res);
    }

    // Generate Excel export
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Applicants');

    // Define columns
    worksheet.columns = [
      { header: 'PRN', key: 'prn', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobile_number', width: 15 },
      { header: 'Branch', key: 'branch', width: useShortNames ? 12 : 30 },
      { header: 'Date of Birth', key: 'date_of_birth', width: 15 },
      { header: 'CGPA', key: 'programme_cgpa', width: 10 },
      { header: 'Backlog Count', key: 'backlog_count', width: 12 },
      { header: 'Applied Date', key: 'applied_date', width: 15 },
      { header: 'Job Title', key: 'job_title', width: 25 },
      { header: 'Company Name', key: 'company_name', width: 25 },
    ];

    // Add rows
    applicants.forEach(applicant => {
      worksheet.addRow({
        prn: applicant.prn,
        name: applicant.name,
        email: applicant.email,
        mobile_number: applicant.mobile_number,
        branch: useShortNames ? (BRANCH_SHORT_NAMES[applicant.branch] || applicant.branch) : applicant.branch,
        date_of_birth: applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        programme_cgpa: applicant.programme_cgpa,
        backlog_count: applicant.backlog_count,
        applied_date: new Date(applicant.applied_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        job_title: jobTitle,
        company_name: companyName,
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add branch legend sheet if using short names
    if (useShortNames) {
      const uniqueBranches = [...new Set(applicants.map(a => a.branch).filter(Boolean))];

      if (uniqueBranches.length > 0) {
        const legendSheet = workbook.addWorksheet('Branch Codes Reference');

        // Define legend columns
        legendSheet.columns = [
          { header: 'Branch Code', key: 'code', width: 15 },
          { header: 'Full Branch Name', key: 'name', width: 50 }
        ];

        // Style legend header
        legendSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        legendSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };

        // Add legend data (sorted alphabetically)
        uniqueBranches.sort().forEach(branch => {
          legendSheet.addRow({
            code: BRANCH_SHORT_NAMES[branch] || branch,
            name: branch
          });
        });
      }
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=job_applicants_${jobTitle.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity
    await logActivity(
      req.user.id,
      'EXPORT_JOB_APPLICANTS',
      `Exported ${applicants.length} applicants as Excel for job: ${jobTitle}`,
      'job',
      jobId,
      { count: applicants.length, format: 'excel', company: companyName },
      req
    );
  } catch (error) {
    console.error('Export job applicants error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error exporting job applicants',
        error: error.message,
      });
    }
  }
};

// ========================================
// JOB REQUEST REQUIREMENTS FUNCTIONS
// ========================================

/**
 * Create or Update Job Request Requirements
 * Allows placement officers to specify extended requirements when creating job requests
 *
 * @route   POST /api/placement-officer/job-requests/:jobRequestId/requirements
 * @access  Private (Placement Officer)
 */
export const createOrUpdateJobRequestRequirements = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    const {
      min_cgpa,
      max_backlogs,
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

    // Get placement officer details
    const officerResult = await query(
      'SELECT id, college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Verify job request exists and belongs to this placement officer
    const jobRequestCheck = await query(
      `SELECT * FROM job_requests
       WHERE id = $1 AND placement_officer_id = $2`,
      [jobRequestId, officer.id]
    );

    if (jobRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or access denied'
      });
    }

    // Upsert job request requirements
    const result = await query(
      `INSERT INTO job_request_requirement_templates (
        job_request_id, min_cgpa, max_backlogs, allowed_branches,
        requires_academic_extended, requires_physical_details,
        requires_family_details, requires_personal_details,
        requires_document_verification, requires_education_preferences,
        specific_field_requirements, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (job_request_id) DO UPDATE SET
        min_cgpa = $2,
        max_backlogs = $3,
        allowed_branches = $4,
        requires_academic_extended = $5,
        requires_physical_details = $6,
        requires_family_details = $7,
        requires_personal_details = $8,
        requires_document_verification = $9,
        requires_education_preferences = $10,
        specific_field_requirements = $11,
        custom_fields = $12,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        jobRequestId,
        min_cgpa || null,
        max_backlogs !== undefined && max_backlogs !== '' ? parseInt(max_backlogs) : null,
        JSON.stringify(allowed_branches || []),
        requires_academic_extended || false,
        requires_physical_details || false,
        requires_family_details || false,
        requires_personal_details || false,
        requires_document_verification || false,
        requires_education_preferences || false,
        JSON.stringify(specific_field_requirements || {}),
        JSON.stringify(custom_fields || [])
      ]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'JOB_REQUEST_REQUIREMENTS_CREATE',
      `Created requirements for job request ID: ${jobRequestId}`,
      'job_request',
      jobRequestId,
      null,
      req
    );

    res.json({
      success: true,
      message: 'Job request requirements saved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating job request requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job request requirements',
      error: error.message
    });
  }
};

/**
 * Get Job Request Requirements
 *
 * @route   GET /api/placement-officer/job-requests/:jobRequestId/requirements
 * @access  Private (Placement Officer)
 */
export const getJobRequestRequirements = async (req, res) => {
  try {
    const { jobRequestId } = req.params;

    // Get placement officer details
    const officerResult = await query(
      'SELECT id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const officer = officerResult.rows[0];

    // Verify job request exists and belongs to this placement officer
    const jobRequestCheck = await query(
      `SELECT * FROM job_requests
       WHERE id = $1 AND placement_officer_id = $2`,
      [jobRequestId, officer.id]
    );

    if (jobRequestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job request not found or access denied'
      });
    }

    // Get requirements
    const result = await query(
      `SELECT * FROM job_request_requirement_templates
       WHERE job_request_id = $1`,
      [jobRequestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No requirements found for this job request'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting job request requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job request requirements',
      error: error.message
    });
  }
};

// ========================================
// ENHANCED JOB APPLICANTS MANAGEMENT (COLLEGE-SCOPED)
// Added: December 28, 2025
// ========================================

// Helper function to get placement officer's college ID
const getOfficerCollegeId = async (userId) => {
  const officerResult = await query(
    'SELECT college_id FROM placement_officers WHERE user_id = $1',
    [userId]
  );

  if (officerResult.rows.length === 0) {
    throw new Error('Placement officer profile not found');
  }

  return officerResult.rows[0].college_id;
};

// @desc    Get detailed student profile (basic + extended) - COLLEGE SCOPED
// @route   GET /api/placement-officer/students/:studentId/detailed-profile
// @access  Private (Placement Officer)
export const getDetailedStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const collegeId = await getOfficerCollegeId(req.user.id);

    // Query to get merged student data - COLLEGE SCOPED
    const profileResult = await query(
      `SELECT
        s.id, s.user_id, s.prn, s.email, s.mobile_number, s.student_name as name,
        s.gender, s.date_of_birth, s.age, s.branch, s.programme_cgpa,
        s.cgpa_sem1, s.cgpa_sem2, s.cgpa_sem3, s.cgpa_sem4, s.cgpa_sem5, s.cgpa_sem6,
        s.backlog_count, s.backlog_details,
        s.height, s.weight, s.college_id, s.region_id, s.complete_address,
        s.has_driving_license, s.has_pan_card, s.photo_url,
        s.email_verified, s.registration_status, s.is_blacklisted, s.blacklist_reason,
        s.created_at, s.updated_at,
        c.college_name, r.region_name,
        sep.sslc_marks, sep.sslc_year, sep.sslc_board,
        sep.twelfth_marks, sep.twelfth_year, sep.twelfth_board,
        COALESCE(sep.height_cm, s.height) as height_cm,
        COALESCE(sep.weight_kg, s.weight) as weight_kg,
        sep.physically_handicapped, sep.handicap_details,
        sep.district, COALESCE(sep.permanent_address, s.complete_address) as permanent_address,
        sep.interests_hobbies,
        sep.father_name, sep.father_occupation, sep.father_annual_income,
        sep.mother_name, sep.mother_occupation, sep.mother_annual_income,
        sep.siblings_count, sep.siblings_details,
        COALESCE(sep.has_aadhar_card, false) as has_aadhar_card,
        COALESCE(sep.has_passport, false) as has_passport,
        sep.pan_number, sep.aadhar_number, sep.passport_number,
        sep.interested_in_btech, sep.interested_in_mtech, sep.preferred_study_mode,
        sep.additional_certifications, sep.achievements, sep.extracurricular,
        sep.profile_completion_percentage
      FROM students s
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN regions r ON s.region_id = r.id
      LEFT JOIN student_extended_profiles sep ON s.id = sep.student_id
      WHERE s.id = $1 AND s.college_id = $2`,
      [studentId, collegeId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in your college',
      });
    }

    res.status(200).json({
      success: true,
      data: profileResult.rows[0],
    });
  } catch (error) {
    console.error('Get detailed student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student profile',
      error: error.message,
    });
  }
};

// @desc    Update single application status - COLLEGE SCOPED
// @route   PUT /api/placement-officer/applications/:applicationId/status
// @access  Private (Placement Officer)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, review_notes } = req.body;
    const collegeId = await getOfficerCollegeId(req.user.id);

    // Validate status
    const validStatuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    // Verify application belongs to officer's college
    const appCheck = await query(
      `SELECT ja.id FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       WHERE ja.id = $1 AND s.college_id = $2`,
      [applicationId, collegeId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found in your college',
      });
    }

    // Update application status
    const updateResult = await query(
      `UPDATE job_applications
       SET application_status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, job_id, student_id, application_status`,
      [status, req.user.id, review_notes, applicationId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_APPLICATION_STATUS',
      `Updated application ${applicationId} status to ${status}`,
      'job_application',
      applicationId,
      { status, review_notes },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message,
    });
  }
};

// @desc    Bulk update application status - COLLEGE SCOPED
// @route   POST /api/placement-officer/applications/bulk-update-status
// @access  Private (Placement Officer)
export const bulkUpdateApplicationStatus = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { application_ids, status, review_notes } = req.body;
    const collegeId = await getOfficerCollegeId(req.user.id);

    if (!application_ids || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No application IDs provided',
      });
    }

    // Validate status
    const validStatuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    // Verify all applications belong to officer's college
    const appCheck = await client.query(
      `SELECT ja.id FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       WHERE ja.id = ANY($1) AND s.college_id = $2`,
      [application_ids, collegeId]
    );

    if (appCheck.rows.length !== application_ids.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Some applications do not belong to your college',
      });
    }

    // Bulk update
    const updateResult = await client.query(
      `UPDATE job_applications
       SET application_status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($4)
       RETURNING id, job_id, student_id, application_status`,
      [status, req.user.id, review_notes, application_ids]
    );

    // Log activity for each
    for (const app of updateResult.rows) {
      await logActivity(
        req.user.id,
        'BULK_UPDATE_APPLICATION_STATUS',
        `Bulk updated application ${app.id} to ${status}`,
        'job_application',
        app.id,
        { status, review_notes },
        req
      );
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `${updateResult.rows.length} applications updated successfully`,
      data: updateResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application statuses',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// @desc    Update placement details for selected student - COLLEGE SCOPED
// @route   PUT /api/placement-officer/applications/:applicationId/placement
// @access  Private (Placement Officer)
export const updatePlacementDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { placement_package, joining_date, placement_location, placement_notes } = req.body;
    const collegeId = await getOfficerCollegeId(req.user.id);

    // Verify application belongs to officer's college and is selected
    const appCheck = await query(
      `SELECT ja.id, ja.application_status FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       WHERE ja.id = $1 AND s.college_id = $2`,
      [applicationId, collegeId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found in your college',
      });
    }

    if (appCheck.rows[0].application_status !== 'selected') {
      return res.status(400).json({
        success: false,
        message: 'Can only update placement details for selected applications',
      });
    }

    // Update placement details
    const updateResult = await query(
      `UPDATE job_applications
       SET placement_package = $1,
           joining_date = $2,
           placement_location = $3,
           placement_notes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, placement_package, joining_date, placement_location`,
      [placement_package, joining_date, placement_location, placement_notes, applicationId]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE_PLACEMENT_DETAILS',
      `Updated placement details for application ${applicationId}`,
      'job_application',
      applicationId,
      { placement_package, joining_date, placement_location },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Placement details updated successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update placement details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating placement details',
      error: error.message,
    });
  }
};

// @desc    Create or update job drive schedule
// @route   POST /api/placement-officer/jobs/:jobId/drive
// @access  Private (Placement Officer)
export const createOrUpdateJobDrive = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { drive_date, drive_time, drive_location, additional_instructions } = req.body;

    // Check if drive already exists
    const existingDrive = await query(
      'SELECT id FROM job_drives WHERE job_id = $1',
      [jobId]
    );

    let result;
    if (existingDrive.rows.length > 0) {
      // Update existing drive
      result = await query(
        `UPDATE job_drives
         SET drive_date = $1,
             drive_time = $2,
             drive_location = $3,
             additional_instructions = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $5
         RETURNING *`,
        [drive_date, drive_time, drive_location, additional_instructions, jobId]
      );

      await logActivity(
        req.user.id,
        'UPDATE_JOB_DRIVE',
        `Updated job drive for job ${jobId}`,
        'job_drive',
        result.rows[0].id,
        { drive_date, drive_time, drive_location },
        req
      );
    } else {
      // Create new drive
      result = await query(
        `INSERT INTO job_drives (job_id, drive_date, drive_time, drive_location, additional_instructions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [jobId, drive_date, drive_time, drive_location, additional_instructions, req.user.id]
      );

      await logActivity(
        req.user.id,
        'CREATE_JOB_DRIVE',
        `Created job drive for job ${jobId}`,
        'job_drive',
        result.rows[0].id,
        { drive_date, drive_time, drive_location },
        req
      );
    }

    res.status(200).json({
      success: true,
      message: existingDrive.rows.length > 0 ? 'Drive updated successfully' : 'Drive created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create/update job drive error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating/updating job drive',
      error: error.message,
    });
  }
};

// @desc    Get job drive schedule
// @route   GET /api/placement-officer/jobs/:jobId/drive
// @access  Private (Placement Officer)
export const getJobDrive = async (req, res) => {
  try {
    const { jobId } = req.params;

    const driveResult = await query(
      `SELECT jd.*, u.email as created_by_email
       FROM job_drives jd
       LEFT JOIN users u ON jd.created_by = u.id
       WHERE jd.job_id = $1`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      data: driveResult.rows.length > 0 ? driveResult.rows[0] : null,
    });
  } catch (error) {
    console.error('Get job drive error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job drive',
      error: error.message,
    });
  }
};

// @desc    Notify students about application status/drive - COLLEGE SCOPED
// @route   POST /api/placement-officer/applications/notify
// @access  Private (Placement Officer)
export const notifyApplicationStatus = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { application_ids, notification_type } = req.body;
    const collegeId = await getOfficerCollegeId(req.user.id);

    if (!application_ids || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No application IDs provided',
      });
    }

    const validTypes = ['drive_scheduled', 'shortlisted', 'selected', 'rejected'];
    if (!validTypes.includes(notification_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type',
      });
    }

    // Get applications with student and job details - COLLEGE SCOPED
    const applicationsResult = await client.query(
      `SELECT ja.id as application_id, ja.application_status, ja.placement_package,
              ja.joining_date, ja.placement_location,
              s.id as student_id, s.student_name, s.email,
              j.id as job_id, j.job_title, j.company_name,
              jd.drive_date, jd.drive_time, jd.drive_location
       FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       JOIN jobs j ON ja.job_id = j.id
       LEFT JOIN job_drives jd ON j.id = jd.job_id
       WHERE ja.id = ANY($1) AND s.college_id = $2`,
      [application_ids, collegeId]
    );

    if (applicationsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No applications found in your college',
      });
    }

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const app of applicationsResult.rows) {
      // Create notification title and message based on type
      let title, message;
      switch (notification_type) {
        case 'drive_scheduled':
          title = `Placement Drive Scheduled - ${app.company_name}`;
          message = `Placement drive for ${app.job_title} at ${app.company_name} is scheduled on ${app.drive_date} at ${app.drive_time}. Location: ${app.drive_location}`;
          break;
        case 'shortlisted':
          title = `Application Shortlisted - ${app.company_name}`;
          message = `Congratulations! You have been shortlisted for ${app.job_title} at ${app.company_name}.`;
          break;
        case 'selected':
          title = `Selected! - ${app.company_name}`;
          message = `Congratulations! You have been selected for ${app.job_title} at ${app.company_name}. Package: ${app.placement_package} LPA`;
          break;
        case 'rejected':
          title = `Application Status - ${app.company_name}`;
          message = `Your application for ${app.job_title} at ${app.company_name} was not selected. Keep applying!`;
          break;
      }

      // Create in-app notification
      const notifResult = await client.query(
        `INSERT INTO notifications (title, message, notification_type, target_type, created_by)
         VALUES ($1, $2, 'general', 'all', $3)
         RETURNING id`,
        [title, message, req.user.id]
      );

      const notificationId = notifResult.rows[0].id;

      // Link to student
      await client.query(
        `INSERT INTO notification_recipients (notification_id, user_id, is_read)
         VALUES ($1, (SELECT user_id FROM students WHERE id = $2), FALSE)`,
        [notificationId, app.student_id]
      );

      // Link to job
      await client.query(
        `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
         VALUES ($1, 'college', $2)`,
        [notificationId, app.student_id]
      );

      notificationsCreated++;

      // Send email based on notification type
      try {
        const jobDetails = {
          job_title: app.job_title,
          company_name: app.company_name,
        };

        switch (notification_type) {
          case 'drive_scheduled':
            const driveDetails = {
              drive_date: app.drive_date,
              drive_time: app.drive_time,
              drive_location: app.drive_location,
            };
            await sendDriveScheduleEmail(app.email, app.student_name, jobDetails, driveDetails);
            break;
          case 'shortlisted':
            await sendShortlistEmail(app.email, app.student_name, jobDetails);
            break;
          case 'selected':
            const placementDetails = {
              placement_package: app.placement_package,
              joining_date: app.joining_date,
              placement_location: app.placement_location,
            };
            await sendSelectionEmail(app.email, app.student_name, jobDetails, placementDetails);
            break;
          case 'rejected':
            await sendRejectionEmail(app.email, app.student_name, jobDetails);
            break;
        }
        emailsSent++;
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails
      }
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(
      req.user.id,
      'NOTIFY_APPLICATION_STATUS',
      `Sent ${notification_type} notifications to ${notificationsCreated} students`,
      'notification',
      null,
      { notification_type, count: notificationsCreated },
      req
    );

    res.status(200).json({
      success: true,
      message: `Notifications sent successfully`,
      notificationsCreated,
      emailsSent,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Notify application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notifications',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// @desc    Get job placement statistics - COLLEGE SCOPED
// @route   GET /api/placement-officer/jobs/:jobId/placement-stats
// @access  Private (Placement Officer)
export const getJobPlacementStats = async (req, res) => {
  try {
    const { jobId } = req.params;
    const collegeId = await getOfficerCollegeId(req.user.id);

    // Overall stats for officer's college
    const overallStats = await query(
      `SELECT
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE application_status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE application_status = 'under_review') as under_review,
        COUNT(*) FILTER (WHERE application_status = 'shortlisted') as shortlisted,
        COUNT(*) FILTER (WHERE application_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE application_status = 'selected') as selected,
        AVG(placement_package) FILTER (WHERE application_status = 'selected' AND placement_package IS NOT NULL) as avg_package,
        MAX(placement_package) FILTER (WHERE application_status = 'selected' AND placement_package IS NOT NULL) as max_package,
        MIN(placement_package) FILTER (WHERE application_status = 'selected' AND placement_package IS NOT NULL) as min_package
      FROM job_applications ja
      JOIN students s ON ja.student_id = s.id
      WHERE ja.job_id = $1 AND s.college_id = $2`,
      [jobId, collegeId]
    );

    res.status(200).json({
      success: true,
      data: overallStats.rows[0],
    });
  } catch (error) {
    console.error('Get job placement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching placement statistics',
      error: error.message,
    });
  }
};

// @desc    Enhanced export job applicants with extended filters - COLLEGE SCOPED
// @route   POST /api/placement-officer/jobs/:jobId/applicants/enhanced-export
// @access  Private (Placement Officer)
export const enhancedExportJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const collegeId = await getOfficerCollegeId(req.user.id);
    const {
      format = 'excel',
      pdf_fields = [],
      branches = [],
      application_statuses = [],
      sslc_min,
      twelfth_min,
      district,
      has_passport,
      has_aadhar,
      has_driving_license,
      has_pan,
      height_min,
      weight_min,
      physically_handicapped,
      use_short_names = true,
      include_signature = false,
    } = req.body;

    // Build dynamic WHERE clauses - COLLEGE SCOPED
    let whereConditions = [
      'ja.job_id = $1',
      's.college_id = $2',
      's.registration_status = \'approved\'',
      's.is_blacklisted = FALSE'
    ];
    let params = [jobId, collegeId];
    let paramIndex = 3;

    if (branches && branches.length > 0) {
      whereConditions.push(`s.branch = ANY($${paramIndex})`);
      params.push(branches);
      paramIndex++;
    }

    if (application_statuses && application_statuses.length > 0) {
      whereConditions.push(`ja.application_status = ANY($${paramIndex})`);
      params.push(application_statuses);
      paramIndex++;
    }

    if (sslc_min) {
      whereConditions.push(`sep.sslc_marks >= $${paramIndex}`);
      params.push(sslc_min);
      paramIndex++;
    }

    if (twelfth_min) {
      whereConditions.push(`sep.twelfth_marks >= $${paramIndex}`);
      params.push(twelfth_min);
      paramIndex++;
    }

    if (district) {
      whereConditions.push(`sep.district = $${paramIndex}`);
      params.push(district);
      paramIndex++;
    }

    if (has_passport !== undefined && has_passport !== null) {
      whereConditions.push(`sep.has_passport = $${paramIndex}`);
      params.push(has_passport);
      paramIndex++;
    }

    if (has_aadhar !== undefined && has_aadhar !== null) {
      whereConditions.push(`sep.has_aadhar_card = $${paramIndex}`);
      params.push(has_aadhar);
      paramIndex++;
    }

    if (has_driving_license !== undefined && has_driving_license !== null) {
      whereConditions.push(`s.has_driving_license = $${paramIndex}`);
      params.push(has_driving_license);
      paramIndex++;
    }

    if (has_pan !== undefined && has_pan !== null) {
      whereConditions.push(`s.has_pan_card = $${paramIndex}`);
      params.push(has_pan);
      paramIndex++;
    }

    if (height_min) {
      whereConditions.push(`COALESCE(sep.height_cm, s.height) >= $${paramIndex}`);
      params.push(height_min);
      paramIndex++;
    }

    if (weight_min) {
      whereConditions.push(`COALESCE(sep.weight_kg, s.weight) >= $${paramIndex}`);
      params.push(weight_min);
      paramIndex++;
    }

    if (physically_handicapped !== undefined && physically_handicapped !== null) {
      whereConditions.push(`sep.physically_handicapped = $${paramIndex}`);
      params.push(physically_handicapped);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Query with extended profile fields
    const applicantsResult = await query(
      `SELECT
        s.prn, s.student_name, s.email, s.mobile_number,
        c.college_name, r.region_name, s.branch, s.date_of_birth,
        s.programme_cgpa, s.backlog_count, s.gender,
        ja.applied_date, ja.application_status,
        j.job_title, j.company_name,
        sep.sslc_marks, sep.sslc_year, sep.sslc_board,
        sep.twelfth_marks, sep.twelfth_year, sep.twelfth_board,
        sep.district, sep.father_name, sep.mother_name,
        COALESCE(sep.height_cm, s.height) as height_cm,
        COALESCE(sep.weight_kg, s.weight) as weight_kg,
        sep.physically_handicapped,
        s.has_driving_license, s.has_pan_card,
        COALESCE(sep.has_aadhar_card, false) as has_aadhar_card,
        COALESCE(sep.has_passport, false) as has_passport,
        ja.placement_package, ja.joining_date, ja.placement_location
      FROM job_applications ja
      JOIN students s ON ja.student_id = s.id
      JOIN jobs j ON ja.job_id = j.id
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON c.region_id = r.id
      LEFT JOIN student_extended_profiles sep ON s.id = sep.student_id
      WHERE ${whereClause}
      ORDER BY ja.applied_date DESC`,
      params
    );

    const applicants = applicantsResult.rows;

    if (applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applicants found with the given filters',
      });
    }

    // Get job details
    const jobResult = await query(
      'SELECT job_title, company_name FROM jobs WHERE id = $1',
      [jobId]
    );
    const { job_title: jobTitle, company_name: companyName } = jobResult.rows[0];

    // Handle PDF export with custom fields
    if (format === 'pdf') {
      const { default: PDFDocument } = await import('pdfkit');

      // Determine which fields to include
      const fieldMap = {
        prn: { label: 'PRN', width: 70 },
        student_name: { label: 'Name', width: 100 },
        email: { label: 'Email', width: 120 },
        mobile_number: { label: 'Mobile', width: 80 },
        branch: { label: 'Branch', width: 80 },
        programme_cgpa: { label: 'CGPA', width: 50 },
        backlog_count: { label: 'Backlogs', width: 60 },
        application_status: { label: 'Status', width: 70 },
        date_of_birth: { label: 'DOB', width: 70 },
        gender: { label: 'Gender', width: 50 },
        sslc_marks: { label: 'SSLC %', width: 50 },
        twelfth_marks: { label: '12th %', width: 50 },
        district: { label: 'District', width: 80 },
        has_passport: { label: 'Passport', width: 60 },
        has_aadhar_card: { label: 'Aadhar', width: 60 },
        has_driving_license: { label: 'DL', width: 50 },
        has_pan_card: { label: 'PAN', width: 50 },
        height_cm: { label: 'Height', width: 50 },
        weight_kg: { label: 'Weight', width: 50 },
      };

      const selectedFields = pdf_fields.length > 0
        ? pdf_fields.filter(field => fieldMap[field])
        : ['prn', 'student_name', 'branch', 'programme_cgpa', 'application_status'];

      // Signature column config
      const signatureWidth = include_signature ? 70 : 0;

      // Determine orientation based on number of selected fields
      // Portrait: <= 6 fields, Landscape: > 6 fields
      const totalCols = selectedFields.length + (include_signature ? 1 : 0);
      const layout = totalCols <= 6 ? 'portrait' : 'landscape';
      const pageMargin = 25;

      const doc = new PDFDocument({
        margin: pageMargin,
        size: 'A4',
        layout: layout
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=job_applicants_${jobTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`
      );

      doc.pipe(res);

      // Function to draw border on current page
      const drawPageBorder = () => {
        doc.save();
        doc.strokeColor('#000000')
           .lineWidth(2)
           .rect(pageMargin, pageMargin, doc.page.width - (2 * pageMargin), doc.page.height - (2 * pageMargin))
           .stroke();
        doc.restore();
      };

      // Draw border on first page
      drawPageBorder();

      // Title (start at y=40 for proper spacing from top border at 25)
      doc.fontSize(16).font('Helvetica-Bold').text(`Job Applicants - ${jobTitle}`, 0, 40, { width: doc.page.width, align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Company: ${companyName}`, 0, 60, { width: doc.page.width, align: 'center' });
      doc.fontSize(10).text(`Total Applicants: ${applicants.length}`, 0, 77, { width: doc.page.width, align: 'center' });
      doc.moveDown();

      // Calculate table positioning with proper margins
      const availableWidth = doc.page.width - (2 * pageMargin);
      const tableWidth = selectedFields.reduce((sum, field) => sum + (fieldMap[field]?.width || 60), 0) + signatureWidth;

      // Use left alignment with margin if table is too wide, otherwise center
      const startX = tableWidth > availableWidth ? pageMargin : (doc.page.width - tableWidth) / 2;
      let currentY = doc.y + 10; // Add spacing after header

      // Helper: draw header row (fields + optional signature)
      const drawHeaderRow = (y) => {
        let x = startX;
        doc.fontSize(9).font('Helvetica-Bold');
        selectedFields.forEach(field => {
          doc.rect(x, y, fieldMap[field].width, 20).stroke();
          doc.text(fieldMap[field].label, x + 5, y + 5, {
            width: fieldMap[field].width - 10,
            align: 'left'
          });
          x += fieldMap[field].width;
        });
        if (include_signature) {
          doc.rect(x, y, signatureWidth, 20).fillAndStroke('#F3F4F6', '#000000');
          doc.fillColor('#000000').text('Signature', x + 5, y + 5, {
            width: signatureWidth - 10,
            align: 'center'
          });
        }
      };

      // Draw table header
      drawHeaderRow(currentY);
      currentY += 20;

      // Draw table rows
      doc.fontSize(8).font('Helvetica');
      applicants.forEach((applicant, index) => {
        // Check if we need a new page
        if (currentY > doc.page.height - 50) {
          doc.addPage();
          drawPageBorder(); // Draw border on new page
          currentY = 50;

          // Redraw header on new page
          drawHeaderRow(currentY);
          currentY += 20;
          doc.fontSize(8).font('Helvetica');
        }

        let currentX = startX;
        selectedFields.forEach(field => {
          let value = applicant[field];

          // Format values
          if (field === 'date_of_birth' && value) {
            value = new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
          } else if (field === 'branch' && use_short_names && value) {
            value = BRANCH_SHORT_NAMES[value] || value;
          } else if (field.startsWith('has_') && typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
          } else if (value === null || value === undefined) {
            value = '-';
          }

          doc.rect(currentX, currentY, fieldMap[field].width, 15).stroke();
          doc.text(String(value), currentX + 5, currentY + 3, {
            width: fieldMap[field].width - 10,
            align: 'left'
          });
          currentX += fieldMap[field].width;
        });
        // Signature cell (empty for student to sign)
        if (include_signature) {
          doc.rect(currentX, currentY, signatureWidth, 15).stroke();
        }
        currentY += 15;
      });

      // Add branch legend if using short names and branch field is included
      if (use_short_names && selectedFields.includes('branch')) {
        const uniqueBranches = [...new Set(applicants.map(a => a.branch).filter(Boolean))];

        if (uniqueBranches.length > 0) {
          // Add a new page for the legend - maintain the same orientation
          doc.addPage({
            margin: pageMargin,
            size: 'A4',
            layout: layout
          });

          // Draw border on legend page
          drawPageBorder();

          let currentY = 40;

          // Draw title
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .fillColor('black')
             .text('BRANCH CODE REFERENCE', 0, currentY, {
               width: doc.page.width,
               align: 'center'
             });
          currentY += 35;

          // Sort branches alphabetically
          const sortedBranches = [...uniqueBranches].sort();

          // Calculate layout (single or two-column)
          const numBranches = sortedBranches.length;
          const numColumns = numBranches > 12 ? 2 : 1;

          if (numColumns === 1) {
            // Single column layout
            const tableWidth = 450;
            const startX = (doc.page.width - tableWidth) / 2;
            const colWidths = { shortName: 100, fullName: 350 };
            const headerHeight = 30;
            const rowHeight = 25;

            // Draw headers
            doc.lineWidth(1).strokeColor('#4B5563');
            doc.rect(startX, currentY, colWidths.shortName, headerHeight)
               .fillAndStroke('#4B5563', '#4B5563');
            doc.rect(startX + colWidths.shortName, currentY, colWidths.fullName, headerHeight)
               .fillAndStroke('#4B5563', '#4B5563');

            doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
            doc.text('Code', startX + 2, currentY + 10, {
              width: colWidths.shortName - 4,
              align: 'center'
            });
            doc.text('Branch Name', startX + colWidths.shortName + 2, currentY + 10, {
              width: colWidths.fullName - 4,
              align: 'center'
            });

            currentY += headerHeight;

            // Draw rows
            doc.lineWidth(0.5).strokeColor('#E5E7EB');
            sortedBranches.forEach((branch, index) => {
              const shortName = BRANCH_SHORT_NAMES[branch] || branch;
              const fillColor = index % 2 === 0 ? '#F9FAFB' : 'white';

              doc.rect(startX, currentY, colWidths.shortName, rowHeight)
                 .fillAndStroke(fillColor, '#E5E7EB');
              doc.rect(startX + colWidths.shortName, currentY, colWidths.fullName, rowHeight)
                 .fillAndStroke(fillColor, '#E5E7EB');

              doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
              doc.text(shortName, startX + 2, currentY + 8, {
                width: colWidths.shortName - 4,
                align: 'center'
              });

              doc.font('Helvetica');
              doc.text(branch, startX + colWidths.shortName + 2, currentY + 8, {
                width: colWidths.fullName - 4,
                align: 'left'
              });

              currentY += rowHeight;
            });
          } else {
            // Two column layout
            const tableWidth = 720;
            const startX = (doc.page.width - tableWidth) / 2;
            const columnWidth = tableWidth / 2;
            const colWidths = { shortName: 70, fullName: columnWidth - 70 };
            const midpoint = Math.ceil(sortedBranches.length / 2);
            const leftBranches = sortedBranches.slice(0, midpoint);
            const rightBranches = sortedBranches.slice(midpoint);
            const headerHeight = 30;
            const rowHeight = 25;

            doc.lineWidth(1).strokeColor('#4B5563');

            // Draw headers for both columns
            for (let col = 0; col < 2; col++) {
              const colStartX = startX + (col * columnWidth);
              doc.rect(colStartX, currentY, colWidths.shortName, headerHeight)
                 .fillAndStroke('#4B5563', '#4B5563');
              doc.rect(colStartX + colWidths.shortName, currentY, colWidths.fullName, headerHeight)
                 .fillAndStroke('#4B5563', '#4B5563');

              doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
              doc.text('Code', colStartX + 2, currentY + 10, {
                width: colWidths.shortName - 4,
                align: 'center'
              });
              doc.text('Branch Name', colStartX + colWidths.shortName + 2, currentY + 10, {
                width: colWidths.fullName - 4,
                align: 'center'
              });
            }

            currentY += headerHeight;

            // Draw rows for both columns
            doc.lineWidth(0.5).strokeColor('#E5E7EB');
            const maxRows = Math.max(leftBranches.length, rightBranches.length);

            for (let row = 0; row < maxRows; row++) {
              // Left column
              if (row < leftBranches.length) {
                const branch = leftBranches[row];
                const shortName = BRANCH_SHORT_NAMES[branch] || branch;
                const fillColor = row % 2 === 0 ? '#F9FAFB' : 'white';
                const colStartX = startX;

                doc.rect(colStartX, currentY, colWidths.shortName, rowHeight)
                   .fillAndStroke(fillColor, '#E5E7EB');
                doc.rect(colStartX + colWidths.shortName, currentY, colWidths.fullName, rowHeight)
                   .fillAndStroke(fillColor, '#E5E7EB');

                doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
                doc.text(shortName, colStartX + 2, currentY + 8, {
                  width: colWidths.shortName - 4,
                  align: 'center'
                });

                doc.font('Helvetica');
                doc.text(branch, colStartX + colWidths.shortName + 2, currentY + 8, {
                  width: colWidths.fullName - 4,
                  align: 'left',
                  lineBreak: false,
                  ellipsis: true
                });
              }

              // Right column
              if (row < rightBranches.length) {
                const branch = rightBranches[row];
                const shortName = BRANCH_SHORT_NAMES[branch] || branch;
                const fillColor = row % 2 === 0 ? '#F9FAFB' : 'white';
                const colStartX = startX + columnWidth;

                doc.rect(colStartX, currentY, colWidths.shortName, rowHeight)
                   .fillAndStroke(fillColor, '#E5E7EB');
                doc.rect(colStartX + colWidths.shortName, currentY, colWidths.fullName, rowHeight)
                   .fillAndStroke(fillColor, '#E5E7EB');

                doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
                doc.text(shortName, colStartX + 2, currentY + 8, {
                  width: colWidths.shortName - 4,
                  align: 'center'
                });

                doc.font('Helvetica');
                doc.text(branch, colStartX + colWidths.shortName + 2, currentY + 8, {
                  width: colWidths.fullName - 4,
                  align: 'left',
                  lineBreak: false,
                  ellipsis: true
                });
              }

              currentY += rowHeight;
            }
          }
        }
      }

      doc.end();

      // Log activity
      await logActivity(
        req.user.id,
        'EXPORT_JOB_APPLICANTS',
        `Exported ${applicants.length} applicants as PDF for job: ${jobTitle}`,
        'job',
        jobId,
        { count: applicants.length, format: 'pdf', fields: selectedFields },
        req
      );

      return;
    }

    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Applicants');

    // Define columns
    worksheet.columns = [
      { header: 'PRN', key: 'prn', width: 15 },
      { header: 'Name', key: 'student_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile', key: 'mobile_number', width: 15 },
      { header: 'College', key: 'college_name', width: 35 },
      { header: 'Branch', key: 'branch', width: 12 },
      { header: 'CGPA', key: 'programme_cgpa', width: 10 },
      { header: 'Backlogs', key: 'backlog_count', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'DOB', key: 'date_of_birth', width: 12 },
      { header: 'Status', key: 'application_status', width: 15 },
      { header: 'Applied Date', key: 'applied_date', width: 12 },
      { header: 'SSLC %', key: 'sslc_marks', width: 10 },
      { header: 'SSLC Year', key: 'sslc_year', width: 10 },
      { header: '12th %', key: 'twelfth_marks', width: 10 },
      { header: '12th Year', key: 'twelfth_year', width: 10 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'Father Name', key: 'father_name', width: 25 },
      { header: 'Height (cm)', key: 'height_cm', width: 12 },
      { header: 'Weight (kg)', key: 'weight_kg', width: 12 },
      { header: 'Disability', key: 'physically_handicapped', width: 12 },
      { header: 'Has DL', key: 'has_driving_license', width: 10 },
      { header: 'Has PAN', key: 'has_pan_card', width: 10 },
      { header: 'Has Aadhar', key: 'has_aadhar_card', width: 10 },
      { header: 'Has Passport', key: 'has_passport', width: 12 },
      { header: 'Package (LPA)', key: 'placement_package', width: 12 },
      { header: 'Joining Date', key: 'joining_date', width: 12 },
      { header: 'Location', key: 'placement_location', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data rows
    applicants.forEach((applicant) => {
      worksheet.addRow({
        ...applicant,
        date_of_birth: applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        applied_date: applicant.applied_date ? new Date(applicant.applied_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        joining_date: applicant.joining_date ? new Date(applicant.joining_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        physically_handicapped: applicant.physically_handicapped ? 'Yes' : 'No',
        has_driving_license: applicant.has_driving_license ? 'Yes' : 'No',
        has_pan_card: applicant.has_pan_card ? 'Yes' : 'No',
        has_aadhar_card: applicant.has_aadhar_card ? 'Yes' : 'No',
        has_passport: applicant.has_passport ? 'Yes' : 'No',
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=job_applicants_${jobTitle.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity
    await logActivity(
      req.user.id,
      'EXPORT_JOB_APPLICANTS',
      `Exported ${applicants.length} applicants for job: ${jobTitle} (College-scoped)`,
      'job',
      jobId,
      {
        count: applicants.length,
        format: 'excel',
        company: companyName,
        college_scoped: true,
      },
      req
    );
  } catch (error) {
    console.error('Enhanced export job applicants error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error exporting job applicants',
        error: error.message,
      });
    }
  }
};

// ========================================
// PLACEMENT POSTER
// ========================================

/**
 * @desc    Get placement poster statistics for placement officer's college
 * @route   GET /api/placement-officer/placement-poster/stats
 * @access  Private (Placement Officer)
 */
export const getPlacementPosterStats = async (req, res) => {
  try {
    console.log('📊 [PLACEMENT POSTER STATS] Request from user:', req.user.id);

    // Get placement officer's college ID
    const officerResult = await query(
      `SELECT po.college_id, c.college_name, c.logo_url
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id: collegeId, college_name: collegeName, logo_url: logoUrl } = officerResult.rows[0];

    console.log(`📊 [PLACEMENT POSTER STATS] College: ${collegeName} (ID: ${collegeId})`);

    // Get placement statistics
    // Note: Package comes from job's salary_package, not per-student placement_package
    // All students selected for a job get the same LPA from the job posting
    const statsQuery = `
      SELECT
        COUNT(DISTINCT ja.student_id) as total_students_placed,
        COUNT(DISTINCT j.company_name) as total_companies,
        COALESCE(MAX(CAST(j.salary_package AS DECIMAL)), 0) as highest_package,
        COALESCE(AVG(CAST(j.salary_package AS DECIMAL)), 0) as average_package,
        EXTRACT(YEAR FROM MIN(COALESCE(ja.joining_date, CURRENT_DATE))) as start_year,
        EXTRACT(YEAR FROM MAX(COALESCE(ja.joining_date, CURRENT_DATE))) as end_year
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN students s ON ja.student_id = s.id
      WHERE ja.application_status = 'selected'
        AND s.college_id = $1
        AND s.is_blacklisted = FALSE
        AND j.salary_package IS NOT NULL
        AND j.salary_package != ''
    `;

    const statsResult = await query(statsQuery, [collegeId]);
    const stats = statsResult.rows[0];

    // Get company-wise breakdown (shows job's posted salary package)
    // All students placed in a job get the same LPA from the job posting
    const companiesQuery = `
      SELECT
        j.company_name,
        j.salary_package as lpa,
        COUNT(DISTINCT ja.student_id) as student_count
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN students s ON ja.student_id = s.id
      WHERE ja.application_status = 'selected'
        AND s.college_id = $1
        AND s.is_blacklisted = FALSE
        AND j.salary_package IS NOT NULL
        AND j.salary_package != ''
      GROUP BY j.company_name, j.salary_package
      ORDER BY CAST(j.salary_package AS DECIMAL) DESC, j.company_name ASC
    `;

    const companiesResult = await query(companiesQuery, [collegeId]);

    console.log(`✅ [PLACEMENT POSTER STATS] ${stats.total_students_placed} students placed across ${stats.total_companies} companies`);

    // Log activity
    await logActivity(
      req.user.id,
      'PLACEMENT_POSTER_STATS_VIEWED',
      `Viewed placement poster statistics for ${collegeName}`,
      'college',
      collegeId,
      req
    );

    res.status(200).json({
      success: true,
      data: {
        college_id: collegeId,
        college_name: collegeName,
        college_logo_url: logoUrl,
        total_students_placed: parseInt(stats.total_students_placed) || 0,
        total_companies: parseInt(stats.total_companies) || 0,
        highest_package: parseFloat(stats.highest_package) || 0,
        average_package: Math.round((parseFloat(stats.average_package) || 0) * 100) / 100, // Round to 2 decimals
        placement_year_start: parseInt(stats.start_year) || new Date().getFullYear(),
        placement_year_end: parseInt(stats.end_year) || new Date().getFullYear(),
        company_breakdown: companiesResult.rows.map(company => ({
          company_name: company.company_name,
          lpa: parseFloat(company.lpa),
          student_count: parseInt(company.student_count)
        }))
      }
    });

  } catch (error) {
    console.error('❌ [PLACEMENT POSTER STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching placement poster statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Generate placement poster PDF for placement officer's college
 * @route   POST /api/placement-officer/placement-poster/generate
 * @access  Private (Placement Officer)
 */
export const generatePlacementPoster = async (req, res) => {
  try {
    console.log('🎨 [PLACEMENT POSTER] Generation request from user:', req.user.id);

    // Get placement officer's college ID and details
    const officerResult = await query(
      `SELECT po.college_id, c.college_name, c.logo_url
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id: collegeId, college_name: collegeName, logo_url: logoUrl } = officerResult.rows[0];

    // College logo is mandatory for placement officer poster generation
    if (!logoUrl) {
      return res.status(400).json({
        success: false,
        message: 'College logo is required to generate the placement poster. Please upload your college logo from your Profile page.',
      });
    }

    console.log(`🎨 [PLACEMENT POSTER] Generating for college: ${collegeName} (ID: ${collegeId})`);

    // Fetch all placed students with complete details
    // Use job's salary_package since all students get the same LPA for a job
    const placementsQuery = `
      SELECT
        s.id,
        s.student_name,
        s.branch,
        s.photo_url,
        s.prn,
        s.gender,
        s.email,
        s.mobile_number,
        j.company_name,
        CAST(j.salary_package AS DECIMAL) as lpa,
        ja.joining_date,
        ja.placement_location
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN students s ON ja.student_id = s.id
      WHERE ja.application_status = 'selected'
        AND j.salary_package IS NOT NULL
        AND j.salary_package != ''
        AND s.college_id = $1
        AND s.is_blacklisted = FALSE
      ORDER BY CAST(j.salary_package AS DECIMAL) DESC, s.student_name ASC
    `;

    const placementsResult = await query(placementsQuery, [collegeId]);

    if (placementsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No placement data available for this college. Ensure students have been marked as selected with placement packages.',
      });
    }

    console.log(`📊 [PLACEMENT POSTER] Found ${placementsResult.rows.length} placed students`);

    // Calculate year range from joining dates
    const yearQuery = `
      SELECT
        EXTRACT(YEAR FROM MIN(ja.joining_date)) as start_year,
        EXTRACT(YEAR FROM MAX(ja.joining_date)) as end_year
      FROM job_applications ja
      JOIN students s ON ja.student_id = s.id
      WHERE ja.application_status = 'selected'
        AND ja.placement_package IS NOT NULL
        AND s.college_id = $1
    `;

    const yearResult = await query(yearQuery, [collegeId]);
    const { start_year: startYear, end_year: endYear } = yearResult.rows[0];

    // Prepare options for PDF generation
    const options = {
      collegeName,
      collegeLogo: logoUrl || null,
      startYear: startYear || new Date().getFullYear(),
      endYear: endYear || new Date().getFullYear()
    };

    console.log(`📄 [PLACEMENT POSTER] Generating PDF for ${startYear}-${endYear}`);

    // Log activity BEFORE generation
    await logActivity(
      req.user.id,
      'PLACEMENT_POSTER_GENERATED',
      `Generated placement poster for ${collegeName} (${placementsResult.rows.length} students)`,
      'college',
      collegeId,
      req
    );

    // Generate PDF (function handles response streaming)
    await generatePlacementPosterPDF(placementsResult.rows, options, res);

  } catch (error) {
    console.error('❌ [PLACEMENT POSTER] Generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating placement poster',
        error: error.message,
      });
    }
  }
};

// ========================================
// COLLEGE LOGO MANAGEMENT
// ========================================

/**
 * @desc    Upload/Update college logo (Placement Officer)
 * @route   POST /api/placement-officer/college/logo
 * @access  Private (Placement Officer)
 */
export const uploadCollegeLogo = async (req, res) => {
  try {
    const { logo } = req.body; // Base64 encoded image

    if (!logo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a logo image',
      });
    }

    // Validate logo size (max 2MB for logo)
    const logoValidation = validateImageSize(logo);
    if (!logoValidation.valid) {
      return res.status(400).json({
        success: false,
        message: logoValidation.message,
      });
    }

    // Get officer's college details
    const officerResult = await query(
      `SELECT po.college_id, c.college_name, c.college_code, c.logo_url, c.logo_cloudinary_id
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id, college_name, college_code, logo_url: oldLogoUrl, logo_cloudinary_id: oldLogoId } = officerResult.rows[0];

    // Delete old logo from Cloudinary if exists
    if (oldLogoId) {
      try {
        await deleteImage(oldLogoId);
        console.log(`🗑️ Deleted old college logo: ${oldLogoId}`);
      } catch (deleteError) {
        console.error('⚠️ Error deleting old logo (continuing anyway):', deleteError.message);
      }
    }

    // Sanitize college name for folder path (remove spaces and special characters)
    const collegeFolderName = college_name
      .replace(/[^a-zA-Z0-9]/g, '_')  // Replace special chars with underscore
      .replace(/_+/g, '_')             // Replace multiple underscores with single
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores

    console.log('🏛️ College Name:', college_name);
    console.log('📁 Sanitized Folder Name:', collegeFolderName);

    // Upload new logo to Cloudinary
    // Organize logos: college_logos/{college_name}/logo_{timestamp}
    const folderPath = `college_logos/${collegeFolderName}`;
    const publicId = `logo_${Date.now()}`;

    console.log('📤 Uploading college logo to folder:', folderPath);
    console.log('📤 Public ID:', publicId);

    const uploadResult = await uploadImage(logo, folderPath, publicId);

    console.log('✅ College logo upload successful! Full public ID:', uploadResult.publicId);

    // Update college with new logo
    const updateResult = await query(
      `UPDATE colleges
       SET logo_url = $1,
           logo_cloudinary_id = $2,
           logo_uploaded_at = NOW()
       WHERE id = $3
       RETURNING logo_url, logo_uploaded_at`,
      [uploadResult.url, uploadResult.publicId, college_id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'COLLEGE_LOGO_UPLOADED',
      `Uploaded college logo for ${college_name}`,
      'college',
      college_id,
      req
    );

    res.status(200).json({
      success: true,
      message: 'College logo uploaded successfully',
      data: {
        logo_url: updateResult.rows[0].logo_url,
        uploaded_at: updateResult.rows[0].logo_uploaded_at,
      },
    });
  } catch (error) {
    console.error('❌ Upload college logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading college logo',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete college logo (Placement Officer)
 * @route   DELETE /api/placement-officer/college/logo
 * @access  Private (Placement Officer)
 */
export const deleteCollegeLogo = async (req, res) => {
  try {
    // Get officer's college details
    const officerResult = await query(
      `SELECT po.college_id, c.college_name, c.logo_url, c.logo_cloudinary_id
       FROM placement_officers po
       JOIN colleges c ON po.college_id = c.id
       WHERE po.user_id = $1`,
      [req.user.id]
    );

    if (officerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Placement officer profile not found',
      });
    }

    const { college_id, college_name, logo_url, logo_cloudinary_id } = officerResult.rows[0];

    if (!logo_url) {
      return res.status(404).json({
        success: false,
        message: 'No logo found to delete',
      });
    }

    // Delete from Cloudinary
    if (logo_cloudinary_id) {
      try {
        await deleteImage(logo_cloudinary_id);
        console.log(`🗑️ Deleted college logo from Cloudinary: ${logo_cloudinary_id}`);
      } catch (deleteError) {
        console.error('⚠️ Error deleting from Cloudinary:', deleteError.message);
      }
    }

    // Remove logo from database
    await query(
      `UPDATE colleges
       SET logo_url = NULL,
           logo_cloudinary_id = NULL,
           logo_uploaded_at = NULL
       WHERE id = $1`,
      [college_id]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'COLLEGE_LOGO_DELETED',
      `Deleted college logo for ${college_name}`,
      'college',
      college_id,
      req
    );

    res.status(200).json({
      success: true,
      message: 'College logo deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete college logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting college logo',
      error: error.message,
    });
  }
};

// ========================================
// MANUAL STUDENT ADDITION TO JOBS
// ========================================

/**
 * Check if student is already selected for other jobs
 * @param {number} studentId - Student ID to check
 * @param {number} excludeJobId - Optional job ID to exclude from check
 * @returns {Promise<Array>} Array of existing placements
 */
const checkExistingPlacements = async (studentId, excludeJobId = null) => {
  let queryText = `
    SELECT
      ja.id as application_id,
      ja.job_id,
      j.company_name,
      j.job_title,
      j.salary_package,
      ja.placement_package,
      ja.joining_date,
      ja.is_manual_addition
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.student_id = $1
      AND ja.application_status = 'selected'
  `;

  const params = [studentId];

  if (excludeJobId) {
    queryText += ' AND ja.job_id != $2';
    params.push(excludeJobId);
  }

  queryText += ' ORDER BY ja.updated_at DESC';

  const result = await query(queryText, params);
  return result.rows;
};

// @desc    Manually add student to job (for students who didn't apply but got selected)
// @route   POST /api/placement-officer/manually-add-student-to-job
// @access  Private (Placement Officer)
export const manuallyAddStudentToJob = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      job_id,
      student_prn,
      placement_package,
      joining_date,
      placement_location,
      notes,
    } = req.body;

    const collegeId = await getOfficerCollegeId(req.user.id);

    // Validation
    if (!job_id || !student_prn) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Job ID and Student PRN are required',
      });
    }

    // Notes are optional but validated if provided
    if (notes && notes.trim().length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Notes cannot be empty if provided',
      });
    }

    // Verify job exists
    const jobCheck = await client.query(
      `SELECT id, company_name, job_title, salary_package
       FROM jobs
       WHERE id = $1`,
      [job_id]
    );

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobCheck.rows[0];

    // Find student by PRN and verify belongs to officer's college
    const studentResult = await client.query(
      `SELECT id, student_name, prn, branch, email, programme_cgpa, backlog_count, is_blacklisted
       FROM students
       WHERE prn = $1 AND college_id = $2`,
      [student_prn, collegeId]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Student not found in your college',
      });
    }

    const student = studentResult.rows[0];

    // Check if student is blacklisted
    if (student.is_blacklisted) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Cannot add blacklisted student to job',
      });
    }

    // Check if student already has an application for this job
    const existingAppResult = await client.query(
      `SELECT id, application_status
       FROM job_applications
       WHERE job_id = $1 AND student_id = $2`,
      [job_id, student.id]
    );

    // Check for existing placements in other jobs (informational only)
    const existingPlacements = await checkExistingPlacements(student.id, job_id);

    // Prepare application data
    const packageToUse = placement_package || job.salary_package;
    const reviewNotes = notes
      ? `[MANUAL ADDITION by Placement Officer on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]\n${notes}`
      : `[MANUAL ADDITION by Placement Officer on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]`;

    let application;
    let isUpdate = false;

    // If existing application, update it; otherwise create new one
    if (existingAppResult.rows.length > 0) {
      const existingApp = existingAppResult.rows[0];
      isUpdate = true;

      // Update existing application to 'selected' status
      const updateResult = await client.query(
        `UPDATE job_applications
         SET application_status = $1,
             reviewed_by = $2,
             reviewed_at = CURRENT_TIMESTAMP,
             review_notes = $3,
             placement_package = $4,
             joining_date = $5,
             placement_location = $6,
             is_manual_addition = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, job_id, student_id, application_status, placement_package, joining_date, placement_location`,
        [
          'selected',
          req.user.id,
          reviewNotes,
          packageToUse,
          joining_date || null,
          placement_location || null,
          existingApp.id,
        ]
      );

      application = updateResult.rows[0];
    } else {
      // Create new manual application entry with status 'selected'
      const insertResult = await client.query(
        `INSERT INTO job_applications (
          job_id,
          student_id,
          application_status,
          reviewed_by,
          reviewed_at,
          review_notes,
          placement_package,
          joining_date,
          placement_location,
          is_manual_addition,
          applied_date,
          updated_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, job_id, student_id, application_status, placement_package, joining_date, placement_location`,
        [
          job_id,
          student.id,
          'selected',
          req.user.id,
          reviewNotes,
          packageToUse,
          joining_date || null,
          placement_location || null,
        ]
      );

      application = insertResult.rows[0];
    }

    const newApplication = application;

    // Log activity
    await logActivity(
      req.user.id,
      isUpdate ? 'MANUAL_STUDENT_UPDATE' : 'MANUAL_STUDENT_ADDITION',
      isUpdate
        ? `Updated student ${student.student_name} (PRN: ${student_prn}) application to selected for job ${job.company_name} - ${job.job_title}`
        : `Manually added student ${student.student_name} (PRN: ${student_prn}) to job ${job.company_name} - ${job.job_title}`,
      'job_application',
      newApplication.id,
      {
        job_id,
        student_id: student.id,
        student_prn,
        placement_package: packageToUse,
        notes,
        is_update: isUpdate,
      },
      req
    );

    await client.query('COMMIT');

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? 'Student application updated to selected successfully'
        : 'Student manually added to job successfully',
      data: {
        application: newApplication,
        student: {
          id: student.id,
          name: student.student_name,
          prn: student.prn,
          branch: student.branch,
          cgpa: student.programme_cgpa,
          backlog_count: student.backlog_count,
        },
        job: {
          id: job.id,
          company_name: job.company_name,
          job_title: job.job_title,
          salary_package: job.salary_package,
        },
        existing_placements: existingPlacements.length > 0 ? existingPlacements : null,
        warning:
          existingPlacements.length > 0
            ? `Student already has ${existingPlacements.length} existing placement(s)`
            : null,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Manual student addition error:', error);
    res.status(500).json({
      success: false,
      message: 'Error manually adding student to job',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// @desc    Validate student PRN for manual addition (check student details before adding)
// @route   POST /api/placement-officer/validate-student-for-manual-addition
// @access  Private (Placement Officer)
export const validateStudentForManualAddition = async (req, res) => {
  try {
    const { student_prn, job_id } = req.body;
    const collegeId = await getOfficerCollegeId(req.user.id);

    if (!student_prn) {
      return res.status(400).json({
        success: false,
        message: 'Student PRN is required',
      });
    }

    // Find student by PRN and verify belongs to officer's college
    const studentResult = await query(
      `SELECT id, student_name, prn, branch, email, programme_cgpa, backlog_count,
              is_blacklisted, photo_url, gender
       FROM students
       WHERE prn = $1 AND college_id = $2`,
      [student_prn, collegeId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in your college',
      });
    }

    const student = studentResult.rows[0];

    // Check if blacklisted
    if (student.is_blacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Student is blacklisted and cannot be added to jobs',
        student: {
          id: student.id,
          name: student.student_name,
          prn: student.prn,
          is_blacklisted: true,
        },
      });
    }

    // If job_id provided, check if already applied
    let existingApplication = null;
    if (job_id) {
      const appResult = await query(
        `SELECT id, application_status
         FROM job_applications
         WHERE job_id = $1 AND student_id = $2`,
        [job_id, student.id]
      );

      if (appResult.rows.length > 0) {
        existingApplication = appResult.rows[0];
      }
    }

    // Check for existing placements
    const existingPlacements = await checkExistingPlacements(
      student.id,
      job_id || null
    );

    res.status(200).json({
      success: true,
      message: 'Student validated successfully',
      data: {
        student: {
          id: student.id,
          name: student.student_name,
          prn: student.prn,
          branch: student.branch,
          email: student.email,
          cgpa: student.programme_cgpa,
          backlog_count: student.backlog_count,
          photo_url: student.photo_url,
          gender: student.gender,
        },
        existing_application: existingApplication,
        existing_placements: existingPlacements,
        can_add: !student.is_blacklisted,
        warnings: [
          ...(existingApplication
            ? [
                existingApplication.application_status === 'selected'
                  ? 'Student is already selected for this job. Adding again will update the existing record.'
                  : `Student already has an application for this job (Status: ${existingApplication.application_status}). Adding will update it to selected.`,
              ]
            : []),
          ...(existingPlacements.length > 0
            ? [
                `Student already has ${existingPlacements.length} existing placement(s). Students can have multiple offers.`,
              ]
            : []),
        ],
      },
    });
  } catch (error) {
    console.error('❌ Validate student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating student',
      error: error.message,
    });
  }
};

// ========================================
// CGPA LOCK/UNLOCK MANAGEMENT
// ========================================

// @desc    Get CGPA lock status for officer's college
// @route   GET /api/placement-officer/cgpa-lock-status
// @access  Private (Placement Officer)
export const getCgpaLockStatusPO = async (req, res) => {
  try {
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    const unlockResult = await query(
      `SELECT id, unlock_end, reason, created_at FROM cgpa_unlock_windows
       WHERE (college_id = $1 OR college_id IS NULL)
       AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
       ORDER BY unlock_end DESC LIMIT 1`,
      [collegeId]
    );

    const isUnlocked = unlockResult.rows.length > 0;
    res.json({
      success: true,
      data: {
        is_locked: !isUnlocked,
        unlock_window: isUnlocked ? unlockResult.rows[0] : null,
      },
    });
  } catch (error) {
    console.error('Get CGPA lock status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching CGPA lock status' });
  }
};

// @desc    Unlock CGPA editing for college students
// @route   POST /api/placement-officer/cgpa-unlock
// @access  Private (Placement Officer)
export const unlockCgpaPO = async (req, res) => {
  try {
    const { unlock_days, reason } = req.body;

    if (!unlock_days || unlock_days < 1 || unlock_days > 30) {
      return res.status(400).json({
        success: false,
        message: 'Unlock duration must be between 1 and 30 days',
      });
    }

    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    // Deactivate any existing unlock windows for this college
    await query(
      `UPDATE cgpa_unlock_windows SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE (college_id = $1 OR college_id IS NULL) AND is_active = TRUE`,
      [collegeId]
    );

    // Create new unlock window
    const unlockResult = await query(
      `INSERT INTO cgpa_unlock_windows (college_id, unlocked_by, unlock_end, reason)
       VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' days')::INTERVAL, $4)
       RETURNING *`,
      [collegeId, req.user.id, unlock_days, reason || 'Semester results update']
    );

    // Create notification for all approved students in the college
    const notifResult = await query(
      `INSERT INTO notifications (title, message, notification_type, priority, created_by, target_type)
       VALUES ($1, $2, 'general', 'high', $3, 'specific_colleges')
       RETURNING id`,
      [
        'CGPA Update Window Open',
        `You can now update your semester CGPA. This window will close in ${unlock_days} day${unlock_days > 1 ? 's' : ''}. Update your grades if needed.`,
        req.user.id,
      ]
    );

    const notifId = notifResult.rows[0].id;

    // Add notification target
    await query(
      `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
       VALUES ($1, 'college', $2)`,
      [notifId, collegeId]
    );

    // Add recipients - all approved students in the college
    await query(
      `INSERT INTO notification_recipients (notification_id, user_id)
       SELECT $1, s.user_id FROM students s
       WHERE s.college_id = $2 AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`,
      [notifId, collegeId]
    );

    await logActivity(
      req.user.id,
      'CGPA_UNLOCK',
      `Unlocked CGPA editing for ${unlock_days} days`,
      'college',
      collegeId,
      { unlock_days, reason },
      req
    );

    res.json({
      success: true,
      message: `CGPA editing unlocked for ${unlock_days} days`,
      data: unlockResult.rows[0],
    });
  } catch (error) {
    console.error('Unlock CGPA error:', error);
    res.status(500).json({ success: false, message: 'Error unlocking CGPA' });
  }
};

// @desc    Lock CGPA editing (revoke unlock window)
// @route   POST /api/placement-officer/cgpa-lock
// @access  Private (Placement Officer)
export const lockCgpaPO = async (req, res) => {
  try {
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    await query(
      `UPDATE cgpa_unlock_windows SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE (college_id = $1 OR college_id IS NULL) AND is_active = TRUE`,
      [collegeId]
    );

    await logActivity(
      req.user.id,
      'CGPA_LOCK',
      'Locked CGPA editing for college students',
      'college',
      collegeId,
      null,
      req
    );

    res.json({ success: true, message: 'CGPA editing locked for all students' });
  } catch (error) {
    console.error('Lock CGPA error:', error);
    res.status(500).json({ success: false, message: 'Error locking CGPA' });
  }
};

// ============================================
// BACKLOG COUNT LOCK/UNLOCK MANAGEMENT (PO)
// ============================================

// @desc    Get backlog lock status for placement officer's college
// @route   GET /api/placement-officer/backlog-lock-status
// @access  Private (Placement Officer)
export const getBacklogLockStatusPO = async (req, res) => {
  try {
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    const unlockResult = await query(
      `SELECT id, unlock_end, reason, created_at FROM backlog_unlock_windows
       WHERE (college_id = $1 OR college_id IS NULL)
       AND is_active = TRUE AND unlock_end > CURRENT_TIMESTAMP
       ORDER BY unlock_end DESC LIMIT 1`,
      [collegeId]
    );

    const isUnlocked = unlockResult.rows.length > 0;
    res.json({
      success: true,
      data: {
        is_locked: !isUnlocked,
        unlock_window: isUnlocked ? unlockResult.rows[0] : null,
      },
    });
  } catch (error) {
    console.error('Get backlog lock status error:', error);
    res.status(500).json({ success: false, message: 'Error fetching backlog lock status' });
  }
};

// @desc    Unlock backlog editing for college students
// @route   POST /api/placement-officer/backlog-unlock
// @access  Private (Placement Officer)
export const unlockBacklogPO = async (req, res) => {
  try {
    const { unlock_days, reason } = req.body;

    if (!unlock_days || unlock_days < 1 || unlock_days > 30) {
      return res.status(400).json({
        success: false,
        message: 'Unlock duration must be between 1 and 30 days',
      });
    }

    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    // Deactivate any existing unlock windows for this college
    await query(
      `UPDATE backlog_unlock_windows SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE (college_id = $1 OR college_id IS NULL) AND is_active = TRUE`,
      [collegeId]
    );

    // Create new unlock window
    const unlockResult = await query(
      `INSERT INTO backlog_unlock_windows (college_id, unlocked_by, unlock_end, reason)
       VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' days')::INTERVAL, $4)
       RETURNING *`,
      [collegeId, req.user.id, unlock_days, reason || 'Exam results update']
    );

    // Create notification for all approved students in the college
    const notifResult = await query(
      `INSERT INTO notifications (title, message, notification_type, priority, created_by, target_type)
       VALUES ($1, $2, 'general', 'high', $3, 'specific_colleges')
       RETURNING id`,
      [
        'Backlog Count Update Window Open',
        `You can now update your semester backlog counts. This window will close in ${unlock_days} day${unlock_days > 1 ? 's' : ''}. Update your backlog details if needed.`,
        req.user.id,
      ]
    );

    const notifId = notifResult.rows[0].id;

    // Add notification target
    await query(
      `INSERT INTO notification_targets (notification_id, target_entity_type, target_entity_id)
       VALUES ($1, 'college', $2)`,
      [notifId, collegeId]
    );

    // Add recipients - all approved students in the college
    await query(
      `INSERT INTO notification_recipients (notification_id, user_id)
       SELECT $1, s.user_id FROM students s
       WHERE s.college_id = $2 AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`,
      [notifId, collegeId]
    );

    await logActivity(
      req.user.id,
      'BACKLOG_UNLOCK',
      `Unlocked backlog editing for ${unlock_days} days`,
      'college',
      collegeId,
      { unlock_days, reason },
      req
    );

    res.json({
      success: true,
      message: `Backlog editing unlocked for ${unlock_days} days`,
      data: unlockResult.rows[0],
    });
  } catch (error) {
    console.error('Unlock backlog error:', error);
    res.status(500).json({ success: false, message: 'Error unlocking backlog editing' });
  }
};

// @desc    Lock backlog editing (revoke unlock window)
// @route   POST /api/placement-officer/backlog-lock
// @access  Private (Placement Officer)
export const lockBacklogPO = async (req, res) => {
  try {
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Placement officer not found' });
    }
    const collegeId = poResult.rows[0].college_id;

    await query(
      `UPDATE backlog_unlock_windows SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE (college_id = $1 OR college_id IS NULL) AND is_active = TRUE`,
      [collegeId]
    );

    await logActivity(
      req.user.id,
      'BACKLOG_LOCK',
      'Locked backlog editing for college students',
      'college',
      collegeId,
      null,
      req
    );

    res.json({ success: true, message: 'Backlog editing locked for all students' });
  } catch (error) {
    console.error('Lock backlog error:', error);
    res.status(500).json({ success: false, message: 'Error locking backlog editing' });
  }
};

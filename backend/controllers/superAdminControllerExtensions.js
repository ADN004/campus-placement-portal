import { query, getClient } from '../config/database.js';
import { uploadImage, deleteImage, deleteMultipleImages, deleteFolderOnly, extractFolderPath } from '../config/cloudinary.js';
import logActivity from '../middleware/activityLogger.js';
import ExcelJS from 'exceljs';
import { generateStudentPDF, generatePlacementPosterPDF } from '../utils/pdfGenerator.js';
import { BRANCH_SHORT_NAMES } from '../constants/branches.js';
import {
  sendDriveScheduleEmail,
  sendSelectionEmail,
  sendRejectionEmail,
  sendShortlistEmail
} from '../config/emailService.js';

// ========================================
// BULK PHOTO DELETION
// ========================================

// @desc    Delete student photos in bulk
// @route   POST /api/super-admin/students/bulk-delete-photos
// @access  Private (Super Admin)
export const bulkDeleteStudentPhotos = async (req, res) => {
  try {
    const { deletion_type, prn_list, prn_range_start, prn_range_end, date_start, date_end } = req.body;

    let studentsToDelete = [];
    let queryText = '';
    let params = [];

    // Build query based on deletion type
    switch (deletion_type) {
      case 'single_prn':
        if (!prn_list || prn_list.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please provide at least one PRN',
          });
        }
        queryText = `
          SELECT id, prn, photo_cloudinary_id, photo_url
          FROM students
          WHERE prn = ANY($1) AND photo_cloudinary_id IS NOT NULL
        `;
        params = [prn_list];
        break;

      case 'prn_range':
        if (!prn_range_start || !prn_range_end) {
          return res.status(400).json({
            success: false,
            message: 'Please provide PRN range start and end',
          });
        }
        queryText = `
          SELECT id, prn, photo_cloudinary_id, photo_url
          FROM students
          WHERE prn >= $1 AND prn <= $2 AND photo_cloudinary_id IS NOT NULL
        `;
        params = [prn_range_start, prn_range_end];
        break;

      case 'date_range':
        if (!date_start || !date_end) {
          return res.status(400).json({
            success: false,
            message: 'Please provide registration date range',
          });
        }
        queryText = `
          SELECT id, prn, photo_cloudinary_id, photo_url
          FROM students
          WHERE created_at >= $1 AND created_at <= $2 AND photo_cloudinary_id IS NOT NULL
        `;
        params = [date_start, date_end];
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid deletion type',
        });
    }

    const studentsResult = await query(queryText, params);
    studentsToDelete = studentsResult.rows;

    if (studentsToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found with photos for the given criteria',
      });
    }

    // Extract Cloudinary public IDs
    const publicIds = studentsToDelete.map(s => s.photo_cloudinary_id).filter(id => id);

    if (publicIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No photos found to delete',
      });
    }

    // Delete photos from Cloudinary in batches (Cloudinary limits to 100 per request)
    const batchSize = 100;
    let totalDeleted = 0;
    const foldersToDelete = new Set(); // Track unique folders to delete

    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);
      try {
        await deleteMultipleImages(batch);
        totalDeleted += batch.length;

        // Extract folder paths from public IDs for later deletion
        batch.forEach(publicId => {
          const folderPath = extractFolderPath(publicId);
          if (folderPath) {
            foldersToDelete.add(folderPath);
          }
        });
      } catch (cloudinaryError) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, cloudinaryError);
        // Continue with next batch even if one fails
      }
    }

    // Delete empty folders from Cloudinary
    let foldersDeleted = 0;
    for (const folderPath of foldersToDelete) {
      try {
        await deleteFolderOnly(folderPath);
        foldersDeleted++;
      } catch (folderError) {
        console.error(`Error deleting folder ${folderPath}:`, folderError);
        // Continue with next folder even if one fails
      }
    }

    // Update database to remove photo references
    const studentIds = studentsToDelete.map(s => s.id);
    await query(
      `UPDATE students
       SET photo_url = NULL,
           photo_cloudinary_id = NULL,
           photo_deleted_at = CURRENT_TIMESTAMP,
           photo_deleted_by = $1
       WHERE id = ANY($2)`,
      [req.user.id, studentIds]
    );

    // Log activity
    await logActivity(
      req.user.id,
      'BULK_DELETE_PHOTOS',
      `Deleted photos for ${studentsToDelete.length} students (${deletion_type})`,
      'student',
      null,
      {
        deletion_type,
        count: studentsToDelete.length,
        cloudinary_deleted: totalDeleted,
        ...req.body
      },
      req
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${totalDeleted} photos and ${foldersDeleted} folders from Cloudinary and updated ${studentsToDelete.length} student records`,
      data: {
        total_students: studentsToDelete.length,
        cloudinary_deleted: totalDeleted,
        folders_deleted: foldersDeleted,
      },
    });
  } catch (error) {
    console.error('Bulk delete photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photos',
      error: error.message,
    });
  }
};

// ========================================
// PLACEMENT OFFICER PHOTO MANAGEMENT
// ========================================
// NOTE: Placement officers manage their own photos from their dashboard.
// Super admins should not upload/manage placement officer photos.
// These functions have been removed as they violate logical access control.
// Placement officers can upload/update their own photos via:
// POST /api/placement-officer/profile/photo
// DELETE /api/placement-officer/profile/photo

// ========================================
// JOB PERMANENT DELETION
// ========================================

// @desc    Permanently delete job and move to history
// @route   DELETE /api/super-admin/jobs/:id/permanent
// @access  Private (Super Admin)
export const permanentlyDeleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { deletion_reason } = req.body;

    // Get job details and application count
    const jobResult = await query(
      `SELECT j.*, COUNT(ja.id) as application_count
       FROM jobs j
       LEFT JOIN job_applications ja ON j.id = ja.job_id
       WHERE j.id = $1
       GROUP BY j.id`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const job = jobResult.rows[0];

    // Get eligibility criteria
    const criteriaResult = await query(
      'SELECT * FROM job_eligibility_criteria WHERE job_id = $1',
      [jobId]
    );

    const metadata = {
      eligibility_criteria: criteriaResult.rows,
      applications_count: parseInt(job.application_count)
    };

    // Use transaction to ensure data consistency
    await transaction(async (client) => {
      // Insert into deleted jobs history
      await client.query(
        `INSERT INTO deleted_jobs_history
         (original_job_id, job_title, company_name, company_description, job_description,
          job_location, salary_package, application_form_url, application_start_date,
          application_deadline, created_by, job_created_at, deleted_by, deletion_reason,
          application_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          jobId,
          job.job_title,
          job.company_name,
          job.company_description,
          job.job_description,
          job.job_location,
          job.salary_package,
          job.application_form_url,
          job.application_start_date,
          job.application_deadline,
          job.created_by,
          job.created_at,
          req.user.id,
          deletion_reason || 'Permanently deleted by Super Admin',
          parseInt(job.application_count),
          JSON.stringify(metadata)
        ]
      );

      // Delete job applications
      await client.query('DELETE FROM job_applications WHERE job_id = $1', [jobId]);

      // Delete eligibility criteria
      await client.query('DELETE FROM job_eligibility_criteria WHERE job_id = $1', [jobId]);

      // Delete job
      await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
    });

    // Log activity
    await logActivity(
      req.user.id,
      'PERMANENT_DELETE_JOB',
      `Permanently deleted job: ${job.company_name} - ${job.job_title}`,
      'job',
      jobId,
      { deletion_reason, application_count: job.application_count },
      req
    );

    res.status(200).json({
      success: true,
      message: 'Job permanently deleted and moved to history',
      data: {
        job_title: job.job_title,
        application_count: job.application_count
      }
    });
  } catch (error) {
    console.error('Permanent delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting job',
      error: error.message,
    });
  }
};

// @desc    Get deleted jobs history (soft-deleted jobs)
// @route   GET /api/super-admin/jobs/deleted-history
// @access  Private (Super Admin)
export const getDeletedJobsHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT j.*,
              u.email as deleted_by_name,
              (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as application_count
       FROM jobs j
       LEFT JOIN users u ON j.deleted_by = u.id
       WHERE j.deleted_at IS NOT NULL
       ORDER BY j.deleted_at DESC`
    );

    // Map field names for frontend compatibility
    const jobs = result.rows.map((job) => ({
      ...job,
      title: job.job_title,
      location: job.job_location,
    }));

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error('Get deleted jobs history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deleted jobs history',
      error: error.message,
    });
  }
};

// @desc    Clear deleted jobs history (permanently delete soft-deleted jobs)
// @route   DELETE /api/super-admin/jobs/deleted-history
// @access  Private (Super Admin)
export const clearDeletedJobsHistory = async (req, res) => {
  try {
    console.log('🗑️ Attempting to clear deleted jobs history...');

    const result = await query('DELETE FROM jobs WHERE deleted_at IS NOT NULL RETURNING id');

    console.log(`✅ Deleted ${result.rows.length} jobs from database`);

    // Log activity (wrapped in try-catch to not break the flow)
    try {
      await logActivity(
        req.user.id,
        'CLEAR_DELETED_JOBS_HISTORY',
        `Permanently deleted all soft-deleted jobs (${result.rows.length} records)`,
        'job',
        null,
        { count: result.rows.length },
        req
      );
    } catch (logError) {
      console.error('⚠️ Activity logging failed:', logError);
    }

    res.status(200).json({
      success: true,
      message: `Cleared ${result.rows.length} deleted job records`,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('❌ Clear deleted jobs history error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error clearing deleted jobs history',
      error: error.message,
      details: error.stack,
    });
  }
};

// ========================================
// ENHANCED CUSTOM EXPORT
// ========================================

// @desc    Get branches for a specific college
// @route   GET /api/super-admin/colleges/:id/branches
// @access  Private (Super Admin)
export const getCollegeBranches = async (req, res) => {
  try {
    const collegeId = req.params.id;

    const result = await query(
      'SELECT id, college_name, branches FROM colleges WHERE id = $1',
      [collegeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const college = result.rows[0];
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

// @desc    Enhanced custom export with photo URL support
// @route   POST /api/super-admin/students/enhanced-export
// @access  Private (Super Admin)
export const enhancedCustomExport = async (req, res) => {
  try {
    const { college_id, region_id, branches, fields, include_photo_url, format = 'excel',
            company_name, drive_date, include_signature, separate_colleges, use_short_names,
            cgpa_min, cgpa_max, backlog_count, search, status,
            dob_from, dob_to, height_min, height_max, weight_min, weight_max,
            has_driving_license, has_pan_card, has_aadhar_card, has_passport, districts } = req.body;

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
      height: 'COALESCE(ep.height_cm, s.height)',
      weight: 'COALESCE(ep.weight_kg, s.weight)',
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
      complete_address: 's.complete_address',
      has_driving_license: 's.has_driving_license',
      has_pan_card: 's.has_pan_card',
      college_name: 'c.college_name',
      region_name: 'r.region_name',
      district: 'ep.district',
    };

    // Add photo URL if requested
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
      JOIN colleges c ON s.college_id = c.id
      JOIN regions r ON s.region_id = r.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Filter by status
    if (status === 'blacklisted') {
      queryText += ` AND s.is_blacklisted = TRUE`;
    } else if (status === 'approved') {
      queryText += ` AND s.registration_status = 'approved' AND s.is_blacklisted = FALSE`;
    } else if (status === 'pending') {
      queryText += ` AND s.registration_status = 'pending' AND s.is_blacklisted = FALSE`;
    } else if (status === 'rejected') {
      queryText += ` AND s.registration_status = 'rejected' AND s.is_blacklisted = FALSE`;
    } else if (!status || status === 'all') {
      // Default: Show all non-blacklisted students
      queryText += ` AND s.is_blacklisted = FALSE`;
    }

    if (region_id) {
      paramCount++;
      queryText += ` AND s.region_id = $${paramCount}`;
      params.push(region_id);
    }

    if (college_id) {
      paramCount++;
      queryText += ` AND s.college_id = $${paramCount}`;
      params.push(college_id);
    }

    if (branches && branches.length > 0) {
      paramCount++;
      queryText += ` AND s.branch = ANY($${paramCount})`;
      params.push(branches);
    }

    // Filter by minimum CGPA
    if (cgpa_min) {
      paramCount++;
      queryText += ` AND s.programme_cgpa >= $${paramCount}`;
      params.push(parseFloat(cgpa_min));
    }

    // Filter by maximum CGPA
    if (cgpa_max) {
      paramCount++;
      queryText += ` AND s.programme_cgpa <= $${paramCount}`;
      params.push(parseFloat(cgpa_max));
    }

    // Filter by backlog count
    if (backlog_count !== undefined && backlog_count !== null && backlog_count !== '') {
      paramCount++;
      queryText += ` AND s.backlog_count = $${paramCount}`;
      params.push(backlog_count.toString());
    }

    // Filter by search query
    if (search && search.trim()) {
      paramCount++;
      queryText += ` AND (s.prn ILIKE $${paramCount} OR s.student_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.mobile_number ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
    }

    // DOB filters
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
      queryText += ` AND COALESCE(ep.height_cm, s.height) >= $${paramCount} AND COALESCE(ep.height_cm, s.height) IS NOT NULL`;
      params.push(parseInt(height_min));
    }
    if (height_max) {
      paramCount++;
      queryText += ` AND COALESCE(ep.height_cm, s.height) <= $${paramCount} AND COALESCE(ep.height_cm, s.height) IS NOT NULL`;
      params.push(parseInt(height_max));
    }

    // Weight filters
    if (weight_min) {
      paramCount++;
      queryText += ` AND COALESCE(ep.weight_kg, s.weight) >= $${paramCount} AND COALESCE(ep.weight_kg, s.weight) IS NOT NULL`;
      params.push(parseFloat(weight_min));
    }
    if (weight_max) {
      paramCount++;
      queryText += ` AND COALESCE(ep.weight_kg, s.weight) <= $${paramCount} AND COALESCE(ep.weight_kg, s.weight) IS NOT NULL`;
      params.push(parseFloat(weight_max));
    }

    // Document filters
    if (has_driving_license === 'yes') {
      queryText += ` AND s.has_driving_license = TRUE`;
    } else if (has_driving_license === 'no') {
      queryText += ` AND (s.has_driving_license = FALSE OR s.has_driving_license IS NULL)`;
    }

    if (has_pan_card === 'yes') {
      queryText += ` AND s.has_pan_card = TRUE`;
    } else if (has_pan_card === 'no') {
      queryText += ` AND (s.has_pan_card = FALSE OR s.has_pan_card IS NULL)`;
    }

    if (has_aadhar_card === 'yes') {
      queryText += ` AND COALESCE(ep.has_aadhar_card, FALSE) = TRUE`;
    } else if (has_aadhar_card === 'no') {
      queryText += ` AND COALESCE(ep.has_aadhar_card, FALSE) = FALSE`;
    }

    if (has_passport === 'yes') {
      queryText += ` AND COALESCE(ep.has_passport, FALSE) = TRUE`;
    } else if (has_passport === 'no') {
      queryText += ` AND COALESCE(ep.has_passport, FALSE) = FALSE`;
    }

    // District filter (multi-select)
    if (districts) {
      let districtArray;
      if (Array.isArray(districts)) {
        districtArray = districts.filter(d => d && d.trim());
      } else if (typeof districts === 'string') {
        districtArray = districts.split(',').map(d => d.trim()).filter(d => d);
      }
      if (districtArray && districtArray.length > 0) {
        paramCount++;
        queryText += ` AND ep.district = ANY($${paramCount})`;
        params.push(districtArray);
      }
    }

    // Sort by college first, then branch, then PRN for organized export
    queryText += ' ORDER BY c.college_name, s.branch, s.prn';

    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;

    // Branch based on export format
    if (format === 'pdf') {
      // Determine college name for header
      const collegeName = students.length > 0 && students[0].college_name
        ? students[0].college_name
        : 'Multiple Colleges';

      // Log activity before PDF generation
      await logActivity(
        req.user.id,
        'ENHANCED_EXPORT_PDF',
        `Exported ${students.length} students to PDF with custom fields`,
        'student',
        null,
        {
          college_id,
          region_id,
          branches,
          fields,
          format: 'pdf',
          company_name,
          drive_date,
          include_signature,
          count: students.length
        },
        req
      );

      // Generate and send PDF (this will handle the response)
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

    // Excel export logic continues below
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
    const processedStudents = use_short_names === true
      ? students.map(student => ({
          ...student,
          branch: student.branch ? (BRANCH_SHORT_NAMES[student.branch] || student.branch) : student.branch
        }))
      : students;

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
      `attachment; filename=students-enhanced-export-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity (Excel export)
    await logActivity(
      req.user.id,
      'ENHANCED_EXPORT_EXCEL',
      `Exported ${students.length} students to Excel with custom fields${include_photo_url ? ' (with photo URLs)' : ''}`,
      'student',
      null,
      {
        college_id,
        region_id,
        branches,
        fields,
        format: 'excel',
        include_photo_url,
        count: students.length
      },
      req
    );
  } catch (error) {
    console.error('Enhanced custom export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

// @desc    Get normalized branch names
// @route   GET /api/super-admin/branches
// @access  Private (Super Admin)
export const getNormalizedBranches = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM branch_mappings WHERE is_active = TRUE ORDER BY branch_name`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get normalized branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message,
    });
  }
};

// ========================================
// PRN RANGE STUDENT MANAGEMENT
// ========================================

// @desc    Get students by PRN range
// @route   GET /api/super-admin/prn-ranges/:id/students
// @access  Private (Super Admin)
export const getStudentsByPRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;

    // Get PRN range details
    const rangeResult = await query(
      'SELECT * FROM prn_ranges WHERE id = $1',
      [rangeId]
    );

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const range = rangeResult.rows[0];
    let studentsResult;

    // Query students based on range type
    if (range.single_prn) {
      // Single PRN
      studentsResult = await query(
        `SELECT s.*, c.college_name, r.region_name
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn = $1
         ORDER BY s.prn`,
        [range.single_prn]
      );
    } else {
      // PRN Range
      studentsResult = await query(
        `SELECT s.*, c.college_name, r.region_name
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn >= $1 AND s.prn <= $2
         ORDER BY s.prn`,
        [range.range_start, range.range_end]
      );
    }

    res.status(200).json({
      success: true,
      count: studentsResult.rows.length,
      data: studentsResult.rows,
      range: {
        type: range.single_prn ? 'single' : 'range',
        value: range.single_prn || `${range.range_start} - ${range.range_end}`,
        is_enabled: range.is_enabled,
      },
    });
  } catch (error) {
    console.error('Get students by PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// @desc    Export students by PRN range to Excel
// @route   GET /api/super-admin/prn-ranges/:id/students/export
// @access  Private (Super Admin)
export const exportStudentsByPRNRange = async (req, res) => {
  try {
    const rangeId = req.params.id;
    const format = req.query.format || 'excel'; // Get format from query param (excel or pdf)

    // Get PRN range details
    const rangeResult = await query(
      'SELECT * FROM prn_ranges WHERE id = $1',
      [rangeId]
    );

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PRN range not found',
      });
    }

    const range = rangeResult.rows[0];
    let studentsResult;

    // Query students based on range type - Add name alias for consistency
    if (range.single_prn) {
      // Single PRN
      studentsResult = await query(
        `SELECT s.prn, s.student_name as name, s.email, s.mobile_number,
                s.date_of_birth, s.age, s.gender, s.branch,
                s.programme_cgpa, s.backlog_count, s.registration_status,
                s.is_blacklisted, c.college_name, r.region_name,
                s.has_driving_license, s.has_pan_card, s.created_at
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn = $1
         ORDER BY s.prn`,
        [range.single_prn]
      );
    } else {
      // PRN Range
      studentsResult = await query(
        `SELECT s.prn, s.student_name as name, s.email, s.mobile_number,
                s.date_of_birth, s.age, s.gender, s.branch,
                s.programme_cgpa, s.backlog_count, s.registration_status,
                s.is_blacklisted, c.college_name, r.region_name,
                s.has_driving_license, s.has_pan_card, s.created_at
         FROM students s
         JOIN colleges c ON s.college_id = c.id
         JOIN regions r ON s.region_id = r.id
         WHERE s.prn >= $1 AND s.prn <= $2
         ORDER BY s.prn`,
        [range.range_start, range.range_end]
      );
    }

    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this PRN range',
      });
    }

    // Generate PDF if requested
    if (format === 'pdf') {
      const { generatePRNRangeStudentsPDF } = await import('../utils/pdfGenerator.js');
      const rangeInfo = range.single_prn
        ? `PRN: ${range.single_prn}`
        : `PRN Range: ${range.range_start} - ${range.range_end}`;

      // Log activity before generating PDF
      await logActivity(
        req.user.id,
        'EXPORT_PRN_RANGE_STUDENTS',
        `Exported ${students.length} students as PDF from PRN range: ${range.single_prn || `${range.range_start} - ${range.range_end}`}`,
        'prn_range',
        rangeId,
        {
          range_type: range.single_prn ? 'single' : 'range',
          count: students.length,
          format: 'pdf',
          is_enabled: range.is_enabled,
        },
        req
      );

      return await generatePRNRangeStudentsPDF(students, { rangeInfo }, res);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Define columns
    worksheet.columns = [
      { header: 'PRN', key: 'prn', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobile_number', width: 15 },
      { header: 'Date of Birth', key: 'date_of_birth', width: 15 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'College', key: 'college_name', width: 30 },
      { header: 'Region', key: 'region_name', width: 20 },
      { header: 'Branch', key: 'branch', width: 30 },
      { header: 'Programme CGPA', key: 'programme_cgpa', width: 15 },
      { header: 'Backlog Count', key: 'backlog_count', width: 15 },
      { header: 'Driving License', key: 'has_driving_license', width: 15 },
      { header: 'PAN Card', key: 'has_pan_card', width: 12 },
      { header: 'Registration Status', key: 'registration_status', width: 18 },
      { header: 'Blacklisted', key: 'is_blacklisted', width: 12 },
      { header: 'Registration Date', key: 'created_at', width: 20 },
    ];

    // Add rows with formatted data
    students.forEach(student => {
      worksheet.addRow({
        prn: student.prn,
        student_name: student.name, // Updated to use 'name' alias
        email: student.email,
        mobile_number: student.mobile_number,
        date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '',
        age: student.age,
        gender: student.gender,
        college_name: student.college_name,
        region_name: student.region_name,
        branch: student.branch,
        programme_cgpa: student.programme_cgpa,
        backlog_count: student.backlog_count,
        has_driving_license: student.has_driving_license ? 'Yes' : 'No',
        has_pan_card: student.has_pan_card ? 'Yes' : 'No',
        registration_status: student.registration_status,
        is_blacklisted: student.is_blacklisted ? 'Yes' : 'No',
        created_at: new Date(student.created_at).toLocaleString(),
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Set response headers
    const rangeLabel = range.single_prn || `${range.range_start}_${range.range_end}`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_prn_range_${rangeLabel}_${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log activity for Excel export
    await logActivity(
      req.user.id,
      'EXPORT_PRN_RANGE_STUDENTS',
      `Exported ${students.length} students as Excel from PRN range: ${range.single_prn || `${range.range_start} - ${range.range_end}`}`,
      'prn_range',
      rangeId,
      {
        range_type: range.single_prn ? 'single' : 'range',
        count: students.length,
        format: 'excel',
        is_enabled: range.is_enabled,
      },
      req
    );
  } catch (error) {
    console.error('Export students by PRN range error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting students',
      error: error.message,
    });
  }
};

// @desc    Export job applicants with advanced filtering to Excel or PDF
// @route   POST /api/super-admin/jobs/:jobId/applicants/export
// @access  Private (Super Admin)
export const exportJobApplicants = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { format = 'excel', college_ids = [], branches = [], use_short_names = true } = req.body;

    // Build dynamic query based on filters
    let queryText = `
      SELECT s.id, s.prn, s.student_name as name, s.email, s.mobile_number,
             s.branch, s.programme_cgpa, s.backlog_count, s.date_of_birth,
             c.college_name, r.region_name,
             ja.applied_date,
             j.job_title, j.company_name,
             ep.height_cm, ep.weight_kg, ep.sslc_marks, ep.twelfth_marks
      FROM students s
      JOIN job_applications ja ON s.id = ja.student_id
      JOIN jobs j ON ja.job_id = j.id
      LEFT JOIN colleges c ON s.college_id = c.id
      LEFT JOIN regions r ON s.region_id = r.id
      LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
      WHERE ja.job_id = $1
        AND s.registration_status = 'approved'
        AND s.is_blacklisted = FALSE
    `;

    const params = [jobId];
    let paramCount = 1;

    // Add college filter if specified
    if (college_ids && college_ids.length > 0) {
      paramCount++;
      queryText += ` AND s.college_id = ANY($${paramCount})`;
      params.push(college_ids);
    }

    // Add branch filter if specified
    if (branches && branches.length > 0) {
      paramCount++;
      queryText += ` AND s.branch = ANY($${paramCount})`;
      params.push(branches);
    }

    queryText += ` ORDER BY ja.applied_date DESC`;

    const applicantsResult = await query(queryText, params);
    const applicants = applicantsResult.rows;

    if (applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applicants found matching the filters',
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
        `Exported ${applicants.length} applicants as PDF for job: ${jobTitle} with filters`,
        'job',
        jobId,
        {
          count: applicants.length,
          format: 'pdf',
          company: companyName,
          filters: { college_ids, branches }
        },
        req
      );

      return await generateJobApplicantsPDF(applicants, { jobTitle, companyName, isSuperAdmin: true, useShortNames: use_short_names }, res);
    }

    // Generate Excel export
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Applicants');

    // Define columns for super admin (includes college and region)
    worksheet.columns = [
      { header: 'PRN', key: 'prn', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile Number', key: 'mobile_number', width: 15 },
      { header: 'College', key: 'college_name', width: 30 },
      { header: 'Region', key: 'region_name', width: 20 },
      { header: 'Branch', key: 'branch', width: use_short_names ? 12 : 30 },
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
        college_name: applicant.college_name,
        region_name: applicant.region_name,
        branch: use_short_names ? (BRANCH_SHORT_NAMES[applicant.branch] || applicant.branch) : applicant.branch,
        date_of_birth: applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString() : '',
        programme_cgpa: applicant.programme_cgpa,
        backlog_count: applicant.backlog_count,
        applied_date: new Date(applicant.applied_date).toLocaleDateString(),
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
    if (use_short_names) {
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
      `Exported ${applicants.length} applicants as Excel for job: ${jobTitle} with filters`,
      'job',
      jobId,
      {
        count: applicants.length,
        format: 'excel',
        company: companyName,
        filters: { college_ids, branches }
      },
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
// ENHANCED JOB APPLICANTS MANAGEMENT
// ========================================

// @desc    Get detailed student profile (basic + extended)
// @route   GET /api/super-admin/students/:studentId/detailed-profile
// @access  Private (Super Admin)
export const getDetailedStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Query to get merged student data
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
      WHERE s.id = $1`,
      [studentId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
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

// @desc    Update application status
// @route   PUT /api/super-admin/applications/:applicationId/status
// @access  Private (Super Admin)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, review_notes } = req.body;

    // Validate status
    const validStatuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    // Update application
    const updateResult = await query(
      `UPDATE job_applications
       SET application_status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, review_notes || null, applicationId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Log activity
    await logActivity(req.user.id, 'UPDATE', 'job_applications', applicationId, {
      action: 'update_application_status',
      new_status: status,
      review_notes: review_notes,
    });

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

// @desc    Bulk update application status
// @route   POST /api/super-admin/applications/bulk-update-status
// @access  Private (Super Admin)
export const bulkUpdateApplicationStatus = async (req, res) => {
  try {
    const { application_ids, status, review_notes } = req.body;

    if (!application_ids || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide application IDs',
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

    // Use transaction for bulk update
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update all applications
      const updateResult = await client.query(
        `UPDATE job_applications
         SET application_status = $1,
             reviewed_by = $2,
             reviewed_at = CURRENT_TIMESTAMP,
             review_notes = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($4)
         RETURNING id, job_id, student_id, application_status`,
        [status, req.user.id, review_notes || null, application_ids]
      );

      // Log activity for each application
      for (const app of updateResult.rows) {
        await logActivity(req.user.id, 'UPDATE', 'job_applications', app.id, {
          action: 'bulk_update_application_status',
          new_status: status,
          review_notes: review_notes,
        });
      }

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: `${updateResult.rows.length} applications updated successfully`,
        count: updateResult.rows.length,
        data: updateResult.rows,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating applications',
      error: error.message,
    });
  }
};

// @desc    Update placement details for selected applications
// @route   PUT /api/super-admin/applications/:applicationId/placement
// @access  Private (Super Admin)
export const updatePlacementDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { placement_package, joining_date, placement_location, placement_notes } = req.body;

    // First check if application exists and status is 'selected'
    const appCheck = await query(
      `SELECT application_status FROM job_applications WHERE id = $1`,
      [applicationId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (appCheck.rows[0].application_status !== 'selected') {
      return res.status(400).json({
        success: false,
        message: 'Placement details can only be added for selected applications',
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
       RETURNING *`,
      [placement_package, joining_date, placement_location, placement_notes || null, applicationId]
    );

    // Log activity
    await logActivity(req.user.id, 'UPDATE', 'job_applications', applicationId, {
      action: 'update_placement_details',
      placement_package: placement_package,
      joining_date: joining_date,
      placement_location: placement_location,
    });

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
// @route   POST /api/super-admin/jobs/:jobId/drive
// @access  Private (Super Admin)
export const createOrUpdateJobDrive = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { drive_date, drive_time, drive_location, additional_instructions } = req.body;

    // Validate required fields
    if (!drive_date || !drive_time || !drive_location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide drive date, time, and location',
      });
    }

    // Check if job exists
    const jobCheck = await query(`SELECT id FROM jobs WHERE id = $1`, [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check if drive already exists
    const existingDrive = await query(
      `SELECT id FROM job_drives WHERE job_id = $1`,
      [jobId]
    );

    let driveResult;
    if (existingDrive.rows.length > 0) {
      // Update existing drive
      driveResult = await query(
        `UPDATE job_drives
         SET drive_date = $1,
             drive_time = $2,
             drive_location = $3,
             additional_instructions = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $5
         RETURNING *`,
        [drive_date, drive_time, drive_location, additional_instructions || null, jobId]
      );

      await logActivity(req.user.id, 'UPDATE', 'job_drives', driveResult.rows[0].id, {
        action: 'update_job_drive',
        job_id: jobId,
      });
    } else {
      // Create new drive
      driveResult = await query(
        `INSERT INTO job_drives (job_id, drive_date, drive_time, drive_location, additional_instructions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [jobId, drive_date, drive_time, drive_location, additional_instructions || null, req.user.id]
      );

      await logActivity(req.user.id, 'CREATE', 'job_drives', driveResult.rows[0].id, {
        action: 'create_job_drive',
        job_id: jobId,
      });
    }

    res.status(200).json({
      success: true,
      message: existingDrive.rows.length > 0 ? 'Drive schedule updated successfully' : 'Drive schedule created successfully',
      data: driveResult.rows[0],
    });
  } catch (error) {
    console.error('Create/update job drive error:', error);
    res.status(500).json({
      success: false,
      message: 'Error managing job drive',
      error: error.message,
    });
  }
};

// @desc    Get job drive schedule
// @route   GET /api/super-admin/jobs/:jobId/drive
// @access  Private (Super Admin)
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

// @desc    Send notifications for application status updates
// @route   POST /api/super-admin/applications/notify
// @access  Private (Super Admin)
export const notifyApplicationStatus = async (req, res) => {
  try {
    const { application_ids, notification_type } = req.body;

    if (!application_ids || application_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide application IDs',
      });
    }

    if (!['selected', 'rejected', 'shortlisted', 'drive_scheduled'].includes(notification_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type',
      });
    }

    // Get application details with student and job info
    const applicationsResult = await query(
      `SELECT
        ja.id as application_id, ja.application_status,
        s.id as student_id, s.student_name, s.email, s.prn,
        u.id as user_id,
        j.id as job_id, j.job_title, j.company_name,
        ja.placement_package, ja.joining_date, ja.placement_location
       FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN jobs j ON ja.job_id = j.id
       WHERE ja.id = ANY($1)`,
      [application_ids]
    );

    if (applicationsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applications found',
      });
    }

    const client = await getClient();
    let emailsSent = 0;
    let notificationsCreated = 0;

    try {
      await client.query('BEGIN');

      for (const app of applicationsResult.rows) {
        let title = '';
        let message = '';
        let notifType = 'general';
        let sendEmail = true;

        // Prepare notification content based on type
        if (notification_type === 'selected') {
          title = `Congratulations! Selected at ${app.company_name}`;
          message = `You have been selected for the ${app.job_title} position at ${app.company_name}. Congratulations!`;
          notifType = 'approval';
        } else if (notification_type === 'rejected') {
          title = `Application Update - ${app.company_name}`;
          message = `Thank you for applying to ${app.job_title} at ${app.company_name}. Unfortunately, you have not been selected for this position.`;
          notifType = 'rejection';
        } else if (notification_type === 'shortlisted') {
          title = `Shortlisted for ${app.company_name}`;
          message = `Congratulations! You have been shortlisted for the ${app.job_title} position at ${app.company_name}.`;
          notifType = 'approval';
        } else if (notification_type === 'drive_scheduled') {
          // Get drive details
          const driveResult = await client.query(
            `SELECT * FROM job_drives WHERE job_id = $1`,
            [app.job_id]
          );

          if (driveResult.rows.length === 0) {
            sendEmail = false;
            continue;
          }

          const drive = driveResult.rows[0];
          title = `Placement Drive Scheduled - ${app.company_name}`;
          message = `A placement drive has been scheduled for ${app.job_title} at ${app.company_name} on ${new Date(drive.drive_date).toLocaleDateString('en-IN')} at ${drive.drive_time}.`;
          notifType = 'job_posted';

          // Send drive schedule email
          try {
            await sendDriveScheduleEmail(
              app.email,
              app.student_name,
              { job_title: app.job_title, company_name: app.company_name },
              {
                drive_date: drive.drive_date,
                drive_time: drive.drive_time,
                drive_location: drive.drive_location,
                additional_instructions: drive.additional_instructions,
              }
            );
            emailsSent++;
          } catch (emailError) {
            console.error(`Email error for ${app.email}:`, emailError);
          }

          sendEmail = false; // Already sent drive email
        }

        // Create in-app notification
        const notificationResult = await client.query(
          `INSERT INTO notifications (title, message, notification_type, created_by, target_type, is_active)
           VALUES ($1, $2, $3, $4, 'specific_students', TRUE)
           RETURNING id`,
          [title, message, notifType, req.user.id]
        );

        const notificationId = notificationResult.rows[0].id;

        // Create notification recipient
        await client.query(
          `INSERT INTO notification_recipients (notification_id, user_id, is_read)
           VALUES ($1, $2, FALSE)`,
          [notificationId, app.user_id]
        );

        notificationsCreated++;

        // Send email based on notification type
        if (sendEmail) {
          try {
            if (notification_type === 'selected') {
              await sendSelectionEmail(
                app.email,
                app.student_name,
                { job_title: app.job_title, company_name: app.company_name },
                {
                  placement_package: app.placement_package,
                  joining_date: app.joining_date,
                  placement_location: app.placement_location,
                }
              );
            } else if (notification_type === 'rejected') {
              await sendRejectionEmail(
                app.email,
                app.student_name,
                { job_title: app.job_title, company_name: app.company_name }
              );
            } else if (notification_type === 'shortlisted') {
              await sendShortlistEmail(
                app.email,
                app.student_name,
                { job_title: app.job_title, company_name: app.company_name }
              );
            }
            emailsSent++;
          } catch (emailError) {
            console.error(`Email error for ${app.email}:`, emailError);
          }
        }
      }

      await client.query('COMMIT');

      // Log activity
      await logActivity(req.user.id, 'CREATE', 'notifications', null, {
        action: 'send_application_notifications',
        notification_type: notification_type,
        count: notificationsCreated,
      });

      res.status(200).json({
        success: true,
        message: `Sent ${notificationsCreated} in-app notifications and ${emailsSent} emails`,
        notificationsCreated,
        emailsSent,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Notify application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notifications',
      error: error.message,
    });
  }
};

// @desc    Get job placement statistics
// @route   GET /api/super-admin/jobs/:jobId/placement-stats
// @access  Private (Super Admin)
export const getJobPlacementStats = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get overall statistics
    const statsResult = await query(
      `SELECT
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE application_status = 'submitted') as submitted_count,
        COUNT(*) FILTER (WHERE application_status = 'under_review') as under_review_count,
        COUNT(*) FILTER (WHERE application_status = 'shortlisted') as shortlisted_count,
        COUNT(*) FILTER (WHERE application_status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE application_status = 'selected') as selected_count,
        AVG(placement_package) FILTER (WHERE placement_package IS NOT NULL) as avg_package,
        MAX(placement_package) as max_package,
        MIN(placement_package) FILTER (WHERE placement_package IS NOT NULL) as min_package
       FROM job_applications
       WHERE job_id = $1`,
      [jobId]
    );

    // Get college-wise breakdown
    const collegeBreakdown = await query(
      `SELECT
        c.college_name,
        COUNT(*) as total_applicants,
        COUNT(*) FILTER (WHERE ja.application_status = 'selected') as selected_count,
        AVG(ja.placement_package) FILTER (WHERE ja.placement_package IS NOT NULL) as avg_package
       FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       LEFT JOIN colleges c ON s.college_id = c.id
       WHERE ja.job_id = $1
       GROUP BY c.college_name
       ORDER BY selected_count DESC, total_applicants DESC`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      data: {
        overall: statsResult.rows[0],
        collegeBreakdown: collegeBreakdown.rows,
      },
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

// @desc    Enhanced export job applicants with extended profile fields
// @route   POST /api/super-admin/jobs/:jobId/applicants/enhanced-export
// @access  Private (Super Admin)
export const enhancedExportJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      format = 'excel',
      pdf_fields = [],
      college_ids = [],
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
    } = req.body;

    // Build dynamic WHERE clauses
    let whereConditions = ['ja.job_id = $1', 's.registration_status = \'approved\'', 's.is_blacklisted = FALSE'];
    let params = [jobId];
    let paramIndex = 2;

    if (college_ids && college_ids.length > 0) {
      whereConditions.push(`s.college_id = ANY($${paramIndex})`);
      params.push(college_ids);
      paramIndex++;
    }

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
        sep.height_cm, sep.weight_kg,
        sep.district, sep.father_name, sep.father_occupation,
        sep.mother_name, sep.mother_occupation,
        sep.has_aadhar_card, sep.has_passport,
        COALESCE(sep.has_driving_license, s.has_driving_license) as has_driving_license,
        COALESCE(sep.has_pan_card, s.has_pan_card) as has_pan_card,
        ja.placement_package, ja.joining_date, ja.placement_location
       FROM job_applications ja
       JOIN students s ON ja.student_id = s.id
       JOIN jobs j ON ja.job_id = j.id
       LEFT JOIN colleges c ON s.college_id = c.id
       LEFT JOIN regions r ON s.region_id = r.id
       LEFT JOIN student_extended_profiles sep ON s.id = sep.student_id
       WHERE ${whereClause}
       ORDER BY ja.applied_date DESC`,
      params
    );

    const applicants = applicantsResult.rows;

    if (applicants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No applicants found with the specified filters',
      });
    }

    // Get job details for filename
    const jobResult = await query('SELECT job_title FROM jobs WHERE id = $1', [jobId]);
    const jobTitle = jobResult.rows[0]?.job_title || 'job';

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Applicants');

      // Define columns
      worksheet.columns = [
        { header: 'PRN', key: 'prn', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'College', key: 'college', width: 30 },
        { header: 'Region', key: 'region', width: 20 },
        { header: 'Branch', key: 'branch', width: use_short_names ? 10 : 35 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'DOB', key: 'dob', width: 12 },
        { header: 'CGPA', key: 'cgpa', width: 10 },
        { header: 'Backlogs', key: 'backlogs', width: 10 },
        { header: 'SSLC %', key: 'sslc_marks', width: 10 },
        { header: 'SSLC Year', key: 'sslc_year', width: 12 },
        { header: 'SSLC Board', key: 'sslc_board', width: 15 },
        { header: '12th %', key: 'twelfth_marks', width: 10 },
        { header: '12th Year', key: 'twelfth_year', width: 12 },
        { header: '12th Board', key: 'twelfth_board', width: 15 },
        { header: 'Height (cm)', key: 'height_cm', width: 12 },
        { header: 'Weight (kg)', key: 'weight_kg', width: 12 },
        { header: 'District', key: 'district', width: 20 },
        { header: 'Father Name', key: 'father_name', width: 25 },
        { header: 'Father Occupation', key: 'father_occupation', width: 20 },
        { header: 'Mother Name', key: 'mother_name', width: 25 },
        { header: 'Mother Occupation', key: 'mother_occupation', width: 20 },
        { header: 'DL', key: 'has_driving_license', width: 8 },
        { header: 'PAN', key: 'has_pan_card', width: 8 },
        { header: 'Aadhar', key: 'has_aadhar_card', width: 8 },
        { header: 'Passport', key: 'has_passport', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Applied Date', key: 'applied_date', width: 12 },
        { header: 'Package (LPA)', key: 'package', width: 12 },
        { header: 'Joining Date', key: 'joining_date', width: 12 },
        { header: 'Location', key: 'location', width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add data
      applicants.forEach((applicant) => {
        worksheet.addRow({
          prn: applicant.prn,
          name: applicant.student_name,
          email: applicant.email,
          mobile: applicant.mobile_number,
          college: applicant.college_name,
          region: applicant.region_name,
          branch: use_short_names ? BRANCH_SHORT_NAMES[applicant.branch] || applicant.branch : applicant.branch,
          gender: applicant.gender,
          dob: applicant.date_of_birth ? new Date(applicant.date_of_birth).toLocaleDateString('en-IN') : '',
          cgpa: applicant.programme_cgpa,
          backlogs: applicant.backlog_count,
          sslc_marks: applicant.sslc_marks,
          sslc_year: applicant.sslc_year,
          sslc_board: applicant.sslc_board,
          twelfth_marks: applicant.twelfth_marks,
          twelfth_year: applicant.twelfth_year,
          twelfth_board: applicant.twelfth_board,
          height_cm: applicant.height_cm,
          weight_kg: applicant.weight_kg,
          district: applicant.district,
          father_name: applicant.father_name,
          father_occupation: applicant.father_occupation,
          mother_name: applicant.mother_name,
          mother_occupation: applicant.mother_occupation,
          has_driving_license: applicant.has_driving_license ? 'Yes' : 'No',
          has_pan_card: applicant.has_pan_card ? 'Yes' : 'No',
          has_aadhar_card: applicant.has_aadhar_card ? 'Yes' : 'No',
          has_passport: applicant.has_passport ? 'Yes' : 'No',
          status: applicant.application_status,
          applied_date: applicant.applied_date ? new Date(applicant.applied_date).toLocaleDateString('en-IN') : '',
          package: applicant.placement_package,
          joining_date: applicant.joining_date ? new Date(applicant.joining_date).toLocaleDateString('en-IN') : '',
          location: applicant.placement_location,
        });
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `job_applicants_${jobTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Log activity
      await logActivity(
        req.user.id,
        'EXPORT_JOB_APPLICANTS',
        `Exported ${applicants.length} applicants as Excel for job: ${jobTitle}`,
        'job',
        jobId,
        {
          action: 'enhanced_export_job_applicants',
          format: 'excel',
          count: applicants.length,
          filters: { college_ids, branches, application_statuses, sslc_min, twelfth_min, district },
        },
        req
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } else if (format === 'pdf') {
      // Handle PDF export with custom fields
      const { default: PDFDocument } = await import('pdfkit');

      // Field mapping
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

      // Determine which fields to include
      const selectedFields = pdf_fields.length > 0
        ? pdf_fields.filter(field => fieldMap[field])
        : ['prn', 'student_name', 'branch', 'programme_cgpa', 'application_status'];

      // Determine orientation based on number of selected fields
      // Portrait: <= 6 fields, Landscape: > 6 fields
      const layout = selectedFields.length <= 6 ? 'portrait' : 'landscape';
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
      doc.fontSize(10).text(`Total Applicants: ${applicants.length}`, 0, 60, { width: doc.page.width, align: 'center' });
      doc.moveDown();

      // Calculate table positioning with proper margins
      const availableWidth = doc.page.width - (2 * pageMargin);
      const tableWidth = selectedFields.reduce((sum, field) => sum + (fieldMap[field]?.width || 60), 0);

      // Use left alignment with margin if table is too wide, otherwise center
      const startX = tableWidth > availableWidth ? pageMargin : (doc.page.width - tableWidth) / 2;
      let currentY = doc.y + 10; // Add spacing after header

      // Draw table header
      let currentX = startX;
      doc.fontSize(9).font('Helvetica-Bold');
      selectedFields.forEach(field => {
        doc.rect(currentX, currentY, fieldMap[field].width, 20).stroke();
        doc.text(fieldMap[field].label, currentX + 5, currentY + 5, {
          width: fieldMap[field].width - 10,
          align: 'left'
        });
        currentX += fieldMap[field].width;
      });

      currentY += 20;

      // Draw table rows
      doc.fontSize(8).font('Helvetica');
      applicants.forEach((applicant) => {
        // Check if we need a new page
        if (currentY > doc.page.height - 50) {
          doc.addPage();
          drawPageBorder(); // Draw border on new page
          currentY = 50;

          // Redraw header on new page
          currentX = startX;
          doc.fontSize(9).font('Helvetica-Bold');
          selectedFields.forEach(field => {
            doc.rect(currentX, currentY, fieldMap[field].width, 20).stroke();
            doc.text(fieldMap[field].label, currentX + 5, currentY + 5, {
              width: fieldMap[field].width - 10,
              align: 'left'
            });
            currentX += fieldMap[field].width;
          });
          currentY += 20;
          doc.fontSize(8).font('Helvetica');
        }

        currentX = startX;
        selectedFields.forEach(field => {
          let value = applicant[field];

          // Format values
          if (field === 'date_of_birth' && value) {
            value = new Date(value).toLocaleDateString();
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
          drawPageBorder(); // Draw border on legend page
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
        {
          action: 'enhanced_export_job_applicants',
          format: 'pdf',
          count: applicants.length,
          fields: selectedFields,
        },
        req
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "excel" or "pdf".',
      });
    }
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
 * @desc    Get placement poster statistics for any college (super admin)
 * @route   GET /api/super-admin/placement-poster/stats/:collegeId
 * @access  Private (Super Admin)
 */
export const getPlacementPosterStatsForCollege = async (req, res) => {
  try {
    const { collegeId } = req.params;

    console.log(`📊 [PLACEMENT POSTER STATS] Request for college ID ${collegeId} by super admin:`, req.user.id);

    // Validate college exists
    const collegeResult = await query(
      `SELECT id, college_name, logo_url FROM colleges WHERE id = $1`,
      [collegeId]
    );

    if (collegeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const { college_name: collegeName, logo_url: logoUrl } = collegeResult.rows[0];

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
      `Super admin viewed placement poster statistics for ${collegeName}`,
      'college',
      collegeId,
      req
    );

    res.status(200).json({
      success: true,
      data: {
        college_id: parseInt(collegeId),
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
 * @desc    Generate placement poster PDF for any college (super admin)
 * @route   POST /api/super-admin/placement-poster/generate/:collegeId
 * @access  Private (Super Admin)
 */
export const generatePlacementPosterForCollege = async (req, res) => {
  try {
    const { collegeId } = req.params;

    console.log(`🎨 [PLACEMENT POSTER] Generation request for college ID ${collegeId} by super admin:`, req.user.id);

    // Validate college exists and get details
    const collegeResult = await query(
      `SELECT id, college_name, logo_url FROM colleges WHERE id = $1`,
      [collegeId]
    );

    if (collegeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const { college_name: collegeName, logo_url: logoUrl } = collegeResult.rows[0];

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
      `Super admin generated placement poster for ${collegeName} (${placementsResult.rows.length} students)`,
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

/**
 * @desc    Generate combined placement poster PDF for multiple colleges (super admin)
 * @route   POST /api/super-admin/placement-poster/generate-multi
 * @access  Private (Super Admin)
 */
export const generateMultiCollegePlacementPoster = async (req, res) => {
  try {
    const { collegeIds } = req.body;

    console.log(`🎨 [MULTI-COLLEGE POSTER] Generation request for ${collegeIds?.length || 0} colleges by super admin:`, req.user.id);

    // Validate input
    if (!collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of college IDs',
      });
    }

    // Fetch data for each college
    const collegesData = [];

    for (const collegeId of collegeIds) {
      // Validate college exists and get details
      const collegeResult = await query(
        `SELECT id, college_name, logo_url FROM colleges WHERE id = $1`,
        [collegeId]
      );

      if (collegeResult.rows.length === 0) {
        console.warn(`⚠️ [MULTI-COLLEGE POSTER] College ID ${collegeId} not found, skipping`);
        continue;
      }

      const { college_name: collegeName, logo_url: logoUrl } = collegeResult.rows[0];

      // Fetch all placed students with complete details
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
        console.warn(`⚠️ [MULTI-COLLEGE POSTER] No placement data for ${collegeName}, skipping`);
        continue;
      }

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

      collegesData.push({
        collegeName,
        collegeLogo: logoUrl || null,
        placements: placementsResult.rows,
        startYear: startYear || new Date().getFullYear(),
        endYear: endYear || new Date().getFullYear()
      });

      console.log(`✅ [MULTI-COLLEGE POSTER] Added ${collegeName}: ${placementsResult.rows.length} students`);
    }

    if (collegesData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No placement data available for any of the selected colleges.',
      });
    }

    console.log(`📄 [MULTI-COLLEGE POSTER] Generating combined PDF for ${collegesData.length} colleges`);

    // Log activity BEFORE generation
    await logActivity(
      req.user.id,
      'MULTI_COLLEGE_POSTER_GENERATED',
      `Super admin generated combined placement poster for ${collegesData.length} colleges`,
      'system',
      null,
      req
    );

    // Import and use the multi-college PDF generator
    const { generateMultiCollegePlacementPosterPDF } = await import('../utils/pdfGenerator.js');
    await generateMultiCollegePlacementPosterPDF(collegesData, res);

  } catch (error) {
    console.error('❌ [MULTI-COLLEGE POSTER] Generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating multi-college placement poster',
        error: error.message,
      });
    }
  }
};

// ========================================
// MANUAL STUDENT ADDITION TO JOBS (SUPER ADMIN)
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
      ja.is_manual_addition,
      c.college_name
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    JOIN students s ON ja.student_id = s.id
    JOIN colleges c ON s.college_id = c.id
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

// @desc    Manually add student to job (for students who didn't apply but got selected) - SUPER ADMIN
// @route   POST /api/super-admin/manually-add-student-to-job
// @access  Private (Super Admin)
export const manuallyAddStudentToJob = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      job_id,
      student_prn,
      college_id, // Super admin can specify college
      placement_package,
      joining_date,
      placement_location,
      notes,
    } = req.body;

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

    // Find student by PRN (and optionally college_id for disambiguation)
    let studentQuery = `
      SELECT s.id, s.student_name, s.prn, s.branch, s.email, s.programme_cgpa,
             s.backlog_count, s.is_blacklisted, s.college_id, c.college_name
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      WHERE s.prn = $1
    `;
    const studentParams = [student_prn];

    if (college_id) {
      studentQuery += ' AND s.college_id = $2';
      studentParams.push(college_id);
    }

    const studentResult = await client.query(studentQuery, studentParams);

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: college_id
          ? 'Student not found in the specified college'
          : 'Student not found',
      });
    }

    if (studentResult.rows.length > 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Multiple students found with this PRN across colleges. Please specify college_id.',
        colleges: studentResult.rows.map((s) => ({
          college_id: s.college_id,
          college_name: s.college_name,
        })),
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
      ? `[MANUAL ADDITION by Super Admin on ${new Date().toISOString()}]\n${notes}`
      : `[MANUAL ADDITION by Super Admin on ${new Date().toISOString()}]`;

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
        ? `Super admin updated student ${student.student_name} (PRN: ${student_prn}) from ${student.college_name} application to selected for job ${job.company_name} - ${job.job_title}`
        : `Super admin manually added student ${student.student_name} (PRN: ${student_prn}) from ${student.college_name} to job ${job.company_name} - ${job.job_title}`,
      'job_application',
      newApplication.id,
      {
        job_id,
        student_id: student.id,
        student_prn,
        college_id: student.college_id,
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
          college_name: student.college_name,
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
    console.error('❌ Manual student addition error (Super Admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error manually adding student to job',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// @desc    Validate student PRN for manual addition (check student details before adding) - SUPER ADMIN
// @route   POST /api/super-admin/validate-student-for-manual-addition
// @access  Private (Super Admin)
export const validateStudentForManualAddition = async (req, res) => {
  try {
    const { student_prn, college_id, job_id } = req.body;

    if (!student_prn) {
      return res.status(400).json({
        success: false,
        message: 'Student PRN is required',
      });
    }

    // Find student by PRN (and optionally college_id)
    let studentQuery = `
      SELECT s.id, s.student_name, s.prn, s.branch, s.email, s.programme_cgpa,
             s.backlog_count, s.is_blacklisted, s.photo_url, s.gender,
             s.college_id, c.college_name, c.college_code
      FROM students s
      JOIN colleges c ON s.college_id = c.id
      WHERE s.prn = $1
    `;
    const studentParams = [student_prn];

    if (college_id) {
      studentQuery += ' AND s.college_id = $2';
      studentParams.push(college_id);
    }

    const studentResult = await query(studentQuery, studentParams);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: college_id
          ? 'Student not found in the specified college'
          : 'Student not found',
      });
    }

    // If multiple students found with same PRN, return them for disambiguation
    if (studentResult.rows.length > 1) {
      return res.status(200).json({
        success: true,
        message: 'Multiple students found with this PRN',
        requires_disambiguation: true,
        students: studentResult.rows.map((s) => ({
          id: s.id,
          name: s.student_name,
          prn: s.prn,
          college_id: s.college_id,
          college_name: s.college_name,
          college_code: s.college_code,
          branch: s.branch,
        })),
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
          college_name: student.college_name,
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
          college_id: student.college_id,
          college_name: student.college_name,
          college_code: student.college_code,
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
    console.error('❌ Validate student error (Super Admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error validating student',
      error: error.message,
    });
  }
};

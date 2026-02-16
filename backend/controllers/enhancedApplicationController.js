/**
 * Enhanced Application Controller
 *
 * Handles the smart job application flow with:
 * - Requirement validation
 * - Missing data detection
 * - Custom field collection
 * - Tier 2 & 3 data storage
 */

import { query, transaction } from '../config/database.js';

/**
 * Helper function to determine section for a specific field
 */
function getSectionForField(fieldName) {
  const sectionMap = {
    'height_cm': 'physical_details',
    'weight_kg': 'physical_details',
    'physically_handicapped': 'physical_details',
    'handicap_details': 'physical_details',
    'sslc_marks': 'academic_extended',
    'sslc_year': 'academic_extended',
    'sslc_board': 'academic_extended',
    'twelfth_marks': 'academic_extended',
    'twelfth_year': 'academic_extended',
    'twelfth_board': 'academic_extended',
    'father_name': 'family_details',
    'father_occupation': 'family_details',
    'father_annual_income': 'family_details',
    'mother_name': 'family_details',
    'mother_occupation': 'family_details',
    'mother_annual_income': 'family_details',
    'siblings_count': 'family_details',
    'siblings_details': 'family_details',
    'district': 'personal_details',
    'permanent_address': 'personal_details',
    'interests_hobbies': 'personal_details',
    'has_pan_card': 'document_verification',
    'pan_number': 'document_verification',
    'has_aadhar_card': 'document_verification',
    'aadhar_number': 'document_verification',
    'has_passport': 'document_verification',
    'passport_number': 'document_verification',
    'has_driving_license': 'document_verification',
    'interested_in_btech': 'education_preferences',
    'interested_in_mtech': 'education_preferences',
    'preferred_study_mode': 'education_preferences'
  };
  return sectionMap[fieldName] || 'specific';
}

/**
 * Check Application Readiness
 * Validates if student has all required data to apply for a job
 *
 * @route POST /api/students/jobs/:jobId/check-readiness
 * @access Student
 */
export const checkApplicationReadiness = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get student data with extended profile
    const studentResult = await query(
      `SELECT
        s.id, s.user_id, s.prn, s.region_id, s.college_id, s.email, s.mobile_number,
        s.programme_cgpa, s.date_of_birth, s.backlog_count, s.backlog_details,
        s.registration_status, s.is_blacklisted, s.student_name, s.age, s.gender,
        s.height, s.weight, s.complete_address, s.cgpa_sem1, s.cgpa_sem2, s.cgpa_sem3,
        s.cgpa_sem4, s.cgpa_sem5, s.cgpa_sem6, s.branch, s.has_driving_license,
        s.has_pan_card, s.photo_url, s.email_verified,
        ep.sslc_marks, ep.sslc_year, ep.sslc_board, ep.twelfth_marks, ep.twelfth_year,
        ep.twelfth_board, ep.height_cm, ep.weight_kg, ep.physically_handicapped,
        ep.handicap_details, ep.district, ep.permanent_address, ep.interests_hobbies,
        ep.father_name, ep.father_occupation, ep.father_annual_income,
        ep.mother_name, ep.mother_occupation, ep.mother_annual_income,
        ep.siblings_count, ep.siblings_details, ep.has_pan_card as ep_has_pan_card,
        ep.pan_number, ep.has_aadhar_card, ep.aadhar_number, ep.has_passport,
        ep.passport_number, ep.interested_in_btech, ep.interested_in_mtech,
        ep.preferred_study_mode, ep.additional_certifications, ep.achievements,
        ep.extracurricular, ep.profile_completion_percentage
       FROM students s
       LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
       WHERE s.user_id = $1`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student = studentResult.rows[0];

    // Get job requirements from template OR from jobs table
    const requirementsResult = await query(
      `SELECT jrt.*, j.job_title, j.company_name
       FROM job_requirement_templates jrt
       JOIN jobs j ON j.id = jrt.job_id
       WHERE jrt.job_id = $1`,
      [jobId]
    );

    // Get job details for fallback
    const jobResult = await query(
      `SELECT id, job_title, company_name, min_cgpa, max_backlogs, backlog_max_semester, allowed_branches
       FROM jobs
       WHERE id = $1 AND is_active = TRUE`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active'
      });
    }

    const job = jobResult.rows[0];
    let requirements;
    let customFields = [];

    // Use job_requirement_templates if available, otherwise use jobs table criteria
    if (requirementsResult.rows.length > 0) {
      requirements = requirementsResult.rows[0];
      customFields = requirements.custom_fields || [];
    } else {
      // Fallback to jobs table criteria
      requirements = {
        min_cgpa: job.min_cgpa,
        max_backlogs: job.max_backlogs,
        allowed_branches: job.allowed_branches
      };
    }

    const missingFields = [];

    // Check college/region targeting FIRST (blocking if student's college is not targeted)
    if (job.target_type === 'college' && job.target_colleges) {
      const targetColleges = (typeof job.target_colleges === 'string'
        ? JSON.parse(job.target_colleges) : job.target_colleges).map(Number);
      if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
        missingFields.push({
          field: 'college_id', section: 'core', label: 'College',
          message: 'This job is not available for your college',
          blocking: true
        });
      }
    }

    if ((job.target_type === 'region' || job.target_type === 'specific') && job.target_regions) {
      const targetRegions = (typeof job.target_regions === 'string'
        ? JSON.parse(job.target_regions) : job.target_regions).map(Number);
      if (targetRegions.length > 0 && !targetRegions.includes(Number(student.region_id))) {
        // For 'specific', also check colleges
        if (job.target_type === 'specific' && job.target_colleges) {
          const targetColleges = (typeof job.target_colleges === 'string'
            ? JSON.parse(job.target_colleges) : job.target_colleges).map(Number);
          if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
            missingFields.push({
              field: 'college_id', section: 'core', label: 'College/Region',
              message: 'This job is not available for your college or region',
              blocking: true
            });
          }
        } else {
          missingFields.push({
            field: 'region_id', section: 'core', label: 'Region',
            message: 'This job is not available for your region',
            blocking: true
          });
        }
      }
    }

    if (job.target_type === 'specific' && !job.target_regions && job.target_colleges) {
      const targetColleges = (typeof job.target_colleges === 'string'
        ? JSON.parse(job.target_colleges) : job.target_colleges).map(Number);
      if (targetColleges.length > 0 && !targetColleges.includes(Number(student.college_id))) {
        missingFields.push({
          field: 'college_id', section: 'core', label: 'College',
          message: 'This job is not available for your college',
          blocking: true
        });
      }
    }

    // If no requirements at all and no targeting issues, student is ready to apply
    if (missingFields.length === 0 && !requirements.min_cgpa && requirements.max_backlogs === null && (!requirements.allowed_branches || requirements.allowed_branches.length === 0)) {
      return res.json({
        success: true,
        ready_to_apply: true,
        has_blocking_issues: false,
        missing_fields: [],
        custom_fields: [],
        message: 'You can apply for this job'
      });
    }

    // Validate Tier 1 requirements using programme_cgpa instead of cgpa
    const studentCgpa = student.programme_cgpa || student.cgpa;
    if (requirements.min_cgpa && studentCgpa < requirements.min_cgpa) {
      missingFields.push({
        field: 'programme_cgpa',
        section: 'core',
        label: 'CGPA',
        required_value: requirements.min_cgpa,
        current_value: studentCgpa,
        message: `Minimum CGPA required: ${requirements.min_cgpa}`,
        blocking: true
      });
    }

    // Per-semester backlog check
    const semBacklogs = [
      student.backlogs_sem1 || 0, student.backlogs_sem2 || 0,
      student.backlogs_sem3 || 0, student.backlogs_sem4 || 0,
      student.backlogs_sem5 || 0, student.backlogs_sem6 || 0,
    ];
    const totalBacklogs = semBacklogs.reduce((a, b) => a + b, 0);
    const backlogMaxSem = requirements.backlog_max_semester || null;

    if (requirements.max_backlogs !== null && requirements.max_backlogs !== undefined) {
      let backlogFailed = false;
      let backlogMessage = '';

      if (backlogMaxSem) {
        const withinRange = semBacklogs.slice(0, backlogMaxSem).reduce((a, b) => a + b, 0);
        const afterRange = semBacklogs.slice(backlogMaxSem).reduce((a, b) => a + b, 0);
        if (afterRange > 0) {
          backlogFailed = true;
          backlogMessage = `You have backlogs in semesters after Sem ${backlogMaxSem}. Only backlogs within Sem 1-${backlogMaxSem} are allowed`;
        } else if (withinRange > requirements.max_backlogs) {
          backlogFailed = true;
          backlogMessage = `Maximum ${requirements.max_backlogs} backlogs allowed within Sem 1-${backlogMaxSem}. You have ${withinRange}`;
        }
      } else {
        if (totalBacklogs > requirements.max_backlogs) {
          backlogFailed = true;
          backlogMessage = `Maximum ${requirements.max_backlogs} backlogs allowed. You have ${totalBacklogs}`;
        }
      }

      if (backlogFailed) {
        missingFields.push({
          field: 'backlog_count',
          section: 'core',
          label: 'Active Backlogs',
          required_value: requirements.max_backlogs,
          current_value: totalBacklogs,
          message: backlogMessage,
          blocking: true
        });
      }
    }

    if (requirements.allowed_branches && requirements.allowed_branches.length > 0) {
      if (!requirements.allowed_branches.includes(student.branch)) {
        missingFields.push({
          field: 'branch',
          section: 'core',
          label: 'Branch',
          required_value: requirements.allowed_branches,
          current_value: student.branch,
          message: `Your branch (${student.branch}) is not in the allowed list: ${requirements.allowed_branches.join(', ')}`,
          blocking: true
        });
      }
    }

    // Check Tier 2 requirements
    if (requirements.requires_academic_extended) {
      const sslcFilled = student.sslc_marks && student.sslc_year;
      const twelfthFilled = student.twelfth_marks && student.twelfth_year;

      // Check if SSLC is missing
      if (!sslcFilled) {
        missingFields.push({
          field: 'sslc_details',
          section: 'academic_extended',
          label: 'SSLC Details',
          message: 'Please complete your SSLC details (marks, year, board)',
          blocking: false
        });
      }

      // Check if 12th is missing (separate check for partial completion detection)
      if (!twelfthFilled) {
        missingFields.push({
          field: 'twelfth_details',
          section: 'academic_extended',
          label: '12th Standard Details',
          message: 'Please complete your 12th standard details (marks, year, board)',
          blocking: false
        });
      }
    }

    if (requirements.requires_physical_details) {
      if (!student.height_cm || !student.weight_kg) {
        missingFields.push({
          field: 'physical_details',
          section: 'physical_details',
          label: 'Physical Details',
          message: 'Please complete your physical details (height, weight)',
          blocking: false
        });
      }
    }

    if (requirements.requires_family_details) {
      if (!student.father_name || !student.mother_name) {
        missingFields.push({
          field: 'family_details',
          section: 'family_details',
          label: 'Family Details',
          message: 'Please complete your family details',
          blocking: false
        });
      }
    }

    if (requirements.requires_document_verification) {
      // Use extended profile fields (ep_has_pan_card, has_aadhar_card)
      const hasPanCard = student.ep_has_pan_card !== null ? student.ep_has_pan_card : student.has_pan_card;
      const hasAadharCard = student.has_aadhar_card;

      // Only flag as missing if NOT filled (null or undefined), not if explicitly set to false
      const panNotFilled = hasPanCard === null || hasPanCard === undefined;
      const aadharNotFilled = hasAadharCard === null || hasAadharCard === undefined;

      if (panNotFilled || aadharNotFilled) {
        missingFields.push({
          field: 'document_verification',
          section: 'document_verification',
          label: 'Document Verification',
          message: 'Please verify your document status (PAN, Aadhar)',
          blocking: false
        });
      }
    }

    if (requirements.requires_education_preferences) {
      if (student.interested_in_btech === null) {
        missingFields.push({
          field: 'education_preferences',
          section: 'education_preferences',
          label: 'Education Preferences',
          message: 'Please specify your education preferences',
          blocking: false
        });
      }
    }

    // Check specific field requirements (BLOCKING for advanced configuration)
    if (requirements.specific_field_requirements) {
      const fieldReqs = requirements.specific_field_requirements;

      for (const [fieldName, fieldReq] of Object.entries(fieldReqs)) {
        const studentValue = student[fieldName];

        // For required fields where student hasn't filled yet - non-blocking (can fill during application)
        if (fieldReq.required && (studentValue === null || studentValue === undefined || studentValue === '')) {
          missingFields.push({
            field: fieldName,
            section: getSectionForField(fieldName),
            label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            message: `${fieldName.replace(/_/g, ' ')} is required`,
            blocking: false
          });
        }

        // For minimum value requirements where student HAS filled but doesn't meet criteria - BLOCKING
        if (fieldReq.min && studentValue !== null && studentValue !== undefined && studentValue !== '') {
          const numericValue = parseFloat(studentValue);
          if (!isNaN(numericValue) && numericValue < fieldReq.min) {
            missingFields.push({
              field: fieldName,
              section: getSectionForField(fieldName),
              label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              required_value: fieldReq.min,
              current_value: studentValue,
              message: `Your ${fieldName.replace(/_/g, ' ')} (${studentValue}) does not meet the minimum requirement (${fieldReq.min})`,
              blocking: true // BLOCKING - student cannot meet this requirement
            });
          }
        }
      }
    }

    const hasBlockingIssues = missingFields.some(f => f.blocking);
    const readyToApply = missingFields.length === 0;

    res.json({
      success: true,
      ready_to_apply: readyToApply,
      has_blocking_issues: hasBlockingIssues,
      missing_fields: missingFields,
      custom_fields: customFields,
      message: readyToApply
        ? 'You can apply for this job'
        : hasBlockingIssues
        ? 'You do not meet the eligibility criteria for this job'
        : 'Please complete some additional information before applying'
    });
  } catch (error) {
    console.error('Error checking application readiness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check application readiness',
      error: error.message
    });
  }
};

/**
 * Update student extended profile from tier2_data within a transaction
 * Maps fields to appropriate sections and updates database
 */
async function updateExtendedProfileFromTier2(client, studentId, tier2Data, sectionsFilled) {
  // Map fields to sections
  const sectionFieldMap = {
    academic_extended: ['sslc_marks', 'sslc_year', 'sslc_board', 'twelfth_marks', 'twelfth_year', 'twelfth_board'],
    physical_details: ['height_cm', 'weight_kg', 'physically_handicapped', 'handicap_details'],
    family_details: ['father_name', 'father_occupation', 'father_annual_income', 'mother_name', 'mother_occupation', 'mother_annual_income', 'siblings_count', 'siblings_details'],
    personal_details: ['district', 'permanent_address', 'interests_hobbies'],
    document_verification: ['has_driving_license', 'has_pan_card', 'has_aadhar_card', 'has_passport'],
    education_preferences: ['interested_in_btech', 'interested_in_mtech', 'preferred_study_mode']
  };

  // Define boolean fields that need type conversion
  const booleanFields = [
    'physically_handicapped',
    'has_driving_license',
    'has_pan_card',
    'has_aadhar_card',
    'has_passport',
    'interested_in_btech',
    'interested_in_mtech'
  ];

  // Helper function to convert string booleans to actual booleans
  const sanitizeValue = (fieldName, value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Convert boolean fields
    if (booleanFields.includes(fieldName)) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      return !!value;
    }

    return value;
  };

  // CRITICAL FIX: Ensure student_extended_profiles row exists
  // Check if profile exists
  const profileCheck = await client.query(
    'SELECT id FROM student_extended_profiles WHERE student_id = $1',
    [studentId]
  );

  // If no profile exists, create one
  if (profileCheck.rows.length === 0) {
    await client.query(
      `INSERT INTO student_extended_profiles (student_id, last_updated, created_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [studentId]
    );
    console.log(`Created new extended profile for student ${studentId}`);
  }

  // For each section that was filled
  for (const sectionName of sectionsFilled) {
    const fieldsInSection = sectionFieldMap[sectionName] || [];
    const sectionData = {};

    fieldsInSection.forEach(field => {
      if (tier2Data[field] !== undefined && tier2Data[field] !== null && tier2Data[field] !== '') {
        // Sanitize the value to ensure proper types (especially booleans)
        sectionData[field] = sanitizeValue(field, tier2Data[field]);
      }
    });

    if (Object.keys(sectionData).length === 0) continue;

    // Build dynamic UPDATE query
    const fields = Object.keys(sectionData);
    const setClause = fields.map((field, idx) =>
      `${field} = $${idx + 1}`
    ).join(', ');

    const values = [...fields.map(field => sectionData[field]), studentId];

    const updateResult = await client.query(
      `UPDATE student_extended_profiles
       SET ${setClause}, last_updated = CURRENT_TIMESTAMP
       WHERE student_id = $${values.length}`,
      values
    );

    console.log(`Updated ${updateResult.rowCount} extended profile row(s) for student ${studentId}, section: ${sectionName}`);

    // Update section completion
    await updateSectionCompletionInTransaction(client, studentId, sectionName);
  }

  // Recalculate overall completion
  await client.query('SELECT calculate_profile_completion($1)', [studentId]);
}

/**
 * Update section completion within transaction
 * Calculates completion percentage for a specific section
 */
async function updateSectionCompletionInTransaction(client, studentId, sectionName) {
  // Get profile data
  const profileResult = await client.query(
    `SELECT ep.* FROM student_extended_profiles ep WHERE ep.student_id = $1`,
    [studentId]
  );

  if (profileResult.rows.length === 0) return;
  const profile = profileResult.rows[0];

  let isCompleted = false;
  let completionPercentage = 0;

  // Calculate completion based on section
  switch (sectionName) {
    case 'academic_extended':
      const academicFields = [profile.sslc_marks, profile.sslc_year, profile.sslc_board];
      const academicFilled = academicFields.filter(f => f !== null && f !== '').length;
      completionPercentage = Math.round((academicFilled / academicFields.length) * 100);
      isCompleted = completionPercentage === 100;
      break;
    case 'physical_details':
      const physicalFields = [profile.height_cm, profile.weight_kg];
      const physicalFilled = physicalFields.filter(f => f !== null && f !== '').length;
      completionPercentage = Math.round((physicalFilled / physicalFields.length) * 100);
      isCompleted = completionPercentage === 100;
      break;
    case 'family_details':
      const familyFields = [profile.father_name, profile.mother_name, profile.siblings_count];
      // Exclude default numeric 0 values from being counted as filled
      const familyFilled = familyFields.filter(f => {
        if (f === null || f === undefined || f === '') return false;
        if (f === 0) return false; // siblings_count of 0 doesn't count as filled
        return true;
      }).length;
      completionPercentage = Math.round((familyFilled / familyFields.length) * 100);
      isCompleted = completionPercentage === 100;
      break;
    case 'personal_details':
      const personalFields = [profile.district, profile.permanent_address, profile.interests_hobbies];
      const personalFilled = personalFields.filter(f => f !== null && f !== '').length;
      completionPercentage = Math.round((personalFilled / personalFields.length) * 100);
      isCompleted = completionPercentage === 100;
      break;
    case 'document_verification':
      const documentFields = [profile.has_driving_license, profile.has_pan_card, profile.has_aadhar_card, profile.has_passport];
      const documentFilled = documentFields.filter(f => f === true).length;
      completionPercentage = Math.round((documentFilled / documentFields.length) * 100);
      isCompleted = completionPercentage === 100;
      break;
    case 'education_preferences':
      const educationFields = [profile.interested_in_btech, profile.interested_in_mtech];
      const educationFilled = educationFields.filter(f => f === true).length;
      completionPercentage = educationFilled > 0 ? (profile.preferred_study_mode ? 100 : 50) : 0;
      isCompleted = educationFilled > 0 && (profile.preferred_study_mode !== null && profile.preferred_study_mode !== '');
      break;
  }

  await client.query(
    `INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, section_name)
     DO UPDATE SET is_completed = $3, completion_percentage = $4, last_updated = CURRENT_TIMESTAMP`,
    [studentId, sectionName, isCompleted, completionPercentage]
  );
}

/**
 * Submit Enhanced Job Application
 * Submits application with Tier 2 snapshot and Tier 3 custom responses
 *
 * @route POST /api/students/jobs/:jobId/apply-enhanced
 * @access Student
 */
export const submitEnhancedApplication = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const { custom_field_responses, additional_data, tier2_data, sections_filled } = req.body;

    await transaction(async (client) => {
      // Get student with extended profile
      const studentResult = await client.query(
        `SELECT
          s.id, s.user_id, s.prn, s.region_id, s.college_id, s.email, s.mobile_number,
          s.programme_cgpa, s.date_of_birth, s.backlog_count, s.backlog_details,
          s.registration_status, s.is_blacklisted, s.student_name, s.age, s.gender,
          s.height, s.weight, s.complete_address, s.cgpa_sem1, s.cgpa_sem2, s.cgpa_sem3,
          s.cgpa_sem4, s.cgpa_sem5, s.cgpa_sem6, s.branch, s.has_driving_license,
          s.has_pan_card, s.photo_url, s.email_verified,
          ep.sslc_marks, ep.sslc_year, ep.sslc_board, ep.twelfth_marks, ep.twelfth_year,
          ep.twelfth_board, ep.height_cm, ep.weight_kg, ep.physically_handicapped,
          ep.handicap_details, ep.district, ep.permanent_address, ep.interests_hobbies,
          ep.father_name, ep.father_occupation, ep.father_annual_income,
          ep.mother_name, ep.mother_occupation, ep.mother_annual_income,
          ep.siblings_count, ep.siblings_details, ep.has_pan_card as ep_has_pan_card,
          ep.pan_number, ep.has_aadhar_card, ep.aadhar_number, ep.has_passport,
          ep.passport_number, ep.interested_in_btech, ep.interested_in_mtech,
          ep.preferred_study_mode, ep.additional_certifications, ep.achievements,
          ep.extracurricular, ep.profile_completion_percentage
         FROM students s
         LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
         WHERE s.user_id = $1`,
        [userId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student profile not found');
      }

      const student = studentResult.rows[0];

      // Check if job exists
      const jobResult = await client.query(
        'SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found or no longer active');
      }

      const job = jobResult.rows[0];

      // Check deadline
      if (new Date(job.application_deadline) < new Date()) {
        throw new Error('Application deadline has passed');
      }

      // Check if already applied
      const existingApp = await client.query(
        'SELECT id FROM job_applications WHERE job_id = $1 AND student_id = $2',
        [jobId, student.id]
      );

      if (existingApp.rows.length > 0) {
        throw new Error('You have already applied for this job');
      }

      // Get job requirements for validation
      const requirementsResult = await client.query(
        'SELECT * FROM job_requirement_templates WHERE job_id = $1',
        [jobId]
      );

      let meetsRequirements = true;
      let validationErrors = [];

      // Also check jobs table for criteria if no template requirements
      const jobCriteriaResult = await client.query(
        'SELECT min_cgpa, max_backlogs, backlog_max_semester, allowed_branches FROM jobs WHERE id = $1',
        [jobId]
      );

      const jobCriteria = jobCriteriaResult.rows[0];
      let requirements;

      if (requirementsResult.rows.length > 0) {
        requirements = requirementsResult.rows[0];
      } else if (jobCriteria) {
        // Use jobs table criteria
        requirements = {
          min_cgpa: jobCriteria.min_cgpa,
          max_backlogs: jobCriteria.max_backlogs,
          backlog_max_semester: jobCriteria.backlog_max_semester,
          allowed_branches: jobCriteria.allowed_branches
        };
      }

      if (requirements) {
        // Validate requirements using programme_cgpa
        const studentCgpa = student.programme_cgpa || student.cgpa;
        if (requirements.min_cgpa && studentCgpa < requirements.min_cgpa) {
          meetsRequirements = false;
          validationErrors.push(`CGPA below minimum: ${requirements.min_cgpa}`);
        }

        // Per-semester backlog check
        const submitSemBacklogs = [
          student.backlogs_sem1 || 0, student.backlogs_sem2 || 0,
          student.backlogs_sem3 || 0, student.backlogs_sem4 || 0,
          student.backlogs_sem5 || 0, student.backlogs_sem6 || 0,
        ];
        const submitTotalBacklogs = submitSemBacklogs.reduce((a, b) => a + b, 0);
        const submitMaxSem = requirements.backlog_max_semester || null;

        if (requirements.max_backlogs !== null && requirements.max_backlogs !== undefined) {
          if (submitMaxSem) {
            const withinRange = submitSemBacklogs.slice(0, submitMaxSem).reduce((a, b) => a + b, 0);
            const afterRange = submitSemBacklogs.slice(submitMaxSem).reduce((a, b) => a + b, 0);
            if (withinRange > requirements.max_backlogs || afterRange > 0) {
              meetsRequirements = false;
              validationErrors.push(`Too many backlogs. Maximum ${requirements.max_backlogs} allowed within Sem 1-${submitMaxSem}`);
            }
          } else {
            if (submitTotalBacklogs > requirements.max_backlogs) {
              meetsRequirements = false;
              validationErrors.push(`Too many backlogs. Maximum allowed: ${requirements.max_backlogs}`);
            }
          }
        }

        if (requirements.allowed_branches && requirements.allowed_branches.length > 0) {
          if (!requirements.allowed_branches.includes(student.branch)) {
            meetsRequirements = false;
            validationErrors.push('Branch not eligible');
          }
        }
      }

      // Update extended profile from tier2_data BEFORE creating application
      if (tier2_data && Object.keys(tier2_data).length > 0 && sections_filled && sections_filled.length > 0) {
        console.log('Updating extended profile for student:', student.id);
        try {
          await updateExtendedProfileFromTier2(
            client,
            student.id,
            tier2_data,
            sections_filled
          );
          console.log('Extended profile update completed successfully');
        } catch (profileError) {
          console.error('Extended profile update failed:', profileError);
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      } else {
        console.log('No new extended profile data submitted - student profile already complete or no sections required');
      }

      // Fetch UPDATED profile for snapshot
      const updatedProfileResult = await client.query(
        `SELECT
          s.id, s.user_id, s.prn, s.region_id, s.college_id, s.email, s.mobile_number,
          s.programme_cgpa, s.date_of_birth, s.backlog_count, s.backlog_details,
          s.registration_status, s.is_blacklisted, s.student_name, s.age, s.gender,
          s.height, s.weight, s.complete_address, s.cgpa_sem1, s.cgpa_sem2, s.cgpa_sem3,
          s.cgpa_sem4, s.cgpa_sem5, s.cgpa_sem6, s.branch, s.has_driving_license,
          s.has_pan_card, s.photo_url, s.email_verified,
          ep.sslc_marks, ep.sslc_year, ep.sslc_board, ep.twelfth_marks, ep.twelfth_year,
          ep.twelfth_board, ep.height_cm, ep.weight_kg, ep.physically_handicapped,
          ep.handicap_details, ep.district, ep.permanent_address, ep.interests_hobbies,
          ep.father_name, ep.father_occupation, ep.father_annual_income,
          ep.mother_name, ep.mother_occupation, ep.mother_annual_income,
          ep.siblings_count, ep.siblings_details, ep.has_pan_card as ep_has_pan_card,
          ep.pan_number, ep.has_aadhar_card, ep.aadhar_number, ep.has_passport,
          ep.passport_number, ep.interested_in_btech, ep.interested_in_mtech,
          ep.preferred_study_mode, ep.additional_certifications, ep.achievements,
          ep.extracurricular, ep.profile_completion_percentage
         FROM students s
         LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
         WHERE s.user_id = $1`,
        [userId]
      );

      const updatedStudent = updatedProfileResult.rows[0] || student;

      // Validate required extended profile sections are actually filled
      if (requirements) {
        if (requirements.requires_physical_details) {
          if (!updatedStudent.height_cm || !updatedStudent.weight_kg) {
            meetsRequirements = false;
            validationErrors.push('Physical details (height, weight) are required for this job but not completed');
          }
        }

        if (requirements.requires_academic_extended) {
          if (!updatedStudent.sslc_marks || !updatedStudent.sslc_year) {
            meetsRequirements = false;
            validationErrors.push('SSLC academic details are required for this job but not completed');
          }
        }

        if (requirements.requires_family_details) {
          if (!updatedStudent.father_name || !updatedStudent.mother_name) {
            meetsRequirements = false;
            validationErrors.push('Family details are required for this job but not completed');
          }
        }

        if (requirements.requires_document_verification) {
          const hasPanCard = updatedStudent.ep_has_pan_card !== null ? updatedStudent.ep_has_pan_card : updatedStudent.has_pan_card;
          const hasAadharCard = updatedStudent.has_aadhar_card;
          if (hasPanCard === null || hasPanCard === undefined || hasAadharCard === null || hasAadharCard === undefined) {
            meetsRequirements = false;
            validationErrors.push('Document verification details are required for this job but not completed');
          }
        }

        if (requirements.requires_education_preferences) {
          if (updatedStudent.interested_in_btech === null || updatedStudent.interested_in_btech === undefined) {
            meetsRequirements = false;
            validationErrors.push('Education preferences are required for this job but not completed');
          }
        }

        if (requirements.requires_personal_details) {
          if (!updatedStudent.district || !updatedStudent.permanent_address) {
            meetsRequirements = false;
            validationErrors.push('Personal details (district, address) are required for this job but not completed');
          }
        }
      }

      // CRITICAL: Re-validate specific field requirements AFTER profile update
      // This ensures that newly filled values (height, weight, SSLC) meet the minimum requirements
      if (requirements && requirements.specific_field_requirements) {
        const fieldReqs = requirements.specific_field_requirements;

        for (const [fieldName, fieldReq] of Object.entries(fieldReqs)) {
          const studentValue = updatedStudent[fieldName];

          // Check minimum value requirements with updated data
          if (fieldReq.min && studentValue !== null && studentValue !== undefined && studentValue !== '') {
            const numericValue = parseFloat(studentValue);
            if (!isNaN(numericValue) && numericValue < fieldReq.min) {
              meetsRequirements = false;
              validationErrors.push(
                `${fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: Your value (${studentValue}) does not meet the minimum requirement (${fieldReq.min})`
              );
            }
          }

          // Check required fields
          if (fieldReq.required && (studentValue === null || studentValue === undefined || studentValue === '')) {
            meetsRequirements = false;
            validationErrors.push(
              `${fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} is required`
            );
          }
        }
      }

      // If validation failed due to specific field requirements, return error immediately
      if (!meetsRequirements && validationErrors.length > 0) {
        throw new Error(`Application rejected: ${validationErrors.join('; ')}`);
      }

      // Create basic application
      const applicationResult = await client.query(
        `INSERT INTO job_applications (job_id, student_id, application_status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [jobId, student.id, meetsRequirements ? 'submitted' : 'rejected']
      );

      const application = applicationResult.rows[0];

      // Create Tier 2 snapshot from UPDATED profile
      const tier2Snapshot = {
        sslc_marks: updatedStudent.sslc_marks,
        sslc_year: updatedStudent.sslc_year,
        sslc_board: updatedStudent.sslc_board,
        twelfth_marks: updatedStudent.twelfth_marks,
        twelfth_year: updatedStudent.twelfth_year,
        twelfth_board: updatedStudent.twelfth_board,
        height_cm: updatedStudent.height_cm,
        weight_kg: updatedStudent.weight_kg,
        physically_handicapped: updatedStudent.physically_handicapped,
        handicap_details: updatedStudent.handicap_details,
        district: updatedStudent.district,
        permanent_address: updatedStudent.permanent_address,
        interests_hobbies: updatedStudent.interests_hobbies,
        father_name: updatedStudent.father_name,
        father_occupation: updatedStudent.father_occupation,
        father_annual_income: updatedStudent.father_annual_income,
        mother_name: updatedStudent.mother_name,
        mother_occupation: updatedStudent.mother_occupation,
        mother_annual_income: updatedStudent.mother_annual_income,
        siblings_count: updatedStudent.siblings_count,
        siblings_details: updatedStudent.siblings_details,
        has_pan_card: updatedStudent.ep_has_pan_card !== null ? updatedStudent.ep_has_pan_card : updatedStudent.has_pan_card,
        pan_number: updatedStudent.pan_number,
        has_aadhar_card: updatedStudent.has_aadhar_card,
        aadhar_number: updatedStudent.aadhar_number,
        has_passport: updatedStudent.has_passport,
        passport_number: updatedStudent.passport_number,
        has_driving_license: updatedStudent.has_driving_license,
        interested_in_btech: updatedStudent.interested_in_btech,
        interested_in_mtech: updatedStudent.interested_in_mtech,
        preferred_study_mode: updatedStudent.preferred_study_mode,
        ...additional_data
      };

      // Create extended application record
      await client.query(
        `INSERT INTO job_applications_extended (
          application_id,
          tier2_snapshot,
          custom_field_responses,
          meets_requirements,
          validation_errors
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          application.id,
          JSON.stringify(tier2Snapshot),
          JSON.stringify(custom_field_responses || {}),
          meetsRequirements,
          JSON.stringify(validationErrors)
        ]
      );

      res.status(201).json({
        success: true,
        message: tier2_data && Object.keys(tier2_data).length > 0
          ? 'Application submitted and profile updated successfully'
          : 'Application submitted successfully',
        data: {
          application_id: application.id,
          meets_requirements: meetsRequirements,
          status: application.application_status,
          validation_errors: validationErrors,
          profile_updated: tier2_data && Object.keys(tier2_data).length > 0,
          sections_updated: sections_filled || []
        }
      });
    });
  } catch (error) {
    console.error('Error submitting enhanced application:', error);

    // Check for specific error messages
    if (error.message === 'Job not found or no longer active') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Application deadline has passed' || error.message === 'You have already applied for this job') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

/**
 * Get Missing Fields for Job Application
 * Returns structured data about what fields need to be filled
 *
 * @route GET /api/students/jobs/:jobId/missing-fields
 * @access Student
 */
export const getMissingFields = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get student extended profile
    const studentResult = await query(
      `SELECT
        s.id, s.user_id, s.prn, s.branch,
        ep.sslc_marks, ep.sslc_year, ep.sslc_board, ep.twelfth_marks, ep.twelfth_year,
        ep.twelfth_board, ep.height_cm, ep.weight_kg, ep.physically_handicapped,
        ep.handicap_details, ep.district, ep.permanent_address, ep.interests_hobbies,
        ep.father_name, ep.father_occupation, ep.father_annual_income,
        ep.mother_name, ep.mother_occupation, ep.mother_annual_income,
        ep.siblings_count, ep.siblings_details, ep.has_pan_card, ep.pan_number,
        ep.has_aadhar_card, ep.aadhar_number, ep.has_passport, ep.passport_number
       FROM students s
       LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
       WHERE s.user_id = $1`,
      [userId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student = studentResult.rows[0];

    // Get job requirements
    const requirementsResult = await query(
      'SELECT * FROM job_requirement_templates WHERE job_id = $1',
      [jobId]
    );

    if (requirementsResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          missing_sections: [],
          custom_fields: []
        }
      });
    }

    const requirements = requirementsResult.rows[0];
    const missingSections = [];

    // Check each required section
    if (requirements.requires_academic_extended) {
      const academicComplete = student.sslc_marks && student.sslc_year && student.sslc_board;
      if (!academicComplete) {
        missingSections.push({
          section: 'academic_extended',
          label: 'Academic Extended Details',
          fields: [
            { name: 'sslc_marks', label: 'SSLC Marks (%)', type: 'number', value: student.sslc_marks },
            { name: 'sslc_year', label: 'SSLC Year', type: 'number', value: student.sslc_year },
            { name: 'sslc_board', label: 'SSLC Board', type: 'text', value: student.sslc_board },
            { name: 'twelfth_marks', label: '12th Marks (%)', type: 'number', value: student.twelfth_marks, required: false },
            { name: 'twelfth_year', label: '12th Year', type: 'number', value: student.twelfth_year, required: false }
          ]
        });
      }
    }

    if (requirements.requires_physical_details) {
      const physicalComplete = student.height_cm && student.weight_kg && student.physically_handicapped !== null;
      if (!physicalComplete) {
        missingSections.push({
          section: 'physical_details',
          label: 'Physical Details',
          fields: [
            { name: 'height_cm', label: 'Height (cm)', type: 'number', value: student.height_cm },
            { name: 'weight_kg', label: 'Weight (kg)', type: 'number', value: student.weight_kg },
            { name: 'physically_handicapped', label: 'Physically Handicapped', type: 'boolean', value: student.physically_handicapped }
          ]
        });
      }
    }

    if (requirements.requires_family_details) {
      const familyComplete = student.father_name && student.mother_name;
      if (!familyComplete) {
        missingSections.push({
          section: 'family_details',
          label: 'Family Details',
          fields: [
            { name: 'father_name', label: "Father's Name", type: 'text', value: student.father_name },
            { name: 'father_occupation', label: "Father's Occupation", type: 'text', value: student.father_occupation },
            { name: 'father_annual_income', label: "Father's Annual Income", type: 'number', value: student.father_annual_income },
            { name: 'mother_name', label: "Mother's Name", type: 'text', value: student.mother_name },
            { name: 'mother_occupation', label: "Mother's Occupation", type: 'text', value: student.mother_occupation },
            { name: 'mother_annual_income', label: "Mother's Annual Income", type: 'number', value: student.mother_annual_income }
          ]
        });
      }
    }

    if (requirements.requires_document_verification) {
      const documentsComplete = student.has_pan_card !== null && student.has_aadhar_card !== null;
      if (!documentsComplete) {
        missingSections.push({
          section: 'document_verification',
          label: 'Document Verification',
          fields: [
            { name: 'has_pan_card', label: 'Do you have PAN Card?', type: 'boolean', value: student.has_pan_card },
            { name: 'pan_number', label: 'PAN Number', type: 'text', value: student.pan_number, conditional: 'has_pan_card' },
            { name: 'has_aadhar_card', label: 'Do you have Aadhar Card?', type: 'boolean', value: student.has_aadhar_card },
            { name: 'aadhar_number', label: 'Aadhar Number', type: 'text', value: student.aadhar_number, conditional: 'has_aadhar_card' }
          ]
        });
      }
    }

    res.json({
      success: true,
      data: {
        missing_sections: missingSections,
        custom_fields: requirements.custom_fields || []
      }
    });
  } catch (error) {
    console.error('Error getting missing fields:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get missing fields',
      error: error.message
    });
  }
};

export default {
  checkApplicationReadiness,
  submitEnhancedApplication,
  getMissingFields
};

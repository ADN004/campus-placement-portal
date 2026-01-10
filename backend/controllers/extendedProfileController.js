/**
 * Extended Profile Controller
 *
 * Handles Tier 2 extended profile data for students
 * - Get extended profile
 * - Update extended profile sections
 * - Calculate profile completion
 * - Check if student meets job requirements
 */

import { query } from '../config/database.js';

/**
 * Helper function to get student ID from user ID
 */
async function getStudentIdFromUserId(userId) {
  const result = await query(
    'SELECT id FROM students WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Helper function to sanitize field values
 * Converts empty strings to null for numeric fields
 */
function sanitizeValue(value, type = 'string') {
  // If value is undefined or null, return null
  if (value === undefined || value === null) return null;

  // For numeric fields, convert empty strings to null
  if (type === 'numeric') {
    if (value === '' || value === undefined || value === null) return null;
    return value;
  }

  // For string fields, convert empty strings to null
  if (type === 'string') {
    if (value === '' || value === undefined || value === null) return null;
    return value;
  }

  // For other types, return as is
  return value;
}

/**
 * Get Student's Extended Profile
 *
 * @route GET /api/students/extended-profile
 * @access Student
 */
export const getExtendedProfile = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);

    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const result = await query(
      `SELECT
        ep.id,
        ep.student_id,
        -- Academic Extended - use extended profile values
        ep.sslc_marks,
        ep.sslc_year,
        ep.sslc_board,
        ep.twelfth_marks,
        ep.twelfth_year,
        ep.twelfth_board,
        -- Physical Details - use student table values if extended profile is null
        COALESCE(ep.height_cm, s.height) as height_cm,
        COALESCE(ep.weight_kg, s.weight) as weight_kg,
        ep.physically_handicapped,
        ep.handicap_details,
        -- Personal Details - use student table values if extended profile is null
        ep.district,
        COALESCE(ep.permanent_address, s.complete_address) as permanent_address,
        ep.interests_hobbies,
        -- Family Details - extended profile only
        ep.father_name,
        ep.father_occupation,
        ep.father_annual_income,
        ep.mother_name,
        ep.mother_occupation,
        ep.mother_annual_income,
        ep.siblings_count,
        ep.siblings_details,
        -- Document Status - use student table values if extended profile is null
        COALESCE(ep.has_driving_license, s.has_driving_license) as has_driving_license,
        COALESCE(ep.has_pan_card, s.has_pan_card) as has_pan_card,
        ep.has_aadhar_card,
        ep.has_passport,
        -- Education Preferences - extended profile only
        ep.interested_in_btech,
        ep.interested_in_mtech,
        ep.not_interested_in_higher_education,
        ep.preferred_study_mode,
        ep.additional_certifications,
        ep.achievements,
        ep.extracurricular,
        ep.profile_completion_percentage,
        ep.last_updated,
        ep.created_at,
        ep.updated_at,
        -- Student basic info
        s.prn, s.name, s.email, s.branch, s.programme_cgpa, s.backlog_count, s.gender, s.age,
        COALESCE(
          (SELECT COUNT(*) FROM profile_section_completion
           WHERE student_id = ep.student_id AND is_completed = true),
          0
        ) as completed_sections_count
      FROM student_extended_profiles ep
      JOIN students s ON s.id = ep.student_id
      WHERE ep.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Extended profile not found'
      });
    }

    // Recalculate completion to include registration data
    await updateSectionCompletion(studentId, 'physical_details');
    await updateSectionCompletion(studentId, 'personal_details');
    await updateSectionCompletion(studentId, 'document_verification');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    // Get section completion status
    const sectionsResult = await query(
      `SELECT section_name, is_completed, completion_percentage
       FROM profile_section_completion
       WHERE student_id = $1
       ORDER BY section_name`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        profile: result.rows[0],
        sections: sectionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching extended profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch extended profile',
      error: error.message
    });
  }
};

/**
 * Update Academic Extended Section
 *
 * @route PUT /api/students/extended-profile/academic
 * @access Student
 */
export const updateAcademicExtended = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      sslc_marks,
      sslc_year,
      sslc_board,
      twelfth_marks,
      twelfth_year,
      twelfth_board
    } = req.body;

    // Sanitize values - convert empty strings to null
    const sanitizedSslcMarks = sanitizeValue(sslc_marks, 'numeric');
    const sanitizedSslcYear = sanitizeValue(sslc_year, 'numeric');
    const sanitizedSslcBoard = sanitizeValue(sslc_board, 'string');
    const sanitizedTwelfthMarks = sanitizeValue(twelfth_marks, 'numeric');
    const sanitizedTwelfthYear = sanitizeValue(twelfth_year, 'numeric');
    const sanitizedTwelfthBoard = sanitizeValue(twelfth_board, 'string');

    // Validation
    if (sanitizedSslcMarks !== null && (sanitizedSslcMarks < 0 || sanitizedSslcMarks > 100)) {
      return res.status(400).json({
        success: false,
        message: 'SSLC marks must be between 0 and 100'
      });
    }

    if (sanitizedTwelfthMarks !== null && (sanitizedTwelfthMarks < 0 || sanitizedTwelfthMarks > 100)) {
      return res.status(400).json({
        success: false,
        message: '12th marks must be between 0 and 100'
      });
    }

    const result = await query(
      `UPDATE student_extended_profiles
       SET sslc_marks = COALESCE($1, sslc_marks),
           sslc_year = COALESCE($2, sslc_year),
           sslc_board = COALESCE($3, sslc_board),
           twelfth_marks = COALESCE($4, twelfth_marks),
           twelfth_year = COALESCE($5, twelfth_year),
           twelfth_board = COALESCE($6, twelfth_board)
       WHERE student_id = $7
       RETURNING *`,
      [sanitizedSslcMarks, sanitizedSslcYear, sanitizedSslcBoard, sanitizedTwelfthMarks, sanitizedTwelfthYear, sanitizedTwelfthBoard, studentId]
    );

    // Update section completion
    await updateSectionCompletion(studentId, 'academic_extended');

    // Recalculate overall completion
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Academic details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating academic extended:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update academic details',
      error: error.message
    });
  }
};

/**
 * Update Physical Details Section
 *
 * @route PUT /api/students/extended-profile/physical
 * @access Student
 */
export const updatePhysicalDetails = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      height_cm,
      weight_kg,
      physically_handicapped,
      handicap_details
    } = req.body;

    // Sanitize values
    const sanitizedHeight = sanitizeValue(height_cm, 'numeric');
    const sanitizedWeight = sanitizeValue(weight_kg, 'numeric');
    const sanitizedHandicapDetails = sanitizeValue(handicap_details, 'string');

    // Validation
    if (sanitizedHeight !== null && (sanitizedHeight < 100 || sanitizedHeight > 250)) {
      return res.status(400).json({
        success: false,
        message: 'Height must be between 100 and 250 cm'
      });
    }

    if (sanitizedWeight !== null && (sanitizedWeight < 30 || sanitizedWeight > 200)) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be between 30 and 200 kg'
      });
    }

    const result = await query(
      `UPDATE student_extended_profiles
       SET height_cm = COALESCE($1, height_cm),
           weight_kg = COALESCE($2, weight_kg),
           physically_handicapped = COALESCE($3, physically_handicapped),
           handicap_details = COALESCE($4, handicap_details)
       WHERE student_id = $5
       RETURNING *`,
      [sanitizedHeight, sanitizedWeight, physically_handicapped, sanitizedHandicapDetails, studentId]
    );

    await updateSectionCompletion(studentId, 'physical_details');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Physical details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating physical details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update physical details',
      error: error.message
    });
  }
};

/**
 * Update Family Details Section
 *
 * @route PUT /api/students/extended-profile/family
 * @access Student
 */
export const updateFamilyDetails = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      father_name,
      father_occupation,
      father_annual_income,
      mother_name,
      mother_occupation,
      mother_annual_income,
      siblings_count,
      siblings_details
    } = req.body;

    // Sanitize values
    const sanitizedFatherName = sanitizeValue(father_name, 'string');
    const sanitizedFatherOccupation = sanitizeValue(father_occupation, 'string');
    const sanitizedFatherIncome = sanitizeValue(father_annual_income, 'numeric');
    const sanitizedMotherName = sanitizeValue(mother_name, 'string');
    const sanitizedMotherOccupation = sanitizeValue(mother_occupation, 'string');
    const sanitizedMotherIncome = sanitizeValue(mother_annual_income, 'numeric');
    const sanitizedSiblingsCount = sanitizeValue(siblings_count, 'numeric');
    const sanitizedSiblingsDetails = sanitizeValue(siblings_details, 'string');

    const result = await query(
      `UPDATE student_extended_profiles
       SET father_name = COALESCE($1, father_name),
           father_occupation = COALESCE($2, father_occupation),
           father_annual_income = COALESCE($3, father_annual_income),
           mother_name = COALESCE($4, mother_name),
           mother_occupation = COALESCE($5, mother_occupation),
           mother_annual_income = COALESCE($6, mother_annual_income),
           siblings_count = COALESCE($7, siblings_count),
           siblings_details = COALESCE($8, siblings_details)
       WHERE student_id = $9
       RETURNING *`,
      [
        sanitizedFatherName, sanitizedFatherOccupation, sanitizedFatherIncome,
        sanitizedMotherName, sanitizedMotherOccupation, sanitizedMotherIncome,
        sanitizedSiblingsCount, sanitizedSiblingsDetails, studentId
      ]
    );

    await updateSectionCompletion(studentId, 'family_details');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Family details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating family details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update family details',
      error: error.message
    });
  }
};

/**
 * Update Personal Details Section
 *
 * @route PUT /api/students/extended-profile/personal
 * @access Student
 */
export const updatePersonalDetails = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      district,
      permanent_address,
      interests_hobbies
    } = req.body;

    // Sanitize values
    const sanitizedDistrict = sanitizeValue(district, 'string');
    const sanitizedAddress = sanitizeValue(permanent_address, 'string');
    const sanitizedInterests = sanitizeValue(interests_hobbies, 'string');

    const result = await query(
      `UPDATE student_extended_profiles
       SET district = COALESCE($1, district),
           permanent_address = COALESCE($2, permanent_address),
           interests_hobbies = COALESCE($3, interests_hobbies)
       WHERE student_id = $4
       RETURNING *`,
      [sanitizedDistrict, sanitizedAddress, sanitizedInterests, studentId]
    );

    await updateSectionCompletion(studentId, 'personal_details');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Personal details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating personal details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal details',
      error: error.message
    });
  }
};

/**
 * Update Document Verification Section
 *
 * @route PUT /api/students/extended-profile/documents
 * @access Student
 */
export const updateDocumentDetails = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      has_driving_license,
      has_pan_card,
      has_aadhar_card,
      has_passport
    } = req.body;

    // Update extended profile
    const result = await query(
      `UPDATE student_extended_profiles
       SET has_driving_license = COALESCE($1, has_driving_license),
           has_pan_card = COALESCE($2, has_pan_card),
           has_aadhar_card = COALESCE($3, has_aadhar_card),
           has_passport = COALESCE($4, has_passport)
       WHERE student_id = $5
       RETURNING *`,
      [has_driving_license, has_pan_card, has_aadhar_card, has_passport, studentId]
    );

    // Sync document updates to main students table (for dashboard display)
    await query(
      `UPDATE students
       SET has_driving_license = COALESCE($1, has_driving_license),
           has_pan_card = COALESCE($2, has_pan_card),
           has_aadhar_card = COALESCE($3, has_aadhar_card),
           has_passport = COALESCE($4, has_passport)
       WHERE id = $5`,
      [has_driving_license, has_pan_card, has_aadhar_card, has_passport, studentId]
    );

    await updateSectionCompletion(studentId, 'document_verification');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Document details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating document details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document details',
      error: error.message
    });
  }
};

/**
 * Update Education Preferences Section
 *
 * @route PUT /api/students/extended-profile/education-preferences
 * @access Student
 */
export const updateEducationPreferences = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const {
      interested_in_btech,
      interested_in_mtech,
      not_interested_in_higher_education,
      preferred_study_mode,
      additional_certifications,
      achievements,
      extracurricular
    } = req.body;

    const result = await query(
      `UPDATE student_extended_profiles
       SET interested_in_btech = COALESCE($1, interested_in_btech),
           interested_in_mtech = COALESCE($2, interested_in_mtech),
           not_interested_in_higher_education = COALESCE($3, not_interested_in_higher_education),
           preferred_study_mode = COALESCE($4, preferred_study_mode),
           additional_certifications = COALESCE($5, additional_certifications),
           achievements = COALESCE($6, achievements),
           extracurricular = COALESCE($7, extracurricular)
       WHERE student_id = $8
       RETURNING *`,
      [
        interested_in_btech,
        interested_in_mtech,
        not_interested_in_higher_education,
        preferred_study_mode,
        additional_certifications ? JSON.stringify(additional_certifications) : null,
        achievements ? JSON.stringify(achievements) : null,
        extracurricular ? JSON.stringify(extracurricular) : null,
        studentId
      ]
    );

    await updateSectionCompletion(studentId, 'education_preferences');
    await query('SELECT calculate_profile_completion($1)', [studentId]);

    res.json({
      success: true,
      message: 'Education preferences updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating education preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update education preferences',
      error: error.message
    });
  }
};

/**
 * Get Profile Completion Status
 *
 * @route GET /api/students/extended-profile/completion
 * @access Student
 */
export const getProfileCompletion = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Recalculate completion
    const completionResult = await query(
      'SELECT calculate_profile_completion($1) as percentage',
      [studentId]
    );

    // Get section-wise completion
    const sectionsResult = await query(
      `SELECT section_name, is_completed, completion_percentage
       FROM profile_section_completion
       WHERE student_id = $1
       ORDER BY
         CASE section_name
           WHEN 'academic_extended' THEN 1
           WHEN 'physical_details' THEN 2
           WHEN 'family_details' THEN 3
           WHEN 'document_verification' THEN 4
           WHEN 'education_preferences' THEN 5
         END`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        overall_completion: completionResult.rows[0].percentage,
        sections: sectionsResult.rows
      }
    });
  } catch (error) {
    console.error('Error getting profile completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile completion',
      error: error.message
    });
  }
};

/**
 * Check if Student Meets Job Requirements
 *
 * @route GET /api/students/check-job-eligibility/:jobId
 * @access Student
 */
export const checkJobEligibility = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const { jobId } = req.params;

    // Get student data
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
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    // Get job requirements
    const requirementsResult = await query(
      `SELECT * FROM job_requirement_templates WHERE job_id = $1`,
      [jobId]
    );

    if (requirementsResult.rows.length === 0) {
      return res.json({
        success: true,
        eligible: true,
        message: 'No specific requirements defined for this job',
        missing_fields: []
      });
    }

    const requirements = requirementsResult.rows[0];
    const eligibilityCheck = await validateStudentEligibility(student, requirements);

    res.json({
      success: true,
      ...eligibilityCheck
    });
  } catch (error) {
    console.error('Error checking job eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check job eligibility',
      error: error.message
    });
  }
};

/**
 * Helper function to update section completion status
 * Uses merged data from both student and extended profile tables
 * Section is complete if AT LEAST ONE field is filled
 */
async function updateSectionCompletion(studentId, sectionName) {
  // Get student's extended profile merged with student data
  const profileResult = await query(
    `SELECT
      ep.*,
      s.height,
      s.weight,
      s.complete_address,
      s.has_driving_license as student_has_driving_license,
      s.has_pan_card as student_has_pan_card,
      s.has_aadhar_card as student_has_aadhar_card,
      s.has_passport as student_has_passport
    FROM student_extended_profiles ep
    JOIN students s ON s.id = ep.student_id
    WHERE ep.student_id = $1`,
    [studentId]
  );

  if (profileResult.rows.length === 0) return;

  const profile = profileResult.rows[0];
  let isCompleted = false;
  let completionPercentage = 0;

  // Check completion based on section
  // Section is complete if AT LEAST ONE field is filled
  switch (sectionName) {
    case 'academic_extended':
      const academicFields = [
        profile.sslc_marks,
        profile.sslc_year,
        profile.sslc_board,
        profile.twelfth_marks,
        profile.twelfth_year
      ];
      const academicFilled = academicFields.filter(f => f !== null && f !== undefined).length;
      completionPercentage = Math.round((academicFilled / academicFields.length) * 100);
      isCompleted = academicFilled > 0; // At least one field
      break;

    case 'physical_details':
      // Use merged values (extended profile OR student registration data)
      const heightValue = profile.height_cm ?? profile.height;
      const weightValue = profile.weight_kg ?? profile.weight;
      // Note: physically_handicapped is OPTIONAL and NOT counted in completion percentage

      let physicalCount = 0;
      if (heightValue !== null && heightValue !== undefined) physicalCount++;
      if (weightValue !== null && weightValue !== undefined) physicalCount++;

      // Only count height and weight (2 mandatory fields)
      completionPercentage = Math.round((physicalCount / 2) * 100);
      isCompleted = physicalCount > 0; // At least one field
      break;

    case 'family_details':
      const familyFields = [
        profile.father_name,
        profile.father_occupation,
        profile.father_annual_income,
        profile.mother_name,
        profile.mother_occupation,
        profile.mother_annual_income,
        profile.siblings_count,
        profile.siblings_details
      ];
      // Exclude default numeric 0 values from being counted as filled
      const familyFilled = familyFields.filter(f => {
        if (f === null || f === undefined || f === '') return false;
        // Siblings count of 0 should not count as "filled"
        if (f === 0) return false;
        return true;
      }).length;
      completionPercentage = Math.round((familyFilled / familyFields.length) * 100);
      isCompleted = familyFilled > 0; // At least one field
      break;

    case 'personal_details':
      // Use merged values for permanent address
      const personalFields = [
        profile.district,
        profile.permanent_address ?? profile.complete_address,
        profile.interests_hobbies
      ];
      const personalFilled = personalFields.filter(f => f !== null && f !== undefined && f !== '').length;
      completionPercentage = Math.round((personalFilled / personalFields.length) * 100);
      isCompleted = personalFilled > 0; // At least one field
      break;

    case 'document_verification':
      // Use merged values from extended profile OR student registration data
      const hasDrivingLicense = profile.has_driving_license ?? profile.student_has_driving_license;
      const hasPanCard = profile.has_pan_card ?? profile.student_has_pan_card;
      const hasAadharCard = profile.has_aadhar_card ?? profile.student_has_aadhar_card;
      const hasPassport = profile.has_passport ?? profile.student_has_passport;

      // Count how many documents are marked as true
      let documentCount = 0;
      if (hasDrivingLicense === true) documentCount++;
      if (hasPanCard === true) documentCount++;
      if (hasAadharCard === true) documentCount++;
      if (hasPassport === true) documentCount++;

      completionPercentage = Math.round((documentCount / 4) * 100);
      isCompleted = documentCount > 0; // At least one document
      break;

    case 'education_preferences':
      // 100% complete if ANY preference is selected (including "not interested")
      const hasAnyPreference = profile.interested_in_btech === true ||
                               profile.interested_in_mtech === true ||
                               profile.not_interested_in_higher_education === true;

      completionPercentage = hasAnyPreference ? 100 : 0;
      isCompleted = hasAnyPreference;
      break;
  }

  // Update section completion
  await query(
    `INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, section_name)
     DO UPDATE SET is_completed = $3, completion_percentage = $4, last_updated = CURRENT_TIMESTAMP`,
    [studentId, sectionName, isCompleted, completionPercentage]
  );
}

/**
 * Helper function to validate student eligibility
 */
async function validateStudentEligibility(student, requirements) {
  const missingFields = [];
  let eligible = true;

  // Check CGPA
  if (requirements.min_cgpa && student.programme_cgpa < requirements.min_cgpa) {
    eligible = false;
    missingFields.push({
      field: 'programme_cgpa',
      required: requirements.min_cgpa,
      current: student.programme_cgpa,
      message: `Minimum CGPA required: ${requirements.min_cgpa}`
    });
  }

  // Check Backlogs
  if (requirements.max_backlogs !== null && student.backlog_count > requirements.max_backlogs) {
    eligible = false;
    missingFields.push({
      field: 'backlog_count',
      required: requirements.max_backlogs,
      current: student.backlog_count,
      message: `Maximum ${requirements.max_backlogs} backlogs allowed`
    });
  }

  // Check Branch
  if (requirements.allowed_branches && requirements.allowed_branches.length > 0) {
    if (!requirements.allowed_branches.includes(student.branch)) {
      eligible = false;
      missingFields.push({
        field: 'branch',
        required: requirements.allowed_branches,
        current: student.branch,
        message: `Branch not eligible. Allowed: ${requirements.allowed_branches.join(', ')}`
      });
    }
  }

  // Check specific field requirements
  if (requirements.specific_field_requirements) {
    const fieldReqs = requirements.specific_field_requirements;

    for (const [fieldName, fieldReq] of Object.entries(fieldReqs)) {
      const studentValue = student[fieldName];

      if (fieldReq.required && (studentValue === null || studentValue === undefined || studentValue === '')) {
        eligible = false;
        missingFields.push({
          field: fieldName,
          message: `${fieldName.replace(/_/g, ' ')} is required`
        });
      }

      if (fieldReq.min && studentValue < fieldReq.min) {
        eligible = false;
        missingFields.push({
          field: fieldName,
          required: fieldReq.min,
          current: studentValue,
          message: `Minimum ${fieldName.replace(/_/g, ' ')}: ${fieldReq.min}`
        });
      }

      if (fieldReq.max && studentValue > fieldReq.max) {
        eligible = false;
        missingFields.push({
          field: fieldName,
          required: fieldReq.max,
          current: studentValue,
          message: `Maximum ${fieldName.replace(/_/g, ' ')}: ${fieldReq.max}`
        });
      }
    }
  }

  return {
    eligible,
    missing_fields: missingFields,
    message: eligible ? 'You meet all requirements for this job' : 'You do not meet some requirements'
  };
}

export default {
  getExtendedProfile,
  updateAcademicExtended,
  updatePhysicalDetails,
  updateFamilyDetails,
  updatePersonalDetails,
  updateDocumentDetails,
  updateEducationPreferences,
  getProfileCompletion,
  checkJobEligibility
};

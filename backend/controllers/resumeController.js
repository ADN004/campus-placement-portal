/**
 * Resume Controller
 *
 * Handles resume management for students and download functionality for officers/admins
 */

import { query } from '../config/database.js';
import { generateResume } from '../utils/resumeGenerator.js';

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
 * Get complete student data for resume generation
 */
async function getStudentDataForResume(studentId) {
  const result = await query(`
    SELECT
      s.id, s.prn, s.student_name, s.email, s.mobile_number, s.date_of_birth,
      s.age, s.gender, s.branch, s.programme_cgpa, s.backlog_count, s.backlog_details,
      s.cgpa_sem1, s.cgpa_sem2, s.cgpa_sem3, s.cgpa_sem4, s.cgpa_sem5, s.cgpa_sem6,
      s.height, s.weight, s.complete_address,
      s.has_driving_license, s.has_pan_card, s.has_aadhar_card, s.has_passport,
      c.college_name, r.region_name
    FROM students s
    JOIN colleges c ON s.college_id = c.id
    JOIN regions r ON s.region_id = r.id
    WHERE s.id = $1
  `, [studentId]);

  return result.rows[0] || null;
}

/**
 * Get extended profile data for resume
 */
async function getExtendedProfileForResume(studentId) {
  const result = await query(`
    SELECT
      ep.*,
      s.height as student_height,
      s.weight as student_weight,
      s.complete_address as student_address,
      s.has_driving_license as student_dl,
      s.has_pan_card as student_pan,
      s.has_aadhar_card as student_aadhar,
      s.has_passport as student_passport
    FROM student_extended_profiles ep
    JOIN students s ON s.id = ep.student_id
    WHERE ep.student_id = $1
  `, [studentId]);

  if (result.rows.length === 0) return {};

  const ep = result.rows[0];
  return {
    ...ep,
    height_cm: ep.height_cm || ep.student_height,
    weight_kg: ep.weight_kg || ep.student_weight,
    permanent_address: ep.permanent_address || ep.student_address,
    has_driving_license: ep.has_driving_license ?? ep.student_dl,
    has_pan_card: ep.has_pan_card ?? ep.student_pan,
    has_aadhar_card: ep.has_aadhar_card ?? ep.student_aadhar,
    has_passport: ep.has_passport ?? ep.student_passport
  };
}

/**
 * Get resume data for a student
 */
async function getResumeData(studentId) {
  const result = await query(
    'SELECT * FROM student_resumes WHERE student_id = $1',
    [studentId]
  );
  return result.rows[0] || null;
}

// ==================== STUDENT ENDPOINTS ====================

/**
 * Get Student's Resume Data
 *
 * @route GET /api/students/resume
 * @access Student
 */
export const getStudentResume = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);

    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    let resumeData = await getResumeData(studentId);

    // If no resume record exists, create one
    if (!resumeData) {
      await query(
        'INSERT INTO student_resumes (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING',
        [studentId]
      );
      resumeData = await getResumeData(studentId);
    }

    res.json({
      success: true,
      data: resumeData
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume data',
      error: error.message
    });
  }
};

/**
 * Update Student's Resume Data
 *
 * @route PUT /api/students/resume
 * @access Student
 */
export const updateStudentResume = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);

    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const {
      career_objective,
      technical_skills,
      soft_skills,
      languages_known,
      projects,
      work_experience,
      certifications,
      achievements,
      extracurricular_activities,
      declaration_text,
      custom_sections,
      address
    } = req.body;

    // Check if any custom content is provided
    const hasCustomContent = Boolean(
      career_objective ||
      (technical_skills && technical_skills.length > 0) ||
      (soft_skills && soft_skills.length > 0) ||
      (languages_known && languages_known.length > 0) ||
      (projects && projects.length > 0) ||
      (work_experience && work_experience.length > 0) ||
      (certifications && certifications.length > 0) ||
      (achievements && achievements.length > 0) ||
      (extracurricular_activities && extracurricular_activities.length > 0) ||
      (custom_sections && custom_sections.length > 0) ||
      address
    );

    const result = await query(`
      INSERT INTO student_resumes (
        student_id, career_objective, technical_skills, soft_skills,
        languages_known, projects, work_experience, certifications,
        achievements, extracurricular_activities, declaration_text,
        custom_sections, has_custom_content, address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (student_id)
      DO UPDATE SET
        career_objective = EXCLUDED.career_objective,
        technical_skills = EXCLUDED.technical_skills,
        soft_skills = EXCLUDED.soft_skills,
        languages_known = EXCLUDED.languages_known,
        projects = EXCLUDED.projects,
        work_experience = EXCLUDED.work_experience,
        certifications = EXCLUDED.certifications,
        achievements = EXCLUDED.achievements,
        extracurricular_activities = EXCLUDED.extracurricular_activities,
        declaration_text = EXCLUDED.declaration_text,
        custom_sections = EXCLUDED.custom_sections,
        has_custom_content = EXCLUDED.has_custom_content,
        address = EXCLUDED.address,
        updated_at = CURRENT_TIMESTAMP,
        last_modified_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      studentId,
      career_objective || null,
      JSON.stringify(technical_skills || []),
      JSON.stringify(soft_skills || []),
      JSON.stringify(languages_known || []),
      JSON.stringify(projects || []),
      JSON.stringify(work_experience || []),
      JSON.stringify(certifications || []),
      JSON.stringify(achievements || []),
      JSON.stringify(extracurricular_activities || []),
      declaration_text || null,
      JSON.stringify(custom_sections || []),
      hasCustomContent,
      address || null
    ]);

    res.json({
      success: true,
      message: 'Resume updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resume',
      error: error.message
    });
  }
};

/**
 * Download Student's Own Resume
 *
 * @route GET /api/students/resume/download
 * @access Student
 */
export const downloadOwnResume = async (req, res) => {
  try {
    const studentId = await getStudentIdFromUserId(req.user.id);

    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const studentData = await getStudentDataForResume(studentId);
    const extendedProfile = await getExtendedProfileForResume(studentId);
    const resumeData = await getResumeData(studentId);

    if (!studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student data not found'
      });
    }

    // Enforce mandatory resume sections before download
    const missingSections = [];
    if (!resumeData?.career_objective) missingSections.push('Career Objective');

    const techSkills = resumeData?.technical_skills || [];
    const parsedTech = typeof techSkills === 'string' ? JSON.parse(techSkills) : techSkills;
    if (!parsedTech || parsedTech.length === 0) missingSections.push('Skills');

    const projects = resumeData?.projects || [];
    const parsedProjects = typeof projects === 'string' ? JSON.parse(projects) : projects;
    if (!parsedProjects || parsedProjects.length === 0) missingSections.push('Projects');

    const workExp = resumeData?.work_experience || [];
    const parsedWork = typeof workExp === 'string' ? JSON.parse(workExp) : workExp;
    if (!parsedWork || parsedWork.length === 0) missingSections.push('Work Experience / Internship');

    // Address: check resume address, then extended profile, then students table
    const hasAddress = resumeData?.address ||
      extendedProfile?.permanent_address ||
      studentData?.complete_address;
    if (!hasAddress) missingSections.push('Address');

    if (missingSections.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete the following mandatory sections before downloading: ${missingSections.join(', ')}`,
        missing_sections: missingSections
      });
    }

    const pdfBuffer = await generateResume(studentData, extendedProfile, resumeData || {});

    const filename = `Resume_${studentData.student_name?.replace(/\s+/g, '_') || studentData.prn}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate resume',
      error: error.message
    });
  }
};

// ==================== PLACEMENT OFFICER ENDPOINTS ====================

/**
 * Download Student Resume - For Placement Officer
 *
 * @route GET /api/placement-officer/students/:studentId/resume/download
 * @access Placement Officer
 */
export const downloadStudentResumePO = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get placement officer's college_id
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (poResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Placement officer record not found'
      });
    }

    const collegeId = poResult.rows[0].college_id;

    // Verify student belongs to officer's college
    const studentCheck = await query(
      'SELECT id FROM students WHERE id = $1 AND college_id = $2',
      [studentId, collegeId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found or does not belong to your college'
      });
    }

    const studentData = await getStudentDataForResume(studentId);
    const extendedProfile = await getExtendedProfileForResume(studentId);
    const resumeData = await getResumeData(studentId);

    if (!studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student data not found'
      });
    }

    const pdfBuffer = await generateResume(studentData, extendedProfile, resumeData || {});

    const filename = `Resume_${studentData.student_name?.replace(/\s+/g, '_') || studentData.prn}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate resume',
      error: error.message
    });
  }
};

/**
 * Check student resume status - For Placement Officer
 *
 * @route GET /api/placement-officer/students/:studentId/resume/status
 * @access Placement Officer
 */
export const getStudentResumeStatusPO = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get placement officer's college_id
    const poResult = await query(
      'SELECT college_id FROM placement_officers WHERE user_id = $1',
      [req.user.id]
    );

    if (poResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Placement officer record not found'
      });
    }

    const collegeId = poResult.rows[0].college_id;

    // Verify student belongs to officer's college
    const studentCheck = await query(
      'SELECT id FROM students WHERE id = $1 AND college_id = $2',
      [studentId, collegeId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found or does not belong to your college'
      });
    }

    const result = await query(
      'SELECT has_custom_content, last_modified_at FROM student_resumes WHERE student_id = $1',
      [studentId]
    );

    res.json({
      success: true,
      data: {
        hasCustomContent: result.rows.length > 0 ? result.rows[0].has_custom_content : false,
        lastModified: result.rows.length > 0 ? result.rows[0].last_modified_at : null
      }
    });
  } catch (error) {
    console.error('Error checking resume status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check resume status',
      error: error.message
    });
  }
};

// ==================== SUPER ADMIN ENDPOINTS ====================

/**
 * Download Student Resume - For Super Admin
 *
 * @route GET /api/super-admin/students/:studentId/resume/download
 * @access Super Admin
 */
export const downloadStudentResumeSA = async (req, res) => {
  try {
    const { studentId } = req.params;

    const studentData = await getStudentDataForResume(studentId);
    const extendedProfile = await getExtendedProfileForResume(studentId);
    const resumeData = await getResumeData(studentId);

    if (!studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student data not found'
      });
    }

    const pdfBuffer = await generateResume(studentData, extendedProfile, resumeData || {});

    const filename = `Resume_${studentData.student_name?.replace(/\s+/g, '_') || studentData.prn}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate resume',
      error: error.message
    });
  }
};

/**
 * Check student resume status - For Super Admin
 *
 * @route GET /api/super-admin/students/:studentId/resume/status
 * @access Super Admin
 */
export const getStudentResumeStatusSA = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const studentCheck = await query(
      'SELECT id FROM students WHERE id = $1',
      [studentId]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const result = await query(
      'SELECT has_custom_content, last_modified_at FROM student_resumes WHERE student_id = $1',
      [studentId]
    );

    res.json({
      success: true,
      data: {
        hasCustomContent: result.rows.length > 0 ? result.rows[0].has_custom_content : false,
        lastModified: result.rows.length > 0 ? result.rows[0].last_modified_at : null
      }
    });
  } catch (error) {
    console.error('Error checking resume status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check resume status',
      error: error.message
    });
  }
};

export default {
  // Student endpoints
  getStudentResume,
  updateStudentResume,
  downloadOwnResume,

  // Placement Officer endpoints
  downloadStudentResumePO,
  getStudentResumeStatusPO,

  // Super Admin endpoints
  downloadStudentResumeSA,
  getStudentResumeStatusSA
};

/**
 * Resume PDF Generator - Professional Edition
 *
 * Generates polished, professional resume PDFs for students
 * Two versions:
 * 1. Standard (System) - Clean professional layout using system data
 * 2. Custom (Student-Modified) - Includes student's custom additions
 */

import PDFDocument from 'pdfkit';

// Professional color palette - Black & Navy theme
const COLORS = {
  black: '#000000',
  darkNavy: '#0a1628',
  navy: '#1a365d',
  darkGray: '#1f2937',
  mediumGray: '#4b5563',
  lightGray: '#6b7280',
  borderGray: '#d1d5db',
  lightBorder: '#e5e7eb',
  accent: '#2563eb',
  white: '#ffffff',
  headerBg: '#111827'
};

// Professional margin settings
const MARGIN = {
  top: 40,
  bottom: 40,
  left: 55,
  right: 55
};

// Line heights and spacing
const SPACING = {
  sectionGap: 18,
  lineHeight: 14,
  paragraphGap: 8,
  bulletIndent: 15,
  tableRowHeight: 20
};

/**
 * Format date to readable string
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Draw a thick professional section divider
 */
function drawThickLine(doc, y, width = null) {
  const lineWidth = width || (doc.page.width - MARGIN.left - MARGIN.right);
  doc.strokeColor(COLORS.black)
     .lineWidth(1.5)
     .moveTo(MARGIN.left, y)
     .lineTo(MARGIN.left + lineWidth, y)
     .stroke();
  return y + 8;
}

/**
 * Draw a thin separator line
 */
function drawThinLine(doc, y, startX = MARGIN.left, length = null) {
  const lineLength = length || (doc.page.width - MARGIN.left - MARGIN.right);
  doc.strokeColor(COLORS.borderGray)
     .lineWidth(0.5)
     .moveTo(startX, y)
     .lineTo(startX + lineLength, y)
     .stroke();
  return y + 6;
}

/**
 * Draw professional section header with underline
 */
function drawSectionHeader(doc, title, y) {
  // Section title - Bold uppercase
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(COLORS.black)
     .text(title.toUpperCase(), MARGIN.left, y, { characterSpacing: 1.5 });

  const titleWidth = doc.widthOfString(title.toUpperCase(), { characterSpacing: 1.5 });
  y = doc.y + 3;

  // Draw underline beneath the title
  doc.strokeColor(COLORS.black)
     .lineWidth(2)
     .moveTo(MARGIN.left, y)
     .lineTo(MARGIN.left + Math.max(titleWidth + 10, 80), y)
     .stroke();

  return y + 12;
}

/**
 * Draw a bullet point with proper formatting
 */
function drawBulletPoint(doc, text, x, y, maxWidth, isSubBullet = false) {
  const bulletX = x + (isSubBullet ? 10 : 0);
  const textX = bulletX + 12;

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.darkGray);

  // Draw bullet (filled circle)
  doc.circle(bulletX + 3, y + 4, isSubBullet ? 1.5 : 2)
     .fill(COLORS.darkGray);

  // Draw text
  doc.text(text, textX, y, {
    width: maxWidth - (textX - x),
    align: 'left',
    lineGap: 2
  });

  return doc.y + 4;
}

/**
 * Draw a label-value pair in a clean format
 */
function drawLabelValue(doc, label, value, x, y, labelWidth = 120) {
  if (!value) return y;

  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor(COLORS.mediumGray)
     .text(label, x, y, { width: labelWidth, continued: false });

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.darkGray)
     .text(`: ${value}`, x + labelWidth - 5, y);

  return Math.max(doc.y + 3, y + SPACING.lineHeight);
}

/**
 * Check if we need a new page
 */
function checkNewPage(doc, requiredHeight = 100) {
  if (doc.y + requiredHeight > doc.page.height - MARGIN.bottom) {
    doc.addPage();
    return MARGIN.top;
  }
  return doc.y;
}

/**
 * Draw education entry with professional formatting
 */
function drawEducationEntry(doc, degree, institution, details, y, pageWidth) {
  // Degree name - Bold
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(COLORS.darkNavy)
     .text(degree, MARGIN.left, y);
  y = doc.y + 2;

  // Institution name
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.mediumGray)
     .text(institution, MARGIN.left, y);
  y = doc.y + 2;

  // Details (CGPA, Year, etc.)
  if (details) {
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(COLORS.lightGray)
       .text(details, MARGIN.left, y);
    y = doc.y;
  }

  return y + 10;
}

/**
 * Generate Standard Resume PDF (System Version)
 * Professional black-bordered clean design
 */
export async function generateStandardResume(studentData, extendedProfile = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: MARGIN,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = MARGIN.top;
      const pageWidth = doc.page.width - MARGIN.left - MARGIN.right;

      // ==================== PROFESSIONAL HEADER ====================

      // Name - Large, bold, centered
      doc.fontSize(26)
         .font('Helvetica-Bold')
         .fillColor(COLORS.black)
         .text((studentData.student_name || 'STUDENT NAME').toUpperCase(), MARGIN.left, y, {
           width: pageWidth,
           align: 'center',
           characterSpacing: 2
         });
      y = doc.y + 8;

      // Thick line under name
      doc.strokeColor(COLORS.black)
         .lineWidth(2)
         .moveTo(MARGIN.left + pageWidth * 0.25, y)
         .lineTo(MARGIN.left + pageWidth * 0.75, y)
         .stroke();
      y += 12;

      // Contact Information - Professional format
      const contactItems = [];
      if (studentData.mobile_number) contactItems.push(`📞 ${studentData.mobile_number}`);
      if (studentData.email) contactItems.push(`✉ ${studentData.email}`);

      if (contactItems.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.mediumGray)
           .text(contactItems.join('     |     '), MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y + 4;
      }

      // Address
      const address = extendedProfile.permanent_address || studentData.complete_address;
      if (address) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.lightGray)
           .text(`📍 ${address}`, MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y;
      }

      y += 15;
      y = drawThickLine(doc, y);
      y += 8;

      // ==================== CAREER OBJECTIVE ====================
      const branch = studentData.branch || 'Engineering';
      const objective = `A dedicated and motivated ${branch} student seeking challenging opportunities to apply technical knowledge and skills in a professional environment. Committed to continuous learning and contributing effectively to organizational success while pursuing career growth.`;

      y = drawSectionHeader(doc, 'Career Objective', y);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.darkGray)
         .text(objective, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify',
           lineGap: 3
         });
      y = doc.y + SPACING.sectionGap;

      // ==================== EDUCATION ====================
      y = checkNewPage(doc, 140);
      y = drawSectionHeader(doc, 'Education', y);

      // Diploma
      y = drawEducationEntry(
        doc,
        `Diploma in ${studentData.branch || 'Engineering'}`,
        studentData.college_name || 'Polytechnic College',
        `CGPA: ${studentData.programme_cgpa || 'N/A'}${studentData.backlog_count !== null ? `  |  Backlogs: ${studentData.backlog_count}` : ''}`,
        y,
        pageWidth
      );

      // 12th / HSC
      if (extendedProfile.twelfth_marks) {
        y = drawEducationEntry(
          doc,
          'Higher Secondary Education (12th / Plus Two)',
          extendedProfile.twelfth_board || 'State Board',
          `Year: ${extendedProfile.twelfth_year || 'N/A'}  |  Percentage: ${extendedProfile.twelfth_marks}%`,
          y,
          pageWidth
        );
      }

      // 10th / SSLC
      if (extendedProfile.sslc_marks) {
        y = drawEducationEntry(
          doc,
          'Secondary Education (10th / SSLC)',
          extendedProfile.sslc_board || 'State Board',
          `Year: ${extendedProfile.sslc_year || 'N/A'}  |  Percentage: ${extendedProfile.sslc_marks}%`,
          y,
          pageWidth
        );
      }

      y += 5;

      // ==================== SEMESTER-WISE CGPA ====================
      const semCGPAs = [];
      for (let i = 1; i <= 6; i++) {
        const cgpa = studentData[`cgpa_sem${i}`];
        if (cgpa !== null && cgpa !== undefined) {
          semCGPAs.push({ sem: i, cgpa });
        }
      }

      if (semCGPAs.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Academic Performance', y);

        // Draw semester CGPA table
        const colWidth = pageWidth / 6;

        // Headers
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(COLORS.mediumGray);

        semCGPAs.forEach((item, index) => {
          doc.text(`Sem ${item.sem}`, MARGIN.left + (index * colWidth), y, { width: colWidth, align: 'center' });
        });
        y = doc.y + 4;

        // Draw line
        doc.strokeColor(COLORS.borderGray)
           .lineWidth(0.5)
           .moveTo(MARGIN.left, y)
           .lineTo(MARGIN.left + (semCGPAs.length * colWidth), y)
           .stroke();
        y += 6;

        // Values
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.darkGray);

        semCGPAs.forEach((item, index) => {
          doc.text(item.cgpa.toString(), MARGIN.left + (index * colWidth), y, { width: colWidth, align: 'center' });
        });
        y = doc.y + SPACING.sectionGap;
      }

      // ==================== PERSONAL DETAILS ====================
      y = checkNewPage(doc, 160);
      y = drawSectionHeader(doc, 'Personal Information', y);

      const personalDetails = [
        { label: 'Date of Birth', value: formatDate(studentData.date_of_birth) },
        { label: 'Gender', value: studentData.gender },
        { label: 'PRN', value: studentData.prn },
        { label: 'Region', value: studentData.region_name },
        { label: "Father's Name", value: extendedProfile.father_name },
        { label: 'District', value: extendedProfile.district },
      ];

      // Add physical details
      const height = extendedProfile.height_cm || studentData.height;
      const weight = extendedProfile.weight_kg || studentData.weight;
      if (height) personalDetails.push({ label: 'Height', value: `${height} cm` });
      if (weight) personalDetails.push({ label: 'Weight', value: `${weight} kg` });

      // Draw in two columns
      const colWidth = pageWidth / 2;
      const validDetails = personalDetails.filter(d => d.value);
      const leftDetails = validDetails.filter((_, i) => i % 2 === 0);
      const rightDetails = validDetails.filter((_, i) => i % 2 === 1);

      let leftY = y;
      let rightY = y;

      leftDetails.forEach(item => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.mediumGray)
           .text(`${item.label}`, MARGIN.left, leftY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(` : ${item.value}`, { lineBreak: true });
        leftY = doc.y + 4;
      });

      rightDetails.forEach(item => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.mediumGray)
           .text(`${item.label}`, MARGIN.left + colWidth, rightY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(` : ${item.value}`, { lineBreak: true });
        rightY = doc.y + 4;
      });

      y = Math.max(leftY, rightY) + 10;

      // ==================== DOCUMENTS AVAILABLE ====================
      const documents = [];
      if (studentData.has_passport || extendedProfile.has_passport) documents.push('Passport');
      if (studentData.has_aadhar_card || extendedProfile.has_aadhar_card) documents.push('Aadhar Card');
      if (studentData.has_pan_card || extendedProfile.has_pan_card) documents.push('PAN Card');
      if (studentData.has_driving_license || extendedProfile.has_driving_license) documents.push('Driving License');

      if (documents.length > 0) {
        y = checkNewPage(doc, 70);
        y = drawSectionHeader(doc, 'Documents Available', y);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(documents.join('   •   '), MARGIN.left, y);
        y = doc.y + SPACING.sectionGap;
      }

      // ==================== INTERESTS & HOBBIES ====================
      if (extendedProfile.interests_hobbies) {
        y = checkNewPage(doc, 70);
        y = drawSectionHeader(doc, 'Interests & Hobbies', y);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(extendedProfile.interests_hobbies, MARGIN.left, y, {
             width: pageWidth,
             lineGap: 2
           });
        y = doc.y + SPACING.sectionGap;
      }

      // ==================== CERTIFICATIONS ====================
      const certs = extendedProfile.additional_certifications;
      if (certs && Array.isArray(certs) && certs.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Certifications', y);

        certs.forEach(cert => {
          const certText = typeof cert === 'string' ? cert : (cert.name || cert.title || JSON.stringify(cert));
          y = drawBulletPoint(doc, certText, MARGIN.left, y, pageWidth);
        });
        y += 8;
      }

      // ==================== ACHIEVEMENTS ====================
      const achievements = extendedProfile.achievements;
      if (achievements && Array.isArray(achievements) && achievements.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Achievements', y);

        achievements.forEach(ach => {
          const achText = typeof ach === 'string' ? ach : (ach.title || ach.name || JSON.stringify(ach));
          y = drawBulletPoint(doc, achText, MARGIN.left, y, pageWidth);
        });
        y += 8;
      }

      // ==================== DECLARATION ====================
      y = checkNewPage(doc, 100);
      y = drawSectionHeader(doc, 'Declaration', y);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.darkGray)
         .text('I hereby declare that all the information furnished above is true to the best of my knowledge and belief. I shall be responsible for any discrepancy.', MARGIN.left, y, {
           width: pageWidth,
           align: 'justify',
           lineGap: 2
         });

      y = doc.y + 25;

      // Place and Date
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.mediumGray)
         .text(`Place: ${extendedProfile.district || '____________'}`, MARGIN.left, y);

      doc.text(`Date: ${formatDate(new Date())}`, MARGIN.left + 180, y);

      y = doc.y + 30;

      // Signature line
      const signX = doc.page.width - MARGIN.right - 150;
      doc.strokeColor(COLORS.black)
         .lineWidth(0.8)
         .moveTo(signX, y)
         .lineTo(signX + 140, y)
         .stroke();

      y += 5;

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(COLORS.black)
         .text(`(${studentData.student_name || 'Signature'})`, signX, y, {
           width: 140,
           align: 'center'
         });

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Custom Resume PDF (Student-Modified Version)
 * Professional design with student's custom additions
 */
export async function generateCustomResume(studentData, extendedProfile = {}, resumeData = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: MARGIN,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = MARGIN.top;
      const pageWidth = doc.page.width - MARGIN.left - MARGIN.right;

      // ==================== PROFESSIONAL HEADER ====================

      // Name
      doc.fontSize(26)
         .font('Helvetica-Bold')
         .fillColor(COLORS.black)
         .text((studentData.student_name || 'STUDENT NAME').toUpperCase(), MARGIN.left, y, {
           width: pageWidth,
           align: 'center',
           characterSpacing: 2
         });
      y = doc.y + 8;

      // Decorative line
      doc.strokeColor(COLORS.black)
         .lineWidth(2)
         .moveTo(MARGIN.left + pageWidth * 0.25, y)
         .lineTo(MARGIN.left + pageWidth * 0.75, y)
         .stroke();
      y += 12;

      // Contact Info
      const contactItems = [];
      if (studentData.mobile_number) contactItems.push(`📞 ${studentData.mobile_number}`);
      if (studentData.email) contactItems.push(`✉ ${studentData.email}`);

      if (contactItems.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.mediumGray)
           .text(contactItems.join('     |     '), MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y + 4;
      }

      const address = extendedProfile.permanent_address || studentData.complete_address;
      if (address) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.lightGray)
           .text(`📍 ${address}`, MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y;
      }

      y += 15;
      y = drawThickLine(doc, y);
      y += 8;

      // ==================== CAREER OBJECTIVE ====================
      const branch = studentData.branch || 'Engineering';
      const defaultObjective = `A dedicated and motivated ${branch} student seeking challenging opportunities to apply technical knowledge and skills in a professional environment. Committed to continuous learning and contributing effectively to organizational success while pursuing career growth.`;
      const objective = resumeData.career_objective || defaultObjective;

      y = drawSectionHeader(doc, 'Career Objective', y);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.darkGray)
         .text(objective, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify',
           lineGap: 3
         });
      y = doc.y + SPACING.sectionGap;

      // ==================== EDUCATION ====================
      y = checkNewPage(doc, 140);
      y = drawSectionHeader(doc, 'Education', y);

      y = drawEducationEntry(
        doc,
        `Diploma in ${studentData.branch || 'Engineering'}`,
        studentData.college_name || 'Polytechnic College',
        `CGPA: ${studentData.programme_cgpa || 'N/A'}${studentData.backlog_count !== null ? `  |  Backlogs: ${studentData.backlog_count}` : ''}`,
        y,
        pageWidth
      );

      if (extendedProfile.twelfth_marks) {
        y = drawEducationEntry(
          doc,
          'Higher Secondary Education (12th / Plus Two)',
          extendedProfile.twelfth_board || 'State Board',
          `Year: ${extendedProfile.twelfth_year || 'N/A'}  |  Percentage: ${extendedProfile.twelfth_marks}%`,
          y,
          pageWidth
        );
      }

      if (extendedProfile.sslc_marks) {
        y = drawEducationEntry(
          doc,
          'Secondary Education (10th / SSLC)',
          extendedProfile.sslc_board || 'State Board',
          `Year: ${extendedProfile.sslc_year || 'N/A'}  |  Percentage: ${extendedProfile.sslc_marks}%`,
          y,
          pageWidth
        );
      }

      y += 5;

      // ==================== TECHNICAL SKILLS ====================
      const technicalSkills = resumeData.technical_skills || [];
      const softSkills = resumeData.soft_skills || [];
      const languages = resumeData.languages_known || [];

      if (technicalSkills.length > 0 || softSkills.length > 0 || languages.length > 0) {
        y = checkNewPage(doc, 100);
        y = drawSectionHeader(doc, 'Skills', y);

        if (technicalSkills.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.mediumGray)
             .text('Technical Skills', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .fillColor(COLORS.darkGray)
             .text(` : ${technicalSkills.join('  •  ')}`);
          y = doc.y + 6;
        }

        if (softSkills.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.mediumGray)
             .text('Soft Skills', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .fillColor(COLORS.darkGray)
             .text(` : ${softSkills.join('  •  ')}`);
          y = doc.y + 6;
        }

        if (languages.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.mediumGray)
             .text('Languages', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .fillColor(COLORS.darkGray)
             .text(` : ${languages.join('  •  ')}`);
          y = doc.y;
        }

        y += SPACING.sectionGap;
      }

      // ==================== PROJECTS ====================
      const projects = resumeData.projects || [];
      if (projects.length > 0) {
        y = checkNewPage(doc, 100);
        y = drawSectionHeader(doc, 'Projects', y);

        projects.forEach((project, index) => {
          y = checkNewPage(doc, 70);

          const title = typeof project === 'string' ? project : (project.title || `Project ${index + 1}`);

          // Project title
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(COLORS.darkNavy)
             .text(`▸ ${title}`, MARGIN.left, y);
          y = doc.y + 2;

          // Technologies
          if (project.technologies) {
            doc.fontSize(9)
               .font('Helvetica-Oblique')
               .fillColor(COLORS.accent)
               .text(`Technologies: ${project.technologies}`, MARGIN.left + 15, y);
            y = doc.y + 2;
          }

          // Duration
          if (project.duration) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(COLORS.lightGray)
               .text(`Duration: ${project.duration}`, MARGIN.left + 15, y);
            y = doc.y + 2;
          }

          // Description
          if (project.description) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.darkGray)
               .text(project.description, MARGIN.left + 15, y, {
                 width: pageWidth - 15,
                 lineGap: 2
               });
            y = doc.y;
          }

          y += 10;
        });

        y += 5;
      }

      // ==================== WORK EXPERIENCE / INTERNSHIPS ====================
      const workExp = resumeData.work_experience || [];
      if (workExp.length > 0) {
        y = checkNewPage(doc, 100);
        y = drawSectionHeader(doc, 'Work Experience / Internships', y);

        workExp.forEach((exp, index) => {
          y = checkNewPage(doc, 70);

          const role = typeof exp === 'string' ? exp : (exp.role || exp.title || `Experience ${index + 1}`);
          const company = exp.company || '';

          // Role
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(COLORS.darkNavy)
             .text(`▸ ${role}`, MARGIN.left, y);
          y = doc.y + 2;

          // Company and duration
          if (company || exp.duration) {
            const companyLine = [company, exp.duration].filter(Boolean).join('  |  ');
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.lightGray)
               .text(companyLine, MARGIN.left + 15, y);
            y = doc.y + 2;
          }

          // Description
          if (exp.description) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.darkGray)
               .text(exp.description, MARGIN.left + 15, y, {
                 width: pageWidth - 15,
                 lineGap: 2
               });
            y = doc.y;
          }

          y += 10;
        });

        y += 5;
      }

      // ==================== CERTIFICATIONS ====================
      const certs = resumeData.certifications || extendedProfile.additional_certifications || [];
      if (certs.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Certifications', y);

        certs.forEach(cert => {
          let certText;
          if (typeof cert === 'string') {
            certText = cert;
          } else {
            certText = cert.name || cert.title || '';
            if (cert.issuer) certText += ` — ${cert.issuer}`;
            if (cert.year) certText += ` (${cert.year})`;
          }
          y = drawBulletPoint(doc, certText, MARGIN.left, y, pageWidth);
        });
        y += 8;
      }

      // ==================== ACHIEVEMENTS ====================
      const achievements = resumeData.achievements || extendedProfile.achievements || [];
      if (achievements.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Achievements & Awards', y);

        achievements.forEach(ach => {
          let achText;
          if (typeof ach === 'string') {
            achText = ach;
          } else {
            achText = ach.title || ach.name || '';
            if (ach.description) achText += ` — ${ach.description}`;
            if (ach.year) achText += ` (${ach.year})`;
          }
          y = drawBulletPoint(doc, achText, MARGIN.left, y, pageWidth);
        });
        y += 8;
      }

      // ==================== EXTRACURRICULAR ACTIVITIES ====================
      const extracurricular = resumeData.extracurricular_activities || extendedProfile.extracurricular || [];
      if (extracurricular.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Extracurricular Activities', y);

        extracurricular.forEach(act => {
          const actText = typeof act === 'string' ? act : (act.title || act.name || JSON.stringify(act));
          y = drawBulletPoint(doc, actText, MARGIN.left, y, pageWidth);
        });
        y += 8;
      }

      // ==================== PERSONAL DETAILS ====================
      y = checkNewPage(doc, 120);
      y = drawSectionHeader(doc, 'Personal Information', y);

      const personalDetails = [
        { label: 'Date of Birth', value: formatDate(studentData.date_of_birth) },
        { label: 'Gender', value: studentData.gender },
        { label: 'PRN', value: studentData.prn },
        { label: "Father's Name", value: extendedProfile.father_name },
        { label: 'District', value: extendedProfile.district },
      ];

      const height = extendedProfile.height_cm || studentData.height;
      const weight = extendedProfile.weight_kg || studentData.weight;
      if (height) personalDetails.push({ label: 'Height', value: `${height} cm` });
      if (weight) personalDetails.push({ label: 'Weight', value: `${weight} kg` });

      const colWidth = pageWidth / 2;
      const validDetails = personalDetails.filter(d => d.value);
      const leftDetails = validDetails.filter((_, i) => i % 2 === 0);
      const rightDetails = validDetails.filter((_, i) => i % 2 === 1);

      let leftY = y;
      let rightY = y;

      leftDetails.forEach(item => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.mediumGray)
           .text(`${item.label}`, MARGIN.left, leftY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(` : ${item.value}`, { lineBreak: true });
        leftY = doc.y + 4;
      });

      rightDetails.forEach(item => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.mediumGray)
           .text(`${item.label}`, MARGIN.left + colWidth, rightY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(` : ${item.value}`, { lineBreak: true });
        rightY = doc.y + 4;
      });

      y = Math.max(leftY, rightY) + 10;

      // ==================== DOCUMENTS ====================
      const documents = [];
      if (studentData.has_passport || extendedProfile.has_passport) documents.push('Passport');
      if (studentData.has_aadhar_card || extendedProfile.has_aadhar_card) documents.push('Aadhar Card');
      if (studentData.has_pan_card || extendedProfile.has_pan_card) documents.push('PAN Card');
      if (studentData.has_driving_license || extendedProfile.has_driving_license) documents.push('Driving License');

      if (documents.length > 0) {
        y = checkNewPage(doc, 70);
        y = drawSectionHeader(doc, 'Documents Available', y);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.darkGray)
           .text(documents.join('   •   '), MARGIN.left, y);
        y = doc.y + SPACING.sectionGap;
      }

      // ==================== CUSTOM SECTIONS ====================
      const customSections = resumeData.custom_sections || [];
      if (customSections.length > 0) {
        customSections.forEach(section => {
          if (!section.title || !section.content) return;
          y = checkNewPage(doc, 80);
          y = drawSectionHeader(doc, section.title, y);

          doc.fontSize(10)
             .font('Helvetica')
             .fillColor(COLORS.darkGray)
             .text(section.content, MARGIN.left, y, {
               width: pageWidth,
               lineGap: 2
             });
          y = doc.y + SPACING.sectionGap;
        });
      }

      // ==================== DECLARATION ====================
      y = checkNewPage(doc, 100);
      y = drawSectionHeader(doc, 'Declaration', y);

      const declaration = resumeData.declaration_text ||
        'I hereby declare that all the information furnished above is true to the best of my knowledge and belief. I shall be responsible for any discrepancy.';

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.darkGray)
         .text(declaration, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify',
           lineGap: 2
         });

      y = doc.y + 25;

      // Place and Date
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.mediumGray)
         .text(`Place: ${extendedProfile.district || '____________'}`, MARGIN.left, y);

      doc.text(`Date: ${formatDate(new Date())}`, MARGIN.left + 180, y);

      y = doc.y + 30;

      // Signature line
      const signX = doc.page.width - MARGIN.right - 150;
      doc.strokeColor(COLORS.black)
         .lineWidth(0.8)
         .moveTo(signX, y)
         .lineTo(signX + 140, y)
         .stroke();

      y += 5;

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(COLORS.black)
         .text(`(${studentData.student_name || 'Signature'})`, signX, y, {
           width: 140,
           align: 'center'
         });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

export default {
  generateStandardResume,
  generateCustomResume
};

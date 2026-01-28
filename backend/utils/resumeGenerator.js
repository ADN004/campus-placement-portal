/**
 * Resume PDF Generator
 *
 * Generates professional resume PDFs for students
 * Two versions:
 * 1. Standard (System) - Clean professional layout using system data
 * 2. Custom (Student-Modified) - Includes student's custom additions
 */

import PDFDocument from 'pdfkit';

// Color palette for professional look
const COLORS = {
  primary: '#1a365d',      // Dark blue for headers
  secondary: '#2b6cb0',    // Medium blue for subheadings
  accent: '#3182ce',       // Light blue for accents
  text: '#2d3748',         // Dark gray for body text
  lightText: '#718096',    // Light gray for secondary text
  border: '#e2e8f0',       // Light border color
  background: '#f7fafc',   // Light background
  white: '#ffffff'
};

// Standard margin settings
const MARGIN = {
  top: 50,
  bottom: 50,
  left: 50,
  right: 50
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
 * Draw a horizontal line
 */
function drawLine(doc, y, color = COLORS.border) {
  doc.strokeColor(color)
     .lineWidth(1)
     .moveTo(MARGIN.left, y)
     .lineTo(doc.page.width - MARGIN.right, y)
     .stroke();
  return y + 5;
}

/**
 * Draw section header with underline
 */
function drawSectionHeader(doc, title, y) {
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(COLORS.primary)
     .text(title.toUpperCase(), MARGIN.left, y);

  y += 18;
  doc.strokeColor(COLORS.secondary)
     .lineWidth(2)
     .moveTo(MARGIN.left, y)
     .lineTo(MARGIN.left + 60, y)
     .stroke();

  return y + 10;
}

/**
 * Draw bullet point item
 */
function drawBulletPoint(doc, text, x, y, maxWidth) {
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.text);

  // Draw bullet
  doc.circle(x + 3, y + 4, 2).fill(COLORS.secondary);

  // Draw text
  doc.text(text, x + 12, y, {
    width: maxWidth - 12,
    align: 'left'
  });

  return doc.y + 3;
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
 * Generate Standard Resume PDF (System Version)
 *
 * Uses data from students and student_extended_profiles tables
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

      // ==================== HEADER SECTION ====================
      // Student Name
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(COLORS.primary)
         .text(studentData.student_name || 'Student Name', MARGIN.left, y, {
           width: pageWidth,
           align: 'center'
         });
      y = doc.y + 5;

      // Contact Information Line
      const contactParts = [];
      if (studentData.email) contactParts.push(studentData.email);
      if (studentData.mobile_number) contactParts.push(studentData.mobile_number);

      if (contactParts.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(contactParts.join('  |  '), MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y + 3;
      }

      // Address line
      const address = extendedProfile.permanent_address || studentData.complete_address;
      if (address) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(address, MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y;
      }

      y += 15;
      y = drawLine(doc, y, COLORS.primary);
      y += 10;

      // ==================== OBJECTIVE SECTION ====================
      // Standard objective based on branch
      const branch = studentData.branch || 'Engineering';
      const objective = `Seeking challenging opportunities in the field of ${branch} where I can utilize my technical skills and academic knowledge to contribute to organizational growth while enhancing my professional development.`;

      y = drawSectionHeader(doc, 'Career Objective', y);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.text)
         .text(objective, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify'
         });
      y = doc.y + 15;

      // ==================== EDUCATION SECTION ====================
      y = checkNewPage(doc, 120);
      y = drawSectionHeader(doc, 'Education', y);

      // Diploma details
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(COLORS.text)
         .text(`Diploma in ${studentData.branch || 'Engineering'}`, MARGIN.left, y);
      y = doc.y + 2;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.lightText)
         .text(studentData.college_name || 'College Name', MARGIN.left, y);
      y = doc.y + 2;

      // CGPA info
      const cgpaInfo = [];
      if (studentData.programme_cgpa) cgpaInfo.push(`CGPA: ${studentData.programme_cgpa}`);
      if (studentData.backlog_count !== null && studentData.backlog_count !== undefined) {
        cgpaInfo.push(`Backlogs: ${studentData.backlog_count}`);
      }

      if (cgpaInfo.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.secondary)
           .text(cgpaInfo.join('  |  '), MARGIN.left, y);
        y = doc.y;
      }

      y += 10;

      // 12th / HSC details
      if (extendedProfile.twelfth_marks) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(COLORS.text)
           .text('Higher Secondary (12th)', MARGIN.left, y);
        y = doc.y + 2;

        const twelfthInfo = [];
        if (extendedProfile.twelfth_board) twelfthInfo.push(extendedProfile.twelfth_board);
        if (extendedProfile.twelfth_year) twelfthInfo.push(extendedProfile.twelfth_year);
        twelfthInfo.push(`${extendedProfile.twelfth_marks}%`);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(twelfthInfo.join('  |  '), MARGIN.left, y);
        y = doc.y + 10;
      }

      // SSLC / 10th details
      if (extendedProfile.sslc_marks) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(COLORS.text)
           .text('Secondary (10th / SSLC)', MARGIN.left, y);
        y = doc.y + 2;

        const sslcInfo = [];
        if (extendedProfile.sslc_board) sslcInfo.push(extendedProfile.sslc_board);
        if (extendedProfile.sslc_year) sslcInfo.push(extendedProfile.sslc_year);
        sslcInfo.push(`${extendedProfile.sslc_marks}%`);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(sslcInfo.join('  |  '), MARGIN.left, y);
        y = doc.y;
      }

      y += 15;

      // ==================== PERSONAL DETAILS SECTION ====================
      y = checkNewPage(doc, 150);
      y = drawSectionHeader(doc, 'Personal Details', y);

      const personalDetails = [
        { label: 'Date of Birth', value: formatDate(studentData.date_of_birth) },
        { label: 'Gender', value: studentData.gender },
        { label: 'PRN', value: studentData.prn },
        { label: 'Region', value: studentData.region_name },
      ];

      // Add father's name if available
      if (extendedProfile.father_name) {
        personalDetails.push({ label: "Father's Name", value: extendedProfile.father_name });
      }

      // Add district if available
      if (extendedProfile.district) {
        personalDetails.push({ label: 'District', value: extendedProfile.district });
      }

      // Add physical details if available
      const height = extendedProfile.height_cm || studentData.height;
      const weight = extendedProfile.weight_kg || studentData.weight;
      if (height) personalDetails.push({ label: 'Height', value: `${height} cm` });
      if (weight) personalDetails.push({ label: 'Weight', value: `${weight} kg` });

      // Draw personal details in two columns
      const colWidth = pageWidth / 2;
      let leftCol = y;
      let rightCol = y;

      personalDetails.forEach((item, index) => {
        if (!item.value) return;

        const isLeft = index % 2 === 0;
        const x = isLeft ? MARGIN.left : MARGIN.left + colWidth;
        const currentY = isLeft ? leftCol : rightCol;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.lightText)
           .text(`${item.label}: `, x, currentY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.text)
           .text(item.value);

        if (isLeft) {
          leftCol = doc.y + 5;
        } else {
          rightCol = doc.y + 5;
        }
      });

      y = Math.max(leftCol, rightCol) + 10;

      // ==================== DOCUMENTS SECTION ====================
      const documents = [];
      if (studentData.has_passport || extendedProfile.has_passport) documents.push('Passport');
      if (studentData.has_aadhar_card || extendedProfile.has_aadhar_card) documents.push('Aadhar Card');
      if (studentData.has_pan_card || extendedProfile.has_pan_card) documents.push('PAN Card');
      if (studentData.has_driving_license || extendedProfile.has_driving_license) documents.push('Driving License');

      if (documents.length > 0) {
        y = checkNewPage(doc, 60);
        y = drawSectionHeader(doc, 'Documents Available', y);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.text)
           .text(documents.join('  |  '), MARGIN.left, y);
        y = doc.y + 15;
      }

      // ==================== INTERESTS & HOBBIES ====================
      if (extendedProfile.interests_hobbies) {
        y = checkNewPage(doc, 60);
        y = drawSectionHeader(doc, 'Interests & Hobbies', y);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.text)
           .text(extendedProfile.interests_hobbies, MARGIN.left, y, {
             width: pageWidth
           });
        y = doc.y + 15;
      }

      // ==================== ADDITIONAL CERTIFICATIONS ====================
      const certs = extendedProfile.additional_certifications;
      if (certs && Array.isArray(certs) && certs.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Certifications', y);

        certs.forEach(cert => {
          const certText = typeof cert === 'string' ? cert : (cert.name || cert.title || JSON.stringify(cert));
          y = drawBulletPoint(doc, certText, MARGIN.left, y, pageWidth);
        });
        y += 10;
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
        y += 10;
      }

      // ==================== DECLARATION ====================
      y = checkNewPage(doc, 80);
      y = drawSectionHeader(doc, 'Declaration', y);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.text)
         .text('I hereby declare that the above-mentioned information is true to the best of my knowledge and belief.', MARGIN.left, y, {
           width: pageWidth,
           align: 'justify'
         });

      y = doc.y + 20;

      // Signature area
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.lightText)
         .text(`Place: ${extendedProfile.district || '_____________'}`, MARGIN.left, y);

      doc.text(`Date: ${formatDate(new Date())}`, MARGIN.left + 200, y);

      y = doc.y + 25;

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(COLORS.text)
         .text(`(${studentData.student_name || 'Signature'})`, doc.page.width - MARGIN.right - 150, y, {
           width: 150,
           align: 'right'
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
 *
 * Includes student's custom additions from student_resumes table
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

      // ==================== HEADER SECTION ====================
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(COLORS.primary)
         .text(studentData.student_name || 'Student Name', MARGIN.left, y, {
           width: pageWidth,
           align: 'center'
         });
      y = doc.y + 5;

      // Contact Information
      const contactParts = [];
      if (studentData.email) contactParts.push(studentData.email);
      if (studentData.mobile_number) contactParts.push(studentData.mobile_number);

      if (contactParts.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(contactParts.join('  |  '), MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y + 3;
      }

      const address = extendedProfile.permanent_address || studentData.complete_address;
      if (address) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(address, MARGIN.left, y, {
             width: pageWidth,
             align: 'center'
           });
        y = doc.y;
      }

      y += 15;
      y = drawLine(doc, y, COLORS.primary);
      y += 10;

      // ==================== CAREER OBJECTIVE ====================
      const objective = resumeData.career_objective ||
        `Seeking challenging opportunities in the field of ${studentData.branch || 'Engineering'} where I can utilize my technical skills and academic knowledge to contribute to organizational growth while enhancing my professional development.`;

      y = drawSectionHeader(doc, 'Career Objective', y);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.text)
         .text(objective, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify'
         });
      y = doc.y + 15;

      // ==================== EDUCATION ====================
      y = checkNewPage(doc, 120);
      y = drawSectionHeader(doc, 'Education', y);

      // Diploma
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(COLORS.text)
         .text(`Diploma in ${studentData.branch || 'Engineering'}`, MARGIN.left, y);
      y = doc.y + 2;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.lightText)
         .text(studentData.college_name || 'College Name', MARGIN.left, y);
      y = doc.y + 2;

      const cgpaInfo = [];
      if (studentData.programme_cgpa) cgpaInfo.push(`CGPA: ${studentData.programme_cgpa}`);
      if (studentData.backlog_count !== null && studentData.backlog_count !== undefined) {
        cgpaInfo.push(`Backlogs: ${studentData.backlog_count}`);
      }

      if (cgpaInfo.length > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.secondary)
           .text(cgpaInfo.join('  |  '), MARGIN.left, y);
        y = doc.y;
      }

      y += 10;

      // 12th details
      if (extendedProfile.twelfth_marks) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(COLORS.text)
           .text('Higher Secondary (12th)', MARGIN.left, y);
        y = doc.y + 2;

        const twelfthInfo = [];
        if (extendedProfile.twelfth_board) twelfthInfo.push(extendedProfile.twelfth_board);
        if (extendedProfile.twelfth_year) twelfthInfo.push(extendedProfile.twelfth_year);
        twelfthInfo.push(`${extendedProfile.twelfth_marks}%`);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(twelfthInfo.join('  |  '), MARGIN.left, y);
        y = doc.y + 10;
      }

      // 10th details
      if (extendedProfile.sslc_marks) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(COLORS.text)
           .text('Secondary (10th / SSLC)', MARGIN.left, y);
        y = doc.y + 2;

        const sslcInfo = [];
        if (extendedProfile.sslc_board) sslcInfo.push(extendedProfile.sslc_board);
        if (extendedProfile.sslc_year) sslcInfo.push(extendedProfile.sslc_year);
        sslcInfo.push(`${extendedProfile.sslc_marks}%`);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.lightText)
           .text(sslcInfo.join('  |  '), MARGIN.left, y);
        y = doc.y;
      }

      y += 15;

      // ==================== SKILLS (Custom) ====================
      const technicalSkills = resumeData.technical_skills || [];
      const softSkills = resumeData.soft_skills || [];
      const languages = resumeData.languages_known || [];

      if (technicalSkills.length > 0 || softSkills.length > 0 || languages.length > 0) {
        y = checkNewPage(doc, 100);
        y = drawSectionHeader(doc, 'Skills', y);

        if (technicalSkills.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.text)
             .text('Technical Skills: ', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .text(technicalSkills.join(', '));
          y = doc.y + 5;
        }

        if (softSkills.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.text)
             .text('Soft Skills: ', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .text(softSkills.join(', '));
          y = doc.y + 5;
        }

        if (languages.length > 0) {
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(COLORS.text)
             .text('Languages: ', MARGIN.left, y, { continued: true })
             .font('Helvetica')
             .text(languages.join(', '));
          y = doc.y;
        }

        y += 15;
      }

      // ==================== PROJECTS (Custom) ====================
      const projects = resumeData.projects || [];
      if (projects.length > 0) {
        y = checkNewPage(doc, 100);
        y = drawSectionHeader(doc, 'Projects', y);

        projects.forEach((project, index) => {
          y = checkNewPage(doc, 60);

          const title = typeof project === 'string' ? project : (project.title || `Project ${index + 1}`);
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(COLORS.text)
             .text(title, MARGIN.left, y);
          y = doc.y + 2;

          if (project.technologies) {
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor(COLORS.secondary)
               .text(`Technologies: ${project.technologies}`, MARGIN.left, y);
            y = doc.y + 2;
          }

          if (project.description) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.text)
               .text(project.description, MARGIN.left, y, { width: pageWidth });
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
          y = checkNewPage(doc, 60);

          const role = typeof exp === 'string' ? exp : (exp.role || exp.title || `Experience ${index + 1}`);
          const company = exp.company || '';

          doc.fontSize(11)
             .font('Helvetica-Bold')
             .fillColor(COLORS.text)
             .text(role, MARGIN.left, y);
          y = doc.y + 2;

          if (company) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.lightText)
               .text(company + (exp.duration ? ` | ${exp.duration}` : ''), MARGIN.left, y);
            y = doc.y + 2;
          }

          if (exp.description) {
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor(COLORS.text)
               .text(exp.description, MARGIN.left, y, { width: pageWidth });
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
            if (cert.issuer) certText += ` - ${cert.issuer}`;
            if (cert.year) certText += ` (${cert.year})`;
          }
          y = drawBulletPoint(doc, certText, MARGIN.left, y, pageWidth);
        });
        y += 10;
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
            if (ach.year) achText += ` (${ach.year})`;
          }
          y = drawBulletPoint(doc, achText, MARGIN.left, y, pageWidth);
        });
        y += 10;
      }

      // ==================== EXTRACURRICULAR ====================
      const extracurricular = resumeData.extracurricular_activities || extendedProfile.extracurricular || [];
      if (extracurricular.length > 0) {
        y = checkNewPage(doc, 80);
        y = drawSectionHeader(doc, 'Extracurricular Activities', y);

        extracurricular.forEach(act => {
          const actText = typeof act === 'string' ? act : (act.title || act.name || JSON.stringify(act));
          y = drawBulletPoint(doc, actText, MARGIN.left, y, pageWidth);
        });
        y += 10;
      }

      // ==================== PERSONAL DETAILS ====================
      y = checkNewPage(doc, 100);
      y = drawSectionHeader(doc, 'Personal Details', y);

      const personalDetails = [
        { label: 'Date of Birth', value: formatDate(studentData.date_of_birth) },
        { label: 'Gender', value: studentData.gender },
        { label: 'PRN', value: studentData.prn },
      ];

      if (extendedProfile.father_name) {
        personalDetails.push({ label: "Father's Name", value: extendedProfile.father_name });
      }

      if (extendedProfile.district) {
        personalDetails.push({ label: 'District', value: extendedProfile.district });
      }

      const height = extendedProfile.height_cm || studentData.height;
      const weight = extendedProfile.weight_kg || studentData.weight;
      if (height) personalDetails.push({ label: 'Height', value: `${height} cm` });
      if (weight) personalDetails.push({ label: 'Weight', value: `${weight} kg` });

      const colWidth = pageWidth / 2;
      let leftCol = y;
      let rightCol = y;

      personalDetails.forEach((item, index) => {
        if (!item.value) return;

        const isLeft = index % 2 === 0;
        const x = isLeft ? MARGIN.left : MARGIN.left + colWidth;
        const currentY = isLeft ? leftCol : rightCol;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(COLORS.lightText)
           .text(`${item.label}: `, x, currentY, { continued: true })
           .font('Helvetica')
           .fillColor(COLORS.text)
           .text(item.value);

        if (isLeft) {
          leftCol = doc.y + 5;
        } else {
          rightCol = doc.y + 5;
        }
      });

      y = Math.max(leftCol, rightCol) + 10;

      // ==================== DOCUMENTS ====================
      const documents = [];
      if (studentData.has_passport || extendedProfile.has_passport) documents.push('Passport');
      if (studentData.has_aadhar_card || extendedProfile.has_aadhar_card) documents.push('Aadhar Card');
      if (studentData.has_pan_card || extendedProfile.has_pan_card) documents.push('PAN Card');
      if (studentData.has_driving_license || extendedProfile.has_driving_license) documents.push('Driving License');

      if (documents.length > 0) {
        y = checkNewPage(doc, 60);
        y = drawSectionHeader(doc, 'Documents Available', y);
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(COLORS.text)
           .text(documents.join('  |  '), MARGIN.left, y);
        y = doc.y + 15;
      }

      // ==================== CUSTOM SECTIONS ====================
      const customSections = resumeData.custom_sections || [];
      if (customSections.length > 0) {
        customSections.forEach(section => {
          y = checkNewPage(doc, 80);
          y = drawSectionHeader(doc, section.title || 'Additional Information', y);
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor(COLORS.text)
             .text(section.content || '', MARGIN.left, y, { width: pageWidth });
          y = doc.y + 15;
        });
      }

      // ==================== DECLARATION ====================
      y = checkNewPage(doc, 80);
      y = drawSectionHeader(doc, 'Declaration', y);

      const declaration = resumeData.declaration_text ||
        'I hereby declare that the above-mentioned information is true to the best of my knowledge and belief.';

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.text)
         .text(declaration, MARGIN.left, y, {
           width: pageWidth,
           align: 'justify'
         });

      y = doc.y + 20;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.lightText)
         .text(`Place: ${extendedProfile.district || '_____________'}`, MARGIN.left, y);

      doc.text(`Date: ${formatDate(new Date())}`, MARGIN.left + 200, y);

      y = doc.y + 25;

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(COLORS.text)
         .text(`(${studentData.student_name || 'Signature'})`, doc.page.width - MARGIN.right - 150, y, {
           width: 150,
           align: 'right'
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

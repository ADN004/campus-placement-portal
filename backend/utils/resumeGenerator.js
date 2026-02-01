/**
 * Resume PDF Generator - Professional Edition
 *
 * Generates a professional resume PDF for students using system data
 * combined with student-customized content (skills, projects, experience, etc.)
 *
 * Layout inspired by a clean Navy-themed template with section headers,
 * skill pills, and a two-column academic details table.
 */

import PDFDocument from 'pdfkit';

// Navy theme colour palette
const NAVY = '#1B2A4A';
const BLACK = '#000000';
const DARK_GRAY = '#444444';
const MID_GRAY = '#666666';
const LIGHT_GRAY = '#999999';

// Page geometry (A4)
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 36, bottom: 36, left: 40, right: 40 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

// Reusable spacing constants
const SP = {
  sectionBefore: 16,
  sectionAfter: 6,
  itemGap: 6,
  paraGap: 4,
};

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric',
  });
}

/** Ensure enough room; add page if not. Returns current Y. */
function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > PAGE.height - MARGIN.bottom) {
    doc.addPage();
    return MARGIN.top;
  }
  return doc.y;
}

// ─── drawing primitives ─────────────────────────────────────────────────────

/**
 * Draw a navy section header with an underline rule.
 * Matches the DOCX template: uppercase 10pt bold navy + 1.5pt navy line.
 */
function drawSectionHeader(doc, title) {
  doc.y = ensureSpace(doc, 40);
  doc.moveDown(0.6);

  const y = doc.y;
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor(NAVY)
     .text(title.toUpperCase(), MARGIN.left, y, {
       width: CONTENT_WIDTH,
       characterSpacing: 0.8,
     });

  const lineY = doc.y + 3;
  doc.strokeColor(NAVY)
     .lineWidth(1.5)
     .moveTo(MARGIN.left, lineY)
     .lineTo(MARGIN.left + CONTENT_WIDTH, lineY)
     .stroke();

  doc.y = lineY + SP.sectionAfter;
}

/**
 * Draw dot-separated skill pills.
 *  Python  •  JavaScript  •  React.js
 */
function drawSkillPills(doc, skills) {
  if (!skills || skills.length === 0) return;
  const text = skills.map(s => ` ${s} `).join('  \u2022  ');
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(NAVY)
     .text(text, MARGIN.left, doc.y + 4, { width: CONTENT_WIDTH, lineGap: 2 });
  doc.y += 4;
}

/**
 * Draw a two-column label → value row (for academic details).
 */
function drawLabelRow(doc, label, value, opts = {}) {
  if (!value && value !== 0) return;
  const labelW = 120;
  const y = ensureSpace(doc, 16);
  const startY = doc.y;

  // Label
  doc.fontSize(9.5)
     .font('Helvetica-Bold')
     .fillColor(NAVY)
     .text(label, MARGIN.left, startY, { width: labelW, continued: false });

  // Value
  doc.fontSize(opts.small ? 9 : 9.5)
     .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
     .fillColor(opts.color || BLACK)
     .text(String(value), MARGIN.left + labelW, startY, {
       width: CONTENT_WIDTH - labelW,
     });

  doc.y = Math.max(doc.y, startY + 14) + 1;
}

/**
 * Draw a project entry: title | technologies, duration, description.
 */
function drawProjectEntry(doc, title, technologies, duration, description) {
  doc.y = ensureSpace(doc, 50);

  // Title + tech
  const titleParts = [];
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor(BLACK)
     .text(title || 'Untitled Project', MARGIN.left, doc.y, {
       width: CONTENT_WIDTH,
       continued: !!technologies,
     });

  if (technologies) {
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(MID_GRAY)
       .text(`  |  ${technologies}`, { continued: false });
  }

  // Duration
  if (duration) {
    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .fillColor(MID_GRAY)
       .text(duration, MARGIN.left, doc.y + 1, { width: CONTENT_WIDTH });
  }

  // Description
  if (description) {
    doc.fontSize(9.5)
       .font('Helvetica')
       .fillColor(BLACK)
       .text(description, MARGIN.left, doc.y + 2, {
         width: CONTENT_WIDTH,
         lineGap: 1.5,
       });
  }

  doc.y += SP.itemGap;
}

/**
 * Draw a work experience entry: role — company, duration, description.
 */
function drawWorkEntry(doc, role, company, duration, description) {
  doc.y = ensureSpace(doc, 50);

  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor(BLACK)
     .text(role || 'Role not specified', MARGIN.left, doc.y, {
       width: CONTENT_WIDTH,
       continued: !!company,
     });

  if (company) {
    doc.fontSize(9.5)
       .font('Helvetica')
       .fillColor(DARK_GRAY)
       .text(` \u2014 ${company}`, { continued: false });
  }

  if (duration) {
    doc.fontSize(9)
       .font('Helvetica-Oblique')
       .fillColor(MID_GRAY)
       .text(duration, MARGIN.left, doc.y + 1, { width: CONTENT_WIDTH });
  }

  if (description) {
    doc.fontSize(9.5)
       .font('Helvetica')
       .fillColor(BLACK)
       .text(description, MARGIN.left, doc.y + 2, {
         width: CONTENT_WIDTH,
         lineGap: 1.5,
       });
  }

  doc.y += SP.itemGap;
}

/**
 * Draw a certification line: Name — Org — Year
 */
function drawCertEntry(doc, name, org, year) {
  doc.y = ensureSpace(doc, 16);
  const suffix = [org, year].filter(Boolean).join(' \u2014 ');

  doc.fontSize(9.5)
     .font('Helvetica')
     .fillColor(BLACK)
     .text(name || 'Unnamed', MARGIN.left, doc.y, {
       width: CONTENT_WIDTH,
       continued: !!suffix,
     });

  if (suffix) {
    doc.fontSize(9)
       .fillColor(MID_GRAY)
       .text(` \u2014 ${suffix}`, { continued: false });
  }

  doc.y += 2;
}

/**
 * Draw an achievement line: Title — Year | description
 */
function drawAchievementEntry(doc, title, year, description) {
  doc.y = ensureSpace(doc, 16);
  const heading = [title, year].filter(Boolean).join(' \u2014 ');

  doc.fontSize(9.5)
     .font('Helvetica-Bold')
     .fillColor(BLACK)
     .text(heading || 'Achievement', MARGIN.left, doc.y, {
       width: CONTENT_WIDTH,
       continued: !!description,
     });

  if (description) {
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(MID_GRAY)
       .text(` | ${description}`, { continued: false });
  }

  doc.y += 2;
}

// ─── main generator ─────────────────────────────────────────────────────────

/**
 * Generate Resume PDF.
 * Returns a Buffer containing the complete PDF.
 */
export async function generateResume(studentData, extendedProfile = {}, resumeData = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: MARGIN,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const name = (studentData.student_name || 'STUDENT NAME').toUpperCase();
      const branch = studentData.branch || 'Engineering';

      // ===== HEADER =====
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(NAVY)
         .text(name, MARGIN.left, MARGIN.top, {
           width: CONTENT_WIDTH,
           align: 'center',
           characterSpacing: 1.5,
         });

      // Contact line
      const parts = [];
      if (studentData.email) parts.push(studentData.email);
      if (studentData.mobile_number) parts.push(`+91 ${studentData.mobile_number}`);

      if (parts.length > 0) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(DARK_GRAY)
           .text(parts.join('  |  '), MARGIN.left, doc.y + 6, {
             width: CONTENT_WIDTH,
             align: 'center',
           });
      }

      doc.y += 10;

      // ===== CAREER OBJECTIVE =====
      const defaultObj = `A dedicated and motivated ${branch} student seeking challenging opportunities to apply technical knowledge and skills in a professional environment. Committed to continuous learning and contributing effectively to organizational success while pursuing career growth.`;
      const objective = resumeData.career_objective || defaultObj;

      drawSectionHeader(doc, 'Career Objective');
      doc.fontSize(9.5)
         .font('Helvetica')
         .fillColor(BLACK)
         .text(objective, MARGIN.left, doc.y + 2, {
           width: CONTENT_WIDTH,
           align: 'justify',
           lineGap: 2,
         });
      doc.y += SP.sectionBefore;

      // ===== ACADEMIC DETAILS =====
      drawSectionHeader(doc, 'Academic Details');

      const collegeName = studentData.college_name || 'Polytechnic College';
      drawLabelRow(doc, 'Programme', `Diploma in ${branch}, ${collegeName}`);

      const cgpa = studentData.programme_cgpa
        ? `${studentData.programme_cgpa} / 10`
        : 'N/A';
      drawLabelRow(doc, 'Overall CGPA', cgpa, { bold: true });

      // Semester CGPAs
      const sems = [];
      for (let i = 1; i <= 6; i++) {
        const v = studentData[`cgpa_sem${i}`];
        if (v && parseFloat(v) > 0) sems.push(`S${i}: ${v}`);
      }
      if (sems.length > 0) {
        drawLabelRow(doc, 'Semester CGPA', sems.join('  |  '), { small: true, color: DARK_GRAY });
      }

      // 12th
      if (extendedProfile.twelfth_marks) {
        const det = [
          `${extendedProfile.twelfth_marks}%`,
          extendedProfile.twelfth_board || 'State Board',
          extendedProfile.twelfth_year || '',
        ].filter(Boolean).join(', ');
        drawLabelRow(doc, 'Higher Secondary', det);
      }

      // 10th
      if (extendedProfile.sslc_marks) {
        const det = [
          `${extendedProfile.sslc_marks}%`,
          extendedProfile.sslc_board || 'State Board',
          extendedProfile.sslc_year || '',
        ].filter(Boolean).join(', ');
        drawLabelRow(doc, 'SSLC (10th)', det);
      }

      // Backlogs
      const backlogs =
        studentData.backlog_count !== null && studentData.backlog_count !== undefined
          ? (studentData.backlog_count === 0 ? 'None' : String(studentData.backlog_count))
          : 'None';
      drawLabelRow(doc, 'Backlogs', backlogs);

      doc.y += SP.sectionBefore / 2;

      // ===== TECHNICAL SKILLS =====
      const techSkills = resumeData.technical_skills || [];
      if (techSkills.length > 0) {
        drawSectionHeader(doc, 'Technical Skills');
        drawSkillPills(doc, techSkills);
      }

      // ===== SOFT SKILLS =====
      const softSkills = resumeData.soft_skills || [];
      if (softSkills.length > 0) {
        drawSectionHeader(doc, 'Soft Skills');
        drawSkillPills(doc, softSkills);
      }

      // ===== PROJECTS =====
      const projects = resumeData.projects || [];
      if (projects.length > 0) {
        drawSectionHeader(doc, 'Projects');
        projects.forEach((p) => {
          if (typeof p === 'string') {
            drawProjectEntry(doc, p, null, null, null);
          } else {
            drawProjectEntry(doc, p.title, p.technologies, p.duration, p.description);
          }
        });
      }

      // ===== WORK EXPERIENCE =====
      const workExp = resumeData.work_experience || [];
      if (workExp.length > 0) {
        drawSectionHeader(doc, 'Work Experience');
        workExp.forEach((e) => {
          if (typeof e === 'string') {
            drawWorkEntry(doc, e, null, null, null);
          } else {
            drawWorkEntry(doc, e.role || e.title, e.company, e.duration, e.description);
          }
        });
      }

      // ===== CERTIFICATIONS =====
      const certs = resumeData.certifications || extendedProfile.additional_certifications || [];
      if (certs.length > 0) {
        drawSectionHeader(doc, 'Certifications');
        certs.forEach((c) => {
          if (typeof c === 'string') {
            drawCertEntry(doc, c, null, null);
          } else {
            drawCertEntry(doc, c.name || c.title, c.issuer || c.org, c.year);
          }
        });
      }

      // ===== ACHIEVEMENTS =====
      const achievements = resumeData.achievements || extendedProfile.achievements || [];
      if (achievements.length > 0) {
        drawSectionHeader(doc, 'Achievements');
        achievements.forEach((a) => {
          if (typeof a === 'string') {
            drawAchievementEntry(doc, a, null, null);
          } else {
            drawAchievementEntry(doc, a.title || a.name, a.year, a.description);
          }
        });
      }

      // ===== EXTRACURRICULAR ACTIVITIES =====
      const extra = resumeData.extracurricular_activities || extendedProfile.extracurricular || [];
      if (extra.length > 0) {
        drawSectionHeader(doc, 'Extracurricular Activities & Hobbies');
        const texts = extra
          .map((a) => (typeof a === 'string' ? a : a.title || a.name || ''))
          .filter(Boolean);
        if (texts.length > 0) {
          doc.fontSize(9.5)
             .font('Helvetica')
             .fillColor(BLACK)
             .text(texts.join(', '), MARGIN.left, doc.y + 2, {
               width: CONTENT_WIDTH,
               lineGap: 1.5,
             });
        }
      }

      // ===== LANGUAGES KNOWN =====
      const languages = resumeData.languages_known || [];
      if (languages.length > 0) {
        drawSectionHeader(doc, 'Languages Known');
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(BLACK)
           .text(languages.join(', '), MARGIN.left, doc.y + 2, {
             width: CONTENT_WIDTH,
           });
      }

      // ===== CUSTOM SECTIONS =====
      const custom = resumeData.custom_sections || [];
      custom.forEach((s) => {
        if (!s.title || !s.content) return;
        drawSectionHeader(doc, s.title);
        doc.fontSize(9.5)
           .font('Helvetica')
           .fillColor(BLACK)
           .text(s.content, MARGIN.left, doc.y + 2, {
             width: CONTENT_WIDTH,
             lineGap: 1.5,
           });
      });

      // ===== DECLARATION =====
      doc.y = ensureSpace(doc, 90);
      doc.moveDown(0.8);

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(NAVY)
         .text('DECLARATION', MARGIN.left, doc.y);

      const declText = resumeData.declaration_text ||
        'I hereby declare that the above information is true to the best of my knowledge and belief.';
      doc.fontSize(8.5)
         .font('Helvetica')
         .fillColor(MID_GRAY)
         .text(declText, MARGIN.left, doc.y + 4, {
           width: CONTENT_WIDTH,
           lineGap: 1.5,
         });

      doc.y += 8;

      const place = resumeData.address || extendedProfile.permanent_address || studentData.complete_address || extendedProfile.district || '____________';
      doc.fontSize(8.5)
         .font('Helvetica')
         .fillColor(MID_GRAY)
         .text(`Place: ${place}`, MARGIN.left, doc.y);

      doc.text(`Date: ${formatDate(new Date())}`, MARGIN.left, doc.y);

      doc.y += 10;

      // Signature
      doc.fontSize(8.5)
         .font('Helvetica-Oblique')
         .fillColor(MID_GRAY)
         .text(`(${studentData.student_name || 'Signature'})`, MARGIN.left, doc.y, {
           width: CONTENT_WIDTH,
           align: 'right',
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default {
  generateResume,
};

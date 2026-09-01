import PDFDocument from 'pdfkit';
import { BRANCH_SHORT_NAMES } from '../constants/branches.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Font paths
const FONTS_DIR = path.join(__dirname, '../../fonts');
const FONTS = {
  SwirlyCanalope: path.join(FONTS_DIR, 'SwirlyCanalope.otf'),
  Coolvetica: path.join(FONTS_DIR, 'Coolvetica.otf'),
  LemonMilk: path.join(FONTS_DIR, 'LEMONMILK-Medium.otf')
};

// Field display names mapping
const fieldDisplayNames = {
  prn: 'PRN',
  student_name: 'Student Name',
  email: 'Email ID',
  mobile: 'Mobile',
  mobile_number: 'Mobile No',
  branch: 'Branch',
  college_name: 'College',
  region_name: 'Region',
  date_of_birth: 'Date of Birth',
  age: 'Age',
  gender: 'Gender',
  height: 'Height (cm)',
  weight: 'Weight (kg)',
  height_cm: 'Height (cm)',  // Support both field names
  weight_kg: 'Weight (kg)',   // Support both field names
  sslc_marks: 'SSLC %',
  twelfth_marks: '12th %',
  complete_address: 'Address',
  programme_cgpa: 'CGPA',
  cgpa: 'CGPA',
  cgpa_sem1: 'Sem 1 CGPA',
  cgpa_sem2: 'Sem 2 CGPA',
  cgpa_sem3: 'Sem 3 CGPA',
  cgpa_sem4: 'Sem 4 CGPA',
  cgpa_sem5: 'Sem 5 CGPA',
  cgpa_sem6: 'Sem 6 CGPA',
  backlog_count: 'Backlogs',
  backlog_details: 'Backlog Details',
  has_driving_license: 'Driving License',
  has_pan_card: 'PAN Card',
  has_aadhar_card: 'Aadhar',
  has_passport: 'Passport',
  application_status: 'Status',
  registration_status: 'Reg. Status',
  is_blacklisted: 'Blacklisted',
  blacklist_reason: 'Blacklist Reason',
};

// A4 landscape fits only so many readable columns — beyond this the font
// floor (7pt) and per-column minimum width make rows overflow and truncate.
// Excel has no such physical limit, so callers should suggest it instead.
export const MAX_PDF_EXPORT_FIELDS = 12;

// Table cells must hold ONE line of WinAnsi-safe text. Students paste
// multi-line subject lists and phone-keyboard punctuation (curly quotes,
// bullets, ™): explicit newlines ignore lineBreak:false and flood past the
// fixed 25pt row height across whole pages, and characters outside the
// built-in Helvetica encoding render as garbage glyphs.
const sanitizeCellText = (text) => String(text)
  .replace(/[‘’‚′]/g, "'")
  .replace(/[“”„″]/g, '"')
  .replace(/[–—―]/g, '-')
  .replace(/[•●▪·⁃]/g, '-')
  .replace(/…/g, '...')
  .replace(/[^\x20-\x7EÀ-ÿ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Shrink text until it physically fits maxWidth, marking the cut with an
// ellipsis. Measuring is the only reliable mechanism here: PDFKit silently
// ignores `lineBreak: false` once `ellipsis: true` is set and wraps anyway,
// overflowing fixed row heights and bleeding across rows and pages.
// Binary search, not a per-character walk: students paste whole paragraphs
// into free-text fields and a linear scan would measure thousands of times.
const truncateToWidth = (doc, text, maxWidth) => {
  if (doc.widthOfString(text) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(text.slice(0, mid) + '...') <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, Math.max(1, lo)).trimEnd() + '...';
};

// Break a label into at most maxLines lines that each fit maxWidth. Used for
// table headers, which are allowed to wrap inside the header band.
const wrapToWidth = (doc, text, maxWidth, maxLines = 2) => {
  const lines = [];
  let rest = text;
  while (rest.length && lines.length < maxLines) {
    if (doc.widthOfString(rest) <= maxWidth) { lines.push(rest); rest = ''; break; }
    let lo = 1;
    let hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (doc.widthOfString(rest.slice(0, mid)) <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    const cut = lo;
    const space = rest.lastIndexOf(' ', cut);
    // Break on a space only when it doesn't strand most of the line
    const breakAt = (space > 0 && space > cut * 0.65) ? space : cut;
    lines.push(rest.slice(0, breakAt).trimEnd());
    rest = rest.slice(breakAt).trimStart();
  }
  if (rest.length && lines.length) {
    lines[lines.length - 1] = truncateToWidth(doc, lines[lines.length - 1] + rest, maxWidth);
  }
  return lines.length ? lines : [''];
};

/**
 * Size a fixed column set against the width the page actually has, by
 * measuring the data rather than trusting hardcoded widths. Hardcoded widths
 * are what put a 980pt table on a 742pt page and pushed five columns clean
 * off the sheet, where they were generated but could never be printed.
 * The returned widths always sum to exactly availableWidth.
 *
 * @param {PDFDocument} doc - live document, used for font measurement
 * @param {Array} columns - [{ key, label }]
 * @param {Array} rows - the dataset, so widths reflect real content
 * @param {Number} availableWidth - page width minus both margins
 * @param {Object} options - { rowFont, headerFont, getValue }
 * @returns {Array<Number>} width per column, in column order
 */
const fitTableColumns = (doc, columns, rows, availableWidth, options = {}) => {
  const {
    rowFont = 7.5,
    headerFont = 8,
    getValue,
    padding = 6,
    minWidth = 30,
    rigidMaxWidth = 90,
  } = options;

  const ideal = columns.map(col => {
    doc.font('Helvetica').fontSize(rowFont);
    let widest = 0;
    rows.forEach((row, i) => {
      widest = Math.max(widest, doc.widthOfString(getValue(col, row, i + 1)));
    });
    // Headers wrap between words inside the header band, so a column only
    // needs room for its longest single WORD, not the whole label — sizing
    // by the full title is what starves the name and email columns.
    doc.font('Helvetica-Bold').fontSize(headerFont);
    const headerWord = Math.max(
      ...String(col.label).split(/\s+/).map(word => doc.widthOfString(word))
    );
    return Math.max(widest, headerWord) + padding;
  });

  const total = ideal.reduce((sum, w) => sum + w, 0);

  // Everything fits: share the slack out proportionally so the table spans
  // the full width instead of ending in a ragged right edge.
  if (total <= availableWidth) {
    const slack = availableWidth - total;
    return ideal.map(w => w + slack * (w / total));
  }

  // Too wide for the page: columns whose whole content is narrow (PRNs,
  // CGPAs, Yes/No, ages) are RIGID and keep exactly what they need — a PRN
  // missing its last digit is unusable. Only the long-text columns give up
  // space, in proportion to how much they were asking for.
  const rigid = [];
  const flexible = [];
  ideal.forEach((w, i) => (w <= rigidMaxWidth ? rigid : flexible).push(i));
  const rigidTotal = rigid.reduce((sum, i) => sum + ideal[i], 0);
  const flexTotal = flexible.reduce((sum, i) => sum + ideal[i], 0);
  const flexAvailable = availableWidth - rigidTotal;

  if (flexible.length > 0 && flexAvailable >= flexible.length * minWidth) {
    const widths = ideal.slice();
    const scale = flexAvailable / flexTotal;
    flexible.forEach(i => { widths[i] = ideal[i] * scale; });
    return widths;
  }

  // Degenerate case (almost everything rigid, or no room left): plain
  // proportional scaling for every column.
  const scale = availableWidth / total;
  return ideal.map(w => Math.max(minWidth, w * scale));
};

// Default fields when none selected (for simple exports)
const DEFAULT_FIELDS = [
  'prn',
  'student_name',
  'email',
  'mobile_number',
  'branch',
  'college_name',
  'programme_cgpa'
];

/**
 * Calculate dynamic column widths based on actual content and selected fields
 * @param {Array} fields - Array of field names
 * @param {Number} pageWidth - Available page width
 * @param {Boolean} hasSignature - Whether signature column is included
 * @param {Boolean} hasSlNo - Whether serial number column is included
 * @param {Boolean} useShortNames - Whether using short branch names
 * @param {Array} students - Array of student data for content-based sizing
 * @returns {Object} Column widths mapping
 */
const calculateColumnWidths = (fields, pageWidth, hasSignature, hasSlNo, useShortNames = false, students = [], fieldLabels = {}) => {
  // Adjust signature and SL NO width based on available space
  const numFields = fields.length + (hasSignature ? 1 : 0) + (hasSlNo ? 1 : 0);

  // Scale down signature and SL NO for many fields
  const signatureWidth = hasSignature ? (numFields > 10 ? 50 : 60) : 0;
  const slNoWidth = hasSlNo ? (numFields > 10 ? 35 : 40) : 0;
  const availableWidth = pageWidth - signatureWidth - slNoWidth;

  // Minimum and maximum width constraints
  const minWidthPerColumn = 40;
  const maxWidthPerColumn = 200;

  // Field width priorities (relative weights) - fallback if no data
  const fieldWeights = {
    prn: 1.0,
    student_name: 1.8,
    email: 2.0,
    mobile_number: 1.1,
    branch: useShortNames ? 0.5 : 1.5,
    college_name: 1.8,
    region_name: 1.3,
    date_of_birth: 1.0,
    age: 0.5,
    gender: 0.6,
    height: 0.6,
    weight: 0.6,
    height_cm: 0.6,
    weight_kg: 0.6,
    sslc_marks: 0.7,
    twelfth_marks: 0.7,
    complete_address: 2.2,
    programme_cgpa: 0.8,
    cgpa: 0.8,
    cgpa_sem1: 0.7,
    cgpa_sem2: 0.7,
    cgpa_sem3: 0.7,
    cgpa_sem4: 0.7,
    cgpa_sem5: 0.7,
    cgpa_sem6: 0.7,
    backlog_count: 0.7,
    backlog_details: 1.3,
    has_driving_license: 0.9,
    has_pan_card: 0.7,
    registration_status: 1.0,
    is_blacklisted: 0.8,
    blacklist_reason: 1.3,
  };

  // Calculate content-based weights if we have student data
  const contentWeights = {};
  if (students && students.length > 0) {
    // Measure at the font size the rows will actually render with — a
    // fixed 6px/char estimate pads 7pt tables with dead space that the
    // name/email columns desperately need
    const rowFontSize = numFields > 12 ? 7 : (numFields > 8 ? 8 : 9);
    const charWidth = rowFontSize * 0.62;

    // Sample spread across the WHOLE dataset: the first rows alone would
    // size College by "GPC Koratty" and truncate "MPC (IHRD) Kuzhalmannam"
    const sampleStep = Math.max(1, Math.floor(students.length / 60));
    const sample = students.filter((_, i) => i % sampleStep === 0);

    fields.forEach(field => {
      let maxLength = 1;
      sample.forEach(student => {
        let value = student[field];
        // Format value the same way it will be displayed
        if (value === null || value === undefined) {
          value = '-';
        } else if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        } else if (field === 'date_of_birth' && value) {
          value = new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        } else if (field === 'branch' && useShortNames && value) {
          value = BRANCH_SHORT_NAMES[value] || String(value);
        } else {
          value = String(value);
        }
        maxLength = Math.max(maxLength, sanitizeCellText(value).length);
      });

      // Headers wrap between words inside the header row ("Sem 1" over
      // "CGPA"), so a column only needs its longest single header WORD —
      // sizing by the full header title is what starved the name columns
      const headerWordWidth = Math.max(
        ...(fieldLabels[field] || fieldDisplayNames[field] || field).split(/\s+/).map(w => w.length)
      ) * charWidth * 1.1;

      const contentWidth = maxLength * charWidth;
      contentWeights[field] = Math.min(
        maxWidthPerColumn,
        Math.max(26, headerWordWidth, contentWidth) + 8
      );
    });
  }

  // Use content weights if available, otherwise fall back to predefined weights
  const widths = {};
  if (hasSlNo) widths.sl_no = slNoWidth;

  if (Object.keys(contentWeights).length > 0) {
    // Columns whose full content is narrow (PRNs, CGPAs, Yes/No, ages) are
    // RIGID: they keep exactly the width their content needs and must never
    // be squeezed — a PRN that wraps its last digit is unusable. Only the
    // long-text columns (names, backlog details, addresses) are flexible
    // and share whatever width remains, proportionally to their content.
    const RIGID_MAX_WIDTH = 90;
    const rigid = fields.filter(f => contentWeights[f] <= RIGID_MAX_WIDTH);
    const flexible = fields.filter(f => contentWeights[f] > RIGID_MAX_WIDTH);
    const rigidTotal = rigid.reduce((sum, f) => sum + contentWeights[f], 0);
    const flexTotal = flexible.reduce((sum, f) => sum + contentWeights[f], 0);
    const flexAvailable = availableWidth - rigidTotal;

    if (flexible.length === 0 || flexAvailable < flexible.length * minWidthPerColumn) {
      // Degenerate case (almost everything rigid, or no room left):
      // fall back to plain proportional scaling for every column
      const scaleFactor = availableWidth / (rigidTotal + flexTotal);
      fields.forEach(field => {
        widths[field] = Math.max(minWidthPerColumn, contentWeights[field] * scaleFactor);
      });
    } else {
      rigid.forEach(field => { widths[field] = contentWeights[field]; });
      const scaleFactor = flexAvailable / flexTotal;
      flexible.forEach(field => {
        widths[field] = Math.max(minWidthPerColumn, contentWeights[field] * scaleFactor);
      });
    }
  } else {
    // Weight-based sizing (fallback)
    let totalWeight = fields.reduce((sum, field) => {
      return sum + (fieldWeights[field] || 1.0);
    }, 0);

    fields.forEach(field => {
      const weight = fieldWeights[field] || 1.0;
      const calculatedWidth = (weight / totalWeight) * availableWidth;
      widths[field] = Math.max(minWidthPerColumn, calculatedWidth);
    });
  }

  if (hasSignature) widths.signature = signatureWidth;

  return widths;
};

/**
 * Draw PDF header with college/company information
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} options - Header options
 */
const drawHeader = (doc, options) => {
  const { collegeName, companyName, driveDate, headerLine1, headerLine2 } = options;
  const pageWidth = doc.page.width;
  let currentY = 65; // Start at 65 to give proper spacing from top border at 50

  // New-style header: two free-form lines (like Cadence PDF)
  if (headerLine1) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(headerLine1, 0, currentY, {
         width: pageWidth,
         align: 'center',
         lineBreak: false
       });
    currentY += 22;

    if (headerLine2) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('black')
         .text(headerLine2, 0, currentY, {
           width: pageWidth,
           align: 'center',
           lineBreak: false
         });
      currentY += 16;
    }

    return currentY + 10;
  }

  // Legacy-style header (for student registration exports)
  if (collegeName) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(sanitizeCellText(collegeName).toUpperCase(), 0, currentY, {
         width: pageWidth,
         align: 'center',
         lineBreak: false
       });
    currentY += 22;
  }

  if (companyName || driveDate) {
    let driveText = 'PLACEMENT DRIVE';

    if (companyName && driveDate) {
      driveText = `PLACEMENT DRIVE OF ${companyName.toUpperCase()} ON ${driveDate}`;
    } else if (companyName) {
      driveText = `PLACEMENT DRIVE OF ${companyName.toUpperCase()}`;
    } else if (driveDate) {
      driveText = `PLACEMENT DRIVE ON ${driveDate}`;
    }

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(driveText, 0, currentY, {
         width: pageWidth,
         align: 'center',
         lineBreak: false
       });
    currentY += 18;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('REGISTRATION LIST', 0, currentY, {
         width: pageWidth,
         align: 'center',
         lineBreak: false
       });
    currentY += 20;
  } else if (collegeName) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('STUDENT LIST', 0, currentY, {
         width: pageWidth,
         align: 'center',
         lineBreak: false
       });
    currentY += 20;
  }

  return currentY + 10;
};

/**
 * Draw college name as merged table row
 * @param {PDFDocument} doc - PDF document instance
 * @param {String} collegeName - College name to display
 * @param {Number} tableWidth - Total width of table
 * @param {Number} startX - Starting X position
 * @param {Number} startY - Starting Y position
 * @returns {Number} Y position after drawing college row
 */
const drawCollegeRow = (doc, collegeName, tableWidth, startX, startY) => {
  const rowHeight = 40;

  // Draw merged cell background with professional styling
  doc.rect(startX, startY, tableWidth, rowHeight)
     .fillAndStroke('#F3F4F6', '#6B7280');

  // Draw college name with professional font
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#1F2937')
     .text(sanitizeCellText(collegeName).toUpperCase(), startX, startY + 13, {
       width: tableWidth,
       align: 'center',
       lineBreak: false
     });

  return startY + rowHeight;
};

/**
 * Draw table headers
 * @param {PDFDocument} doc - PDF document instance
 * @param {Array} fields - Array of field names
 * @param {Object} columnWidths - Column width mapping
 * @param {Boolean} hasSignature - Whether signature column is included
 * @param {Boolean} hasSlNo - Whether serial number column is included
 * @param {Number} startY - Starting Y position
 * @returns {Number} Y position after drawing headers
 */
const drawTableHeaders = (doc, fields, columnWidths, hasSignature, hasSlNo, startY, fieldLabels = {}) => {
  const margin = doc.page.margins.left || 40;
  let currentX = margin;
  const headerHeight = 30;

  // Adjust font size based on number of fields
  const totalFields = fields.length + (hasSignature ? 1 : 0) + (hasSlNo ? 1 : 0);
  const headerFontSize = totalFields > 12 ? 7 : (totalFields > 8 ? 8 : 9);

  // Draw header cells with borders
  doc.lineWidth(1);
  doc.strokeColor('#000000');

  // Serial number header
  if (hasSlNo) {
    doc.rect(currentX, startY, columnWidths.sl_no, headerHeight)
       .fillAndStroke('#4B5563', '#000000');
    currentX += columnWidths.sl_no;
  }

  // Field headers
  fields.forEach(field => {
    doc.rect(currentX, startY, columnWidths[field], headerHeight)
       .fillAndStroke('#4B5563', '#000000');
    currentX += columnWidths[field];
  });

  // Signature header
  if (hasSignature) {
    doc.rect(currentX, startY, columnWidths.signature, headerHeight)
       .fillAndStroke('#4B5563', '#000000');
  }

  // Draw header text
  currentX = margin;
  doc.fontSize(headerFontSize)
     .font('Helvetica-Bold')
     .fillColor('white');

  // Serial number header text
  if (hasSlNo) {
    doc.text('SL NO', currentX + 2, startY + 10, {
      width: columnWidths.sl_no - 4,
      align: 'center'
    });
    currentX += columnWidths.sl_no;
  }

  // Field header text
  fields.forEach(field => {
    const displayName = fieldLabels[field] || fieldDisplayNames[field] || field.toUpperCase();
    doc.text(displayName, currentX + 2, startY + 10, {
      width: columnWidths[field] - 4,
      align: 'center',
      lineBreak: false,
      ellipsis: true
    });
    currentX += columnWidths[field];
  });

  // Signature header text
  if (hasSignature) {
    doc.text('SIGN', currentX + 2, startY + 10, {
      width: columnWidths.signature - 4,
      align: 'center'
    });
  }

  return startY + headerHeight;
};

/**
 * Draw a single table row
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} student - Student data object
 * @param {Array} fields - Array of field names
 * @param {Object} columnWidths - Column width mapping
 * @param {Boolean} hasSignature - Whether signature column is included
 * @param {Boolean} hasSlNo - Whether serial number column is included
 * @param {Number} startY - Starting Y position
 * @param {Number} rowNumber - Row number (for SL NO and alternating colors)
 * @returns {Number} Y position after drawing row
 */
const drawTableRow = (doc, student, fields, columnWidths, hasSignature, hasSlNo, startY, rowNumber, useShortNames = false) => {
  const margin = doc.page.margins.left || 40;
  let currentX = margin;
  const rowHeight = 25;

  // Adjust font size based on number of fields - slightly larger for better readability
  const totalFields = fields.length + (hasSignature ? 1 : 0) + (hasSlNo ? 1 : 0);
  const rowFontSize = totalFields > 12 ? 7 : (totalFields > 8 ? 8 : 9);

  // Draw cells with borders
  const fillColor = rowNumber % 2 === 0 ? '#F9FAFB' : 'white';
  doc.lineWidth(0.5);
  doc.strokeColor('#000000');

  // Serial number cell
  if (hasSlNo) {
    doc.rect(currentX, startY, columnWidths.sl_no, rowHeight)
       .fillAndStroke(fillColor, '#000000');
    currentX += columnWidths.sl_no;
  }

  // Field cells
  fields.forEach(field => {
    doc.rect(currentX, startY, columnWidths[field], rowHeight)
       .fillAndStroke(fillColor, '#000000');
    currentX += columnWidths[field];
  });

  // Signature cell
  if (hasSignature) {
    doc.rect(currentX, startY, columnWidths.signature, rowHeight)
       .fillAndStroke(fillColor, '#000000');
  }

  // Draw text content
  currentX = margin;
  doc.fontSize(rowFontSize)
     .font('Helvetica')
     .fillColor('black');

  // Serial number text
  if (hasSlNo) {
    doc.text(String(rowNumber), currentX + 2, startY + 8, {
      width: columnWidths.sl_no - 4,
      align: 'center'
    });
    currentX += columnWidths.sl_no;
  }

  // Field data
  fields.forEach(field => {
    let value = student[field];

    // Format value based on field type
    if (value === null || value === undefined) {
      value = '-';
    } else if (typeof value === 'boolean') {
      value = value ? 'Yes' : 'No';
    } else if (field === 'date_of_birth' && value) {
      value = new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    } else if (field === 'branch' && useShortNames && value) {
      // Use short name if option is enabled
      value = BRANCH_SHORT_NAMES[value] || String(value);
    } else {
      value = String(value);
    }

    value = sanitizeCellText(value) || '-';

    // One row is ONE line — enforced by measuring, not by PDFKit flags:
    // once `ellipsis` is set PDFKit wraps to the cell width even with
    // lineBreak:false, overflowing the fixed row height and bleeding
    // across rows/pages. Truncate manually until the text physically fits.
    const maxTextWidth = columnWidths[field] - 4;
    if (doc.widthOfString(value) > maxTextWidth) {
      let keep = value.length;
      while (keep > 1 && doc.widthOfString(value.slice(0, keep) + '...') > maxTextWidth) {
        keep = Math.floor(keep * 0.9);
      }
      value = value.slice(0, keep).trimEnd() + '...';
    }

    // Determine alignment - center for numeric fields and short branch names
    const shouldCenterAlign = field === 'programme_cgpa' || field.includes('cgpa') ||
                              field === 'age' || field === 'backlog_count' ||
                              (field === 'branch' && useShortNames);

    doc.text(value, currentX + 2, startY + 8, {
      width: columnWidths[field] - 4,
      align: shouldCenterAlign ? 'center' : 'left',
      lineBreak: false
    });
    currentX += columnWidths[field];
  });

  return startY + rowHeight;
};

/**
 * Draw the branch code reference: short code on the left, full branch name on
 * the right, one row per branch used in the export.
 *
 * One column, flowing onto as many pages as it needs.
 *
 * It used to switch to two side-by-side Code/Name pairs past twelve branches,
 * with a hard-coded table width of 750pt. That only fits landscape A4. On a
 * portrait export the page is 595pt wide, so startX came out at -77.5 and the
 * whole table hung off both edges of the paper: the first Code column was
 * entirely off-page and the branch names in it were sliced down their opening
 * letters — "Architecture" printing as "itecture". Nothing clips a PDF; it
 * simply draws where it is told. With thirty-odd branches statewide, most
 * portrait exports carrying short names were affected.
 *
 * Neither did it ever check whether the rows fitted the page height, so a long
 * list ran off the bottom as well.
 *
 * Both faults were the same mistake — assuming the content fits — so the fix is
 * to stop assuming. The table is sized from the actual page, and a row that
 * would cross the bottom margin starts a new page with the header repeated.
 *
 * @param {PDFDocument} doc - PDF document instance
 * @param {Array} uniqueBranches - Unique branch names used in the export
 * @param {String} layout - 'portrait' or 'landscape', matching the pages before it
 * @param {Number} borderMargin - Margin for the page border
 */
export const drawBranchLegend = (doc, uniqueBranches, layout, borderMargin) => {
  if (!uniqueBranches || uniqueBranches.length === 0) return;

  const newLegendPage = () => {
    doc.addPage({
      layout,
      size: 'A4',
      margins: { top: 50, bottom: 50, left: borderMargin, right: borderMargin },
    });
  };

  newLegendPage();

  const sortedBranches = [...uniqueBranches].sort();
  const headerHeight = 30;
  const rowHeight = 25;

  // Sized from the page it is actually on, so it cannot hang off the edge
  // whichever orientation the export used.
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tableWidth = Math.min(450, pageWidth - (borderMargin * 2) - 40);
  const startX = (pageWidth - tableWidth) / 2;
  const codeWidth = Math.min(110, Math.round(tableWidth * 0.25));
  const nameWidth = tableWidth - codeWidth;
  const bottomLimit = pageHeight - borderMargin - 30; // leaves room for the page number

  const drawHeader = (y) => {
    doc.lineWidth(1).strokeColor('#000000');
    doc.rect(startX, y, codeWidth, headerHeight).fillAndStroke('#4B5563', '#000000');
    doc.rect(startX + codeWidth, y, nameWidth, headerHeight).fillAndStroke('#4B5563', '#000000');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
    doc.text('Code', startX + 2, y + 10, { width: codeWidth - 4, align: 'center' });
    doc.text('Branch Name', startX + codeWidth + 2, y + 10, { width: nameWidth - 4, align: 'center' });
    return y + headerHeight;
  };

  const drawTitle = (y, continued) => {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('black')
       .text(continued ? 'BRANCH CODE REFERENCE (continued)' : 'BRANCH CODE REFERENCE', 0, y, {
         width: pageWidth,
         align: 'center',
       });
    return y + 35;
  };

  let currentY = drawHeader(drawTitle(65, false));

  sortedBranches.forEach((branch, index) => {
    // A row that would cross the bottom margin starts the next page instead of
    // being drawn past the edge of the paper.
    if (currentY + rowHeight > bottomLimit) {
      newLegendPage();
      currentY = drawHeader(drawTitle(65, true));
    }

    const shortName = BRANCH_SHORT_NAMES[branch] || branch;
    const fillColor = index % 2 === 0 ? '#F9FAFB' : 'white';

    doc.lineWidth(0.5).strokeColor('#000000');
    doc.rect(startX, currentY, codeWidth, rowHeight).fillAndStroke(fillColor, '#000000');
    doc.rect(startX + codeWidth, currentY, nameWidth, rowHeight).fillAndStroke(fillColor, '#000000');

    doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
    doc.text(shortName, startX + 2, currentY + 8, { width: codeWidth - 4, align: 'center' });

    doc.font('Helvetica');
    doc.text(branch, startX + codeWidth + 6, currentY + 8, {
      width: nameWidth - 12,
      align: 'left',
      // One line per row: the row height is fixed, so a name long enough to
      // wrap would otherwise print over the row beneath it.
      lineBreak: false,
      ellipsis: true,
    });

    currentY += rowHeight;
  });

  // Note: Border will be added by the main function's page loop
  // No need to draw border here to avoid duplication
};

/**
 * Main function to generate student PDF
 * @param {Array} students - Array of student objects
 * @param {Object} options - PDF generation options
 * @param {Response} res - Express response object
 */
export const generateStudentPDF = async (students, options, res) => {
  const buffers = [];
  let doc;

  try {
    const {
      selectedFields,
      /*
       * Labels for keys the map below does not know: a job's own custom
       * questions, whose names differ from one job to the next and so cannot
       * be listed here. Without this a column headed "10th Maths %" would
       * print as CUSTOM_10TH_MATHS, which is the fallback for an unknown key.
       */
      fieldLabels = {},
      collegeName,
      companyName,
      driveDate,
      headerLine1,
      headerLine2,
      includeSignature = false,
      separateColleges = false,
      useShortNames = false
    } = options;

    // Validate students data
    if (!students || students.length === 0) {
      throw new Error('No students data to export');
    }

    console.log(`Generating PDF for ${students.length} students with ${selectedFields?.length || 'default'} fields`);

    // Use selected fields or default fields
    const fields = selectedFields && selectedFields.length > 0
      ? selectedFields
      : DEFAULT_FIELDS;

    // Determine orientation based on field count
    // Portrait: <= 5 fields, Landscape: > 5 fields
    const totalColumns = fields.length + (includeSignature ? 1 : 0) + 1; // +1 for SL NO
    const layout = totalColumns <= 6 ? 'portrait' : 'landscape';

    console.log(`Using ${layout} orientation for ${totalColumns} total columns`);

    // Create PDF document with dynamic orientation
    doc = new PDFDocument({
      size: 'A4',
      layout: layout,
      margins: {
        top: 50,
        bottom: 50,
        left: layout === 'portrait' ? 40 : 50,
        right: layout === 'portrait' ? 40 : 50
      },
      bufferPages: true,
      autoFirstPage: true
    });

    // Buffer the PDF in memory instead of streaming directly
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log(`PDF generated successfully. Size: ${pdfData.length} bytes`);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=students-export-${Date.now()}.pdf`
      );

      // Send the complete PDF
      res.send(pdfData);
    });

    // Page dimensions
    const margin = layout === 'portrait' ? 40 : 50;
    const pageWidth = doc.page.width - (2 * margin);

    // Calculate column widths based on actual content
    const hasSlNo = true;
    const columnWidths = calculateColumnWidths(fields, pageWidth, includeSignature, hasSlNo, useShortNames, students, fieldLabels);

    // Validate column widths don't exceed page width
    const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
    if (totalWidth > pageWidth + 10) { // +10 tolerance
      console.warn(`Warning: Table width (${totalWidth}) exceeds page width (${pageWidth})`);
    } else {
      console.log(`Table width (${Math.round(totalWidth)}) fits within page width (${Math.round(pageWidth)})`);
    }

    // Draw header
    let currentY;
    if (headerLine1) {
      // Cadence style: draw title/subtitle as bordered merged table rows
      const startY = 65;

      // Title row (Line 1) — bold, larger font
      const titleRowHeight = 36;
      doc.rect(margin, startY, totalWidth, titleRowHeight)
         .fillAndStroke('#FFFFFF', '#000000');
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(headerLine1, margin, startY + 11, {
           width: totalWidth,
           align: 'center',
           lineBreak: false
         });
      currentY = startY + titleRowHeight;

      if (headerLine2) {
        // Subtitle row (Line 2)
        const subtitleRowHeight = 26;
        doc.rect(margin, currentY, totalWidth, subtitleRowHeight)
           .fillAndStroke('#FFFFFF', '#000000');
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(headerLine2, margin, currentY + 8, {
             width: totalWidth,
             align: 'center',
             lineBreak: false
           });
        currentY = currentY + subtitleRowHeight;
      }
    } else {
      // Legacy path: plain-text header above table
      currentY = drawHeader(doc, {
        collegeName: separateColleges ? null : collegeName,
        companyName,
        driveDate,
        headerLine1,
        headerLine2,
      });
    }

    // Draw table headers only if not separating colleges
    // (If separating colleges, headers will be drawn for each college section)
    if (!separateColleges) {
      currentY = drawTableHeaders(doc, fields, columnWidths, includeSignature, hasSlNo, currentY, fieldLabels);
    }

    // Track page and row number
    let rowNumber = 1;
    let currentCollege = null;
    const maxY = doc.page.height - 80; // Leave space for page number

    // Draw student rows
    students.forEach((student, index) => {
      // Check if college has changed (for separate colleges feature).
      // Fall back to the export-wide college name (or a generic banner) so
      // the first page always gets its section banner + table headers even
      // when college_name is missing from the row data.
      const studentCollege = separateColleges
        ? (student.college_name || collegeName || 'STUDENT LIST')
        : null;
      if (separateColleges && studentCollege !== currentCollege) {
        // Start new page for new college (except for first college)
        if (currentCollege !== null) {
          doc.addPage();
          currentY = 50;
        }

        currentCollege = studentCollege;

        // Calculate table width
        const tableWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
        const margin = doc.page.margins.left || (layout === 'portrait' ? 40 : 50);

        // Draw college name as merged table row
        currentY = drawCollegeRow(doc, currentCollege, tableWidth, margin, currentY);

        // Draw table headers for this college section
        currentY = drawTableHeaders(doc, fields, columnWidths, includeSignature, hasSlNo, currentY, fieldLabels);
      }

      // Check if we need a new page due to space
      if (currentY + 25 > maxY) {
        // New page
        doc.addPage();

        // Only draw table headers on new pages (no college header)
        currentY = 50; // Start from top margin
        currentY = drawTableHeaders(doc, fields, columnWidths, includeSignature, hasSlNo, currentY, fieldLabels);
      }

      // Draw row
      currentY = drawTableRow(
        doc,
        student,
        fields,
        columnWidths,
        includeSignature,
        hasSlNo,
        currentY,
        rowNumber,
        useShortNames
      );

      rowNumber++;
    });

    // Add branch legend if using short names
    if (useShortNames && fields.includes('branch')) {
      // Extract unique branches from students
      const uniqueBranches = [...new Set(students.map(s => s.branch).filter(Boolean))];

      if (uniqueBranches.length > 0) {
        console.log(`Adding branch legend for ${uniqueBranches.length} unique branches`);
        const borderMargin = layout === 'portrait' ? 40 : 50;
        drawBranchLegend(doc, uniqueBranches, layout, borderMargin);
      }
    }

    // Add page numbers to all pages at the end
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;

    console.log(`Drawing complete. Generated ${totalPages} page(s)`);

    // Add page numbers and black borders to all pages without creating new pages
    const fullPageWidth = doc.page.width;
    const fullPageHeight = doc.page.height;
    const borderMargin = layout === 'portrait' ? 40 : 50;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Add black border around page
      doc.save();
      doc.strokeColor('#000000')
         .lineWidth(2)
         .rect(borderMargin, 50, fullPageWidth - (2 * borderMargin), fullPageHeight - 100)
         .stroke();
      doc.restore();

      // Add page number
      const pageText = String(i + 1);

      // Calculate text position
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageText);
      const xPosition = (fullPageWidth - textWidth) / 2;
      const yPosition = fullPageHeight - 25;

      // Add text without triggering new page creation
      doc.fillColor('#666666')
         .text(pageText, xPosition, yPosition, {
           lineBreak: false,
           continued: false
         });
    }

    console.log(`Page numbers and borders added to all ${totalPages} pages`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error.stack);

    // End the document if it was created
    if (doc) {
      try {
        doc.end();
      } catch (endError) {
        console.error('Error ending PDF document:', endError);
      }
    }

    // Send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating PDF',
        error: error.message
      });
    }
  }
};

/**
 * Generate Activity Logs PDF
 * @param {Array} logs - Array of activity log objects
 * @param {Object} options - PDF generation options
 * @param {Response} res - Express response object
 */
export const generateActivityLogsPDF = async (logs, options, res) => {
  const buffers = [];
  let doc;

  try {
    // Validate logs data
    if (!logs || logs.length === 0) {
      throw new Error('No activity logs data to export');
    }

    console.log(`Generating PDF for ${logs.length} activity logs`);

    // Create PDF document in landscape for better column width
    doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      bufferPages: true,
      autoFirstPage: true
    });

    // Buffer the PDF in memory
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log(`Activity Logs PDF generated successfully. Size: ${pdfData.length} bytes`);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=activity-logs-${Date.now()}.pdf`
      );

      // Send the complete PDF
      res.send(pdfData);
    });

    // Page dimensions
    const margin = 50;
    const pageWidth = doc.page.width - (2 * margin);
    const pageHeight = doc.page.height;

    // Column definitions for activity logs
    const columns = [
      { key: 'sl_no', label: 'SL NO', align: 'center' },
      { key: 'created_at', label: 'Timestamp', align: 'left' },
      { key: 'user_info', label: 'User Info', align: 'left' },
      { key: 'user_role', label: 'User Role', align: 'left' },
      { key: 'action_type', label: 'Action Type', align: 'left' }
    ];

    const ROW_FONT = 7;
    const HEADER_FONT = 8;

    const cellText = (col, log, rowNumber) => {
      let value;
      if (col.key === 'sl_no') {
        value = String(rowNumber);
      } else if (col.key === 'created_at') {
        value = log[col.key] ? new Date(log[col.key]).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';
      } else if (col.key === 'user_info') {
        // Display email or phone number
        value = log.user_email || log.user_phone || '-';
      } else if (col.key === 'user_role') {
        // Format role nicely
        const roleMap = {
          'super_admin': 'Super Admin',
          'placement_officer': 'Placement Officer',
          'student': 'Student'
        };
        value = roleMap[log[col.key]] || log[col.key] || '-';
      } else {
        value = log[col.key] || '-';
      }
      return sanitizeCellText(value) || '-';
    };

    // The old hardcoded widths totalled 760pt against 741.89pt of usable
    // page, so the table ran past the right margin. Measure instead.
    const columnWidths = fitTableColumns(doc, columns, logs, pageWidth, {
      rowFont: ROW_FONT,
      headerFont: HEADER_FONT,
      getValue: cellText,
    });

    const headerLabels = columns.map((col, i) => {
      doc.font('Helvetica-Bold').fontSize(HEADER_FONT);
      return wrapToWidth(doc, col.label, columnWidths[i] - 4, 2);
    });

    // Draw header
    let currentY = 50;
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('ACTIVITY LOGS REPORT', 0, currentY, {
         width: doc.page.width,
         align: 'center'
       });
    currentY += 30;

    // Add generation timestamp
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('gray')
       .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 0, currentY, {
         width: doc.page.width,
         align: 'center'
       });
    currentY += 25;

    // Draw table headers
    const headerHeight = HEADER_FONT * 2 + 10;
    const headerLineHeight = HEADER_FONT + 2;

    const drawTableHead = (startY) => {
      let x = margin;
      doc.lineWidth(1).strokeColor('#000000');
      columns.forEach((col, i) => {
        doc.rect(x, startY, columnWidths[i], headerHeight)
           .fillAndStroke('#4B5563', '#000000');
        x += columnWidths[i];
      });

      x = margin;
      doc.fontSize(HEADER_FONT).font('Helvetica-Bold').fillColor('white');
      columns.forEach((col, i) => {
        const lines = headerLabels[i];
        const textY = startY + (headerHeight - lines.length * headerLineHeight) / 2;
        lines.forEach((line, n) => {
          doc.text(line, x + 2, textY + n * headerLineHeight, {
            width: columnWidths[i] - 4,
            align: 'center',
            lineBreak: false
          });
        });
        x += columnWidths[i];
      });

      return startY + headerHeight;
    };

    currentY = drawTableHead(currentY);

    // Track row number and max Y
    let rowNumber = 1;
    const maxY = pageHeight - 80;
    const rowHeight = 25;

    // Draw log rows
    logs.forEach((log) => {
      // Check if we need a new page
      if (currentY + rowHeight > maxY) {
        doc.addPage();
        currentY = drawTableHead(50);
      }

      // Draw row cells
      const fillColor = rowNumber % 2 === 0 ? '#F9FAFB' : 'white';
      doc.lineWidth(0.5);
      doc.strokeColor('#000000');

      let currentX = margin;
      columns.forEach((col, i) => {
        doc.rect(currentX, currentY, columnWidths[i], rowHeight)
           .fillAndStroke(fillColor, '#000000');
        currentX += columnWidths[i];
      });

      // Draw text content
      currentX = margin;
      doc.fontSize(ROW_FONT)
         .font('Helvetica')
         .fillColor('black');

      columns.forEach((col, i) => {
        const value = truncateToWidth(
          doc,
          cellText(col, log, rowNumber),
          columnWidths[i] - 4
        );

        doc.text(value, currentX + 2, currentY + (rowHeight - ROW_FONT) / 2, {
          width: columnWidths[i] - 4,
          align: col.align,
          lineBreak: false
        });
        currentX += columnWidths[i];
      });

      currentY += rowHeight;
      rowNumber++;
    });

    // Add page numbers
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    console.log(`Drawing complete. Generated ${totalPages} page(s)`);

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const pageText = String(i + 1);
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageText);
      const xPosition = (doc.page.width - textWidth) / 2;
      const yPosition = doc.page.height - 40;

      doc.fillColor('gray')
         .text(pageText, xPosition, yPosition, {
           lineBreak: false,
           continued: false
         });
    }

    console.log(`Page numbers added to all ${totalPages} pages`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Activity Logs PDF generation error:', error);
    console.error('Error stack:', error.stack);

    if (doc) {
      try {
        doc.end();
      } catch (endError) {
        console.error('Error ending PDF document:', endError);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating Activity Logs PDF',
        error: error.message
      });
    }
  }
};

/**
 * Generate PRN Range Students PDF
 * @param {Array} students - Array of student objects
 * @param {Object} options - PDF generation options
 * @param {Response} res - Express response object
 */
export const generatePRNRangeStudentsPDF = async (students, options, res) => {
  const buffers = [];
  let doc;

  try {
    const { rangeInfo } = options;

    // Validate students data
    if (!students || students.length === 0) {
      throw new Error('No students data to export');
    }

    console.log(`Generating PRN Range PDF for ${students.length} students`);

    // Create PDF document in landscape for better column width
    doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      bufferPages: true,
      autoFirstPage: true
    });

    // Buffer the PDF in memory
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log(`PRN Range PDF generated successfully. Size: ${pdfData.length} bytes`);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=prn-range-students-${Date.now()}.pdf`
      );

      // Send the complete PDF
      res.send(pdfData);
    });

    // Page dimensions
    const margin = 50;
    const pageWidth = doc.page.width - (2 * margin);
    const pageHeight = doc.page.height;

    // Columns shown in the PDF. Driving Licence, PAN, Registration Status and
    // Blacklisted are deliberately NOT here: they were the columns falling off
    // the right edge, and dropping them buys the remaining 13 a larger 7.5pt
    // face on ordinary A4. All four are still in the Excel export, which has
    // no page width to run out of.
    const columns = [
      { key: 'sl_no', label: 'SL NO', align: 'center' },
      { key: 'prn', label: 'PRN', align: 'left' },
      { key: 'name', label: 'Student Name', align: 'left' },
      { key: 'email', label: 'Email', align: 'left' },
      { key: 'mobile_number', label: 'Mobile', align: 'left' },
      { key: 'date_of_birth', label: 'DOB', align: 'left' },
      { key: 'age', label: 'Age', align: 'center' },
      { key: 'gender', label: 'Gender', align: 'left' },
      { key: 'college_name', label: 'College', align: 'left' },
      { key: 'region_name', label: 'Region', align: 'left' },
      { key: 'branch', label: 'Branch', align: 'left' },
      { key: 'programme_cgpa', label: 'CGPA', align: 'center' },
      { key: 'backlog_count', label: 'Backlogs', align: 'center' }
    ];

    const ROW_FONT = 7.5;
    const HEADER_FONT = 8;

    // Every cell holds ONE line of WinAnsi-safe text
    const cellText = (col, student, rowNumber) => {
      let value;
      if (col.key === 'sl_no') {
        value = String(rowNumber);
      } else if (col.key === 'date_of_birth') {
        value = student[col.key]
          ? new Date(student[col.key]).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
          : '-';
      } else {
        value = student[col.key] !== null && student[col.key] !== undefined
          ? String(student[col.key])
          : '-';
      }
      return sanitizeCellText(value) || '-';
    };

    // Measure the real data instead of guessing: widths always total the
    // usable width, so no column can be pushed off the page.
    const columnWidths = fitTableColumns(doc, columns, students, pageWidth, {
      rowFont: ROW_FONT,
      headerFont: HEADER_FONT,
      getValue: cellText,
    });

    const headerLabels = columns.map((col, i) => {
      doc.font('Helvetica-Bold').fontSize(HEADER_FONT);
      return wrapToWidth(doc, col.label, columnWidths[i] - 4, 2);
    });

    // Draw header
    let currentY = 50;
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('PRN RANGE STUDENTS REPORT', 0, currentY, {
         width: doc.page.width,
         align: 'center'
       });
    currentY += 25;

    // Add range info if provided
    if (rangeInfo) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('gray')
         .text(rangeInfo, 0, currentY, {
           width: doc.page.width,
           align: 'center'
         });
      currentY += 20;
    }

    // Add generation timestamp
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('gray')
       .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 0, currentY, {
         width: doc.page.width,
         align: 'center'
       });
    currentY += 20;

    // Draw table headers
    const headerHeight = HEADER_FONT * 2 + 10;
    const headerLineHeight = HEADER_FONT + 2;

    const drawTableHead = (startY) => {
      let x = margin;
      doc.lineWidth(1).strokeColor('#000000');
      columns.forEach((col, i) => {
        doc.rect(x, startY, columnWidths[i], headerHeight)
           .fillAndStroke('#4472C4', '#000000');
        x += columnWidths[i];
      });

      x = margin;
      doc.fontSize(HEADER_FONT).font('Helvetica-Bold').fillColor('white');
      columns.forEach((col, i) => {
        const lines = headerLabels[i];
        const textY = startY + (headerHeight - lines.length * headerLineHeight) / 2;
        lines.forEach((line, n) => {
          doc.text(line, x + 2, textY + n * headerLineHeight, {
            width: columnWidths[i] - 4,
            align: 'center',
            lineBreak: false
          });
        });
        x += columnWidths[i];
      });

      return startY + headerHeight;
    };

    currentY = drawTableHead(currentY);

    // Track row number and max Y
    let rowNumber = 1;
    const maxY = pageHeight - 80;
    const rowHeight = 18;

    // Draw student rows
    students.forEach((student) => {
      // Check if we need a new page
      if (currentY + rowHeight > maxY) {
        doc.addPage();
        currentY = drawTableHead(50);
      }

      // Draw row cells
      const fillColor = rowNumber % 2 === 0 ? '#F9FAFB' : 'white';
      doc.lineWidth(0.5);
      doc.strokeColor('#000000');

      let currentX = margin;
      columns.forEach((col, i) => {
        doc.rect(currentX, currentY, columnWidths[i], rowHeight)
           .fillAndStroke(fillColor, '#000000');
        currentX += columnWidths[i];
      });

      // Draw text content
      currentX = margin;
      doc.fontSize(ROW_FONT)
         .font('Helvetica')
         .fillColor('black');

      columns.forEach((col, i) => {
        const value = truncateToWidth(
          doc,
          cellText(col, student, rowNumber),
          columnWidths[i] - 4
        );

        doc.text(value, currentX + 2, currentY + (rowHeight - ROW_FONT) / 2, {
          width: columnWidths[i] - 4,
          align: col.align,
          lineBreak: false
        });
        currentX += columnWidths[i];
      });

      currentY += rowHeight;
      rowNumber++;
    });

    // Add page numbers
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    console.log(`Drawing complete. Generated ${totalPages} page(s)`);

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const pageText = String(i + 1);
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageText);
      const xPosition = (doc.page.width - textWidth) / 2;
      const yPosition = doc.page.height - 40;

      doc.fillColor('gray')
         .text(pageText, xPosition, yPosition, {
           lineBreak: false,
           continued: false
         });
    }

    console.log(`Page numbers added to all ${totalPages} pages`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PRN Range PDF generation error:', error);
    console.error('Error stack:', error.stack);

    if (doc) {
      try {
        doc.end();
      } catch (endError) {
        console.error('Error ending PDF document:', endError);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating PRN Range PDF',
        error: error.message
      });
    }
  }
};

/**
 * Generate Job Applicants PDF
 * @param {Array} applicants - Array of applicant objects
 * @param {Object} options - PDF generation options
 * @param {Response} res - Express response object
 */
/**
 * Simple, clean PDF for eligible-but-not-applied students.
 * Columns: Sl No | PRN | Name | College | Region | Branch | CGPA
 */
export const generateEligibleNotAppliedPDF = async (students, options, res) => {
  const buffers = [];
  let doc;
  try {
    const { jobTitle = 'Job', companyName = '' } = options;

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 30;
    const CONTENT_W = PAGE_W - MARGIN * 2; // 535pt

    // Column definitions — widths sum to 535pt
    // Region is stripped to short form (CENTRAL, NORTH, etc.) so 58pt is enough
    const cols = [
      { key: 'sl_no',          label: 'Sl No',   w: 28,  align: 'center' },
      { key: 'prn',            label: 'PRN',     w: 78,  align: 'left'   },
      { key: 'student_name',   label: 'Name',    w: 135, align: 'left'   },
      { key: 'college_name',   label: 'College', w: 145, align: 'left'   },
      { key: 'region_name',    label: 'Region',  w: 72,  align: 'left'   },
      { key: 'branch',         label: 'Branch',  w: 42,  align: 'center' },
      { key: 'programme_cgpa', label: 'CGPA',    w: 35,  align: 'center' },
    ];

    const ROW_H        = 18;
    const TH_H         = 22;
    const DARK_BLUE    = '#1e3a8a';
    const MID_BLUE     = '#1e40af';
    const ALT_ROW      = '#f0f4ff';
    const TEXT_DARK    = '#1f2937';
    const TEXT_GRAY    = '#6b7280';
    const BORDER_COLOR = '#cbd5e1';

    doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      autoFirstPage: true,
    });

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      const fname = `eligible_not_applied_${(jobTitle).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}_${Date.now()}.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename=${fname}`);
      res.send(pdfData);
    });

    // ── helpers ───────────────────────────────────────────────────
    const drawPageHeader = (isFirstPage) => {
      let y = MARGIN;
      if (isFirstPage) {
        doc.rect(MARGIN, y, CONTENT_W, 26).fill(DARK_BLUE);
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
          .text('ELIGIBLE STUDENTS — NOT YET APPLIED', MARGIN, y + 7, { width: CONTENT_W, align: 'center' });
        y += 28;

        doc.fillColor(MID_BLUE).fontSize(10).font('Helvetica-Bold')
          .text(`${jobTitle}  ·  ${companyName}`, MARGIN, y + 2, { width: CONTENT_W, align: 'center' });
        y += 16;

        const genDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        doc.fillColor(TEXT_GRAY).fontSize(8).font('Helvetica')
          .text(`Total eligible (not yet applied): ${students.length}   |   Generated: ${genDate}`, MARGIN, y, { width: CONTENT_W, align: 'center' });
        y += 14;

        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
        y += 8;
      } else {
        doc.fillColor(TEXT_GRAY).fontSize(8).font('Helvetica-Oblique')
          .text(`${jobTitle} — Eligible students (continued)`, MARGIN, y + 4, { width: CONTENT_W });
        y += 18;
      }
      return y;
    };

    const drawTableHeader = (y) => {
      let x = MARGIN;
      cols.forEach(col => {
        doc.rect(x, y, col.w, TH_H).fill(MID_BLUE);
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
          .text(col.label, x + 4, y + (TH_H - 7.5) / 2 + 1, { width: col.w - 8, lineBreak: false, align: col.align });
        x += col.w;
      });
      // outer right border
      doc.moveTo(x, y).lineTo(x, y + TH_H).lineWidth(0.4).strokeColor(BORDER_COLOR).stroke();
      return y + TH_H;
    };

    // ── render ────────────────────────────────────────────────────
    let y = drawPageHeader(true);
    y = drawTableHeader(y);

    const bottomLimit = PAGE_H - MARGIN;

    students.forEach((student, idx) => {
      if (y + ROW_H > bottomLimit) {
        doc.addPage();
        y = drawPageHeader(false);
        y = drawTableHeader(y);
      }

      // alternating row background
      if (idx % 2 === 1) {
        doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(ALT_ROW);
      }

      const branchShort = BRANCH_SHORT_NAMES[student.branch] || student.branch || '-';
      const values = {
        sl_no:          String(idx + 1),
        prn:            student.prn || '-',
        student_name:   student.student_name || student.name || '-',
        college_name:   student.college_name || '-',
        region_name:    student.region_name
          ? student.region_name.replace(/\s*REGION\s*$/i, '').trim() || '-'
          : '-',
        branch:         branchShort,
        programme_cgpa: student.programme_cgpa != null
          ? parseFloat(student.programme_cgpa).toFixed(2) : '-',
      };

      let x = MARGIN;
      cols.forEach(col => {
        const cellText = String(values[col.key] ?? '-');
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica')
          .text(cellText, x + 4, y + (ROW_H - 7.5) / 2 + 1, {
            width: col.w - 8,
            lineBreak: false,
            align: col.align,
          });
        // right column border
        doc.moveTo(x + col.w, y).lineTo(x + col.w, y + ROW_H)
          .lineWidth(0.3).strokeColor(BORDER_COLOR).stroke();
        x += col.w;
      });

      // left outer border + row bottom border
      doc.moveTo(MARGIN, y).lineTo(MARGIN, y + ROW_H).lineWidth(0.3).strokeColor(BORDER_COLOR).stroke();
      doc.moveTo(MARGIN, y + ROW_H).lineTo(MARGIN + CONTENT_W, y + ROW_H)
        .lineWidth(0.3).strokeColor(BORDER_COLOR).stroke();

      y += ROW_H;
    });

    // footer
    y += 10;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
    doc.fillColor(TEXT_GRAY).fontSize(7).font('Helvetica-Oblique')
      .text('State Placement Cell — Kerala Polytechnics', MARGIN, y + 4, { width: CONTENT_W, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('generateEligibleNotAppliedPDF error:', err);
    if (doc && !res.headersSent) doc.end();
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

export const generateJobApplicantsPDF = async (applicants, options, res) => {
  const buffers = [];
  let doc;

  try {
    const { jobTitle, companyName, isSuperAdmin = false, useShortNames = false } = options;

    // Validate applicants data
    if (!applicants || applicants.length === 0) {
      throw new Error('No applicants data to export');
    }

    console.log(`\n========================================`);
    console.log(`Generating Job Applicants PDF for ${applicants.length} applicants`);
    console.log(`========================================`);
    console.log('First applicant data:');
    console.log('  PRN:', applicants[0].prn);
    console.log('  Name:', applicants[0].name);
    console.log('  Height:', applicants[0].height_cm);
    console.log('  Weight:', applicants[0].weight_kg);
    console.log('  SSLC:', applicants[0].sslc_marks);
    console.log('  12th:', applicants[0].twelfth_marks);
    console.log('========================================\n');

    // Define all available columns based on role - optimize branch width for short names
    const allColumns = isSuperAdmin ? [
      { key: 'sl_no', label: 'SL NO', width: 25 },
      { key: 'prn', label: 'PRN', width: 60 },
      { key: 'name', label: 'Student Name', width: 80 },
      { key: 'college_name', label: 'College', width: 75 },
      { key: 'region_name', label: 'Region', width: 55 },
      { key: 'branch', label: 'Branch', width: useShortNames ? 35 : 55 },
      { key: 'email', label: 'Email', width: 90 },
      { key: 'mobile_number', label: 'Mobile', width: 55 },
      { key: 'date_of_birth', label: 'DOB', width: 50 },
      { key: 'programme_cgpa', label: 'CGPA', width: 35 },
      { key: 'backlog_count', label: 'Backlogs', width: 38 },
      { key: 'height_cm', label: 'Height', width: 38 },
      { key: 'weight_kg', label: 'Weight', width: 38 },
      { key: 'sslc_marks', label: 'SSLC %', width: 38 },
      { key: 'twelfth_marks', label: '12th %', width: 38 },
      { key: 'applied_date', label: 'Applied', width: 55 }
    ] : [
      { key: 'sl_no', label: 'SL NO', width: 30 },
      { key: 'prn', label: 'PRN', width: 65 },
      { key: 'name', label: 'Student Name', width: 95 },
      { key: 'branch', label: 'Branch', width: useShortNames ? 40 : 70 },
      { key: 'email', label: 'Email', width: 105 },
      { key: 'mobile_number', label: 'Mobile', width: 65 },
      { key: 'date_of_birth', label: 'DOB', width: 55 },
      { key: 'programme_cgpa', label: 'CGPA', width: 40 },
      { key: 'backlog_count', label: 'Backlogs', width: 42 },
      { key: 'height_cm', label: 'Height', width: 42 },
      { key: 'weight_kg', label: 'Weight', width: 42 },
      { key: 'sslc_marks', label: 'SSLC %', width: 42 },
      { key: 'twelfth_marks', label: '12th %', width: 42 },
      { key: 'applied_date', label: 'Applied', width: 60 }
    ];

    // Filter columns based on selected fields (if provided)
    const selectedFieldsList = options.selectedFields || options.pdf_fields;
    let columns;
    if (selectedFieldsList && selectedFieldsList.length > 0) {
      // Always include sl_no, then add selected fields
      const fieldsToInclude = ['sl_no', ...selectedFieldsList];
      columns = allColumns.filter(col => fieldsToInclude.includes(col.key));
    } else {
      // Use all columns if no selection
      columns = allColumns;
    }

    // Determine orientation based on actual column count (including sl_no)
    const totalColumns = columns.length;
    const layout = totalColumns <= 6 ? 'portrait' : 'landscape';

    // Set 25px margins on all sides for job applicants export
    const pageMargin = 25;

    console.log(`Using ${layout} layout for ${totalColumns} columns (${totalColumns - 1} fields + SL NO)`);

    // Create PDF document with dynamic orientation
    doc = new PDFDocument({
      size: 'A4',
      layout: layout,
      margins: {
        top: pageMargin,
        bottom: pageMargin,
        left: pageMargin,
        right: pageMargin
      },
      bufferPages: true,
      autoFirstPage: true
    });

    // Buffer the PDF in memory
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log(`Job Applicants PDF generated successfully. Size: ${pdfData.length} bytes`);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      const filename = `job_applicants_${jobTitle?.replace(/\s+/g, '_') || 'export'}_${Date.now()}.pdf`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}`
      );

      // Send the complete PDF
      res.send(pdfData);
    });

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Calculate total table width
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    // Center the table horizontally
    const startX = (pageWidth - tableWidth) / 2;

    // Draw header (start at 40 for proper spacing from top border at 25)
    let currentY = 40;
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('JOB APPLICANTS REPORT', 0, currentY, {
         width: pageWidth,
         align: 'center'
       });
    currentY += 25;

    // Add job details
    if (companyName || jobTitle) {
      const jobInfo = companyName && jobTitle
        ? `${jobTitle} at ${companyName}`
        : jobTitle || companyName;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('black')
         .text(jobInfo, 0, currentY, {
           width: pageWidth,
           align: 'center'
         });
      currentY += 20;
    }

    // Add generation timestamp and count
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('gray')
       .text(`Total Applicants: ${applicants.length} | Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 0, currentY, {
         width: pageWidth,
         align: 'center'
       });
    currentY += 20;

    // Draw table headers
    let currentX = startX;
    const headerHeight = 30;
    doc.lineWidth(1);
    doc.strokeColor('#000000');

    columns.forEach(col => {
      doc.rect(currentX, currentY, col.width, headerHeight)
         .fillAndStroke('#4472C4', '#000000');
      currentX += col.width;
    });

    // Draw header text
    currentX = startX;
    doc.fontSize(7)
       .font('Helvetica-Bold')
       .fillColor('white');

    columns.forEach(col => {
      doc.text(col.label, currentX + 2, currentY + 10, {
        width: col.width - 4,
        align: 'center',
        lineBreak: false,
        ellipsis: true
      });
      currentX += col.width;
    });

    currentY += headerHeight;

    // Track row number and max Y
    let rowNumber = 1;
    const maxY = pageHeight - 80;
    const rowHeight = 22;

    // Draw applicant rows
    applicants.forEach((applicant) => {
      // Check if we need a new page
      if (currentY + rowHeight > maxY) {
        doc.addPage();
        currentY = 25; // Match top margin

        // Redraw headers on new page
        currentX = startX;
        columns.forEach(col => {
          doc.rect(currentX, currentY, col.width, headerHeight)
             .fillAndStroke('#4472C4', '#000000');
          currentX += col.width;
        });

        currentX = startX;
        doc.fontSize(7)
           .font('Helvetica-Bold')
           .fillColor('white');

        columns.forEach(col => {
          doc.text(col.label, currentX + 2, currentY + 10, {
            width: col.width - 4,
            align: 'center',
            lineBreak: false,
            ellipsis: true
          });
          currentX += col.width;
        });

        currentY += headerHeight;
      }

      // Draw row cells
      const fillColor = rowNumber % 2 === 0 ? '#F9FAFB' : 'white';
      doc.lineWidth(0.5);
      doc.strokeColor('#000000');

      currentX = startX;
      columns.forEach(col => {
        doc.rect(currentX, currentY, col.width, rowHeight)
           .fillAndStroke(fillColor, '#000000');
        currentX += col.width;
      });

      // Draw text content
      currentX = startX;
      doc.fontSize(6.5)
         .font('Helvetica')
         .fillColor('black');

      columns.forEach(col => {
        let value = '';

        if (col.key === 'sl_no') {
          value = String(rowNumber);
        } else if (col.key === 'date_of_birth' || col.key === 'applied_date') {
          value = applicant[col.key] ? new Date(applicant[col.key]).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-';
        } else if (col.key === 'programme_cgpa' || col.key === 'cgpa') {
          value = applicant.programme_cgpa || applicant.cgpa || '-';
        } else if (col.key === 'branch' && useShortNames && applicant[col.key]) {
          // Use short name if option is enabled
          value = BRANCH_SHORT_NAMES[applicant[col.key]] || String(applicant[col.key]);
        } else if (col.key === 'height_cm' || col.key === 'weight_kg' || col.key === 'sslc_marks' || col.key === 'twelfth_marks') {
          // Format numeric fields from extended profiles
          value = (applicant[col.key] !== null && applicant[col.key] !== undefined) ? String(applicant[col.key]) : '-';
        } else {
          value = applicant[col.key] !== null && applicant[col.key] !== undefined ? String(applicant[col.key]) : '-';
        }

        // Center align numeric fields and short branch names
        const align = (col.key === 'sl_no' || col.key === 'programme_cgpa' || col.key === 'cgpa' ||
                       col.key === 'backlog_count' || col.key === 'height_cm' || col.key === 'weight_kg' ||
                       col.key === 'sslc_marks' || col.key === 'twelfth_marks' || (col.key === 'branch' && useShortNames)) ? 'center' : 'left';

        doc.text(value, currentX + 2, currentY + 6, {
          width: col.width - 4,
          align: align,
          lineBreak: false,
          ellipsis: true
        });
        currentX += col.width;
      });

      currentY += rowHeight;
      rowNumber++;
    });

    // Add branch legend if using short names
    if (useShortNames) {
      // Extract unique branches from applicants
      const uniqueBranches = [...new Set(applicants.map(a => a.branch).filter(Boolean))];

      if (uniqueBranches.length > 0) {
        console.log(`Adding branch legend for ${uniqueBranches.length} unique branches`);
        drawBranchLegend(doc, uniqueBranches, layout, pageMargin);
      }
    }

    // Add page numbers and black borders
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    console.log(`Drawing complete. Generated ${totalPages} page(s)`);

    const fullPageWidth = doc.page.width;
    const fullPageHeight = doc.page.height;

    console.log(`Adding borders and page numbers: pageWidth=${fullPageWidth}, pageHeight=${fullPageHeight}, margin=${pageMargin}px, layout=${layout}`);

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Add black border around all pages with 25px margins on all sides
      doc.save();
      doc.strokeColor('#000000')
         .lineWidth(2)
         .rect(pageMargin, pageMargin, fullPageWidth - (2 * pageMargin), fullPageHeight - (2 * pageMargin))
         .stroke();
      doc.restore();

      // Add page number
      const pageText = String(i + 1);
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageText);
      const xPosition = (fullPageWidth - textWidth) / 2;
      const yPosition = fullPageHeight - 15; // 10px from bottom (25px margin - half of font)

      doc.fillColor('#666666')
         .text(pageText, xPosition, yPosition, {
           lineBreak: false,
           continued: false
         });
    }

    console.log(`Page numbers and borders added to all ${totalPages} pages`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Job Applicants PDF generation error:', error);
    console.error('Error stack:', error.stack);

    if (doc) {
      try {
        doc.end();
      } catch (endError) {
        console.error('Error ending PDF document:', endError);
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating Job Applicants PDF',
        error: error.message
      });
    }
  }
};


/**
 * Download image from URL and return as buffer
 * @param {String} url - Image URL
 * @returns {Promise<Buffer|null>} Image buffer or null if failed
 */
/**
 * Draw an image, and carry on if it cannot be drawn.
 *
 * PDFKit reads JPEG and PNG only; anything else throws "Unknown image format"
 * when the page is drawn rather than when the file was uploaded. Uploads are
 * restricted now, but images accepted before that are still in the database,
 * and student photos still come through a picker that offers `image/*`.
 *
 * Unguarded, one bad file takes the whole document down — on the placement
 * poster that means a single student's photo costing their college its poster.
 * Losing one image is a much smaller failure than losing the export.
 *
 * @returns {boolean} whether the image was drawn
 */
const placeImage = (doc, buffer, ...args) => {
  try {
    doc.image(buffer, ...args);
    return true;
  } catch (error) {
    console.error('PDF: skipping an image PDFKit cannot read —', error.message);
    return false;
  }
};

const downloadImage = async (url) => {
  try {
    const https = await import('https');
    const http = await import('http');

    /*
     * Awaited, not just returned. Without the await the promise leaves the
     * function before the catch below can see it, so every rejection here —
     * a 404 on a deleted photo, a dead logo URL, a network blip — escaped to
     * the caller instead of becoming the null this was written to return. The
     * callers treat null as "no image" and carry on; an exception took the
     * whole document down, which is how one missing student photo could cost a
     * college its placement poster.
     */
    return await new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
    return null;
  }
};

/**
 * Draw circular image with colored border for student photo
 * @param {PDFDocument} doc - PDF document
 * @param {String} imgUrl - Image URL to download and draw
 * @param {Number} x - X position
 * @param {Number} y - Y position
 * @param {Number} size - Circle diameter
 * @param {String} borderColor - Hex color for border
 */
const drawCircularImageWithBorder = async (doc, imgUrl, x, y, size, borderColor) => {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  try {
    let imageBuffer = null;

    // Download image from URL
    if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim() !== '') {
      imageBuffer = await downloadImage(imgUrl);
    }

    if (imageBuffer) {
      // Save graphics state
      doc.save();

      // Create circular clipping path for image
      doc.circle(centerX, centerY, radius - 3).clip();

      /*
       * Through placeImage so the restore below always runs. When doc.image
       * threw here it skipped the restore, which left the circular clip in
       * force: the catch below drew its fallback, and everything else on the
       * page after it, clipped to one small circle. The page came out mostly
       * blank with nothing in the logs to connect it to a photo.
       */
      const drawn = placeImage(doc, imageBuffer, x, y, {
        width: size, height: size, fit: [size, size], align: 'center', valign: 'center',
      });

      // Restore graphics state
      doc.restore();

      // An unreadable photo falls back to the same placeholder as a missing one
      if (!drawn) {
        doc.fillColor('#991b1e');
        doc.circle(centerX, centerY, radius).fill();
      }

      // Draw colored border around circle
      doc.lineWidth(11);
      doc.strokeColor(borderColor);
      doc.circle(centerX, centerY, radius + 3).stroke();
    } else {
      // Fallback: Draw colored circle placeholder
      doc.fillColor('#991b1e');
      doc.circle(centerX, centerY, radius).fill();

      // Draw border
      doc.lineWidth(11);
      doc.strokeColor(borderColor);
      doc.circle(centerX, centerY, radius + 3).stroke();
    }

  } catch (error) {
    console.error(`Error drawing circular image: ${error.message}`);

    // Fallback: Draw colored circle placeholder
    doc.fillColor('#991b1e');
    doc.circle(centerX, centerY, radius).fill();

    // Draw border
    doc.lineWidth(11);
    doc.strokeColor(borderColor);
    doc.circle(centerX, centerY, radius + 3).stroke();
  }
};

/**
 * Draw company name text with proper wrapping
 * @param {PDFDocument} doc - PDF document
 * @param {String} companyName - Company name (may include LPA)
 * @param {Number} x - Center X position
 * @param {Number} y - Y position
 * @param {Number} maxWidth - Maximum width
 */
const drawCompanyName = (doc, companyName, x, y, maxWidth) => {
  doc.fontSize(11);
  doc.font('Helvetica-Bold');
  doc.fillColor('#333333');

  const textWidth = doc.widthOfString(companyName);

  if (textWidth <= maxWidth) {
    // Text fits in one line - center it
    doc.text(companyName, x - (textWidth / 2), y, {
      width: maxWidth,
      align: 'center',
      lineBreak: false
    });
  } else {
    // Text needs wrapping
    doc.text(companyName, x - (maxWidth / 2), y, {
      width: maxWidth,
      align: 'center',
      lineBreak: true
    });
  }
};

/**
 * Draw college name with text wrapping
 * @param {PDFDocument} doc - PDF document
 * @param {String} collegeName - College name
 * @param {Number} x - Center X position
 * @param {Number} y - Y position
 * @param {Number} maxWidth - Maximum width
 */
const drawCollegeName = (doc, collegeName, x, y, maxWidth) => {
  doc.fontSize(18);
  doc.font('Helvetica-Bold');
  doc.fillColor('#FFFFFF');

  const textWidth = doc.widthOfString(collegeName.toUpperCase());

  if (textWidth <= maxWidth) {
    doc.text(collegeName.toUpperCase(), x - (textWidth / 2), y, {
      width: maxWidth,
      align: 'center',
      lineBreak: false
    });
  } else {
    doc.text(collegeName.toUpperCase(), x - (maxWidth / 2), y, {
      width: maxWidth,
      align: 'center',
      lineBreak: true
    });
  }
};

/**
 * Calculate academic year from calendar year
 * Academic year format: YYYY-YY (e.g., 2025-26)
 * Logic: 2026 placements → 2025-26, 2027 placements → 2026-27
 * @param {Number} year - Calendar year
 * @returns {String} Academic year (e.g., "2025-26")
 */
const calculateAcademicYear = (year) => {
  if (!year) {
    const currentYear = new Date().getFullYear();
    return `${currentYear - 1}-${String(currentYear).slice(-2)}`;
  }

  const academicYearStart = year - 1;
  const academicYearEnd = String(year).slice(-2);
  return `${academicYearStart}-${academicYearEnd}`;
};

/**
 * Draw Excel-type student mapping table after poster pages
 * Lists students in order with detailed information in tabular format
 * @param {PDFDocument} doc - PDF document
 * @param {Array} placements - Array of placement objects grouped by company
 * @param {String} collegeName - College name (shown only on first page)
 * @param {Number} currentYear - Current year for year calculation
 */
const drawExcelTypeMappingTable = (doc, placements, collegeName, currentYear) => {
  console.log(`📋 [EXCEL MAPPING] Generating Excel-type table for ${placements.length} students`);

  // Group students by company and LPA
  const groupedByCompany = {};
  placements.forEach(student => {
    const key = `${student.company_name}|${student.lpa}`;
    if (!groupedByCompany[key]) {
      groupedByCompany[key] = {
        company: student.company_name,
        lpa: parseFloat(student.lpa) || 0,
        location: student.placement_location || '',
        students: []
      };
    }
    groupedByCompany[key].students.push(student);
  });

  // Sort by LPA descending
  const sortedCompanies = Object.values(groupedByCompany).sort((a, b) => b.lpa - a.lpa);

  // Add new page for Excel-type mapping with explicit margin reset
  // This ensures the new page has zero margins regardless of previous page state
  doc.addPage({
    size: 'A4',
    margin: 0
  });

  // Save current graphics state and reset to defaults for Excel table
  doc.save();
  doc.lineWidth(1);
  doc.fillColor('#000000');
  doc.strokeColor('#000000');

  const pageWidth = 595;
  const pageHeight = 842;

  // Manual margins for Excel table pages (matching poster left/right margins)
  const leftMargin = 40;
  const rightMargin = 12;
  const topMargin = 30;
  const bottomMargin = 12;

  // Available width for the table
  const availableWidth = pageWidth - leftMargin - rightMargin; // 543px

  // Add padding inside the border so content doesn't touch it
  const innerPadding = 15;
  let currentY = topMargin + innerPadding; // Start at 30 + 15 = 45px from top

  console.log(`📊 [EXCEL TABLE] Page size: ${pageWidth}x${pageHeight}, Margins: T=${topMargin} B=${bottomMargin} L=${leftMargin} R=${rightMargin}`);
  console.log(`📊 [EXCEL TABLE] Starting Y position with padding: ${currentY}`);

  // Draw BLACK border to create visible margin frame
  doc.strokeColor('#000000')
     .lineWidth(1.5)
     .rect(leftMargin, topMargin, pageWidth - leftMargin - rightMargin, pageHeight - topMargin - bottomMargin)
     .stroke();

  console.log(`📊 [EXCEL TABLE] Drew black margin border`);

  // Column definitions for Excel-type table - optimized to fit within margins
  // Total available: 543px, using ~481px
  const columns = [
    { key: 'sl', label: 'No.', width: 25 },
    { key: 'name', label: 'NAME', width: 85 },
    { key: 'gender', label: 'GENDER', width: 45 },
    { key: 'prn', label: 'PRN', width: 65 },
    { key: 'branch', label: 'BRANCH', width: 48 },
    { key: 'year', label: 'YEAR', width: 38 },
    { key: 'phone', label: 'PHONE', width: 65 },
    { key: 'email', label: 'EMAIL', width: 110 } // Increased for long emails
  ];

  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0); // Should be 481px

  // Center the table horizontally within the margin frame
  const startX = leftMargin + (availableWidth - tableWidth) / 2;

  console.log(`📊 [EXCEL TABLE] Table width: ${tableWidth}px, Starting X position: ${startX}px (centered)`);

  let studentCounter = 1;
  let isFirstPage = true;
  let currentCompany = null;

  sortedCompanies.forEach((companyGroup, companyIndex) => {
    companyGroup.students.forEach((student, studentIndex) => {
      // Check if we need a new page
      if (currentY + 80 > pageHeight - bottomMargin) {
        doc.addPage({ size: 'A4', margin: 0 });

        // Draw black border on new page too
        doc.strokeColor('#000000')
           .lineWidth(1.5)
           .rect(leftMargin, topMargin, pageWidth - leftMargin - rightMargin, pageHeight - topMargin - bottomMargin)
           .stroke();

        currentY = topMargin + innerPadding; // Start from top margin + padding
        isFirstPage = false;
      }

      // Draw college name on first page only in a colored cell
      if (isFirstPage && studentCounter === 1) {
        console.log(`📊 [EXCEL TABLE] Drawing college name at Y=${currentY}, X=${startX}`);
        const collegeHeaderHeight = 35;

        // Draw colored rectangle for college name
        doc.rect(startX, currentY, tableWidth, collegeHeaderHeight)
           .fillAndStroke('#2C5282', '#2C5282');

        // College name text in white
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text(collegeName.toUpperCase(), startX + 5, currentY + 11, {
             width: tableWidth - 10,
             align: 'center'
           });
        currentY += collegeHeaderHeight + 15;
      }

      // Draw company header when company changes
      if (currentCompany !== companyGroup.company || studentIndex === 0) {
        currentCompany = companyGroup.company;

        // Check space for header
        if (currentY + 60 > pageHeight - bottomMargin) {
          doc.addPage({ size: 'A4', margin: 0 });

          // Draw black border on new page
          doc.strokeColor('#000000')
             .lineWidth(1.5)
             .rect(leftMargin, topMargin, pageWidth - leftMargin - rightMargin, pageHeight - topMargin - bottomMargin)
             .stroke();

          currentY = topMargin + innerPadding;
        }

        // Company header row (plain Excel style - white bg, black border)
        const headerHeight = 24;
        doc.rect(startX, currentY, tableWidth, headerHeight)
           .fillAndStroke('#FFFFFF', '#000000');

        const companyText = companyGroup.location
          ? `${companyGroup.company}, ${companyGroup.location}, PACKAGE: ${companyGroup.lpa.toFixed(2)} LPA`
          : `${companyGroup.company}, PACKAGE: ${companyGroup.lpa.toFixed(2)} LPA`;

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text(companyText, startX + 5, currentY + 7, {
             width: tableWidth - 10,
             align: 'center'
           });
        currentY += headerHeight;

        // Column headers (plain Excel style - light gray bg, black border)
        const colHeaderHeight = 20;
        doc.rect(startX, currentY, tableWidth, colHeaderHeight)
           .fillAndStroke('#F0F0F0', '#000000');

        let colX = startX;
        columns.forEach(col => {
          doc.strokeColor('#000000')
             .lineWidth(0.5)
             .moveTo(colX, currentY)
             .lineTo(colX, currentY + colHeaderHeight)
             .stroke();

          doc.fontSize(7.5)
             .font('Helvetica-Bold')
             .fillColor('#000000')
             .text(col.label, colX + 2, currentY + 5, {
               width: col.width - 4,
               align: 'center'
             });
          colX += col.width;
        });
        // Right border of header
        doc.strokeColor('#000000')
           .lineWidth(0.5)
           .moveTo(colX, currentY)
           .lineTo(colX, currentY + colHeaderHeight)
           .stroke();
        currentY += colHeaderHeight;
      }

      // Draw student data row (plain Excel style - white bg, black borders)
      const rowHeight = 20;

      doc.rect(startX, currentY, tableWidth, rowHeight)
         .fillAndStroke('#FFFFFF', '#000000');

      // Draw cell data with vertical borders
      let colX = startX;
      doc.font('Helvetica')
         .fillColor('#000000');

      columns.forEach(col => {
        // Vertical cell border
        doc.strokeColor('#000000')
           .lineWidth(0.5)
           .moveTo(colX, currentY)
           .lineTo(colX, currentY + rowHeight)
           .stroke();

        let value = '';
        switch(col.key) {
          case 'sl':
            value = String(studentCounter);
            break;
          case 'name':
            value = (student.student_name || '').toUpperCase();
            break;
          case 'gender':
            value = (student.gender || 'N/A').toUpperCase();
            break;
          case 'prn':
            value = student.prn || 'N/A';
            break;
          case 'branch':
            value = BRANCH_SHORT_NAMES[student.branch] || student.branch?.substring(0, 6).toUpperCase() || 'N/A';
            break;
          case 'year':
            value = String(currentYear - 1);
            break;
          case 'phone':
            value = student.mobile_number || 'N/A';
            break;
          case 'email':
            value = student.email || 'N/A';
            break;
        }

        const align = (col.key === 'name' || col.key === 'email') ? 'left' : 'center';

        const cellWidth = col.width - 6;
        let fontSize = 7.5;
        const valueStr = String(value);

        if (col.key === 'name' || col.key === 'email') {
          doc.fontSize(fontSize);
          let textWidth = doc.widthOfString(valueStr);
          while (textWidth > cellWidth && fontSize > 5) {
            fontSize -= 0.5;
            doc.fontSize(fontSize);
            textWidth = doc.widthOfString(valueStr);
          }
        }

        doc.fontSize(fontSize);

        doc.text(value, colX + 3, currentY + 5, {
          width: col.width - 6,
          align: align,
          lineBreak: false,
          ellipsis: true
        });

        colX += col.width;
      });

      // Right border of last cell
      doc.strokeColor('#000000')
         .lineWidth(0.5)
         .moveTo(colX, currentY)
         .lineTo(colX, currentY + rowHeight)
         .stroke();

      currentY += rowHeight;
      studentCounter++;
    });
  });

  console.log(`✅ [EXCEL MAPPING] Generated Excel-type table for ${studentCounter - 1} students`);

  // Restore graphics state to avoid affecting subsequent pages
  doc.restore();
};

/**
 * Generate company-specific color based on index
 * Returns an object with background and foreground colors for visual distinction
 * @param {Number} index - Company index
 * @returns {Object} { bg: HexColor, fg: HexColor }
 */
const getCompanyColors = (index) => {
  // Color palette with good contrast and visual distinction
  const colors = [
    { bg: '#E53E3E', fg: '#FFFFFF' }, // Red
    { bg: '#3182CE', fg: '#FFFFFF' }, // Blue
    { bg: '#38A169', fg: '#FFFFFF' }, // Green
    { bg: '#D69E2E', fg: '#000000' }, // Yellow
    { bg: '#805AD5', fg: '#FFFFFF' }, // Purple
    { bg: '#DD6B20', fg: '#FFFFFF' }, // Orange
    { bg: '#319795', fg: '#FFFFFF' }, // Teal
    { bg: '#E91E63', fg: '#FFFFFF' }, // Pink
    { bg: '#00897B', fg: '#FFFFFF' }, // Dark Teal
    { bg: '#5E35B1', fg: '#FFFFFF' }, // Deep Purple
    { bg: '#C62828', fg: '#FFFFFF' }, // Dark Red
    { bg: '#1565C0', fg: '#FFFFFF' }, // Dark Blue
    { bg: '#2E7D32', fg: '#FFFFFF' }, // Dark Green
    { bg: '#F57C00', fg: '#000000' }, // Dark Orange
    { bg: '#6A1B9A', fg: '#FFFFFF' }, // Dark Purple
  ];

  return colors[index % colors.length];
};

/**
 * Draw the index page for multi-college placement poster PDF
 * Shows a table of contents with college names, poster page numbers, and details page numbers
 * Handles pagination if more colleges than can fit on a single page
 *
 * @param {Object} doc - PDFKit document instance
 * @param {Array} collegePageInfo - Array of { collegeName, posterStartPage, mappingStartPage }
 */
const drawIndexPage = (doc, collegePageInfo) => {
  const pageWidth = 595;
  const pageHeight = 842;
  const leftMargin = 40;
  const rightMargin = 12;
  const bottomMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentPageIdx = 0;
  doc.switchToPage(currentPageIdx);

  doc.save();
  doc.lineWidth(1);
  doc.fillColor('#000000');
  doc.strokeColor('#000000');

  // Golden header bar - flush to top like poster pages
  const headerBarHeight = 75;
  doc.rect(leftMargin, 0, contentWidth, headerBarHeight)
     .fill('#D4A015');

  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('STATE PLACEMENT CELL', leftMargin, 15, {
       width: contentWidth,
       align: 'center'
     });

  doc.font('Helvetica')
     .fontSize(10)
     .text('Government and Government Aided Polytechnic Colleges, Kerala', leftMargin, 38, {
       width: contentWidth,
       align: 'center'
     });

  let currentY = headerBarHeight + 15;

  // INDEX title
  doc.fillColor('#333333')
     .font('Helvetica-Bold')
     .fontSize(20)
     .text('INDEX', leftMargin, currentY, {
       width: contentWidth,
       align: 'center'
     });

  currentY += 30;

  // Decorative line
  doc.strokeColor('#D4A015')
     .lineWidth(2)
     .moveTo(leftMargin + 100, currentY)
     .lineTo(pageWidth - rightMargin - 100, currentY)
     .stroke();

  currentY += 20;

  // Table column definitions
  const columns = [
    { label: 'SL No', width: 55 },
    { label: 'College Name', width: 265 },
    { label: 'Flex Page No', width: 90 },
    { label: 'Details Page', width: 90 }
  ];
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const startX = leftMargin + (contentWidth - tableWidth) / 2;
  const rowHeight = 30;
  const headerRowHeight = 34;

  // Helper to draw the table column header row
  const drawTableHeader = () => {
    doc.rect(startX, currentY, tableWidth, headerRowHeight)
       .fillAndStroke('#2C5282', '#1A365D');

    let colX = startX;
    columns.forEach((col, colIdx) => {
      if (colIdx > 0) {
        doc.strokeColor('#FFFFFF')
           .lineWidth(0.5)
           .moveTo(colX, currentY + 5)
           .lineTo(colX, currentY + headerRowHeight - 5)
           .stroke();
      }

      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(col.label, colX + 5, currentY + 11, {
           width: col.width - 10,
           align: 'center'
         });
      colX += col.width;
    });

    currentY += headerRowHeight;
  };

  drawTableHeader();

  // Data rows
  collegePageInfo.forEach((info, index) => {
    // Check if we need to continue on the next reserved index page
    if (currentY + rowHeight > pageHeight - 60) {
      currentPageIdx++;
      doc.switchToPage(currentPageIdx);
      currentY = 40;

      // Continuation header
      doc.fillColor('#333333')
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('INDEX (Continued)', leftMargin, currentY, {
           width: contentWidth,
           align: 'center'
         });
      currentY += 30;
      drawTableHeader();
    }

    const fillColor = index % 2 === 0 ? '#F7FAFC' : '#FFFFFF';

    // Row background
    doc.rect(startX, currentY, tableWidth, rowHeight)
       .fillAndStroke(fillColor, '#CBD5E0');

    // Vertical cell separators
    let colX = startX;
    columns.forEach((col, colIdx) => {
      if (colIdx > 0) {
        doc.strokeColor('#CBD5E0')
           .lineWidth(0.5)
           .moveTo(colX, currentY)
           .lineTo(colX, currentY + rowHeight)
           .stroke();
      }
      colX += col.width;
    });

    colX = startX;

    // SL No
    doc.fillColor('#2D3748')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(String(index + 1), colX + 5, currentY + 9, {
         width: columns[0].width - 10,
         align: 'center'
       });
    colX += columns[0].width;

    // College Name (truncate if too long)
    const displayName = info.collegeName.length > 42
      ? info.collegeName.substring(0, 39) + '...'
      : info.collegeName;
    doc.fillColor('#2D3748')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text(displayName, colX + 8, currentY + 10, {
         width: columns[1].width - 16,
         align: 'left',
         lineBreak: false,
         ellipsis: true
       });
    colX += columns[1].width;

    // Flex Page No (1-indexed for display)
    doc.fillColor('#2B6CB0')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(String(info.posterStartPage + 1), colX + 5, currentY + 9, {
         width: columns[2].width - 10,
         align: 'center'
       });
    colX += columns[2].width;

    // Details Page (1-indexed for display)
    doc.fillColor('#2B6CB0')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(String(info.mappingStartPage + 1), colX + 5, currentY + 9, {
         width: columns[3].width - 10,
         align: 'center'
       });

    currentY += rowHeight;
  });

  // Bottom border of the table
  doc.strokeColor('#1A365D')
     .lineWidth(1.5)
     .moveTo(startX, currentY)
     .lineTo(startX + tableWidth, currentY)
     .stroke();

  // Draw black border frame on all used index pages (matching poster style)
  for (let p = 0; p <= currentPageIdx; p++) {
    doc.switchToPage(p);

    // Left border
    doc.rect(leftMargin, 0, 2, pageHeight - bottomMargin)
       .fill('#000000');

    // Right border
    doc.rect(pageWidth - rightMargin - 2, 0, 2, pageHeight - bottomMargin)
       .fill('#000000');

    // Bottom border
    doc.rect(leftMargin, pageHeight - bottomMargin - 2, contentWidth, 2)
       .fill('#000000');
  }

  doc.restore();
};

/**
 * Generate Multi-College Placement Poster PDF
 * Creates a combined placement poster for multiple colleges
 *
 * When multiple colleges are present:
 *   Index Page -> All College Posters (in order) -> All Mapping Tables (in order)
 * When only one college has data:
 *   Poster Pages -> Mapping Table (same as single-college behavior)
 *
 * @param {Array} collegesData - Array of college data objects with placements
 * @param {Response} res - Express response object
 */
export const generateMultiCollegePlacementPosterPDF = async (collegesData, res) => {
  let doc;
  try {
    console.log(`📚 [MULTI-COLLEGE POSTER] Generating poster for ${collegesData.length} colleges`);

    const PDFDocument = (await import('pdfkit')).default;
    doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Multi_College_Placement_Poster_${Date.now()}.pdf`
      );
      res.send(pdfData);
    });

    const isMultiCollege = collegesData.length > 1;
    const collegePageInfo = [];

    // Reserve index page(s) at the start for multi-college mode
    if (isMultiCollege) {
      // Calculate how many index pages are needed
      // First page fits ~18 rows (header + title + table header take space)
      // Continuation pages fit ~22 rows
      const ROWS_FIRST_PAGE = 18;
      const ROWS_CONTINUATION = 22;
      let indexPagesNeeded = 1;
      if (collegesData.length > ROWS_FIRST_PAGE) {
        indexPagesNeeded = 1 + Math.ceil((collegesData.length - ROWS_FIRST_PAGE) / ROWS_CONTINUATION);
      }

      console.log(`📑 [MULTI-COLLEGE] Reserving ${indexPagesNeeded} index page(s) for ${collegesData.length} colleges`);

      // Page 0 is already created by PDFDocument constructor
      // Add additional blank index pages if needed
      for (let p = 1; p < indexPagesNeeded; p++) {
        doc.addPage({ size: 'A4', margin: 0 });
      }
    }

    // Phase 1: Generate ALL college poster pages
    for (let i = 0; i < collegesData.length; i++) {
      const { collegeName, collegeLogo, placements, endYear } = collegesData[i];

      // In multi-college mode, all colleges start on new pages (page 0+ are index)
      // In single college mode, first college uses the initial page
      const isFirst = (i === 0) && !isMultiCollege;

      console.log(`🎨 [MULTI-COLLEGE] Phase 1 - Generating posters for ${collegeName}: ${placements.length} students`);

      const posterStartPage = isFirst ? 0 : doc.bufferedPageRange().count;
      await generateSingleCollegePosterPages(doc, placements, collegeName, collegeLogo, endYear, isFirst);

      collegePageInfo.push({
        collegeName,
        posterStartPage,
        mappingStartPage: -1 // Will be set in Phase 2
      });
    }

    // Phase 2: Generate ALL mapping tables (after all posters are done)
    for (let i = 0; i < collegesData.length; i++) {
      const { collegeName, placements, endYear } = collegesData[i];

      console.log(`📋 [MULTI-COLLEGE] Phase 2 - Adding Excel table for ${collegeName}`);

      collegePageInfo[i].mappingStartPage = doc.bufferedPageRange().count;
      drawExcelTypeMappingTable(doc, placements, collegeName, endYear || new Date().getFullYear());
    }

    // Phase 3: Draw the index page(s) for multi-college mode
    if (isMultiCollege) {
      console.log(`📑 [MULTI-COLLEGE] Phase 3 - Drawing index page`);
      drawIndexPage(doc, collegePageInfo);
    }

    // Phase 4: Add page numbers to all pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      const pageText = String(i + 1);
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageText);
      const xPosition = (doc.page.width - textWidth) / 2;
      const yPosition = doc.page.height - 40;
      doc.fillColor('gray')
         .text(pageText, xPosition, yPosition, {
           lineBreak: false,
           continued: false
         });
    }

    console.log(`✅ [MULTI-COLLEGE] Generated ${pages.count} pages for ${collegesData.length} colleges`);
    doc.end();

  } catch (error) {
    console.error('❌ [MULTI-COLLEGE POSTER] Generation error:', error);
    if (doc && !res.headersSent) {
      doc.end();
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate multi-college placement poster' });
    }
  }
};

/**
 * Helper function to generate poster pages for a single college
 * Used by both single college and multi-college poster generation
 * @param {Boolean} isFirstCollege - Whether this is the first college in multi-college mode (optional)
 */
const generateSingleCollegePosterPages = async (doc, placements, collegeName, collegeLogo, endYear, isFirstCollege = true) => {
  const academicYear = calculateAcademicYear(endYear);

  // Track the starting page index for this college's poster (before adding any pages)
  const pagesBefore = doc.bufferedPageRange().count;

  // Add new page for non-first colleges (first college uses the initial page)
  if (!isFirstCollege) {
    doc.addPage({
      size: 'A4',
      margin: 0
    });
  }

  // The starting page for this college's poster
  // First college: starts at page 0
  // Other colleges: start at the page we just added (pagesBefore)
  const startPageIndex = isFirstCollege ? 0 : pagesBefore;

  // Save graphics state at the start of poster generation
  doc.save();

  // Group placements by company and LPA
  const groupedPlacements = {};
  placements.forEach(placement => {
    const key = `${placement.company_name}|${placement.lpa}`;
    if (!groupedPlacements[key]) {
      groupedPlacements[key] = {
        company: placement.company_name,
        lpa: parseFloat(placement.lpa) || 0,
        students: []
      };
    }
    groupedPlacements[key].students.push(placement);
  });

  // Sort by LPA descending
  const sortedGroups = Object.values(groupedPlacements).sort((a, b) => b.lpa - a.lpa);

  // Split groups with more than 5 students
  const finalGroups = [];
  sortedGroups.forEach(group => {
    if (group.students.length <= 5) {
      finalGroups.push(group);
    } else {
      for (let i = 0; i < group.students.length; i += 5) {
        finalGroups.push({
          company: group.company,
          lpa: group.lpa,
          students: group.students.slice(i, i + 5)
        });
      }
    }
  });

  // Download logo if available
  let logoBuffer = null;
  if (collegeLogo) {
    logoBuffer = await downloadImage(collegeLogo);
  }

  // Download all student photos
  const photoPromises = placements.map(p =>
    p.photo_url ? downloadImage(p.photo_url) : Promise.resolve(null)
  );
  const photoBuffers = await Promise.all(photoPromises);
  const photoMap = {};
  placements.forEach((p, idx) => {
    photoMap[p.id] = photoBuffers[idx];
  });

  const pageWidth = 595;
  const pageHeight = 842;
  const leftMargin = 40;
  const rightMargin = 12;
  const bottomMargin = 12;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = 0;

  // Helper to draw complete header
  const drawHeader = () => {
    // Golden background
    doc.rect(leftMargin, 0, contentWidth, 75)
       .fill('#D4A015');

    // Logo container
    if (logoBuffer) {
      const logoSize = 50;
      const logoX = leftMargin + 10;
      const logoY = 12.5;
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 6)
         .fill('#FFFFFF');
      placeImage(doc, logoBuffer, logoX + 3, logoY + 3, {
        width: logoSize - 6,
        height: logoSize - 6
      });
    }

    // Center text
    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(18)
       .text('STATE PLACEMENT CELL', leftMargin, 15, {
         width: contentWidth,
         align: 'center'
       });

    doc.font('Helvetica')
       .fontSize(10)
       .text('Government and Government Aided Polytechnic Colleges, Kerala', leftMargin, 38, {
         width: contentWidth,
         align: 'center'
       });

    const collegeNameText = collegeName.length > 50 ? collegeName.substring(0, 47) + '...' : collegeName;
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .text(collegeNameText, leftMargin, 56, {
         width: contentWidth,
         align: 'center'
       });

    doc.strokeColor('#FFFFFF')
       .lineWidth(2)
       .moveTo(leftMargin, 75)
       .lineTo(pageWidth - rightMargin, 75)
       .stroke();

    currentY = 85;

    // Title section
    doc.fillColor('#333333')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text(`CAMPUS PLACEMENT OFFER DETAILS ${academicYear}`, leftMargin, currentY, {
         width: contentWidth,
         align: 'center'
       });

    currentY += 25;

    doc.strokeColor('#FF0000')
       .lineWidth(1)
       .moveTo(leftMargin + 50, currentY)
       .lineTo(pageWidth - rightMargin - 50, currentY)
       .stroke();

    currentY += 10;

    doc.fillColor('#FF0000')
       .font('Times-Italic')
       .fontSize(18)
       .text('Congratulations On Your Placement', leftMargin, currentY, {
         width: contentWidth,
         align: 'center'
       });

    currentY += 25;

    doc.strokeColor('#FF0000')
       .lineWidth(1)
       .moveTo(leftMargin + 50, currentY)
       .lineTo(pageWidth - rightMargin - 50, currentY)
       .stroke();

    currentY += 20;
  };

  // Draw initial header
  drawHeader();

  // Flatten all students with company info and assign colors
  const allStudents = [];
  let companyColorIndex = 0;
  const companyColorMap = {};

  sortedGroups.forEach(group => {
    if (!companyColorMap[group.company]) {
      companyColorMap[group.company] = getCompanyColors(companyColorIndex);
      companyColorIndex++;
    }

    group.students.forEach(student => {
      allStudents.push({
        ...student,
        company_name: group.company,
        lpa: group.lpa,
        colors: companyColorMap[group.company]
      });
    });
  });

  // Grid layout configuration
  const studentsPerRow = 5;
  const studentCardWidth = 95;
  const headerHeight = 18;
  const studentCardContentHeight = 102;
  const horizontalGap = 6;
  const verticalGap = 10;
  const rowWidth = (studentCardWidth * studentsPerRow) + (horizontalGap * (studentsPerRow - 1));
  const startX = leftMargin + (contentWidth - rowWidth) / 2;

  // Process students row by row
  for (let rowStartIndex = 0; rowStartIndex < allStudents.length; rowStartIndex += studentsPerRow) {
    const rowStudents = allStudents.slice(rowStartIndex, rowStartIndex + studentsPerRow);

    const totalRowHeight = headerHeight + studentCardContentHeight;
    if (currentY + totalRowHeight > pageHeight - bottomMargin - 10) {
      doc.addPage({ size: 'A4', margin: 0 });
      drawHeader();
    }

    // Group consecutive students by company in this row
    const companySegments = [];
    let currentSegment = null;

    rowStudents.forEach((student, index) => {
      if (!currentSegment || currentSegment.company !== student.company_name) {
        currentSegment = {
          company: student.company_name,
          lpa: student.lpa,
          colors: student.colors,
          students: [student],
          startIndex: index
        };
        companySegments.push(currentSegment);
      } else {
        currentSegment.students.push(student);
      }
    });

    // Draw each company segment
    companySegments.forEach(segment => {
      const segmentStudentCount = segment.students.length;
      const segmentStartX = startX + (segment.startIndex * (studentCardWidth + horizontalGap));
      const segmentWidth = (studentCardWidth * segmentStudentCount) + (horizontalGap * (segmentStudentCount - 1));

      const boxHeight = headerHeight + studentCardContentHeight;
      doc.roundedRect(segmentStartX, currentY, segmentWidth, boxHeight, 4)
         .lineWidth(1)
         .strokeColor(segment.colors.bg)
         .stroke();

      doc.roundedRect(segmentStartX, currentY, segmentWidth, headerHeight, 4)
         .fill(segment.colors.bg);

      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(segmentStudentCount > 1 ? 8 : 7)
         .text(`${segment.company} (${segment.lpa.toFixed(2)})`, segmentStartX, currentY + 5, {
           width: segmentWidth,
           align: 'center'
         });

      segment.students.forEach((student, idx) => {
        const studentX = segmentStartX + (idx * (studentCardWidth + horizontalGap));
        const contentStartY = currentY + headerHeight;

        const photoY = contentStartY + 6;
        const photoRadius = 26;
        const photoCenterX = studentX + studentCardWidth / 2;
        const photoCenterY = photoY + photoRadius;

        doc.circle(photoCenterX, photoCenterY, photoRadius)
           .lineWidth(2.5)
           .strokeColor(segment.colors.bg);

        if (photoMap[student.id]) {
          doc.save();
          doc.circle(photoCenterX, photoCenterY, photoRadius).clip();
          placeImage(doc, photoMap[student.id], photoCenterX - photoRadius, photoCenterY - photoRadius, {
            width: photoRadius * 2,
            height: photoRadius * 2
          });
          doc.restore();
          doc.circle(photoCenterX, photoCenterY, photoRadius)
             .lineWidth(2.5)
             .strokeColor(segment.colors.bg)
             .stroke();
        } else {
          doc.fillColor(segment.colors.bg).fillAndStroke();
        }

        const nameY = photoY + (photoRadius * 2) + 6;
        const namePillHeight = 28;

        doc.roundedRect(studentX + 5, nameY, studentCardWidth - 10, namePillHeight, 4)
           .fill(segment.colors.bg);

        const studentNameUpper = student.student_name.toUpperCase();
        let nameFontSize = 8;
        if (studentNameUpper.length > 15) nameFontSize = 7;
        if (studentNameUpper.length > 18) nameFontSize = 6.5;
        if (studentNameUpper.length > 22) nameFontSize = 6;
        if (studentNameUpper.length > 26) nameFontSize = 5.5;

        doc.fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .fontSize(nameFontSize)
           .text(studentNameUpper, studentX + 5, nameY + 4, {
             width: studentCardWidth - 10,
             align: 'center'
           });

        const branchShort = BRANCH_SHORT_NAMES[student.branch] || student.branch.substring(0, 3).toUpperCase();
        doc.fillColor('#FFFFFF')
           .font('Helvetica')
           .fontSize(6.5)
           .text(branchShort, studentX + 5, nameY + 16, {
             width: studentCardWidth - 10,
             align: 'center'
           });
      });
    });

    currentY += headerHeight + studentCardContentHeight + verticalGap;
  }

  // Draw borders only on THIS college's poster pages (not on previous Excel pages or other colleges)
  // endPageIndex is the last page we just created for this college's poster
  const endPageIndex = doc.bufferedPageRange().count - 1;

  console.log(`🖼️ [POSTER BORDERS] Drawing borders on pages ${startPageIndex} to ${endPageIndex} for ${collegeName}`);

  for (let i = startPageIndex; i <= endPageIndex; i++) {
    doc.switchToPage(i);

    // Left border - stops at bottom border
    doc.rect(leftMargin, 0, 2, pageHeight - bottomMargin)
       .fill('#000000');

    // Right border - stops at bottom border
    doc.rect(pageWidth - rightMargin - 2, 0, 2, pageHeight - bottomMargin)
       .fill('#000000');

    // Bottom border
    doc.rect(leftMargin, pageHeight - bottomMargin - 2, contentWidth, 2)
       .fill('#000000');
  }

  // Restore graphics state to avoid affecting subsequent pages
  doc.restore();
};

/**
 * Generate Placement Poster PDF
 * Creates a professional placement poster with colored company boxes
 * Layout: Company boxes with colored borders, students in grids (5 per row)
 *
 * @param {Array} placements - Array of placement objects with student and company data
 * @param {Object} options - Generation options
 * @param {Response} res - Express response object
 */
export const generatePlacementPosterPDF = async (placements, options, res) => {
  let doc;
  try {
    const { collegeName, collegeLogo, startYear, endYear } = options;
    const academicYear = calculateAcademicYear(endYear);

    // Group placements by company and LPA
    const groupedPlacements = {};
    placements.forEach(placement => {
      const key = `${placement.company_name}|${placement.lpa}`;
      if (!groupedPlacements[key]) {
        groupedPlacements[key] = {
          company: placement.company_name,
          lpa: parseFloat(placement.lpa) || 0,
          students: []
        };
      }
      groupedPlacements[key].students.push(placement);
    });

    // Sort by LPA descending
    const sortedGroups = Object.values(groupedPlacements).sort((a, b) => b.lpa - a.lpa);

    // Split groups with more than 5 students
    const finalGroups = [];
    sortedGroups.forEach(group => {
      if (group.students.length <= 5) {
        finalGroups.push(group);
      } else {
        for (let i = 0; i < group.students.length; i += 5) {
          finalGroups.push({
            company: group.company,
            lpa: group.lpa,
            students: group.students.slice(i, i + 5)
          });
        }
      }
    });

    // Download logo if available
    let logoBuffer = null;
    if (collegeLogo) {
      logoBuffer = await downloadImage(collegeLogo);
    }

    // Download all student photos
    const photoPromises = placements.map(p =>
      p.photo_url ? downloadImage(p.photo_url) : Promise.resolve(null)
    );
    const photoBuffers = await Promise.all(photoPromises);
    const photoMap = {};
    placements.forEach((p, idx) => {
      photoMap[p.id] = photoBuffers[idx];
    });

    // Initialize PDF
    const PDFDocument = (await import('pdfkit')).default;
    doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true
    });

    const pageWidth = 595;
    const pageHeight = 842;
    const leftMargin = 40;
    const rightMargin = 12;
    const bottomMargin = 12;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    let currentY = 0;
    let pageCount = 1;

    // Helper to draw complete header with title and congratulations
    const drawHeader = () => {
      // Golden background - starts from leftMargin
      doc.rect(leftMargin, 0, contentWidth, 75)
         .fill('#D4A015');

      // Logo container (left) - bigger rounded square
      if (logoBuffer) {
        const logoSize = 50;
        const logoX = leftMargin + 10;
        const logoY = 12.5;

        // White rounded square background
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 6)
           .fill('#FFFFFF');

        // Logo image
        placeImage(doc, logoBuffer, logoX + 3, logoY + 3, {
          width: logoSize - 6,
          height: logoSize - 6
        });
      }

      // Center text
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('STATE PLACEMENT CELL', leftMargin, 15, {
           width: contentWidth,
           align: 'center'
         });

      doc.font('Helvetica')
         .fontSize(10)
         .text('Government and Government Aided Polytechnic Colleges, Kerala', leftMargin, 38, {
           width: contentWidth,
           align: 'center'
         });

      // College name - bold and larger
      const collegeNameText = collegeName.length > 50 ? collegeName.substring(0, 47) + '...' : collegeName;
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text(collegeNameText, leftMargin, 56, {
           width: contentWidth,
           align: 'center'
         });

      // Divider line right under header
      doc.strokeColor('#FFFFFF')
         .lineWidth(2)
         .moveTo(leftMargin, 75)
         .lineTo(pageWidth - rightMargin, 75)
         .stroke();

      currentY = 85;

      // Title section
      doc.fillColor('#333333')
         .font('Helvetica-Bold')
         .fontSize(16)
         .text(`CAMPUS PLACEMENT OFFER DETAILS ${academicYear}`, leftMargin, currentY, {
           width: contentWidth,
           align: 'center'
         });

      currentY += 25;

      // Decorative line
      doc.strokeColor('#FF0000')
         .lineWidth(1)
         .moveTo(leftMargin + 50, currentY)
         .lineTo(pageWidth - rightMargin - 50, currentY)
         .stroke();

      currentY += 10;

      // Congratulations text
      doc.fillColor('#FF0000')
         .font('Times-Italic')
         .fontSize(18)
         .text('Congratulations On Your Placement', leftMargin, currentY, {
           width: contentWidth,
           align: 'center'
         });

      currentY += 25;

      // Decorative line
      doc.strokeColor('#FF0000')
         .lineWidth(1)
         .moveTo(leftMargin + 50, currentY)
         .lineTo(pageWidth - rightMargin - 50, currentY)
         .stroke();

      currentY += 20;
    };
    
    // Helper to check if new page needed
    const checkNewPage = (requiredHeight) => {
      if (currentY + requiredHeight > pageHeight - 60) {
        doc.addPage({ size: 'A4', margin: 0 });
        pageCount++;
        drawHeader();
        return true;
      }
      return false;
    };
    
    // Draw initial header with title and congratulations
    drawHeader();

    // Flatten all students with company info and assign colors
    const allStudents = [];
    let companyColorIndex = 0;
    const companyColorMap = {};

    sortedGroups.forEach(group => {
      if (!companyColorMap[group.company]) {
        companyColorMap[group.company] = getCompanyColors(companyColorIndex);
        companyColorIndex++;
      }

      group.students.forEach(student => {
        allStudents.push({
          ...student,
          company_name: group.company,
          lpa: group.lpa,
          colors: companyColorMap[group.company]
        });
      });
    });

    // Grid layout configuration - compact
    const studentsPerRow = 5;
    const studentCardWidth = 95;
    const headerHeight = 18;
    const studentCardContentHeight = 102; // Photo + name section height
    const horizontalGap = 6;
    const verticalGap = 10; // Compact spacing
    const rowWidth = (studentCardWidth * studentsPerRow) + (horizontalGap * (studentsPerRow - 1));
    const startX = leftMargin + (contentWidth - rowWidth) / 2;

    // Process students row by row (5 per row)
    for (let rowStartIndex = 0; rowStartIndex < allStudents.length; rowStartIndex += studentsPerRow) {
      const rowStudents = allStudents.slice(rowStartIndex, rowStartIndex + studentsPerRow);

      // Check if we need a new page
      const totalRowHeight = headerHeight + studentCardContentHeight;
      if (currentY + totalRowHeight > pageHeight - bottomMargin - 10) {
        doc.addPage({ size: 'A4', margin: 0 });
        pageCount++;
        drawHeader();
      }

      // Group consecutive students by company in this row
      const companySegments = [];
      let currentSegment = null;

      rowStudents.forEach((student, index) => {
        if (!currentSegment || currentSegment.company !== student.company_name) {
          currentSegment = {
            company: student.company_name,
            lpa: student.lpa,
            colors: student.colors,
            students: [student],
            startIndex: index
          };
          companySegments.push(currentSegment);
        } else {
          currentSegment.students.push(student);
        }
      });

      // Draw each company segment
      companySegments.forEach(segment => {
        const segmentStudentCount = segment.students.length;
        const segmentStartX = startX + (segment.startIndex * (studentCardWidth + horizontalGap));
        const segmentWidth = (studentCardWidth * segmentStudentCount) + (horizontalGap * (segmentStudentCount - 1));

        // Draw combined box for segment
        const boxHeight = headerHeight + studentCardContentHeight;
        doc.roundedRect(segmentStartX, currentY, segmentWidth, boxHeight, 4)
           .lineWidth(1)
           .strokeColor(segment.colors.bg)
           .stroke();

        // Draw company header INSIDE the box
        doc.roundedRect(segmentStartX, currentY, segmentWidth, headerHeight, 4)
           .fill(segment.colors.bg);

        doc.fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .fontSize(segmentStudentCount > 1 ? 8 : 7)
           .text(`${segment.company} (${segment.lpa.toFixed(2)})`, segmentStartX, currentY + 5, {
             width: segmentWidth,
             align: 'center'
           });

        // Draw students within this segment
        segment.students.forEach((student, idx) => {
          const studentX = segmentStartX + (idx * (studentCardWidth + horizontalGap));
          const contentStartY = currentY + headerHeight;

          // Photo circle
          const photoY = contentStartY + 6;
          const photoRadius = 26;
          const photoCenterX = studentX + studentCardWidth / 2;
          const photoCenterY = photoY + photoRadius;

          doc.circle(photoCenterX, photoCenterY, photoRadius)
             .lineWidth(2.5)
             .strokeColor(segment.colors.bg);

          if (photoMap[student.id]) {
            doc.save();
            doc.circle(photoCenterX, photoCenterY, photoRadius).clip();
            placeImage(doc, photoMap[student.id], photoCenterX - photoRadius, photoCenterY - photoRadius, {
              width: photoRadius * 2,
              height: photoRadius * 2
            });
            doc.restore();
            doc.circle(photoCenterX, photoCenterY, photoRadius)
               .lineWidth(2.5)
               .strokeColor(segment.colors.bg)
               .stroke();
          } else {
            doc.fillColor(segment.colors.bg).fillAndStroke();
          }

          // Name pill with branch
          const nameY = photoY + (photoRadius * 2) + 6;
          const namePillHeight = 28;

          doc.roundedRect(studentX + 5, nameY, studentCardWidth - 10, namePillHeight, 4)
             .fill(segment.colors.bg);

          // Student name - auto-shrink font
          const studentNameUpper = student.student_name.toUpperCase();
          let nameFontSize = 8;
          if (studentNameUpper.length > 15) nameFontSize = 7;
          if (studentNameUpper.length > 18) nameFontSize = 6.5;
          if (studentNameUpper.length > 22) nameFontSize = 6;
          if (studentNameUpper.length > 26) nameFontSize = 5.5;

          doc.fillColor('#FFFFFF')
             .font('Helvetica-Bold')
             .fontSize(nameFontSize)
             .text(studentNameUpper, studentX + 5, nameY + 4, {
               width: studentCardWidth - 10,
               align: 'center'
             });

          // Branch
          const branchShort = BRANCH_SHORT_NAMES[student.branch] || student.branch.substring(0, 3).toUpperCase();
          doc.fillColor('#FFFFFF')
             .font('Helvetica')
             .fontSize(6.5)
             .text(branchShort, studentX + 5, nameY + 16, {
               width: studentCardWidth - 10,
               align: 'center'
             });
        });
      });

      // Move to next row
      currentY += headerHeight + studentCardContentHeight + verticalGap;
    }

    // Track the number of poster pages before adding Excel table
    const posterPageCount = doc.bufferedPageRange().count;
    console.log(`📋 [PLACEMENT POSTER] Poster has ${posterPageCount} page(s). Adding Excel-type mapping table...`);

    // Add Excel-type mapping table after poster pages
    drawExcelTypeMappingTable(doc, placements, collegeName, endYear || new Date().getFullYear());

    // Draw black borders and page numbers on POSTER pages only (not Excel pages)
    let totalPages = doc.bufferedPageRange().count;
    console.log(`📋 [PLACEMENT POSTER] Total pages after Excel table: ${totalPages}`);

    // Process each existing page
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Only draw poster-style borders on poster pages (not on Excel table pages)
      if (i < posterPageCount) {
        // Left border
        doc.rect(leftMargin, 0, 2, pageHeight - bottomMargin)
           .fill('#000000');

        // Right border
        doc.rect(pageWidth - rightMargin - 2, 0, 2, pageHeight - bottomMargin)
           .fill('#000000');

        // Bottom border
        doc.rect(leftMargin, pageHeight - bottomMargin - 2, contentWidth, 2)
           .fill('#000000');
      }
    }

    // Add page numbers in a separate loop to avoid creating extra pages
    const finalPageCount = doc.bufferedPageRange().count;
    console.log(`📋 [PLACEMENT POSTER] Final page count before numbering: ${finalPageCount}`);

    for (let i = 0; i < finalPageCount; i++) {
      doc.switchToPage(i);

      // Page numbers centered at bottom
      const pageNumText = String(i + 1);
      doc.fontSize(8).font('Helvetica');
      const textWidth = doc.widthOfString(pageNumText);
      const xPos = (pageWidth - textWidth) / 2;

      doc.fillColor('#888888')
         .text(pageNumText, xPos, pageHeight - 25, {
           lineBreak: false
         });
    }
    
    // Stream PDF to response
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Placement_Poster_${collegeName.replace(/\s+/g, '_')}_${academicYear.replace('-', '_')}_${Date.now()}.pdf`
      );
      res.send(pdfData);
    });
    
    doc.end();
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (doc && !res.headersSent) {
      doc.end();
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
};
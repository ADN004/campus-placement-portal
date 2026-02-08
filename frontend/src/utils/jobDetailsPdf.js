import jsPDF from 'jspdf';

// ─── Color Palette ──────────────────────────────────────────────────────────
const NAVY       = [27, 42, 74];
const DARK_GRAY  = [55, 55, 55];
const MID_GRAY   = [110, 110, 110];
const LABEL_GRAY = [130, 130, 130];
const LIGHT_LINE = [210, 210, 210];
const ACCENT_BG  = [246, 248, 252];
const GREEN_BG   = [243, 250, 243];
const GREEN_BD   = [195, 225, 195];
const PILL_BG    = [232, 240, 252];
const PILL_BD    = [185, 205, 235];
const WHITE      = [255, 255, 255];

// ─── Page Geometry (A4 in mm) ───────────────────────────────────────────────
const PW = 210;
const PH = 297;
const M  = { top: 24, bottom: 28, left: 24, right: 24 };
const CW = PW - M.left - M.right;                       // 162mm content width
const MAX_TEXT_W = Math.min(CW - 8, 150);               // ~150mm readable cap
const FOOTER_Y   = PH - M.bottom + 6;                   // footer line position
const SAFE_BOTTOM = FOOTER_Y - 4;                        // content must stay above

// ─── Spacing Tokens (8-point grid) ──────────────────────────────────────────
const SP = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, xxxl: 32 };

// ─── Typography Presets ─────────────────────────────────────────────────────
const TYPE = {
  h1:      { size: 18, font: 'helvetica', style: 'bold',   color: WHITE,     spacing: 0.3 },
  h2:      { size: 12, font: 'helvetica', style: 'normal', color: WHITE,     spacing: 0.15 },
  section: { size: 10.5, font: 'helvetica', style: 'bold', color: NAVY,      spacing: 0.6 },
  label:   { size: 8,  font: 'helvetica', style: 'bold',   color: LABEL_GRAY, spacing: 0.2 },
  value:   { size: 9.5, font: 'helvetica', style: 'normal', color: DARK_GRAY, spacing: 0 },
  body:    { size: 9,  font: 'helvetica', style: 'normal', color: DARK_GRAY, spacing: 0 },
  small:   { size: 7.5, font: 'helvetica', style: 'normal', color: MID_GRAY,  spacing: 0 },
  footer:  { size: 7,  font: 'helvetica', style: 'normal', color: LIGHT_LINE, spacing: 0 },
};

const LINE_H = {
  label: 3.6,
  value: 4.2,
  body:  4.4,    // ~1.55x line-height for 9pt
};

/**
 * Generate a professional A4 PDF for a job/company detail.
 * @param {Object} job     - The job object with all fields
 * @param {Object} options - Optional: { regions, colleges } for resolving target names
 */
export function generateJobDetailsPDF(job, options = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M.top;

  // ─── Core Helpers ─────────────────────────────────────────────────────────

  /** Apply a typography preset */
  const applyType = (preset) => {
    doc.setFont(preset.font, preset.style);
    doc.setFontSize(preset.size);
    doc.setTextColor(...preset.color);
  };

  /** Check available space; add page if insufficient. Returns true if page was added. */
  const ensureSpace = (needed) => {
    if (y + needed > SAFE_BOTTOM) {
      doc.addPage();
      y = M.top;
      return true;
    }
    return false;
  };

  /** Draw horizontal rule */
  const drawRule = (yPos, color = LIGHT_LINE, width = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(M.left, yPos, M.left + CW, yPos);
  };

  /** Measure wrapped text height */
  const measureText = (text, maxW, lineH) => {
    const lines = doc.splitTextToSize(String(text), maxW);
    return { lines, height: lines.length * lineH };
  };

  /** Format a date string */
  const fmtDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  /** Parse branches (handles string / array / null) */
  const parseBranches = (b) => {
    if (!b) return [];
    if (Array.isArray(b)) return b;
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return []; } }
    return [];
  };

  /** Clean salary text — prevents "3 LPA LPA" */
  const fmtSalary = (raw) => {
    if (!raw) return 'N/A';
    const s = String(raw).trim();
    // If it already ends with LPA/lpa, return as-is
    if (/lpa$/i.test(s)) return s;
    return `${s} LPA`;
  };

  /** Resolve target audience text */
  const getTargetText = () => {
    const { regions = [], colleges = [] } = options;
    let type = job.target_type;
    if (type === 'specific') {
      if (job.target_regions) type = 'region';
      else if (job.target_colleges) type = 'college';
      else return 'All Students';
    }
    if (type === 'region' && job.target_regions) {
      let ids = job.target_regions;
      if (typeof ids === 'string') try { ids = JSON.parse(ids); } catch { return 'N/A'; }
      if (!Array.isArray(ids)) return 'N/A';
      const names = regions.filter(r => ids.includes(r.id)).map(r => r.region_name || r.name);
      return names.length > 0 ? names.join(', ') : ids.join(', ');
    }
    if (type === 'college' && job.target_colleges) {
      let ids = job.target_colleges;
      if (typeof ids === 'string') try { ids = JSON.parse(ids); } catch { return 'N/A'; }
      if (!Array.isArray(ids)) return 'N/A';
      const names = colleges.filter(c => ids.includes(c.id)).map(c => c.college_name || c.name);
      return names.length > 0 ? names.join(', ') : ids.join(', ');
    }
    return 'All Students';
  };

  // ─── Drawing Primitives ───────────────────────────────────────────────────

  /** Section header: TITLE + navy underline. Keeps with ≥30mm of following content. */
  const drawSectionHeader = (title) => {
    ensureSpace(38);                       // header + at least some content below
    y += SP.xxl;                           // 24mm gap before section
    applyType(TYPE.section);
    doc.text(title.toUpperCase(), M.left, y, { characterSpacing: TYPE.section.spacing });
    y += 2;
    drawRule(y, NAVY, 0.7);
    y += SP.lg;                            // 12mm after line
  };

  /** Info card: equal-width columns inside a shaded rounded rect. Auto-height. */
  const drawInfoCard = (fields, bgColor = ACCENT_BG) => {
    const validFields = fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    if (validFields.length === 0) return;

    const cardPadX = SP.lg;               // 12mm horizontal padding
    const cardPadY = SP.md;               // 8mm vertical padding
    const innerW   = CW - cardPadX * 2;
    const colW     = innerW / validFields.length;

    // Measure the tallest value
    let maxValH = LINE_H.value;
    validFields.forEach(f => {
      const m = measureText(String(f.value), colW - 4, LINE_H.value);
      if (m.height > maxValH) maxValH = m.height;
    });

    const cardH = cardPadY + LINE_H.label + SP.sm + maxValH + cardPadY;
    ensureSpace(cardH + 2);

    // Background
    doc.setFillColor(...bgColor);
    doc.roundedRect(M.left, y, CW, cardH, 2, 2, 'F');

    // Content
    const labelY = y + cardPadY + LINE_H.label;
    const valueY = labelY + SP.sm + LINE_H.value;

    validFields.forEach((f, i) => {
      const colX = M.left + cardPadX + i * colW;

      // Label
      applyType(TYPE.label);
      doc.text(f.label.toUpperCase(), colX, labelY, { characterSpacing: TYPE.label.spacing });

      // Value
      applyType(TYPE.value);
      const vLines = doc.splitTextToSize(String(f.value), colW - 4);
      doc.text(vLines, colX, valueY);
    });

    y += cardH + SP.md;
  };

  /** Draw wrapped paragraph text with proper line-height */
  const drawParagraph = (text, indent = 0) => {
    applyType(TYPE.body);
    const maxW = Math.min(MAX_TEXT_W, CW - indent);
    const { lines, height } = measureText(text, maxW, LINE_H.body);

    // Render in chunks to handle page breaks mid-paragraph
    const x = M.left + indent;
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(LINE_H.body + 2);
      doc.text(lines[i], x, y);
      y += LINE_H.body;
    }
    y += SP.sm;
  };

  // ═════════════════════════════════════════════════════════════════════════
  //  HEADER BAND
  // ═════════════════════════════════════════════════════════════════════════

  const HEADER_H = 46;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  // Company name (H1)
  applyType(TYPE.h1);
  doc.text(
    job.company_name || 'Company',
    M.left, 18,
    { characterSpacing: TYPE.h1.spacing }
  );

  // Job title (H2)
  applyType(TYPE.h2);
  doc.text(
    job.title || job.job_title || 'Job Position',
    M.left, 28,
    { characterSpacing: TYPE.h2.spacing }
  );

  // Meta line
  applyType(TYPE.small);
  doc.setTextColor(170, 180, 200);
  doc.text(`Generated on ${fmtDate(new Date())}`, M.left, 39);
  doc.text(
    'State Placement Cell - Kerala Polytechnics',
    PW - M.right, 39,
    { align: 'right' }
  );

  y = HEADER_H + SP.xl;                  // 16mm below header

  // ═════════════════════════════════════════════════════════════════════════
  //  COMPANY & POSITION OVERVIEW
  // ═════════════════════════════════════════════════════════════════════════

  drawSectionHeader('Company & Position Overview');

  drawInfoCard([
    { label: 'Location',       value: job.location || job.job_location || 'N/A' },
    { label: 'Salary Package', value: fmtSalary(job.salary_package) },
    { label: 'Vacancies',      value: job.no_of_vacancies || 'N/A' },
  ]);

  // Company description (if present)
  if (job.company_description) {
    applyType(TYPE.label);
    doc.text('COMPANY DESCRIPTION', M.left + SP.xs, y, { characterSpacing: TYPE.label.spacing });
    y += SP.md;
    drawParagraph(job.company_description, SP.xs);
    drawRule(y);
    y += SP.md;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  JOB DESCRIPTION
  // ═════════════════════════════════════════════════════════════════════════

  if (job.description || job.job_description) {
    drawSectionHeader('Job Description');
    drawParagraph(job.description || job.job_description, SP.xs);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  ELIGIBILITY CRITERIA
  // ═════════════════════════════════════════════════════════════════════════

  drawSectionHeader('Eligibility Criteria');

  // CGPA + Backlog card
  const eligFields = [];
  if (job.min_cgpa) {
    eligFields.push({ label: 'Minimum CGPA', value: String(job.min_cgpa) });
  }
  if (job.max_backlogs !== null && job.max_backlogs !== undefined) {
    let txt;
    if (job.max_backlogs === 0) txt = 'No Backlogs Allowed';
    else if (job.backlog_max_semester) txt = `Max ${job.max_backlogs} (within Sem 1-${job.backlog_max_semester})`;
    else txt = `Max ${job.max_backlogs}`;
    eligFields.push({ label: 'Backlog Criteria', value: txt });
  }
  if (eligFields.length > 0) drawInfoCard(eligFields);

  // Height / Weight card
  const physFields = [];
  if (job.min_height || job.max_height) {
    physFields.push({ label: 'Height (cm)', value: [job.min_height, job.max_height].filter(Boolean).join(' – ') });
  }
  if (job.min_weight || job.max_weight) {
    physFields.push({ label: 'Weight (kg)', value: [job.min_weight, job.max_weight].filter(Boolean).join(' – ') });
  }
  if (physFields.length > 0) drawInfoCard(physFields);

  // ── Allowed Branches (pills) ──────────────────────────────────────────
  const branches = parseBranches(job.allowed_branches);
  if (branches.length > 0) {
    ensureSpace(20);
    applyType(TYPE.label);
    doc.text('ALLOWED BRANCHES', M.left + SP.xs, y, { characterSpacing: TYPE.label.spacing });
    y += SP.md + 1;

    const PILL_H   = 7;
    const PILL_PAD = 4;        // left+right text padding inside pill
    const PILL_GAP = 3;        // gap between pills
    const ROW_GAP  = 3;        // gap between pill rows

    let px = M.left + SP.xs;

    branches.forEach((branch) => {
      const text = String(branch);
      applyType(TYPE.body);
      doc.setFontSize(8);
      const tw = doc.getTextWidth(text);
      const pillW = tw + PILL_PAD * 2;

      // Wrap to next row
      if (px + pillW > M.left + CW - SP.xs) {
        px = M.left + SP.xs;
        y += PILL_H + ROW_GAP;
        ensureSpace(PILL_H + 4);
      }

      // Pill background + border
      doc.setFillColor(...PILL_BG);
      doc.roundedRect(px, y - PILL_H / 2 - 0.5, pillW, PILL_H, 1.8, 1.8, 'F');
      doc.setDrawColor(...PILL_BD);
      doc.setLineWidth(0.25);
      doc.roundedRect(px, y - PILL_H / 2 - 0.5, pillW, PILL_H, 1.8, 1.8, 'S');

      // Pill text (vertically centered)
      doc.setTextColor(...NAVY);
      doc.text(text, px + PILL_PAD, y + 1);

      px += pillW + PILL_GAP;
    });

    y += PILL_H / 2 + SP.lg;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  TARGET AUDIENCE
  // ═════════════════════════════════════════════════════════════════════════

  drawSectionHeader('Target Audience');

  const targetText = getTargetText();

  // Measure text to auto-size box
  applyType(TYPE.value);
  const targetLines = doc.splitTextToSize(targetText, CW - SP.xxl * 2);
  const targetTextH = targetLines.length * LINE_H.value;
  const targetBoxH  = SP.md * 2 + targetTextH + 2;

  ensureSpace(targetBoxH + 4);
  doc.setFillColor(...GREEN_BG);
  doc.roundedRect(M.left, y, CW, targetBoxH, 2, 2, 'F');
  doc.setDrawColor(...GREEN_BD);
  doc.setLineWidth(0.3);
  doc.roundedRect(M.left, y, CW, targetBoxH, 2, 2, 'S');

  const tInnerY = y + SP.md + LINE_H.value;
  applyType(TYPE.label);
  doc.text('TARGET', M.left + SP.lg, tInnerY, { characterSpacing: TYPE.label.spacing });

  applyType(TYPE.value);
  doc.text(targetLines, M.left + SP.lg + 22, tInnerY);

  y += targetBoxH + SP.md;

  // ═════════════════════════════════════════════════════════════════════════
  //  APPLICATION DETAILS
  // ═════════════════════════════════════════════════════════════════════════

  drawSectionHeader('Application Details');

  const appFields = [];
  if (job.application_start_date) {
    appFields.push({ label: 'Start Date', value: fmtDate(job.application_start_date) });
  }
  if (job.application_deadline) {
    appFields.push({ label: 'Deadline', value: fmtDate(job.application_deadline) });
  }
  if (appFields.length > 0) drawInfoCard(appFields);

  // Application form URL
  if (job.application_form_url) {
    ensureSpace(14);
    applyType(TYPE.label);
    doc.text('APPLICATION FORM URL', M.left + SP.xs, y, { characterSpacing: TYPE.label.spacing });
    y += SP.sm + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 80, 180);
    const urlLines = doc.splitTextToSize(job.application_form_url, CW - SP.md);
    doc.text(urlLines, M.left + SP.xs, y);
    y += urlLines.length * LINE_H.body + SP.md;
  }

  // ── Status badge ──────────────────────────────────────────────────────
  ensureSpace(16);
  drawRule(y);
  y += SP.lg;

  applyType(TYPE.label);
  doc.text('STATUS', M.left + SP.xs, y, { characterSpacing: TYPE.label.spacing });

  const isActive   = job.is_active !== false;
  const badgeText  = isActive ? 'Active' : 'Inactive';
  const badgeColor = isActive ? [34, 139, 34] : [200, 50, 60];

  applyType(TYPE.small);
  doc.setFontSize(7.5);
  const badgeW = doc.getTextWidth(badgeText) + 6;
  const badgeX = M.left + SP.xs + 20;

  doc.setFillColor(...badgeColor);
  doc.roundedRect(badgeX, y - 3.2, badgeW, 5.2, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(badgeText, badgeX + 3, y + 0.2);

  // ═════════════════════════════════════════════════════════════════════════
  //  FOOTER (applied to every page)
  // ═════════════════════════════════════════════════════════════════════════

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    applyType(TYPE.footer);
    drawRule(FOOTER_Y, LIGHT_LINE, 0.2);
    doc.text('State Placement Cell (SPC) - Kerala Polytechnics', M.left, FOOTER_Y + 5);
    doc.text(`Page ${i} of ${totalPages}`, PW - M.right, FOOTER_Y + 5, { align: 'right' });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  SAVE
  // ═════════════════════════════════════════════════════════════════════════

  const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const filename = `${safe(job.company_name)}_${safe(job.title || job.job_title || 'Details')}.pdf`;
  doc.save(filename);
}

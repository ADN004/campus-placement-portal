import jsPDF from 'jspdf';

// Color palette (matching project's navy/professional theme)
const NAVY = [27, 42, 74];       // #1B2A4A
const DARK_GRAY = [68, 68, 68];  // #444444
const MID_GRAY = [102, 102, 102];
const LIGHT_LINE = [200, 200, 200];
const ACCENT_BG = [245, 247, 250];
const WHITE = [255, 255, 255];

// Page geometry (A4)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = { top: 20, bottom: 25, left: 20, right: 20 };
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;

/**
 * Generate a professional A4 PDF for a job/company detail
 * @param {Object} job - The job object with all fields
 * @param {Object} options - Optional: { regions, colleges } arrays for resolving target names
 */
export function generateJobDetailsPDF(job, options = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN.top;

  // ─── Helpers ──────────────────────────────────────────────
  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - MARGIN.bottom) {
      doc.addPage();
      y = MARGIN.top;
    }
  };

  const drawLine = (yPos, color = LIGHT_LINE, width = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(MARGIN.left, yPos, MARGIN.left + CONTENT_W, yPos);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const parseBranches = (branches) => {
    if (!branches) return [];
    if (Array.isArray(branches)) return branches;
    if (typeof branches === 'string') {
      try { return JSON.parse(branches); } catch { return []; }
    }
    return [];
  };

  const getTargetText = (job) => {
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

  // ─── Header Band ──────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 42, 'F');

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(job.company_name || 'Company', MARGIN.left + 2, 16);

  // Job title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(job.title || job.job_title || 'Job Position', MARGIN.left + 2, 26);

  // Date generated
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(`Generated on ${formatDate(new Date())}`, MARGIN.left + 2, 36);

  // SPC branding on right
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text('State Placement Cell - Kerala Polytechnics', PAGE_W - MARGIN.right - 2, 36, { align: 'right' });

  y = 52;

  // ─── Section: Company Overview ────────────────────────────
  const drawSectionHeader = (title) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), MARGIN.left, y);
    y += 1.5;
    drawLine(y, NAVY, 0.6);
    y += 5;
  };

  const drawField = (label, value, opts = {}) => {
    if (!value && value !== 0) return;
    ensureSpace(10);
    const { fullWidth = false } = opts;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    doc.text(label, MARGIN.left + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_GRAY);

    if (fullWidth) {
      y += 5;
      const lines = doc.splitTextToSize(String(value), CONTENT_W - 4);
      doc.text(lines, MARGIN.left + 2, y);
      y += lines.length * 4.5 + 3;
    } else {
      doc.text(String(value), MARGIN.left + 52, y);
      y += 6;
    }
  };

  const drawFieldRow = (fields) => {
    ensureSpace(14);
    const colW = CONTENT_W / fields.length;
    fields.forEach((f, i) => {
      if (!f.value && f.value !== 0) return;
      const x = MARGIN.left + 2 + i * colW;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...MID_GRAY);
      doc.text(f.label, x, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK_GRAY);
      doc.text(String(f.value), x, y + 5);
    });
    y += 13;
  };

  // ─── Company Overview Section ─────────────────────────────
  drawSectionHeader('Company & Position Overview');

  // Shaded info box
  ensureSpace(28);
  doc.setFillColor(...ACCENT_BG);
  doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 24, 2, 2, 'F');

  drawFieldRow([
    { label: 'Location', value: job.location || job.job_location || 'N/A' },
    { label: 'Salary Package', value: job.salary_package ? `${job.salary_package} LPA` : 'N/A' },
    { label: 'Vacancies', value: job.no_of_vacancies || 'N/A' },
  ]);

  y += 2;

  // Company description
  if (job.company_description) {
    drawField('Company Description', job.company_description, { fullWidth: true });
    drawLine(y - 1);
    y += 3;
  }

  // ─── Job Description Section ──────────────────────────────
  if (job.description || job.job_description) {
    drawSectionHeader('Job Description');
    ensureSpace(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_GRAY);
    const descLines = doc.splitTextToSize(
      String(job.description || job.job_description),
      CONTENT_W - 4
    );
    doc.text(descLines, MARGIN.left + 2, y);
    y += descLines.length * 4.5 + 6;
  }

  // ─── Eligibility Criteria Section ─────────────────────────
  drawSectionHeader('Eligibility Criteria');

  // CGPA & Backlogs row
  const eligFields = [];
  if (job.min_cgpa) {
    eligFields.push({ label: 'Minimum CGPA', value: String(job.min_cgpa) });
  }
  if (job.max_backlogs !== null && job.max_backlogs !== undefined) {
    let backlogText;
    if (job.max_backlogs === 0) {
      backlogText = 'No Backlogs Allowed';
    } else if (job.backlog_max_semester) {
      backlogText = `Max ${job.max_backlogs} (within Sem 1-${job.backlog_max_semester})`;
    } else {
      backlogText = `Max ${job.max_backlogs}`;
    }
    eligFields.push({ label: 'Backlog Criteria', value: backlogText });
  }

  if (eligFields.length > 0) {
    ensureSpace(18);
    doc.setFillColor(...ACCENT_BG);
    doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 16, 2, 2, 'F');
    drawFieldRow(eligFields);
  }

  // Height/Weight criteria
  const physFields = [];
  if (job.min_height || job.max_height) {
    const h = [job.min_height, job.max_height].filter(Boolean).join(' - ');
    physFields.push({ label: 'Height (cm)', value: h });
  }
  if (job.min_weight || job.max_weight) {
    const w = [job.min_weight, job.max_weight].filter(Boolean).join(' - ');
    physFields.push({ label: 'Weight (kg)', value: w });
  }
  if (physFields.length > 0) {
    ensureSpace(18);
    doc.setFillColor(...ACCENT_BG);
    doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 16, 2, 2, 'F');
    drawFieldRow(physFields);
  }

  // Allowed Branches
  const branches = parseBranches(job.allowed_branches);
  if (branches.length > 0) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    doc.text('Allowed Branches', MARGIN.left + 2, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);

    // Draw branch pills
    let pillX = MARGIN.left + 2;
    const pillY = y;
    let currentLineY = pillY;

    branches.forEach((branch) => {
      const text = String(branch);
      const textW = doc.getTextWidth(text) + 6;

      if (pillX + textW > MARGIN.left + CONTENT_W - 2) {
        pillX = MARGIN.left + 2;
        currentLineY += 7;
        ensureSpace(8);
      }

      // Pill background
      doc.setFillColor(230, 238, 250);
      doc.roundedRect(pillX - 1, currentLineY - 3.5, textW + 2, 6, 1.5, 1.5, 'F');

      // Pill border
      doc.setDrawColor(180, 200, 230);
      doc.setLineWidth(0.2);
      doc.roundedRect(pillX - 1, currentLineY - 3.5, textW + 2, 6, 1.5, 1.5, 'S');

      doc.setTextColor(...NAVY);
      doc.text(text, pillX + 2, currentLineY);
      pillX += textW + 5;
    });

    y = currentLineY + 10;
  }

  // ─── Target Audience Section ──────────────────────────────
  drawSectionHeader('Target Audience');
  const targetText = getTargetText(job);

  ensureSpace(14);
  doc.setFillColor(240, 249, 240);
  doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 12, 2, 2, 'F');
  doc.setDrawColor(180, 220, 180);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 12, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MID_GRAY);
  doc.text('Target:', MARGIN.left + 4, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_GRAY);
  doc.text(targetText, MARGIN.left + 22, y + 4);
  y += 16;

  // ─── Application Details Section ──────────────────────────
  drawSectionHeader('Application Details');

  const appFields = [];
  if (job.application_start_date) {
    appFields.push({ label: 'Start Date', value: formatDate(job.application_start_date) });
  }
  if (job.application_deadline) {
    appFields.push({ label: 'Deadline', value: formatDate(job.application_deadline) });
  }

  if (appFields.length > 0) {
    ensureSpace(18);
    doc.setFillColor(...ACCENT_BG);
    doc.roundedRect(MARGIN.left, y - 2, CONTENT_W, 16, 2, 2, 'F');
    drawFieldRow(appFields);
  }

  if (job.application_form_url) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MID_GRAY);
    doc.text('Application Form URL', MARGIN.left + 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 80, 180);
    const urlLines = doc.splitTextToSize(job.application_form_url, CONTENT_W - 4);
    doc.text(urlLines, MARGIN.left + 2, y);
    y += urlLines.length * 4 + 4;
  }

  // Status
  ensureSpace(14);
  drawLine(y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MID_GRAY);
  doc.text('Status:', MARGIN.left + 2, y);

  const isActive = job.is_active !== false;
  doc.setFillColor(isActive ? 34 : 220, isActive ? 160 : 53, isActive ? 34 : 69);
  doc.roundedRect(MARGIN.left + 20, y - 3.5, isActive ? 14 : 17, 5.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(isActive ? 'Active' : 'Inactive', MARGIN.left + 21.5, y);

  // ─── Footer ───────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...LIGHT_LINE);
    drawLine(PAGE_H - 15, LIGHT_LINE, 0.2);
    doc.text(
      'State Placement Cell (SPC) - Kerala Polytechnics',
      MARGIN.left,
      PAGE_H - 10
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      PAGE_W - MARGIN.right,
      PAGE_H - 10,
      { align: 'right' }
    );
  }

  // ─── Save ─────────────────────────────────────────────────
  const filename = `${(job.company_name || 'Job').replace(/[^a-zA-Z0-9]/g, '_')}_${(job.title || job.job_title || 'Details').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

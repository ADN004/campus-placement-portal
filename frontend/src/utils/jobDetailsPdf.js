import jsPDF from 'jspdf';

// ─── Color Palette (unchanged) ─────────────────────────────────────────────
const NAVY       = [27, 42, 74];
const DARK_GRAY  = [55, 55, 55];
const LABEL_GRAY = [120, 120, 120];
const LIGHT_LINE = [210, 210, 210];
const ACCENT_BG  = [246, 248, 252];
const PILL_BG    = [232, 240, 252];
const PILL_BD    = [185, 205, 235];
const WHITE      = [255, 255, 255];
const BLACK      = [0, 0, 0];

// ─── Page Geometry (A4 compact) ─────────────────────────────────────────────
const PW = 210;
const PH = 297;
const BORDER   = 5;                                        // page border inset
const M        = { top: 12, bottom: 16, left: 18, right: 18 };
const CW       = PW - M.left - M.right;                   // 174mm
const MAX_TW   = CW - 4;                                  // text width cap
const FOOTER_Y = PH - BORDER - 7;                         // footer baseline
const SAFE_BOT = FOOTER_Y - 5;                            // content ceiling

// ─── Compact Line Heights ───────────────────────────────────────────────────
const LH = { label: 3.6, value: 3.6, body: 3.6 };

// ─── Typography ─────────────────────────────────────────────────────────────
const T = {
  h1:   { size: 16, style: 'bold',   color: WHITE },
  h2:   { size: 11, style: 'normal', color: WHITE },
  sec:  { size: 9.5, style: 'bold',  color: NAVY },
  lbl:  { size: 7,  style: 'bold',   color: LABEL_GRAY },
  val:  { size: 9,  style: 'normal', color: DARK_GRAY },
  body: { size: 8.5, style: 'normal', color: DARK_GRAY },
  meta: { size: 6.5, style: 'normal', color: [170, 180, 200] },
  ftr:  { size: 6.5, style: 'normal', color: LIGHT_LINE },
};

const setType = (doc, t) => {
  doc.setFont('helvetica', t.style);
  doc.setFontSize(t.size);
  doc.setTextColor(...t.color);
};

/**
 * Generate a compact professional A4 PDF for job/company details.
 */
export function generateJobDetailsPDF(job) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = M.top;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const ensureSpace = (needed) => {
    if (y + needed > SAFE_BOT) { doc.addPage(); y = M.top + BORDER + 2; return true; }
    return false;
  };

  const rule = (yy, color = LIGHT_LINE, w = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(w);
    doc.line(M.left, yy, M.left + CW, yy);
  };

  const fmtDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const parseBranches = (b) => {
    if (!b) return [];
    if (Array.isArray(b)) return b;
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return []; } }
    return [];
  };

  const fmtSalary = (raw) => {
    if (!raw) return 'N/A';
    const s = String(raw).trim();
    return /lpa$/i.test(s) ? s : `${s} LPA`;
  };

  // ─── Drawing Primitives ───────────────────────────────────────────────────

  /** Section header — only breaks page if truly no room for header + ~18mm content */
  const sectionHeader = (title) => {
    ensureSpace(22);
    y += 8;                                 // compact gap before section
    setType(doc, T.sec);
    doc.text(title.toUpperCase(), M.left, y, { characterSpacing: 0.5 });
    y += 1.5;
    rule(y, NAVY, 0.6);
    y += 6;                                 // breathing room after rule
  };

  /** Compact info card with equal columns */
  const infoCard = (fields, bg = ACCENT_BG) => {
    const valid = fields.filter(f => f.value != null && f.value !== '');
    if (!valid.length) return;

    const padX = 7, padY = 5;
    const innerW = CW - padX * 2;
    const colW = innerW / valid.length;

    // Measure tallest value
    setType(doc, T.val);
    let maxVH = LH.value;
    valid.forEach(f => {
      const lines = doc.splitTextToSize(String(f.value), colW - 3);
      const h = lines.length * LH.value;
      if (h > maxVH) maxVH = h;
    });

    const cardH = padY + LH.label + 3 + maxVH + padY;
    ensureSpace(cardH + 1);

    doc.setFillColor(...bg);
    doc.roundedRect(M.left, y, CW, cardH, 1.5, 1.5, 'F');

    const lblY = y + padY + LH.label;
    const valY = lblY + 3.5;

    valid.forEach((f, i) => {
      const cx = M.left + padX + i * colW;
      setType(doc, T.lbl);
      doc.text(f.label.toUpperCase(), cx, lblY, { characterSpacing: 0.15 });
      setType(doc, T.val);
      const vl = doc.splitTextToSize(String(f.value), colW - 3);
      doc.text(vl, cx, valY);
    });

    y += cardH + 3;
  };

  /** Paragraph — renders line by line, handles page breaks mid-text */
  const paragraph = (text) => {
    setType(doc, T.body);
    const lines = doc.splitTextToSize(String(text), MAX_TW);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(LH.body + 1);
      doc.text(lines[i], M.left + 1, y);
      y += LH.body;
    }
    y += 2;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEADER BAND (compact: 34mm)
  // ═══════════════════════════════════════════════════════════════════════════

  const HDR = 34;
  doc.setFillColor(...NAVY);
  doc.rect(BORDER, BORDER, PW - BORDER * 2, HDR - BORDER, 'F');

  setType(doc, T.h1);
  doc.text(job.company_name || 'Company', M.left, 15, { characterSpacing: 0.2 });

  setType(doc, T.h2);
  doc.text(job.title || job.job_title || 'Job Position', M.left, 23, { characterSpacing: 0.1 });

  setType(doc, T.meta);
  doc.text(`Generated on ${fmtDate(new Date())}`, M.left, 30);
  doc.text('State Placement Cell - Kerala Polytechnics', PW - M.right, 30, { align: 'right' });

  y = HDR + 6;

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPANY & POSITION OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  sectionHeader('Company & Position Overview');

  infoCard([
    { label: 'Location',       value: job.location || job.job_location || 'N/A' },
    { label: 'Salary Package', value: fmtSalary(job.salary_package) },
    { label: 'Vacancies',      value: job.no_of_vacancies || 'N/A' },
  ]);

  if (job.company_description) {
    setType(doc, T.lbl);
    doc.text('COMPANY DESCRIPTION', M.left + 1, y, { characterSpacing: 0.15 });
    y += 4;
    paragraph(job.company_description);
    rule(y);
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  JOB DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════

  if (job.description || job.job_description) {
    sectionHeader('Job Description');
    paragraph(job.description || job.job_description);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ELIGIBILITY CRITERIA
  // ═══════════════════════════════════════════════════════════════════════════

  sectionHeader('Eligibility Criteria');

  const eligF = [];
  if (job.min_cgpa) eligF.push({ label: 'Minimum CGPA', value: String(job.min_cgpa) });
  if (job.max_backlogs !== null && job.max_backlogs !== undefined) {
    let t;
    if (job.max_backlogs === 0) t = 'No Backlogs Allowed';
    else if (job.backlog_max_semester) t = `Max ${job.max_backlogs} (within Sem 1-${job.backlog_max_semester})`;
    else t = `Max ${job.max_backlogs}`;
    eligF.push({ label: 'Backlog Criteria', value: t });
  }
  if (eligF.length > 0) infoCard(eligF);

  // Height / Weight
  const physF = [];
  if (job.min_height || job.max_height)
    physF.push({ label: 'Height (cm)', value: [job.min_height, job.max_height].filter(Boolean).join(' – ') });
  if (job.min_weight || job.max_weight)
    physF.push({ label: 'Weight (kg)', value: [job.min_weight, job.max_weight].filter(Boolean).join(' – ') });
  if (physF.length > 0) infoCard(physF);

  // ── Allowed Branches (compact pills) ──────────────────────────────────────
  const branches = parseBranches(job.allowed_branches);
  if (branches.length > 0) {
    ensureSpace(14);
    setType(doc, T.lbl);
    doc.text('ALLOWED BRANCHES', M.left + 1, y, { characterSpacing: 0.15 });
    y += 5;

    const PH_H = 5.5, PP = 3, PG = 2.5, RG = 2;
    let px = M.left + 1;

    branches.forEach((branch) => {
      const txt = String(branch);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const tw = doc.getTextWidth(txt);
      const pw = tw + PP * 2;

      if (px + pw > M.left + CW - 1) {
        px = M.left + 1;
        y += PH_H + RG;
        ensureSpace(PH_H + 2);
      }

      doc.setFillColor(...PILL_BG);
      doc.roundedRect(px, y - PH_H / 2 - 0.3, pw, PH_H, 1.5, 1.5, 'F');
      doc.setDrawColor(...PILL_BD);
      doc.setLineWidth(0.2);
      doc.roundedRect(px, y - PH_H / 2 - 0.3, pw, PH_H, 1.5, 1.5, 'S');

      doc.setTextColor(...NAVY);
      doc.text(txt, px + PP, y + 0.8);
      px += pw + PG;
    });

    y += PH_H / 2 + 5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  APPLICATION DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  sectionHeader('Application Details');

  const appF = [];
  if (job.application_start_date) appF.push({ label: 'Start Date', value: fmtDate(job.application_start_date) });
  if (job.application_deadline) appF.push({ label: 'Deadline', value: fmtDate(job.application_deadline) });
  if (appF.length > 0) infoCard(appF);

  if (job.application_form_url) {
    ensureSpace(10);
    setType(doc, T.lbl);
    doc.text('APPLICATION FORM URL', M.left + 1, y, { characterSpacing: 0.15 });
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 80, 180);
    const uLines = doc.splitTextToSize(job.application_form_url, CW - 4);
    doc.text(uLines, M.left + 1, y);
    y += uLines.length * LH.body + 3;
  }

  // ── Status ────────────────────────────────────────────────────────────────
  ensureSpace(10);
  rule(y);
  y += 5;

  setType(doc, T.lbl);
  doc.text('STATUS', M.left + 1, y, { characterSpacing: 0.15 });

  const isActive  = job.is_active !== false;
  const badgeTxt  = isActive ? 'Active' : 'Inactive';
  const badgeClr  = isActive ? [34, 139, 34] : [200, 50, 60];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const bw = doc.getTextWidth(badgeTxt) + 5;
  const bx = M.left + 1 + 18;

  doc.setFillColor(...badgeClr);
  doc.roundedRect(bx, y - 2.8, bw, 4.6, 1.2, 1.2, 'F');
  doc.setTextColor(...WHITE);
  doc.text(badgeTxt, bx + 2.5, y + 0.2);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE BORDER + FOOTER (every page)
  // ═══════════════════════════════════════════════════════════════════════════

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Thin black page border
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(BORDER, BORDER, PW - BORDER * 2, PH - BORDER * 2);

    // Footer
    setType(doc, T.ftr);
    rule(FOOTER_Y, LIGHT_LINE, 0.15);
    doc.text('State Placement Cell (SPC) - Kerala Polytechnics', M.left, FOOTER_Y + 3.5);
    doc.text(`Page ${i} of ${pages}`, PW - M.right, FOOTER_Y + 3.5, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  doc.save(`${safe(job.company_name)}_${safe(job.title || job.job_title || 'Details')}.pdf`);
}

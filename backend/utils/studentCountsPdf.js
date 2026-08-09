/**
 * The consolidated student-count report as a PDF.
 *
 * Its own module rather than another generator inside pdfGenerator.js, which is
 * already several thousand lines. Helvetica throughout, matching every other
 * PDF this project produces — there is no embedded font on the backend, and a
 * report that looks different from the rest of the exports looks like a mistake.
 *
 * It is a table of figures somebody prints or forwards, so it gets a real
 * bordered grid, a header band that repeats on every page, right-aligned
 * numbers, and totals that are visibly totals.
 */

import PDFDocument from 'pdfkit';

const MARGIN = { top: 46, bottom: 56, left: 42, right: 42 };
/*
 * A fresh margins object per page, never the shared MARGIN.
 *
 * PDFKit keeps the object it is handed, so doc.page.margins WAS this module's
 * MARGIN. The footer loop sets margins.bottom to 0 for the width of one write,
 * which silently set MARGIN.bottom to 0 as well — and the next line computed
 * the footer's y from MARGIN.bottom, landing it at 862 on an 842pt page. Off
 * the page is an overflow, an overflow starts a new page, and that page got a
 * footer of its own: three blank numbered pages after three real ones.
 */
const pageOptions = () => ({ size: 'A4', bufferPages: true, margins: { ...MARGIN } });

const INK = '#111111';
const MUTED = '#5C6570';
const GRID = '#9AA0A8';       // table borders — dark enough to read when printed
const BAND = '#ECEEF1';       // header band and total row fill
const ZEBRA = '#F7F8F9';

const ROW_H = 16;
const HEAD_H = 19;

export const generateStudentCountsPDF = (colleges, meta) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument(pageOptions());
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = MARGIN.left;
      const R = doc.page.width - MARGIN.right;
      const W = R - L;
      const FLOOR = doc.page.height - MARGIN.bottom;

      // Figure columns are fixed width and right-aligned; the name column takes
      // whatever is left, so long college names use the space rather than the
      // numbers drifting about.
      const NUM = 66;
      const COL = {
        name: { x: L, w: W - NUM * 3 },
        approved: { x: R - NUM * 3, w: NUM },
        pending: { x: R - NUM * 2, w: NUM },
        total: { x: R - NUM, w: NUM },
      };

      const line = (x1, y1, x2, y2, colour = GRID, w = 0.6) => {
        doc.save().lineWidth(w).strokeColor(colour).moveTo(x1, y1).lineTo(x2, y2).stroke().restore();
      };
      const box = (y, h, fill) => {
        if (fill) doc.save().rect(L, y, W, h).fill(fill).restore();
      };
      /** The vertical rules, drawn per row so they never outrun the table. */
      const verticals = (y, h) => {
        for (const x of [L, COL.approved.x, COL.pending.x, COL.total.x, R]) {
          line(x, y, x, y + h);
        }
      };

      /* --------------------------------------------------------- title block */
      const title = () => {
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(15)
          .text('Student Registration Counts', L, MARGIN.top, { width: W });
        doc.moveDown(0.25);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
          .text(meta.scopeLabel, { width: W });
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
          .text(`Generated ${meta.generatedAt.toLocaleString('en-IN')}`, { width: W })
          .text(meta.basis, { width: W });
        return doc.y + 10;
      };

      /* ------------------------------------------------------- header band */
      const header = (y) => {
        box(y, HEAD_H, BAND);
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(7.5);
        const ty = y + 6;
        doc.text('COLLEGE', COL.name.x + 5, ty, { width: COL.name.w - 10, lineBreak: false });
        doc.text('APPROVED', COL.approved.x, ty, { width: COL.approved.w - 5, align: 'right', lineBreak: false });
        doc.text('PENDING', COL.pending.x, ty, { width: COL.pending.w - 5, align: 'right', lineBreak: false });
        doc.text('TOTAL', COL.total.x, ty, { width: COL.total.w - 5, align: 'right', lineBreak: false });
        verticals(y, HEAD_H);
        line(L, y, R, y, INK, 1);                 // top of the table
        line(L, y + HEAD_H, R, y + HEAD_H, INK, 1); // under the band
        return y + HEAD_H;
      };

      /* ------------------------------------------------------------- a row */
      const row = (y, label, r, opts = {}) => {
        const { bold = false, indent = 0, fill = null, muted = false } = opts;
        box(y, ROW_H, fill);
        doc.fillColor(muted ? MUTED : INK)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 8.5 : 8);
        const ty = y + 5;
        doc.text(label, COL.name.x + 5 + indent, ty,
          { width: COL.name.w - 10 - indent, lineBreak: false, ellipsis: true });
        for (const key of ['approved', 'pending', 'total']) {
          doc.text(String(r[key] ?? 0), COL[key].x, ty,
            { width: COL[key].w - 5, align: 'right', lineBreak: false });
        }
        verticals(y, ROW_H);
        line(L, y + ROW_H, R, y + ROW_H);
        return y + ROW_H;
      };

      let y = header(title());

      const room = (needed) => {
        if (y + needed <= FLOOR) return;
        doc.addPage(pageOptions());
        y = header(MARGIN.top);
      };

      /* ----------------------------------------------------------- the body */
      let zebra = false;
      if (meta.detail === 'college') {
        for (const c of colleges) {
          room(ROW_H);
          y = row(y, c.college_name, c, { fill: zebra ? ZEBRA : null });
          zebra = !zebra;
        }
      } else {
        for (const c of colleges) {
          // A college heading alone at the foot of a page is worse than a
          // slightly short page, so keep it with its first branch.
          room(ROW_H * 2);
          y = row(y, c.college_name, c, { bold: true, fill: BAND });
          if (c.branches.length === 0) {
            room(ROW_H);
            y = row(y, 'No students registered', { approved: 0, pending: 0, total: 0 },
              { indent: 12, muted: true });
          }
          for (const b of c.branches) {
            room(ROW_H);
            y = row(y, b.branch, b, { indent: 12, muted: true });
          }
        }
      }

      /* ----------------------------------------------------------- the total */
      room(ROW_H + 2);
      y = row(y, `${meta.collegeCount} college${meta.collegeCount === 1 ? '' : 's'}`,
        meta.grand, { bold: true, fill: BAND });
      line(L, y, R, y, INK, 1);   // closes the table

      /* --------------------------------------------------------- page numbers
       * Written last, once every page exists.
       *
       * The footer sits below the bottom margin, and PDFKit treats text that
       * does not fit inside the margin box as an overflow and helpfully starts
       * a new page for it — which then gets a footer of its own, and so on. The
       * first version of this produced three blank numbered pages after three
       * pages of content, and numbered them "of 3" because the count had been
       * read before they existed. Dropping the bottom margin to zero for the
       * duration means the footer is inside the box and no page is created.
       */
      const range = doc.bufferedPageRange();
      // Measured once, from the page itself, so nothing below can move it.
      const footerY = doc.page.height - 34;
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        const keep = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
          .text(`Page ${i + 1} of ${range.count}`,
            L, footerY, { width: W, align: 'center', lineBreak: false });
        doc.page.margins.bottom = keep;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

/**
 * The consolidated student-count report as a PDF.
 *
 * Its own module rather than another generator inside pdfGenerator.js, which is
 * already several thousand lines. Kept deliberately plain: this is a table of
 * figures somebody prints or forwards, so it needs headers that repeat on every
 * page and totals that are obviously totals.
 */

import PDFDocument from 'pdfkit';

// bufferPages, because the footer numbers every page once the count is
// known — without it switchToPage throws and the whole export fails.
const PAGE = { size: 'A4', bufferPages: true, margins: { top: 44, bottom: 52, left: 44, right: 44 } };
const INK = '#10141A';
const MUTED = '#5C6570';
const RULE = '#C6CBD3';

const money = (n) => String(n ?? 0);

export const generateStudentCountsPDF = (colleges, meta) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument(PAGE);
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const width = right - left;
      const bottomLimit = doc.page.height - doc.page.margins.bottom;

      const rule = (y, colour = RULE, w = 0.7) => {
        doc.save().lineWidth(w).strokeColor(colour)
          .moveTo(left, y).lineTo(right, y).stroke().restore();
      };

      /* ------------------------------------------------------------ header */
      doc.fillColor(INK).fontSize(16).font('Helvetica-Bold')
        .text('Student Registration Counts', left, doc.y);
      doc.moveDown(0.2);
      doc.fontSize(9.5).font('Helvetica').fillColor(MUTED)
        .text(meta.scopeLabel, { width })
        .text(`Generated ${meta.generatedAt.toLocaleString('en-IN')}`, { width })
        .text(meta.basis, { width });
      doc.moveDown(0.5);
      rule(doc.y, INK, 1.2);
      doc.moveDown(0.6);

      /* ------------------------------------------------- the summary table */
      // Right-aligned figure columns, measured from the right edge so they line
      // up whatever the college name does.
      const numW = 62;
      const cols = {
        name: { x: left, w: width - numW * 3 - 8 },
        approved: { x: right - numW * 3, w: numW },
        pending: { x: right - numW * 2, w: numW },
        total: { x: right - numW, w: numW },
      };

      const headerRow = (y, first) => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(MUTED);
        doc.text(first.toUpperCase(), cols.name.x, y, { width: cols.name.w });
        doc.text('APPROVED', cols.approved.x, y, { width: cols.approved.w, align: 'right' });
        doc.text('PENDING', cols.pending.x, y, { width: cols.pending.w, align: 'right' });
        doc.text('TOTAL', cols.total.x, y, { width: cols.total.w, align: 'right' });
        rule(y + 12, INK, 1);
        return y + 18;
      };

      const ensureRoom = (y, needed, headerLabel) => {
        if (y + needed <= bottomLimit) return y;
        doc.addPage(PAGE);
        return headerRow(doc.page.margins.top, headerLabel);
      };

      const dataRow = (y, label, r, { bold = false, indent = 0 } = {}) => {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(INK);
        doc.text(label, cols.name.x + indent, y, {
          width: cols.name.w - indent, ellipsis: true, lineBreak: false,
        });
        doc.text(money(r.approved), cols.approved.x, y, { width: cols.approved.w, align: 'right' });
        doc.text(money(r.pending), cols.pending.x, y, { width: cols.pending.w, align: 'right' });
        doc.text(money(r.total), cols.total.x, y, { width: cols.total.w, align: 'right' });
        return y + 15;
      };

      let y = headerRow(doc.y, 'College');

      if (meta.detail === 'college') {
        for (const c of colleges) {
          y = ensureRoom(y, 15, 'College');
          y = dataRow(y, c.college_name, c);
        }
      } else {
        for (const c of colleges) {
          // Keep a college's heading with at least its first branch rather than
          // stranding a name alone at the foot of a page.
          y = ensureRoom(y, 34, 'College');
          y = dataRow(y, c.college_name, c, { bold: true });
          if (c.branches.length === 0) {
            doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(MUTED)
              .text('No students registered', cols.name.x + 14, y, { width: cols.name.w - 14 });
            y += 14;
          }
          for (const b of c.branches) {
            y = ensureRoom(y, 15, 'College');
            doc.fontSize(8.5).font('Helvetica').fillColor(MUTED);
            doc.text(b.branch, cols.name.x + 14, y, {
              width: cols.name.w - 14, ellipsis: true, lineBreak: false,
            });
            doc.text(money(b.approved), cols.approved.x, y, { width: cols.approved.w, align: 'right' });
            doc.text(money(b.pending), cols.pending.x, y, { width: cols.pending.w, align: 'right' });
            doc.text(money(b.total), cols.total.x, y, { width: cols.total.w, align: 'right' });
            y += 13;
          }
          y += 4;
        }
      }

      /* -------------------------------------------------------- grand total */
      y = ensureRoom(y, 30, 'College');
      rule(y, INK, 1);
      y += 5;
      y = dataRow(y, `${meta.collegeCount} colleges`, meta.grand, { bold: true });

      /* ------------------------------------------------------- page numbers */
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).font('Helvetica').fillColor(MUTED)
          .text(`Page ${i + 1} of ${range.count}`,
            left, doc.page.height - doc.page.margins.bottom + 18,
            { width, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

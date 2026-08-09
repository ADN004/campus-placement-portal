/**
 * The consolidated student-count export.
 *
 * How many students are registered, per college and optionally per branch,
 * across the whole state or a chosen slice of it. There was no way to answer
 * that without opening each college in turn.
 *
 * One query underneath both breakdowns. The college totals are the branch rows
 * summed, not a second count of the same students by a different route — two
 * queries would eventually disagree, and a summary that contradicts its own
 * detail is worse than no summary.
 */

import ExcelJS from 'exceljs';
import { query } from '../config/database.js';
import { generateStudentCountsPDF } from '../utils/studentCountsPdf.js';

/**
 * What "registered" counts.
 *
 * Approved and pending are reported separately and summed, because the honest
 * answer depends on who is asking: "how many students do we have" usually means
 * approved, while "how many have registered" includes those still waiting.
 * Naming both columns means the file answers either without anyone having to
 * know which one it chose.
 *
 * Rejected registrations are left out — they are not students. So are students
 * archived by a year-end reset: they have passed out, and counting last year's
 * intake in this year's roll would overstate every college. Both exclusions are
 * printed on the file rather than left for the reader to guess.
 */
const COUNT_BASIS = `
  s.registration_status IN ('approved', 'pending')
  AND s.archived_academic_year IS NULL
`;

/** Resolve the requested scope into a WHERE fragment and its parameters. */
const buildScope = (params, { scope, college_id, region_ids }) => {
  if (scope === 'college') {
    const id = Number(college_id);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: 'Select a college to export.' };
    }
    params.push(id);
    return { clause: `AND c.id = $${params.length}`, label: null, collegeId: id };
  }

  if (scope === 'region') {
    const ids = (Array.isArray(region_ids) ? region_ids : String(region_ids || '').split(','))
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return { error: 'Select at least one region to export.' };
    }
    params.push(ids);
    return { clause: `AND c.region_id = ANY($${params.length}::int[])`, regionIds: ids };
  }

  return { clause: '' };
};

/**
 * Every college in scope with its per-branch counts.
 *
 * A LEFT JOIN, so a college with no students at all still appears with a zero
 * rather than vanishing. A missing college in a statewide count reads as an
 * oversight; a zero reads as a fact, and it is usually the row someone is
 * looking for.
 */
const fetchCounts = async (scopeSql, params) => {
  const rows = await query(
    `SELECT c.id   AS college_id,
            c.college_name,
            c.college_code,
            r.id   AS region_id,
            r.region_name,
            COALESCE(NULLIF(TRIM(s.branch), ''), 'Not recorded') AS branch,
            COUNT(*) FILTER (WHERE s.registration_status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE s.registration_status = 'pending')::int  AS pending
       FROM colleges c
       JOIN regions r ON r.id = c.region_id
       LEFT JOIN students s ON s.college_id = c.id AND ${COUNT_BASIS}
      WHERE 1 = 1 ${scopeSql}
      GROUP BY c.id, c.college_name, c.college_code, r.id, r.region_name,
               COALESCE(NULLIF(TRIM(s.branch), ''), 'Not recorded')
      ORDER BY r.region_name, c.college_name, branch`,
    params
  );

  // Fold into colleges, so the totals are the branch rows added up.
  const byCollege = new Map();
  for (const row of rows.rows) {
    if (!byCollege.has(row.college_id)) {
      byCollege.set(row.college_id, {
        college_id: row.college_id,
        college_name: row.college_name,
        college_code: row.college_code,
        region_name: row.region_name,
        branches: [],
        approved: 0,
        pending: 0,
        total: 0,
      });
    }
    const college = byCollege.get(row.college_id);
    // The LEFT JOIN gives one all-null row for a college with no students.
    const hasStudents = row.approved > 0 || row.pending > 0;
    if (hasStudents) {
      college.branches.push({
        branch: row.branch,
        approved: row.approved,
        pending: row.pending,
        total: row.approved + row.pending,
      });
      college.approved += row.approved;
      college.pending += row.pending;
      college.total += row.approved + row.pending;
    }
  }
  return [...byCollege.values()];
};

/** GET /api/super-admin/exports/student-counts */
export const exportStudentCounts = async (req, res) => {
  try {
    const {
      detail = 'branch',
      scope = 'all',
      format = 'pdf',
      college_id,
      region_ids,
    } = req.query;

    if (!['branch', 'college'].includes(detail)) {
      return res.status(400).json({ success: false, message: 'detail must be branch or college' });
    }
    if (!['all', 'college', 'region'].includes(scope)) {
      return res.status(400).json({ success: false, message: 'scope must be all, college or region' });
    }
    if (!['pdf', 'excel', 'json'].includes(format)) {
      return res.status(400).json({ success: false, message: 'format must be pdf, excel or json' });
    }

    const params = [];
    const resolved = buildScope(params, { scope, college_id, region_ids });
    if (resolved.error) {
      return res.status(400).json({ success: false, message: resolved.error });
    }

    const colleges = await fetchCounts(resolved.clause, params);
    if (colleges.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No colleges match that selection.',
      });
    }

    const grand = colleges.reduce(
      (acc, c) => ({
        approved: acc.approved + c.approved,
        pending: acc.pending + c.pending,
        total: acc.total + c.total,
      }),
      { approved: 0, pending: 0, total: 0 }
    );

    const scopeLabel =
      scope === 'college' ? colleges[0].college_name
        : scope === 'region' ? `${[...new Set(colleges.map((c) => c.region_name))].join(', ')}`
        : 'All colleges';

    const meta = {
      detail,
      scopeLabel,
      generatedAt: new Date(),
      collegeCount: colleges.length,
      grand,
      basis: 'Counts approved and pending registrations. Rejected registrations and '
        + 'students archived by a year-end reset are excluded.',
    };

    // Used by the screen to show the totals before anyone downloads anything.
    if (format === 'json') {
      return res.json({ success: true, data: { colleges, meta } });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const base = `student-counts-${detail}-${stamp}`;

    if (format === 'excel') {
      const workbook = await buildWorkbook(colleges, meta);
      res.setHeader('Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    const pdf = await generateStudentCountsPDF(colleges, meta);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
    return res.end(pdf);
  } catch (error) {
    console.error('Student count export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating the export',
      error: error.message,
    });
  }
};

/* --------------------------------------------------------------- workbook */

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAED' } };

const styleHeader = (row) => {
  row.font = { bold: true };
  row.eachCell((cell) => { cell.fill = HEADER_FILL; });
};

/**
 * Summary first, then a sheet per college when the branch breakdown was asked
 * for. Sheet names are capped at Excel's 31 characters and stripped of the
 * characters it refuses, or the workbook fails to open with no useful error.
 */
const safeSheetName = (name, used) => {
  let base = String(name).replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 28) || 'College';
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 28 - String(n).length - 1)} ${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
};

const buildWorkbook = async (colleges, meta) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'State Placement Cell';
  wb.created = meta.generatedAt;

  const summary = wb.addWorksheet('Summary');
  summary.addRow(['Student registration counts']).font = { bold: true, size: 14 };
  summary.addRow([`Scope: ${meta.scopeLabel}`]);
  summary.addRow([`Generated: ${meta.generatedAt.toLocaleString('en-IN')}`]);
  summary.addRow([meta.basis]);
  summary.addRow([]);

  styleHeader(summary.addRow(['Region', 'College', 'Code', 'Approved', 'Pending', 'Total']));
  for (const c of colleges) {
    summary.addRow([c.region_name, c.college_name, c.college_code || '',
      c.approved, c.pending, c.total]);
  }
  summary.addRow([]);
  styleHeader(summary.addRow(['', `${meta.collegeCount} colleges`, '',
    meta.grand.approved, meta.grand.pending, meta.grand.total]));
  summary.columns = [
    { width: 18 }, { width: 40 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 },
  ];

  if (meta.detail === 'branch') {
    const used = new Set(['Summary']);
    for (const c of colleges) {
      const ws = wb.addWorksheet(safeSheetName(c.college_name, used));
      ws.addRow([c.college_name]).font = { bold: true, size: 13 };
      ws.addRow([`${c.region_name}${c.college_code ? ` · ${c.college_code}` : ''}`]);
      ws.addRow([]);
      styleHeader(ws.addRow(['Branch', 'Approved', 'Pending', 'Total']));
      if (c.branches.length === 0) {
        ws.addRow(['No students registered', 0, 0, 0]);
      } else {
        for (const b of c.branches) ws.addRow([b.branch, b.approved, b.pending, b.total]);
        styleHeader(ws.addRow(['Total', c.approved, c.pending, c.total]));
      }
      ws.columns = [{ width: 46 }, { width: 12 }, { width: 12 }, { width: 12 }];
    }
  }

  return wb;
};

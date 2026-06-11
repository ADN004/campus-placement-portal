import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { query, transaction } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';

/**
 * Bulk Import Controller — colleges & placement officers from Excel
 *
 * Lets the super admin set up (or extend) a deployment from the UI instead
 * of editing database/seed-data.sql:
 *
 *   GET  /api/super-admin/import/template  → downloadable .xlsx template
 *   POST /api/super-admin/import/data      → upload filled template
 *        body: mode = 'validate' (dry run, default) | 'commit'
 *              officer_conflict = 'skip' (default) | 'replace'
 *
 * The workbook has two optional data sheets — "Colleges" and "Officers".
 * Colleges are processed before officers, so a single file can create a
 * college and assign its officer in one upload.
 *
 * Commit is all-or-nothing: if ANY row has an error the import is refused,
 * so a half-imported file can never happen. Rows whose records already
 * exist are reported as "skipped" and do not block the import.
 *
 * Officer account convention mirrors addPlacementOfficer in
 * superAdminController.js: login = phone number, default password '123'.
 */

const COLLEGE_HEADERS = ['college_name', 'college_code', 'region', 'branches', 'sort_order'];
const OFFICER_HEADERS = [
  'college_code',
  'officer_name',
  'phone_number',
  'designation',
  'officer_email',
  'college_email',
];

// ========================================
// HELPERS
// ========================================

/**
 * ExcelJS cell values can be strings, numbers, dates, or objects
 * (hyperlinks, rich text, formulas). Normalize everything to a trimmed string.
 */
const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.text !== undefined) return String(value.text).trim();
    if (value.result !== undefined) return String(value.result).trim();
    if (value.richText) return value.richText.map((p) => p.text).join('').trim();
    return '';
  }
  return String(value).trim();
};

/** Read a sheet into [{ rowNumber, values: { header: text } }], skipping blank rows. */
const readSheet = (workbook, sheetName, headers) => {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return [];

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    const values = {};
    headers.forEach((header, idx) => {
      values[header] = cellText(row.getCell(idx + 1).value);
    });
    if (Object.values(values).some((v) => v !== '')) {
      rows.push({ rowNumber, values });
    }
  });
  return rows;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Strip spaces/dashes; valid phones are 7–15 digits. Returns null when invalid. */
const cleanPhone = (raw) => {
  const digits = raw.replace(/[\s\-()+]/g, '');
  return /^\d{7,15}$/.test(digits) ? digits : null;
};

/**
 * Validate every row of both sheets against the database and each other.
 * Pure read-only — used by both the dry run and the pre-commit check.
 */
const validateImport = async (collegeRows, officerRows, officerConflict) => {
  const results = { colleges: [], officers: [] };

  // --- Reference data ---
  const regionsResult = await query('SELECT id, region_name, region_code FROM regions');
  const regionLookup = new Map();
  regionsResult.rows.forEach((r) => {
    regionLookup.set(r.region_name.toLowerCase(), r.id);
    regionLookup.set(r.region_code.toLowerCase(), r.id);
  });

  const collegesResult = await query('SELECT id, college_name, college_code FROM colleges');
  const collegeByCode = new Map();
  const collegeNames = new Set();
  collegesResult.rows.forEach((c) => {
    collegeByCode.set(c.college_code.toLowerCase(), c);
    collegeNames.add(c.college_name.toLowerCase());
  });

  const officersResult = await query(
    `SELECT po.college_id, po.phone_number, c.college_code
     FROM placement_officers po JOIN colleges c ON po.college_id = c.id
     WHERE po.is_active = TRUE`
  );
  const collegesWithOfficer = new Set(officersResult.rows.map((o) => o.college_code.toLowerCase()));

  const usersResult = await query(
    `SELECT email, role, is_active FROM users WHERE role != 'student'`
  );
  const userByLogin = new Map(usersResult.rows.map((u) => [u.email.toLowerCase(), u]));

  // --- Colleges sheet ---
  const seenCodes = new Set();
  const seenNames = new Set();
  const newCollegeCodes = new Set(); // codes that will exist after this import

  for (const { rowNumber, values } of collegeRows) {
    const name = values.college_name;
    const code = values.college_code.toUpperCase();
    const entry = { row: rowNumber, data: { ...values, college_code: code } };

    if (!name || !code || !values.region) {
      entry.status = 'error';
      entry.message = 'college_name, college_code and region are required';
    } else if (seenCodes.has(code.toLowerCase()) || seenNames.has(name.toLowerCase())) {
      entry.status = 'error';
      entry.message = 'Duplicate college name/code earlier in this file';
    } else if (!regionLookup.has(values.region.toLowerCase())) {
      entry.status = 'error';
      entry.message = `Region "${values.region}" not found — create it first on the Manage Colleges page`;
    } else if (values.sort_order && isNaN(parseInt(values.sort_order))) {
      entry.status = 'error';
      entry.message = 'sort_order must be a number';
    } else if (collegeByCode.has(code.toLowerCase()) || collegeNames.has(name.toLowerCase())) {
      entry.status = 'skip';
      entry.message = 'College already exists — row skipped';
    } else {
      entry.status = 'ok';
      entry.message = 'Will be created';
      entry.regionId = regionLookup.get(values.region.toLowerCase());
      newCollegeCodes.add(code.toLowerCase());
    }

    seenCodes.add(code.toLowerCase());
    seenNames.add(name.toLowerCase());
    results.colleges.push(entry);
  }

  // --- Officers sheet ---
  const seenPhones = new Set();
  const claimedColleges = new Set(); // colleges getting an officer earlier in this file

  for (const { rowNumber, values } of officerRows) {
    const code = values.college_code.toUpperCase();
    const codeKey = code.toLowerCase();
    const phone = values.phone_number ? cleanPhone(values.phone_number) : null;
    const entry = { row: rowNumber, data: { ...values, college_code: code } };

    const collegeExists = collegeByCode.has(codeKey) || newCollegeCodes.has(codeKey);
    const existingUser = phone ? userByLogin.get(phone) : undefined;

    if (!code || !values.officer_name || !values.phone_number) {
      entry.status = 'error';
      entry.message = 'college_code, officer_name and phone_number are required';
    } else if (!phone) {
      entry.status = 'error';
      entry.message = `Invalid phone number "${values.phone_number}" (digits only, 7–15)`;
    } else if (!collegeExists) {
      entry.status = 'error';
      entry.message = `College code "${code}" not found (not in database or Colleges sheet)`;
    } else if (seenPhones.has(phone)) {
      entry.status = 'error';
      entry.message = 'Duplicate phone number earlier in this file';
    } else if (claimedColleges.has(codeKey)) {
      entry.status = 'error';
      entry.message = 'Another row in this file already assigns an officer to this college';
    } else if (existingUser && existingUser.is_active && existingUser.role !== 'placement_officer') {
      entry.status = 'error';
      entry.message = 'This phone number is already registered with a different role';
    } else if (values.officer_email && !isValidEmail(values.officer_email)) {
      entry.status = 'error';
      entry.message = `Invalid officer_email "${values.officer_email}"`;
    } else if (values.college_email && !isValidEmail(values.college_email)) {
      entry.status = 'error';
      entry.message = `Invalid college_email "${values.college_email}"`;
    } else if (collegesWithOfficer.has(codeKey) && officerConflict === 'skip') {
      entry.status = 'skip';
      entry.message = 'College already has an active officer — row skipped (choose "replace" to override)';
    } else {
      entry.status = 'ok';
      entry.phone = phone;
      entry.message = collegesWithOfficer.has(codeKey)
        ? 'Will REPLACE the current officer (old one moves to history)'
        : 'Will be created';
      claimedColleges.add(codeKey);
    }

    if (phone) seenPhones.add(phone);
    results.officers.push(entry);
  }

  return results;
};

const summarize = (entries) => ({
  total: entries.length,
  ok: entries.filter((e) => e.status === 'ok').length,
  skipped: entries.filter((e) => e.status === 'skip').length,
  errors: entries.filter((e) => e.status === 'error').length,
});

// ========================================
// TEMPLATE DOWNLOAD
// ========================================

// @desc    Download the Excel import template
// @route   GET /api/super-admin/import/template
// @access  Private (Super Admin)
export const downloadImportTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // --- Instructions sheet ---
    const info = workbook.addWorksheet('Instructions');
    info.columns = [{ width: 110 }];
    [
      'BULK IMPORT TEMPLATE — Colleges & Placement Officers',
      '',
      'HOW TO USE',
      '1. Fill the "Colleges" sheet and/or the "Officers" sheet. Either sheet may be left empty.',
      '2. Do not change the header row or sheet names.',
      '3. Upload this file on the Manage Colleges page → Bulk Import.',
      '4. The site first VALIDATES the file and shows a preview — nothing is saved until you confirm.',
      '',
      'COLLEGES SHEET',
      '• region must match an existing region name or code (see the "Regions" sheet here).',
      '• branches is optional: separate multiple branches with commas.',
      '• sort_order is optional: lower numbers appear first in lists.',
      '• Colleges that already exist (same name or code) are skipped, never modified.',
      '',
      'OFFICERS SHEET',
      '• college_code must match an existing college or a row in the Colleges sheet.',
      '• phone_number becomes the officer’s LOGIN USERNAME.',
      `• New officers can log in with the default password '123' and should change it immediately.`,
      '• If a college already has an officer, the row is skipped unless you pick "Replace" when uploading.',
      '',
      'The example rows below the headers are samples — replace them with real data.',
    ].forEach((line) => info.addRow([line]));
    info.getRow(1).font = { bold: true, size: 14 };
    [3, 9, 16].forEach((n) => (info.getRow(n).font = { bold: true }));

    // --- Colleges sheet ---
    const colleges = workbook.addWorksheet('Colleges');
    colleges.columns = [
      { header: 'college_name', width: 45 },
      { header: 'college_code', width: 16 },
      { header: 'region', width: 18 },
      { header: 'branches', width: 60 },
      { header: 'sort_order', width: 12 },
    ];
    colleges.getRow(1).font = { bold: true };
    colleges.addRow([
      'Government Polytechnic College Example',
      'GPC_EXM',
      'Central',
      'Computer Engineering, Electronics Engineering, Mechanical Engineering',
      '10',
    ]);

    // --- Officers sheet ---
    const officers = workbook.addWorksheet('Officers');
    officers.columns = [
      { header: 'college_code', width: 16 },
      { header: 'officer_name', width: 30 },
      { header: 'phone_number', width: 16 },
      { header: 'designation', width: 20 },
      { header: 'officer_email', width: 32 },
      { header: 'college_email', width: 32 },
    ];
    officers.getRow(1).font = { bold: true };
    officers.addRow([
      'GPC_EXM',
      'Jane Example',
      '9000000001',
      'Lecturer in CS',
      'jane@example.com',
      'placement@example.edu',
    ]);

    // --- Regions reference sheet ---
    const regionsSheet = workbook.addWorksheet('Regions');
    regionsSheet.columns = [
      { header: 'region_name', width: 24 },
      { header: 'region_code', width: 16 },
    ];
    regionsSheet.getRow(1).font = { bold: true };
    const regionsResult = await query('SELECT region_name, region_code FROM regions ORDER BY region_name');
    regionsResult.rows.forEach((r) => regionsSheet.addRow([r.region_name, r.region_code]));

    // --- Existing colleges reference sheet ---
    const existingSheet = workbook.addWorksheet('Existing Colleges');
    existingSheet.columns = [
      { header: 'college_code', width: 16 },
      { header: 'college_name', width: 45 },
      { header: 'region', width: 18 },
      { header: 'has_active_officer', width: 18 },
    ];
    existingSheet.getRow(1).font = { bold: true };
    const existingResult = await query(
      `SELECT c.college_code, c.college_name, r.region_name,
              EXISTS (SELECT 1 FROM placement_officers po WHERE po.college_id = c.id AND po.is_active = TRUE) AS has_officer
       FROM colleges c JOIN regions r ON c.region_id = r.id
       ORDER BY r.region_name, c.college_name`
    );
    existingResult.rows.forEach((c) =>
      existingSheet.addRow([c.college_code, c.college_name, c.region_name, c.has_officer ? 'yes' : 'no'])
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-import-template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Download import template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating import template',
    });
  }
};

// ========================================
// IMPORT (VALIDATE / COMMIT)
// ========================================

// @desc    Validate or commit a filled import template
// @route   POST /api/super-admin/import/data  (multipart, field "file")
// @access  Private (Super Admin)
export const importData = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a .xlsx file (use the downloadable template)',
      });
    }

    const mode = req.body.mode === 'commit' ? 'commit' : 'validate';
    const officerConflict = req.body.officer_conflict === 'replace' ? 'replace' : 'skip';

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(req.file.buffer);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Could not read the file — make sure it is a valid .xlsx file',
      });
    }

    const collegeRows = readSheet(workbook, 'Colleges', COLLEGE_HEADERS);
    const officerRows = readSheet(workbook, 'Officers', OFFICER_HEADERS);

    if (collegeRows.length === 0 && officerRows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No data found. Fill the "Colleges" and/or "Officers" sheet of the template (do not rename the sheets).',
      });
    }

    const results = await validateImport(collegeRows, officerRows, officerConflict);
    const summary = {
      colleges: summarize(results.colleges),
      officers: summarize(results.officers),
    };
    const totalErrors = summary.colleges.errors + summary.officers.errors;
    const totalOk = summary.colleges.ok + summary.officers.ok;

    if (mode === 'validate') {
      return res.status(200).json({
        success: true,
        data: { mode, officer_conflict: officerConflict, summary, results },
      });
    }

    // --- COMMIT ---
    if (totalErrors > 0) {
      return res.status(400).json({
        success: false,
        message: `Import refused: ${totalErrors} row(s) have errors. Fix them in the file and upload again.`,
        data: { mode, summary, results },
      });
    }
    if (totalOk === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to import — every row already exists or was skipped.',
        data: { mode, summary, results },
      });
    }

    await transaction(async (client) => {
      // 1. Colleges first, building code → id for officer rows
      const collegeIdByCode = new Map();

      for (const entry of results.colleges) {
        if (entry.status !== 'ok') continue;
        const branches = entry.data.branches
          ? entry.data.branches.split(',').map((b) => b.trim()).filter(Boolean)
          : [];
        const insertResult = await client.query(
          `INSERT INTO colleges (college_name, college_code, region_id, branches, sort_order)
           VALUES ($1, $2, $3, $4::jsonb, $5)
           RETURNING id`,
          [
            entry.data.college_name,
            entry.data.college_code,
            entry.regionId,
            JSON.stringify(branches),
            entry.data.sort_order ? parseInt(entry.data.sort_order) : 999,
          ]
        );
        collegeIdByCode.set(entry.data.college_code.toLowerCase(), insertResult.rows[0].id);
      }

      // 2. Officers — mirrors the single-add flow in addPlacementOfficer
      //    (history record, deactivation, user reuse, default password '123')
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123', salt);

      for (const entry of results.officers) {
        if (entry.status !== 'ok') continue;

        const codeKey = entry.data.college_code.toLowerCase();
        let collegeId = collegeIdByCode.get(codeKey);
        if (!collegeId) {
          const collegeResult = await client.query(
            'SELECT id FROM colleges WHERE LOWER(college_code) = $1',
            [codeKey]
          );
          collegeId = collegeResult.rows[0].id;
        }

        // Replace any existing active officer (only reachable with officer_conflict=replace)
        const existingOfficerResult = await client.query(
          'SELECT * FROM placement_officers WHERE college_id = $1 AND is_active = TRUE',
          [collegeId]
        );
        if (existingOfficerResult.rows.length > 0) {
          const old = existingOfficerResult.rows[0];
          await client.query(
            `INSERT INTO placement_officer_history
             (college_id, officer_name, phone_number, designation, officer_email, appointed_date, removed_by, removal_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              old.college_id,
              old.officer_name,
              old.phone_number,
              old.designation,
              old.officer_email,
              old.appointed_date,
              req.user.id,
              'Replaced via bulk import',
            ]
          );
          await client.query('UPDATE placement_officers SET is_active = FALSE WHERE id = $1', [old.id]);
          await client.query('UPDATE users SET is_active = FALSE WHERE id = $1', [old.user_id]);
        }

        // Reuse an existing user account for this phone, or create one
        const existingUserResult = await client.query(
          'SELECT id, is_active, role FROM users WHERE email = $1',
          [entry.phone]
        );

        let userId;
        if (existingUserResult.rows.length > 0) {
          const existingUser = existingUserResult.rows[0];
          if (existingUser.is_active && existingUser.role !== 'placement_officer') {
            throw new Error(
              `Row ${entry.row}: phone ${entry.phone} is already registered with a different role`
            );
          }
          await client.query(
            `UPDATE users SET password_hash = $1, role = 'placement_officer', is_active = TRUE WHERE id = $2`,
            [hashedPassword, existingUser.id]
          );
          userId = existingUser.id;
          await client.query(
            'UPDATE placement_officers SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
            [userId]
          );
        } else {
          const userResult = await client.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, 'placement_officer')
             RETURNING id`,
            [entry.phone, hashedPassword]
          );
          userId = userResult.rows[0].id;
        }

        await client.query(
          `INSERT INTO placement_officers
           (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email, appointed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            collegeId,
            entry.data.officer_name,
            entry.phone,
            entry.data.designation || null,
            entry.data.officer_email || null,
            entry.data.college_email || null,
            req.user.id,
          ]
        );
      }
    });

    await logActivity(
      req.user.id,
      'BULK_IMPORT',
      `Bulk import: created ${summary.colleges.ok} colleges and ${summary.officers.ok} officers from ${req.file.originalname}`,
      'bulk_import',
      null,
      req,
      { summary, officer_conflict: officerConflict, filename: req.file.originalname }
    );

    res.status(200).json({
      success: true,
      message: `Import complete: ${summary.colleges.ok} colleges and ${summary.officers.ok} officers created`,
      data: { mode, summary, results },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing import',
    });
  }
};

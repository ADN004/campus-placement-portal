#!/usr/bin/env node

/**
 * Database Command Utility
 *
 * Interactive CLI tool to view and manage database information
 * Run with: node database/db-commands.js [command]
 *
 * Available commands:
 *   stats        - Show database statistics
 *   tables       - List all tables with row counts
 *   students     - View student statistics by status/college/region
 *   jobs         - View job statistics
 *   users        - View user statistics by role
 *   colleges     - List all colleges with student counts
 *   regions      - List all regions with statistics
 *   recent       - Show recent activity
 *   help         - Show this help message
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend
dotenv.config({ path: join(__dirname, '../backend/.env') });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campus_placement_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_postgres_password',
});

// Utility functions
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const formatNumber = (num) => num.toLocaleString();

const printHeader = (title) => {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
};

const printTable = (data, columns) => {
  if (data.length === 0) {
    console.log('  No data found.');
    return;
  }

  const colWidths = {};
  columns.forEach(col => {
    colWidths[col.key] = Math.max(
      col.label.length,
      ...data.map(row => String(row[col.key] || '').length)
    );
  });

  // Print header
  const headerRow = columns.map(col => col.label.padEnd(colWidths[col.key])).join('  ');
  console.log('  ' + headerRow);
  console.log('  ' + columns.map(col => '-'.repeat(colWidths[col.key])).join('  '));

  // Print rows
  data.forEach(row => {
    const dataRow = columns.map(col => {
      let value = row[col.key];
      if (col.format) value = col.format(value);
      return String(value || '').padEnd(colWidths[col.key]);
    }).join('  ');
    console.log('  ' + dataRow);
  });

  console.log(`\n  Total: ${data.length} rows\n`);
};

// Command implementations
const commands = {
  async stats() {
    printHeader('DATABASE STATISTICS');

    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM students WHERE registration_status = 'approved') as approved_students,
        (SELECT COUNT(*) FROM students WHERE registration_status = 'pending') as pending_students,
        (SELECT COUNT(*) FROM students WHERE registration_status = 'rejected') as rejected_students,
        (SELECT COUNT(*) FROM students WHERE is_blacklisted = true) as blacklisted_students,
        (SELECT COUNT(*) FROM placement_officers) as placement_officers,
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE is_active = true) as active_jobs,
        (SELECT COUNT(*) FROM job_applications) as total_applications,
        (SELECT COUNT(*) FROM colleges) as total_colleges,
        (SELECT COUNT(*) FROM regions) as total_regions,
        (SELECT COUNT(*) FROM prn_ranges WHERE is_enabled = true) as active_prn_ranges,
        (SELECT COUNT(*) FROM notifications) as total_notifications,
        (SELECT COUNT(*) FROM whitelist_requests WHERE status = 'pending') as pending_whitelist_requests,
        (SELECT COUNT(*) FROM activity_logs) as total_activity_logs
    `);

    const data = stats[0];
    console.log(`
  Total Users:                    ${formatNumber(data.total_users)}

  Students:
    - Total:                      ${formatNumber(data.total_students)}
    - Approved:                   ${formatNumber(data.approved_students)}
    - Pending:                    ${formatNumber(data.pending_students)}
    - Rejected:                   ${formatNumber(data.rejected_students)}
    - Blacklisted:                ${formatNumber(data.blacklisted_students)}

  Placement Officers:             ${formatNumber(data.placement_officers)}

  Jobs:
    - Total:                      ${formatNumber(data.total_jobs)}
    - Active:                     ${formatNumber(data.active_jobs)}
    - Applications:               ${formatNumber(data.total_applications)}

  Infrastructure:
    - Colleges:                   ${formatNumber(data.total_colleges)}
    - Regions:                    ${formatNumber(data.total_regions)}
    - Active PRN Ranges:          ${formatNumber(data.active_prn_ranges)}

  System:
    - Total Notifications:        ${formatNumber(data.total_notifications)}
    - Pending Whitelist Requests: ${formatNumber(data.pending_whitelist_requests)}
    - Activity Logs:              ${formatNumber(data.total_activity_logs)}
    `);
  },

  async tables() {
    printHeader('DATABASE TABLES');

    const tables = await query(`
      SELECT
        schemaname as schema,
        tablename as table,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = t.tablename) as columns,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables t
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    // Get row counts for each table
    for (let table of tables) {
      const count = await query(`SELECT COUNT(*) as count FROM ${table.table}`);
      table.rows = count[0].count;
    }

    printTable(tables, [
      { key: 'table', label: 'Table Name' },
      { key: 'rows', label: 'Rows', format: formatNumber },
      { key: 'columns', label: 'Columns' },
      { key: 'size', label: 'Size' },
    ]);
  },

  async students() {
    printHeader('STUDENT STATISTICS');

    console.log('\n  By Status:');
    const byStatus = await query(`
      SELECT
        registration_status as status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM students), 2) as percentage
      FROM students
      GROUP BY registration_status
      ORDER BY count DESC
    `);
    printTable(byStatus, [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Count', format: formatNumber },
      { key: 'percentage', label: 'Percentage', format: v => v + '%' },
    ]);

    console.log('\n  By College (Top 10):');
    const byCollege = await query(`
      SELECT
        c.college_name,
        COUNT(s.id) as student_count,
        COUNT(CASE WHEN s.registration_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN s.is_blacklisted = true THEN 1 END) as blacklisted
      FROM colleges c
      LEFT JOIN students s ON c.id = s.college_id
      GROUP BY c.id, c.college_name
      ORDER BY student_count DESC
      LIMIT 10
    `);
    printTable(byCollege, [
      { key: 'college_name', label: 'College' },
      { key: 'student_count', label: 'Total', format: formatNumber },
      { key: 'approved', label: 'Approved', format: formatNumber },
      { key: 'blacklisted', label: 'Blacklisted', format: formatNumber },
    ]);

    console.log('\n  By Region:');
    const byRegion = await query(`
      SELECT
        r.region_name,
        COUNT(s.id) as student_count,
        COUNT(CASE WHEN s.registration_status = 'approved' THEN 1 END) as approved,
        AVG(s.programme_cgpa) as avg_cgpa
      FROM regions r
      LEFT JOIN students s ON r.id = s.region_id
      GROUP BY r.id, r.region_name
      ORDER BY student_count DESC
    `);
    printTable(byRegion, [
      { key: 'region_name', label: 'Region' },
      { key: 'student_count', label: 'Total', format: formatNumber },
      { key: 'approved', label: 'Approved', format: formatNumber },
      { key: 'avg_cgpa', label: 'Avg CGPA', format: v => v ? parseFloat(v).toFixed(2) : 'N/A' },
    ]);
  },

  async jobs() {
    printHeader('JOB STATISTICS');

    const jobs = await query(`
      SELECT
        j.job_title,
        j.company_name,
        j.is_active,
        COUNT(ja.id) as applications,
        TO_CHAR(j.application_deadline, 'YYYY-MM-DD') as deadline,
        TO_CHAR(j.created_at, 'YYYY-MM-DD') as posted_on
      FROM jobs j
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      GROUP BY j.id, j.job_title, j.company_name, j.is_active, j.application_deadline, j.created_at
      ORDER BY j.created_at DESC
      LIMIT 15
    `);

    printTable(jobs, [
      { key: 'company_name', label: 'Company' },
      { key: 'job_title', label: 'Position' },
      { key: 'is_active', label: 'Active', format: v => v ? 'Yes' : 'No' },
      { key: 'applications', label: 'Applications', format: formatNumber },
      { key: 'deadline', label: 'Deadline' },
      { key: 'posted_on', label: 'Posted On' },
    ]);
  },

  async users() {
    printHeader('USER STATISTICS');

    const users = await query(`
      SELECT
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    printTable(users, [
      { key: 'role', label: 'Role' },
      { key: 'count', label: 'Total', format: formatNumber },
      { key: 'active', label: 'Active', format: formatNumber },
      { key: 'inactive', label: 'Inactive', format: formatNumber },
    ]);
  },

  async colleges() {
    printHeader('COLLEGES');

    const colleges = await query(`
      SELECT
        c.college_name,
        r.region_name,
        COUNT(s.id) as students,
        po.officer_name as placement_officer,
        ARRAY_LENGTH(c.branches, 1) as branch_count
      FROM colleges c
      JOIN regions r ON c.region_id = r.id
      LEFT JOIN students s ON c.id = s.college_id
      LEFT JOIN placement_officers po ON c.id = po.college_id
      GROUP BY c.id, c.college_name, r.region_name, po.officer_name, c.branches
      ORDER BY r.region_name, c.college_name
    `);

    printTable(colleges, [
      { key: 'college_name', label: 'College Name' },
      { key: 'region_name', label: 'Region' },
      { key: 'students', label: 'Students', format: formatNumber },
      { key: 'branch_count', label: 'Branches' },
      { key: 'placement_officer', label: 'Placement Officer' },
    ]);
  },

  async regions() {
    printHeader('REGIONS');

    const regions = await query(`
      SELECT
        r.region_name,
        COUNT(DISTINCT c.id) as colleges,
        COUNT(DISTINCT s.id) as students,
        COUNT(DISTINCT po.id) as officers
      FROM regions r
      LEFT JOIN colleges c ON r.id = c.region_id
      LEFT JOIN students s ON r.id = s.region_id
      LEFT JOIN placement_officers po ON c.id = po.college_id
      GROUP BY r.id, r.region_name
      ORDER BY r.region_name
    `);

    printTable(regions, [
      { key: 'region_name', label: 'Region' },
      { key: 'colleges', label: 'Colleges', format: formatNumber },
      { key: 'students', label: 'Students', format: formatNumber },
      { key: 'officers', label: 'Officers', format: formatNumber },
    ]);
  },

  async recent() {
    printHeader('RECENT ACTIVITY (Last 20)');

    const activity = await query(`
      SELECT
        TO_CHAR(al.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time,
        u.email as user,
        al.action_type,
        al.description,
        al.entity_type
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 20
    `);

    printTable(activity, [
      { key: 'time', label: 'Time' },
      { key: 'user', label: 'User' },
      { key: 'action_type', label: 'Action' },
      { key: 'description', label: 'Description' },
      { key: 'entity_type', label: 'Entity' },
    ]);
  },

  help() {
    printHeader('DATABASE COMMAND UTILITY - HELP');
    console.log(`
  Available Commands:

    stats        Show comprehensive database statistics
    tables       List all tables with row counts and sizes
    students     View detailed student statistics by status, college, and region
    jobs         View job postings and application statistics
    users        View user statistics by role
    colleges     List all colleges with student counts and officers
    regions      View region-wise statistics
    recent       Show last 20 activities from activity logs
    help         Show this help message

  Usage:
    node database/db-commands.js [command]

  Examples:
    node database/db-commands.js stats
    node database/db-commands.js students
    node database/db-commands.js tables

  Environment:
    Database connection uses environment variables from backend/.env
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    `);
  },
};

// Main execution
const main = async () => {
  const command = process.argv[2] || 'help';

  if (!commands[command]) {
    console.error(`\n  ❌ Unknown command: '${command}'`);
    console.error(`  Run 'node database/db-commands.js help' for available commands.\n`);
    process.exit(1);
  }

  try {
    await commands[command]();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n  ❌ Error:', error.message);
    console.error('\n  Make sure:');
    console.error('    - PostgreSQL is running');
    console.error('    - Database credentials in backend/.env are correct');
    console.error('    - Database exists and is accessible\n');
    await pool.end();
    process.exit(1);
  }
};

main();

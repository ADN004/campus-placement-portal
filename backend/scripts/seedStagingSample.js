/**
 * Staging Sample Data Seeder
 *
 * Seeds a small, predictable dataset for day-to-day feature testing on the
 * staging environment:
 *   - 10 students across 3 colleges (8 approved+verified, 1 pending, 1 blacklisted)
 *   - 4 jobs covering every target_type and eligibility shape
 *   - 6 applications in mixed statuses (submitted/under_review/shortlisted/rejected/selected)
 *   - 3 notifications with recipients
 *
 * Prerequisites: base data must exist first (regions, colleges, super admin)
 *   -> node scripts/seedDatabase.js
 *
 * SAFETY: refuses to run when APP_ENV=production.
 *
 * All sample logins use the password: Student@123
 * Sample student emails: spc.sample.student1@staging.invalid ... student10@...
 * (.invalid is a reserved TLD — these addresses can never receive real mail)
 *
 * Usage (inside the backend container):
 *   node scripts/seedStagingSample.js
 *
 * @module scripts/seedStagingSample
 */

import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const APP_ENV = process.env.APP_ENV || 'production';
const SAMPLE_PASSWORD = 'Student@123';
const SAMPLE_EMAIL_DOMAIN = 'staging.invalid';

// Colleges the sample students belong to (must exist in seed-data.sql)
const SAMPLE_COLLEGE_CODES = ['GPC_PKD', 'GPC_KLM', 'WPC_KAI'];

const SAMPLE_STUDENTS = [
  // [name, collegeIdx, branch, cgpa, backlogTotal, gender, status]
  ['Anjali Krishnan', 0, 'Electronics Engineering', 9.21, 0, 'Female', 'approved'],
  ['Rahul Menon', 0, 'Mechanical Engineering', 7.85, 0, 'Male', 'approved'],
  ['Fathima Nasrin', 0, 'Computer Hardware Engineering', 8.6, 0, 'Female', 'approved'],
  ['Arjun Das', 1, 'Computer Engineering', 6.4, 2, 'Male', 'approved'],
  ['Sneha Raj', 1, 'Computer Engineering', 8.92, 0, 'Female', 'approved'],
  ['Mohammed Shafi', 1, 'Civil Engineering', 7.1, 1, 'Male', 'approved'],
  ['Devika Suresh', 2, 'Computer Engineering', 9.45, 0, 'Female', 'approved'],
  ['Vishnu Prasad', 2, 'Electronics Engineering', 6.1, 3, 'Male', 'approved'],
  ['Aparna Mohan', 2, 'Computer Engineering', 8.05, 0, 'Female', 'pending'],
  ['Kiran Babu', 1, 'Computer Engineering', 7.5, 0, 'Male', 'blacklisted'],
];

async function main() {
  if (APP_ENV === 'production') {
    console.error('❌ Refusing to run: APP_ENV=production. Sample data is for staging/dev only.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // ---- Preconditions ----
    const colleges = await client.query(
      'SELECT id, college_code, region_id FROM colleges WHERE college_code = ANY($1)',
      [SAMPLE_COLLEGE_CODES]
    );
    if (colleges.rows.length !== SAMPLE_COLLEGE_CODES.length) {
      console.error('❌ Base data missing (regions/colleges). Run: node scripts/seedDatabase.js first.');
      process.exit(1);
    }
    const collegeByCode = Object.fromEntries(colleges.rows.map((c) => [c.college_code, c]));

    const admin = await client.query(
      "SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY id LIMIT 1"
    );
    if (admin.rows.length === 0) {
      console.error('❌ No super admin found. Run: node scripts/seedDatabase.js first.');
      process.exit(1);
    }
    const adminUserId = admin.rows[0].id;

    const existing = await client.query('SELECT 1 FROM users WHERE email LIKE $1 LIMIT 1', [
      `%@${SAMPLE_EMAIL_DOMAIN}`,
    ]);
    if (existing.rows.length > 0) {
      console.error('❌ Sample data already present. Run "make staging-db-reset" for a clean slate first.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    await client.query('BEGIN');

    // ---- Students ----
    const studentIds = [];
    const studentUserIds = [];
    for (let i = 0; i < SAMPLE_STUDENTS.length; i++) {
      const [name, collegeIdx, branch, cgpa, backlogs, gender, status] = SAMPLE_STUDENTS[i];
      const college = collegeByCode[SAMPLE_COLLEGE_CODES[collegeIdx]];
      const email = `spc.sample.student${i + 1}@${SAMPLE_EMAIL_DOMAIN}`;
      const prn = `99000000${String(i + 1).padStart(2, '0')}`;
      const isBlacklisted = status === 'blacklisted';
      const regStatus = status === 'pending' ? 'pending' : 'approved';

      const user = await client.query(
        `INSERT INTO users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'student', TRUE) RETURNING id`,
        [email, passwordHash]
      );
      const userId = user.rows[0].id;
      studentUserIds.push(userId);

      // Conditional values are computed here in JS — using the same SQL
      // parameter both as a column value and inside a CASE comparison makes
      // PostgreSQL fail with "inconsistent types deduced for parameter $N"
      const isApproved = regStatus === 'approved';
      const student = await client.query(
        `INSERT INTO students (
           user_id, prn, region_id, college_id, email, mobile_number,
           student_name, age, gender, date_of_birth, complete_address,
           branch, programme_cgpa,
           cgpa_sem1, cgpa_sem2, cgpa_sem3, cgpa_sem4,
           backlog_count, backlogs_sem1, backlogs_sem2,
           email_verified, email_verified_at,
           registration_status, approved_date, approved_by,
           is_blacklisted, blacklist_reason, blacklisted_date, blacklisted_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13,
           $14, $15, $16, $17,
           $18, $19, $20,
           $21, $22,
           $23, $24, $25,
           $26, $27, $28, $29
         ) RETURNING id`,
        [
          userId, prn, college.region_id, college.id, email, `90000000${String(i + 1).padStart(2, '0')}`,
          name, 20, gender, `2004-0${(i % 9) + 1}-15`, `Sample Address ${i + 1}, Kerala`,
          branch, cgpa,
          cgpa, cgpa, cgpa, cgpa,
          String(backlogs), Math.min(backlogs, 1), Math.max(backlogs - 1, 0),
          isApproved, isApproved ? new Date() : null,
          regStatus, isApproved ? new Date() : null, isApproved ? adminUserId : null,
          isBlacklisted, isBlacklisted ? 'Sample blacklisted student (staging test data)' : null,
          isBlacklisted ? new Date() : null, isBlacklisted ? adminUserId : null,
        ]
      );
      studentIds.push(student.rows[0].id);
    }

    // ---- Jobs (dynamic dates so they never expire) ----
    const gpcPkd = collegeByCode['GPC_PKD'];
    const jobs = [
      {
        title: 'Junior Software Engineer', company: 'TechNova Solutions',
        desc: 'Entry-level software role for polytechnic graduates. Sample staging job.',
        location: 'Kochi', salary: '3.5 - 4.5 LPA', vacancies: 12,
        minCgpa: 6.0, maxBacklogs: 2, branches: ['Computer Engineering', 'Electronics Engineering'],
        targetType: 'all', targetRegions: null, targetColleges: null, deadlineDays: 30,
      },
      {
        title: 'Graduate Engineer Trainee', company: 'Kerala Motors Ltd',
        desc: 'GET programme for the Central region. Sample staging job.',
        location: 'Palakkad', salary: '3.0 LPA', vacancies: 8,
        minCgpa: null, maxBacklogs: null, branches: null,
        targetType: 'region', targetRegions: [gpcPkd.region_id], targetColleges: null, deadlineDays: 20,
      },
      {
        title: 'Technician Apprentice', company: 'BlueGrid Energy',
        desc: 'Apprenticeship limited to two colleges. Sample staging job.',
        location: 'Ernakulam', salary: '2.4 LPA stipend', vacancies: 5,
        minCgpa: null, maxBacklogs: 1, branches: null,
        targetType: 'college', targetRegions: null,
        targetColleges: [collegeByCode['GPC_KLM'].id, collegeByCode['WPC_KAI'].id], deadlineDays: 15,
      },
      {
        title: 'Systems Analyst', company: 'DataWeave Analytics',
        desc: 'High-bar role: CGPA 8.5+, zero backlogs. Sample staging job.',
        location: 'Thiruvananthapuram', salary: '5.2 LPA', vacancies: 3,
        minCgpa: 8.5, maxBacklogs: 0, branches: null,
        targetType: 'all', targetRegions: null, targetColleges: null, deadlineDays: 10,
      },
    ];

    const jobIds = [];
    for (const j of jobs) {
      const job = await client.query(
        `INSERT INTO jobs (
           job_title, company_name, job_description, job_location, salary_package,
           no_of_vacancies, application_form_url, application_start_date, application_deadline,
           min_cgpa, max_backlogs, allowed_branches,
           target_type, target_regions, target_colleges, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING id`,
        [
          j.title, j.company, j.desc, j.location, j.salary,
          j.vacancies, 'https://example.com/apply', new Date(now - day), new Date(now + j.deadlineDays * day),
          j.minCgpa, j.maxBacklogs, j.branches ? JSON.stringify(j.branches) : null,
          j.targetType,
          j.targetRegions ? JSON.stringify(j.targetRegions) : null,
          j.targetColleges ? JSON.stringify(j.targetColleges) : null,
          adminUserId,
        ]
      );
      jobIds.push(job.rows[0].id);
    }

    // ---- Applications (mixed statuses) ----
    const applications = [
      // [studentIdx, jobIdx, status, package, location]
      [0, 0, 'selected', 4.5, 'Kochi'],
      [1, 0, 'shortlisted', null, null],
      [2, 0, 'submitted', null, null],
      [3, 1, 'under_review', null, null],
      [4, 2, 'rejected', null, null],
      [6, 3, 'submitted', null, null],
    ];
    for (const [sIdx, jIdx, status, pkg, loc] of applications) {
      const isReviewed = status !== 'submitted';
      await client.query(
        `INSERT INTO job_applications (
           job_id, student_id, application_status,
           reviewed_by, reviewed_at,
           placement_package, placement_location, joining_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          jobIds[jIdx], studentIds[sIdx], status,
          isReviewed ? adminUserId : null, isReviewed ? new Date() : null,
          pkg, loc, pkg !== null ? new Date(now + 60 * day) : null,
        ]
      );
    }

    // ---- Notifications ----
    const notifications = [
      ['Welcome to the staging environment', 'This portal contains sample test data only.', 'general', 'normal'],
      ['New job posted: Junior Software Engineer', 'TechNova Solutions is hiring. Check the jobs page.', 'job_posted', 'high'],
      ['Application deadline approaching', 'Systems Analyst applications close soon.', 'application_deadline', 'urgent'],
    ];
    for (const [title, message, type, priority] of notifications) {
      const notif = await client.query(
        `INSERT INTO notifications (title, message, notification_type, priority, created_by, target_type)
         VALUES ($1, $2, $3, $4, $5, 'all') RETURNING id`,
        [title, message, type, priority, adminUserId]
      );
      for (const userId of studentUserIds) {
        await client.query(
          `INSERT INTO notification_recipients (notification_id, user_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [notif.rows[0].id, userId]
        );
      }
    }

    // ---- Record dataset mode for `make staging-status` ----
    await client.query(`
      CREATE TABLE IF NOT EXISTS staging_meta (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        db_mode VARCHAR(20) NOT NULL,
        mode_set_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_prod_refresh_at TIMESTAMP
      )
    `);
    await client.query(`
      INSERT INTO staging_meta (id, db_mode, mode_set_at)
      VALUES (1, 'sample', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET db_mode = 'sample', mode_set_at = CURRENT_TIMESTAMP
    `);

    await client.query('COMMIT');

    console.log('✅ Sample dataset seeded successfully.');
    console.log(`   Students: ${studentIds.length} (8 approved, 1 pending, 1 blacklisted)`);
    console.log(`   Jobs: ${jobIds.length} | Applications: ${applications.length} | Notifications: ${notifications.length}`);
    console.log('');
    console.log('   Sample student logins:');
    console.log(`     spc.sample.student1@${SAMPLE_EMAIL_DOMAIN} ... student10@${SAMPLE_EMAIL_DOMAIN}`);
    console.log(`     Password: ${SAMPLE_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Sample seeding failed (rolled back):', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

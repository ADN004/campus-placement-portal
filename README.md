# State Placement Cell

> **A comprehensive placement management system for 60 Polytechnic Colleges in Kerala**

Full-stack web application built with React, Node.js, Express, and PostgreSQL to manage campus placements across all polytechnic colleges in Kerala with role-based access control for Students, Placement Officers, and Super Admin.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Highlights](#-key-highlights)
- [Features by Role](#-features-by-role)
  - [Student Features](#-student-features)
  - [Placement Officer Features](#-placement-officer-features)
  - [Super Admin Features](#-super-admin-features)
- [Tech Stack](#-tech-stack)
- [3-Tier Profile Architecture](#-3-tier-profile-architecture)
- [Smart Application System](#-smart-application-system)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [System Statistics](#-system-statistics)

---

## 🎯 Overview

The **State Placement Cell** is a production-ready, enterprise-grade placement management system designed specifically for managing campus recruitment across **60 polytechnic colleges** in Kerala. The system handles the complete placement workflow from student registration to job applications with comprehensive approval mechanisms, email verification, photo management, detailed analytics, and advanced profile management.

---

## ✨ Key Highlights

### Core Capabilities
- **3 User Roles:** Student, Placement Officer (one per college), Super Admin
- **60 Colleges:** All polytechnic colleges across 5 Kerala regions
- **26 Branches:** Support for all Kerala polytechnic diploma engineering programs
- **3-Tier Student Data:** Basic profile (Tier 1) + Extended profile (Tier 2) + Custom job fields (Tier 3)
- **80+ API Endpoints:** Complete REST API with role-based access control
- **23+ Database Tables:** Normalized schema with triggers, functions, and materialized views
- **40+ Indexes:** Query optimization for 20,000+ concurrent users

### Advanced Features
- **Smart Application System:** Validates requirements, detects missing data, prompts for completion
- **Extended Profile Management:** 5-section extended profile with completion tracking
- **Job Requirements Configuration:** Configurable Tier 2/3 requirements per job
- **Placement Drive Scheduling:** Schedule drives with email notifications
- **Placement Tracking:** Record placements with package, location, joining date
- **Email Verification:** Token-based email verification with 24-hour expiry
- **Photo Management:** Cloudinary integration with bulk operations
- **Activity Logging:** Complete audit trail with IP, user agent, metadata
- **Export Features:** PDF and Excel exports with custom field selection
- **Placement Posters:** Generate PDF placement posters with eligible students
- **Rate Limiting:** Configured for 20k+ users with tiered limits
- **Background Jobs:** Daily age updates, materialized view refresh, cleanup tasks
- **Docker Ready:** Production-optimized multi-stage Docker builds

---

## ✨ Features by Role

### 🎓 Student Features

#### Registration & Authentication
- **PRN-Based Registration** with real-time validation against active PRN ranges
- **Cascading Selection:** Region → College → Branch with dynamic filtering
- **Email Verification System:**
  - Token-based verification sent after placement officer approval
  - Resend verification with new token generation
  - 24-hour token expiry with auto-cleanup
- **Photo Upload:** Required profile photo upload to Cloudinary during registration (max 500KB)
- **Comprehensive Profile Data (Tier 1 - Basic Profile):**
  - Personal: Name, Email, Mobile, DOB, Age (auto-calculated), Gender, Height, Weight
  - Academic: Branch, Semester-wise CGPA (1-6), Programme CGPA (auto-calculated via trigger)
  - Documents: Address, Driving License status, PAN Card status
  - Performance: Backlog count and detailed backlog information
- **Login Options:** PRN or Email with password
- **Approval Workflow:**
  - Registration creates account with 'pending' status
  - Student redirected to waiting page
  - Placement officer approves/rejects
  - Email verification sent automatically on approval
  - Full access granted after email verification

#### Extended Profile (Tier 2 - Advanced Profile)
- **5 Sections with Completion Tracking:**
  1. **Academic Extended:** SSLC marks/year/board, 12th marks/year/board
  2. **Physical Details:** Height (cm), weight (kg), physically handicapped status with details
  3. **Family Details:** Father/mother details (name, occupation, annual income), siblings count and details
  4. **Personal Details:** District, permanent address, interests and hobbies
  5. **Document Verification:** PAN card with number, Aadhar card with number, Passport with number, Driving license
  6. **Education Preferences:** Interested in B.Tech (Yes/No/Not Interested), Interested in M.Tech, Preferred study mode (full-time/part-time/distance)
- **Additional Data (JSONB):**
  - Certifications array
  - Achievements array
  - Extracurricular activities array
- **Profile Completion Tracking:**
  - Section-wise completion percentage
  - Overall profile completion percentage
  - Trigger-based auto-calculation
- **Optional/Job-Specific:** Extended profile requested when applying to jobs that require it

#### Dashboard & Profile Management
- **Dashboard Statistics:**
  - Total applications count
  - Eligible jobs count
  - Unread notifications count
  - Profile completion percentage
- **View Complete Profile:** All personal, academic, and document details
- **Update Profile:**
  - Contact information (email, mobile, address)
  - Physical details (height, weight)
  - Semester CGPAs (programme CGPA auto-recalculates via triggers)
  - Backlog information
  - Profile photo (upload new or delete existing)
  - Extended profile sections (5 sections)
- **Age Auto-Update:**
  - Database trigger updates age on DOB change
  - Daily cron job updates all student ages at midnight
- **Change Password:**
  - Minimum 8 characters
  - Must contain uppercase, lowercase, and number
  - Old password verification required

#### Job Applications with Smart Application System
- **View All Jobs:** Can see ALL active jobs regardless of eligibility criteria
- **Eligibility Indicators:**
  - Jobs display if student meets criteria (CGPA, backlogs, height, weight, branch, region/college)
  - Green checkmark for eligible jobs
  - Clear criteria display (min CGPA, max backlogs, allowed branches, etc.)
- **Apply to Any Job:** Students can apply to any job (not restricted by eligibility)
- **Smart Application Modal:**
  - Checks for missing required data (Tier 1, Tier 2, Tier 3)
  - Shows modal with missing sections if data incomplete
  - Student can fill missing data inline or navigate to extended profile
  - Validates against job-specific requirements
  - Only allows submission when all requirements met
- **Application Form Integration:**
  - Embedded Google Form or external application URL
  - Application tracking in database
- **Application Tracking:**
  - View all submitted applications with status
  - Status types: Submitted, Under Review, Shortlisted, Rejected, Selected
  - Data snapshot preserved at application time (Tier 2 snapshot + Tier 3 custom responses)
- **Deadline Enforcement:** Cannot apply after deadline passes
- **Duplicate Prevention:** System prevents applying twice to same job
- **Job Details:** Company info, location, salary package, job description, eligibility, requirements

#### Notifications
- **Receive Notifications:** From placement officers (college-specific) and super admin (system-wide)
- **Mark as Read/Unread:** Toggle read status for notification management
- **Notification Types:**
  - General announcements
  - Job posted alerts
  - Application deadline reminders
  - Approval/rejection notifications
  - Drive schedule notifications
  - Shortlist/selection/rejection notifications
  - System updates
- **Notification Filtering:** Filter by read/unread status
- **Email Notifications:** Receive emails for critical updates

---

### 👨‍💼 Placement Officer Features

#### Dashboard & Profile
- **Dashboard Statistics:**
  - Total students in college
  - Pending approvals count
  - Approved students count
  - Rejected students count
  - Blacklisted students count
  - Active jobs count
- **College Information:** View college name, region, and branches
- **Profile Management:**
  - Update name, email, phone, designation
  - Upload profile photo to Cloudinary (optional)
  - Delete profile photo
- **Change Password:** Secure password change with validation

#### Student Management
- **View Students List** with advanced filtering:
  - Filter by status: pending, approved, rejected, blacklisted
  - Filter by minimum CGPA threshold
  - Filter by maximum backlog count
  - Search by PRN, name, email, or mobile number
  - Pagination with configurable page size
- **Approve Students:**
  - Single approval with button click
  - Bulk approval with checkbox selection
  - Automatically sends email verification link
  - Updates registration status to 'approved'
  - Activity logged for audit trail
- **Reject Students:**
  - Single or bulk rejection
  - Mandatory rejection reason
  - Email notification sent to student
  - Activity logged with reason
- **Blacklist Students:**
  - Instant access removal
  - Mandatory blacklist reason
  - Student cannot login after blacklisting
  - Creates activity log entry
- **Request Whitelist:**
  - Submit whitelist request to super admin
  - Provide justification for whitelist
  - Track request status (pending, approved, rejected)
  - Super admin reviews and approves/rejects
- **College-Only Access:** Can only view and manage students from own college
- **View Student Details:**
  - Complete Tier 1 profile information
  - Extended Tier 2 profile (if filled)
  - Academic performance
  - Application history
  - Notification history

#### Export Features
- **Export Student Data:**
  - **PDF Format:** Formatted student list with college letterhead
  - **Excel Format:** Detailed columns with all student data
  - **Custom Field Selection:**
    - Choose specific fields to export (PRN, Name, Email, Mobile, Branch, CGPA, Sem CGPAs, Height, Weight, Backlogs, SSLC marks, 12th marks, etc.)
    - Filter by departments/branches (college-specific branches only)
    - Include/exclude photo URLs
    - Customizable column headers
  - **Branch Filtering:** Only shows branches available in their college
  - **Enhanced Export:**
    - Normalized branch names across 26 Kerala polytechnic branches
    - Short branch names for compact display
    - Dynamic column widths based on content
- **Export Job Applicants:**
  - Download list of students from their college who applied for specific jobs
  - Includes student details and application status
  - Excel format with formatted headers
- **Export PRN Range Students:**
  - Export all students in a specific PRN range
  - Excel format with all student details
- **Placement Poster Generation:**
  - Generate PDF placement posters with job details
  - Include eligible students list
  - Custom formatting and branding

#### Job Management
- **View Jobs:** All jobs accessible to their college/region
- **Job Applicants:** View students from their college who applied to each job
- **Create Job Request:**
  - Request super admin to post a job
  - Provide company details, job description
  - Specify eligibility criteria (CGPA, backlogs, branches, height, weight)
  - Set application form URL and deadline
  - Target specific regions or colleges
  - **Configure Job Requirements:**
    - Set Tier 2 section requirements (which extended profile sections are required)
    - Define specific field requirements with validation rules
    - Add custom fields (Tier 3) for company-specific data (text, number, boolean, select, date)
- **Track Job Requests:**
  - View status (pending, approved, rejected)
  - See admin feedback/review comments
  - Edit pending requests
- **Manage Requirement Templates:**
  - Create reusable requirement templates
  - Apply templates to multiple jobs

#### PRN Range Management
- **View PRN Ranges:**
  - Both super admin created (system-wide) and own college-specific ranges
  - See range start/end or single PRN
  - View is_enabled status (for graduated batches)
  - Track creator information
- **Add PRN Ranges/Single PRNs:** For their college only
- **Update PRN Ranges:**
  - Toggle active/inactive status
  - Update description
  - Cannot modify super admin created ranges
- **Delete PRN Ranges:** Only ranges they created (cannot delete super admin ranges)
- **Track Creator:** See who added each range and when
- **View Students by PRN Range:**
  - Eye icon to view all students in a specific range
  - Works for both enabled and disabled ranges
  - Export students from range to Excel

#### Notification System
- **Send Notifications:** To college students only (approved, non-blacklisted)
- **Targeted Messaging:**
  - Custom title and message
  - Auto-delivered to all eligible students
  - Notification history tracking
- **Notification Analytics:** View delivery status and read counts

#### College Branch Management
- **View College Branches:** See all branches available in their college
- **Manage Branches:** (If authorized) Add/remove branches for their college

---

### 🛡️ Super Admin Features

#### Dashboard & Analytics
- **Comprehensive Statistics:**
  - Total students (system-wide)
  - Approved students count
  - Pending approvals count
  - Blacklisted students count
  - Total jobs created
  - Active jobs count
  - Total colleges (60)
  - Total active placement officers
  - Active PRN ranges count
  - Pending whitelist requests count
  - Recent activities (last 7 days)
- **System Health:** Database connection status, active users

#### PRN Range Management (System-Wide)
- **View All PRN Ranges:**
  - Super admin created ranges
  - Placement officer created ranges (tagged by creator)
  - Filter by enabled/disabled status
- **Add PRN Ranges/Single PRNs:**
  - Add range with start and end PRN
  - Add single PRN for special cases
  - Add description for context
  - Set initial enabled status
- **Update PRN Ranges:**
  - Toggle `is_active` (soft delete)
  - Toggle `is_enabled` (on/off for graduated batches)
  - Add/update description
  - Add disabled reason when disabling
  - Track modification history
- **Delete PRN Ranges:** Permanent deletion
- **Track Modifications:**
  - Who added (super admin or placement officer)
  - When created
  - Who disabled and when
  - Disable reason
- **View Students by PRN Range:**
  - Eye icon to view all students in range
  - Works for disabled ranges too
  - Export to Excel with all student details
- **PRN Range Analytics:** Student distribution across ranges

#### Placement Officer Management
- **View All Officers:** Across all 60 colleges
- **Add/Replace Officers:**
  - Automatically moves previous officer to history
  - Deactivates old user account
  - Creates new user with role 'placement_officer'
  - Default password: "123" (must be changed on first login)
  - One active officer per college enforced
- **Update Officer Details:**
  - Phone number, designation, email
  - Cannot change college (must replace officer)
- **Upload Officer Photo:**
  - Upload to Cloudinary
  - Image optimization (500x500px, auto quality)
  - Photo URL and public_id tracking
- **Delete Officer Photo:** Remove from Cloudinary and database
- **Deactivate/Remove Officer:**
  - Provide reason for removal
  - Moves to history
  - Deactivates user account
- **View Officer History:**
  - Complete history per college
  - All previous officers with tenure dates
  - Reasons for changes
- **Clear Officer History:** Remove history for a college
- **Complete Audit Trail:** All officer changes logged in activity logs

#### Job Management (Complete Control)
- **Create Jobs:**
  - Company details: name, location, job type
  - Job description and requirements
  - Salary package
  - Application form URL (Google Form or custom)
  - Start date and deadline
  - **Eligibility Criteria:**
    - Minimum CGPA requirement
    - Maximum backlogs allowed
    - Height range (if applicable)
    - Weight range (if applicable)
    - Allowed branches (multi-select from 26 branches)
  - **Target Type:**
    - All colleges
    - Specific regions (multi-select from 5 regions)
    - Specific colleges (multi-select from 60 colleges)
  - **Configure Job Requirements (Advanced):**
    - Set Tier 2 requirements (which extended profile sections are required)
    - Define specific field requirements with validation rules
    - Add custom fields (Tier 3) with field types: text, number, boolean, select, date
- **View All Jobs:**
  - With application counts (total and per college)
  - Filter by active/inactive status
  - Search by company name or job title
- **Update Jobs:**
  - All job details editable
  - Update eligibility criteria
  - Change target regions/colleges
  - Extend or modify deadline
  - Modify job requirements
- **Soft Delete Jobs:**
  - Mark as deleted with reason
  - Preserves application data
  - Moves to deleted jobs history
- **Permanently Delete Jobs:**
  - Complete removal from database
  - Cascade deletes applications
  - Logged in activity logs
- **Job Deletion History:**
  - Track all deleted jobs
  - View application counts at time of deletion
  - See deletion reason and who deleted
  - Restore capability (if implemented)
- **Clear Deleted Jobs History:** Permanent cleanup
- **Schedule Placement Drives:**
  - Set date, time, location for each job
  - Add additional instructions
  - Email notifications to shortlisted students
- **View Job Applicants:**
  - Across ALL colleges (system-wide)
  - Filter by college, status, CGPA
  - Update application status (under_review, shortlisted, rejected, selected)
  - Add review notes
  - Record placement details (package, location, joining date)
  - Export applicant list to Excel
- **Placement Poster Generation:**
  - Generate PDF placement posters with job details
  - Include eligible students list across all colleges
  - Custom formatting and branding
  - College-wise student organization

#### Job Request Management
- **View Pending Job Requests:** From all placement officers
- **Approve Job Requests:**
  - Automatically creates job posting
  - Copies all criteria from request
  - Notifies requesting officer
  - Marks request as approved
- **Reject Job Requests:**
  - Provide review comments/reason
  - Notifies requesting officer
  - Marks request as rejected
- **Request History:** View all approved/rejected requests

#### Requirement Template Management
- **Manage Requirement Templates:**
  - Create reusable templates for common job types
  - Apply templates to multiple jobs
  - Share templates across colleges
  - Update and delete templates

#### Student Management (System-Wide)
- **View All Students:**
  - **Advanced Filtering:**
    - By status (pending, approved, rejected, blacklisted)
    - By college (all 60 colleges)
    - By region (5 Kerala regions)
    - By minimum CGPA threshold
    - By maximum backlog count
  - Search by PRN, name, email, mobile number
  - Pagination with configurable page size
- **Search Student by PRN:**
  - Quick search with complete details
  - Shows college, region, approval status
  - Application history
- **Blacklist Student:**
  - System-wide blacklist with reason
  - Instant access removal across all roles
  - Activity logged with timestamp
- **Whitelist Student Directly:**
  - Remove from blacklist without request workflow
  - Provide reason for whitelist
  - Immediate access restoration
- **Delete Student Completely:**
  - Removes all related data:
    - User account
    - Student profile (Tier 1 and Tier 2)
    - Applications
    - Notifications
  - Cascade delete handled by database
  - Irreversible action with confirmation
- **Bulk Delete Student Photos:**
  - Storage management feature
  - Delete by single PRN
  - Delete by PRN range
  - Delete by date range (upload date)
  - Photos deleted from Cloudinary
  - Database updated with deletion metadata
- **Custom Export Students:**
  - **Select Specific Fields:**
    - PRN, Name, Email, Mobile, Branch, CGPA, Sem CGPAs, Height, Weight, Backlogs, SSLC marks, 12th marks, etc.
    - Choose which columns to include
    - Customizable export
  - **Filter Options:**
    - By college (with college-specific branch filtering)
    - By departments/branches
    - By status, CGPA, backlogs
  - **Excel Format:**
    - Formatted headers (bold, colored backgrounds)
    - Auto-width columns
    - Freeze header row
  - **Include Photo URLs:** Optional checkbox to include Cloudinary URLs
  - **Enhanced Branch Filtering:**
    - When college selected, only shows that college's branches
    - Dynamic branch loading with loading indicator
    - Normalized branch names (26 Kerala polytechnic branches)

#### Whitelist Request Management
- **View All Whitelist Requests:**
  - From all placement officers across colleges
  - Filter by status (pending, approved, rejected)
  - Sort by date submitted
- **Review Request Details:**
  - Student complete information (Tier 1 and Tier 2)
  - Original blacklist reason and date
  - Who blacklisted (placement officer details)
  - Placement officer's whitelist reason/justification
  - College and region information
  - Student's application history
- **Approve Whitelist:**
  - Removes student from blacklist
  - Restores full access
  - Sends notification to student
  - Notifies requesting placement officer
  - Activity logged
- **Reject Whitelist:**
  - Provide review comment explaining rejection
  - Student remains blacklisted
  - Notifies requesting placement officer
  - Activity logged
- **Complete History:**
  - Who blacklisted and when
  - Who requested whitelist and when
  - Who approved/rejected and when
  - Full audit trail

#### Activity Logs & Audit Trail
- **View All Activity Logs:**
  - Complete system activity history
  - **Filter Options:**
    - By user (email search)
    - By action type (login, logout, approval, blacklist, etc.)
    - By user role (student, placement_officer, super_admin)
    - By date range
    - Search by description
  - **Pagination:** Configurable limit and page number
- **Export Activity Logs:**
  - CSV format with all fields
  - Includes: timestamp, user, role, action, description, IP, user agent
  - Filterable export
- **Tracked Actions:**
  - Authentication: Login, logout, password change
  - Student Management: Registration, approval, rejection, blacklist, whitelist
  - Job Management: Job created, updated, deleted, applied
  - PRN Management: Range added, updated, deleted, enabled/disabled
  - Officer Management: Officer added, updated, removed, photo uploaded/deleted
  - Profile Updates: Student profile updates, officer profile updates
  - Notifications: Sent, read status changes
- **Complete Metadata:**
  - IP address
  - User agent (browser/device info)
  - Timestamp (down to milliseconds)
  - User ID and role
  - Related entity IDs (student_id, job_id, etc.)

#### Super Admin Management
- **View All Super Admins:**
  - List of all system administrators
  - See active/inactive status
  - Last login timestamp
- **Create New Super Admin:**
  - Email and password with strong validation
  - **Password Requirements:**
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
  - Auto-hashed with bcrypt (10 salt rounds)
  - Creates user with role 'super_admin'
- **Deactivate Super Admin:**
  - Cannot deactivate self (security measure)
  - Provide reason for deactivation
  - User account marked inactive
  - Activity logged
- **Activate Super Admin:**
  - Reactivate previously deactivated accounts
  - Provide reason for activation
  - Restores full access

#### Branch Management & Normalization
- **Normalized Branch Names:**
  - 26 official Kerala polytechnic branches
  - 30+ branch name variations mapped to standard names
  - Handles abbreviations and alternate names
- **Get College Branches:**
  - API endpoint to fetch branches for any college
  - Used in dynamic filtering for exports
  - Used in student registration cascading selection
- **Branch Categories:**
  - **Design:** Architecture
  - **Mechanical:** Automobile, Mechanical, Tool and Die
  - **Electronics:** Electronics, ECE, EEE, Instrumentation, Biomedical
  - **Chemical:** Chemical, Polymer Technology
  - **Civil:** Civil Engineering (including Hearing Impaired)
  - **Commerce:** Commercial Practice, Computer Application and Business Management
  - **Computer:** Computer Engineering, Computer Hardware, Computer Science, IT, Cyber Forensics, RPA
  - **Printing:** Printing Technology
  - **Textile:** Textile Technology
  - **Wood:** Wood and Paper Technology

#### Notification System
- **Send System-Wide Notifications:** To all students or filtered groups
- **Targeted Messaging:** By region, college, or student status
- **Priority Levels:** Set notification priority
- **Notification Analytics:** View delivery and read statistics

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with hooks (useState, useEffect, useContext, useCallback)
- **Vite** - Next-generation build tool and dev server (lightning-fast HMR)
- **React Router v6** - Client-side routing with protected routes
- **Tailwind CSS 3** - Utility-first styling framework with glassmorphism design
- **Axios** - Promise-based HTTP client with interceptors
- **React Hot Toast** - Lightweight notification library
- **Lucide React** - Beautiful, consistent icon library
- **ExcelJS** - Excel file generation on client-side

### Backend
- **Node.js 18** - JavaScript runtime environment with ES Modules
- **Express.js 4** - Fast, unopinionated web framework
- **PostgreSQL 15** - Advanced open-source relational database
- **node-postgres (pg)** - PostgreSQL client for Node.js with connection pooling
- **JWT (jsonwebtoken)** - JSON Web Token authentication
- **Bcrypt** - Password hashing with 10 salt rounds
- **Nodemailer** - Email sending with Gmail/SMTP support
- **Cloudinary** - Cloud-based image and video management
- **PDFKit** - PDF document generation with custom fonts
- **ExcelJS** - Excel spreadsheet creation and manipulation
- **Multer** - Multipart form-data handling for file uploads
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing middleware
- **cookie-parser** - Parse HTTP request cookies
- **helmet** - Security headers
- **compression** - gzip compression for API responses
- **express-rate-limit** - Rate limiting for 20k+ users

### Database Features
- **PostgreSQL 15** with advanced features:
  - **Materialized Views:** `active_students_view` for performance optimization
  - **Database Triggers:**
    - Auto-update timestamps
    - Age calculation from DOB
    - Extended profile auto-creation
    - Profile completion percentage calculation
  - **Database Functions:**
    - `update_all_student_ages()` - Batch age updates
    - `refresh_active_students_view()` - View refresh
    - `isPRNInRange(prn TEXT)` - PRN validation logic
    - `calculate_profile_completion_percentage(student_id)` - Profile completion calculation
  - **40+ Indexes:** Query optimization for large datasets
  - **JSONB Fields:** Flexible data storage for metadata, branches, targets, certifications, achievements
  - **Foreign Keys & Constraints:** Data integrity enforcement
  - **Check Constraints:** Value range validation (CGPA 0-10, height 140-220, etc.)

### DevOps & Tools
- **Docker** - Containerization platform with multi-stage builds
- **Docker Compose** - Multi-container orchestration
- **Git** - Version control system
- **npm** - Package management
- **Nginx** - High-performance web server and reverse proxy (for frontend)
- **dumb-init** - Process supervisor for containers
- **Health Checks** - Container health monitoring
- **Resource Limits** - CPU and memory constraints for production

### Background Jobs & Automation
- **Node.js Cron Jobs:**
  - Daily age update at midnight
  - Materialized view refresh
  - Cleanup tasks (expired tokens, old logs)
- **Email Automation:**
  - Verification emails
  - Drive schedule notifications
  - Shortlist/selection/rejection emails
- **Scheduled Tasks:** Using native setTimeout/setInterval

---

## 🎯 3-Tier Profile Architecture

### Overview
The system uses a sophisticated 3-tier architecture to manage student data efficiently:

### **Tier 1 - Basic Profile (Always Required)**
- Stored in `students` table
- Required for registration
- **Includes:**
  - PRN, name, email, mobile
  - DOB, age (auto-calculated), gender
  - Height, weight
  - Branch
  - 6 semester CGPAs
  - Programme CGPA (auto-calculated via trigger)
  - Backlog count and details
  - Address
  - Driving license status
  - PAN card status
  - Photo (Cloudinary)

### **Tier 2 - Extended Profile (Optional/Job-Specific)**
- Stored in `student_extended_profiles` table
- Requested when applying to jobs that require it
- **5 Sections with Completion Tracking:**
  1. **Academic Extended**
     - SSLC marks, year, board
     - 12th/Plus Two marks, year, board

  2. **Physical Details**
     - Height (cm), weight (kg)
     - Physically handicapped status with details

  3. **Family Details**
     - Father: name, occupation, annual income
     - Mother: name, occupation, annual income
     - Siblings count and details

  4. **Personal Details**
     - District, permanent address
     - Interests and hobbies

  5. **Document Verification**
     - PAN card with number
     - Aadhar card with number
     - Passport with number
     - Driving license

  6. **Education Preferences**
     - Interested in B.Tech (Yes/No/Not Interested)
     - Interested in M.Tech (Yes/No/Not Interested)
     - Preferred study mode (full-time/part-time/distance)

- **Additional Data (JSONB):**
  - Certifications array
  - Achievements array
  - Extracurricular activities array

- **Profile Completion:**
  - Section-wise completion percentage
  - Overall profile completion percentage
  - Trigger-based auto-calculation

### **Tier 3 - Custom Job Fields (Job-Specific)**
- Stored in `job_applications_extended` table
- Defined per job by placement officer/admin
- **Custom Field Types:**
  - Text fields
  - Number fields
  - Boolean (Yes/No) fields
  - Select dropdowns with options
  - Date fields
- **Examples:**
  - "Have you applied for SITTTR internship?" (boolean)
  - "Regional preference" (select: South, North, Central, East, West)
  - "Years of relevant experience" (number)
  - "Additional skills" (text)
- **Storage:**
  - Responses stored as JSONB in `custom_field_responses`
  - Flexible schema for any custom fields

### **Data Flow:**
1. Student registers → Tier 1 profile created
2. Extended profile auto-created (empty) via trigger
3. When applying to job → System checks requirements
4. If Tier 2 required → Student fills extended profile sections
5. If Tier 3 custom fields exist → Student fills custom responses
6. Data snapshot taken at application time
7. Stored in `job_applications_extended` for fair evaluation

---

## 🧠 Smart Application System

### Application Readiness Check
1. System checks if student has all required data (Tier 1, Tier 2, Tier 3)
2. If missing data, shows modal with missing sections
3. Student can fill missing data inline or navigate to extended profile
4. Validates against job-specific requirements
5. Only allows submission when all requirements are met

### Data Snapshot & Preservation
- **Tier 2 Snapshot:** Extended profile data snapshotted at application time
- **Stored In:** `tier2_snapshot` JSONB field
- **Purpose:** Preserves student data at time of application
- **Benefit:** Fair evaluation even if student updates profile later

### Requirement Validation
- **Tier 1 Validation:**
  - CGPA >= minimum required
  - Backlogs <= maximum allowed
  - Branch in allowed branches list
  - Height/weight within range (if specified)
  - Student's college/region matches target

- **Tier 2 Section Validation:**
  - Which extended profile sections are required
  - Example: Job requires "Academic Extended" + "Document Verification"

- **Tier 2 Specific Field Validation:**
  - Field-level validation rules
  - Example JSON:
    ```json
    {
      "height_cm": {"required": true, "min": 155},
      "sslc_marks": {"required": true, "min": 60},
      "has_pan_card": {"required": true}
    }
    ```

- **Tier 3 Custom Field Validation:**
  - All required custom fields must be filled
  - Type-specific validation (number range, date format, etc.)

### Job Requirements Configuration
- **Requirement Templates:**
  - Create reusable templates for common job types
  - Apply templates to multiple jobs
  - Share templates across colleges

- **Per-Job Requirements:**
  - Toggle which Tier 2 sections are required
  - Define specific field requirements
  - Add custom Tier 3 fields with types and options

### Placement Drive & Tracking

**Drive Scheduling:**
- Schedule date, time, location for each job
- Add additional instructions
- Email notifications to shortlisted students
- Stored in `job_drives` table

**Application Status Tracking:**
- **5 Status Types:**
  1. **submitted** - Initial submission
  2. **under_review** - Admin reviewing application
  3. **shortlisted** - Selected for drive
  4. **rejected** - Not selected
  5. **selected** - Final selection

**Placement Recording:**
- Record placement package (LPA)
- Record joining date
- Record placement location
- Add placement notes
- Track reviewer and review timestamp

**Email Notifications:**
- Drive schedule email (date, time, location, instructions)
- Shortlist notification email
- Selection email (with package, location, joining date)
- Rejection email (polite, encouraging)

---

## 📁 Project Structure

```
MajorProject/
├── backend/
│   ├── config/
│   │   ├── database.js                    # PostgreSQL connection pool
│   │   ├── cloudinary.js                  # Cloudinary configuration
│   │   └── emailService.js                # Nodemailer email service
│   ├── constants/
│   │   └── branches.js                    # Branch definitions and categories
│   ├── controllers/
│   │   ├── authController.js              # Authentication & email verification
│   │   ├── studentController.js           # Student operations
│   │   ├── studentControllerExtensions.js # Extended student features
│   │   ├── extendedProfileController.js   # Tier 2 extended profile management
│   │   ├── enhancedApplicationController.js # Smart application system
│   │   ├── placementOfficerController.js  # Placement officer operations
│   │   ├── placementOfficerControllerExtensions.js # Extended officer features
│   │   ├── superAdminController.js        # Super admin operations
│   │   ├── superAdminControllerExtensions.js # Extended admin features
│   │   ├── jobRequirementsController.js   # Job requirements configuration
│   │   ├── collegeBranchController.js     # College branch management
│   │   └── commonController.js            # Shared resources (regions, colleges)
│   ├── middleware/
│   │   ├── auth.js                        # JWT verification & role-based authorization
│   │   ├── errorHandler.js                # Global error handling
│   │   ├── activityLogger.js              # Activity logging middleware
│   │   └── rateLimiter.js                 # Rate limiting (20k+ users)
│   ├── routes/
│   │   ├── authRoutes.js                  # Authentication routes
│   │   ├── studentRoutes.js               # Student routes
│   │   ├── extendedProfileRoutes.js       # Extended profile routes
│   │   ├── enhancedApplicationRoutes.js   # Smart application routes
│   │   ├── placementOfficerRoutes.js      # Placement officer routes
│   │   ├── superAdminRoutes.js            # Super admin routes
│   │   ├── jobRequirementsRoutes.js       # Job requirements routes
│   │   └── commonRoutes.js                # Public/common routes
│   ├── scripts/
│   │   ├── setupDatabase.js               # Create database schema
│   │   └── seedDatabase.js                # Seed initial data (regions, colleges)
│   ├── utils/
│   │   ├── cronJobs.js                    # Background cron jobs
│   │   └── pdfGenerator.js                # PDF generation for exports and posters
│   ├── .env.example                       # Environment variables template
│   ├── .dockerignore                      # Docker ignore patterns
│   ├── Dockerfile                         # Production-optimized multi-stage build
│   ├── Dockerfile.dev                     # Development Dockerfile with hot-reload
│   ├── package.json                       # Backend dependencies
│   └── server.js                          # Entry point with Express app
│
├── frontend/
│   ├── public/
│   │   └── vite.svg                       # Favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx                 # Main layout with sidebar navigation
│   │   │   ├── LoadingSpinner.jsx         # Loading indicator
│   │   │   ├── ChangePassword.jsx         # Password change form
│   │   │   ├── DashboardHeader.jsx        # Dashboard header with welcome message
│   │   │   ├── GlassStatCard.jsx          # Glassmorphism stat card
│   │   │   ├── GlassCard.jsx              # Glassmorphism card container
│   │   │   ├── GlassButton.jsx            # Glassmorphism button
│   │   │   ├── SectionHeader.jsx          # Section header with icon
│   │   │   ├── GradientOrb.jsx            # Animated gradient background
│   │   │   ├── SmartApplicationModal.jsx  # Smart application flow
│   │   │   ├── DriveScheduleModal.jsx     # Schedule placement drive
│   │   │   ├── PlacementDetailsForm.jsx   # Record placement details
│   │   │   ├── JobRequirementsConfig.jsx  # Configure job requirements
│   │   │   ├── PDFFieldSelector.jsx       # Select fields for PDF/Excel export
│   │   │   ├── EnhancedFilterPanel.jsx    # Advanced filtering panel
│   │   │   ├── StudentDetailModal.jsx     # View student details in modal
│   │   │   ├── StatusBadge.jsx            # Status badge component
│   │   │   ├── ManualStudentAdditionModal.jsx # Manually add students
│   │   │   ├── CollegeLogoUpload.jsx      # Upload college logo
│   │   │   ├── ExtendedProfilePromptModal.jsx # Prompt for extended profile
│   │   │   └── extendedProfile/
│   │   │       ├── AcademicExtendedSection.jsx     # SSLC and 12th marks
│   │   │       ├── PhysicalDetailsSection.jsx      # Height, weight, handicap
│   │   │       ├── FamilyDetailsSection.jsx        # Father, mother, siblings
│   │   │       ├── PersonalDetailsSection.jsx      # District, address, interests
│   │   │       ├── DocumentVerificationSection.jsx # PAN, Aadhar, Passport, DL
│   │   │       └── EducationPreferencesSection.jsx # B.Tech, M.Tech, study mode
│   │   ├── constants/
│   │   │   └── branches.js                # 26 Kerala polytechnic branches
│   │   ├── context/
│   │   │   └── AuthContext.jsx            # Global auth state management
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── RoleSelectionPage.jsx          # Select user role for login
│   │   │   │   ├── StudentLoginPage.jsx           # Student login
│   │   │   │   ├── PlacementOfficerLoginPage.jsx  # Officer login
│   │   │   │   ├── SuperAdminLoginPage.jsx        # Admin login
│   │   │   │   ├── StudentRegisterPage.jsx        # Student registration
│   │   │   │   └── VerifyEmailPage.jsx            # Email verification page
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.jsx   # Student dashboard with stats
│   │   │   │   ├── Profile.jsx            # View/edit Tier 1 profile
│   │   │   │   ├── ExtendedProfile.jsx    # Manage Tier 2 extended profile
│   │   │   │   ├── StudentJobs.jsx        # View available jobs
│   │   │   │   ├── StudentApplications.jsx # Track applications
│   │   │   │   ├── StudentNotifications.jsx # View notifications
│   │   │   │   └── WaitingPage.jsx        # Waiting for approval page
│   │   │   ├── placement-officer/
│   │   │   │   ├── PlacementOfficerDashboard.jsx  # Officer dashboard
│   │   │   │   ├── ManageStudents.jsx     # Approve/reject/blacklist students
│   │   │   │   ├── ManagePRNRanges.jsx    # PRN range management
│   │   │   │   ├── SendNotification.jsx   # Send notifications
│   │   │   │   ├── CreateJobRequest.jsx   # Request job posting
│   │   │   │   ├── MyJobRequests.jsx      # Track job request status
│   │   │   │   ├── JobEligibleStudents.jsx # View eligible students
│   │   │   │   ├── PlacementPoster.jsx    # Generate placement posters
│   │   │   │   ├── ManageCollegeBranches.jsx # Manage college branches
│   │   │   │   ├── ManageJobRequirements.jsx # Configure job requirements
│   │   │   │   └── Profile.jsx            # View/edit officer profile
│   │   │   └── super-admin/
│   │   │       ├── SuperAdminDashboard.jsx # Admin dashboard with system stats
│   │   │       ├── ManagePRNRanges.jsx    # System-wide PRN management
│   │   │       ├── PRNRangeStudents.jsx   # View students in PRN range
│   │   │       ├── ManagePlacementOfficers.jsx # Officer management
│   │   │       ├── ManageJobs.jsx         # Job posting and management
│   │   │       ├── ManageJobRequests.jsx  # Approve/reject job requests
│   │   │       ├── ManageRequirementTemplates.jsx # Requirement templates
│   │   │       ├── ManageAllStudents.jsx  # System-wide student management
│   │   │       ├── SendNotification.jsx   # Send system-wide notifications
│   │   │       ├── ManageWhitelistRequests.jsx # Approve whitelist requests
│   │   │       ├── ManageSuperAdmins.jsx  # Super admin management
│   │   │       ├── ActivityLogs.jsx       # View activity logs
│   │   │       ├── JobEligibleStudents.jsx # System-wide eligible students
│   │   │       ├── PlacementPoster.jsx    # Generate system-wide posters
│   │   │       ├── ManageCollegeBranches.jsx # Branch management
│   │   │       └── Profile.jsx            # View/edit admin profile
│   │   ├── services/
│   │   │   └── api.js                     # Centralized API service layer
│   │   ├── utils/
│   │   │   └── helpers.js                 # Utility functions
│   │   ├── App.jsx                        # Main app with routing
│   │   ├── main.jsx                       # Entry point
│   │   └── index.css                      # Global styles with Tailwind
│   ├── index.html                         # HTML template
│   ├── .env.example                       # Frontend environment variables
│   ├── .dockerignore                      # Docker ignore patterns
│   ├── Dockerfile                         # Production-optimized 3-stage build
│   ├── Dockerfile.dev                     # Development Dockerfile
│   ├── nginx.conf                         # Nginx configuration
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.js                     # Vite configuration
│   ├── tailwind.config.js                 # Tailwind CSS configuration
│   └── postcss.config.js                  # PostCSS configuration
│
├── database/
│   ├── schema.sql                         # Complete database schema (23 tables)
│   ├── seed-data.sql                      # Seed data (60 colleges, 5 regions, 59 officers, 1 admin)
│   ├── db-commands.js                     # Database CLI utility
│   ├── college-branches-map.json          # College branch mappings
│   ├── add-sample-placements.sql          # Sample placement data
│   └── migrations/                        # Database migrations (23 files)
│       ├── 001_add_new_student_fields.sql
│       ├── 002_update_prn_ranges_for_placement_officers.sql
│       ├── 003_add_missing_placement_officer.sql
│       ├── 004_add_height_weight_criteria.sql
│       ├── 005_state_placement_cell_features.sql
│       ├── 001_add_performance_indexes.sql
│       ├── 001_create_extended_profiles.sql
│       ├── 002_add_driving_license_to_extended_profiles.sql
│       ├── 003_auto_create_extended_profiles.sql
│       ├── 004_fix_document_defaults.sql
│       ├── 005_recalculate_section_completion.sql
│       ├── 006_create_branches_reference_table.sql
│       ├── 006_create_job_request_requirements.sql
│       ├── 006_add_job_drives_and_placement_tracking.sql
│       ├── 007_fix_profile_completion_bug.sql
│       ├── 008_add_priority_to_notifications.sql
│       ├── 009_add_college_logo_fields.sql
│       ├── 010_add_missing_document_columns.sql
│       ├── 011_fix_profile_completion_logic.sql
│       ├── 012_update_completion_logic_at_least_one.sql
│       ├── 013_add_not_interested_education_option.sql
│       └── 011_add_manual_addition_flag.sql
│
├── fonts/                                 # Custom fonts for PDF generation
├── .env.docker.example                    # Docker environment template
├── .dockerignore                          # Global Docker ignore
├── docker-compose.yml                     # Production Docker Compose
├── docker-compose.dev.yml                 # Development Docker Compose with hot-reload
├── setup.bat / setup.sh                   # Quick automated setup
├── guided-setup.bat / guided-setup.sh     # Interactive setup with explanations
├── init-database.bat / init-database.sh   # Initialize database only
├── reset-database.bat / reset-database.sh # Reset database to initial state
├── apply-migrations.sh                    # Apply database migrations
├── start.bat / start.sh                   # Start frontend & backend
├── stop-servers.bat / stop-servers.sh     # Stop all servers
├── start-backend.sh                       # Start backend only
├── start-frontend.sh                      # Start frontend only
├── start-docker.sh                        # Start with Docker
├── push-to-github.bat / push-to-github.sh # Push to GitHub
├── TESTING.md                             # Comprehensive testing guide
├── SETUP.md                               # Detailed setup instructions
└── README.md                              # This file
```

---

## 🚀 Quick Start

> **For detailed setup instructions, see [SETUP.md](./SETUP.md) (if available)**

### Windows Quick Setup (Recommended for Local Development)

**Prerequisites:** Node.js v18+, PostgreSQL v14+

#### Option 1: Guided Setup (Recommended for First-Time Users)
```batch
# Run the interactive guided setup with step-by-step explanations
guided-setup.bat
```

#### Option 2: Quick Automated Setup
```batch
# Run automated setup
setup.bat

# Edit backend/.env with your credentials
# Then start the application
start.bat
```

**What gets set up:**
- ✅ Environment files with all required variables
- ✅ Backend and frontend dependencies
- ✅ Database with 23+ tables, triggers, and functions
- ✅ Seed data (60 colleges, 59 officers, 1 super admin)
- ✅ All 23 database migrations applied
- ✅ Email verification system
- ✅ Photo upload capabilities (Cloudinary)
- ✅ Extended profiles and job requirements
- ✅ Smart application system
- ✅ Activity logging and audit trail
- ✅ Rate limiting for 20k+ users

**Batch/Shell Files Available:**
- `setup.bat / setup.sh` - Quick automated setup
- `guided-setup.bat / guided-setup.sh` - Interactive setup with explanations
- `init-database.bat / init-database.sh` - Initialize database only
- `reset-database.bat / reset-database.sh` - Reset database to initial state
- `apply-migrations.sh` - Apply new migrations
- `start.bat / start.sh` - Start frontend & backend
- `stop-servers.bat / stop-servers.sh` - Stop all servers

---

### Docker Deployment (Recommended for Production)

**Prerequisites:** Docker and Docker Compose installed

```bash
# Clone repository
git clone <your-repo-url>
cd MajorProject

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your production values

# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access application
# Frontend: http://localhost
# Backend: http://localhost:5000
# Database: localhost:5432
```

**Docker Commands:**
```bash
# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# View service status
docker-compose ps

# Execute commands in containers
docker-compose exec backend npm run db:seed
docker-compose exec postgres psql -U postgres -d campus_placement_portal
```

**Development Mode (with hot-reload):**
```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up -d

# Frontend will run on http://localhost:5173 with Vite HMR
# Backend will run on http://localhost:5000 with nodemon
```

---

### Manual Installation (Linux/Mac/Windows)

**Prerequisites:**
- Node.js v18+
- PostgreSQL v14+
- npm or yarn

#### 1. Clone Repository
```bash
git clone <your-repo-url>
cd MajorProject
```

#### 2. Setup Database
```bash
# Create database
createdb campus_placement_portal

# Or using psql
psql -U postgres
CREATE DATABASE campus_placement_portal;
\q

# Run schema
psql -U postgres -d campus_placement_portal -f database/schema.sql

# Seed initial data
psql -U postgres -d campus_placement_portal -f database/seed-data.sql

# Apply migrations
for file in database/migrations/*.sql; do
  psql -U postgres -d campus_placement_portal -f "$file"
done
```

#### 3. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

**Required Environment Variables (.env):**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_placement_portal
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (Generate 64+ char random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email (for verification) - REQUIRED for email verification feature
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password  # Not regular password!
EMAIL_FROM=State Placement Cell <your_email@gmail.com>

# Cloudinary (for photo uploads) - REQUIRED for photo upload feature
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (CRITICAL for email verification links)
# Local Development
FRONTEND_URL=http://localhost:5173
# Production (Update this for hosted deployment)
# FRONTEND_URL=https://your-domain.com
```

**How to get credentials:**
- **Cloudinary:** Sign up at https://cloudinary.com (free tier available)
- **Gmail App Password:** https://support.google.com/accounts/answer/185833
- **JWT Secret:** Generate random string (64+ chars) at https://randomkeygen.com/

#### 4. Start Backend
```bash
npm run dev
# Runs on http://localhost:5000
```

#### 5. Setup Frontend
```bash
cd ../frontend
npm install
```

#### 6. Start Frontend
```bash
npm run dev
# Runs on http://localhost:5173
```

#### 7. Access Application
- Open http://localhost:5173
- Login with default credentials (see below)

---

### Default Credentials

**Super Admin:**
- Email: `adityanche@gmail.com`
- Password: `y9eshszbrr`

**Placement Officers:**
- Username: `<phone_number>` (e.g., `9497219788`)
- Password: `123`
- **Note:** 60 placement officers created (one per college) during seed

**Students:**
- Must register first at `/register`
- PRN must be in valid range (set by super admin)
- Default PRN range after seed: `2301150100` to `2301150999`

---

### Database CLI Utility

A command-line utility to view database information:

```bash
# Navigate to database directory
cd database

# View database statistics
node db-commands.js stats

# List all tables
node db-commands.js tables

# Student statistics
node db-commands.js students

# Job statistics
node db-commands.js jobs

# View all colleges
node db-commands.js colleges

# View regions
node db-commands.js regions

# Recent activity
node db-commands.js recent

# Help
node db-commands.js help
```

---

## 🗄️ Database Schema

### Core Tables (23 Total)

#### 1. **users**
Central user authentication table for all roles.
```sql
- id (PK)
- email (unique)
- password_hash
- role (student | placement_officer | super_admin)
- is_active
- last_login
- created_at, updated_at
```

#### 2. **regions**
5 Kerala regions for geographic organization.
```sql
- id (PK)
- region_name (South, South-Central, Central, North-Central, North)
- created_at, updated_at
```

#### 3. **colleges**
60 polytechnic colleges across Kerala.
```sql
- id (PK)
- college_name
- region_id (FK → regions)
- district
- college_code (unique)
- branches (JSONB array) - College-specific branches
- created_at, updated_at
```

#### 4. **students**
Student Tier 1 profiles with comprehensive data.
```sql
- id (PK)
- prn (unique, indexed)
- user_id (FK → users)
- college_id (FK → colleges)
- region_id (FK → regions)
- student_name
- email (unique)
- mobile_number
- date_of_birth
- age (auto-calculated via trigger)
- gender
- height, weight
- branch
- programme_cgpa (auto-calculated via trigger)
- cgpa_sem1 to cgpa_sem6
- backlog_count, backlog_details
- complete_address
- has_driving_license, has_pan_card
- photo_url, photo_public_id (Cloudinary)
- registration_status (pending | approved | rejected)
- is_blacklisted
- blacklist_reason, blacklisted_at
- rejection_reason
- email_verified, email_verified_at
- email_verification_token
- email_verification_sent_count
- email_verification_last_sent_at
- created_at, updated_at
```

#### 5. **student_extended_profiles**
Student Tier 2 extended profile data.
```sql
- id (PK)
- student_id (FK → students, unique)
- sslc_marks, sslc_year, sslc_board
- twelfth_marks, twelfth_year, twelfth_board
- height_cm, weight_kg
- physically_handicapped, handicap_details
- district, permanent_address
- interests_hobbies
- father_name, father_occupation, father_annual_income
- mother_name, mother_occupation, mother_annual_income
- siblings_count, siblings_details
- has_pan_card, pan_number
- has_aadhar_card, aadhar_number
- has_passport, passport_number
- has_driving_license, driving_license_number
- interested_in_btech (yes | no | not_interested)
- interested_in_mtech (yes | no | not_interested)
- preferred_study_mode (full-time | part-time | distance)
- additional_certifications (JSONB array)
- achievements (JSONB array)
- extracurricular_activities (JSONB array)
- profile_completion_percentage (auto-calculated via trigger)
- created_at, updated_at
```

#### 6. **placement_officers**
One active officer per college with complete history.
```sql
- id (PK)
- user_id (FK → users)
- college_id (FK → colleges, unique for active)
- officer_name
- phone_number (unique)
- designation
- photo_url, photo_public_id
- is_active
- created_at, updated_at
```

#### 7. **placement_officer_history**
Complete audit trail of officer changes.
```sql
- id (PK)
- college_id (FK → colleges)
- officer_name
- phone_number
- email
- designation
- start_date
- end_date
- reason_for_change
- created_at
```

#### 8. **super_admins**
System administrators.
```sql
- id (PK)
- user_id (FK → users)
- admin_name
- created_at, updated_at
```

#### 9. **prn_ranges**
Valid PRN ranges for student registration.
```sql
- id (PK)
- range_start (for ranges)
- range_end (for ranges)
- single_prn (for single PRNs)
- description
- is_active (soft delete)
- is_enabled (for graduated batches)
- disabled_reason
- college_id (FK → colleges, optional for college-specific)
- added_by_role (super_admin | placement_officer)
- added_by_id
- disabled_by_id, disabled_at
- created_at, updated_at
```

#### 10. **jobs**
Job postings with eligibility criteria.
```sql
- id (PK)
- job_title
- company_name
- company_location
- job_description
- job_type (Full-time, Part-time, Internship, Contract)
- salary_package
- application_form_url
- application_start_date
- application_deadline
- is_active
- is_deleted, deleted_at, deleted_by, deletion_reason
- created_by (FK → users)
- created_at, updated_at
```

#### 11. **job_eligibility_criteria**
Multiple eligibility criteria per job.
```sql
- id (PK)
- job_id (FK → jobs)
- min_cgpa
- max_backlogs
- min_height, max_height
- min_weight, max_weight
- allowed_branches (JSONB array)
- target_type (all | regions | colleges)
- target_regions (JSONB array)
- target_colleges (JSONB array)
- created_at, updated_at
```

#### 12. **job_requirement_templates**
Tier 2 & 3 job requirements configuration.
```sql
- id (PK)
- job_id (FK → jobs)
- min_cgpa
- max_backlogs
- allowed_branches (JSONB array)
- requires_academic_extended (boolean)
- requires_physical_details (boolean)
- requires_family_details (boolean)
- requires_document_verification (boolean)
- requires_education_preferences (boolean)
- specific_field_requirements (JSONB)
- custom_fields (JSONB array)
- created_at, updated_at
```

#### 13. **job_applications**
Student job applications tracking.
```sql
- id (PK)
- student_id (FK → students)
- job_id (FK → jobs)
- application_status (submitted | under_review | shortlisted | rejected | selected)
- reviewed_by (FK → users)
- reviewed_at
- review_notes
- placement_package
- joining_date
- placement_location
- placement_notes
- applied_at
- updated_at
```

#### 14. **job_applications_extended**
Tier 2 snapshot and Tier 3 custom field responses.
```sql
- id (PK)
- application_id (FK → job_applications)
- tier2_snapshot (JSONB) - Extended profile data at application time
- custom_field_responses (JSONB) - Tier 3 custom field answers
- submitted_at
```

#### 15. **job_drives**
Placement drive scheduling.
```sql
- id (PK)
- job_id (FK → jobs)
- drive_date
- drive_time
- drive_location
- additional_instructions
- created_by (FK → users)
- created_at, updated_at
```

#### 16. **job_requests**
Placement officers can request job postings.
```sql
- id (PK)
- requesting_officer_id (FK → placement_officers)
- company_name
- job_title
- job_description
- eligibility_criteria (JSONB)
- target_type
- status (pending | approved | rejected)
- admin_review_comment
- created_at, updated_at
```

#### 17. **notifications**
System and user notifications.
```sql
- id (PK)
- title
- message
- sent_by (FK → users)
- priority (low | medium | high)
- sent_at
- created_at, updated_at
```

#### 18. **notification_recipients**
User-notification mapping with read status.
```sql
- id (PK)
- notification_id (FK → notifications)
- user_id (FK → users)
- is_read
- read_at
- created_at
```

#### 19. **notification_targets**
Region/college targeting for notifications.
```sql
- id (PK)
- notification_id (FK → notifications)
- target_type (all | region | college)
- target_id (region_id or college_id)
- created_at
```

#### 20. **whitelist_requests**
Requests to remove students from blacklist.
```sql
- id (PK)
- student_id (FK → students)
- requesting_officer_id (FK → placement_officers)
- request_reason
- status (pending | approved | rejected)
- reviewed_by (FK → users)
- review_comment
- reviewed_at
- created_at, updated_at
```

#### 21. **activity_logs**
Complete audit trail of system actions.
```sql
- id (PK)
- user_id (FK → users)
- user_email
- user_role
- action_type (login, logout, student_approved, job_created, etc.)
- action_description
- ip_address
- user_agent
- metadata (JSONB)
- timestamp
```

#### 22. **deleted_jobs_history**
Archive of deleted jobs.
```sql
- id (PK)
- job_id
- job_title
- company_name
- deleted_at
- deleted_by (FK → users)
- deletion_reason
- total_applications
- created_at
```

#### 23. **college_branches_reference**
Branch normalization mapping.
```sql
- id (PK)
- standard_branch_name
- short_name
- category (Design, Mechanical, Electronics, etc.)
- created_at
```

### Database Features

#### Materialized View
```sql
CREATE MATERIALIZED VIEW active_students_view AS
SELECT s.*, c.college_name, r.region_name
FROM students s
JOIN colleges c ON s.college_id = c.id
JOIN regions r ON s.region_id = r.id
WHERE s.registration_status = 'approved' AND s.is_blacklisted = false;
```

#### Triggers
```sql
-- Auto-update timestamps
CREATE TRIGGER update_students_timestamp ...

-- Auto-calculate age from DOB
CREATE TRIGGER calculate_age_trigger ...

-- Auto-create extended profile on student creation
CREATE TRIGGER auto_create_extended_profile ...

-- Auto-recalculate profile completion percentage
CREATE TRIGGER recalculate_profile_completion ...
```

#### Functions
```sql
-- Update all student ages (called by cron job)
CREATE OR REPLACE FUNCTION update_all_student_ages() ...

-- Refresh materialized view
CREATE OR REPLACE FUNCTION refresh_active_students_view() ...

-- Check if PRN is in valid range
CREATE OR REPLACE FUNCTION isPRNInRange(prn TEXT) ...

-- Calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion_percentage(student_id) ...
```

#### Indexes (40+)
```sql
-- Primary keys, foreign keys, unique constraints
CREATE INDEX idx_students_prn ON students(prn);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_students_registration_status ON students(registration_status);
CREATE INDEX idx_students_is_blacklisted ON students(is_blacklisted);
CREATE INDEX idx_students_cgpa ON students(programme_cgpa);
CREATE INDEX idx_extended_profiles_student ON student_extended_profiles(student_id);
CREATE INDEX idx_extended_profiles_completion ON student_extended_profiles(profile_completion_percentage);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_student ON job_applications(student_id);
CREATE INDEX idx_applications_status ON job_applications(application_status);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
-- ... and 25+ more optimized indexes
```

---

## 📡 API Documentation

### Base URL
- Local Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

### Authentication
All protected routes require JWT token in HTTP-only cookie or Authorization header.

**Response Format:**
```json
Success:
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}

Error:
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description"
}
```

---

### 🔐 Authentication Routes (`/api/auth`)

- **POST `/login`** - Login with email/PRN and password
- **POST `/register-student`** - Student registration with PRN validation (multipart/form-data)
- **GET `/verify-email/:token`** - Verify email with token from email link
- **POST `/resend-verification`** - Resend verification email (generates new token)
- **GET `/me`** - Get current logged-in user details
- **POST `/logout`** - Logout user (clears JWT cookie)
- **PUT `/change-password`** - Change user password

---

### 🎓 Student Routes (`/api/students`)

- **GET `/dashboard`** - Get student dashboard statistics
- **GET `/profile`** - Get complete student profile (Tier 1)
- **PUT `/profile`** - Update student profile
- **POST `/profile/photo`** - Upload profile photo
- **DELETE `/profile/photo`** - Delete profile photo
- **GET `/jobs`** - Get all jobs with eligibility indicators
- **POST `/apply/:jobId`** - Apply for a job (basic application)
- **GET `/applications`** - Get all student applications
- **GET `/notifications`** - Get student notifications
- **PUT `/notifications/:id/read`** - Mark notification as read
- **PUT `/notifications/:id/unread`** - Mark notification as unread

---

### 📝 Extended Profile Routes (`/api/students/extended-profile`)

- **GET `/`** - Get extended profile (Tier 2)
- **PUT `/academic-extended`** - Update academic extended section (SSLC, 12th)
- **PUT `/physical-details`** - Update physical details section
- **PUT `/family-details`** - Update family details section
- **PUT `/personal-details`** - Update personal details section
- **PUT `/document-verification`** - Update document verification section
- **PUT `/education-preferences`** - Update education preferences section

---

### 🚀 Enhanced Application Routes (`/api/students/jobs`)

- **POST `/:jobId/check-readiness`** - Check application readiness (validates Tier 1, 2, 3)
- **POST `/:jobId/apply-enhanced`** - Submit enhanced application with all tiers

---

### 👨‍💼 Placement Officer Routes (`/api/placement-officer`)

- **GET `/dashboard`** - Get placement officer dashboard statistics
- **GET `/profile`** - Get officer profile
- **PUT `/profile`** - Update officer profile
- **POST `/profile/photo`** - Upload profile photo
- **DELETE `/profile/photo`** - Delete profile photo
- **GET `/students`** - Get students from officer's college with filters
- **PUT `/students/:id/approve`** - Approve student registration
- **PUT `/students/:id/reject`** - Reject student registration
- **PUT `/students/:id/blacklist`** - Blacklist a student
- **POST `/students/:id/whitelist-request`** - Request whitelist for blacklisted student
- **GET `/students/export`** - Export students to PDF/Excel with custom filters
- **POST `/send-notification`** - Send notification to college students
- **GET `/prn-ranges`** - Get PRN ranges (super admin + own college)
- **POST `/prn-ranges`** - Add PRN range/single PRN for own college
- **PUT `/prn-ranges/:id`** - Update PRN range (only own created ranges)
- **DELETE `/prn-ranges/:id`** - Delete PRN range (only own created ranges)
- **GET `/prn-ranges/:id/students`** - View students in PRN range
- **GET `/prn-ranges/:id/students/export`** - Export students from PRN range
- **POST `/job-requests`** - Create job request for super admin approval
- **GET `/job-requests`** - Get all job requests from this officer
- **PUT `/job-requests/:id`** - Update pending job request
- **DELETE `/job-requests/:id`** - Delete pending job request
- **GET `/jobs/:id/applicants`** - View job applicants from college
- **GET `/college-branches`** - Get branches for officer's college

---

### 🛡️ Super Admin Routes (`/api/super-admin`)

#### Dashboard & Statistics
- **GET `/dashboard`** - Get comprehensive system statistics

#### PRN Range Management
- **GET `/prn-ranges`** - Get all PRN ranges (system-wide)
- **POST `/prn-ranges`** - Add system-wide PRN range
- **PUT `/prn-ranges/:id`** - Update PRN range (any range)
- **PUT `/prn-ranges/:id/toggle-enabled`** - Enable/disable PRN range
- **DELETE `/prn-ranges/:id`** - Permanently delete PRN range
- **GET `/prn-ranges/:id/students`** - View all students in a PRN range
- **GET `/prn-ranges/:id/students/export`** - Export students from PRN range to Excel

#### Placement Officer Management
- **GET `/placement-officers`** - Get all placement officers across colleges
- **POST `/placement-officers`** - Add/replace placement officer
- **PUT `/placement-officers/:id`** - Update officer details
- **POST `/placement-officers/:id/upload-photo`** - Upload officer photo
- **DELETE `/placement-officers/:id/photo`** - Delete officer photo
- **PUT `/placement-officers/:id/deactivate`** - Deactivate/remove officer
- **GET `/placement-officers/history/:collegeId`** - Get officer history for a college
- **DELETE `/placement-officers/history/:collegeId`** - Clear officer history for a college

#### Job Management
- **GET `/jobs`** - Get all jobs with application counts
- **POST `/jobs`** - Create job posting
- **PUT `/jobs/:id`** - Update job details
- **DELETE `/jobs/:id`** - Soft delete job (with reason)
- **DELETE `/jobs/:id/permanent`** - Permanently delete job
- **GET `/jobs/deleted-history`** - Get deleted jobs history
- **DELETE `/jobs/deleted-history/clear`** - Clear deleted jobs history
- **GET `/jobs/:id/applicants`** - Get all applicants for a job (system-wide)
- **PUT `/applications/:id/status`** - Update application status
- **PUT `/applications/:id/placement-details`** - Record placement details
- **POST `/jobs/:id/drive-schedule`** - Schedule placement drive
- **PUT `/jobs/:id/drive-schedule`** - Update drive schedule

#### Job Request Management
- **GET `/job-requests`** - Get all pending job requests
- **PUT `/job-requests/:id/approve`** - Approve job request (creates job)
- **PUT `/job-requests/:id/reject`** - Reject job request

#### Student Management
- **GET `/students`** - Get all students (system-wide) with filters
- **GET `/students/search/:prn`** - Search student by PRN
- **PUT `/students/:id/blacklist`** - System-wide blacklist
- **PUT `/students/:id/whitelist`** - Direct whitelist (bypass request)
- **DELETE `/students/:id`** - Permanently delete student
- **POST `/students/bulk-delete-photos`** - Bulk delete student photos
- **GET `/students/export/custom`** - Custom student export with field selection

#### Whitelist Request Management
- **GET `/whitelist-requests`** - Get all whitelist requests
- **PUT `/whitelist-requests/:id/approve`** - Approve whitelist request
- **PUT `/whitelist-requests/:id/reject`** - Reject whitelist request

#### Activity Logs
- **GET `/activity-logs`** - Get activity logs with filters
- **GET `/activity-logs/export`** - Export activity logs to CSV

#### Super Admin Management
- **GET `/super-admins`** - Get all super admins
- **POST `/super-admins`** - Create new super admin
- **PUT `/super-admins/:id/deactivate`** - Deactivate super admin
- **PUT `/super-admins/:id/activate`** - Reactivate super admin

#### Branch Management
- **GET `/college-branches/:collegeId`** - Get branches for a specific college
- **POST `/send-notification`** - Send system-wide notification

---

### 🔧 Job Requirements Routes (`/api`)

- **GET `/jobs/:jobId/requirements`** - Get job requirements
- **POST `/jobs/:jobId/requirements`** - Create/update job requirements
- **GET `/requirement-templates`** - Get requirement templates
- **POST `/requirement-templates`** - Create requirement template
- **PUT `/requirement-templates/:id`** - Update requirement template
- **DELETE `/requirement-templates/:id`** - Delete requirement template

---

### 🌍 Common/Public Routes (`/api/common`)

- **GET `/regions`** - Get all 5 Kerala regions
- **GET `/colleges`** - Get all colleges (with region filter)
- **GET `/colleges/:id/branches`** - Get branches for a specific college
- **POST `/validate-prn`** - Validate PRN before registration
- **GET `/jobs/:id`** - Get public job details

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens:** Stateless authentication with HTTP-only cookies
- **Bcrypt Hashing:** Password hashing with 10 salt rounds
- **Token Expiry:** 7-day expiry (configurable)
- **Role-Based Middleware:**
  - `protect()` - Verify JWT token
  - `authorize(...roles)` - Check user role
  - `studentApprovalCheck()` - Verify student approved status
- **College-Level Access:** Placement officers limited to own college
- **Password Strength Validation:** Minimum 8 chars, uppercase, lowercase, number

### Rate Limiting (Configured for 20k+ Users)
- **General API:** 1000 req/15min (production), 100 req/15min (dev)
- **Authentication:** 10 failed attempts/15min (only failed requests count)
- **Read Operations:** 60 req/min
- **Export Operations:** 30 exports/hour
- **File Upload:** 20 uploads/hour
- **Skip for Authenticated Users:** Higher limits for logged-in users
- **Skip for Super Admin:** No limits on exports

### Data Protection
- **SQL Injection Prevention:** Parameterized queries with pg library
- **XSS Protection:** Input sanitization and helmet middleware
- **CORS Configuration:** Whitelisted frontend URLs (supports multiple origins)
- **Security Headers (Helmet):**
  - Content Security Policy
  - XSS Protection
  - Clickjacking Protection
  - MIME Sniffing Prevention
  - Cross-Origin Resource Policy
- **Response Compression:** gzip compression for all responses (70-90% bandwidth reduction)
- **File Upload Validation:**
  - Max file size: 500KB (photos)
  - Allowed types: JPEG, PNG, JPG
  - Cloudinary virus scanning

### Activity Logging
- **Complete Audit Trail:** All important actions logged
- **Logged Information:**
  - User ID, email, role
  - Action type and description
  - IP address
  - User agent (browser/device)
  - Timestamp (millisecond precision)
  - Related entity IDs
- **Immutable Logs:** No edit/delete capability
- **Export for Compliance:** CSV export for audits

### Database Security
- **Foreign Key Constraints:** Data integrity enforcement
- **Check Constraints:** Value range validation
- **Unique Constraints:** Prevent duplicates (PRN, email, phone)
- **Index Optimization:** Performance without exposing data structure
- **Connection Pooling:** Prevent connection exhaustion attacks

---

## 🚀 Deployment

### Docker Deployment (Recommended)

#### Production Deployment
```bash
# Clone repository
git clone <your-repo-url>
cd MajorProject

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

**What's Included:**
- ✅ PostgreSQL database with automatic schema initialization
- ✅ Backend API with health checks and resource limits
- ✅ Frontend with Nginx and optimized builds
- ✅ Volume persistence for database, uploads, logs, backups
- ✅ Automatic restarts on failure
- ✅ Health monitoring for all services
- ✅ Structured logging (JSON format, rotation)
- ✅ Custom networking with subnet isolation
- ✅ Resource limits (CPU and memory constraints)

#### Development Deployment
```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up -d

# Features:
# - Frontend on :5173 with Vite HMR
# - Backend on :5000 with nodemon auto-restart
# - Volume mounting for live code changes
# - No build optimization (faster startup)
```

---

### Environment Configuration

#### Critical Environment Variables

**Database:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_placement_portal
DB_USER=postgres
DB_PASSWORD=<strong_password>
```

**JWT:**
```bash
JWT_SECRET=<generate_random_64_char_string>
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
```

**Email (Gmail App Password):**
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=<gmail_app_password>  # Not regular password!
EMAIL_FROM=State Placement Cell <your_email@gmail.com>
```

**Cloudinary:**
```bash
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

**Frontend URL (Critical for Email Verification):**
```bash
# Local Development
FRONTEND_URL=http://localhost:5173

# Production (IMPORTANT: Update this for hosted deployment)
FRONTEND_URL=https://your-domain.com  # No trailing slash
```

**⚠️ IMPORTANT for Production Deployment:**

The `FRONTEND_URL` environment variable is **CRITICAL** for email verification to work correctly:

1. **What it does**: Email verification links sent to students use this URL
   - Example: `${FRONTEND_URL}/verify-email?token=abc123`
   - If not set correctly, email links will point to localhost and won't work in production

2. **For Local Development**:
   - Use `http://localhost:5173` (default Vite dev server)

3. **For Production Deployment**:
   - Update to your actual domain: `https://placement.yourcollege.edu`
   - Do NOT include trailing slash
   - Must use HTTPS for security

4. **Where to configure**:
   - Backend `.env` file: `FRONTEND_URL=https://your-domain.com`
   - This tells the email service where to direct verification links

5. **Testing**: After deployment, register a test student and check:
   - Email verification link points to your production domain
   - Clicking the link opens your production site (not localhost)
   - Verification completes successfully

---

### Production Checklist

- [ ] Strong JWT_SECRET generated (64+ random characters)
- [ ] Database password changed from default
- [ ] Gmail App Password configured (not regular password)
- [ ] Cloudinary account setup and credentials added
- [ ] **FRONTEND_URL updated to production domain** (Critical!)
- [ ] SSL/HTTPS configured (Let's Encrypt recommended)
- [ ] Test email verification flow end-to-end with real email
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Database backups scheduled (daily recommended)
- [ ] Log rotation configured
- [ ] Monitoring setup (PM2, Docker logs)
- [ ] Super admin password changed from default
- [ ] Placement officer default passwords changed
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Security headers configured (Nginx/Express)

---

## 🧪 Testing

Comprehensive testing documentation available in [TESTING.md](./TESTING.md) (if available).

### Manual Testing Guide
- **11 Detailed Test Scenarios** covering all user roles
- **Step-by-step instructions** with expected results
- **Edge case testing** for validation and error handling
- **API testing examples** with Postman/cURL
- **Database testing queries** for verification

### Test Coverage
- ✅ Student registration with PRN validation
- ✅ Email verification flow (send, verify, resend)
- ✅ Extended profile management (5 sections)
- ✅ Smart application system (readiness check, validation)
- ✅ Student approval/rejection workflow
- ✅ Blacklist/whitelist workflow
- ✅ Job creation with requirements configuration
- ✅ Job application with Tier 1, 2, 3 data
- ✅ PRN range management
- ✅ Custom export with college-specific branches
- ✅ View/export students from PRN ranges
- ✅ Placement officer management
- ✅ Activity logging verification
- ✅ Role-based access control
- ✅ Rate limiting validation
- ✅ Placement drive scheduling
- ✅ Placement tracking and recording

### Database CLI Testing
```bash
# Verify database setup
node database/db-commands.js stats

# Check student data
node database/db-commands.js students

# Verify job data
node database/db-commands.js jobs

# Recent activity
node database/db-commands.js recent
```

### Security Testing
- SQL injection prevention
- XSS attack prevention
- JWT token manipulation
- CORS configuration
- Password strength validation
- Role-based access enforcement
- Rate limiting effectiveness

---

## 📊 System Statistics

### Current System Capacity
- **Users:** Students, Placement Officers (60), Super Admins
- **Colleges:** 60 polytechnic colleges across Kerala
- **Regions:** 5 (South, South-Central, Central, North-Central, North)
- **Branches:** 26 official Kerala polytechnic branches with normalization
- **Scale:** Designed for 20,000+ concurrent users

### Technical Metrics
- **API Endpoints:** 80+ RESTful endpoints
- **Database Tables:** 23 core tables
- **Database Indexes:** 40+ optimized indexes
- **Database Triggers:** 4 automated triggers
- **Database Functions:** 4 custom functions
- **Materialized Views:** 1 performance-optimized view
- **Cron Jobs:** 3 background tasks (age update, view refresh, cleanup)
- **Activity Log Actions:** 20+ tracked action types
- **Database Migrations:** 23 migration files

### Feature Breakdown
- **3-Tier Profile System:** Tier 1 (Basic) + Tier 2 (Extended) + Tier 3 (Custom)
- **5 Extended Profile Sections:** Academic, Physical, Family, Personal, Documents, Education
- **Job Requirement Types:** Tier 1 eligibility + Tier 2 sections + Tier 3 custom fields
- **Application Statuses:** 5 (Submitted, Under Review, Shortlisted, Rejected, Selected)
- **Email Types:** 7 (Verification, Drive Schedule, Shortlist, Selection, Rejection, Password Reset, Generic)
- **Rate Limiter Tiers:** 5 (General, Auth, Read, Export, Upload)

---

## 🎯 Key Features Summary

### Student Role
✅ PRN-based registration with validation
✅ Email verification system
✅ Photo upload to Cloudinary
✅ 3-tier profile system (Basic + Extended + Custom)
✅ 5-section extended profile with completion tracking
✅ Smart application system with requirement validation
✅ View all jobs with eligibility indicators
✅ Apply to any job with data snapshot
✅ Track application status
✅ Receive and manage notifications
✅ Update profile and change password
✅ Auto-calculated age and programme CGPA

### Placement Officer Role
✅ Approve/reject student registrations
✅ Blacklist students with reason
✅ Request whitelist from super admin
✅ Send college-specific notifications
✅ Export students (PDF/Excel) with custom fields
✅ College-specific branch filtering in exports
✅ Manage college PRN ranges
✅ View/export students from PRN ranges
✅ Create job requests with requirements configuration
✅ View job applicants from college
✅ Generate placement posters
✅ Bulk photo deletion
✅ Upload/delete officer photo
✅ Manage college branches

### Super Admin Role
✅ System-wide PRN range management
✅ Enable/disable PRN ranges for graduated batches
✅ View/export students from any PRN range
✅ Manage placement officers with complete history
✅ Upload/delete officer photos
✅ Create and manage jobs with advanced requirements
✅ Configure Tier 2/3 requirements per job
✅ Manage requirement templates
✅ Schedule placement drives
✅ Update application status
✅ Record placement details (package, location, joining date)
✅ Soft delete and permanently delete jobs
✅ View deleted jobs history
✅ Approve/reject job requests
✅ System-wide student management
✅ Approve/reject whitelist requests
✅ Custom student export with dynamic branch filtering
✅ College-specific branch filtering
✅ View and export activity logs
✅ Manage super admins
✅ Bulk student photo deletion
✅ Complete audit trail
✅ Send system-wide notifications

---

## 🛣️ Roadmap

### Phase 1 (Completed) ✅
- [x] Complete backend API with 80+ endpoints
- [x] Database schema with triggers, functions, materialized views
- [x] JWT authentication and role-based authorization
- [x] Email verification system
- [x] Photo upload with Cloudinary
- [x] Complete frontend with all role dashboards
- [x] Student registration with PRN validation
- [x] 3-tier profile architecture (Tier 1 + Tier 2 + Tier 3)
- [x] Extended profile system with 5 sections
- [x] Smart application system with requirement validation
- [x] Job management with advanced requirements configuration
- [x] Job requirement templates
- [x] Placement drive scheduling
- [x] Placement tracking and recording
- [x] PRN range management with view/export
- [x] Placement officer management with history
- [x] Blacklist/whitelist workflow
- [x] Notification system
- [x] Activity logging and audit trail
- [x] Custom export with dynamic filtering
- [x] College-specific branch filtering
- [x] Branch normalization system
- [x] Placement poster generation
- [x] Rate limiting for 20k+ users
- [x] Background jobs (age update, view refresh, cleanup)
- [x] Docker deployment configuration
- [x] Database CLI utility
- [x] 23 database migrations

### Phase 2 (Future Enhancements)
- [ ] Real-time notifications with WebSocket
- [ ] Resume upload and parsing
- [ ] Email notifications for all actions (expanded)
- [ ] SMS integration for critical updates
- [ ] Advanced analytics dashboard
- [ ] Placement statistics and reports
- [ ] Interview scheduling system
- [ ] Company portal for direct posting
- [ ] Student performance predictions
- [ ] Automated email reminders
- [ ] Document verification system
- [ ] Video interview integration

### Phase 3 (Long-term Goals)
- [ ] Mobile app (React Native)
- [ ] AI-powered job matching
- [ ] Blockchain-based certificates
- [ ] Multi-language support (Malayalam, English)
- [ ] Chatbot for student queries
- [ ] API for third-party integrations
- [ ] Advanced security features (2FA, biometric)

---

## 📄 License

This project is developed as a major project for academic purposes.

**State Placement Cell**
Built for 60 Polytechnic Colleges in Kerala

---

## 👨‍💻 Developer Notes

### Quick Commands
```bash
# Development
npm run dev           # Start backend in dev mode
npm run db:setup      # Initialize database
npm run db:seed       # Seed initial data

# Database
node database/db-commands.js stats    # Database statistics
node database/db-commands.js help     # View all commands

# Production
docker-compose up -d                  # Start all services
docker-compose logs -f backend        # View backend logs
docker-compose exec postgres psql -U postgres  # Access database
```

### Useful Database Queries
```sql
-- View all active students
SELECT * FROM active_students_view LIMIT 10;

-- Check recent activity
SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 20;

-- View job application statistics
SELECT j.job_title, COUNT(ja.id) as applications
FROM jobs j
LEFT JOIN job_applications ja ON j.id = ja.job_id
GROUP BY j.id, j.job_title;

-- Check PRN range coverage
SELECT * FROM prn_ranges WHERE is_enabled = true;

-- View extended profile completion distribution
SELECT
  CASE
    WHEN profile_completion_percentage >= 80 THEN '80-100%'
    WHEN profile_completion_percentage >= 60 THEN '60-79%'
    WHEN profile_completion_percentage >= 40 THEN '40-59%'
    WHEN profile_completion_percentage >= 20 THEN '20-39%'
    ELSE '0-19%'
  END as completion_range,
  COUNT(*) as student_count
FROM student_extended_profiles
GROUP BY completion_range
ORDER BY completion_range DESC;
```

---

## 📚 Additional Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions (if available)
- [TESTING.md](./TESTING.md) - Comprehensive testing guide (if available)
- [backend/.env.example](./backend/.env.example) - Environment variables reference

---

**🎓 Built with ❤️ for Kerala Polytechnics**

**State Placement Cell** - Empowering 60 polytechnic colleges across Kerala with modern placement management featuring 3-tier profile architecture, smart application system, and comprehensive placement tracking.

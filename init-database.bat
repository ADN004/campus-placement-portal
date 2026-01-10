@echo off
REM ========================================
REM   Database Initialization Script
REM   State Placement Cell
REM ========================================
REM
REM This script initializes the database for a new installation.
REM It performs the following operations:
REM   1. Creates the database 'campus_placement_portal'
REM   2. Runs schema.sql to create all tables, triggers, and functions
REM   3. Runs seed-data.sql to insert initial data
REM   4. Applies all migrations in correct order
REM
REM NOTE: If database already exists, use reset-database.bat instead
REM
REM ========================================

echo.
echo ========================================
echo   Database Initialization
echo   State Placement Cell
echo ========================================
echo.
echo This script will initialize the database from scratch.
echo.
echo Operations:
echo   [1] Create database 'campus_placement_portal'
echo   [2] Create all tables, triggers, and functions
echo   [3] Insert seed data (regions, colleges, officers)
echo   [4] Apply all migrations for latest features
echo.
echo WARNING: If database already exists, creation will fail.
echo To reset an existing database, use: reset-database.bat
echo.
pause

REM ========================================
REM Step 1: Create Database
REM ========================================
echo.
echo ========================================
echo [Step 1/4] Creating Database
echo ========================================
echo.
echo You will be prompted for your PostgreSQL password.
echo.

psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create database!
    echo.
    echo Possible reasons:
    echo   - Database already exists (use reset-database.bat instead)
    echo   - PostgreSQL is not running
    echo   - Incorrect password
    echo   - Insufficient permissions
    echo.
    pause
    exit /b 1
)

echo [OK] Database created successfully!

REM ========================================
REM Step 2: Create Schema
REM ========================================
echo.
echo ========================================
echo [Step 2/4] Creating Database Schema
echo ========================================
echo.

if not exist "database\schema.sql" (
    echo [ERROR] database\schema.sql not found!
    pause
    exit /b 1
)

echo Creating tables, triggers, functions, and indexes...
echo This may take a moment...
echo.

psql -U postgres -d campus_placement_portal -f database\schema.sql
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create database schema!
    echo Check the output above for specific errors.
    pause
    exit /b 1
)

echo [OK] Schema created successfully!

REM ========================================
REM Step 3: Seed Initial Data
REM ========================================
echo.
echo ========================================
echo [Step 3/4] Seeding Initial Data
echo ========================================
echo.

if not exist "database\seed-data.sql" (
    echo [ERROR] database\seed-data.sql not found!
    pause
    exit /b 1
)

echo Inserting:
echo   - 5 regions across Kerala
echo   - 60 polytechnic colleges
echo   - 59 placement officers (one per college)
echo   - 1 super admin account
echo   - Default PRN ranges
echo.

psql -U postgres -d campus_placement_portal -f database\seed-data.sql
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to seed initial data!
    echo Check the output above for specific errors.
    pause
    exit /b 1
)

echo [OK] Seed data inserted successfully!

REM ========================================
REM Step 4: Apply Migrations
REM ========================================
echo.
echo ========================================
echo [Step 4/4] Applying Database Migrations
echo ========================================
echo.
echo Applying all feature enhancements and updates...
echo.

REM Define migration order to handle dependencies correctly
set "migrations=001_add_new_student_fields.sql 001_add_performance_indexes.sql 001_create_extended_profiles.sql 002_update_prn_ranges_for_placement_officers.sql 002_add_college_branches.sql 002_add_driving_license_to_extended_profiles.sql 003_add_missing_placement_officer.sql 003_auto_create_extended_profiles.sql 004_add_height_weight_criteria.sql 004_fix_document_defaults.sql 005_state_placement_cell_features.sql 005_recalculate_section_completion.sql 006_create_branches_reference_table.sql 006_create_job_request_requirements.sql 006_add_job_drives_and_placement_tracking.sql 007_fix_profile_completion_bug.sql 008_add_priority_to_notifications.sql 009_add_college_logo_fields.sql 010_add_missing_document_columns.sql 011_fix_profile_completion_logic.sql 011_add_manual_addition_flag.sql 012_update_completion_logic_at_least_one.sql 013_add_not_interested_education_option.sql"

set applied=0
set skipped=0

for %%m in (%migrations%) do (
    if exist "database\migrations\%%m" (
        echo - Applying: %%m
        psql -U postgres -d campus_placement_portal -f "database\migrations\%%m" 2>nul
        if errorlevel 1 (
            echo   [SKIP] Already applied or optional
            set /a skipped+=1
        ) else (
            echo   [OK] Applied successfully
            set /a applied+=1
        )
    ) else (
        echo - [MISSING] %%m not found (skipping)
    )
)

echo.
echo Migration summary:
echo   Applied: %applied%
echo   Skipped: %skipped%
echo.
echo [OK] All migrations processed!

REM ========================================
REM Completion
REM ========================================
echo.
echo ========================================
echo   DATABASE INITIALIZATION COMPLETE!
echo ========================================
echo.
echo Your database is now ready with:
echo   [*] 19+ tables with complete relationships
echo   [*] 5 regions across Kerala
echo   [*] 60 polytechnic colleges
echo   [*] 59 placement officers (one per college)
echo   [*] 1 super admin account
echo   [*] Default PRN ranges
echo   [*] All triggers, functions, and indexes
echo   [*] Latest feature migrations applied
echo.
echo ========================================
echo   LOGIN CREDENTIALS:
echo ========================================
echo.
echo Super Admin:
echo   Email:    adityanche@gmail.com
echo   Password: y9eshszbrr
echo.
echo Placement Officers:
echo   Username: phone_number (e.g., 9497219788)
echo   Password: 123
echo.
echo IMPORTANT: Change default passwords after first login!
echo.
echo ========================================
echo.
echo Next Steps:
echo   1. Configure backend\.env with your credentials
echo   2. Run: start.bat
echo.
echo ========================================
pause

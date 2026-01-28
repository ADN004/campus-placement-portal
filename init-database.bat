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
echo [Step 1/3] Creating Database
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
echo [Step 2/3] Creating Database Schema
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
echo [Step 3/3] Seeding Initial Data
echo ========================================
echo.

echo Inserting:
echo   - 5 regions across Kerala
echo   - 60 polytechnic colleges
echo   - 60 placement officers (one per college)
echo   - Super admin account (optional, interactive)
echo   - Default PRN ranges
echo.
echo Running Node.js seeding script...
echo You will be prompted to optionally create a super admin.
echo.

cd backend
call node scripts/seedDatabase.js
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to seed initial data!
    echo Check the output above for specific errors.
    cd ..
    pause
    exit /b 1
)
cd ..

echo [OK] Seed data inserted successfully!

REM ========================================
REM Completion
REM ========================================
echo.
echo ========================================
echo   DATABASE INITIALIZATION COMPLETE!
echo ========================================
echo.
echo Your database is now ready with:
echo   [*] 28 tables with complete relationships
echo   [*] 5 regions across Kerala
echo   [*] 60 polytechnic colleges
echo   [*] 60 placement officers (one per college)
echo   [*] Super admin account (if created during setup)
echo   [*] Default PRN ranges
echo   [*] All triggers, functions, and indexes
echo.
echo ========================================
echo   LOGIN CREDENTIALS:
echo ========================================
echo.
echo Super Admin:
echo   (Created during seeding if you chose yes)
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

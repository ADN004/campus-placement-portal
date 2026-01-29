@echo off
REM ========================================
REM   Apply Database Migrations
REM   State Placement Cell
REM ========================================
REM
REM This script applies pending database migrations
REM to an existing database without losing data.
REM
REM Use this when:
REM   - You pull new code that includes database changes
REM   - You need to upgrade an existing database
REM   - New tables or columns need to be added
REM
REM ========================================

echo.
echo ========================================
echo   Apply Database Migrations
echo   State Placement Cell
echo ========================================
echo.
echo This script will apply database migrations
echo to your existing database WITHOUT losing data.
echo.
echo.

REM Check if database exists
psql -U postgres -d campus_placement_portal -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Database 'campus_placement_portal' not found!
    echo.
    echo If this is a new installation, use: init-database.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Database connection verified.
echo.

REM ========================================
REM Apply Migrations
REM ========================================

echo ========================================
echo   Applying Migrations
echo ========================================
echo.

REM Migration: Add student_resumes table
echo [1] Checking student_resumes table...
psql -U postgres -d campus_placement_portal -c "SELECT 1 FROM student_resumes LIMIT 1;" >nul 2>&1
if errorlevel 1 (
    echo     Creating student_resumes table...
    psql -U postgres -d campus_placement_portal -f backend\migrations\add_student_resumes_table.sql
    if errorlevel 1 (
        echo [ERROR] Failed to create student_resumes table!
        pause
        exit /b 1
    )
    echo     [OK] student_resumes table created!

    REM Create resume records for existing students
    echo     Creating resume records for existing students...
    psql -U postgres -d campus_placement_portal -c "INSERT INTO student_resumes (student_id) SELECT id FROM students ON CONFLICT (student_id) DO NOTHING;"
    echo     [OK] Resume records created for existing students!
) else (
    echo     [SKIP] student_resumes table already exists
)

echo.

REM Migration: Replace job_type with no_of_vacancies
echo [2] Checking no_of_vacancies column in jobs table...
psql -U postgres -d campus_placement_portal -c "SELECT no_of_vacancies FROM jobs LIMIT 1;" >nul 2>&1
if errorlevel 1 (
    echo     Adding no_of_vacancies column and removing job_type...
    psql -U postgres -d campus_placement_portal -f backend\migrations\replace_job_type_with_vacancies.sql
    if errorlevel 1 (
        echo [ERROR] Failed to apply vacancies migration!
        pause
        exit /b 1
    )
    echo     [OK] no_of_vacancies column added, job_type removed!
) else (
    echo     [SKIP] no_of_vacancies column already exists
)

echo.
echo ========================================
echo   Migrations Complete!
echo ========================================
echo.
echo All migrations have been applied successfully.
echo Your database is now up to date.
echo.
pause

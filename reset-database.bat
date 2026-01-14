@echo off
COLOR 0C
echo ========================================
echo   DATABASE RESET WARNING
echo   State Placement Cell
echo ========================================
echo.
echo This script will COMPLETELY DELETE your database
echo and create it fresh with initial data.
echo.
echo ALL DATA WILL BE LOST including:
echo   - All student registrations
echo   - All job postings
echo   - All applications
echo   - All notifications
echo   - All activity logs
echo   - Everything!
echo.
COLOR 0E
echo Are you absolutely sure you want to continue?
set /p confirm="Type 'YES' to confirm: "

if not "%confirm%"=="YES" (
    echo.
    echo Reset cancelled. No changes made.
    pause
    exit /b 0
)

COLOR 0A
echo.
echo Proceeding with database reset...
echo.

REM Set PostgreSQL password (change this to your password)
set PGPASSWORD=y9eshszbrr

echo [1/4] Dropping existing database...
psql -U postgres -c "DROP DATABASE IF EXISTS campus_placement_portal;" 2>nul
if errorlevel 1 (
    echo [ERROR] Failed to drop database!
    echo Make sure no applications are connected to it.
    pause
    exit /b 1
)
echo [OK] Database dropped!
echo.

echo [2/4] Creating fresh database...
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if errorlevel 1 (
    echo [ERROR] Failed to create database!
    pause
    exit /b 1
)
echo [OK] Database created!
echo.

echo [3/4] Running schema.sql...
psql -U postgres -d campus_placement_portal -f database\schema.sql
if errorlevel 1 (
    echo [ERROR] Failed to create schema!
    pause
    exit /b 1
)
echo [OK] Schema created!
echo.

echo [4/4] Running seed data via Node.js...
echo You will be prompted to optionally create a super admin.
echo.
cd backend
call node scripts/seedDatabase.js
if errorlevel 1 (
    echo [ERROR] Failed to seed data!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Seed data inserted!
echo.

COLOR 0A
echo ========================================================================
echo   DATABASE RESET COMPLETE!
echo ========================================================================
echo.
echo Your database has been reset to initial state with:
echo   - 27 tables with all triggers and functions
echo   - 5 regions across Kerala
echo   - 60 polytechnic colleges
echo   - 60 placement officers
echo   - Super admin account (if created during setup)
echo   - Default PRN ranges
echo.
echo Login credentials:
echo   Super Admin: (created during seeding if you chose yes)
echo   Officers: phone_number / 123
echo.
echo You can now start the application with: start.bat
echo ========================================================================
pause

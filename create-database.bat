@echo off
echo ========================================
echo   Creating Database
echo ========================================
echo.

REM Set PostgreSQL password (will prompt)
echo Please enter your PostgreSQL password when prompted.
echo.

REM Create database
echo Creating database 'campus_placement_portal'...
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if errorlevel 1 (
    echo.
    echo Database might already exist or there was an error.
    echo If database exists, that's OK! Continuing...
)
echo.

REM Run schema
echo Running database schema...
cd backend
call npm run db:setup
if errorlevel 1 (
    echo ERROR: Failed to create database schema
    cd ..
    pause
    exit /b 1
)
echo Schema created successfully!
echo.

REM Seed data
echo Seeding database with initial data...
call npm run db:seed
if errorlevel 1 (
    echo ERROR: Failed to seed database
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================
echo   Database created successfully!
echo ========================================
echo.
echo - Database name: campus_placement_portal
echo - 5 regions created
echo - 60 colleges created
echo - 59 placement officers created
echo - 1 super admin created
echo.
echo Super Admin Credentials:
echo Email: adityanche@gmail.com
echo Password: y9eshszbrr
echo.
echo You can now start the application with: start.bat
echo ========================================
pause

@echo off
echo ========================================
echo   Reset Database
echo ========================================
echo.
echo WARNING: This will DELETE all data and recreate the database!
echo.
set /p confirm="Are you sure? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Operation cancelled.
    pause
    exit /b 0
)
echo.

echo Dropping existing database...
psql -U postgres -c "DROP DATABASE IF EXISTS campus_placement_portal;"
echo.

echo Creating fresh database...
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
echo.

echo Running schema...
cd backend
call npm run db:setup
if errorlevel 1 (
    echo ERROR: Failed to create schema
    cd ..
    pause
    exit /b 1
)
echo.

echo Seeding data...
call npm run db:seed
if errorlevel 1 (
    echo ERROR: Failed to seed data
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================
echo   Database reset complete!
echo ========================================
echo.
echo The database has been recreated with fresh data.
echo - 60 colleges
echo - 59 placement officers
echo - 1 super admin
echo.
pause

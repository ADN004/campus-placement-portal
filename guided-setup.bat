@echo off
SETLOCAL EnableDelayedExpansion
COLOR 0A

:: Campus Placement Portal - Interactive Guided Setup
:: This batch file will walk you through the entire setup process step-by-step

:WELCOME
cls
echo.
echo ========================================================================
echo         CAMPUS PLACEMENT PORTAL - INTERACTIVE GUIDED SETUP
echo ========================================================================
echo.
echo This script will guide you through setting up the Campus Placement
echo Portal step-by-step. You'll learn what each step does and why it's
echo needed.
echo.
echo Press any key to begin the guided setup...
pause >nul

:STEP1_PREREQUISITES
cls
echo.
echo ========================================================================
echo  STEP 1: CHECKING PREREQUISITES
echo ========================================================================
echo.
echo Before we start, we need three things installed:
echo   1. Node.js - JavaScript runtime for running the backend and building frontend
echo   2. npm - Node Package Manager for installing dependencies
echo   3. PostgreSQL - Database system to store all data
echo.
echo Let's check if you have these installed...
echo.
pause

echo [*] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js is NOT installed!
    echo.
    echo WHAT IS NODE.JS?
    echo   Node.js lets you run JavaScript code on your computer (not just in browser^).
    echo   Our backend API is written in JavaScript and needs Node.js to run.
    echo.
    echo TO INSTALL:
    echo   1. Visit: https://nodejs.org/
    echo   2. Download the LTS version
    echo   3. Run the installer
    echo   4. Restart this script after installation
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js is installed: !NODE_VERSION!
)

echo.
echo [*] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [X] npm is NOT installed!
    echo.
    echo npm should come with Node.js. Try reinstalling Node.js.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm is installed: !NPM_VERSION!
)

echo.
echo [*] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [X] PostgreSQL is NOT installed!
    echo.
    echo WHAT IS POSTGRESQL?
    echo   PostgreSQL is a powerful database system. It stores all your data:
    echo   - User accounts (students, officers, admin^)
    echo   - College information
    echo   - Job postings
    echo   - Applications
    echo   - Everything!
    echo.
    echo TO INSTALL:
    echo   1. Visit: https://www.postgresql.org/download/windows/
    echo   2. Download PostgreSQL 15 or later
    echo   3. Run installer (remember the password you set^)
    echo   4. Default port 5432 is fine
    echo   5. Restart this script after installation
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo [OK] PostgreSQL is installed: !PG_VERSION!
)

echo.
echo ========================================================================
echo  All prerequisites are installed! Ready to proceed.
echo ========================================================================
echo.
echo Press any key to continue to Step 2...
pause >nul

:STEP2_PROJECT_STRUCTURE
cls
echo.
echo ========================================================================
echo  STEP 2: UNDERSTANDING PROJECT STRUCTURE
echo ========================================================================
echo.
echo Your Campus Placement Portal has 3 main parts:
echo.
echo   1. BACKEND (backend/ folder^)
echo      - Node.js server that handles all business logic
echo      - API endpoints that frontend calls
echo      - Database connection and queries
echo      - Authentication and security
echo.
echo   2. FRONTEND (frontend/ folder^)
echo      - React application (the visual interface^)
echo      - What users see in their browser
echo      - Makes API calls to backend
echo      - Handles user interactions
echo.
echo   3. DATABASE (PostgreSQL^)
echo      - Stores all persistent data
echo      - 15 tables with relationships
echo      - Handles data integrity
echo.
echo FLOW OF DATA:
echo   User Browser ^<--^> Frontend ^<--API calls--^> Backend ^<--SQL--^> Database
echo.
echo Press any key to continue to Step 3...
pause >nul

:STEP3_ENVIRONMENT
cls
echo.
echo ========================================================================
echo  STEP 3: ENVIRONMENT CONFIGURATION
echo ========================================================================
echo.
echo WHAT ARE ENVIRONMENT VARIABLES?
echo   These are configuration values that change between environments.
echo   For example:
echo     - Development: Database password might be "postgres"
echo     - Production: Database password would be a strong random password
echo.
echo We store these in .env files (which are NOT pushed to GitHub for security^).
echo.
echo Let's create your environment files...
echo.
pause

:: Root .env
if not exist ".env" (
    echo [*] Creating root .env file...
    echo.
    echo # Campus Placement Portal - Environment Configuration > .env
    echo # >> .env
    echo # Database Configuration >> .env
    echo DB_HOST=localhost >> .env
    echo DB_PORT=5432 >> .env
    echo DB_NAME=campus_placement_portal >> .env
    echo DB_USER=postgres >> .env
    echo DB_PASSWORD=postgres >> .env
    echo # >> .env
    echo # JWT Authentication >> .env
    echo JWT_SECRET=your_super_secret_jwt_key_change_this_in_production >> .env
    echo JWT_EXPIRE=7d >> .env
    echo JWT_COOKIE_EXPIRE=7 >> .env
    echo # >> .env
    echo # Server Configuration >> .env
    echo NODE_ENV=development >> .env
    echo BACKEND_PORT=5000 >> .env
    echo FRONTEND_PORT=5173 >> .env
    echo FRONTEND_URL=http://localhost:5173 >> .env
    echo # >> .env
    echo # Docker Configuration >> .env
    echo POSTGRES_USER=postgres >> .env
    echo POSTGRES_PASSWORD=postgres >> .env
    echo POSTGRES_DB=campus_placement_portal >> .env
    echo. >> .env
    echo [OK] Root .env created
    echo.
    echo EXPLANATION OF KEY VARIABLES:
    echo   - DB_PASSWORD: Password for PostgreSQL database
    echo   - JWT_SECRET: Secret key for encrypting authentication tokens
    echo   - BACKEND_PORT: Port where backend API runs (5000^)
    echo   - FRONTEND_PORT: Port where frontend runs (5173^)
    echo.
) else (
    echo [SKIP] Root .env already exists
)

:: Backend .env
if not exist "backend\.env" (
    echo [*] Creating backend .env file...
    copy .env backend\.env >nul
    echo [OK] Backend .env created
    echo.
) else (
    echo [SKIP] Backend .env already exists
)

:: Frontend .env
if not exist "frontend\.env" (
    echo [*] Creating frontend .env file...
    echo VITE_API_URL=http://localhost:5000/api > frontend\.env
    echo [OK] Frontend .env created
    echo.
    echo VITE_API_URL tells the frontend where to find the backend API.
    echo.
) else (
    echo [SKIP] Frontend .env already exists
)

echo ========================================================================
echo  Environment files created successfully!
echo ========================================================================
echo.
echo Press any key to continue to Step 4...
pause >nul

:STEP4_DEPENDENCIES
cls
echo.
echo ========================================================================
echo  STEP 4: INSTALLING DEPENDENCIES
echo ========================================================================
echo.
echo WHAT ARE DEPENDENCIES?
echo   These are external libraries/packages that our code uses.
echo   Instead of writing everything from scratch, we use existing tools.
echo.
echo BACKEND DEPENDENCIES (will be installed^):
echo   - express: Web framework for creating API
echo   - pg: PostgreSQL client for database queries
echo   - bcryptjs: For hashing passwords securely
echo   - jsonwebtoken: For authentication tokens
echo   - cors: Allows frontend to call backend API
echo   - ...and more
echo.
echo FRONTEND DEPENDENCIES (will be installed^):
echo   - react: UI library for building interface
echo   - react-router-dom: For navigation between pages
echo   - axios: For making API calls to backend
echo   - tailwindcss: For styling/design
echo   - ...and more
echo.
echo This might take a few minutes. Let's start...
echo.
pause

echo [1/2] Installing BACKEND dependencies...
echo.
cd backend
if errorlevel 1 (
    echo [X] Cannot find backend folder!
    pause
    exit /b 1
)

echo Running: npm install
echo (This downloads all backend packages from the internet^)
echo.
npm install
if errorlevel 1 (
    echo.
    echo [X] Backend installation failed!
    echo Check your internet connection and try again.
    pause
    cd ..
    exit /b 1
)
cd ..
echo.
echo [OK] Backend dependencies installed successfully!
echo.

echo [2/2] Installing FRONTEND dependencies...
echo.
cd frontend
if errorlevel 1 (
    echo [X] Cannot find frontend folder!
    pause
    exit /b 1
)

echo Running: npm install
echo (This downloads all frontend packages from the internet^)
echo.
npm install
if errorlevel 1 (
    echo.
    echo [X] Frontend installation failed!
    echo Check your internet connection and try again.
    pause
    cd ..
    exit /b 1
)
cd ..
echo.
echo [OK] Frontend dependencies installed successfully!
echo.

echo ========================================================================
echo  All dependencies installed! Your node_modules folders are ready.
echo ========================================================================
echo.
echo Press any key to continue to Step 5...
pause >nul

:STEP5_DATABASE
cls
echo.
echo ========================================================================
echo  STEP 5: DATABASE SETUP
echo ========================================================================
echo.
echo Now we'll create your PostgreSQL database and fill it with initial data.
echo.
echo WHAT WILL HAPPEN:
echo   1. Create a database called "campus_placement_portal"
echo   2. Run schema.sql - Creates 15 tables with relationships
echo   3. Run seed-data.sql - Adds initial data:
echo      - 5 regions (South, Central, North, etc.^)
echo      - 60 polytechnic colleges
echo      - 59 placement officers (one per college^)
echo      - 1 super admin account
echo.
echo YOU'LL NEED: Your PostgreSQL password (the one you set during installation^)
echo.
pause

echo [*] Creating database...
echo.
psql -U postgres -c "CREATE DATABASE campus_placement_portal;" 2>nul
if errorlevel 1 (
    echo [INFO] Database might already exist, or wrong password.
    echo Let's try to connect and verify...
)
echo.

echo [*] Running schema.sql (creating tables^)...
echo.
echo TABLES BEING CREATED:
echo   - users (all user accounts^)
echo   - regions (5 regions in Kerala^)
echo   - colleges (60 colleges^)
echo   - students (student profiles^)
echo   - placement_officers (one per college^)
echo   - prn_ranges (valid PRN ranges^)
echo   - jobs (job postings^)
echo   - job_eligibility_criteria (job requirements^)
echo   - job_applications (application tracking^)
echo   - notifications (messages^)
echo   - whitelist_requests (blacklist removal requests^)
echo   - activity_logs (audit trail^)
echo   - ...and more
echo.
psql -U postgres -d campus_placement_portal -f database\schema.sql
if errorlevel 1 (
    echo [X] Schema creation failed!
    echo.
    echo TROUBLESHOOTING:
    echo   - Make sure PostgreSQL is running
    echo   - Verify your password is correct
    echo   - Check that database files exist in database/ folder
    echo.
    pause
    exit /b 1
)
echo [OK] Schema created successfully!
echo.

echo [*] Running seed-data.sql (inserting initial data^)...
echo.
psql -U postgres -d campus_placement_portal -f database\seed-data.sql
if errorlevel 1 (
    echo [X] Seed data insertion failed!
    pause
    exit /b 1
)
echo [OK] Seed data inserted successfully!
echo.

echo ========================================================================
echo  DATABASE SETUP COMPLETE!
echo ========================================================================
echo.
echo Your database now contains:
echo   - 5 regions
echo   - 60 colleges
echo   - 59 placement officers
echo   - 1 super admin account
echo.
echo SUPER ADMIN CREDENTIALS (for testing^):
echo   Email: adityanche@gmail.com
echo   Password: y9eshszbrr
echo.
echo PLACEMENT OFFICER CREDENTIALS (examples^):
echo   Username: 9497219788 (phone number^)
echo   Password: 123
echo.
echo Press any key to continue to Step 6...
pause >nul

:STEP6_VERIFICATION
cls
echo.
echo ========================================================================
echo  STEP 6: VERIFICATION
echo ========================================================================
echo.
echo Let's verify everything is set up correctly...
echo.
pause

echo [*] Checking backend files...
if not exist "backend\node_modules\" (
    echo [X] Backend node_modules not found!
    goto :VERIFICATION_FAILED
)
if not exist "backend\server.js" (
    echo [X] Backend server.js not found!
    goto :VERIFICATION_FAILED
)
echo [OK] Backend files verified
echo.

echo [*] Checking frontend files...
if not exist "frontend\node_modules\" (
    echo [X] Frontend node_modules not found!
    goto :VERIFICATION_FAILED
)
if not exist "frontend\index.html" (
    echo [X] Frontend index.html not found!
    goto :VERIFICATION_FAILED
)
echo [OK] Frontend files verified
echo.

echo [*] Checking environment files...
if not exist ".env" (
    echo [X] Root .env not found!
    goto :VERIFICATION_FAILED
)
if not exist "backend\.env" (
    echo [X] Backend .env not found!
    goto :VERIFICATION_FAILED
)
if not exist "frontend\.env" (
    echo [X] Frontend .env not found!
    goto :VERIFICATION_FAILED
)
echo [OK] Environment files verified
echo.

echo [*] Checking database connection...
psql -U postgres -d campus_placement_portal -c "SELECT COUNT(*) FROM colleges;" >nul 2>&1
if errorlevel 1 (
    echo [X] Cannot connect to database!
    goto :VERIFICATION_FAILED
)
echo [OK] Database connection verified
echo.

goto :VERIFICATION_SUCCESS

:VERIFICATION_FAILED
echo.
echo [X] Verification failed! Please review the errors above.
echo.
pause
exit /b 1

:VERIFICATION_SUCCESS
echo ========================================================================
echo  ALL VERIFICATIONS PASSED!
echo ========================================================================
echo.
echo Press any key to continue to final step...
pause >nul

:STEP7_NEXT_STEPS
cls
echo.
echo ========================================================================
echo  CONGRATULATIONS! SETUP COMPLETE!
echo ========================================================================
echo.
echo Your Campus Placement Portal is now ready to run!
echo.
echo.
echo ========================================================================
echo  WHAT YOU CAN DO NOW:
echo ========================================================================
echo.
echo 1. START THE APPLICATION
echo    Double-click: start.bat
echo    This will open two windows:
echo      - Backend server (http://localhost:5000^)
echo      - Frontend app (http://localhost:5173^)
echo.
echo 2. OPEN IN BROWSER
echo    Navigate to: http://localhost:5173
echo.
echo 3. LOGIN AS SUPER ADMIN
echo    Email: adityanche@gmail.com
echo    Password: y9eshszbrr
echo.
echo 4. OR LOGIN AS PLACEMENT OFFICER
echo    Username: 9497219788
echo    Password: 123
echo.
echo 5. OR REGISTER AS STUDENT
echo    Click "Register as Student"
echo    Use a valid PRN (super admin can add PRN ranges^)
echo.
echo.
echo ========================================================================
echo  LEARNING RESOURCES:
echo ========================================================================
echo.
echo To understand how everything works, read:
echo   - LEARNING_GUIDE.md - Explains APIs, architecture, data flow
echo   - WINDOWS_SETUP.md - Detailed Windows setup guide
echo   - VS_CODE_GUIDE.md - VS Code tips and tricks
echo   - POSTGRES_GUIDE.md - All PostgreSQL commands
echo.
echo.
echo ========================================================================
echo  TROUBLESHOOTING:
echo ========================================================================
echo.
echo If you encounter issues:
echo   1. Check WINDOWS_SETUP.md troubleshooting section
echo   2. Make sure PostgreSQL service is running
echo   3. Verify ports 5000 and 5173 are not in use
echo   4. Check that .env files have correct values
echo.
echo.
echo ========================================================================
echo  DEVELOPMENT WORKFLOW:
echo ========================================================================
echo.
echo As you develop:
echo   - Make changes to code files
echo   - Backend auto-restarts when you save (nodemon^)
echo   - Frontend auto-refreshes in browser (Vite HMR^)
echo   - Use VS Code with recommended extensions
echo   - Read LEARNING_GUIDE.md to understand how it all works
echo.
echo.
echo ========================================================================
echo  READY TO START?
echo ========================================================================
echo.
echo Would you like to start the application now? (Y/N^)
set /p START_NOW="Enter Y to start now, N to exit: "

if /i "%START_NOW%"=="Y" (
    echo.
    echo Starting application...
    echo.
    start "Campus Placement Portal" cmd /k "cd /d %~dp0 && start.bat"
    echo.
    echo Application is starting in a new window!
    echo Wait a few seconds, then open: http://localhost:5173
    echo.
) else (
    echo.
    echo No problem! When you're ready, just double-click: start.bat
    echo.
)

echo.
echo Thank you for using the guided setup!
echo Happy coding! 🚀
echo.
pause
exit /b 0

@echo off
REM ========================================
REM   State Placement Cell - Complete Setup
REM   Campus Placement Portal for 60 Kerala Polytechnics
REM ========================================
REM
REM This script performs a complete fresh installation:
REM   1. Validates prerequisites (Node.js, PostgreSQL)
REM   2. Creates environment configuration files
REM   3. Installs backend and frontend dependencies
REM   4. Initializes database with schema, seed data, and all migrations
REM   5. Sets up the complete application ready to run
REM
REM Prerequisites:
REM   - Node.js v18+ (https://nodejs.org/)
REM   - PostgreSQL v14+ (https://www.postgresql.org/download/windows/)
REM   - Git (optional, for version control)
REM
REM ========================================

echo.
echo ========================================
echo   State Placement Cell - Setup Wizard
echo ========================================
echo.
echo This will set up the complete application on your system.
echo.
echo What will be set up:
echo   [*] Backend API (Node.js/Express)
echo   [*] Frontend UI (React/Vite)
echo   [*] PostgreSQL Database with:
echo       - 19+ tables with relationships
echo       - 5 regions across Kerala
echo       - 60 polytechnic colleges
echo       - 60 placement officers (one per college)
echo       - Super admin account (optional, created interactively)
echo       - All database migrations for latest features
echo.
pause

REM ========================================
REM Step 1: Validate Prerequisites
REM ========================================
echo.
echo ========================================
echo [Step 1/7] Validating Prerequisites
echo ========================================
echo.

REM Check Node.js
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js v18 or later from:
    echo https://nodejs.org/
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)
echo [OK] Node.js found:
node --version
echo.

REM Check npm
echo Checking for npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed!
    echo npm should come with Node.js installation.
    pause
    exit /b 1
)
echo [OK] npm found:
npm --version
echo.

REM Check PostgreSQL
echo Checking for PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL is not installed or not in PATH!
    echo.
    echo Please install PostgreSQL v14 or later from:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Make sure to add PostgreSQL to your system PATH during installation.
    echo After installation, restart this script.
    pause
    exit /b 1
)
echo [OK] PostgreSQL found:
psql --version
echo.

echo [SUCCESS] All prerequisites are installed!
echo.

REM ========================================
REM Step 2: Create Environment Files
REM ========================================
echo ========================================
echo [Step 2/7] Creating Environment Files
echo ========================================
echo.

REM Create backend .env
if not exist "backend\.env" (
    echo Creating backend\.env from template...
    copy "backend\.env.example" "backend\.env" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to create backend\.env
        echo Make sure backend\.env.example exists
        pause
        exit /b 1
    )
    echo [OK] Created backend\.env
    echo.
    echo ========================================
    echo   IMPORTANT: Configure backend\.env
    echo ========================================
    echo.
    echo The backend\.env file has been created with default values.
    echo You MUST edit it with your credentials:
    echo.
    echo   REQUIRED for basic functionality:
    echo     - DB_PASSWORD=your_postgres_password
    echo     - JWT_SECRET=generate_random_64_char_string
    echo.
    echo   REQUIRED for photo uploads:
    echo     - CLOUDINARY_CLOUD_NAME=your_cloud_name
    echo     - CLOUDINARY_API_KEY=your_api_key
    echo     - CLOUDINARY_API_SECRET=your_api_secret
    echo     Sign up at: https://cloudinary.com (free tier available)
    echo.
    echo   REQUIRED for email verification:
    echo     - EMAIL_USER=your_email@gmail.com
    echo     - EMAIL_PASSWORD=your_gmail_app_password
    echo     Get Gmail App Password: https://support.google.com/accounts/answer/185833
    echo.
    echo ========================================
    echo.
) else (
    echo [INFO] backend\.env already exists (skipping)
    echo.
)

REM Create frontend .env
if not exist "frontend\.env" (
    echo Creating frontend\.env...
    echo VITE_API_URL=http://localhost:5000/api > frontend\.env
    echo [OK] Created frontend\.env
    echo.
) else (
    echo [INFO] frontend\.env already exists (skipping)
    echo.
)

REM ========================================
REM Step 3: Install Backend Dependencies
REM ========================================
echo ========================================
echo [Step 3/7] Installing Backend Dependencies
echo ========================================
echo.

cd backend
if errorlevel 1 (
    echo [ERROR] backend directory not found!
    pause
    exit /b 1
)

echo Installing Node.js packages for backend...
echo This may take a few minutes...
echo.

call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies!
    echo.
    echo Please check:
    echo   - Your internet connection
    echo   - npm configuration
    echo   - package.json exists in backend folder
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo [OK] Backend dependencies installed successfully!
echo.

REM ========================================
REM Step 4: Install Frontend Dependencies
REM ========================================
echo ========================================
echo [Step 4/7] Installing Frontend Dependencies
echo ========================================
echo.

cd frontend
if errorlevel 1 (
    echo [ERROR] frontend directory not found!
    pause
    exit /b 1
)

echo Installing Node.js packages for frontend...
echo This may take a few minutes...
echo.

call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies!
    echo.
    echo Please check:
    echo   - Your internet connection
    echo   - npm configuration
    echo   - package.json exists in frontend folder
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo [OK] Frontend dependencies installed successfully!
echo.

REM ========================================
REM Step 5: Database Setup
REM ========================================
echo ========================================
echo [Step 5/7] Setting Up Database
echo ========================================
echo.
echo This step will:
echo   1. Create database 'campus_placement_portal'
echo   2. Create all tables, triggers, and functions
echo   3. Insert seed data (regions, colleges, officers)
echo   4. Apply all migrations for latest features
echo.
echo You will be prompted for your PostgreSQL password.
echo.
pause

echo.
echo Creating database...
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if errorlevel 1 (
    echo [INFO] Database might already exist.
    echo If you want to start fresh, run: reset-database.bat
    echo Continuing with existing database...
) else (
    echo [OK] Database created successfully!
)
echo.

echo Running database schema...
psql -U postgres -d campus_placement_portal -f database\schema.sql
if errorlevel 1 (
    echo [ERROR] Failed to create database schema!
    echo.
    echo Please check:
    echo   - PostgreSQL is running
    echo   - You entered the correct password
    echo   - database\schema.sql exists
    pause
    exit /b 1
)
echo [OK] Schema created successfully!
echo.

echo Running seed data via Node.js script...
echo This will prompt you to optionally create a super admin account.
echo.
cd backend
call node scripts/seedDatabase.js
if errorlevel 1 (
    echo [ERROR] Failed to seed initial data!
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Seed data inserted successfully!
echo.

REM ========================================
REM Step 6: Verification
REM ========================================
echo ========================================
echo [Step 6/7] Verifying Installation
echo ========================================
echo.

echo Checking database tables...
psql -U postgres -d campus_placement_portal -c "\dt" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Could not verify database tables
) else (
    echo [OK] Database tables created
)
echo.

echo Checking backend directory structure...
if exist "backend\node_modules" (
    echo [OK] Backend dependencies installed
) else (
    echo [WARNING] Backend node_modules not found
)
echo.

echo Checking frontend directory structure...
if exist "frontend\node_modules" (
    echo [OK] Frontend dependencies installed
) else (
    echo [WARNING] Frontend node_modules not found
)
echo.

REM ========================================
REM Step 7: Completion
REM ========================================
echo ========================================
echo [Step 7/7] Setup Complete!
echo ========================================
echo.
echo ========================================
echo   INSTALLATION SUCCESSFUL!
echo ========================================
echo.
echo Your State Placement Cell application is ready!
echo.
echo Database includes:
echo   [*] 19+ tables with complete relationships
echo   [*] 5 regions across Kerala
echo   [*] 60 polytechnic colleges
echo   [*] 60 placement officers (one per college)
echo   [*] Super admin account (if created during setup)
echo   [*] All latest features and migrations
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. CONFIGURE CREDENTIALS (IMPORTANT!)
echo    Edit backend\.env with your:
echo      - PostgreSQL password (DB_PASSWORD)
echo      - JWT secret (generate random 64-char string)
echo      - Cloudinary credentials (for photo uploads)
echo      - Gmail credentials (for email verification)
echo.
echo 2. START THE APPLICATION:
echo    Run: start.bat
echo.
echo 3. ACCESS THE APPLICATION:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo.
echo 4. LOGIN CREDENTIALS:
echo    Super Admin: (created during seeding if you chose yes)
echo    Officers:    phone_number / 123
echo.
echo ========================================
echo   HELPFUL COMMANDS:
echo ========================================
echo.
echo   start.bat           - Start both backend and frontend
echo   stop-servers.bat    - Stop all running servers
echo   reset-database.bat  - Reset database to fresh state
echo   init-database.bat   - Re-initialize database only
echo.
echo ========================================
echo.
pause

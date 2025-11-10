@echo off
echo ========================================
echo   Campus Placement Portal Setup
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found:
node --version
echo.

REM Check if PostgreSQL is installed
echo [2/6] Checking PostgreSQL installation...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL is not installed or not in PATH!
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)
echo PostgreSQL found:
psql --version
echo.

REM Create .env files from examples
echo [3/6] Creating environment files...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo Created backend\.env from example
    echo IMPORTANT: Please edit backend\.env with your PostgreSQL password!
) else (
    echo backend\.env already exists
)

if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env"
        echo Created frontend\.env from example
    )
) else (
    echo frontend\.env already exists
)
echo.

REM Install backend dependencies
echo [4/6] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo Backend dependencies installed successfully!
echo.

REM Install frontend dependencies
echo [5/6] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed successfully!
echo.

echo [6/6] Setup complete!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Edit backend\.env file:
echo    - Set your PostgreSQL password in DB_PASSWORD
echo.
echo 2. Create database:
echo    - Run: create-database.bat
echo.
echo 3. Start application:
echo    - Run: start.bat
echo.
echo ========================================
pause

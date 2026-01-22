@echo off
SETLOCAL EnableDelayedExpansion

:: Ensure window stays open on error
if "%1"=="" (
    cmd /k "%~f0" run
    exit /b
)

COLOR 0A

echo.
echo ========================================================================
echo     STATE PLACEMENT CELL - DOCKER SETUP
echo ========================================================================
echo.
echo This script will set up the entire application using Docker.
echo.

:: CHECK DOCKER
echo [*] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [X] ERROR: Docker is NOT installed!
    echo.
    echo Please install Docker Desktop from:
    echo   https://www.docker.com/products/docker-desktop
    echo.
    echo After installation, restart your computer and run this script again.
    echo.
    goto :END
)

docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [X] ERROR: Docker Desktop is NOT running!
    echo.
    echo Please:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for it to fully start (whale icon in system tray)
    echo   3. Run this script again
    echo.
    goto :END
)

for /f "tokens=*" %%i in ('docker --version') do echo [OK] %%i

:: Determine compose command
set COMPOSE_CMD=docker compose
docker compose version >nul 2>&1
if errorlevel 1 (
    set COMPOSE_CMD=docker-compose
)
echo [OK] Docker Compose available

:: CHECK/CREATE ENV FILE
echo.
echo ========================================================================
echo  Setting Up Environment
echo ========================================================================
echo.

if exist ".env" (
    echo [OK] .env file already exists
    echo.
    set /p OVERWRITE="Overwrite with fresh template? (Y/N): "
    if /i "!OVERWRITE!"=="Y" (
        copy ".env" ".env.backup" >nul 2>&1
        echo [OK] Backed up to .env.backup
        copy ".env.docker.example" ".env" >nul
        echo [OK] Created fresh .env from template
    )
) else (
    echo [*] Creating .env file from template...
    copy ".env.docker.example" ".env" >nul
    if errorlevel 1 (
        echo [X] ERROR: Could not create .env file!
        goto :END
    )
    echo [OK] .env file created
)

echo.
echo ========================================================================
echo  IMPORTANT: Configure Your .env File
echo ========================================================================
echo.
echo Before building, you should edit the .env file to set:
echo.
echo   REQUIRED:
echo     - JWT_SECRET (change to any random long string)
echo.
echo   OPTIONAL (for full features):
echo     - CLOUDINARY_* (for photo uploads - get from cloudinary.com)
echo     - EMAIL_* (for email verification - Gmail App Password)
echo.
echo   You can edit .env now or later. The app will work with defaults.
echo.
set /p EDIT_NOW="Open .env in Notepad now? (Y/N): "
if /i "!EDIT_NOW!"=="Y" (
    notepad ".env"
    echo.
    echo Press any key after you've saved and closed Notepad...
    pause >nul
)

:: BUILD IMAGES
echo.
echo ========================================================================
echo  Building Docker Images
echo ========================================================================
echo.
echo This will build the application. First time takes 10-20 minutes.
echo.
echo [*] Starting build...
echo.

%COMPOSE_CMD% build --no-cache
if errorlevel 1 (
    echo.
    echo [X] ERROR: Build failed!
    echo.
    echo Try these fixes:
    echo   1. Check your internet connection
    echo   2. Restart Docker Desktop
    echo   3. Run: %COMPOSE_CMD% build --no-cache
    echo.
    goto :END
)

echo.
echo [OK] Build completed successfully!

:: START CONTAINERS
echo.
echo ========================================================================
echo  Starting Containers
echo ========================================================================
echo.

%COMPOSE_CMD% up -d
if errorlevel 1 (
    echo.
    echo [X] ERROR: Failed to start containers!
    goto :END
)

echo.
echo [*] Waiting for services to start (this may take a minute)...
timeout /t 30 /nobreak >nul

echo.
echo [*] Checking container status...
%COMPOSE_CMD% ps

:: DATABASE SEEDING
echo.
echo ========================================================================
echo  Database Seeding
echo ========================================================================
echo.
echo The database needs initial data (colleges, regions, officers).
echo.
set /p DO_SEED="Seed the database now? (Y/N): "

if /i "!DO_SEED!"=="Y" (
    echo.
    echo [*] Running database seeding...
    echo     You may be asked to create a super admin account.
    echo.
    %COMPOSE_CMD% exec -T backend node scripts/seedDatabase.js
    if errorlevel 1 (
        echo.
        echo [!] Seeding may have had issues. You can run it manually:
        echo     %COMPOSE_CMD% exec backend node scripts/seedDatabase.js
    )
)

:: COMPLETE
echo.
echo ========================================================================
echo                    SETUP COMPLETE!
echo ========================================================================
echo.
echo Your application is now running!
echo.
echo   Website:      http://localhost
echo   Backend API:  http://localhost:5000
echo.
echo   Login as Placement Officer:
echo     Username: 9497219788
echo     Password: 123
echo.
echo   Useful commands:
echo     View logs:    %COMPOSE_CMD% logs -f
echo     Stop:         %COMPOSE_CMD% down
echo     Start:        %COMPOSE_CMD% up -d
echo     Rebuild:      %COMPOSE_CMD% up -d --build
echo.

set /p OPEN_BROWSER="Open website in browser? (Y/N): "
if /i "!OPEN_BROWSER!"=="Y" (
    start http://localhost
)

:END
echo.
echo ========================================================================
echo Press any key to exit...
pause >nul

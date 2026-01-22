@echo off
SETLOCAL EnableDelayedExpansion
COLOR 0A

:: ========================================================================
:: STATE PLACEMENT CELL - DOCKER SETUP SCRIPT
:: ========================================================================
:: This script sets up the entire application using Docker on a fresh PC.
:: Prerequisites: Docker Desktop must be installed and running.
:: ========================================================================

:HEADER
cls
echo.
echo ========================================================================
echo     STATE PLACEMENT CELL - DOCKER SETUP
echo ========================================================================
echo.
echo This script will set up the entire application using Docker.
echo.
echo PREREQUISITES:
echo   - Docker Desktop installed and RUNNING
echo   - Internet connection (to download images)
echo.
echo Press any key to start the setup...
pause >nul

:CHECK_DOCKER
cls
echo.
echo ========================================================================
echo  STEP 1: Checking Docker Installation
echo ========================================================================
echo.

echo [*] Checking if Docker is installed...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [X] ERROR: Docker is NOT installed!
    echo.
    echo Please install Docker Desktop first:
    echo   1. Go to: https://www.docker.com/products/docker-desktop
    echo   2. Download Docker Desktop for Windows
    echo   3. Run the installer
    echo   4. Restart your computer if prompted
    echo   5. Run this script again
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('docker --version') do echo [OK] %%i

echo.
echo [*] Checking if Docker daemon is running...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [X] ERROR: Docker Desktop is NOT running!
    echo.
    echo Please start Docker Desktop:
    echo   1. Open Docker Desktop from Start Menu
    echo   2. Wait for it to fully start (whale icon in system tray)
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Docker daemon is running

echo.
echo [*] Checking Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [X] ERROR: Docker Compose is not available!
        pause
        exit /b 1
    )
    for /f "tokens=*" %%i in ('docker-compose --version') do echo [OK] %%i
    set COMPOSE_CMD=docker-compose
) else (
    for /f "tokens=*" %%i in ('docker compose version') do echo [OK] %%i
    set COMPOSE_CMD=docker compose
)

echo.
echo ========================================================================
echo  Docker is ready!
echo ========================================================================
echo.
timeout /t 2 >nul

:SETUP_ENV
cls
echo.
echo ========================================================================
echo  STEP 2: Setting Up Environment Configuration
echo ========================================================================
echo.

if exist ".env" (
    echo [!] Found existing .env file.
    echo.
    set /p OVERWRITE="Do you want to overwrite it? (Y/N): "
    if /i "!OVERWRITE!"=="Y" (
        echo [*] Backing up existing .env to .env.backup...
        copy ".env" ".env.backup" >nul
        echo [OK] Backup created
        goto :CREATE_ENV
    ) else (
        echo [OK] Keeping existing .env file
        goto :CUSTOMIZE_ENV
    )
) else (
    goto :CREATE_ENV
)

:CREATE_ENV
echo.
echo [*] Creating .env file from template...
copy ".env.docker.example" ".env" >nul
if errorlevel 1 (
    echo [X] ERROR: Could not create .env file!
    echo Make sure .env.docker.example exists.
    pause
    exit /b 1
)
echo [OK] .env file created

:CUSTOMIZE_ENV
echo.
echo ========================================================================
echo  Environment Configuration
echo ========================================================================
echo.
echo Your .env file needs some configuration. You can either:
echo   1. Edit it manually later
echo   2. Enter values now (recommended for quick setup)
echo.
set /p CONFIGURE_NOW="Configure essential values now? (Y/N): "

if /i "!CONFIGURE_NOW!"=="Y" (
    echo.
    echo ----------------------------------------
    echo  Database Password
    echo ----------------------------------------
    echo Default: postgres
    set /p DB_PASS="Enter database password (press Enter for default): "
    if "!DB_PASS!"=="" set DB_PASS=postgres

    echo.
    echo ----------------------------------------
    echo  JWT Secret (for authentication)
    echo ----------------------------------------
    echo Generating a random JWT secret for you...

    :: Generate a random string for JWT
    set "CHARS=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    set "JWT_SECRET="
    for /L %%i in (1,1,64) do (
        set /a "idx=!random! %% 62"
        for %%j in (!idx!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%j,1!"
    )
    echo [OK] JWT Secret generated

    echo.
    echo ----------------------------------------
    echo  Cloudinary (for photo uploads) - OPTIONAL
    echo ----------------------------------------
    echo Sign up at https://cloudinary.com for free credentials
    echo Leave blank to skip (photo uploads won't work)
    echo.
    set /p CLOUD_NAME="Cloudinary Cloud Name: "
    set /p CLOUD_KEY="Cloudinary API Key: "
    set /p CLOUD_SECRET="Cloudinary API Secret: "

    echo.
    echo ----------------------------------------
    echo  Email Configuration - OPTIONAL
    echo ----------------------------------------
    echo For Gmail: Enable 2FA and create an App Password
    echo Guide: https://support.google.com/accounts/answer/185833
    echo Leave blank to skip (email features won't work)
    echo.
    set /p EMAIL_ADDR="Gmail Address: "
    set /p EMAIL_PASS="Gmail App Password: "

    echo.
    echo [*] Updating .env file with your values...

    :: Update .env file using PowerShell for reliable replacement
    powershell -Command "(Get-Content '.env') -replace 'DB_PASSWORD=postgres', 'DB_PASSWORD=!DB_PASS!' | Set-Content '.env'"
    powershell -Command "(Get-Content '.env') -replace 'JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_minimum_64_characters', 'JWT_SECRET=!JWT_SECRET!' | Set-Content '.env'"

    if not "!CLOUD_NAME!"=="" (
        powershell -Command "(Get-Content '.env') -replace 'CLOUDINARY_CLOUD_NAME=your_cloud_name_here', 'CLOUDINARY_CLOUD_NAME=!CLOUD_NAME!' | Set-Content '.env'"
        powershell -Command "(Get-Content '.env') -replace 'CLOUDINARY_API_KEY=your_api_key_here', 'CLOUDINARY_API_KEY=!CLOUD_KEY!' | Set-Content '.env'"
        powershell -Command "(Get-Content '.env') -replace 'CLOUDINARY_API_SECRET=your_api_secret_here', 'CLOUDINARY_API_SECRET=!CLOUD_SECRET!' | Set-Content '.env'"
    )

    if not "!EMAIL_ADDR!"=="" (
        powershell -Command "(Get-Content '.env') -replace 'EMAIL_USER=your_email@gmail.com', 'EMAIL_USER=!EMAIL_ADDR!' | Set-Content '.env'"
        powershell -Command "(Get-Content '.env') -replace 'EMAIL_PASSWORD=your_gmail_app_password_here', 'EMAIL_PASSWORD=!EMAIL_PASS!' | Set-Content '.env'"
        powershell -Command "(Get-Content '.env') -replace 'EMAIL_FROM=State Placement Cell <your_email@gmail.com>', 'EMAIL_FROM=State Placement Cell ^<!EMAIL_ADDR!^>' | Set-Content '.env'"
    )

    echo [OK] Environment file configured
)

echo.
echo ========================================================================
echo  Environment setup complete!
echo ========================================================================
echo.
timeout /t 2 >nul

:BUILD_IMAGES
cls
echo.
echo ========================================================================
echo  STEP 3: Building Docker Images
echo ========================================================================
echo.
echo This will build the application images. First time takes 10-20 minutes.
echo Subsequent builds are much faster due to caching.
echo.
echo [*] Starting build process...
echo.

%COMPOSE_CMD% build --no-cache
if errorlevel 1 (
    echo.
    echo [X] ERROR: Build failed!
    echo.
    echo Common issues:
    echo   - Internet connection problems
    echo   - Docker Desktop not running properly
    echo   - Disk space issues
    echo.
    echo Try running: %COMPOSE_CMD% build --no-cache
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo  Build successful!
echo ========================================================================
echo.
timeout /t 2 >nul

:START_CONTAINERS
cls
echo.
echo ========================================================================
echo  STEP 4: Starting Containers
echo ========================================================================
echo.
echo [*] Starting all services...
echo.

%COMPOSE_CMD% up -d
if errorlevel 1 (
    echo.
    echo [X] ERROR: Failed to start containers!
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Waiting for services to become healthy...
echo     This may take up to 2 minutes...
echo.

:: Wait for containers to be healthy
set ATTEMPTS=0
:HEALTH_CHECK_LOOP
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 24 (
    echo.
    echo [!] WARNING: Services are taking longer than expected.
    echo     Continuing anyway... Check logs if issues occur.
    goto :SEED_DATABASE
)

:: Check postgres health
docker inspect --format="{{.State.Health.Status}}" cpp_postgres 2>nul | findstr /i "healthy" >nul
if errorlevel 1 (
    echo     Waiting for PostgreSQL... (attempt %ATTEMPTS%/24)
    timeout /t 5 >nul
    goto :HEALTH_CHECK_LOOP
)

:: Check backend health
docker inspect --format="{{.State.Health.Status}}" cpp_backend 2>nul | findstr /i "healthy" >nul
if errorlevel 1 (
    echo     Waiting for Backend... (attempt %ATTEMPTS%/24)
    timeout /t 5 >nul
    goto :HEALTH_CHECK_LOOP
)

echo.
echo [OK] All services are healthy!
echo.

:SEED_DATABASE
cls
echo.
echo ========================================================================
echo  STEP 5: Database Seeding
echo ========================================================================
echo.
echo The database needs initial data (colleges, regions, etc.)
echo.
set /p DO_SEED="Do you want to seed the database now? (Y/N): "

if /i "!DO_SEED!"=="Y" (
    echo.
    echo [*] Running database seeding script...
    echo     You will be prompted to create a super admin account.
    echo.
    %COMPOSE_CMD% exec backend node scripts/seedDatabase.js
    if errorlevel 1 (
        echo.
        echo [!] WARNING: Seeding may have encountered issues.
        echo     You can run it manually later with:
        echo     %COMPOSE_CMD% exec backend node scripts/seedDatabase.js
    ) else (
        echo.
        echo [OK] Database seeded successfully!
    )
) else (
    echo.
    echo [OK] Skipping database seeding.
    echo     You can run it later with:
    echo     %COMPOSE_CMD% exec backend node scripts/seedDatabase.js
)

echo.
timeout /t 2 >nul

:COMPLETE
cls
echo.
echo ========================================================================
echo                    SETUP COMPLETE!
echo ========================================================================
echo.
echo Your State Placement Cell is now running!
echo.
echo ----------------------------------------
echo  ACCESS YOUR APPLICATION
echo ----------------------------------------
echo.
echo   Frontend (Website):  http://localhost
echo   Backend API:         http://localhost:5000
echo   Database:            localhost:5432
echo.
echo ----------------------------------------
echo  LOGIN CREDENTIALS
echo ----------------------------------------
echo.
echo   Placement Officer (example):
echo     Username: 9497219788
echo     Password: 123
echo.
echo   Super Admin:
echo     (Use credentials you created during seeding)
echo.
echo ----------------------------------------
echo  USEFUL DOCKER COMMANDS
echo ----------------------------------------
echo.
echo   View logs:           %COMPOSE_CMD% logs -f
echo   Stop application:    %COMPOSE_CMD% down
echo   Start application:   %COMPOSE_CMD% up -d
echo   Restart:             %COMPOSE_CMD% restart
echo   View status:         %COMPOSE_CMD% ps
echo   Rebuild after changes: %COMPOSE_CMD% up -d --build
echo.
echo ----------------------------------------
echo  TROUBLESHOOTING
echo ----------------------------------------
echo.
echo   If something doesn't work:
echo   1. Check logs: %COMPOSE_CMD% logs -f
echo   2. Restart: %COMPOSE_CMD% restart
echo   3. Full reset: %COMPOSE_CMD% down -v ^&^& %COMPOSE_CMD% up -d --build
echo.
echo ========================================================================
echo.
set /p OPEN_BROWSER="Open the website in browser now? (Y/N): "
if /i "!OPEN_BROWSER!"=="Y" (
    start http://localhost
)

echo.
echo Thank you for using the Docker Setup Script!
echo.
pause
exit /b 0

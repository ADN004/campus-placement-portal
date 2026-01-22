@echo off
SETLOCAL EnableDelayedExpansion
COLOR 0A

echo.
echo ========================================================================
echo     STATE PLACEMENT CELL - START WITH DOCKER
echo ========================================================================
echo.

:: Check if Docker is running
echo [*] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop first, then run this script again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running

:: Determine compose command
docker compose version >nul 2>&1
if errorlevel 1 (
    set COMPOSE_CMD=docker-compose
) else (
    set COMPOSE_CMD=docker compose
)

:: Check if .env exists
if not exist ".env" (
    echo.
    echo [!] No .env file found!
    echo.
    echo You have two options:
    echo   1. Run docker-setup.bat for guided setup (recommended for first time)
    echo   2. Copy .env.docker.example to .env manually
    echo.
    set /p CREATE_ENV="Create .env from template now? (Y/N): "
    if /i "!CREATE_ENV!"=="Y" (
        copy ".env.docker.example" ".env" >nul
        echo [OK] Created .env file from template
        echo.
        echo [!] IMPORTANT: Edit .env file to add your configuration!
        echo     At minimum, change JWT_SECRET to a random string.
        echo.
        pause
    ) else (
        echo.
        echo Please create .env file first, then run this script again.
        pause
        exit /b 1
    )
)

:: Check if images exist
echo.
echo [*] Checking for existing images...
docker images cpp-backend:latest --format "{{.Repository}}" 2>nul | findstr /i "cpp-backend" >nul
if errorlevel 1 (
    echo [!] Images not found. Building for the first time...
    echo     This will take 10-20 minutes. Please wait...
    echo.
    %COMPOSE_CMD% up -d --build
) else (
    echo [OK] Images found
    echo.
    echo [*] Starting containers...
    %COMPOSE_CMD% up -d
)

if errorlevel 1 (
    echo.
    echo [X] ERROR: Failed to start containers!
    echo.
    echo Try running: %COMPOSE_CMD% logs
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo     CONTAINERS STARTED!
echo ========================================================================
echo.
echo   Frontend:   http://localhost
echo   Backend:    http://localhost:5000
echo   Database:   localhost:5432
echo.
echo   View logs:  %COMPOSE_CMD% logs -f
echo   Stop:       %COMPOSE_CMD% down
echo.

:: Show container status
echo [*] Container Status:
%COMPOSE_CMD% ps

echo.
echo ========================================================================
echo.
pause

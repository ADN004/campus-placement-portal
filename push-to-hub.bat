@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   State Placement Cell - Push to Docker Hub
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Get Docker Hub username
if "%~1"=="" (
    set /p DOCKERHUB_USERNAME="Enter your Docker Hub username: "
) else (
    set DOCKERHUB_USERNAME=%~1
)

if "%DOCKERHUB_USERNAME%"=="" (
    echo ERROR: Docker Hub username is required!
    pause
    exit /b 1
)

echo.
echo Using Docker Hub username: %DOCKERHUB_USERNAME%
echo.
echo This will build and push 3 images:
echo   1. %DOCKERHUB_USERNAME%/spc-database:latest
echo   2. %DOCKERHUB_USERNAME%/spc-backend:latest
echo   3. %DOCKERHUB_USERNAME%/spc-frontend:latest
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

REM Login to Docker Hub
echo.
echo [Step 1/7] Logging in to Docker Hub...
docker login
if errorlevel 1 (
    echo ERROR: Docker Hub login failed!
    pause
    exit /b 1
)

REM Build database image
echo.
echo [Step 2/7] Building database image...
docker build -f database/Dockerfile -t %DOCKERHUB_USERNAME%/spc-database:latest .
if errorlevel 1 (
    echo ERROR: Database image build failed!
    pause
    exit /b 1
)

REM Build backend image
echo.
echo [Step 3/7] Building backend image...
docker build -f backend/Dockerfile -t %DOCKERHUB_USERNAME%/spc-backend:latest ./backend
if errorlevel 1 (
    echo ERROR: Backend image build failed!
    pause
    exit /b 1
)

REM Build frontend image (with /api as the API URL since nginx proxies it)
echo.
echo [Step 4/7] Building frontend image...
docker build -f frontend/Dockerfile --build-arg VITE_API_URL=/api -t %DOCKERHUB_USERNAME%/spc-frontend:latest ./frontend
if errorlevel 1 (
    echo ERROR: Frontend image build failed!
    pause
    exit /b 1
)

REM Push database image
echo.
echo [Step 5/7] Pushing database image to Docker Hub...
docker push %DOCKERHUB_USERNAME%/spc-database:latest
if errorlevel 1 (
    echo ERROR: Database image push failed!
    pause
    exit /b 1
)

REM Push backend image
echo.
echo [Step 6/7] Pushing backend image to Docker Hub...
docker push %DOCKERHUB_USERNAME%/spc-backend:latest
if errorlevel 1 (
    echo ERROR: Backend image push failed!
    pause
    exit /b 1
)

REM Push frontend image
echo.
echo [Step 7/7] Pushing frontend image to Docker Hub...
docker push %DOCKERHUB_USERNAME%/spc-frontend:latest
if errorlevel 1 (
    echo ERROR: Frontend image push failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   SUCCESS! All images pushed to Docker Hub
echo ==========================================
echo.
echo Images pushed:
echo   - %DOCKERHUB_USERNAME%/spc-database:latest
echo   - %DOCKERHUB_USERNAME%/spc-backend:latest
echo   - %DOCKERHUB_USERNAME%/spc-frontend:latest
echo.
echo ==========================================
echo   WHAT TO GIVE YOUR PROFESSOR:
echo ==========================================
echo.
echo 1. The file: docker-compose.hub.yml
echo 2. Tell them your Docker Hub username: %DOCKERHUB_USERNAME%
echo.
echo Professor's setup steps:
echo   a. Create a .env file with:
echo      DOCKERHUB_USERNAME=%DOCKERHUB_USERNAME%
echo      DB_PASSWORD=postgres
echo      JWT_SECRET=(any long random string)
echo.
echo   b. Run:
echo      docker compose -f docker-compose.hub.yml pull
echo      docker compose -f docker-compose.hub.yml up -d
echo.
echo   c. Seed the database:
echo      docker compose -f docker-compose.hub.yml exec backend node scripts/seedDatabase.js
echo.
echo   d. Open http://localhost in browser
echo.
pause

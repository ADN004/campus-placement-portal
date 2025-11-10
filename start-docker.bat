@echo off
echo ========================================
echo   Starting with Docker
echo ========================================
echo.

REM Check if Docker is installed
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo Docker found:
docker --version
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy ".env.example" ".env"
    echo.
    echo IMPORTANT: Please edit .env file with your production values!
    echo Press any key after editing .env file...
    pause
)

echo Starting Docker containers...
echo This may take a few minutes on first run...
echo.

docker-compose up -d

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start Docker containers
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Docker Containers Started!
echo ========================================
echo.
echo Frontend: http://localhost
echo Backend:  http://localhost:5000
echo Database: localhost:5432
echo.
echo Useful commands:
echo   - View logs:    docker-compose logs -f
echo   - Stop:         docker-compose down
echo   - Restart:      docker-compose restart
echo.
echo ========================================
pause

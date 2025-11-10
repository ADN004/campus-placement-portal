@echo off
echo ========================================
echo   Testing Setup
echo ========================================
echo.

echo [1/5] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    goto :error
)
echo OK
echo.

echo [2/5] Checking npm...
npm --version
if errorlevel 1 (
    echo ERROR: npm not found!
    goto :error
)
echo OK
echo.

echo [3/5] Checking PostgreSQL...
psql --version
if errorlevel 1 (
    echo ERROR: PostgreSQL not found!
    goto :error
)
echo OK
echo.

echo [4/5] Checking backend dependencies...
if not exist "backend\node_modules\" (
    echo ERROR: Backend dependencies not installed!
    echo Run: setup.bat
    goto :error
)
echo OK
echo.

echo [5/5] Checking frontend dependencies...
if not exist "frontend\node_modules\" (
    echo ERROR: Frontend dependencies not installed!
    echo Run: setup.bat
    goto :error
)
echo OK
echo.

echo ========================================
echo   All checks passed!
echo ========================================
echo.
echo Your setup is ready. You can now:
echo 1. Run create-database.bat (if not done)
echo 2. Run start.bat to start the application
echo.
goto :end

:error
echo.
echo ========================================
echo   Setup incomplete!
echo ========================================
echo.
echo Please run setup.bat first.
echo.

:end
pause

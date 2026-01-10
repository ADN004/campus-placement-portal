@echo off
echo ========================================
echo   Starting State Placement Cell
echo ========================================
echo.

echo Starting Backend and Frontend...
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop the servers.
echo.

REM Start backend in new window
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Check the new windows for server logs.
echo Close this window if needed.
echo ========================================

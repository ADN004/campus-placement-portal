@echo off
echo ========================================
echo   Starting Backend Server Only
echo ========================================
echo.

cd backend
echo Backend starting on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

npm run dev

@echo off
echo ========================================
echo   Starting Frontend Server Only
echo ========================================
echo.

cd frontend
echo Frontend starting on http://localhost:5173
echo Press Ctrl+C to stop the server
echo.

npm run dev

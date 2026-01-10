@echo off
echo ========================================
echo  Stopping State Placement Cell Servers
echo ========================================
echo.

echo Checking for Backend Server (Port 5000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process on port 5000 with PID: %%a
    taskkill /PID %%a /F
    echo Backend server stopped!
)

echo.
echo Checking for Frontend Server (Port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo Found process on port 5173 with PID: %%a
    taskkill /PID %%a /F
    echo Frontend server stopped!
)

echo.
echo ========================================
echo  All servers stopped successfully!
echo ========================================
echo.
pause

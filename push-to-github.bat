@echo off
title GitHub Push Helper - Campus Placement Portal
color 0A

echo =========================================
echo   GitHub Push Helper
echo   Campus Placement Portal
echo =========================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/5] Checking Git Repository Status...
echo.

REM Check if git repo exists
git rev-parse --git-dir >nul 2>nul
if %errorlevel% neq 0 (
    echo This is not a Git repository. Initializing...
    git init
    echo Git repository initialized!
    echo.

    echo Please enter your GitHub repository URL:
    echo Example: https://github.com/username/repository.git
    set /p REPO_URL="Repository URL: "

    git remote add origin %REPO_URL%
    echo Remote repository added!
    echo.
)

echo [2/5] Checking for changes...
git status

echo.
echo [3/5] Adding files to commit...
git add .

echo.
echo Files added successfully!
echo.

echo [4/5] Creating commit...
echo Please enter your commit message:
set /p COMMIT_MSG="Commit message: "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Update project files
)

git commit -m "%COMMIT_MSG%"

echo.
echo [5/5] Pushing to GitHub...
echo.

REM Check if main branch exists on remote
git ls-remote --heads origin main >nul 2>nul
if %errorlevel% neq 0 (
    echo First time push detected. Setting up main branch...
    git branch -M main
    git push -u origin main
) else (
    git push
)

echo.
if %errorlevel% equ 0 (
    echo =========================================
    echo   SUCCESS!
    echo   Your code has been pushed to GitHub!
    echo =========================================
) else (
    echo =========================================
    echo   ERROR!
    echo   Failed to push to GitHub.
    echo   Please check the error messages above.
    echo =========================================
    echo.
    echo Common Issues:
    echo - Incorrect repository URL
    echo - Authentication failure (use Personal Access Token)
    echo - Network connection issues
    echo - Branch conflicts (may need to pull first)
)

echo.
pause

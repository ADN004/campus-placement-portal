#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "   GitHub Push Helper"
echo "   State Placement Cell"
echo "========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: Git is not installed or not in PATH${NC}"
    echo "Please install Git from: https://git-scm.com/"
    exit 1
fi

echo "[1/5] Checking Git Repository Status..."
echo ""

# Check if git repo exists
if ! git rev-parse --git-dir &> /dev/null; then
    echo "This is not a Git repository. Initializing..."
    git init
    echo "Git repository initialized!"
    echo ""

    read -p "Please enter your GitHub repository URL (e.g., https://github.com/username/repository.git): " REPO_URL

    git remote add origin "$REPO_URL"
    echo "Remote repository added!"
    echo ""
fi

echo "[2/5] Checking for changes..."
git status

echo ""
echo "[3/5] Adding files to commit..."
git add .

echo ""
echo "Files added successfully!"
echo ""

echo "[4/5] Creating commit..."
read -p "Please enter your commit message: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update project files"
fi

git commit -m "$COMMIT_MSG"

echo ""
echo "[5/5] Pushing to GitHub..."
echo ""

# Check if main branch exists on remote
if git ls-remote --heads origin main &> /dev/null; then
    git push
else
    echo "First time push detected. Setting up main branch..."
    git branch -M main
    git push -u origin main
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================="
    echo "   SUCCESS!"
    echo "   Your code has been pushed to GitHub!"
    echo "=========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================="
    echo "   ERROR!"
    echo "   Failed to push to GitHub."
    echo "   Please check the error messages above."
    echo "=========================================${NC}"
    echo ""
    echo "Common Issues:"
    echo "- Incorrect repository URL"
    echo "- Authentication failure (use Personal Access Token)"
    echo "- Network connection issues"
    echo "- Branch conflicts (may need to pull first)"
fi

echo ""

#!/bin/bash
echo "========================================"
echo "   Testing Setup"
echo "========================================"
echo ""

error_occurred=0

echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    error_occurred=1
else
    node --version
    echo "OK"
fi
echo ""

echo "[2/5] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found!"
    error_occurred=1
else
    npm --version
    echo "OK"
fi
echo ""

echo "[3/5] Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL not found!"
    error_occurred=1
else
    psql --version
    echo "OK"
fi
echo ""

echo "[4/5] Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "ERROR: Backend dependencies not installed!"
    echo "Run: ./setup.sh"
    error_occurred=1
else
    echo "OK"
fi
echo ""

echo "[5/5] Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "ERROR: Frontend dependencies not installed!"
    echo "Run: ./setup.sh"
    error_occurred=1
else
    echo "OK"
fi
echo ""

if [ $error_occurred -eq 0 ]; then
    echo "========================================"
    echo "   All checks passed!"
    echo "========================================"
    echo ""
    echo "Your setup is ready. You can now:"
    echo "1. Run ./create-database.sh (if not done)"
    echo "2. Run ./start.sh to start the application"
    echo ""
else
    echo "========================================"
    echo "   Setup incomplete!"
    echo "========================================"
    echo ""
    echo "Please run ./setup.sh first."
    echo ""
fi

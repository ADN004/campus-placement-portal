#!/bin/bash
echo "========================================"
echo "  Stopping State Placement Cell Servers"
echo "========================================"
echo ""

echo "Checking for Backend Server (Port 5000)..."
BACKEND_PID=$(lsof -ti:5000)
if [ ! -z "$BACKEND_PID" ]; then
    echo "Found process on port 5000 with PID: $BACKEND_PID"
    kill -9 $BACKEND_PID
    echo "Backend server stopped!"
else
    echo "No process found on port 5000"
fi

echo ""
echo "Checking for Frontend Server (Port 5173)..."
FRONTEND_PID=$(lsof -ti:5173)
if [ ! -z "$FRONTEND_PID" ]; then
    echo "Found process on port 5173 with PID: $FRONTEND_PID"
    kill -9 $FRONTEND_PID
    echo "Frontend server stopped!"
else
    echo "No process found on port 5173"
fi

echo ""
echo "========================================"
echo "  All servers stopped successfully!"
echo "========================================"
echo ""

#!/bin/bash
echo "========================================"
echo "   Starting State Placement Cell"
echo "========================================"
echo ""

echo "Starting Backend and Frontend..."
echo ""
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C in each terminal to stop the servers."
echo ""

# Start backend in new terminal (different approaches for different desktop environments)
if command -v gnome-terminal &> /dev/null; then
    # GNOME Terminal
    gnome-terminal --title="Backend Server" -- bash -c "cd backend && npm run dev; exec bash"
elif command -v konsole &> /dev/null; then
    # KDE Konsole
    konsole --title="Backend Server" -e bash -c "cd backend && npm run dev; exec bash" &
elif command -v xterm &> /dev/null; then
    # Xterm
    xterm -title "Backend Server" -e "cd backend && npm run dev; exec bash" &
else
    # Fallback: run in background
    echo "No supported terminal emulator found. Running backend in background..."
    cd backend && npm run dev &
    cd ..
fi

# Wait a moment for backend to start
sleep 3

# Start frontend in new terminal
if command -v gnome-terminal &> /dev/null; then
    # GNOME Terminal
    gnome-terminal --title="Frontend Server" -- bash -c "cd frontend && npm run dev; exec bash"
elif command -v konsole &> /dev/null; then
    # KDE Konsole
    konsole --title="Frontend Server" -e bash -c "cd frontend && npm run dev; exec bash" &
elif command -v xterm &> /dev/null; then
    # Xterm
    xterm -title "Frontend Server" -e "cd frontend && npm run dev; exec bash" &
else
    # Fallback: run in background
    echo "No supported terminal emulator found. Running frontend in background..."
    cd frontend && npm run dev &
    cd ..
fi

echo ""
echo "========================================"
echo "   Servers Started!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Check the new terminals for server logs."
echo "Close this terminal if needed."
echo "========================================"

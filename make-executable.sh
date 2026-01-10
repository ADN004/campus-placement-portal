#!/bin/bash
echo "========================================"
echo "   Making Shell Scripts Executable"
echo "   State Placement Cell"
echo "========================================"
echo ""

# Make all .sh files in root directory executable
echo "Making root scripts executable..."
chmod +x *.sh

# Make all .sh files in database directory executable
if [ -d "database" ]; then
    echo "Making database scripts executable..."
    chmod +x database/*.sh
fi

# Make all .sh files in database/migrations directory executable
if [ -d "database/migrations" ]; then
    echo "Making migration scripts executable..."
    chmod +x database/migrations/*.sh
fi

echo ""
echo "========================================"
echo "   All scripts are now executable!"
echo "========================================"
echo ""
echo "You can now run scripts like:"
echo "  ./setup.sh"
echo "  ./start.sh"
echo "  ./reset-database.sh"
echo "  etc."
echo ""
echo "========================================"

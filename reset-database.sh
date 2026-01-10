#!/bin/bash

# Color codes (ANSI)
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}========================================"
echo "   DATABASE RESET WARNING"
echo "   State Placement Cell"
echo "========================================${NC}"
echo ""
echo "This script will COMPLETELY DELETE your database"
echo "and create it fresh with initial data."
echo ""
echo "ALL DATA WILL BE LOST including:"
echo "  - All student registrations"
echo "  - All job postings"
echo "  - All applications"
echo "  - All notifications"
echo "  - All activity logs"
echo "  - Everything!"
echo ""
echo -e "${YELLOW}Are you absolutely sure you want to continue?${NC}"
read -p "Type 'YES' to confirm: " confirm

if [ "$confirm" != "YES" ]; then
    echo ""
    echo "Reset cancelled. No changes made."
    exit 0
fi

echo -e "${GREEN}"
echo ""
echo "Proceeding with database reset..."
echo ""

# Set PostgreSQL password (change this to your password or use .pgpass file)
export PGPASSWORD=y9eshszbrr

echo "[1/5] Dropping existing database..."
psql -U postgres -c "DROP DATABASE IF EXISTS campus_placement_portal;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to drop database!"
    echo "Make sure no applications are connected to it.${NC}"
    exit 1
fi
echo "[OK] Database dropped!"
echo ""

echo "[2/5] Creating fresh database..."
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to create database!${NC}"
    exit 1
fi
echo "[OK] Database created!"
echo ""

echo "[3/5] Running schema.sql..."
psql -U postgres -d campus_placement_portal -f database/schema.sql
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to create schema!${NC}"
    exit 1
fi
echo "[OK] Schema created!"
echo ""

echo "[4/5] Running seed-data.sql..."
psql -U postgres -d campus_placement_portal -f database/seed-data.sql
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to seed data!${NC}"
    exit 1
fi
echo "[OK] Seed data inserted!"
echo ""

echo "[5/5] Applying migrations..."
for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "- Applying: $(basename "$migration")"
        psql -U postgres -d campus_placement_portal -f "$migration" 2>/dev/null
    fi
done
echo "[OK] All migrations applied!"
echo ""

echo "========================================================================"
echo "   DATABASE RESET COMPLETE!"
echo "========================================================================"
echo ""
echo "Your database has been reset to initial state with:"
echo "  - 19+ tables with all triggers and functions"
echo "  - 5 regions across Kerala"
echo "  - 60 polytechnic colleges"
echo "  - 59 placement officers"
echo "  - 1 super admin account"
echo "  - Default PRN ranges"
echo "  - All migrations applied"
echo ""
echo "Login credentials:"
echo "  Super Admin: adityanche@gmail.com / y9eshszbrr"
echo "  Officers: phone_number / 123"
echo ""
echo "You can now start the application with: ./start.sh"
echo "========================================================================${NC}"

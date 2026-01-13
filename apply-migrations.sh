#!/bin/bash
echo "========================================"
echo "   Apply Database Migrations"
echo "   State Placement Cell"
echo "========================================"
echo ""
echo "This script will apply all pending database migrations"
echo "to add new features and enhancements."
echo ""
echo "Migrations will add:"
echo "  - Email verification system"
echo "  - Photo upload capabilities"
echo "  - Extended student profiles"
echo "  - Job requirements configuration"
echo "  - Enhanced application system"
echo "  - Activity logging"
echo "  - PRN range toggle"
echo "  - Placement officer photos"
echo "  - Job deletion history"
echo "  - Auto age updates"
echo "  - Year field for PRN ranges"
echo ""
read -p "Press Enter to continue..."

# Set PostgreSQL password (change this to your password or use .pgpass file)
export PGPASSWORD=y9eshszbrr

echo ""
echo "Applying migrations..."
echo ""

count=0
for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "[*] Applying: $(basename "$migration")"
        psql -U postgres -d campus_placement_portal -f "$migration" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "    [OK] Applied successfully"
            ((count++))
        else
            echo "    [SKIP] Already applied or optional"
        fi
        echo ""
    fi
done

echo "========================================"
echo "   Migration Complete!"
echo "========================================"
echo ""
echo "Processed all migration files."
echo ""
echo "Your database is now up to date with all features!"
echo ""
echo "========================================"

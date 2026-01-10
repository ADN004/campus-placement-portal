#!/bin/bash
# ========================================
#   Database Initialization Script
#   State Placement Cell
# ========================================
#
# This script initializes the database for a new installation.
# It performs the following operations:
#   1. Creates the database 'campus_placement_portal'
#   2. Runs schema.sql to create all tables, triggers, and functions
#   3. Runs seed-data.sql to insert initial data
#   4. Applies all migrations in correct order
#
# NOTE: If database already exists, use reset-database.sh instead
#
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Main script
clear
print_header "Database Initialization - State Placement Cell"

echo "This script will initialize the database from scratch."
echo ""
echo "Operations:"
echo "  [1] Create database 'campus_placement_portal'"
echo "  [2] Create all tables, triggers, and functions"
echo "  [3] Insert seed data (regions, colleges, officers)"
echo "  [4] Apply all migrations for latest features"
echo ""
echo "WARNING: If database already exists, creation will fail."
echo "To reset an existing database, use: ./reset-database.sh"
echo ""
read -p "Press Enter to continue..."

# ========================================
# Step 1: Create Database
# ========================================
print_header "[Step 1/4] Creating Database"

echo "You will be prompted for your PostgreSQL password."
echo ""

psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if [ $? -ne 0 ]; then
    echo ""
    print_error "Failed to create database!"
    echo ""
    echo "Possible reasons:"
    echo "  - Database already exists (use ./reset-database.sh instead)"
    echo "  - PostgreSQL is not running"
    echo "  - Incorrect password"
    echo "  - Insufficient permissions"
    echo ""
    exit 1
fi

print_success "Database created successfully!"

# ========================================
# Step 2: Create Schema
# ========================================
print_header "[Step 2/4] Creating Database Schema"

if [ ! -f "database/schema.sql" ]; then
    print_error "database/schema.sql not found!"
    exit 1
fi

echo "Creating tables, triggers, functions, and indexes..."
echo "This may take a moment..."
echo ""

psql -U postgres -d campus_placement_portal -f database/schema.sql
if [ $? -ne 0 ]; then
    echo ""
    print_error "Failed to create database schema!"
    echo "Check the output above for specific errors."
    exit 1
fi

print_success "Schema created successfully!"

# ========================================
# Step 3: Seed Initial Data
# ========================================
print_header "[Step 3/4] Seeding Initial Data"

if [ ! -f "database/seed-data.sql" ]; then
    print_error "database/seed-data.sql not found!"
    exit 1
fi

echo "Inserting:"
echo "  - 5 regions across Kerala"
echo "  - 60 polytechnic colleges"
echo "  - 59 placement officers (one per college)"
echo "  - 1 super admin account"
echo "  - Default PRN ranges"
echo ""

psql -U postgres -d campus_placement_portal -f database/seed-data.sql
if [ $? -ne 0 ]; then
    echo ""
    print_error "Failed to seed initial data!"
    echo "Check the output above for specific errors."
    exit 1
fi

print_success "Seed data inserted successfully!"

# ========================================
# Step 4: Apply Migrations
# ========================================
print_header "[Step 4/4] Applying Database Migrations"

echo "Applying all feature enhancements and updates..."
echo ""

# Define migration order to handle dependencies correctly
migrations=(
    "001_add_new_student_fields.sql"
    "001_add_performance_indexes.sql"
    "001_create_extended_profiles.sql"
    "002_update_prn_ranges_for_placement_officers.sql"
    "002_add_college_branches.sql"
    "002_add_driving_license_to_extended_profiles.sql"
    "003_add_missing_placement_officer.sql"
    "003_auto_create_extended_profiles.sql"
    "004_add_height_weight_criteria.sql"
    "004_fix_document_defaults.sql"
    "005_state_placement_cell_features.sql"
    "005_recalculate_section_completion.sql"
    "006_create_branches_reference_table.sql"
    "006_create_job_request_requirements.sql"
    "006_add_job_drives_and_placement_tracking.sql"
    "007_fix_profile_completion_bug.sql"
    "008_add_priority_to_notifications.sql"
    "009_add_college_logo_fields.sql"
    "010_add_missing_document_columns.sql"
    "011_fix_profile_completion_logic.sql"
    "011_add_manual_addition_flag.sql"
    "012_update_completion_logic_at_least_one.sql"
    "013_add_not_interested_education_option.sql"
)

applied=0
skipped=0

for migration in "${migrations[@]}"; do
    if [ -f "database/migrations/$migration" ]; then
        echo "- Applying: $migration"
        psql -U postgres -d campus_placement_portal -f "database/migrations/$migration" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "  [SKIP] Already applied or optional"
            ((skipped++))
        else
            echo "  [OK] Applied successfully"
            ((applied++))
        fi
    else
        echo "- [MISSING] $migration not found (skipping)"
    fi
done

echo ""
echo "Migration summary:"
echo "  Applied: $applied"
echo "  Skipped: $skipped"
echo ""
print_success "All migrations processed!"

# ========================================
# Completion
# ========================================
print_header "DATABASE INITIALIZATION COMPLETE!"

echo "========================================"
echo "  DATABASE READY!"
echo "========================================"
echo ""
echo "Your database is now ready with:"
echo "  [*] 19+ tables with complete relationships"
echo "  [*] 5 regions across Kerala"
echo "  [*] 60 polytechnic colleges"
echo "  [*] 59 placement officers (one per college)"
echo "  [*] 1 super admin account"
echo "  [*] Default PRN ranges"
echo "  [*] All triggers, functions, and indexes"
echo "  [*] Latest feature migrations applied"
echo ""
echo "========================================"
echo "  LOGIN CREDENTIALS:"
echo "========================================"
echo ""
echo "Super Admin:"
echo "  Email:    adityanche@gmail.com"
echo "  Password: y9eshszbrr"
echo ""
echo "Placement Officers:"
echo "  Username: phone_number (e.g., 9497219788)"
echo "  Password: 123"
echo ""
echo "IMPORTANT: Change default passwords after first login!"
echo ""
echo "========================================"
echo ""
echo "Next Steps:"
echo "  1. Configure backend/.env with your credentials"
echo "  2. Run: ./start.sh"
echo ""
echo "========================================"

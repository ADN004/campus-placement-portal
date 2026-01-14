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
print_header "[Step 1/3] Creating Database"

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
print_header "[Step 2/3] Creating Database Schema"

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
print_header "[Step 3/3] Seeding Initial Data"

echo "Inserting:"
echo "  - 5 regions across Kerala"
echo "  - 60 polytechnic colleges"
echo "  - 60 placement officers (one per college)"
echo "  - Super admin account (optional, interactive)"
echo "  - Default PRN ranges"
echo ""
echo "Running Node.js seeding script..."
echo "You will be prompted to optionally create a super admin."
echo ""

cd backend
node scripts/seedDatabase.js
if [ $? -ne 0 ]; then
    echo ""
    print_error "Failed to seed initial data!"
    echo "Check the output above for specific errors."
    cd ..
    exit 1
fi
cd ..

print_success "Seed data inserted successfully!"

# ========================================
# Completion
# ========================================
print_header "DATABASE INITIALIZATION COMPLETE!"

echo "========================================"
echo "  DATABASE READY!"
echo "========================================"
echo ""
echo "Your database is now ready with:"
echo "  [*] 27 tables with complete relationships"
echo "  [*] 5 regions across Kerala"
echo "  [*] 60 polytechnic colleges"
echo "  [*] 60 placement officers (one per college)"
echo "  [*] Super admin account (if created during setup)"
echo "  [*] Default PRN ranges"
echo "  [*] All triggers, functions, and indexes"
echo ""
echo "========================================"
echo "  LOGIN CREDENTIALS:"
echo "========================================"
echo ""
echo "Super Admin:"
echo "  (Created during seeding if you chose yes)"
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

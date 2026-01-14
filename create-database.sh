#!/bin/bash
echo "========================================"
echo "   Creating Database"
echo "========================================"
echo ""

# Create database
echo "Creating database 'campus_placement_portal'..."
psql -U postgres -c "CREATE DATABASE campus_placement_portal;"
if [ $? -ne 0 ]; then
    echo ""
    echo "Database might already exist or there was an error."
    echo "If database exists, that's OK! Continuing..."
fi
echo ""

# Run schema
echo "Running database schema..."
cd backend
npm run db:setup
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create database schema"
    cd ..
    exit 1
fi
echo "Schema created successfully!"
echo ""

# Seed data
echo "Seeding database with initial data..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to seed database"
    cd ..
    exit 1
fi
cd ..
echo ""

echo "========================================"
echo "   Database created successfully!"
echo "========================================"
echo ""
echo "- Database name: campus_placement_portal"
echo "- 5 regions created"
echo "- 60 colleges created"
echo "- 60 placement officers created"
echo "- Super admin (if created during seeding)"
echo ""
echo "Credentials:"
echo "  Super Admin: (created during seeding if you chose yes)"
echo "  Officers: phone_number / 123"
echo ""
echo "You can now start the application with: ./start.sh"
echo "========================================"

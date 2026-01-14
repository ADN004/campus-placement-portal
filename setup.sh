#!/bin/bash
# ========================================
#   State Placement Cell - Complete Setup
#   Campus Placement Portal for 60 Kerala Polytechnics
# ========================================
#
# This script performs a complete fresh installation:
#   1. Validates prerequisites (Node.js, PostgreSQL)
#   2. Creates environment configuration files
#   3. Installs backend and frontend dependencies
#   4. Initializes database with schema, seed data, and all migrations
#   5. Sets up the complete application ready to run
#
# Prerequisites:
#   - Node.js v18+ (https://nodejs.org/)
#   - PostgreSQL v14+ (https://www.postgresql.org/download/)
#   - Git (optional, for version control)
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
print_header "State Placement Cell - Setup Wizard"

echo "This will set up the complete application on your system."
echo ""
echo "What will be set up:"
echo "  [*] Backend API (Node.js/Express)"
echo "  [*] Frontend UI (React/Vite)"
echo "  [*] PostgreSQL Database with:"
echo "      - 19+ tables with relationships"
echo "      - 5 regions across Kerala"
echo "      - 60 polytechnic colleges"
echo "      - 60 placement officers (one per college)"
echo "      - Super admin account (optional, created interactively)"
echo "      - All database migrations for latest features"
echo ""
read -p "Press Enter to continue..."

# ========================================
# Step 1: Validate Prerequisites
# ========================================
print_header "[Step 1/7] Validating Prerequisites"

# Check Node.js
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo ""
    echo "Please install Node.js v18 or later:"
    echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  Fedora/RHEL: sudo dnf install nodejs"
    echo "  Arch: sudo pacman -S nodejs npm"
    echo "  macOS: brew install node"
    echo ""
    echo "Or download from: https://nodejs.org/"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check npm
echo "Checking for npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    echo "npm should come with Node.js installation."
    exit 1
fi
print_success "npm found: $(npm --version)"

# Check PostgreSQL
echo "Checking for PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed!"
    echo ""
    echo "Please install PostgreSQL v14 or later:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  Fedora/RHEL: sudo dnf install postgresql-server postgresql-contrib"
    echo "  Arch: sudo pacman -S postgresql"
    echo "  macOS: brew install postgresql"
    echo ""
    exit 1
fi
print_success "PostgreSQL found: $(psql --version)"

echo ""
print_success "All prerequisites are installed!"

# ========================================
# Step 2: Create Environment Files
# ========================================
print_header "[Step 2/7] Creating Environment Files"

# Create backend .env
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from template..."
    if [ ! -f "backend/.env.example" ]; then
        print_error "backend/.env.example not found!"
        exit 1
    fi
    cp "backend/.env.example" "backend/.env"
    print_success "Created backend/.env"
    echo ""
    echo "========================================"
    echo "  IMPORTANT: Configure backend/.env"
    echo "========================================"
    echo ""
    echo "The backend/.env file has been created with default values."
    echo "You MUST edit it with your credentials:"
    echo ""
    echo "  REQUIRED for basic functionality:"
    echo "    - DB_PASSWORD=your_postgres_password"
    echo "    - JWT_SECRET=generate_random_64_char_string"
    echo ""
    echo "  REQUIRED for photo uploads:"
    echo "    - CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "    - CLOUDINARY_API_KEY=your_api_key"
    echo "    - CLOUDINARY_API_SECRET=your_api_secret"
    echo "    Sign up at: https://cloudinary.com (free tier available)"
    echo ""
    echo "  REQUIRED for email verification:"
    echo "    - EMAIL_USER=your_email@gmail.com"
    echo "    - EMAIL_PASSWORD=your_gmail_app_password"
    echo "    Get Gmail App Password: https://support.google.com/accounts/answer/185833"
    echo ""
    echo "========================================"
    echo ""
else
    print_info "backend/.env already exists (skipping)"
fi

# Create frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env..."
    echo "VITE_API_URL=http://localhost:5000/api" > frontend/.env
    print_success "Created frontend/.env"
else
    print_info "frontend/.env already exists (skipping)"
fi

# ========================================
# Step 3: Install Backend Dependencies
# ========================================
print_header "[Step 3/7] Installing Backend Dependencies"

if [ ! -d "backend" ]; then
    print_error "backend directory not found!"
    exit 1
fi

echo "Installing Node.js packages for backend..."
echo "This may take a few minutes..."
echo ""

cd backend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies!"
    echo ""
    echo "Please check:"
    echo "  - Your internet connection"
    echo "  - npm configuration"
    echo "  - package.json exists in backend folder"
    cd ..
    exit 1
fi
cd ..

echo ""
print_success "Backend dependencies installed successfully!"

# ========================================
# Step 4: Install Frontend Dependencies
# ========================================
print_header "[Step 4/7] Installing Frontend Dependencies"

if [ ! -d "frontend" ]; then
    print_error "frontend directory not found!"
    exit 1
fi

echo "Installing Node.js packages for frontend..."
echo "This may take a few minutes..."
echo ""

cd frontend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies!"
    echo ""
    echo "Please check:"
    echo "  - Your internet connection"
    echo "  - npm configuration"
    echo "  - package.json exists in frontend folder"
    cd ..
    exit 1
fi
cd ..

echo ""
print_success "Frontend dependencies installed successfully!"

# ========================================
# Step 5: Database Setup
# ========================================
print_header "[Step 5/7] Setting Up Database"

echo "This step will:"
echo "  1. Create database 'campus_placement_portal'"
echo "  2. Create all tables, triggers, and functions"
echo "  3. Insert seed data (regions, colleges, officers)"
echo "  4. Apply all migrations for latest features"
echo ""
echo "You will be prompted for your PostgreSQL password."
echo ""
read -p "Press Enter to continue..."

echo ""
echo "Creating database..."
psql -U postgres -c "CREATE DATABASE campus_placement_portal;" 2>/dev/null
if [ $? -ne 0 ]; then
    print_info "Database might already exist."
    print_info "If you want to start fresh, run: ./reset-database.sh"
    print_info "Continuing with existing database..."
else
    print_success "Database created successfully!"
fi
echo ""

echo "Running database schema..."
psql -U postgres -d campus_placement_portal -f database/schema.sql
if [ $? -ne 0 ]; then
    print_error "Failed to create database schema!"
    echo ""
    echo "Please check:"
    echo "  - PostgreSQL is running"
    echo "  - You entered the correct password"
    echo "  - database/schema.sql exists"
    exit 1
fi
print_success "Schema created successfully!"
echo ""

echo "Running seed data via Node.js script..."
echo "This will prompt you to optionally create a super admin account."
echo ""
cd backend
node scripts/seedDatabase.js
if [ $? -ne 0 ]; then
    print_error "Failed to seed initial data!"
    cd ..
    exit 1
fi
cd ..
print_success "Seed data inserted successfully!"
echo ""

# ========================================
# Step 6: Verification
# ========================================
print_header "[Step 6/7] Verifying Installation"

echo "Checking database tables..."
psql -U postgres -d campus_placement_portal -c "\dt" >/dev/null 2>&1
if [ $? -ne 0 ]; then
    print_warning "Could not verify database tables"
else
    print_success "Database tables created"
fi

echo "Checking backend directory structure..."
if [ -d "backend/node_modules" ]; then
    print_success "Backend dependencies installed"
else
    print_warning "Backend node_modules not found"
fi

echo "Checking frontend directory structure..."
if [ -d "frontend/node_modules" ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend node_modules not found"
fi

# ========================================
# Step 7: Completion
# ========================================
print_header "[Step 7/7] Setup Complete!"

echo "========================================"
echo "  INSTALLATION SUCCESSFUL!"
echo "========================================"
echo ""
echo "Your State Placement Cell application is ready!"
echo ""
echo "Database includes:"
echo "  [*] 19+ tables with complete relationships"
echo "  [*] 5 regions across Kerala"
echo "  [*] 60 polytechnic colleges"
echo "  [*] 60 placement officers (one per college)"
echo "  [*] Super admin account (if created during setup)"
echo "  [*] All latest features and migrations"
echo ""
echo "========================================"
echo "  NEXT STEPS:"
echo "========================================"
echo ""
echo "1. CONFIGURE CREDENTIALS (IMPORTANT!)"
echo "   Edit backend/.env with your:"
echo "     - PostgreSQL password (DB_PASSWORD)"
echo "     - JWT secret (generate random 64-char string)"
echo "     - Cloudinary credentials (for photo uploads)"
echo "     - Gmail credentials (for email verification)"
echo ""
echo "2. START THE APPLICATION:"
echo "   Run: ./start.sh"
echo ""
echo "3. ACCESS THE APPLICATION:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo ""
echo "4. LOGIN CREDENTIALS:"
echo "   Super Admin: (created during seeding if you chose yes)"
echo "   Officers:    phone_number / 123"
echo ""
echo "========================================"
echo "  HELPFUL COMMANDS:"
echo "========================================"
echo ""
echo "  ./start.sh           - Start both backend and frontend"
echo "  ./stop-servers.sh    - Stop all running servers"
echo "  ./reset-database.sh  - Reset database to fresh state"
echo "  ./init-database.sh   - Re-initialize database only"
echo ""
echo "========================================"
echo ""

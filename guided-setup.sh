#!/bin/bash

# State Placement Cell - Interactive Guided Setup
# This script will walk you through the entire setup process step-by-step

welcome() {
    clear
    echo ""
    echo "========================================================================"
    echo "         STATE PLACEMENT CELL - INTERACTIVE GUIDED SETUP"
    echo "========================================================================"
    echo ""
    echo "This script will guide you through setting up the State Placement"
    echo "Cell step-by-step. You'll learn what each step does and why it's"
    echo "needed."
    echo ""
    read -p "Press Enter to begin the guided setup..."
}

step1_prerequisites() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 1: CHECKING PREREQUISITES"
    echo "========================================================================"
    echo ""
    echo "Before we start, we need three things installed:"
    echo "  1. Node.js - JavaScript runtime for running the backend and building frontend"
    echo "  2. npm - Node Package Manager for installing dependencies"
    echo "  3. PostgreSQL - Database system to store all data"
    echo ""
    echo "Let's check if you have these installed..."
    echo ""
    read -p "Press Enter to continue..."

    echo "[*] Checking Node.js..."
    if ! command -v node &> /dev/null; then
        echo "[X] Node.js is NOT installed!"
        echo ""
        echo "WHAT IS NODE.JS?"
        echo "  Node.js lets you run JavaScript code on your computer (not just in browser)."
        echo "  Our backend API is written in JavaScript and needs Node.js to run."
        echo ""
        echo "TO INSTALL:"
        echo "  Ubuntu/Debian: sudo apt-get install nodejs npm"
        echo "  Fedora/RHEL: sudo dnf install nodejs npm"
        echo "  Arch: sudo pacman -S nodejs npm"
        echo "  Or download from: https://nodejs.org/"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    else
        NODE_VERSION=$(node --version)
        echo "[OK] Node.js is installed: $NODE_VERSION"
    fi

    echo ""
    echo "[*] Checking npm..."
    if ! command -v npm &> /dev/null; then
        echo "[X] npm is NOT installed!"
        echo ""
        echo "npm should come with Node.js. Try reinstalling Node.js."
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    else
        NPM_VERSION=$(npm --version)
        echo "[OK] npm is installed: $NPM_VERSION"
    fi

    echo ""
    echo "[*] Checking PostgreSQL..."
    if ! command -v psql &> /dev/null; then
        echo "[X] PostgreSQL is NOT installed!"
        echo ""
        echo "WHAT IS POSTGRESQL?"
        echo "  PostgreSQL is a powerful database system. It stores all your data:"
        echo "  - User accounts (students, officers, admin)"
        echo "  - College information"
        echo "  - Job postings"
        echo "  - Applications"
        echo "  - Everything!"
        echo ""
        echo "TO INSTALL:"
        echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
        echo "  Fedora/RHEL: sudo dnf install postgresql postgresql-server"
        echo "  Arch: sudo pacman -S postgresql"
        echo "  Then start the service:"
        echo "    sudo systemctl start postgresql"
        echo "    sudo systemctl enable postgresql"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    else
        PG_VERSION=$(psql --version)
        echo "[OK] PostgreSQL is installed: $PG_VERSION"
    fi

    echo ""
    echo "========================================================================"
    echo "  All prerequisites are installed! Ready to proceed."
    echo "========================================================================"
    echo ""
    read -p "Press Enter to continue to Step 2..."
}

step2_project_structure() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 2: UNDERSTANDING PROJECT STRUCTURE"
    echo "========================================================================"
    echo ""
    echo "Your State Placement Cell has 3 main parts:"
    echo ""
    echo "  1. BACKEND (backend/ folder)"
    echo "     - Node.js server that handles all business logic"
    echo "     - API endpoints that frontend calls"
    echo "     - Database connection and queries"
    echo "     - Authentication and security"
    echo ""
    echo "  2. FRONTEND (frontend/ folder)"
    echo "     - React application (the visual interface)"
    echo "     - What users see in their browser"
    echo "     - Makes API calls to backend"
    echo "     - Handles user interactions"
    echo ""
    echo "  3. DATABASE (PostgreSQL)"
    echo "     - Stores all persistent data"
    echo "     - 15 tables with relationships"
    echo "     - Handles data integrity"
    echo ""
    echo "FLOW OF DATA:"
    echo "  User Browser <--> Frontend <--API calls--> Backend <--SQL--> Database"
    echo ""
    read -p "Press Enter to continue to Step 3..."
}

step3_environment() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 3: ENVIRONMENT CONFIGURATION"
    echo "========================================================================"
    echo ""
    echo "WHAT ARE ENVIRONMENT VARIABLES?"
    echo "  These are configuration values that change between environments."
    echo "  For example:"
    echo "    - Development: Database password might be \"postgres\""
    echo "    - Production: Database password would be a strong random password"
    echo ""
    echo "We store these in .env files (which are NOT pushed to GitHub for security)."
    echo ""
    echo "NEW REQUIREMENTS FOR THIS PROJECT:"
    echo "  1. Database credentials (PostgreSQL)"
    echo "  2. JWT secret for authentication"
    echo "  3. Cloudinary account for photo uploads"
    echo "  4. Gmail App Password for email verification"
    echo ""
    echo "Let's create your environment files..."
    echo ""
    read -p "Press Enter to continue..."

    # Backend .env (most important)
    if [ ! -f "backend/.env" ]; then
        echo "[*] Creating backend .env file..."
        echo ""
        cat > backend/.env << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_placement_portal
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Frontend URL (for CORS and email verification links)
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Cloudinary Configuration (Sign up at https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Email Configuration (for email verification)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=State Placement Cell <your_email@gmail.com>
EOF
        echo "[OK] Backend .env created"
        echo ""
        echo "EXPLANATION OF KEY VARIABLES:"
        echo ""
        echo "REQUIRED (must configure before running):"
        echo "  - DB_PASSWORD: Your PostgreSQL password"
        echo "  - JWT_SECRET: Generate a random secret key (32+ characters)"
        echo ""
        echo "OPTIONAL (for full functionality):"
        echo "  - CLOUDINARY_*: For student photo uploads"
        echo "    Get free account: https://cloudinary.com"
        echo ""
        echo "  - EMAIL_*: For email verification system"
        echo "    Gmail App Password guide:"
        echo "    https://support.google.com/accounts/answer/185833"
        echo ""
    else
        echo "[SKIP] Backend .env already exists"
        echo ""
        echo "IMPORTANT: Make sure your backend/.env has these new variables:"
        echo "  - CLOUDINARY_CLOUD_NAME"
        echo "  - CLOUDINARY_API_KEY"
        echo "  - CLOUDINARY_API_SECRET"
        echo "  - EMAIL_SERVICE"
        echo "  - EMAIL_USER"
        echo "  - EMAIL_PASSWORD"
        echo "  - EMAIL_FROM"
        echo ""
    fi

    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        echo "[*] Creating frontend .env file..."
        echo "VITE_API_URL=http://localhost:5000/api" > frontend/.env
        echo "[OK] Frontend .env created"
        echo ""
        echo "VITE_API_URL tells the frontend where to find the backend API."
        echo ""
    else
        echo "[SKIP] Frontend .env already exists"
    fi

    echo "========================================================================"
    echo "  Environment files created successfully!"
    echo "========================================================================"
    echo ""
    echo "NEXT ACTIONS REQUIRED:"
    echo ""
    echo "1. EDIT backend/.env and update these values:"
    echo "   - DB_PASSWORD (your PostgreSQL password)"
    echo "   - JWT_SECRET (generate a random secret)"
    echo ""
    echo "2. FOR PHOTO UPLOADS: Sign up at cloudinary.com and add:"
    echo "   - CLOUDINARY_CLOUD_NAME"
    echo "   - CLOUDINARY_API_KEY"
    echo "   - CLOUDINARY_API_SECRET"
    echo ""
    echo "3. FOR EMAIL VERIFICATION: Set up Gmail App Password and add:"
    echo "   - EMAIL_USER (your Gmail address)"
    echo "   - EMAIL_PASSWORD (Gmail App Password, NOT regular password)"
    echo ""
    echo "NOTE: The application will work without Cloudinary and Email,"
    echo "but photo uploads and email verification features will be disabled."
    echo ""
    read -p "Press Enter to continue to Step 4..."
}

step4_dependencies() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 4: INSTALLING DEPENDENCIES"
    echo "========================================================================"
    echo ""
    echo "WHAT ARE DEPENDENCIES?"
    echo "  These are external libraries/packages that our code uses."
    echo "  Instead of writing everything from scratch, we use existing tools."
    echo ""
    echo "BACKEND DEPENDENCIES (will be installed):"
    echo "  - express: Web framework for creating API"
    echo "  - pg: PostgreSQL client for database queries"
    echo "  - bcryptjs: For hashing passwords securely"
    echo "  - jsonwebtoken: For authentication tokens"
    echo "  - cors: Allows frontend to call backend API"
    echo "  - ...and more"
    echo ""
    echo "FRONTEND DEPENDENCIES (will be installed):"
    echo "  - react: UI library for building interface"
    echo "  - react-router-dom: For navigation between pages"
    echo "  - axios: For making API calls to backend"
    echo "  - tailwindcss: For styling/design"
    echo "  - ...and more"
    echo ""
    echo "This might take a few minutes. Let's start..."
    echo ""
    read -p "Press Enter to continue..."

    echo "[1/2] Installing BACKEND dependencies..."
    echo ""
    cd backend
    if [ $? -ne 0 ]; then
        echo "[X] Cannot find backend folder!"
        read -p "Press Enter to exit..."
        exit 1
    fi

    echo "Running: npm install"
    echo "(This downloads all backend packages from the internet)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[X] Backend installation failed!"
        echo "Check your internet connection and try again."
        read -p "Press Enter to exit..."
        cd ..
        exit 1
    fi
    cd ..
    echo ""
    echo "[OK] Backend dependencies installed successfully!"
    echo ""

    echo "[2/2] Installing FRONTEND dependencies..."
    echo ""
    cd frontend
    if [ $? -ne 0 ]; then
        echo "[X] Cannot find frontend folder!"
        read -p "Press Enter to exit..."
        exit 1
    fi

    echo "Running: npm install"
    echo "(This downloads all frontend packages from the internet)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[X] Frontend installation failed!"
        echo "Check your internet connection and try again."
        read -p "Press Enter to exit..."
        cd ..
        exit 1
    fi
    cd ..
    echo ""
    echo "[OK] Frontend dependencies installed successfully!"
    echo ""

    echo "========================================================================"
    echo "  All dependencies installed! Your node_modules folders are ready."
    echo "========================================================================"
    echo ""
    read -p "Press Enter to continue to Step 5..."
}

step5_database() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 5: DATABASE SETUP"
    echo "========================================================================"
    echo ""
    echo "Now we'll create your PostgreSQL database and fill it with initial data."
    echo ""
    echo "WHAT WILL HAPPEN:"
    echo "  1. Create a database called \"campus_placement_portal\""
    echo "  2. Run schema.sql - Creates 19+ tables with relationships"
    echo "  3. Run seeding script - Adds initial data:"
    echo "     - 5 regions (South, Central, North, etc.)"
    echo "     - 60 polytechnic colleges"
    echo "     - 60 placement officers (one per college)"
    echo "     - Super admin account (optional, interactive)"
    echo "     - Default PRN ranges"
    echo "  4. Apply all migrations - Adds new features"
    echo ""
    echo "YOU'LL NEED: Your PostgreSQL password"
    echo ""
    read -p "Press Enter to continue..."

    echo "[*] Creating database..."
    echo ""
    psql -U postgres -c "CREATE DATABASE campus_placement_portal;" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "[INFO] Database might already exist, or wrong password."
        echo "Let's try to connect and verify..."
    fi
    echo ""

    echo "[*] Running schema.sql (creating tables)..."
    echo ""
    psql -U postgres -d campus_placement_portal -f database/schema.sql
    if [ $? -ne 0 ]; then
        echo "[X] Schema creation failed!"
        echo ""
        echo "TROUBLESHOOTING:"
        echo "  - Make sure PostgreSQL is running: sudo systemctl status postgresql"
        echo "  - Verify your password is correct"
        echo "  - Check that database files exist in database/ folder"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "[OK] Schema created successfully!"
    echo ""

    echo "[*] Running seed data via Node.js..."
    echo "You will be prompted to optionally create a super admin."
    echo ""
    cd backend
    node scripts/seedDatabase.js
    if [ $? -ne 0 ]; then
        echo "[X] Seed data insertion failed!"
        cd ..
        read -p "Press Enter to exit..."
        exit 1
    fi
    cd ..
    echo "[OK] Seed data inserted successfully!"
    echo ""

    echo "[*] Applying database migrations..."
    echo ""
    echo "This will add all new features and enhancements to the database."
    echo ""
    for migration in database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "- Applying: $(basename "$migration")"
            psql -U postgres -d campus_placement_portal -f "$migration" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "  [OK]"
            else
                echo "  [SKIP] Already applied or optional"
            fi
        fi
    done
    echo ""
    echo "[OK] All migrations processed!"
    echo ""

    echo "========================================================================"
    echo "  DATABASE SETUP COMPLETE!"
    echo "========================================================================"
    echo ""
    echo "Your database now contains:"
    echo "  - 5 regions across Kerala"
    echo "  - 60 polytechnic colleges"
    echo "  - 60 placement officers (one per college)"
    echo "  - Super admin account (if created during setup)"
    echo "  - Default PRN ranges for student registration"
    echo "  - 19+ tables with triggers and functions"
    echo ""
    echo "CREDENTIALS:"
    echo "  Super Admin: (created during seeding if you chose yes)"
    echo ""
    echo "PLACEMENT OFFICER CREDENTIALS (examples):"
    echo "  Username: 9497219788 (phone number)"
    echo "  Password: 123"
    echo ""
    read -p "Press Enter to continue to Step 6..."
}

step6_verification() {
    clear
    echo ""
    echo "========================================================================"
    echo "  STEP 6: VERIFICATION"
    echo "========================================================================"
    echo ""
    echo "Let's verify everything is set up correctly..."
    echo ""
    read -p "Press Enter to continue..."

    echo "[*] Checking backend files..."
    if [ ! -d "backend/node_modules" ]; then
        echo "[X] Backend node_modules not found!"
        verification_failed
        return
    fi
    if [ ! -f "backend/server.js" ]; then
        echo "[X] Backend server.js not found!"
        verification_failed
        return
    fi
    echo "[OK] Backend files verified"
    echo ""

    echo "[*] Checking frontend files..."
    if [ ! -d "frontend/node_modules" ]; then
        echo "[X] Frontend node_modules not found!"
        verification_failed
        return
    fi
    if [ ! -f "frontend/index.html" ]; then
        echo "[X] Frontend index.html not found!"
        verification_failed
        return
    fi
    echo "[OK] Frontend files verified"
    echo ""

    echo "[*] Checking environment files..."
    if [ ! -f "backend/.env" ]; then
        echo "[X] Backend .env not found!"
        verification_failed
        return
    fi
    if [ ! -f "frontend/.env" ]; then
        echo "[X] Frontend .env not found!"
        verification_failed
        return
    fi
    echo "[OK] Environment files verified"
    echo ""

    echo "[*] Checking database connection..."
    psql -U postgres -d campus_placement_portal -c "SELECT COUNT(*) FROM colleges;" &> /dev/null
    if [ $? -ne 0 ]; then
        echo "[X] Cannot connect to database!"
        verification_failed
        return
    fi
    echo "[OK] Database connection verified"
    echo ""

    verification_success
}

verification_failed() {
    echo ""
    echo "[X] Verification failed! Please review the errors above."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
}

verification_success() {
    echo "========================================================================"
    echo "  ALL VERIFICATIONS PASSED!"
    echo "========================================================================"
    echo ""
    read -p "Press Enter to continue to final step..."
    step7_next_steps
}

step7_next_steps() {
    clear
    echo ""
    echo "========================================================================"
    echo "  CONGRATULATIONS! SETUP COMPLETE!"
    echo "========================================================================"
    echo ""
    echo "Your State Placement Cell is now ready to run!"
    echo ""
    echo ""
    echo "========================================================================"
    echo "  WHAT YOU CAN DO NOW:"
    echo "========================================================================"
    echo ""
    echo "1. START THE APPLICATION"
    echo "   Run: ./start.sh"
    echo "   This will open two terminals:"
    echo "     - Backend server (http://localhost:5000)"
    echo "     - Frontend app (http://localhost:5173)"
    echo ""
    echo "2. OPEN IN BROWSER"
    echo "   Navigate to: http://localhost:5173"
    echo ""
    echo "3. LOGIN AS SUPER ADMIN"
    echo "   (Use the credentials you created during seeding)"
    echo ""
    echo "4. OR LOGIN AS PLACEMENT OFFICER"
    echo "   Username: 9497219788"
    echo "   Password: 123"
    echo ""
    echo "5. OR REGISTER AS STUDENT"
    echo "   Click \"Register as Student\""
    echo "   Use a valid PRN (super admin can add PRN ranges)"
    echo ""
    echo ""
    echo "========================================================================"
    echo "  TROUBLESHOOTING:"
    echo "========================================================================"
    echo ""
    echo "If you encounter issues:"
    echo "  1. Make sure PostgreSQL service is running:"
    echo "     sudo systemctl status postgresql"
    echo "  2. Verify ports 5000 and 5173 are not in use"
    echo "  3. Check that .env files have correct values"
    echo ""
    echo ""
    echo "========================================================================"
    echo "  DEVELOPMENT WORKFLOW:"
    echo "========================================================================"
    echo ""
    echo "As you develop:"
    echo "  - Make changes to code files"
    echo "  - Backend auto-restarts when you save (nodemon)"
    echo "  - Frontend auto-refreshes in browser (Vite HMR)"
    echo "  - Use your favorite text editor or IDE"
    echo ""
    echo ""
    echo "========================================================================"
    echo "  READY TO START?"
    echo "========================================================================"
    echo ""
    read -p "Would you like to start the application now? (y/n): " START_NOW

    if [[ "$START_NOW" == "y" || "$START_NOW" == "Y" ]]; then
        echo ""
        echo "Starting application..."
        echo ""
        ./start.sh &
        echo ""
        echo "Application is starting!"
        echo "Wait a few seconds, then open: http://localhost:5173"
        echo ""
    else
        echo ""
        echo "No problem! When you're ready, just run: ./start.sh"
        echo ""
    fi

    echo ""
    echo "Thank you for using the guided setup!"
    echo ""
}

# Main execution
welcome
step1_prerequisites
step2_project_structure
step3_environment
step4_dependencies
step5_database
step6_verification

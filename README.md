# Campus Placement Portal

> **A comprehensive placement management system for 60 Polytechnic Colleges in Kerala**

Full-stack web application built with React, Node.js, Express, and PostgreSQL to manage campus placements across all polytechnic colleges in Kerala with role-based access control for Students, Placement Officers, and Super Admin.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
  - [Docker Deployment](#option-1-docker-recommended-for-production)
  - [Manual Installation](#option-2-manual-installation)
- [System Architecture](#-system-architecture)
- [User Roles](#-user-roles)
- [Key Workflows](#-key-workflows)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎓 Student Features
- **PRN-Based Registration** - Validate PRN against active ranges before registration
- **Cascading College Selection** - Region-based college filtering
- **Approval Workflow** - Wait for placement officer approval before accessing system
- **Job Discovery** - View ALL job postings with eligibility indicators (students can apply to any job)
- **Application Tracking** - Track application status for all applied jobs
- **Notifications** - Receive updates from placement officers and admin

### 👨‍💼 Placement Officer Features
- **Student Management** - Approve/reject student registrations from their college
- **Blacklist/Whitelist** - Blacklist students instantly, request whitelist approval from admin
- **Targeted Notifications** - Send notifications to college students only
- **Report Generation** - Export student data as PDF/Excel with filters
- **Job Applicant Tracking** - View students who applied for specific jobs
- **College-Specific Access** - Can only manage students from their own college

### 🛡️ Super Admin Features
- **PRN Range Management** - Add/modify/delete valid PRN ranges and single PRNs
- **Placement Officer Management** - Add/change officers for any college with complete history tracking
- **Job Posting** - Create jobs with multiple eligibility criteria
- **Whitelist Approval** - Review and approve/reject whitelist requests
- **System-Wide Access** - Can perform all placement officer functions for any college
- **Activity Logs** - Complete audit trail of all actions
- **Consolidated Reports** - Generate reports across colleges and regions

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **PDFKit** - PDF generation
- **ExcelJS** - Excel export

### DevOps
- **Git** - Version control
- **npm** - Package management
- **dotenv** - Environment variables

---

## 📁 Project Structure

```
MajorProject/
├── backend/
│   ├── config/
│   │   └── database.js           # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── studentController.js  # Student operations
│   │   ├── placementOfficerController.js
│   │   ├── superAdminController.js
│   │   └── commonController.js   # Shared resources
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── errorHandler.js       # Error handling
│   │   └── activityLogger.js     # Activity logging
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── placementOfficerRoutes.js
│   │   ├── superAdminRoutes.js
│   │   └── commonRoutes.js
│   ├── scripts/
│   │   ├── setupDatabase.js      # Create schema
│   │   └── seedDatabase.js       # Seed initial data
│   ├── .env.example
│   ├── package.json
│   └── server.js                 # Entry point
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Main layout with sidebar
│   │   │   └── LoadingSpinner.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Auth state management
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── StudentRegisterPage.jsx
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   ├── StudentJobs.jsx
│   │   │   │   ├── StudentApplications.jsx
│   │   │   │   ├── StudentNotifications.jsx
│   │   │   │   └── WaitingPage.jsx
│   │   │   ├── placement-officer/
│   │   │   │   ├── PlacementOfficerDashboard.jsx
│   │   │   │   ├── ManageStudents.jsx
│   │   │   │   └── SendNotification.jsx
│   │   │   └── super-admin/
│   │   │       ├── SuperAdminDashboard.jsx
│   │   │       ├── ManagePRNRanges.jsx
│   │   │       ├── ManagePlacementOfficers.jsx
│   │   │       ├── ManageJobs.jsx
│   │   │       ├── ManageWhitelistRequests.jsx
│   │   │       └── ActivityLogs.jsx
│   │   ├── services/
│   │   │   └── api.js            # API service layer
│   │   ├── App.jsx               # Main app with routing
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── database/
│   ├── schema.sql                # Complete database schema
│   └── seed-data.sql             # Seed data for 60 colleges
│
├── SETUP.md                      # Setup instructions
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

**Prerequisites:** Docker and Docker Compose installed

```bash
# Clone repository
git clone <your-repo-url>
cd MajorProject

# Create environment file
cp .env.example .env
# Edit .env with your production values

# Build and run with Docker Compose
docker-compose up -d

# Access application
# Frontend: http://localhost
# Backend: http://localhost:5000
# Database: localhost:5432
```

**Docker Commands:**
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guides.

---

### Option 2: Manual Installation

**Prerequisites:**
- Node.js v18+
- PostgreSQL v14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd MajorProject
   ```

2. **Setup Database**
   ```bash
   # Create database
   createdb campus_placement_portal

   # Run schema
   cd backend
   npm install
   npm run db:setup
   npm run db:seed
   ```

3. **Configure Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start Backend**
   ```bash
   npm run dev
   # Runs on http://localhost:5000
   ```

5. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

6. **Start Frontend**
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

7. **Access the Application**
   - Open http://localhost:5173
   - Login with default credentials (see below)

### Default Credentials

**Super Admin:**
- Email: `adityanche@gmail.com`
- Password: `y9eshszbrr`

**Placement Officers:**
- Username: `<phone_number>` (e.g., `9497219788`)
- Password: `123`

**Students:**
- Must register first at `/register`
- PRN must be in valid range (set by super admin)

---

## 🏗️ System Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────────┐
│  React Frontend │
│   (Port 5173)   │
└──────┬──────────┘
       │ API Calls
┌──────▼──────────┐
│  Express Backend│
│   (Port 5000)   │
└──────┬──────────┘
       │ SQL Queries
┌──────▼──────────┐
│   PostgreSQL    │
│    Database     │
└─────────────────┘
```

### Key Design Patterns
- **MVC Architecture** - Model-View-Controller pattern
- **RESTful API** - Standard REST endpoints
- **JWT Authentication** - Stateless auth with tokens
- **Role-Based Access Control** - Three distinct user roles
- **Repository Pattern** - Database abstraction
- **Middleware Pattern** - Request processing pipeline

---

## 👥 User Roles

### 1. Student (Final Year Only)
- Register with validated PRN
- Apply for eligible jobs
- Track application status
- Receive notifications

**Access Control:**
- Can only view own data
- Must be approved by placement officer
- Cannot access if blacklisted

### 2. Placement Officer (One per College)
- Manage student registrations
- Approve/reject/blacklist students
- Send college-specific notifications
- Generate reports
- Request whitelist for blacklisted students

**Access Control:**
- Limited to own college only
- Cannot approve whitelist (needs super admin)
- Activity is logged for accountability

### 3. Super Admin (System Administrator)
- Full system access
- Manage PRN ranges
- Manage all placement officers
- Create job postings
- Approve whitelist requests
- View activity logs
- Can act as placement officer for any college

**Access Control:**
- Unrestricted access
- All actions logged
- Cannot be deleted or deactivated

---

## 🔄 Key Workflows

### Student Registration Flow
```
1. Student visits /register
2. Enter PRN → System validates against active ranges
3. PRN valid? → Continue, else show error
4. Select Region → Loads colleges for that region
5. Select College from filtered list
6. Fill mandatory fields (Email, CGPA, Backlogs, etc.)
7. Submit → Account created with 'pending' status
8. Student redirected to Waiting Page
9. Placement Officer approves → Student gets full access
```

### Job Application Flow
```
1. Super Admin creates job with eligibility criteria
2. System calculates eligible students based on:
   - Minimum CGPA
   - Maximum backlogs
   - Specific colleges/regions
   - Other custom criteria
3. Students see only jobs they're eligible for
4. Student clicks "Apply" → Redirected to Google Form (embedded)
5. Form submission tracked in database
6. Student can view application status
```

### Blacklist/Whitelist Flow
```
1. Placement Officer blacklists student with reason
2. Student loses access immediately
3. Officer later requests whitelist with justification
4. Super Admin reviews request
5. Super Admin approves/rejects
6. If approved: Student regains access
7. All actions logged for audit
```

---

## 📡 API Documentation

### Authentication Endpoints
```
POST   /api/auth/login                 # Login
POST   /api/auth/register-student      # Student registration
GET    /api/auth/me                    # Get current user
GET    /api/auth/logout                # Logout
PUT    /api/auth/change-password       # Change password
```

### Student Endpoints
```
GET    /api/students/dashboard         # Dashboard data
GET    /api/students/eligible-jobs     # Get eligible jobs
POST   /api/students/apply/:jobId      # Apply for job
GET    /api/students/my-applications   # Get applications
GET    /api/students/notifications     # Get notifications
```

### Placement Officer Endpoints
```
GET    /api/placement-officer/dashboard
GET    /api/placement-officer/students
PUT    /api/placement-officer/students/:id/approve
PUT    /api/placement-officer/students/:id/reject
PUT    /api/placement-officer/students/:id/blacklist
POST   /api/placement-officer/students/:id/whitelist-request
POST   /api/placement-officer/send-notification
GET    /api/placement-officer/students/export
```

### Super Admin Endpoints
```
# PRN Management
GET    /api/super-admin/prn-ranges
POST   /api/super-admin/prn-ranges
PUT    /api/super-admin/prn-ranges/:id
DELETE /api/super-admin/prn-ranges/:id

# Officer Management
GET    /api/super-admin/placement-officers
POST   /api/super-admin/placement-officers
PUT    /api/super-admin/placement-officers/:id

# Job Management
GET    /api/super-admin/jobs
POST   /api/super-admin/jobs
PUT    /api/super-admin/jobs/:id

# Whitelist Requests
GET    /api/super-admin/whitelist-requests
PUT    /api/super-admin/whitelist-requests/:id/approve
PUT    /api/super-admin/whitelist-requests/:id/reject

# Activity Logs
GET    /api/super-admin/activity-logs
```

---

## 🗄️ Database Schema

### Core Tables
- `users` - All user accounts (students, officers, super admin)
- `regions` - 5 regions in Kerala (South, South-Central, Central, North-Central, North)
- `colleges` - 60 polytechnic colleges
- `students` - Student profiles and approval status
- `placement_officers` - One officer per college
- `prn_ranges` - Valid PRN ranges for registration

### Job Management
- `jobs` - Job postings
- `job_eligibility_criteria` - Multiple criteria per job
- `job_applications` - Application tracking

### Notifications
- `notifications` - Notification messages
- `notification_recipients` - User-notification mapping
- `notification_targets` - Region/college targeting

### Audit & History
- `activity_logs` - Complete audit trail
- `placement_officer_history` - Officer change history
- `whitelist_requests` - Blacklist removal requests

**Total: 15 tables** with proper indexes, foreign keys, and triggers.

---

## 🔒 Security

### Authentication
- JWT tokens with httpOnly cookies
- Bcrypt password hashing (10 salt rounds)
- Token expiry: 7 days (configurable)

### Authorization
- Role-based middleware (`authorize()`)
- Route-level protection (`protect()`)
- College-level access control for placement officers
- Student approval check for sensitive routes

### Data Protection
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)
- CORS configuration
- Password strength requirements

### Activity Logging
- All important actions logged
- Includes: User, action type, timestamp, IP, user agent
- Immutable audit trail
- Accessible only to super admin

---

## 📊 Features Summary

| Feature | Student | Placement Officer | Super Admin |
|---------|---------|------------------|-------------|
| Register | ✅ | ❌ | ❌ |
| View Jobs | ✅ | ❌ | ✅ |
| Apply for Jobs | ✅ | ❌ | ❌ |
| Approve Students | ❌ | ✅ | ✅ |
| Blacklist Students | ❌ | ✅ | ✅ |
| Whitelist Approval | ❌ | ❌ | ✅ |
| Send Notifications | ❌ | ✅ (College) | ✅ (All) |
| Manage PRN Ranges | ❌ | ❌ | ✅ |
| Create Jobs | ❌ | ❌ | ✅ |
| View Activity Logs | ❌ | ❌ | ✅ |
| Export Reports | ❌ | ✅ (College) | ✅ (All) |

---

## 🚀 Deployment

### Docker Deployment (Recommended)

The application is fully Dockerized for easy deployment:

```bash
# Clone and setup
git clone <your-repo-url>
cd MajorProject
cp .env.example .env

# Edit .env with production values
# Build and run all services
docker-compose up -d
```

**What's included:**
- PostgreSQL database with automatic initialization
- Backend API with health checks
- Frontend with Nginx
- Volume persistence for database and uploads
- Automatic restarts
- Health monitoring

### Deployment Platforms

Comprehensive deployment guides available for:
- **Railway** - Quick deployment with automatic HTTPS
- **Render** - Free tier with automatic deployments
- **DigitalOcean** - Full control with Docker
- **AWS** - Enterprise-grade with ECS + RDS
- **Heroku** - Platform-as-a-Service

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed platform-specific guides.**

### GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/campus-placement-portal.git
git push -u origin main
```

### Production Checklist

- [x] Docker configuration
- [x] Environment variables management
- [x] Database backups setup
- [x] SSL/HTTPS configuration
- [x] Monitoring and logging
- [x] Security headers
- [x] Rate limiting
- [x] CORS configuration

---

## 🎯 Roadmap

### Phase 1 (Current) ✅
- [x] Complete backend API
- [x] Database schema and seed data
- [x] Authentication system
- [x] Basic frontend structure
- [x] Role-based dashboards

### Phase 2 (Extend)
- [ ] Complete all frontend pages with full functionality
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced filtering and search
- [ ] File upload for resumes
- [ ] Email notifications
- [ ] SMS integration

### Phase 3 (Enhance)
- [ ] Analytics dashboard
- [ ] Placement statistics and reports
- [ ] Interview scheduling
- [ ] Company portal
- [ ] Mobile app (React Native)

---

## 📄 License

This project is developed as a major project for academic purposes.

---

## 👨‍💻 Developer

**Campus Placement Portal**
Built for 60 Polytechnic Colleges in Kerala

For setup instructions, see [SETUP.md](./SETUP.md)

---

**🎓 Built with ❤️ for Kerala Polytechnics**

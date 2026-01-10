/**
 * State Placement Cell - Main Server Entry Point
 *
 * This file initializes and configures the Express server for the
 * State Placement Cell serving 60 polytechnic colleges in Kerala.
 *
 * Features:
 * - Database connection with PostgreSQL
 * - JWT-based authentication
 * - Role-based access control (Student, Placement Officer, Super Admin)
 * - Scheduled cron jobs for maintenance tasks
 * - Health check endpoint
 * - Comprehensive error handling
 *
 * @module server
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import pool from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { runCleanupTasks } from './utils/cleanupTasks.js';
import { scheduleDailyCronJobs, runMaintenanceTasks } from './utils/cronJobs.js';
import { apiLimiter, authLimiter, exportLimiter } from './middleware/rateLimiter.js';

// Load environment variables from .env file
dotenv.config();

// Import route modules
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import placementOfficerRoutes from './routes/placementOfficerRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import commonRoutes from './routes/commonRoutes.js';
import extendedProfileRoutes from './routes/extendedProfileRoutes.js';
import jobRequirementsRoutes from './routes/jobRequirementsRoutes.js';
import enhancedApplicationRoutes from './routes/enhancedApplicationRoutes.js';

// Initialize Express application
const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

/**
 * Trust Proxy Configuration
 * Required for rate limiting and IP detection behind reverse proxy (nginx, cloudflare, etc.)
 * IMPORTANT: Enable this in production when behind a proxy
 */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

/**
 * Security Headers with Helmet
 * Protects against XSS, clickjacking, MIME sniffing, and other attacks
 * CRITICAL for production security
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

/**
 * Response Compression
 * Compresses all responses to reduce bandwidth by 70-90%
 * CRITICAL for handling high traffic
 */
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and speed
}));

/**
 * CORS Configuration
 * Allows cross-origin requests from the frontend with credentials
 * Supports multiple frontend URLs for production (e.g., www and non-www)
 */
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours - cache preflight requests
}));

/**
 * Body Parsers
 * - JSON parser with 50MB limit for file uploads
 * - URL-encoded parser for form data
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Cookie Parser
 * Enables reading and writing cookies (used for JWT tokens)
 */
app.use(cookieParser());

/**
 * Request Logging Middleware (Development Only)
 * Logs all incoming requests with method and path
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

/**
 * Health Check Endpoint
 * Used by Docker and monitoring tools to verify server status
 *
 * @route GET /health
 * @access Public
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'State Placement Cell API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Rate Limiting
 * Protects API from abuse and DDoS attacks
 */
// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Stricter rate limiting for authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register-student', authLimiter);

// Rate limiting for export endpoints (resource-intensive)
app.use('/api/*/export', exportLimiter);
app.use('/api/*/custom-export', exportLimiter);
app.use('/api/*/enhanced-export', exportLimiter);

/**
 * API Routes
 * All routes are prefixed with /api
 */
app.use('/api/auth', authRoutes);                   // Authentication & registration
app.use('/api/students', studentRoutes);            // Student operations
app.use('/api/students/extended-profile', extendedProfileRoutes); // Extended profile management
app.use('/api/students/jobs', enhancedApplicationRoutes); // Enhanced job applications
app.use('/api/placement-officer', placementOfficerRoutes); // Placement officer operations
app.use('/api/super-admin', superAdminRoutes);      // Super admin operations
app.use('/api/common', commonRoutes);               // Public/common endpoints
app.use('/api', jobRequirementsRoutes);             // Job requirements (all roles)

/**
 * Welcome Route
 * Provides API information and available endpoints
 *
 * @route GET /
 * @access Public
 */
app.get('/', (req, res) => {
  res.json({
    message: 'State Placement Cell API',
    version: '1.0.0',
    description: 'Backend API for 60 Polytechnic Colleges in Kerala',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      students: '/api/students',
      placementOfficer: '/api/placement-officer',
      superAdmin: '/api/super-admin',
      common: '/api/common',
    },
  });
});

// ============================================
// ERROR HANDLING
// ============================================

/**
 * 404 Not Found Handler
 * Catches all undefined routes
 */
app.use(notFound);

/**
 * Global Error Handler
 * Catches and formats all errors from routes
 */
app.use(errorHandler);

// ============================================
// SERVER INITIALIZATION
// ============================================

const PORT = process.env.PORT || 5000;

/**
 * Start Server Function
 * Initializes database connection, runs maintenance tasks, and starts the Express server
 *
 * @async
 * @function startServer
 * @throws {Error} If database connection fails or server cannot start
 */
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Run initial cleanup tasks
    console.log('🧹 Running initial cleanup tasks...');
    await runCleanupTasks();

    // Run initial maintenance tasks (disabled - runs slowly)
    // console.log('🔧 Running initial maintenance tasks...');
    // await runMaintenanceTasks();

    /**
     * Schedule Daily Cleanup Tasks
     * Runs at midnight every day to clean up expired tokens and old logs
     */
    const scheduleCleanup = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // at midnight
      );
      const msToMidnight = night.getTime() - now.getTime();

      setTimeout(() => {
        runCleanupTasks();
        // Repeat every 24 hours
        setInterval(runCleanupTasks, 24 * 60 * 60 * 1000);
      }, msToMidnight);
    };

    scheduleCleanup();
    console.log('⏰ Cleanup tasks scheduled to run daily at midnight');

    /**
     * Schedule Cron Jobs
     * - Daily age updates for all students
     * - Materialized view refresh for performance
     */
    scheduleDailyCronJobs();

    // Start listening for requests
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();

// ============================================
// PROCESS ERROR HANDLERS
// ============================================

/**
 * Handle Unhandled Promise Rejections
 * Logs error and gracefully shuts down server
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

/**
 * Handle Uncaught Exceptions
 * Logs error and gracefully shuts down server
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Graceful Shutdown on SIGTERM
 * Closes database connections and shuts down cleanly
 */
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

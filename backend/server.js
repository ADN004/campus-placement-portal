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
import { apiLimiter, authLimiter, authIpLimiter, exportLimiter, passwordResetLimiter } from './middleware/rateLimiter.js';

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
 *
 * 2MB, not the 50MB this used to allow. Express buffers the whole body into
 * memory before any route runs — and these parsers sit above the routes, so
 * that buffering happens before anyone is authenticated. At 50MB a handful of
 * concurrent anonymous requests could pin ~1GB of RAM and OOM the container.
 *
 * 2MB clears every real payload with room to spare. The largest legitimate
 * body in the app is a profile photo: those are capped at 500KB client-side
 * and sent as base64, which inflates by roughly a third, so ~700KB. Bulk
 * import spreadsheets are multipart (multer, 2MB) and never reach these
 * parsers at all.
 *
 * Note this is also the only *enforced* photo limit — the 500KB check is
 * client-side and a crafted request ignores it.
 */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
// Registered at /health (Docker healthcheck, direct port) AND /api/health
// (publicly reachable through the reverse proxy, which only forwards /api/).
// Defined before the /api rate limiters and routers on purpose.
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'State Placement Cell API is running',
    environment: process.env.NODE_ENV || 'development',
    // The client IP as Express resolves it (after trust proxy). Rate limits
    // key on this — if it shows a private/docker IP instead of the caller's
    // real IP, the reverse proxy is not forwarding X-Forwarded-For.
    client_ip: req.ip,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Rate Limiting
 * Protects API from abuse and DDoS attacks
 */
// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Stricter rate limiting for authentication endpoints:
// coarse per-IP failed cap first, then the per-(IP, account) limiter
app.use('/api/auth/login', authIpLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register-student', authIpLimiter);
app.use('/api/auth/register-student', authLimiter);

// Password reset endpoints — count all requests (forgot-password always
// returns success to avoid enumeration, so a failure-only limiter wouldn't bite)
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

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
 *
 * Log loudly but DO NOT exit. A rejected promise from a single request does
 * not corrupt global process state, so killing the whole backend over it is
 * disproportionate — and, with Docker's restart policy, a repeatable trigger
 * (a retrying client, a monitor probe) turns it into a site-wide crash loop.
 * This mirrors the database pool 'error' handler, which deliberately does not
 * crash for the same reason. (uncaughtException below still exits, on purpose:
 * there the process state may genuinely be corrupt and a clean restart is safer.)
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection (logged, server kept alive):', err);
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

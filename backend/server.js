import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pool from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { runCleanupTasks } from './utils/cleanupTasks.js';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import placementOfficerRoutes from './routes/placementOfficerRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import commonRoutes from './routes/commonRoutes.js';

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Campus Placement Portal API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/placement-officer', placementOfficerRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/common', commonRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Campus Placement Portal API',
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

// Error handling middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Run cleanup tasks on startup
    console.log('🧹 Running initial cleanup tasks...');
    await runCleanupTasks();

    // Schedule cleanup tasks to run daily at midnight
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

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

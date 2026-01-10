/**
 * Authentication Middleware Module
 *
 * This module provides middleware functions for authentication and authorization
 * in the State Placement Cell.
 *
 * Features:
 * - JWT token verification
 * - Role-based access control
 * - Student approval status checking
 * - Token generation and cookie management
 *
 * @module middleware/auth
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Protect Routes - Verify JWT Token
 *
 * Verifies the JWT token from cookies or Authorization header.
 * Adds the authenticated user to req.user if valid.
 *
 * @async
 * @function protect
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 *
 * @example
 * // Usage in route
 * router.get('/profile', protect, getProfile);
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in cookies (preferred) or Authorization header
    if (req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];
    }

    // Verify token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.',
      });
    }

    try {
      // Verify token signature and expiration
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from database
      const result = await query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      // Check if user exists
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token may be invalid.',
        });
      }

      const user = result.rows[0];

      // Verify user account is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Contact administrator.',
        });
      }

      // Attach user to request object for use in route handlers
      req.user = user;
      next();
    } catch (err) {
      // Token verification failed (expired, invalid signature, etc.)
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed. Please login again.',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
    });
  }
};

// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================

/**
 * Authorize Specific Roles
 *
 * Returns a middleware that checks if the authenticated user has one of the allowed roles.
 * Must be used after the protect middleware.
 *
 * @function authorize
 * @param {...string} roles - Allowed roles (student, placement_officer, super_admin)
 * @returns {express.RequestHandler} Middleware function
 *
 * @example
 * // Single role
 * router.get('/admin-only', protect, authorize('super_admin'), adminHandler);
 *
 * @example
 * // Multiple roles
 * router.get('/officers', protect, authorize('placement_officer', 'super_admin'), handler);
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user's role is in the allowed roles array
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// ============================================
// STUDENT-SPECIFIC MIDDLEWARE
// ============================================

/**
 * Check Student Approval Status
 *
 * Verifies that a student is approved and not blacklisted.
 * Only applies checks if the user is a student (skips for other roles).
 *
 * @async
 * @function checkStudentApproval
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 *
 * @example
 * // Usage in student routes
 * router.get('/jobs', protect, authorize('student'), checkStudentApproval, getJobs);
 */
export const checkStudentApproval = async (req, res, next) => {
  try {
    // Skip check if user is not a student
    if (req.user.role !== 'student') {
      return next();
    }

    // Fetch student status from database
    const result = await query(
      'SELECT registration_status, is_blacklisted FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const student = result.rows[0];

    // Check if student is blacklisted
    if (student.is_blacklisted) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blacklisted. Contact your placement officer.',
      });
    }

    // Check if student registration is approved
    if (student.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your registration is pending approval from placement officer',
        status: student.registration_status,
      });
    }

    next();
  } catch (error) {
    console.error('Student approval check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking student status',
    });
  }
};

// ============================================
// TOKEN UTILITIES
// ============================================

/**
 * Generate JWT Token
 *
 * Creates a signed JWT token with the user ID as payload.
 * Token expires based on JWT_EXPIRE environment variable (default: 7 days).
 *
 * @function generateToken
 * @param {number} id - User ID
 * @returns {string} Signed JWT token
 *
 * @example
 * const token = generateToken(userId);
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Send Token Response with Cookie
 *
 * Generates a JWT token, sets it as an HTTP-only cookie, and sends a JSON response.
 * Cookie is secure in production and has SameSite strict policy.
 *
 * @function sendTokenResponse
 * @param {Object} user - User object with id, email, and role
 * @param {number} statusCode - HTTP status code
 * @param {express.Response} res - Express response object
 * @param {string} [message='Success'] - Response message
 * @returns {void}
 *
 * @example
 * // After successful login
 * sendTokenResponse(user, 200, res, 'Login successful');
 */
export const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  // Generate JWT token
  const token = generateToken(user.id);

  // Cookie options
  const options = {
    // Cookie expires in JWT_COOKIE_EXPIRE days (default: 7)
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,  // Prevents XSS attacks - cookie not accessible via JavaScript
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // 'none' for cross-domain in production, 'lax' for dev
    // Note: sameSite: 'none' requires secure: true (HTTPS)
  };

  // Send response with cookie and user data
  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    message,
    token,  // Also include token in body for mobile apps/non-browser clients
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
};

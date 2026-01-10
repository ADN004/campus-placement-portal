/**
 * Rate Limiting Middleware
 *
 * Protects API from abuse and DDoS attacks by limiting request rates
 * Configured for high-traffic production use (20,000+ concurrent users)
 *
 * IMPORTANT: For production with reverse proxy (nginx, cloudflare):
 * - Configure trust proxy in server.js: app.set('trust proxy', 1)
 * - Use rate-limit-redis or rate-limit-memcached for distributed systems
 */

import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * Applies to all /api routes
 * - 1000 requests per 15 minutes per IP (increased for high traffic)
 * - For 20k users: ~66 requests/min per user across all endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 100, // Higher limit for production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  // Skip rate limiting for successful authenticated requests in production
  skip: (req) => process.env.NODE_ENV === 'production' && req.user,
});

/**
 * Authentication Rate Limiter
 * Stricter limits for login/registration to prevent brute force
 * - 10 attempts per 15 minutes per IP (increased for legitimate use cases)
 * - Only failed requests count toward the limit
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 failed attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests - successful logins don't count
  skipSuccessfulRequests: true,
});

/**
 * Read Operations Rate Limiter
 * More lenient for GET requests
 * - 60 requests per minute per IP
 */
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests
  skip: (req) => req.method === 'GET' && req.user, // Skip for authenticated GET requests
});

/**
 * Export Operations Rate Limiter
 * Limits for resource-intensive export operations
 * - 30 exports per hour per IP (increased for legitimate officer/admin use)
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit to 30 exports per hour
  message: {
    success: false,
    message: 'Export limit reached. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Higher limit for authenticated users
  skip: (req) => req.user && req.user.role === 'super_admin',
});

/**
 * File Upload Rate Limiter
 * Limits for photo uploads
 * - 20 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 uploads per hour
  message: {
    success: false,
    message: 'Upload limit reached. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

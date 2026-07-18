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

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';

/**
 * Identify the caller for rate-limiting purposes.
 *
 * Returns a per-user key when the request carries a valid JWT, and falls back
 * to the client IP when it does not.
 *
 * This limiter runs in server.js before any route mounts `protect`, so
 * `req.user` is not populated yet — the token has to be read here directly.
 * Extraction mirrors `protect` in middleware/auth.js: cookie first, then a
 * Bearer header. cookieParser() is mounted above this limiter, so req.cookies
 * is available.
 *
 * The token is verified, not just decoded, so a forged payload cannot mint
 * itself unlimited fresh buckets. Verification is an HMAC check — no database
 * hit, microseconds per request.
 */
const userOrIpKey = (req) => {
  let token;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) return `user:${decoded.id}`;
    } catch {
      // Expired, tampered with, or otherwise unusable — fall through to IP.
    }
  }

  // ipKeyGenerator normalizes IPv6 to its /56 subnet (v8 requirement) — it
  // takes the IP string, not the request, and passing the request yields a key
  // that differs every call, which silently removes the limit entirely.
  return ipKeyGenerator(req.ip);
};

/**
 * General API Rate Limiter
 * Applies to all /api routes
 * - 1000 requests per 15 minutes per authenticated user, or per IP if anonymous
 * - For 20k users: ~66 requests/min per user across all endpoints
 *
 * Keyed by user id where possible, NOT by IP alone. A whole polytechnic leaves
 * through a single NAT IP, so a pure-IP key made the cap collective: one
 * dashboard load is several API calls, so 1000 requests is roughly 150-200 page
 * loads for the entire campus combined. During a placement drive that trips in
 * minutes and locks out every student at that college — and the placement
 * officer on the same wifi along with them.
 *
 * This replaces a `skip: (req) => production && req.user` that never fired,
 * because req.user is not set this early in the stack. It has been removed
 * rather than left in place: code that looks like it exempts authenticated
 * users while silently doing nothing is worse than no exemption at all.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 100, // Higher limit for production
  keyGenerator: userOrIpKey,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
});

/**
 * Authentication Rate Limiter (per IP + account)
 * Stricter limits for login/registration to prevent brute force
 * - 10 failed attempts per 15 minutes per (IP, account) pair
 * - Only failed requests count toward the limit
 *
 * Keyed by IP + the submitted email/PRN, NOT by IP alone: whole campuses
 * share one NAT IP and mobile carriers put thousands of users behind one
 * CGNAT IP, so a pure-IP key let 10 failed attempts from ANYONE lock out
 * everyone sharing that IP. Per-account keying keeps brute-force protection
 * (10 tries per account per IP) without collective lockouts. A separate
 * coarse per-IP cap below still stops credential-stuffing across accounts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each (IP, account) pair to 10 failed attempts per windowMs
  keyGenerator: (req) => {
    const account =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    // ipKeyGenerator normalizes IPv6 to its /56 subnet (v8 requirement)
    return `${ipKeyGenerator(req.ip)}|${account}`;
  },
  message: {
    success: false,
    message:
      'Too many login attempts for this account, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests - successful logins don't count
  skipSuccessfulRequests: true,
});

/**
 * Authentication IP-wide Rate Limiter
 * Coarse safety net behind authLimiter: 100 FAILED attempts per IP per
 * 15 minutes, across all accounts. High enough that a shared campus/CGNAT
 * IP never hits it through normal use, low enough to blunt bulk
 * credential-stuffing from a single source.
 */
export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Failed attempts per IP across all accounts
  message: {
    success: false,
    message: 'Too many login attempts from this network, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Password Reset Rate Limiter
 * Protects the forgot-password / reset-password endpoints from abuse.
 * - 10 requests per 15 minutes per IP, counting ALL requests.
 *
 * These count every request (not just failures) because forgot-password
 * deliberately always returns success to avoid account enumeration — so
 * skipping successful ones would defeat the limit. High enough for a genuine
 * user retrying, low enough to blunt reset-email spam aimed at a victim.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in a few minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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

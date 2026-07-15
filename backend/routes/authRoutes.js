import express from 'express';
import {
  login,
  getMe,
  logout,
  changePassword,
  registerStudent,
  verifyEmail,
  resendVerificationEmail,
  verifyGoogleEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register-student', registerStudent);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/google-email', verifyGoogleEmail);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

export default router;

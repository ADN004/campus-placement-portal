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
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { updateOwnEmail } from '../controllers/studentEmailController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register-student', registerStudent);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/google-email', verifyGoogleEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.put('/student-email', protect, updateOwnEmail);

export default router;

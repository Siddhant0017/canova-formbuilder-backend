// routes/passwordRecovery.js - Add logging
const express = require('express');
const { forgotPassword, verifyOTP, resetPassword } = require('../controllers/passwordRecoveryController');
const router = express.Router();

console.log('🛣️ Password recovery routes loaded');
console.log('forgotPassword function:', typeof forgotPassword);

// Request OTP for password reset
router.post('/forgot-password', (req, res, next) => {
  console.log('📧 Forgot password route hit!');
  forgotPassword(req, res, next);
});

// Verify OTP and get reset token
router.post('/verify-otp', verifyOTP);

// Reset password with token
router.post('/reset-password', resetPassword);

module.exports = router;

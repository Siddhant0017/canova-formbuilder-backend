const express = require('express');
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  lookupUsersByEmail,
} = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/lookup-by-email', auth, lookupUsersByEmail); 
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// Add to routes/auth.js:
router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);

module.exports = router;

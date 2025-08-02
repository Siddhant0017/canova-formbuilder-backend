// server.js - CORRECTED VERSION
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
require('dotenv').config();

const passwordRecoveryRoutes = require('./routes/passwordRecovery');
const authRoutes             = require('./routes/auth');
const formRoutes             = require('./routes/forms');
const projectRoutes          = require('./routes/projects');
const activityRoutes         = require('./routes/activity');
const analyticsRoutes        = require('./routes/analytics');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, _, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/password', passwordRecoveryRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/forms',    formRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ✅ FIXED: Named wildcard parameter
app.use('/*catchall', (_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('🚨  EXPRESS ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (${process.env.NODE_ENV})`);
      console.log('Available password-recovery routes:');
      console.log('  POST /api/password/forgot-password');
      console.log('  POST /api/password/verify-otp');
      console.log('  POST /api/password/reset-password');
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

const express = require('express');
const { getViewsAnalytics, getFormAnalytics, getProjectAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/views', auth, getViewsAnalytics);
router.get('/form/:formId', auth, getFormAnalytics);
router.get('/project/:projectId', auth, getProjectAnalytics); // This function needs to be imported

module.exports = router;

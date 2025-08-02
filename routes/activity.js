const express = require('express');
const { getRecentActivity } = require('../controllers/activityController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/recent', auth, getRecentActivity);

module.exports = router;

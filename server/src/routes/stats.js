const express = require('express');
const router = express.Router();
const { getStats, getHabitReport, getHabitConsistency } = require('../controllers/statsController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get basic stats
router.get('/', getStats);

// Get comprehensive habit report using stored procedure
router.get('/report', getHabitReport);

// Get consistency score for a specific habit
router.get('/consistency/:habitId', getHabitConsistency);

module.exports = router; 
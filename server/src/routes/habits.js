const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    createHabit,
    getHabits,
    getHabit,
    updateHabit,
    deleteHabit
} = require('../controllers/habitController');

// All routes require authentication
router.use(auth);

// CRUD routes for habits
router.post('/', createHabit);
router.get('/', getHabits);
router.get('/:id', getHabit);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);

module.exports = router; 
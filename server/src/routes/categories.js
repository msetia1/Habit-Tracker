const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

// All routes require authentication
router.use(auth);

// CRUD routes for categories
router.post('/', createCategory);
router.get('/', getCategories);
router.get('/:id', getCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router; 
const prisma = require('../lib/prisma');

/**
 * Create a new category
 */
const createCategory = async (req, res) => {
    try {
        const { name, color } = req.body;
        const userId = req.user.id;

        const category = await prisma.category.create({
            data: {
                name,
                color,
                userId
            }
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get all categories for a user
 */
const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { userId: req.user.id },
            include: {
                habits: {
                    select: {
                        id: true
                    }
                }
            }
        });
        
        // Add habit count to each category
        const categoriesWithCount = categories.map(category => ({
            ...category,
            habitCount: category.habits.length,
            habits: undefined // Remove habits array from response
        }));
        
        res.json(categoriesWithCount);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get a single category
 */
const getCategory = async (req, res) => {
    try {
        const category = await prisma.category.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: {
                habits: true
            }
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update a category
 */
const updateCategory = async (req, res) => {
    try {
        const { name, color } = req.body;
        
        const category = await prisma.category.update({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            data: {
                name,
                color
            }
        });

        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Delete a category
 */
const deleteCategory = async (req, res) => {
    try {
        await prisma.category.delete({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory
}; 
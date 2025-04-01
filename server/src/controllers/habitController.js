const prisma = require('../lib/prisma');

// Create a new habit
const createHabit = async (req, res) => {
    try {
        const { name, description, frequency, targetCount, startDate, categoryId } = req.body;
        const userId = req.user.id;

        const habit = await prisma.habit.create({
            data: {
                name,
                description,
                frequency,
                targetCount,
                startDate,
                categoryId,
                userId
            },
            include: {
                category: true
            }
        });

        res.status(201).json(habit);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all habits for a user
const getHabits = async (req, res) => {
    try {
        const habits = await prisma.habit.findMany({
            where: { userId: req.user.id },
            include: {
                category: true,
                habitLogs: true,
                streaks: true
            }
        });
        res.json(habits);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get a single habit
const getHabit = async (req, res) => {
    try {
        const habit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: {
                category: true,
                habitLogs: true,
                streaks: true
            }
        });

        if (!habit) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        res.json(habit);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update a habit
const updateHabit = async (req, res) => {
    try {
        const { name, description, frequency, targetCount, startDate, categoryId, active } = req.body;
        
        const habit = await prisma.habit.update({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            data: {
                name,
                description,
                frequency,
                targetCount,
                startDate,
                categoryId,
                active
            },
            include: {
                category: true
            }
        });

        res.json(habit);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a habit
const deleteHabit = async (req, res) => {
    try {
        await prisma.habit.delete({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createHabit,
    getHabits,
    getHabit,
    updateHabit,
    deleteHabit
}; 
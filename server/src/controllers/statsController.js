const { getHabitStats, getCategoryStats, generateHabitReport, getConsistencyScore } = require('../lib/db');

const getStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user.id;

        const [habitStats, categoryStats] = await Promise.all([
            getHabitStats(userId, startDate, endDate),
            getCategoryStats(userId, startDate, endDate)
        ]);

        res.json({
            habits: habitStats,
            categories: categoryStats
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get comprehensive habit report using stored procedure
const getHabitReport = async (req, res) => {
    try {
        const { startDate, endDate, categoryId } = req.query;
        const userId = req.user.id;

        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const report = await generateHabitReport(
            userId,
            new Date(startDate),
            new Date(endDate),
            categoryId || null
        );

        res.json(report);
    } catch (error) {
        console.error('Error generating habit report:', error);
        res.status(500).json({ 
            error: 'Failed to generate habit report',
            details: error.message 
        });
    }
};

// Get consistency score for a habit
const getHabitConsistency = async (req, res) => {
    try {
        const { habitId } = req.params;
        const { startDate, endDate } = req.query;
        const userId = req.user.id;

        // Validate parameters
        if (!habitId || !startDate || !endDate) {
            return res.status(400).json({ error: 'Habit ID, start date, and end date are required' });
        }

        // Verify habit belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                id: habitId,
                userId: userId
            }
        });

        if (!habit) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        const score = await getConsistencyScore(
            habitId,
            new Date(startDate),
            new Date(endDate)
        );

        res.json({ habitId, consistencyScore: score });
    } catch (error) {
        console.error('Error calculating consistency score:', error);
        res.status(500).json({ error: 'Failed to calculate consistency score' });
    }
};

module.exports = {
    getStats,
    getHabitReport,
    getHabitConsistency
}; 
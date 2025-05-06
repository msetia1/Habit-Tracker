const prisma = require('../lib/prisma');
const { updateStreak, pool } = require('../lib/db');

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

// Log a habit completion
const logCompletion = async (req, res) => {
    const client = await pool.connect();
    
    try {
        // Start a transaction
        await client.query('BEGIN');
        
        const { date, count } = req.body;
        const habitId = req.params.id;
        const userId = req.user.id;

        // First verify the habit belongs to the user
        const habitResult = await client.query(
            'SELECT * FROM habits WHERE habit_id = $1 AND user_id = $2',
            [habitId, userId]
        );

        if (habitResult.rows.length === 0) {
            // Rollback the transaction since the habit doesn't exist
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Parse the date string to ensure it's a proper date object
        const parsedDate = new Date(date);
        
        // Format date as YYYY-MM-DD to ensure consistency
        const formattedDate = parsedDate.toISOString().split('T')[0];
        
        // Create the habit log with the properly formatted date
        await client.query(
            'INSERT INTO habit_logs (log_id, habit_id, date, completed_count) VALUES (gen_random_uuid(), $1, $2, $3)',
            [habitId, formattedDate, count]
        );

        // Calculate and update streak
        // Get all logs for the habit, ordered by date
        const logsResult = await client.query(
            'SELECT date FROM habit_logs WHERE habit_id = $1 ORDER BY date',
            [habitId]
        );
        
        if (logsResult.rows.length > 0) {
            // Create a lookup of dates with logs
            const logs = new Set();
            let lastDate = null;
            
            logsResult.rows.forEach(row => {
                const date = new Date(row.date);
                const dateStr = date.toISOString().split('T')[0];
                logs.add(dateStr);
                if (!lastDate || date > lastDate) {
                    lastDate = date;
                }
            });
            
            // Calculate current streak
            let currentStreak = 0;
            let currentDate = new Date(lastDate);
            
            while (true) {
                const dateStr = currentDate.toISOString().split('T')[0];
                if (!logs.has(dateStr)) {
                    break;
                }
                
                currentStreak++;
                
                // Move to previous day
                currentDate.setDate(currentDate.getDate() - 1);
            }
            
            // Get existing streak record if any
            const streakResult = await client.query(
                'SELECT * FROM streaks WHERE habit_id = $1',
                [habitId]
            );
            
            const existingLongestStreak = streakResult.rows.length > 0 
                ? streakResult.rows[0].longest_streak 
                : 0;
                
            const longestStreak = Math.max(currentStreak, existingLongestStreak);
            
            // Insert or update streak record
            if (streakResult.rows.length === 0) {
                // Generate a random UUID string
                const uuidResult = await client.query('SELECT gen_random_uuid() AS uuid');
                const streakId = uuidResult.rows[0].uuid;
                
                await client.query(
                    'INSERT INTO streaks (streak_id, habit_id, current_streak, longest_streak, last_logged_date, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
                    [streakId, habitId, currentStreak, longestStreak, lastDate]
                );
            } else {
                await client.query(
                    'UPDATE streaks SET current_streak = $1, longest_streak = $2, last_logged_date = $3, updated_at = CURRENT_TIMESTAMP WHERE habit_id = $4',
                    [currentStreak, longestStreak, lastDate, habitId]
                );
            }
        }
        
        // Commit the transaction
        await client.query('COMMIT');
        
        // Fetch the created log to return in the response
        const logResult = await client.query(
            'SELECT * FROM habit_logs WHERE habit_id = $1 ORDER BY created_at DESC LIMIT 1',
            [habitId]
        );
        
        res.status(201).json(logResult.rows[0]);
    } catch (error) {
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        console.error('Error in logCompletion:', error);
        res.status(400).json({ error: error.message });
    } finally {
        // Release the client back to the pool
        client.release();
    }
};

module.exports = {
    createHabit,
    getHabits,
    getHabit,
    updateHabit,
    deleteHabit,
    logCompletion
}; 
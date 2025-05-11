const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // required for Railway
    }
});

// Prepared statement for getting habit statistics
const getHabitStatsQuery = `
    SELECT 
        h.name,
        COUNT(hl.log_id) as total_logs,
        AVG(hl.completed_count) as avg_completion,
        MAX(s.current_streak) as current_streak,
        MAX(s.longest_streak) as longest_streak
    FROM habits h
    LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
    LEFT JOIN streaks s ON h.habit_id = s.habit_id
    WHERE h.user_id = $1
    AND ($2::date IS NULL OR hl.date >= $2)
    AND ($3::date IS NULL OR hl.date <= $3)
    GROUP BY h.habit_id, h.name
    ORDER BY total_logs DESC;
`;

// Prepared statement for getting completion rate by category
const getCategoryStatsQuery = `
    SELECT 
        c.name,
        COUNT(DISTINCT h.habit_id) as total_habits,
        COUNT(hl.log_id) as total_logs,
        AVG(hl.completed_count) as avg_completion
    FROM categories c
    LEFT JOIN habits h ON c.category_id = h.category_id
    LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
    WHERE c.user_id = $1
    AND ($2::date IS NULL OR hl.date >= $2)
    AND ($3::date IS NULL OR hl.date <= $3)
    GROUP BY c.category_id, c.name;
`;

// Function to get habit statistics
const getHabitStats = async (userId, startDate, endDate) => {
    const client = await pool.connect();
    try {
        const result = await client.query(getHabitStatsQuery, [userId, startDate, endDate]);
        return result.rows;
    } finally {
        client.release();
    }
};

// Function to get category statistics
const getCategoryStats = async (userId, startDate, endDate) => {
    const client = await pool.connect();
    try {
        const result = await client.query(getCategoryStatsQuery, [userId, startDate, endDate]);
        return result.rows;
    } finally {
        client.release();
    }
};

// Function to calculate and update streak for a habit
const updateStreak = async (habitId) => {
    const client = await pool.connect();
    try {
        // Get all logs for the habit, ordered by date
        const logsResult = await client.query(
            'SELECT date FROM habit_logs WHERE habit_id = $1 ORDER BY date',
            [habitId]
        );
        
        if (logsResult.rows.length === 0) {
            return; // No logs to calculate streak
        }
        
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
        
        // Calculate current streak (consecutive days going backward from last log)
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
        
        return { currentStreak, longestStreak, lastLoggedDate: lastDate };
    } catch (error) {
        console.error('Error updating streak:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Function to recalculate all streaks for a user
const recalculateStreaks = async (userId) => {
    const client = await pool.connect();
    try {
        // Get all habits for the user
        const habitsResult = await client.query(
            'SELECT habit_id FROM habits WHERE user_id = $1',
            [userId]
        );
        
        // Update streak for each habit
        const promises = habitsResult.rows.map(habit => updateStreak(habit.habit_id));
        await Promise.all(promises);
    } catch (error) {
        console.error('Error recalculating streaks:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Function to generate a comprehensive habit report using direct SQL query
const generateHabitReport = async (userId, startDate, endDate, categoryId = null) => {
    // First recalculate streaks to ensure they're up to date
    await recalculateStreaks(userId);
    
    const client = await pool.connect();
    try {
        // Create a category filter condition
        const categoryFilter = categoryId ? ` AND h.category_id = '${categoryId}'` : '';
        
        // Make sure endDate includes the full day by setting it to end of day
        // This ensures logs created on the endDate are included
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        
        // Habits query
        const habitsQuery = `
            WITH habit_completions AS (
                SELECT 
                    h.habit_id,
                    COUNT(hl.log_id) AS completion_count,
                    COALESCE(SUM(hl.completed_count), 0) AS total_completions
                FROM habits h
                LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
                    AND hl.date BETWEEN $2 AND $3
                WHERE h.user_id = $1
                ${categoryFilter}
                GROUP BY h.habit_id
            )
            SELECT 
                h.habit_id,
                h.name AS habit_name,
                h.description,
                h.frequency,
                h.target_count,
                h.start_date,
                h.end_date,
                c.name AS category_name,
                c.color AS category_color,
                hc.completion_count,
                COALESCE(AVG(hl.completed_count), 0) AS avg_completion,
                hc.total_completions,
                COALESCE(s.current_streak, 0) AS current_streak,
                COALESCE(s.longest_streak, 0) AS longest_streak,
                -- Calculate completion rate (completed count / days in period * target_count)
                CASE 
                    WHEN h.frequency = 'daily' THEN 
                        COALESCE(hc.total_completions, 0)::float / 
                        (GREATEST(1, EXTRACT(DAY FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                                       GREATEST(h.start_date, $2)))) * h.target_count)
                    WHEN h.frequency = 'weekly' THEN 
                        COALESCE(hc.total_completions, 0)::float / 
                        (GREATEST(1, EXTRACT(DAY FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                                       GREATEST(h.start_date, $2))) / 7) * h.target_count)
                    ELSE 
                        COALESCE(hc.total_completions, 0)::float / 
                        (GREATEST(1, EXTRACT(MONTH FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                                        GREATEST(h.start_date, $2)))) * h.target_count)
                END AS completion_rate,
                -- Days since last completed
                CASE 
                    WHEN MAX(hl.date) IS NOT NULL THEN 
                        EXTRACT(DAY FROM AGE(CURRENT_DATE, MAX(hl.date)))
                    ELSE NULL
                END AS days_since_last_completion,
                -- Recent completion trend (last 7 days vs previous 7 days)
                (
                    SELECT COUNT(*) 
                    FROM habit_logs hl_recent 
                    WHERE hl_recent.habit_id = h.habit_id 
                    AND hl_recent.date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE
                ) - 
                (
                    SELECT COUNT(*) 
                    FROM habit_logs hl_previous 
                    WHERE hl_previous.habit_id = h.habit_id 
                    AND hl_previous.date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days'
                ) AS recent_trend
            FROM habits h
            LEFT JOIN categories c ON h.category_id = c.category_id
            LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
                AND hl.date BETWEEN $2 AND $3
            LEFT JOIN streaks s ON h.habit_id = s.habit_id
            LEFT JOIN habit_completions hc ON h.habit_id = hc.habit_id
            WHERE h.user_id = $1
            ${categoryFilter}
            GROUP BY h.habit_id, h.name, h.description, h.frequency, h.target_count, 
                h.start_date, h.end_date, c.name, c.color, s.current_streak, s.longest_streak, 
                hc.completion_count, hc.total_completions
            ORDER BY completion_rate DESC, h.name ASC
        `;

        // Summary query - fixed to avoid window functions within aggregate functions
        const summaryQuery = `
            WITH habit_stats AS (
                SELECT 
                    h.habit_id,
                    h.frequency,
                    h.target_count,
                    COUNT(hl.log_id) AS completion_count,
                    COALESCE(SUM(hl.completed_count), 0) AS total_completions,
                    EXTRACT(DAY FROM AGE(
                        LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)),
                        GREATEST(h.start_date, $2)
                    )) AS date_range,
                    s.current_streak,
                    s.longest_streak
                FROM habits h
                LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
                    AND hl.date BETWEEN $2 AND $3
                LEFT JOIN streaks s ON h.habit_id = s.habit_id
                WHERE h.user_id = $1
                ${categoryFilter}
                GROUP BY h.habit_id, h.frequency, h.target_count, h.start_date, h.end_date, s.current_streak, s.longest_streak
            ),
            category_stats AS (
                SELECT 
                    c.category_id,
                    c.name,
                    COUNT(DISTINCT hl.log_id) AS log_count
                FROM categories c
                JOIN habits h ON c.category_id = h.category_id
                LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
                    AND hl.date BETWEEN $2 AND $3
                WHERE c.user_id = $1
                ${categoryFilter}
                GROUP BY c.category_id, c.name
            ),
            active_habit_count AS (
                SELECT COUNT(DISTINCT h.habit_id) AS count
                FROM habits h
                JOIN habit_logs hl ON h.habit_id = hl.habit_id
                WHERE h.user_id = $1
                AND hl.date BETWEEN $2 AND $3
                ${categoryFilter ? 'AND ' + categoryFilter.substring(5) : ''}
            )
            SELECT 
                COUNT(DISTINCT h.habit_id) AS total_habits,
                (SELECT count FROM active_habit_count) AS active_habits,
                COALESCE(AVG(hs.current_streak), 0) AS avg_current_streak,
                COALESCE(MAX(hs.longest_streak), 0) AS max_streak,
                (
                    SELECT COALESCE(AVG(
                        CASE WHEN hs_daily.frequency = 'daily' THEN 
                            hs_daily.total_completions::float / 
                            (GREATEST(1, hs_daily.date_range) * hs_daily.target_count)
                        ELSE 0 END
                    ), 0)
                    FROM habit_stats hs_daily
                    WHERE hs_daily.frequency = 'daily'
                ) AS avg_daily_completion_rate,
                COUNT(DISTINCT c.category_id) AS total_categories,
                (
                    SELECT cs.name
                    FROM category_stats cs
                    ORDER BY cs.log_count DESC
                    LIMIT 1
                ) AS most_active_category
            FROM habits h
            LEFT JOIN categories c ON h.category_id = c.category_id
            LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
                AND hl.date BETWEEN $2 AND $3
            LEFT JOIN habit_stats hs ON h.habit_id = hs.habit_id
            WHERE h.user_id = $1
            ${categoryFilter}
        `;

        // Execute queries
        const habitResults = await client.query(habitsQuery, [userId, startDate, adjustedEndDate]);
        const summaryResults = await client.query(summaryQuery, [userId, startDate, adjustedEndDate]);
        
        // Return the combined results
        return {
            habits: habitResults.rows,
            summary: summaryResults.rows[0] || {}
        };
    } catch (error) {
        console.error('Error in generateHabitReport:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Function to calculate consistency score for a habit
const getConsistencyScore = async (habitId, startDate, endDate) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT calculate_consistency_score($1, $2, $3) AS consistency_score',
            [habitId, startDate, endDate]
        );
        return result.rows[0]?.consistency_score || 0;
    } finally {
        client.release();
    }
};

module.exports = {
    getHabitStats,
    getCategoryStats,
    generateHabitReport,
    getConsistencyScore,
    updateStreak,
    recalculateStreaks,
    pool
}; 
CREATE OR REPLACE FUNCTION calculate_habit_streak(
    p_habit_id UUID,
    p_date DATE
) RETURNS TABLE (
    current_streak INTEGER,
    longest_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH streak_data AS (
        SELECT 
            date,
            completed_count,
            LAG(completed_count) OVER (ORDER BY date) as prev_completed
        FROM habit_logs
        WHERE habit_id = p_habit_id
        AND date <= p_date
    )
    SELECT 
        COALESCE(SUM(CASE WHEN completed_count >= 1 THEN 1 ELSE 0 END), 0) as current_streak,
        COALESCE(MAX(streak_length), 0) as longest_streak
    FROM streak_data;
END;
$$ LANGUAGE plpgsql; 
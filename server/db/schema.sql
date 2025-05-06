-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habits table
CREATE TABLE habits (
    habit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    target_count INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    reminder_time TIME,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habit Logs table
CREATE TABLE habit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(habit_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed_count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Goals table
CREATE TABLE goals (
    goal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Streaks table
CREATE TABLE streaks (
    streak_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(habit_id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_logged_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(date);
CREATE INDEX idx_goals_user_id ON goals(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create stored procedure for calculating streaks
CREATE OR REPLACE PROCEDURE update_streak(habit_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    current_streak_count INTEGER;
    longest_streak_count INTEGER;
    last_log_date DATE;
BEGIN
    -- Get the last logged date
    SELECT date INTO last_log_date
    FROM habit_logs
    WHERE habit_id = $1
    ORDER BY date DESC
    LIMIT 1;

    -- Calculate current streak
    WITH RECURSIVE streak_dates AS (
        SELECT date, 1 as streak
        FROM habit_logs
        WHERE habit_id = $1
        AND date = last_log_date
        
        UNION ALL
        
        SELECT hl.date, sd.streak + 1
        FROM habit_logs hl
        JOIN streak_dates sd ON hl.date = sd.date - INTERVAL '1 day'
        WHERE hl.habit_id = $1
    )
    SELECT MAX(streak) INTO current_streak_count
    FROM streak_dates;

    -- Get longest streak
    SELECT longest_streak INTO longest_streak_count
    FROM streaks
    WHERE habit_id = $1;

    -- Update or insert streak
    INSERT INTO streaks (habit_id, current_streak, longest_streak, last_logged_date)
    VALUES ($1, current_streak_count, GREATEST(current_streak_count, longest_streak_count), last_log_date)
    ON CONFLICT (habit_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(streaks.longest_streak, EXCLUDED.current_streak),
        last_logged_date = EXCLUDED.last_logged_date,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Create procedure to generate comprehensive habit report
CREATE OR REPLACE PROCEDURE generate_habit_report(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_category_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_report_cursor REFCURSOR := 'report_cursor';
    v_category_filter TEXT;
BEGIN
    -- Prepare category filter
    IF p_category_id IS NOT NULL THEN
        v_category_filter := ' AND h.category_id = ''' || p_category_id || '''';
    ELSE
        v_category_filter := '';
    END IF;
    
    -- Open cursor for habit report
    OPEN v_report_cursor FOR EXECUTE
    'SELECT 
        h.habit_id,
        h.name AS habit_name,
        h.description,
        h.frequency,
        h.target_count,
        h.start_date,
        h.end_date,
        c.name AS category_name,
        c.color AS category_color,
        COUNT(hl.log_id) AS completion_count,
        COALESCE(AVG(hl.completed_count), 0) AS avg_completion,
        COALESCE(SUM(hl.completed_count), 0) AS total_completions,
        COALESCE(s.current_streak, 0) AS current_streak,
        COALESCE(s.longest_streak, 0) AS longest_streak,
        -- Calculate completion rate (completed count / days in period)
        CASE 
            WHEN h.frequency = ''daily'' THEN 
                COALESCE(COUNT(hl.log_id), 0)::float / 
                GREATEST(1, EXTRACT(DAY FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                               GREATEST(h.start_date, $2))))
            WHEN h.frequency = ''weekly'' THEN 
                COALESCE(COUNT(hl.log_id), 0)::float / 
                GREATEST(1, EXTRACT(DAY FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                               GREATEST(h.start_date, $2))) / 7)
            ELSE 
                COALESCE(COUNT(hl.log_id), 0)::float / 
                GREATEST(1, EXTRACT(MONTH FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                                GREATEST(h.start_date, $2))))
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
            AND hl_recent.date BETWEEN CURRENT_DATE - INTERVAL ''7 days'' AND CURRENT_DATE
        ) - 
        (
            SELECT COUNT(*) 
            FROM habit_logs hl_previous 
            WHERE hl_previous.habit_id = h.habit_id 
            AND hl_previous.date BETWEEN CURRENT_DATE - INTERVAL ''14 days'' AND CURRENT_DATE - INTERVAL ''7 days''
        ) AS recent_trend
    FROM habits h
    LEFT JOIN categories c ON h.category_id = c.category_id
    LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
        AND hl.date BETWEEN $2 AND $3
    LEFT JOIN streaks s ON h.habit_id = s.habit_id
    WHERE h.user_id = $1' 
    || v_category_filter || 
    ' GROUP BY h.habit_id, h.name, h.description, h.frequency, h.target_count, 
        h.start_date, h.end_date, c.name, c.color, s.current_streak, s.longest_streak
    ORDER BY completion_rate DESC, h.name ASC'
    USING p_user_id, p_start_date, p_end_date;
    
    -- Open cursor for summary statistics
    OPEN 'summary_cursor' FOR
    SELECT 
        COUNT(DISTINCT h.habit_id) AS total_habits,
        COUNT(DISTINCT CASE WHEN hl.log_id IS NOT NULL THEN h.habit_id END) AS active_habits,
        COALESCE(AVG(s.current_streak), 0) AS avg_current_streak,
        COALESCE(MAX(s.longest_streak), 0) AS max_streak,
        COALESCE(AVG(
            CASE WHEN h.frequency = 'daily' THEN 
                COALESCE(COUNT(hl.log_id) OVER (PARTITION BY h.habit_id), 0)::float / 
                GREATEST(1, EXTRACT(DAY FROM AGE(LEAST(CURRENT_DATE, COALESCE(h.end_date, CURRENT_DATE)), 
                            GREATEST(h.start_date, p_start_date))))
            ELSE 0 END
        ), 0) AS avg_daily_completion_rate,
        COUNT(DISTINCT c.category_id) AS total_categories,
        (
            SELECT c_inner.name
            FROM categories c_inner
            JOIN habits h_inner ON c_inner.category_id = h_inner.category_id
            JOIN habit_logs hl_inner ON h_inner.habit_id = hl_inner.habit_id AND hl_inner.date BETWEEN p_start_date AND p_end_date
            WHERE c_inner.user_id = p_user_id
            GROUP BY c_inner.category_id, c_inner.name
            ORDER BY COUNT(hl_inner.log_id) DESC
            LIMIT 1
        ) AS most_active_category
    FROM habits h
    LEFT JOIN categories c ON h.category_id = c.category_id
    LEFT JOIN habit_logs hl ON h.habit_id = hl.habit_id
        AND hl.date BETWEEN p_start_date AND p_end_date
    LEFT JOIN streaks s ON h.habit_id = s.habit_id
    WHERE h.user_id = p_user_id
    AND (p_category_id IS NULL OR h.category_id = p_category_id);
END;
$$;

-- Create function to calculate consistency score for a habit
CREATE OR REPLACE FUNCTION calculate_consistency_score(
    p_habit_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS FLOAT AS $$
DECLARE
    v_total_days INTEGER;
    v_completed_days INTEGER;
    v_habit_frequency TEXT;
    v_expected_completions INTEGER;
    v_actual_completions INTEGER;
    v_consistency_score FLOAT;
BEGIN
    -- Get habit frequency
    SELECT frequency INTO v_habit_frequency
    FROM habits
    WHERE habit_id = p_habit_id;
    
    -- Calculate total days in period
    v_total_days := EXTRACT(DAY FROM AGE(p_end_date, p_start_date)) + 1;
    
    -- Calculate expected completions based on frequency
    IF v_habit_frequency = 'daily' THEN
        v_expected_completions := v_total_days;
    ELSIF v_habit_frequency = 'weekly' THEN
        v_expected_completions := CEIL(v_total_days / 7.0);
    ELSIF v_habit_frequency = 'monthly' THEN
        v_expected_completions := CEIL(v_total_days / 30.0);
    ELSE
        v_expected_completions := v_total_days;
    END IF;
    
    -- Get actual completions
    SELECT COUNT(*) INTO v_completed_days
    FROM habit_logs
    WHERE habit_id = p_habit_id
    AND date BETWEEN p_start_date AND p_end_date;
    
    -- Calculate consistency score (0-100)
    IF v_expected_completions > 0 THEN
        v_consistency_score := (v_completed_days::FLOAT / v_expected_completions) * 100;
    ELSE
        v_consistency_score := 0;
    END IF;
    
    RETURN LEAST(100, v_consistency_score);
END;
$$ LANGUAGE plpgsql; 
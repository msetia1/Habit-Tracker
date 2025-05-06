# Stored Procedures Documentation

This document describes the stored procedures used in our habit tracker application.

## 1. update_streak

This procedure updates the streak information for a given habit.

### Parameters:
- `habit_id UUID`: The ID of the habit to update streak information for

### Functionality:
- Retrieves the last logged date for the habit
- Calculates the current streak by counting consecutive days with habit completions
- Retrieves the longest streak record
- Updates the streaks table with the current and longest streak information

### Used in:
- When a habit completion is logged
- For displaying streak information on the habit dashboard
- For streak-based reports and analytics

## 2. generate_habit_report

This procedure generates a comprehensive habit report for a user within a specified date range.

### Parameters:
- `p_user_id UUID`: The ID of the user
- `p_start_date DATE`: Start date for the report period
- `p_end_date DATE`: End date for the report period
- `p_category_id UUID DEFAULT NULL`: Optional category filter

### Functionality:
- Creates two cursors:
  1. `report_cursor`: Detailed information about each habit
  2. `summary_cursor`: Aggregated statistics across all habits

- For each habit, calculates:
  - Basic information (name, description, frequency, etc.)
  - Completion statistics (count, average, total)
  - Streak information (current and longest)
  - Completion rate based on habit frequency
  - Days since last completion
  - Recent completion trend (last 7 days vs previous 7 days)

- For the summary, calculates:
  - Total habits
  - Active habits (with completions in the period)
  - Average current streak
  - Maximum streak
  - Average daily completion rate
  - Total categories
  - Most active category

### Used in:
- Habit Report interface (Requirement 2)
- For generating comprehensive habit analytics
- For dashboard summary statistics

## 3. calculate_consistency_score

This function calculates a consistency score (0-100) for a habit within a given date range.

### Parameters:
- `p_habit_id UUID`: The ID of the habit
- `p_start_date DATE`: Start date for the calculation period
- `p_end_date DATE`: End date for the calculation period

### Returns:
- `FLOAT`: Consistency score from 0 to 100

### Functionality:
- Determines the habit's frequency
- Calculates the total days in the period
- Determines expected completions based on frequency (daily, weekly, monthly)
- Counts actual completions
- Calculates consistency score as (actual/expected) * 100
- Caps the score at 100

### Used in:
- Habit consistency reports
- For identifying habits that need attention
- For generating habit improvement recommendations

## Implementation

These stored procedures are defined in the following files:
- `server/db/schema.sql`: Contains the `update_streak` procedure
- `server/db/stored_procedures.sql`: Contains the `generate_habit_report` procedure and `calculate_consistency_score` function

They are called from the application using the functions defined in `server/src/lib/db.js`. 
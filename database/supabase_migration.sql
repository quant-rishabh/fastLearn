-- ========================================
-- SUPABASE DATABASE MIGRATION SCRIPT
-- AI-Powered Workout & Weight Loss Tracker
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USER PROFILE TABLE (Single row for you)
-- ========================================

CREATE TABLE user_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Physical Stats
    current_weight DECIMAL(5,2) NOT NULL DEFAULT 86.0, -- kg
    height INTEGER NOT NULL DEFAULT 174, -- cm
    age INTEGER NOT NULL DEFAULT 25,
    gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
    
    -- Goals
    target_weight DECIMAL(5,2) NOT NULL DEFAULT 68.0, -- kg
    weekly_weight_loss DECIMAL(3,2) NOT NULL DEFAULT 0.5, -- kg per week
    daily_calorie_target INTEGER, -- calculated by server logic
    daily_protein_target INTEGER, -- calculated by server logic
    
    -- Auto-calculated (by server logic, assumes sedentary)
    bmr INTEGER, -- Basal Metabolic Rate
    maintenance_calories INTEGER, -- BMR * 1.2 (sedentary)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Default profile will be inserted below with calculated values

-- ========================================
-- 2. ACTIVITIES TABLE (AI-Calculated Everything)
-- ========================================

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('food', 'exercise')),
    
    -- Raw Input + AI Result Combined
    description TEXT NOT NULL, -- e.g., '2 eggs scrambled (140 cal)' | 'bench press 3 sets heavy (250 cal)'
    
    -- AI Analysis Results
    category TEXT NOT NULL, -- 'protein' | 'carbs' | 'push' | 'pull' | 'legs' | 'cardio'
    calories INTEGER NOT NULL CHECK (calories > 0), -- always positive, type determines if expense/income
    protein_grams DECIMAL(5,2), -- for food entries, null for exercise
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- ========================================
-- 3. WEIGHT TRACKING TABLE (Minimal - only when you log weight)
-- ========================================

CREATE TABLE weight_logs (
    date DATE PRIMARY KEY,
    weight DECIMAL(5,2) NOT NULL, -- your recorded weight
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_weight_logs_date ON weight_logs(date);

-- ========================================
-- 4. CHAT MESSAGES TABLE (AI Chat History)
-- ========================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'workout', 'nutrition', 'progress')),
    ai_model TEXT DEFAULT 'gpt-3.5-turbo',
    tokens_used INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type);

-- ========================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update user_profile.updated_at
CREATE TRIGGER user_profile_update_timestamp
BEFORE UPDATE ON user_profile
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ========================================
-- DATA VALIDATION CONSTRAINTS
-- ========================================

-- Add validation constraints to prevent dirty data
ALTER TABLE user_profile ADD CONSTRAINT valid_weight_range CHECK (current_weight > 0 AND current_weight < 500);
ALTER TABLE user_profile ADD CONSTRAINT valid_target_weight CHECK (target_weight > 0 AND target_weight < 500);
ALTER TABLE user_profile ADD CONSTRAINT valid_height CHECK (height > 50 AND height < 300);
ALTER TABLE user_profile ADD CONSTRAINT valid_age CHECK (age > 0 AND age < 150);
ALTER TABLE user_profile ADD CONSTRAINT valid_weekly_loss CHECK (weekly_weight_loss > 0 AND weekly_weight_loss <= 2);

ALTER TABLE weight_logs ADD CONSTRAINT valid_logged_weight CHECK (weight > 0 AND weight < 500);

-- ========================================
-- 5. OPTIMIZED VIEWS (Instead of triggers - reduces DB calls)  
-- ========================================

-- Create a view that calculates daily totals on-the-fly
-- This eliminates the need for a separate daily_summary table and triggers
CREATE OR REPLACE VIEW daily_totals AS
SELECT 
    date,
    
    -- Calorie calculations (now simplified - no ABS() needed)
    COALESCE(SUM(CASE WHEN type = 'food' THEN calories ELSE 0 END), 0) as calories_consumed,
    COALESCE(SUM(CASE WHEN type = 'exercise' THEN calories ELSE 0 END), 0) as calories_burned_exercise,
    
    -- Net and remaining calculations (using user profile data)
    COALESCE(SUM(CASE WHEN type = 'food' THEN calories ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN type = 'exercise' THEN calories ELSE 0 END), 0) as net_calories,
    
    (SELECT daily_calorie_target FROM user_profile LIMIT 1) as calorie_target,
    
    (SELECT daily_calorie_target FROM user_profile LIMIT 1) + 
    COALESCE(SUM(CASE WHEN type = 'exercise' THEN calories ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'food' THEN calories ELSE 0 END), 0) as remaining_balance,
    
    -- Protein calculations
    COALESCE(SUM(CASE WHEN type = 'food' AND protein_grams IS NOT NULL THEN protein_grams ELSE 0 END), 0) as total_protein,
    (SELECT daily_protein_target FROM user_profile LIMIT 1) as protein_target,
    (SELECT daily_protein_target FROM user_profile LIMIT 1) - 
    COALESCE(SUM(CASE WHEN type = 'food' AND protein_grams IS NOT NULL THEN protein_grams ELSE 0 END), 0) as protein_deficit,
    
    COUNT(*) as total_activities,
    MAX(created_at) as last_activity_time
    
FROM activities 
GROUP BY date
ORDER BY date DESC;

-- ========================================
-- 6. OPTIMIZED FUNCTIONS (Minimize DB calls)
-- ========================================

-- Single function to get ALL today's data in one query
CREATE OR REPLACE FUNCTION get_today_complete_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_profile', (
            SELECT json_build_object(
                'current_weight', current_weight,
                'target_weight', target_weight,
                'height', height,
                'age', age,
                'bmr', bmr,
                'maintenance_calories', maintenance_calories,
                'daily_calorie_target', daily_calorie_target,
                'daily_protein_target', daily_protein_target,
                'weekly_weight_loss', weekly_weight_loss
            ) FROM user_profile LIMIT 1
        ),
        'today_totals', COALESCE((
            SELECT json_build_object(
                'calories_consumed', calories_consumed,
                'calories_burned_exercise', calories_burned_exercise,
                'net_calories', net_calories,
                'remaining_balance', remaining_balance,
                'total_protein', total_protein,
                'protein_deficit', protein_deficit
            ) FROM daily_totals WHERE date = CURRENT_DATE
        ), json_build_object(
            'calories_consumed', 0,
            'calories_burned_exercise', 0,
            'net_calories', 0,
            'remaining_balance', (SELECT daily_calorie_target FROM user_profile LIMIT 1),
            'total_protein', 0,
            'protein_deficit', (SELECT daily_protein_target FROM user_profile LIMIT 1)
        )),
        'today_activities', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'type', type,
                    'description', description,
                    'category', category,
                    'calories', calories,
                    'protein_grams', protein_grams,
                    'created_at', created_at
                ) ORDER BY created_at DESC
            ), '[]'::json)
            FROM activities 
            WHERE date = CURRENT_DATE
        ),
        'recent_weight', COALESCE((
            SELECT weight FROM weight_logs 
            WHERE date <= CURRENT_DATE 
            ORDER BY date DESC 
            LIMIT 1
        ), (SELECT current_weight FROM user_profile LIMIT 1))
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI context data efficiently
CREATE OR REPLACE FUNCTION get_ai_context_data(days_back INTEGER DEFAULT 7)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_profile', (
            SELECT json_build_object(
                'current_weight', current_weight,
                'height', height,
                'age', age,
                'gender', gender,
                'target_weight', target_weight,
                'weekly_weight_loss', weekly_weight_loss
            ) FROM user_profile LIMIT 1
        ),
        'recent_exercises', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'description', description,
                    'category', category,
                    'calories', calories,
                    'date', date
                ) ORDER BY created_at DESC
            ), '[]'::json)
            FROM activities 
            WHERE type = 'exercise' 
              AND date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
            LIMIT 20
        ),
        'exercise_categories', (
            SELECT json_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM activities 
                WHERE type = 'exercise' 
                  AND date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
                GROUP BY category
            ) t
        ),
        'recent_foods', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'description', description,
                    'category', category,
                    'calories', calories,
                    'protein_grams', protein_grams
                ) ORDER BY created_at DESC
            ), '[]'::json)
            FROM activities 
            WHERE type = 'food' 
              AND date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
            LIMIT 10
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Note: Calculation logic handled by backend
-- Database just stores the values calculated by your existing backend logic

-- ========================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ========================================

-- Insert placeholder user profile - backend will calculate and update real values
INSERT INTO user_profile (
    current_weight, height, age, gender, target_weight, weekly_weight_loss,
    bmr, maintenance_calories, daily_calorie_target, daily_protein_target
) VALUES (
    88.0, 174, 25, 'male', 68.0, 1.0,
    1843,  -- Your backend calculated BMR
    2211,  -- Your backend calculated maintenance
    1111,  -- Your backend calculated target (1kg/week loss)
    123    -- Your backend calculated protein target
);

-- Add some sample activities for testing (all calories positive now)
INSERT INTO activities (type, description, category, calories, protein_grams) VALUES
('food', '2 scrambled eggs (140 cal)', 'protein', 140, 24.0),
('food', '1 slice whole wheat bread (80 cal)', 'carbs', 80, 3.0),
('exercise', 'bench press 3 sets heavy (250 cal)', 'push', 250, NULL),
('exercise', 'running 5km moderate (350 cal)', 'cardio', 350, NULL);

-- ========================================
-- 8. OPTIMIZED QUERIES (Minimal DB calls)
-- ========================================

/*
-- 🚀 SINGLE QUERY - Get ALL today's data (replaces multiple queries)
SELECT get_today_complete_data();

-- 🚀 SINGLE QUERY - Get AI context data (for smart suggestions) 
SELECT get_ai_context_data(7); -- last 7 days

-- 🚀 SINGLE QUERY - Get daily totals view
SELECT * FROM daily_totals WHERE date = CURRENT_DATE;

-- 🚀 BATCH INSERT - Add activity (use this pattern in your API)
INSERT INTO activities (type, description, category, calories, protein_grams) 
VALUES ('food', 'chicken breast 200g (330 cal)', 'protein', 330, 62.0);

-- 🚀 BACKEND UPDATE - Your backend handles calculations and updates all fields
UPDATE user_profile SET 
    current_weight = 85.5,
    target_weight = 67.0,
    weekly_weight_loss = 1.0,
    bmr = 1820,              -- Backend calculated
    maintenance_calories = 2184,  -- Backend calculated  
    daily_calorie_target = 1084,  -- Backend calculated
    daily_protein_target = 119    -- Backend calculated
WHERE id = (SELECT id FROM user_profile LIMIT 1);

-- 🚀 EFFICIENT ANALYTICS - Last 7 days summary (1 query instead of 7)
SELECT 
    date,
    calories_consumed,
    calories_burned_exercise,
    remaining_balance,
    total_protein
FROM daily_totals 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- 🚀 LOG WEIGHT - Simple weight tracking
INSERT INTO weight_logs (date, weight) VALUES (CURRENT_DATE, 85.5)
ON CONFLICT (date) DO UPDATE SET weight = EXCLUDED.weight;
*/

-- ========================================
-- 9. ROW LEVEL SECURITY (Optional - for multi-user in future)
-- ========================================

-- Enable RLS (uncomment if needed for multi-user)
-- ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- MIGRATION COMPLETE! 
-- ========================================

COMMENT ON TABLE user_profile IS 'Single user profile with physical stats and goals';
COMMENT ON TABLE activities IS 'All food and exercise entries with AI-calculated data';  
COMMENT ON TABLE weight_logs IS 'Weight tracking entries by date';
COMMENT ON TABLE chat_messages IS 'AI chat conversation history';
COMMENT ON VIEW daily_totals IS 'Auto-calculated daily nutrition and calorie summaries';
-- Database Schema for Workout & Calorie Tracker
-- Run these SQL commands in your Supabase SQL editor

-- 1. Users table (basic user information)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  height INTEGER, -- cm
  age INTEGER,
  gender TEXT DEFAULT 'male', -- 'male' or 'female'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Stats table (tracks changing stats over time)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_weight DECIMAL(5,2), -- kg
  target_weight DECIMAL(5,2), -- kg
  weekly_weight_loss DECIMAL(3,2), -- kg per week
  bmr INTEGER, -- calculated BMR
  maintenance_calories INTEGER, -- calculated maintenance
  target_daily_calories INTEGER, -- calculated target
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Daily Tracking table (summary for each day)
CREATE TABLE IF NOT EXISTS daily_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  total_calories_in INTEGER DEFAULT 0, -- food calories consumed
  total_calories_out INTEGER DEFAULT 0, -- exercise calories burned
  net_calories INTEGER DEFAULT 0, -- calories_in - calories_out
  deficit_created INTEGER DEFAULT 0, -- actual deficit vs maintenance
  expected_weight_loss DECIMAL(4,3), -- kg expected to lose this day
  actual_weight DECIMAL(5,2), -- user's actual weight if recorded
  bmr_used INTEGER, -- BMR used for calculations this day
  maintenance_used INTEGER, -- maintenance calories used
  target_calories_used INTEGER, -- target calories used
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- one record per user per day
);

-- 4. Activities table (individual food and exercise entries)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  daily_tracking_id UUID REFERENCES daily_tracking(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('food', 'exercise')), -- 'food' or 'exercise'
  name TEXT NOT NULL, -- activity name
  details TEXT, -- detailed description
  calories INTEGER NOT NULL, -- positive for exercise, positive for food (we handle sign in logic)
  category TEXT, -- 'cardio', 'bodyweight', 'weights' for exercise
  parameters JSONB, -- store exercise parameters (reps, weight, distance, etc.)
  ai_calculated BOOLEAN DEFAULT FALSE, -- was this calculated by AI
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Chat Messages table (for chat feature)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT,
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'workout', 'nutrition', 'progress')),
  ai_model TEXT DEFAULT 'gpt-3.5-turbo',
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Weight History table (track weight changes over time)
CREATE TABLE IF NOT EXISTS weight_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL, -- kg
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- one weight entry per day
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON daily_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_activities_daily_tracking ON activities(daily_tracking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON weight_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_date ON user_stats(user_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
-- Note: You'll need to set up authentication first

-- For now, allow all operations (you can restrict later with auth)
CREATE POLICY "Allow all operations for now" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON user_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON daily_tracking FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON weight_history FOR ALL USING (true);

-- Functions for automatic calculations
CREATE OR REPLACE FUNCTION update_daily_tracking_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily tracking totals when activities change
  UPDATE daily_tracking 
  SET 
    total_calories_in = (
      SELECT COALESCE(SUM(calories), 0) 
      FROM activities 
      WHERE daily_tracking_id = NEW.daily_tracking_id AND type = 'food'
    ),
    total_calories_out = (
      SELECT COALESCE(SUM(calories), 0) 
      FROM activities 
      WHERE daily_tracking_id = NEW.daily_tracking_id AND type = 'exercise'
    ),
    updated_at = NOW()
  WHERE id = NEW.daily_tracking_id;
  
  -- Update net calories and deficit
  UPDATE daily_tracking 
  SET 
    net_calories = total_calories_in - total_calories_out,
    deficit_created = maintenance_used + total_calories_out - total_calories_in,
    expected_weight_loss = (maintenance_used + total_calories_out - total_calories_in) / 7700.0
  WHERE id = NEW.daily_tracking_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily tracking when activities change
CREATE TRIGGER update_daily_tracking_on_activity_change
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_tracking_totals();

-- Function to get or create daily tracking record
CREATE OR REPLACE FUNCTION get_or_create_daily_tracking(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_bmr INTEGER DEFAULT NULL,
  p_maintenance INTEGER DEFAULT NULL,
  p_target INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  tracking_id UUID;
BEGIN
  -- Try to find existing record
  SELECT id INTO tracking_id
  FROM daily_tracking
  WHERE user_id = p_user_id AND date = p_date;
  
  -- If not found, create new record
  IF tracking_id IS NULL THEN
    INSERT INTO daily_tracking (
      user_id, 
      date, 
      bmr_used, 
      maintenance_used, 
      target_calories_used
    )
    VALUES (
      p_user_id, 
      p_date, 
      p_bmr, 
      p_maintenance, 
      p_target
    )
    RETURNING id INTO tracking_id;
  END IF;
  
  RETURN tracking_id;
END;
$$ LANGUAGE plpgsql;
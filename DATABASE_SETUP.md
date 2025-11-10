# Database Integration Setup Instructions

## 1. Install Required Dependencies

You'll need to install the Supabase client and OpenAI SDK:

```bash
npm install @supabase/supabase-js openai
```

## 2. Set up Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (already exists)
OPENAI_API_KEY=your_openai_api_key
```

## 3. Database Setup

1. **Create a Supabase project** if you haven't already at https://supabase.com
2. **Run the SQL schema** in your Supabase SQL editor:
   - Copy the contents of `/database/schema.sql`
   - Paste and execute in Supabase Dashboard > SQL Editor
3. **Enable Row Level Security (RLS)** - the schema includes basic policies

## 4. Features Now Available

### 🗄️ Database Persistence
- All activities (food/exercise) are saved to database
- Daily tracking with automatic calculations
- User stats and progress history
- Weight tracking over time

### 📊 Analytics & Insights
- 7-day analytics dashboard
- Total deficit tracking
- Expected vs actual weight loss
- Exercise category breakdowns

### 🤖 AI Chat Coach
- Personalized fitness advice
- Context-aware responses based on your data
- Chat history persistence
- Multiple conversation types (workout, nutrition, progress)

### 📈 Advanced Queries Available
You can now query:
- Daily calorie in/out patterns
- Exercise frequency and effectiveness
- Weight loss progress trends
- Deficit consistency
- AI chat insights

## 5. How Data is Structured

### Tables Created:
- `users` - Basic user information
- `user_stats` - Weight, goals, BMR calculations over time
- `daily_tracking` - Daily summaries (calories in/out, deficits)
- `activities` - Individual food and exercise entries
- `chat_messages` - AI coach conversation history
- `weight_history` - Weight measurements over time

### Automatic Calculations:
- Daily totals are calculated automatically via triggers
- Deficits and expected weight loss computed in real-time
- BMR and maintenance calories tracked per day

## 6. Chat Features

### Available Message Types:
- **General** 💬 - General fitness questions
- **Workout** 💪 - Exercise advice and routines
- **Nutrition** 🍽️ - Food and diet guidance
- **Progress** 📊 - Analysis of your data and progress

### AI Context:
The AI coach has access to:
- Your current stats (weight, goals, BMR)
- Recent 7 days of activities
- Recent progress data
- Previous chat history

## 7. Usage

The app now automatically:
- ✅ Saves all data to database
- ✅ Loads your data on page refresh
- ✅ Provides analytics and insights
- ✅ Offers AI coaching chat
- ✅ Tracks progress over time

Click the 🤖 button to chat with your AI fitness coach!

## 8. Sample Queries

Once you have data, you can run queries like:

```sql
-- Get weekly progress
SELECT 
  DATE_TRUNC('week', date) as week,
  AVG(deficit_created) as avg_deficit,
  SUM(expected_weight_loss) as expected_loss
FROM daily_tracking 
WHERE user_id = 'your_user_id'
GROUP BY week
ORDER BY week;

-- Exercise effectiveness
SELECT 
  name,
  category,
  AVG(calories) as avg_calories,
  COUNT(*) as frequency
FROM activities 
WHERE type = 'exercise' AND user_id = 'your_user_id'
GROUP BY name, category
ORDER BY avg_calories DESC;
```

## 9. Backup & Export

All your data is safely stored in Supabase and can be exported via their dashboard or API calls.
// Test data generator for workout tracking
import { saveActivity, saveWeight, saveUserStats } from './workoutDatabase';

interface TestActivity {
  type: 'food' | 'exercise';
  name: string;
  details: string;
  calories: number;
  category?: string;
  parameters?: any;
  ai_calculated?: boolean;
}

// Sample food data with realistic portions
const sampleFoods: TestActivity[] = [
  { type: 'food', name: '2 eggs scrambled', details: 'AI calculated', calories: 140, ai_calculated: true },
  { type: 'food', name: '1 slice whole wheat toast', details: 'AI calculated', calories: 80, ai_calculated: true },
  { type: 'food', name: 'medium banana', details: 'AI calculated', calories: 89, ai_calculated: true },
  { type: 'food', name: '1 cup oatmeal with milk', details: 'AI calculated', calories: 220, ai_calculated: true },
  { type: 'food', name: 'grilled chicken breast 150g', details: 'AI calculated', calories: 248, ai_calculated: true },
  { type: 'food', name: '1 cup brown rice', details: 'AI calculated', calories: 216, ai_calculated: true },
  { type: 'food', name: 'mixed green salad', details: 'AI calculated', calories: 35, ai_calculated: true },
  { type: 'food', name: '1 medium apple', details: 'AI calculated', calories: 95, ai_calculated: true },
  { type: 'food', name: 'greek yogurt 200g', details: 'AI calculated', calories: 130, ai_calculated: true },
  { type: 'food', name: '30g almonds', details: 'AI calculated', calories: 173, ai_calculated: true },
  { type: 'food', name: 'protein shake', details: 'AI calculated', calories: 200, ai_calculated: true },
  { type: 'food', name: '2 slices pizza', details: 'AI calculated', calories: 560, ai_calculated: true },
  { type: 'food', name: 'pasta with tomato sauce', details: 'AI calculated', calories: 350, ai_calculated: true },
  { type: 'food', name: '1 cup white rice with dal', details: 'AI calculated', calories: 280, ai_calculated: true },
  { type: 'food', name: 'fish curry with roti', details: 'AI calculated', calories: 420, ai_calculated: true },
  { type: 'food', name: 'vegetable biryani 1 plate', details: 'AI calculated', calories: 380, ai_calculated: true },
  { type: 'food', name: 'masala chai', details: 'AI calculated', calories: 60, ai_calculated: true },
  { type: 'food', name: 'butter chicken with naan', details: 'AI calculated', calories: 650, ai_calculated: true },
  { type: 'food', name: '1 samosa', details: 'AI calculated', calories: 150, ai_calculated: true },
  { type: 'food', name: 'chocolate ice cream 1 scoop', details: 'AI calculated', calories: 180, ai_calculated: true }
];

// Sample exercise data
const sampleExercises: TestActivity[] = [
  { 
    type: 'exercise', 
    name: 'running', 
    details: '30 minutes, 5 km', 
    calories: 430, 
    category: 'cardio',
    parameters: { time: 30, distance: 5 }
  },
  { 
    type: 'exercise', 
    name: 'walking', 
    details: '7000 total steps', 
    calories: 241, 
    category: 'cardio',
    parameters: { steps: 7000 }
  },
  { 
    type: 'exercise', 
    name: 'skipping', 
    details: '15 minutes', 
    calories: 155, 
    category: 'cardio',
    parameters: { time: 15 }
  },
  { 
    type: 'exercise', 
    name: 'pushups', 
    details: '30 reps', 
    calories: 6, 
    category: 'bodyweight',
    parameters: { reps: 30 }
  },
  { 
    type: 'exercise', 
    name: 'squats', 
    details: '40 reps', 
    calories: 10, 
    category: 'bodyweight',
    parameters: { reps: 40 }
  },
  { 
    type: 'exercise', 
    name: 'crunches', 
    details: '50 reps', 
    calories: 9, 
    category: 'bodyweight',
    parameters: { reps: 50 }
  },
  { 
    type: 'exercise', 
    name: 'bench press', 
    details: '70 kg, 12 reps', 
    calories: 3, 
    category: 'weights',
    parameters: { weight: 70, reps: 12 }
  },
  { 
    type: 'exercise', 
    name: 'deadlifts', 
    details: '80 kg, 8 reps', 
    calories: 3, 
    category: 'weights',
    parameters: { weight: 80, reps: 8 }
  }
];

// Generate random activities for a day
const generateDayActivities = (date: Date): TestActivity[] => {
  const activities: TestActivity[] = [];
  
  // Morning activities (6-10 AM)
  const morningFoods = sampleFoods.filter(f => 
    ['eggs', 'toast', 'oatmeal', 'banana', 'chai'].some(keyword => 
      f.name.toLowerCase().includes(keyword)
    )
  );
  activities.push(morningFoods[Math.floor(Math.random() * morningFoods.length)]);
  activities.push(morningFoods[Math.floor(Math.random() * morningFoods.length)]);
  
  // Afternoon activities (12-2 PM)
  const lunchFoods = sampleFoods.filter(f => 
    ['chicken', 'rice', 'curry', 'biryani', 'pasta'].some(keyword => 
      f.name.toLowerCase().includes(keyword)
    )
  );
  activities.push(lunchFoods[Math.floor(Math.random() * lunchFoods.length)]);
  
  // Evening activities (5-7 PM)
  if (Math.random() > 0.3) { // 70% chance of exercise
    const exerciseOptions = sampleExercises.slice(0, 5); // More common exercises
    activities.push(exerciseOptions[Math.floor(Math.random() * exerciseOptions.length)]);
  }
  
  // Dinner activities (7-9 PM)
  const dinnerFoods = sampleFoods.filter(f => 
    ['fish', 'chicken', 'dal', 'roti', 'pizza', 'naan'].some(keyword => 
      f.name.toLowerCase().includes(keyword)
    )
  );
  activities.push(dinnerFoods[Math.floor(Math.random() * dinnerFoods.length)]);
  
  // Evening snacks (sometimes)
  if (Math.random() > 0.6) { // 40% chance of snacks
    const snacks = sampleFoods.filter(f => 
      ['ice cream', 'almonds', 'apple', 'yogurt', 'samosa'].some(keyword => 
        f.name.toLowerCase().includes(keyword)
      )
    );
    activities.push(snacks[Math.floor(Math.random() * snacks.length)]);
  }
  
  // Walking (most days)
  if (Math.random() > 0.2) { // 80% chance of walking
    const steps = 5000 + Math.floor(Math.random() * 5000); // 5000-10000 steps
    activities.push({
      type: 'exercise',
      name: 'walking',
      details: `${steps} total steps`,
      calories: Math.round(steps * 86 * 0.0004), // Using user weight 86kg
      category: 'cardio',
      parameters: { steps: steps }
    });
  }
  
  return activities;
};

// Generate test data for the last N days
export const generateTestData = async (days: number = 10) => {
  console.log(`🔄 Generating ${days} days of test data...`);
  
  const currentWeight = 86;
  const results = {
    totalActivities: 0,
    totalDays: days,
    daysGenerated: [] as string[],
    errors: [] as string[]
  };
  
  // Set realistic user stats first
  try {
    await saveUserStats(
      currentWeight, // current weight
      68, // target weight  
      174, // height
      25, // age
      0.5, // weekly weight loss
      1823, // bmr
      2187, // maintenance
      1637 // target daily calories
    );
    console.log('✅ User stats saved');
  } catch (error) {
    console.error('❌ Error saving user stats:', error);
    results.errors.push('Failed to save user stats');
  }
  
  // Generate weight entries (slight variations)
  const baseWeight = currentWeight;
  
  // Generate activities for each day
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    console.log(`📅 Generating data for ${dateString}...`);
    
    // Save weight for this day (slight random variation)
    const dailyWeight = baseWeight + (Math.random() - 0.5) * 2; // ±1kg variation
    try {
      // Create weight entry with proper past date
      const weightDate = new Date();
      weightDate.setDate(weightDate.getDate() - i);
      weightDate.setHours(7, 0, 0, 0); // Morning weight at 7 AM
      
      // Directly save to localStorage with proper date
      const weightHistory = JSON.parse(localStorage.getItem('workout_weight_history') || '[]');
      const weightEntry = {
        id: `${Date.now()}-weight-${i}`,
        weight: Math.round(dailyWeight * 10) / 10,
        notes: `Day ${days - i} weight`,
        date: weightDate.toISOString(),
        timestamp: weightDate.toISOString()
      };
      
      weightHistory.unshift(weightEntry);
      localStorage.setItem('workout_weight_history', JSON.stringify(weightHistory));
      
      console.log(`⚖️ Saved weight: ${weightEntry.weight}kg for ${weightDate.toDateString()}`);
    } catch (error) {
      console.error(`❌ Error saving weight for ${dateString}:`, error);
      results.errors.push(`Failed to save weight for ${dateString}`);
    }
    
    // Generate activities for this day
    const dayActivities = generateDayActivities(date);
    
    // Create activities with realistic times throughout the day
    for (let j = 0; j < dayActivities.length; j++) {
      const activity = dayActivities[j];
      try {
        // Create realistic times for different activity types
        let hour = 8; // Default morning
        
        if (activity.name.includes('eggs') || activity.name.includes('oatmeal') || activity.name.includes('toast')) {
          hour = 7 + Math.floor(Math.random() * 2); // 7-8 AM (breakfast)
        } else if (activity.name.includes('chicken') || activity.name.includes('rice') || activity.name.includes('curry') || activity.name.includes('pasta')) {
          hour = 12 + Math.floor(Math.random() * 3); // 12-2 PM (lunch)
        } else if (activity.name.includes('fish') || activity.name.includes('dal') || activity.name.includes('pizza') || activity.name.includes('naan')) {
          hour = 19 + Math.floor(Math.random() * 2); // 7-8 PM (dinner)
        } else if (activity.type === 'exercise' && (activity.name.includes('running') || activity.name.includes('gym'))) {
          hour = 6 + Math.floor(Math.random() * 2); // 6-7 AM (morning workout)
        } else if (activity.type === 'exercise' && activity.name.includes('walking')) {
          hour = 18 + Math.floor(Math.random() * 3); // 6-8 PM (evening walk)
        } else {
          hour = 9 + Math.floor(Math.random() * 12); // Random time for other activities
        }
        
        const minute = Math.floor(Math.random() * 60);
        
        // Create the specific date for this day (i days ago)
        const activityDate = new Date();
        activityDate.setDate(activityDate.getDate() - i); // Go back i days
        activityDate.setHours(hour, minute, 0, 0);
        
        console.log(`📅 Creating activity for ${activityDate.toISOString()}: ${activity.name}`);
        
        // Save activity with proper past timestamp
        const activityWithTimestamp = {
          ...activity,
          timestamp: activityDate.toISOString(), // Store as ISO string
          id: `${Date.now()}-${j}-${i}` // Unique ID
        };
        
        // Directly save to localStorage to bypass any timestamp issues
        const activities = JSON.parse(localStorage.getItem('workout_activities') || '[]');
        activities.push(activityWithTimestamp);
        localStorage.setItem('workout_activities', JSON.stringify(activities));
        
        results.totalActivities++;
        console.log(`✅ Saved activity: ${activity.name} at ${activityDate.toLocaleString()}`);
        
      } catch (error) {
        console.error(`❌ Error saving activity for ${dateString}:`, error);
        results.errors.push(`Failed to save activity for ${dateString}`);
      }
    }
    
    results.daysGenerated.push(dateString);
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('✅ Test data generation complete!');
  console.log(`📊 Generated ${results.totalActivities} activities across ${results.totalDays} days`);
  
  if (results.errors.length > 0) {
    console.log('⚠️ Errors encountered:', results.errors);
  }
  
  return results;
};

// Quick test for today only
export const generateTodayTestData = async () => {
  console.log('🔄 Generating test data for today...');
  
  const todayActivities = generateDayActivities(new Date());
  
  for (const activity of todayActivities) {
    try {
      await saveActivity(
        activity,
        1823, // bmr
        2187, // maintenance
        1637  // target calories
      );
      console.log(`✅ Added: ${activity.name} (${activity.calories} cal)`);
    } catch (error) {
      console.error(`❌ Error adding ${activity.name}:`, error);
    }
  }
  
  console.log(`✅ Generated ${todayActivities.length} activities for today`);
  return todayActivities;
};

// Clear all test data
export const clearAllTestData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('workout_activities');
    localStorage.removeItem('workout_user_stats'); 
    localStorage.removeItem('workout_weight_history');
    localStorage.removeItem('workout_chat_history');
    console.log('🗑️ All test data cleared from local storage');
  }
};

// Export for global access in browser console
if (typeof window !== 'undefined') {
  (window as any).workoutTestData = {
    generateTestData,
    generateTodayTestData,
    clearAllTestData
  };
}
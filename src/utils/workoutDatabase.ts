// Database utilities for workout tracking

// Check if database is configured
const isDatabaseConfigured = () => {
  return !!(
    typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Local storage fallback for when database is not configured
const getStorageKeys = (userId?: string) => {
  const user = userId || getUserId();
  return {
    ACTIVITIES: `workout_activities_${user}`,
    USER_STATS: `workout_user_stats_${user}`,
    WEIGHT_HISTORY: `workout_weight_history_${user}`,
    CHAT_HISTORY: `workout_chat_history_${user}`
  };
};

export interface Activity {
  id?: string;
  type: 'food' | 'exercise';
  name?: string; // Legacy field - may not be present
  details?: string; // Legacy field - may not be present
  description?: string; // New field from API
  calories: number;
  category?: string;
  parameters?: any;
  ai_calculated?: boolean;
  timestamp?: Date;
  created_at?: string; // Database timestamp field
  protein_grams?: number; // For food items
}

export interface DailyTracking {
  id?: string;
  user_id: string;
  date: string;
  total_calories_in: number;
  total_calories_out: number;
  net_calories: number;
  deficit_created: number;
  expected_weight_loss: number;
  actual_weight?: number;
  bmr_used: number;
  maintenance_used: number;
  target_calories_used: number;
  notes?: string;
}

export interface UserStats {
  id?: string;
  user_id: string;
  current_weight: number;
  target_weight: number;
  weekly_weight_loss: number;
  bmr: number;
  maintenance_calories: number;
  target_daily_calories: number;
  date: string;
}

// Generate a temporary user ID (in a real app, you'd use proper authentication)
export const getUserId = () => {
  // Get user ID from auth system or fallback to default
  try {
    const currentUser = typeof window !== 'undefined' ? localStorage.getItem('workout_current_user') : null;
    if (currentUser) {
      const user = JSON.parse(currentUser);
      return user.username || 'user_default';
    }
  } catch (error) {
    console.warn('Error getting user from auth:', error);
  }
  return 'user_default';
};

// Local storage helpers
const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const getFromLocalStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

// Save activity to database or local storage
export const saveActivity = async (
  activity: Activity,
  bmr: number,
  maintenance: number,
  targetCalories: number
) => {
  const userId = getUserId();
  
  // If database is not configured, use local storage
  if (!isDatabaseConfigured()) {
    const newActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    const STORAGE_KEYS = getStorageKeys(userId);
    const existingActivities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const updatedActivities = [...existingActivities, newActivity];
    saveToLocalStorage(STORAGE_KEYS.ACTIVITIES, updatedActivities);
    
    return {
      success: true,
      activity: newActivity,
      message: 'Activity saved locally (database not configured)'
    };
  }
  
  try {
    const response = await fetch('/api/workout/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: activity.type,
        name: activity.name,
        details: activity.details,
        calories: activity.calories,
        category: activity.category,
        parameters: activity.parameters,
        aiCalculated: activity.ai_calculated || false,
        bmr,
        maintenance,
        targetCalories
      }),
    });

    if (!response.ok) {
      throw new Error('Database save failed, falling back to local storage');
    }

    return await response.json();
  } catch (error) {
    console.warn('Database unavailable, using local storage:', error);
    
    // Fallback to local storage
    const STORAGE_KEYS = getStorageKeys(userId);
    const newActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    const existingActivities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const updatedActivities = [...existingActivities, newActivity];
    saveToLocalStorage(STORAGE_KEYS.ACTIVITIES, updatedActivities);
    
    return {
      success: true,
      activity: newActivity,
      message: 'Activity saved locally (database unavailable)'
    };
  }
};

// Get today's activities and tracking
export const getTodayActivities = async (date?: string) => {
  const userId = getUserId();
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // If database is not configured, use local storage
  if (!isDatabaseConfigured()) {
    const STORAGE_KEYS = getStorageKeys(userId);
    const activities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const todayActivities = activities.filter((activity: Activity) => {
      if (!activity.timestamp) return false;
      try {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        return activityDate === targetDate;
      } catch (error) {
        console.warn('Invalid timestamp in activity:', activity.timestamp);
        return false;
      }
    });
    
    return {
      success: true,
      activities: todayActivities,
      dailyTracking: null,
      message: 'Data loaded from local storage'
    };
  }
  
  try {
    const response = await fetch(`/api/workout/activities?userId=${userId}&date=${targetDate}`);
    
    if (!response.ok) {
      throw new Error('Database fetch failed, using local storage');
    }

    return await response.json();
  } catch (error) {
    console.warn('Database unavailable, using local storage:', error);
    
    // Fallback to local storage
    const STORAGE_KEYS = getStorageKeys(userId);
    const activities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const todayActivities = activities.filter((activity: Activity) => {
      if (!activity.timestamp) return false;
      const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
      return activityDate === targetDate;
    });
    
    return {
      success: true,
      activities: todayActivities,
      dailyTracking: null,
      message: 'Data loaded from local storage (database unavailable)'
    };
  }
};

// Delete activity
export const deleteActivity = async (activityId: string) => {
  const userId = getUserId();
  // If database is not configured, use local storage
  if (!isDatabaseConfigured()) {
    const STORAGE_KEYS = getStorageKeys(userId);
    const activities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const updatedActivities = activities.filter((activity: Activity) => activity.id !== activityId);
    saveToLocalStorage(STORAGE_KEYS.ACTIVITIES, updatedActivities);
    
    return {
      success: true,
      message: 'Activity deleted locally'
    };
  }
  
  try {
    const response = await fetch(`/api/workout/activities?activityId=${activityId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Database delete failed, using local storage');
    }

    return await response.json();
  } catch (error) {
    console.warn('Database unavailable, using local storage:', error);
    
    // Fallback to local storage
    const STORAGE_KEYS = getStorageKeys(userId);
    const activities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
    const updatedActivities = activities.filter((activity: Activity) => activity.id !== activityId);
    saveToLocalStorage(STORAGE_KEYS.ACTIVITIES, updatedActivities);
    
    return {
      success: true,
      message: 'Activity deleted locally (database unavailable)'
    };
  }
};

// Save user stats
export const saveUserStats = async (
  currentWeight: number,
  targetWeight: number, 
  height: number,
  age: number,
  weeklyWeightLoss: number,
  bmr: number,
  maintenanceCalories: number,
  targetDailyCalories: number
) => {
  const userId = getUserId();
  
  // Always use local storage for now (database migration not complete)
  if (true) {
    const STORAGE_KEYS = getStorageKeys(userId);
    const userStats = {
      currentWeight,
      targetWeight,
      height,
      age,
      weeklyWeightLoss,
      bmr,
      maintenanceCalories,
      targetDailyCalories,
      timestamp: new Date().toISOString()
    };
    
    saveToLocalStorage(STORAGE_KEYS.USER_STATS, userStats);
    
    return {
      success: true,
      userStats: userStats,
      message: 'User stats saved locally'
    };
  }
};

// Get user stats
export const getUserStats = async () => {
  const userId = getUserId();
  
  // Always use local storage for now (database migration not complete)
  if (true) {
    const STORAGE_KEYS = getStorageKeys(userId);
    const userStats = getFromLocalStorage(STORAGE_KEYS.USER_STATS);
    return {
      success: true,
      userStats: userStats,
      message: 'User stats loaded from local storage'
    };
  }
  
  try {
    const response = await fetch(`/api/workout/user-stats`);
    
    if (!response.ok) {
      throw new Error('Database fetch failed, using local storage');
    }

    return await response.json();
  } catch (error) {
    console.warn('Database unavailable, using local storage:', error);
    
    // Fallback to local storage
    const STORAGE_KEYS = getStorageKeys(userId);
    const userStats = getFromLocalStorage(STORAGE_KEYS.USER_STATS);
    return {
      success: true,
      userStats: userStats,
      message: 'User stats loaded from local storage (database unavailable)'
    };
  }
};

// Save weight entry
export const saveWeight = async (weight: number, notes?: string) => {
  const userId = getUserId();
  
  // Always use local storage for now since we don't have the weight API endpoint
  const STORAGE_KEYS = getStorageKeys(userId);
  const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
  const weightEntry = {
    id: Date.now().toString(),
    weight,
    notes,
    date: new Date().toISOString(),
    timestamp: new Date()
  };
  
  weightHistory.unshift(weightEntry); // Add to beginning
  
  // Keep only last 100 entries
  if (weightHistory.length > 100) {
    weightHistory.splice(100);
  }
  
  saveToLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY, weightHistory);
  
  return {
    success: true,
    weightEntry,
    message: 'Weight saved to local storage'
  };
  
  // TODO: Implement API endpoint later
  /*
  // If database is not configured, save to local storage
  if (!isDatabaseConfigured()) {
    const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
    const weightEntry = {
      id: Date.now().toString(),
      weight,
      notes,
      date: new Date().toISOString(),
      timestamp: new Date()
    };
    
    weightHistory.unshift(weightEntry); // Add to beginning
    
    // Keep only last 100 entries
    if (weightHistory.length > 100) {
      weightHistory.splice(100);
    }
    
    saveToLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY, weightHistory);
    
    return {
      success: true,
      weightEntry,
      message: 'Weight saved to local storage (database unavailable)'
    };
  }
  
  try {
    const response = await fetch('/api/workout/weight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        weight,
        notes
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save weight');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving weight:', error);
    
    // Fallback to local storage on error
    const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
    const weightEntry = {
      id: Date.now().toString(),
      weight,
      notes,
      date: new Date().toISOString(),
      timestamp: new Date()
    };
    
    weightHistory.unshift(weightEntry);
    if (weightHistory.length > 100) {
      weightHistory.splice(100);
    }
    
    saveToLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY, weightHistory);
    
    return {
      success: true,
      weightEntry,
      message: 'Weight saved to local storage (database error)',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  */
};

// Get weight history
export const getWeightHistory = async (limit = 50) => {
  const userId = getUserId();
  
  // Always use local storage for now since we don't have the weight API endpoint
  const STORAGE_KEYS = getStorageKeys(userId);
  const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
  return weightHistory.slice(0, limit);
  
  // TODO: Implement API endpoint later
  /*
  if (!isDatabaseConfigured()) {
    const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
    return weightHistory.slice(0, limit);
  }
  
  try {
    const response = await fetch(`/api/workout/weight?userId=${userId}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch weight history');
    }

    const data = await response.json();
    return data.weights || [];
  } catch (error) {
    console.error('Error fetching weight history:', error);
    
    // Fallback to local storage on error
    const weightHistory = getFromLocalStorage(STORAGE_KEYS.WEIGHT_HISTORY) || [];
    return weightHistory.slice(0, limit);
  }
  */
};

// Get analytics data
export const getAnalytics = async (days = 7) => {
  const userId = getUserId();
  
  // Always use local storage for now
  const STORAGE_KEYS = getStorageKeys(userId);
  const activities = getFromLocalStorage(STORAGE_KEYS.ACTIVITIES) || [];
  const userStats = getFromLocalStorage(STORAGE_KEYS.USER_STATS);
  
  console.log('🔍 Analytics Debug:', {
    totalActivities: activities.length,
    userStats,
    days
  });
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const recentActivities = activities.filter((activity: Activity) => {
    if (!activity.timestamp) return false;
    try {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= new Date();
    } catch (error) {
      console.warn('Invalid timestamp:', activity.timestamp);
      return false;
    }
  });
  
  console.log('📊 Recent activities:', {
    total: recentActivities.length,
    startDate: startDate.toISOString(),
    sample: recentActivities.slice(0, 3)
  });
  
  // Calculate analytics
  const foodActivities = recentActivities.filter((a: Activity) => a.type === 'food');
  const exerciseActivities = recentActivities.filter((a: Activity) => a.type === 'exercise');
  
  const caloriesIn = foodActivities.reduce((sum: number, a: Activity) => sum + (a.calories || 0), 0);
  const caloriesOut = exerciseActivities.reduce((sum: number, a: Activity) => sum + (a.calories || 0), 0);
  
  // Add BMR to calories out (basic metabolism)
  const bmr = userStats?.bmr || 1800; // Default BMR if not set
  const totalCaloriesOut = caloriesOut + (bmr * days);
  
  // Calculate deficit (calories out - calories in = deficit)
  const deficit = totalCaloriesOut - caloriesIn;
  const weeklyAverage = Math.round(deficit / days);
  const predictedWeightLoss = Math.round((deficit / 7700) * 100) / 100; // 1kg = ~7700 calories
  
  const analytics = {
    caloriesIn: Math.round(caloriesIn),
    caloriesOut: Math.round(totalCaloriesOut),
    deficit: Math.round(deficit),
    weeklyAverage,
    predictedWeightLoss,
    totalDays: days,
    foodCount: foodActivities.length,
    exerciseCount: exerciseActivities.length,
    exerciseCaloriesBurned: Math.round(caloriesOut)
  };
  
  console.log('📈 Analytics Result:', analytics);
  
  return analytics;
};

// Send chat message
export const sendChatMessage = async (message: string, messageType = 'general') => {
  const userId = getUserId();
  
  // Always use local storage for now (database migration not complete)
  if (true) {
    const STORAGE_KEYS = getStorageKeys(userId);
    const basicResponses = {
      general: "I'm here to help with your fitness journey! However, the full AI chat feature requires database setup. For now, I can tell you that consistency is key - keep tracking your food and exercise!",
      workout: "Great question about workouts! Remember: compound exercises like squats, deadlifts, and push-ups burn more calories. Aim for 30-45 minutes of exercise most days.",
      nutrition: "For nutrition advice: focus on whole foods, stay hydrated, and track your calories accurately. A moderate calorie deficit (300-500 cal/day) is sustainable for weight loss.",
      progress: "Progress tracking is excellent! Keep logging your activities daily. Even small deficits add up over time. 1kg of fat = 7,700 calories, so patience is key!"
    };
    
    const response = basicResponses[messageType as keyof typeof basicResponses] || basicResponses.general;
    
    // Save to local storage
    const chatMessage = {
      id: Date.now().toString(),
      message: message,
      response: response,
      message_type: messageType,
      created_at: new Date().toISOString()
    };
    
    const chatHistory = getFromLocalStorage(STORAGE_KEYS.CHAT_HISTORY) || [];
    saveToLocalStorage(STORAGE_KEYS.CHAT_HISTORY, [...chatHistory, chatMessage]);
    
    return {
      success: true,
      message: response,
      chatId: chatMessage.id,
      tokensUsed: 0
    };
  }
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        message,
        messageType
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send chat message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    
    // Fallback to basic response
    const STORAGE_KEYS = getStorageKeys(userId);
    const basicResponse = "I'm sorry, I can't connect to the AI service right now. But here's a quick tip: stay consistent with your calorie tracking and aim for gradual, sustainable changes!";
    
    const chatMessage = {
      id: Date.now().toString(),
      message: message,
      response: basicResponse,
      message_type: messageType,
      created_at: new Date().toISOString()
    };
    
    const chatHistory = getFromLocalStorage(STORAGE_KEYS.CHAT_HISTORY) || [];
    saveToLocalStorage(STORAGE_KEYS.CHAT_HISTORY, [...chatHistory, chatMessage]);
    
    return {
      success: true,
      message: basicResponse,
      chatId: chatMessage.id,
      tokensUsed: 0
    };
  }
};

// Get chat history
export const getChatHistory = async (limit = 20) => {
  const userId = getUserId();
  
  // Always use local storage for now (database migration not complete)
  const STORAGE_KEYS = getStorageKeys(userId);
  const chatHistory = getFromLocalStorage(STORAGE_KEYS.CHAT_HISTORY) || [];
  return {
    success: true,
    chatHistory: chatHistory.slice(-limit), // Get last N messages
    message: 'Chat history loaded from local storage'
  };
};
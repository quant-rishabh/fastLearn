import { STORAGE_KEYS, storage } from './storageKeys';

// Types for workout system
export interface Activity {
  id: string;
  name: string;
  duration: number; // in minutes
  calories: number;
  type: 'cardio' | 'strength' | 'flexibility' | 'sports';
  date: Date;
  completed: boolean;
}

export interface UserStats {
  weight: number[];
  weightDates: Date[];
  currentWeight: number;
  targetWeight: number;
  height: number; // in cm
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface WorkoutAnalytics {
  totalWorkouts: number;
  totalDuration: number; // in minutes
  avgDuration: number;
  caloriesBurned: number;
  lastWorkout: Date | null;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  streakDays: number;
}

// Get today's activities
export function getTodayActivities(): Activity[] {
  try {
    const activities = storage.get(STORAGE_KEYS.ACTIVITIES) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return activities.filter((activity: Activity) => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
  } catch (error) {
    console.error('Error getting today activities:', error);
    return [];
  }
}

// Load today's data
export async function loadTodayData(): Promise<Activity[]> {
  try {
    return getTodayActivities();
  } catch (error) {
    console.error('Error loading today data:', error);
    return [];
  }
}

// Get user stats
export function getUserStats(): UserStats {
  try {
    const defaultStats: UserStats = {
      weight: [],
      weightDates: [],
      currentWeight: 0,
      targetWeight: 0,
      height: 170,
      age: 25,
      gender: 'other',
      activityLevel: 'moderate'
    };
    
    return storage.get(STORAGE_KEYS.USER_STATS) || defaultStats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      weight: [],
      weightDates: [],
      currentWeight: 0,
      targetWeight: 0,
      height: 170,
      age: 25,
      gender: 'other',
      activityLevel: 'moderate'
    };
  }
}

// Load user stats (async version for compatibility)
export async function loadUserStats(): Promise<UserStats> {
  try {
    return getUserStats();
  } catch (error) {
    console.error('Error loading user stats:', error);
    return {
      weight: [],
      weightDates: [],
      currentWeight: 0,
      targetWeight: 0,
      height: 170,
      age: 25,
      gender: 'other',
      activityLevel: 'moderate'
    };
  }
}

// Save user stats
export function saveUserStats(stats: UserStats): boolean {
  try {
    return storage.set(STORAGE_KEYS.USER_STATS, stats);
  } catch (error) {
    console.error('Error saving user stats:', error);
    return false;
  }
}

// Get analytics
export function getAnalytics(): WorkoutAnalytics {
  try {
    // Check if we have cached analytics
    const cachedAnalytics = storage.get(STORAGE_KEYS.USER_ANALYTICS);
    if (cachedAnalytics && isSameDay(new Date(cachedAnalytics.lastCalculated || 0), new Date())) {
      return cachedAnalytics;
    }
    
    // Calculate fresh analytics
    const activities = storage.get(STORAGE_KEYS.ACTIVITIES) || [];
    const workoutHistory = storage.get(STORAGE_KEYS.WORKOUT_HISTORY) || [];
    
    // Combine activities and workout history for comprehensive analytics
    const allWorkouts = [
      ...activities.filter((a: Activity) => a.completed),
      ...workoutHistory
    ];
    
    const totalWorkouts = allWorkouts.length;
    const totalDuration = allWorkouts.reduce((sum: number, workout: any) => sum + (workout.duration || 0), 0);
    const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
    const caloriesBurned = allWorkouts.reduce((sum: number, workout: any) => sum + (workout.calories || 0), 0);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const workoutsThisWeek = allWorkouts.filter((workout: any) => 
      new Date(workout.date) >= weekAgo
    ).length;
    
    const workoutsThisMonth = allWorkouts.filter((workout: any) => 
      new Date(workout.date) >= monthAgo
    ).length;
    
    const lastWorkout = allWorkouts.length > 0 
      ? new Date(Math.max(...allWorkouts.map((w: any) => new Date(w.date).getTime())))
      : null;
    
    // Calculate streak (consecutive days with workouts)
    const streakDays = calculateStreakDays(allWorkouts);
    
    const analytics: WorkoutAnalytics = {
      totalWorkouts,
      totalDuration,
      avgDuration,
      caloriesBurned,
      lastWorkout,
      workoutsThisWeek,
      workoutsThisMonth,
      streakDays
    };
    
    // Cache the analytics with timestamp
    storage.set(STORAGE_KEYS.USER_ANALYTICS, {
      ...analytics,
      lastCalculated: new Date().toISOString()
    });
    
    return analytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      avgDuration: 0,
      caloriesBurned: 0,
      lastWorkout: null,
      workoutsThisWeek: 0,
      workoutsThisMonth: 0,
      streakDays: 0
    };
  }
}

// Load analytics (async version for compatibility)
export async function loadAnalytics(): Promise<WorkoutAnalytics> {
  try {
    return getAnalytics();
  } catch (error) {
    console.error('Error loading analytics:', error);
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      avgDuration: 0,
      caloriesBurned: 0,
      lastWorkout: null,
      workoutsThisWeek: 0,
      workoutsThisMonth: 0,
      streakDays: 0
    };
  }
}

// Add activity
export function addActivity(activity: Omit<Activity, 'id'>): boolean {
  try {
    const activities = storage.get(STORAGE_KEYS.ACTIVITIES) || [];
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      date: new Date()
    };
    
    activities.push(newActivity);
    storage.set(STORAGE_KEYS.ACTIVITIES, activities);
    
    // Clear analytics cache
    storage.remove(STORAGE_KEYS.USER_ANALYTICS);
    
    return true;
  } catch (error) {
    console.error('Error adding activity:', error);
    return false;
  }
}

// Complete activity
export function completeActivity(activityId: string): boolean {
  try {
    const activities = storage.get(STORAGE_KEYS.ACTIVITIES) || [];
    const activityIndex = activities.findIndex((a: Activity) => a.id === activityId);
    
    if (activityIndex !== -1) {
      activities[activityIndex].completed = true;
      storage.set(STORAGE_KEYS.ACTIVITIES, activities);
      
      // Clear analytics cache
      storage.remove(STORAGE_KEYS.USER_ANALYTICS);
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error completing activity:', error);
    return false;
  }
}

// Get all activities
export function getAllActivities(): Activity[] {
  try {
    return storage.get(STORAGE_KEYS.ACTIVITIES) || [];
  } catch (error) {
    console.error('Error getting all activities:', error);
    return [];
  }
}

// Add weight entry
export function addWeightEntry(weight: number): boolean {
  try {
    const stats = getUserStats();
    stats.weight.push(weight);
    stats.weightDates.push(new Date());
    stats.currentWeight = weight;
    
    return saveUserStats(stats);
  } catch (error) {
    console.error('Error adding weight entry:', error);
    return false;
  }
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Calculate workout streak
function calculateStreakDays(workouts: any[]): number {
  if (workouts.length === 0) return 0;
  
  // Sort workouts by date (newest first)
  const sortedWorkouts = workouts
    .map(w => new Date(w.date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = new Date(today);
  
  for (const workoutDate of sortedWorkouts) {
    const workoutDay = new Date(workoutDate);
    workoutDay.setHours(0, 0, 0, 0);
    
    if (workoutDay.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (workoutDay.getTime() < currentDate.getTime()) {
      // Gap in workouts, streak is broken
      break;
    }
  }
  
  return streak;
}
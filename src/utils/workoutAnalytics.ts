import { STORAGE_KEYS, storage } from './storageKeys';

// Types for workout analytics
export interface WorkoutAnalytics {
  totalWorkouts: number;
  totalDuration: number; // in minutes
  avgDuration: number;
  caloriesBurned: number;
  lastWorkout: Date | null;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
}

export interface WorkoutSession {
  id: string;
  date: Date;
  duration: number; // in minutes
  calories: number;
  type: string;
  exercises: string[];
}

export interface UserStats {
  weight: number[];
  weightDates: Date[];
  currentWeight: number;
  targetWeight: number;
  height: number; // in cm
  age: number;
  gender: 'male' | 'female' | 'other';
}

// Get analytics data
export function getAnalytics(): WorkoutAnalytics {
  try {
    const workoutHistory = storage.get(STORAGE_KEYS.WORKOUT_HISTORY) || [];
    const analytics = storage.get(STORAGE_KEYS.USER_ANALYTICS);
    
    if (analytics) {
      return analytics;
    }
    
    // Calculate analytics from workout history
    const totalWorkouts = workoutHistory.length;
    const totalDuration = workoutHistory.reduce((sum: number, workout: WorkoutSession) => sum + workout.duration, 0);
    const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
    const caloriesBurned = workoutHistory.reduce((sum: number, workout: WorkoutSession) => sum + workout.calories, 0);
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const workoutsThisWeek = workoutHistory.filter((workout: WorkoutSession) => 
      new Date(workout.date) >= weekAgo
    ).length;
    
    const workoutsThisMonth = workoutHistory.filter((workout: WorkoutSession) => 
      new Date(workout.date) >= monthAgo
    ).length;
    
    const lastWorkout = workoutHistory.length > 0 
      ? new Date(Math.max(...workoutHistory.map((w: WorkoutSession) => new Date(w.date).getTime())))
      : null;
    
    const calculatedAnalytics: WorkoutAnalytics = {
      totalWorkouts,
      totalDuration,
      avgDuration,
      caloriesBurned,
      lastWorkout,
      workoutsThisWeek,
      workoutsThisMonth
    };
    
    // Cache the calculated analytics
    storage.set(STORAGE_KEYS.USER_ANALYTICS, calculatedAnalytics);
    
    return calculatedAnalytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      avgDuration: 0,
      caloriesBurned: 0,
      lastWorkout: null,
      workoutsThisWeek: 0,
      workoutsThisMonth: 0
    };
  }
}

// Load analytics (alias for getAnalytics for compatibility)
export function loadAnalytics(): WorkoutAnalytics {
  return getAnalytics();
}

// Save workout session
export function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): boolean {
  try {
    const workoutHistory = storage.get(STORAGE_KEYS.WORKOUT_HISTORY) || [];
    const newSession: WorkoutSession = {
      ...session,
      id: Date.now().toString(),
      date: new Date()
    };
    
    workoutHistory.push(newSession);
    storage.set(STORAGE_KEYS.WORKOUT_HISTORY, workoutHistory);
    
    // Clear cached analytics to force recalculation
    storage.remove(STORAGE_KEYS.USER_ANALYTICS);
    
    return true;
  } catch (error) {
    console.error('Error saving workout session:', error);
    return false;
  }
}

// Get user stats
export function getUserStats(): UserStats {
  try {
    return storage.get(STORAGE_KEYS.USER_STATS) || {
      weight: [],
      weightDates: [],
      currentWeight: 0,
      targetWeight: 0,
      height: 0,
      age: 0,
      gender: 'other'
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      weight: [],
      weightDates: [],
      currentWeight: 0,
      targetWeight: 0,
      height: 0,
      age: 0,
      gender: 'other'
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

// Get workout history
export function getWorkoutHistory(): WorkoutSession[] {
  try {
    return storage.get(STORAGE_KEYS.WORKOUT_HISTORY) || [];
  } catch (error) {
    console.error('Error getting workout history:', error);
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
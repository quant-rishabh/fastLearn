// Storage keys for localStorage
export const STORAGE_KEYS = {
  // Authentication keys
  CURRENT_USER: 'currentUser',
  REGISTERED_USERS: 'registeredUsers',
  
  // Workout/Analytics keys
  WORKOUT_DATA: 'workoutData',
  USER_ANALYTICS: 'userAnalytics',
  WORKOUT_HISTORY: 'workoutHistory',
  USER_STATS: 'userStats',
  WEIGHT_DATA: 'weightData',
  ACTIVITIES: 'activities',
  
  // Progress tracking keys
  PROGRESS_DATA: 'progressData',
  QUIZ_RESULTS: 'quizResults',
  SPEAKING_SESSIONS: 'speakingSessions',
  TOPIC_MASTERY: 'topicMastery',
  
  // App settings
  USER_PREFERENCES: 'userPreferences',
  THEME_SETTINGS: 'themeSettings',
} as const;

// Helper functions for localStorage operations
export const storage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  },
  
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  },
  
  remove: (key: string) => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error);
      return false;
    }
  },
  
  clear: () => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};
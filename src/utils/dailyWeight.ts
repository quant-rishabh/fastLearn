export interface DailyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  weight: number;
  timestamp: number; // Unix timestamp when entry was made
  userId: string;
}

export interface WeightProgress {
  entries: DailyWeightEntry[];
  currentWeight: number;
  canUpdateToday: boolean;
  todaysEntry?: DailyWeightEntry;
}

const WEIGHT_STORAGE_KEY = 'dailyWeightEntries';

// Get today's date in YYYY-MM-DD format
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Check if a date string is today
export const isToday = (dateString: string): boolean => {
  return dateString === getTodayDateString();
};

// Check if we've passed midnight since the entry was created
export const hasPassedMidnight = (timestamp: number): boolean => {
  const entryDate = new Date(timestamp);
  const now = new Date();
  
  // Check if the entry date is different from today's date
  return entryDate.toDateString() !== now.toDateString();
};

// Get hours and minutes until midnight
export const getTimeUntilMidnight = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // Next midnight
  
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

// Get all weight entries for a user
export const getUserWeightEntries = (userId: string): DailyWeightEntry[] => {
  try {
    const stored = localStorage.getItem(`${WEIGHT_STORAGE_KEY}_${userId}`);
    if (!stored) return [];
    return JSON.parse(stored) as DailyWeightEntry[];
  } catch (error) {
    console.error('Error loading weight entries:', error);
    return [];
  }
};

// Save weight entries for a user
export const saveUserWeightEntries = (userId: string, entries: DailyWeightEntry[]): boolean => {
  try {
    localStorage.setItem(`${WEIGHT_STORAGE_KEY}_${userId}`, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error('Error saving weight entries:', error);
    return false;
  }
};

// Get today's weight entry if it exists
export const getTodaysWeightEntry = (userId: string): DailyWeightEntry | null => {
  const entries = getUserWeightEntries(userId);
  const todayDate = getTodayDateString();
  return entries.find(entry => entry.date === todayDate) || null;
};

// Check if user can update weight today
export const canUpdateWeightToday = (userId: string): boolean => {
  const todaysEntry = getTodaysWeightEntry(userId);
  
  // If no entry exists for today, can create one
  if (!todaysEntry) return true;
  
  // If entry exists, can only update if it was created today (not a past entry)
  const entryDate = new Date(todaysEntry.timestamp);
  const today = new Date();
  
  // Check if the entry was made today (same date)
  const isSameDay = entryDate.toDateString() === today.toDateString();
  
  return isSameDay;
};

// Add or update today's weight entry
export const updateTodaysWeight = (userId: string, weight: number): { success: boolean; message: string; entry?: DailyWeightEntry } => {
  const entries = getUserWeightEntries(userId);
  const todayDate = getTodayDateString();
  const existingEntryIndex = entries.findIndex(entry => entry.date === todayDate);
  
  // Check if trying to update past date or locked entry
  if (existingEntryIndex !== -1) {
    const existingEntry = entries[existingEntryIndex];
    
    // Check if the entry is from a past date
    if (!isToday(existingEntry.date)) {
      return {
        success: false,
        message: "Cannot update weight for past dates. You can only update today's weight."
      };
    }
    
    // Check if midnight has passed since the entry was created
    if (hasPassedMidnight(existingEntry.timestamp)) {
      return {
        success: false,
        message: "Weight entry is locked after midnight. You can create a new entry today."
      };
    }
  }

  const newEntry: DailyWeightEntry = {
    id: `weight_${userId}_${todayDate}_${Date.now()}`,
    date: todayDate,
    weight: weight,
    timestamp: Date.now(),
    userId: userId
  };

  if (existingEntryIndex !== -1) {
    // Update existing entry for today (only if not locked)
    entries[existingEntryIndex] = newEntry;
  } else {
    // Add new entry
    entries.push(newEntry);
  }

  // Sort entries by date (newest first)
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const saved = saveUserWeightEntries(userId, entries);
  
  if (saved) {
    const timeLeft = getTimeUntilMidnight();
    const lockMessage = `Entry will lock at midnight (in ${timeLeft.hours}h ${timeLeft.minutes}m)`;
    
    return {
      success: true,
      message: existingEntryIndex !== -1 ? 
        `Today's weight updated successfully! ${lockMessage}` : 
        `Weight entry added successfully! ${lockMessage}`,
      entry: newEntry
    };
  } else {
    return {
      success: false,
      message: "Failed to save weight entry. Please try again."
    };
  }
};

// Get weight progress data
export const getWeightProgress = (userId: string): WeightProgress => {
  const entries = getUserWeightEntries(userId);
  const todaysEntry = getTodaysWeightEntry(userId);
  const canUpdate = canUpdateWeightToday(userId);
  
  // Get current weight (either today's entry or latest entry)
  let currentWeight = 70; // Default weight
  if (todaysEntry) {
    currentWeight = todaysEntry.weight;
  } else if (entries.length > 0) {
    currentWeight = entries[0].weight; // Most recent entry
  }

  return {
    entries: entries,
    currentWeight: currentWeight,
    canUpdateToday: canUpdate,
    todaysEntry: todaysEntry || undefined
  };
};

// Get weight data for chart (last 30 days)
export const getWeightChartData = (userId: string, days: number = 30): Array<{ date: string; weight: number; formattedDate: string }> => {
  const entries = getUserWeightEntries(userId);
  const result: Array<{ date: string; weight: number; formattedDate: string }> = [];
  
  // Get last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const entry = entries.find(e => e.date === dateString);
    
    if (entry) {
      result.push({
        date: dateString,
        weight: entry.weight,
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
  }
  
  return result;
};

// Delete a weight entry (only for today and if not locked)
export const deleteTodaysWeightEntry = (userId: string): { success: boolean; message: string } => {
  const entries = getUserWeightEntries(userId);
  const todayDate = getTodayDateString();
  const entryIndex = entries.findIndex(entry => entry.date === todayDate);
  
  if (entryIndex === -1) {
    return {
      success: false,
      message: "No weight entry found for today."
    };
  }

  const entry = entries[entryIndex];
  
  // Check if midnight has passed since the entry was created (locked)
  if (hasPassedMidnight(entry.timestamp)) {
    return {
      success: false,
      message: "Cannot delete entry - it's locked after midnight. You can create a new entry today instead."
    };
  }

  entries.splice(entryIndex, 1);
  const saved = saveUserWeightEntries(userId, entries);
  
  return {
    success: saved,
    message: saved ? "Today's weight entry deleted successfully!" : "Failed to delete weight entry."
  };
};

// Generate sample weight data for demo purposes
export const generateSampleWeightData = (userId: string, startWeight: number = 86, targetWeight: number = 68, days: number = 14): boolean => {
  try {
    const entries: DailyWeightEntry[] = [];
    const weightLossRate = (startWeight - targetWeight) / 90; // Assume 90 days total
    const dailyLossRate = weightLossRate / 7; // Per day
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Add some realistic variation
      const baseWeight = startWeight - (dailyLossRate * (days - i));
      const variation = (Math.random() - 0.5) * 1.5; // ±0.75kg daily variation
      const weight = Math.max(targetWeight, baseWeight + variation);
      
      entries.push({
        id: `weight_${userId}_${dateString}_${Date.now() + i}`,
        date: dateString,
        weight: Math.round(weight * 10) / 10, // Round to 1 decimal
        timestamp: date.getTime(),
        userId: userId
      });
    }
    
    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return saveUserWeightEntries(userId, entries);
  } catch (error) {
    console.error('Error generating sample data:', error);
    return false;
  }
};
'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import ChatComponent from '@/components/ChatComponent';
import DailyWeightTracker from '@/components/DailyWeightTracker';
import { 
  saveActivity, 
  getTodayActivities, 
  deleteActivity, 
  saveUserStats, 
  getUserStats,
  saveWeight,
  getAnalytics,
  type Activity,
  type DailyTracking
} from '@/utils/workoutDatabase';
import { isLoggedIn, getCurrentUser, getUserProfile, logoutUser } from '@/utils/auth';
import { getWeightProgress } from '@/utils/dailyWeight';

interface UserStats {
  currentWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  weeklyWeightLoss: number; // kg per week
}

export default function WorkoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Dynamic user stats - can be changed in real-time
  const [userStats, setUserStats] = useState<UserStats>({
    currentWeight: 86,
    targetWeight: 68,
    height: 174,
    age: 25,
    weeklyWeightLoss: 0.5 // kg per week
  });

  // Initialize current weight with default, will be updated when user loads
  const [currentWeight, setCurrentWeight] = useState(86);

  // Check authentication on page load
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/workout/login');
      return;
    }

    const currentUser = getCurrentUser();
    const profile = getUserProfile();
    
    if (currentUser && profile) {
      setUser(currentUser);
      setUserProfile(profile);
      
      // Load profile settings and current weight from profile
      setUserStats(prev => ({
        ...prev,
        targetWeight: profile.targetWeight,
        height: profile.height,
        age: profile.age,
        weeklyWeightLoss: profile.weeklyGoal
      }));
      
      // PRIORITY: Use profile currentWeight if it exists and is not default
      let initialWeight = currentWeight; // fallback
      
      if (profile.currentWeight && profile.currentWeight !== 86) {
        // Profile has a saved weight - use it as primary source
        initialWeight = profile.currentWeight;
        console.log('Loading weight from profile:', initialWeight, 'kg');
      } else {
        // No saved profile weight, check daily tracking as backup
        const dailyWeight = getWeightProgress(currentUser.username);
        if (dailyWeight.currentWeight && dailyWeight.currentWeight !== 70) {
          initialWeight = dailyWeight.currentWeight;
          console.log('Loading weight from daily tracking:', initialWeight, 'kg');
        }
      }
      
      setCurrentWeight(initialWeight);
      setUserStats(prev => ({ ...prev, currentWeight: initialWeight }));
    }
  }, [router]);

  // Daily tracking state
  const [dailyActivities, setDailyActivities] = useState<Activity[]>([]);
  const [dailyTracking, setDailyTracking] = useState<DailyTracking | null>(null);
  const [todayTotals, setTodayTotals] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<string>('');

  // Note: Exercise calories are now calculated by AI via /api/ai-analyze-exercise

  // Note: Food calories are now calculated by AI via /api/ai-get-calories

  // Load data on component mount
  useEffect(() => {
    loadTodayData();
    loadUserStats();
    loadAnalytics();
  }, []);

  // Load user stats when user changes (but don't override current weight)
  useEffect(() => {
    if (user?.username) {
      loadUserStats();
    }
  }, [user]);

  // Save user stats when they change
  useEffect(() => {
    if (!isLoadingData) {
      handleSaveUserStats();
    }
  }, [userStats, currentWeight]);

  // Fallback function to load activities directly from the database/API
  const loadActivitiesFallback = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Try using the supabase directly or a simpler API approach
      const { supabase } = await import('@/utils/supabase');
      
      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fallback error:', error);
        setSystemStatus('Using local mode - database connection issues');
        return;
      }
      
      console.log('Fallback activities loaded:', activities);
      setDailyActivities(activities || []);
      setSystemStatus('Data loaded via fallback method');
    } catch (error) {
      console.error('Fallback failed:', error);
      setSystemStatus('Using local mode');
    }
  };

  const loadTodayData = async () => {
    try {
      setIsLoadingData(true);
      // Use new optimized API endpoint
      const response = await fetch('/api/workout/activities?date=today');
      
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result); // Debug log
        
        if (result.success && result.todayData) {
          // Extract data from the optimized single-query response
          const todayData = result.todayData;
          console.log('Today Data:', todayData); // Debug log
          
          // Try different possible field names for activities
          const activities = todayData.today_activities || 
                           todayData.activities || 
                           todayData.todayActivities || 
                           [];
          
          console.log('Activities found:', activities); // Debug log
          setDailyActivities(activities);
          setTodayTotals(todayData.today_totals || null);
          
          // Update user stats with the latest profile data
          if (todayData.user_profile) {
            setUserStats(prev => ({
              ...prev,
              targetWeight: todayData.user_profile.target_weight,
              weeklyWeightLoss: todayData.user_profile.weekly_weight_loss
            }));
          }
          
          setSystemStatus('Data loaded successfully');
        } else {
          console.log('No todayData or not successful:', result);
          // Fallback: Try to load activities directly
          await loadActivitiesFallback();
        }
      } else {
        setSystemStatus('Error loading data from API');
        // Fallback: Try to load activities directly
        await loadActivitiesFallback();
      }
    } catch (error) {
      console.error('Error loading today data:', error);
      setSystemStatus('Error loading data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await getUserStats();
      if (response.success && response.userStats) {
        // Load target weight and weekly goals but preserve profile current weight
        setUserStats(prev => ({
          ...prev,
          targetWeight: response.userStats.target_weight,
          weeklyWeightLoss: response.userStats.weekly_weight_loss
          // Don't override currentWeight from database - profile is the source of truth
        }));
        
        console.log('loadUserStats - Loaded target weight:', response.userStats.target_weight);
        console.log('loadUserStats - Loaded weekly goal:', response.userStats.weekly_weight_loss);
        console.log('loadUserStats - Current weight preserved from profile:', currentWeight, 'kg');
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await getAnalytics(7);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleSaveUserStats = async () => {
    try {
      await saveUserStats(
        currentWeight,
        userStats.targetWeight,
        userStats.height,
        userStats.age,
        userStats.weeklyWeightLoss,
        bmr,
        maintenanceCalories,
        targetDailyCalories
      );
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  };

  // Save current weight to user profile database
  const handleSaveCurrentWeight = async () => {
    try {
      // Update the user profile with new current weight
      const currentUser = getCurrentUser();
      const currentProfile = getUserProfile();
      
      if (currentUser && currentProfile) {
        // Import the updateUserProfile function
        const { updateUserProfile } = await import('@/utils/auth');
        
        // Update the main user profile in auth system (this is the primary source)
        const updateResult = updateUserProfile({ currentWeight: currentWeight });
        
        if (updateResult.success) {
          // Update the profile object
          const updatedProfile = {
            ...currentProfile,
            currentWeight: currentWeight
          };
          
          // Also save weight entry for daily tracking
          await saveWeight(currentWeight, currentUser.username);
          
          // Save to user stats database
          await handleSaveUserStats();
          
          console.log('Current weight saved to profile:', currentWeight, 'kg');
          
          // Update local state to reflect the saved data
          setUserProfile(updatedProfile);
          
          return true;
        } else {
          console.error('Failed to update user profile:', updateResult.message);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error saving current weight:', error);
      return false;
    }
  };

  // Add activity function
  const addActivity = async (
    type: 'food' | 'exercise', 
    name: string, 
    details: string, 
    calories: number, 
    category?: string, 
    parameters?: any,
    aiCalculated?: boolean
  ) => {
    try {
      const activity: Activity = {
        type,
        name,
        details,
        calories,
        category,
        parameters,
        ai_calculated: aiCalculated
      };

      const response = await saveActivity(activity, bmr, maintenanceCalories, targetDailyCalories);
      if (response.success) {
        // Reload today's data to get updated totals
        await loadTodayData();
        await loadAnalytics(); // Refresh analytics too
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      // Fallback to local state if database fails
      const newActivity: Activity = {
        id: Date.now().toString(),
        type,
        name,
        details,
        calories,
        category,
        parameters,
        timestamp: new Date()
      };
      setDailyActivities(prev => [...prev, newActivity]);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await deleteActivity(activityId);
      await loadTodayData();
      await loadAnalytics();
    } catch (error) {
      console.error('Error deleting activity:', error);
      // Fallback to local deletion
      setDailyActivities(prev => prev.filter(a => a.id !== activityId));
    }
  };

  const handleWeightUpdate = async (newWeight: number) => {
    // Update local state immediately
    setCurrentWeight(newWeight);
    
    // Update userStats to reflect the new current weight
    setUserStats(prev => ({
      ...prev,
      currentWeight: newWeight
    }));
    
    // Note: The weight is already saved by the DailyWeightTracker component
    // We just need to update our local state to use the new weight for calculations
    console.log('Current weight updated to:', newWeight, 'kg');
  };

  // Function to refresh current weight from daily entries
  const refreshCurrentWeight = () => {
    if (user?.username) {
      const weightProgress = getWeightProgress(user.username);
      const newWeight = weightProgress.currentWeight;
      setCurrentWeight(newWeight);
      setUserStats(prev => ({
        ...prev,
        currentWeight: newWeight
      }));
    }
  };

  // Helper functions to update individual stats
  const updateTargetWeight = (weight: number) => {
    setUserStats(prev => ({ ...prev, targetWeight: weight }));
  };

  const updateWeeklyWeightLoss = (kg: number) => {
    setUserStats(prev => ({ ...prev, weeklyWeightLoss: kg }));
  };

  // BMR calculation using Mifflin-St Jeor equation (for males)
  const calculateBMR = (weight: number) => {
    const height = userStats.height || 175;
    const age = userStats.age || 25;
    return 10 * (weight || 0) + 6.25 * height - 5 * age + 5;
  };

  // Simple maintenance calculation - Sedentary lifestyle (×1.2)
  const calculateMaintenance = (bmr: number) => {
    return (bmr || 0) * 1.2; // Sedentary: Office job, no exercise
  };

  // Weekly weight loss calculations
  const caloriesPerKg = 7700; // Calories needed to lose 1kg of body fat (scientifically accurate)
  const weeklyCalorieDeficit = (userStats.weeklyWeightLoss || 0.5) * caloriesPerKg;
  const dailyCalorieDeficit = weeklyCalorieDeficit / 7;

  // Calculate total weight loss needed and timeline
  const totalWeightLoss = (currentWeight || 0) - (userStats.targetWeight || 70);
  const weeksNeeded = totalWeightLoss / (userStats.weeklyWeightLoss || 0.5);
  const monthsNeeded = weeksNeeded / 4.33;

  // BMR and maintenance calculations
  const bmr = calculateBMR(currentWeight);
  const maintenanceCalories = calculateMaintenance(bmr);
  const targetDailyCalories = maintenanceCalories - dailyCalorieDeficit;

  // Progress calculations
  const weightLostSoFar = (userStats.currentWeight || 0) - (currentWeight || 0);
  const progressPercentage = totalWeightLoss > 0 ? (weightLostSoFar / totalWeightLoss) * 100 : 0;

  // Calculate daily totals - use optimized database data when available
  const todayCaloriesFromExercise = (todayTotals && todayTotals.calories_burned_exercise) ? 
    todayTotals.calories_burned_exercise : 
    dailyActivities.filter(a => a.type === 'exercise').reduce((sum, a) => sum + (a.calories || 0), 0);
  const todayCaloriesFromFood = (todayTotals && todayTotals.calories_consumed) ? 
    todayTotals.calories_consumed : 
    dailyActivities.filter(a => a.type === 'food').reduce((sum, a) => sum + Math.abs(a.calories || 0), 0);
  const todayNetCalories = (todayTotals && todayTotals.net_calories) ? 
    todayTotals.net_calories : 
    dailyActivities.reduce((sum, a) => sum + (a.calories || 0), 0);
  
  // Updated daily numbers
  const todayMaintenanceCalories = (maintenanceCalories || 0) + todayCaloriesFromExercise;
  
  // ALWAYS calculate balance in real-time based on current weight (don't use cached value)
  const todayRemainingToEat = ((targetDailyCalories || 0) + todayCaloriesFromExercise) - todayCaloriesFromFood;
  
  const todayActualDeficit = todayMaintenanceCalories - todayCaloriesFromFood;

  // Quick Food Add Component
  const QuickFoodAdd = ({ addActivity }: any) => {
    const [foodDescription, setFoodDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastLookup, setLastLookup] = useState('');

    const getCaloriesFromAI = async (description: string) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai-get-calories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            food: description,
            quantity: 1 // AI will parse quantity from description
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get calories');
        }

        const data = await response.json();
        return data.calories || 0;
      } catch (error) {
        console.error('Error getting calories:', error);
        // Fallback to basic estimation
        return 100; // Basic fallback: 100 calories
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddFood = async () => {
      if (!foodDescription.trim()) return;
      
      const calories = await getCaloriesFromAI(foodDescription);
      
      // Use new API endpoint directly (bypassing old addActivity function)
      try {
        const response = await fetch('/api/workout/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'food',
            description: `${foodDescription} (${calories} cal)`,
            category: 'food', // Default food category
            calories: calories,
            protein_grams: 0 // We could enhance this with AI later
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Refresh today's data
          await loadTodayData();
          setLastLookup(`${foodDescription} = ${calories} calories`);
          setFoodDescription('');
        } else {
          console.error('Failed to save food');
        }
      } catch (error) {
        console.error('Error saving food:', error);
        setLastLookup(`Error saving: ${foodDescription}`);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && foodDescription.trim()) {
        handleAddFood();
      }
    };

    return (
      <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/50">
        <h3 className="font-semibold text-red-400 mb-3">🍽️ Add Food (Expense)</h3>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Type in plain English (e.g., '2 eggs', '1 slice pizza', 'medium apple')..."
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-red-400 focus:ring-2 focus:ring-red-400/50 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={handleAddFood}
            disabled={!foodDescription.trim() || isLoading}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 disabled:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                AI Calculating...
              </>
            ) : (
              'Add Food'
            )}
          </button>

          {lastLookup && (
            <div className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
              Last: {lastLookup}
            </div>
          )}

          <div className="text-xs text-gray-400">
            💡 Just type naturally! AI understands "2 apples", "large pizza slice", "cup of rice", etc.
          </div>
        </div>
      </div>
    );
  };

  // Quick Exercise Add Component - AI Powered
  const QuickExerciseAdd = ({ addActivity, currentWeight }: any) => {
    const [exerciseDescription, setExerciseDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastLookup, setLastLookup] = useState('');

    const getExerciseDataFromAI = async (description: string) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/ai-analyze-exercise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            exercise: description,
            userWeight: currentWeight,
            userProfile: {
              weight: currentWeight,
              height: userStats.height,
              age: userStats.age,
              gender: 'male' // assuming male for BMR calculation
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze exercise');
        }

        const data = await response.json();
        return {
          calories: data.calories || 0,
          category: data.category || 'general',
          enhancedDescription: data.enhancedDescription || description,
          proteinGrams: null // exercises don't provide protein
        };
      } catch (error) {
        console.error('Error analyzing exercise:', error);
        // Fallback to basic estimation
        return {
          calories: 50, // Basic fallback: 50 calories
          category: 'general',
          enhancedDescription: description,
          proteinGrams: null
        };
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddExercise = async () => {
      if (!exerciseDescription.trim()) return;
      
      const exerciseData = await getExerciseDataFromAI(exerciseDescription);
      
      // Use new API endpoint directly (bypassing old addActivity function)
      try {
        const response = await fetch('/api/workout/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'exercise',
            description: exerciseData.enhancedDescription,
            category: exerciseData.category,
            calories: exerciseData.calories,
            protein_grams: null // Exercise doesn't have protein
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Refresh today's data
          await loadTodayData();
          setLastLookup(`${exerciseDescription} = +${exerciseData.calories} calories`);
        } else {
          console.error('Failed to save exercise');
        }
      } catch (error) {
        console.error('Error saving exercise:', error);
        setLastLookup(`Error saving: ${exerciseDescription}`);
      }
      setExerciseDescription('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && exerciseDescription.trim()) {
        handleAddExercise();
      }
    };

    return (
      <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/50">
        <h3 className="font-semibold text-green-400 mb-3">💪 Add Exercise (Income)</h3>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Describe your workout (e.g., 'bench press 3 sets heavy', 'ran 5km', 'pushups till failure')..."
              value={exerciseDescription}
              onChange={(e) => setExerciseDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          <div className="text-xs text-green-400 mb-2">
            Your weight: {currentWeight}kg (AI uses this for accurate calculations)
          </div>
          
          <button
            onClick={handleAddExercise}
            disabled={!exerciseDescription.trim() || isLoading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 disabled:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                AI Analyzing...
              </>
            ) : (
              'Add Exercise'
            )}
          </button>

          {lastLookup && (
            <div className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
              Last: {lastLookup}
            </div>
          )}

          <div className="text-xs text-gray-400">
            💡 Just describe naturally! AI understands "bench press 3 heavy sets", "ran 5km moderate", "100 pushups", etc.
          </div>
        </div>
      </div>
    );
  };

  // Show loading screen if user is not loaded yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin h-12 w-12 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl">Loading your workout profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with User Profile */}
        <div className="bg-gray-800/60 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-4xl font-bold text-white mb-2">
                💪 Calorie Tracker
              </h3>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('/workout/analytics', '_blank')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📊 Detailed Analytics
              </button>
              <button
                onClick={() => router.push('/workout/settings')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  router.push('/workout/login');
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Current Weight Input - With Controls */}
          <div className="bg-purple-900/30 rounded-lg p-4 mb-6 border border-purple-500/50">
            <div className="flex items-center justify-center gap-4">
              <label className="text-purple-300 font-medium">Current Weight:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newWeight = Math.max(30, currentWeight - 0.1);
                    setCurrentWeight(newWeight);
                    setUserStats(prev => ({ ...prev, currentWeight: newWeight }));
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-lg text-sm font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={currentWeight}
                  onChange={(e) => {
                    const newWeight = Number(e.target.value);
                    setCurrentWeight(newWeight);
                    setUserStats(prev => ({ ...prev, currentWeight: newWeight }));
                  }}
                  className="border border-purple-500/50 bg-gray-700 text-white rounded-lg px-4 py-2 text-lg font-semibold w-24 text-center focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
                  step="0.1"
                  min="30"
                  max="200"
                />
                <button
                  onClick={() => {
                    const newWeight = Math.min(200, currentWeight + 0.1);
                    setCurrentWeight(newWeight);
                    setUserStats(prev => ({ ...prev, currentWeight: newWeight }));
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-lg text-sm font-bold"
                >
                  +
                </button>
                <span className="text-lg text-purple-300 font-medium">kg</span>
                <button
                  onClick={handleSaveCurrentWeight}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-2"
                >
                  💾 Save
                </button>
              </div>
              <div className="text-sm text-purple-400">
                Click Save to update your profile permanently
              </div>
            </div>
          </div>

          {/* Today's Balance - Moved to Top */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-900/50 rounded-lg p-4 text-center border border-blue-500/50">
              <div className="text-3xl font-bold text-blue-400">{Math.round(todayRemainingToEat || 0)}</div>
              <div className="text-sm text-gray-300">💵 Balance (Can Eat)</div>
              <div className="text-xs text-gray-400">Target: {Math.round(targetDailyCalories || 0)} - Food: {todayCaloriesFromFood || 0}</div>
            </div>
            <div className="bg-green-900/50 rounded-lg p-4 text-center border border-green-500/50">
              <div className="text-2xl font-bold text-green-400">+{todayCaloriesFromExercise || 0}</div>
              <div className="text-sm text-gray-300">💪 Exercise Earned</div>
              <div className="text-xs text-gray-400">Bonus calories from workouts</div>
            </div>
            <div className="bg-red-900/50 rounded-lg p-4 text-center border border-red-500/50">
              <div className="text-2xl font-bold text-red-400">-{todayCaloriesFromFood || 0}</div>
              <div className="text-sm text-gray-300">🍽️ Food Spent</div>
              <div className="text-xs text-gray-400">Calories consumed today</div>
            </div>
          </div>
        </div>

        {/* System Status Banner */}
        {systemStatus && systemStatus.includes('local') && (
            <div className="mt-4 bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-3 max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-sm text-yellow-300">
                  <strong>Local Mode:</strong> Data is being saved locally. 
                  <button 
                    onClick={() => setSystemStatus('')}
                    className="ml-2 text-yellow-200 hover:text-white underline"
                  >
                    Set up database for full features
                  </button>
                </span>
                <button 
                  onClick={() => setSystemStatus('')}
                  className="ml-auto text-yellow-400 hover:text-yellow-200"
                >
                  ✕
                </button>
              </div>
            </div>
        )}





        {/* Daily Tracker - Money Balance Style */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">💰 Today's Calorie Balance (Money Style)</h2>
          


          {/* Quick Add Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <QuickFoodAdd addActivity={addActivity} />
            <QuickExerciseAdd addActivity={addActivity} currentWeight={currentWeight} />
          </div>

          {/* Today's Activity Log */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">📋 Today's Activity Log</h3>
            {dailyActivities.length === 0 ? (
              <p className="text-gray-400 text-sm">No activities logged today. Start by adding some food or exercise!</p>
            ) : (
              <div className="space-y-2">
                {dailyActivities.map((activity) => (
                  <div key={activity.id} className={`flex justify-between items-center p-3 rounded-lg ${
                    activity.type === 'food' ? 'bg-red-900/30 border border-red-500/50' : 'bg-green-900/30 border border-green-500/50'
                  }`}>
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {activity.type === 'food' ? '🍽️' : '💪'} {activity.description || activity.name || 'No description'}
                      </div>
                      <div className="text-sm text-gray-300">{activity.category || activity.details || ''}</div>
                      <div className="text-xs text-gray-400">
                        {activity.created_at ? 
                          new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          activity.timestamp ? 
                            new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                            'Just now'
                        }
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${
                      activity.type === 'food' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {activity.type === 'food' ? '-' : '+'}{Math.abs(activity.calories || 0)}
                    </div>
                    <button
                      onClick={() => activity.id && handleDeleteActivity(activity.id)}
                      className="ml-3 text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Simple Truth Explanation */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <div className="p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/50">
            <h3 className="font-bold text-orange-400 mb-4 text-xl">🔗 The Simple Truth:</h3>
            <div className="text-sm text-gray-300 space-y-3">
              <p className="bg-purple-900/30 p-2 rounded border-l-4 border-purple-400">
                <strong>Current Weight:</strong> Since your current weight is <span className="font-semibold text-purple-400">{currentWeight || 0} kg</span>, all calculations are based on this weight
              </p>
              
              <p><strong>Step 1:</strong> Your body burns <span className="font-semibold text-blue-400">{Math.round(bmr)} calories</span> just to survive (BMR calculation)</p>
              
              <p><strong>Step 2:</strong> With sedentary lifestyle, you burn <span className="font-semibold text-green-400">{Math.round(maintenanceCalories)} calories</span> per day (BMR × 1.2)</p>
              
              <p><strong>Step 3:</strong> To lose <span className="font-semibold text-yellow-400">{userStats.weeklyWeightLoss}kg</span> per week, you need <span className="font-semibold text-orange-400">{Math.round(weeklyCalorieDeficit)} calories</span> deficit per week</p>
              
              <p><strong>Step 4:</strong> Daily deficit needed: <span className="font-semibold text-pink-400">{Math.round(dailyCalorieDeficit)} calories</span> per day ({Math.round(weeklyCalorieDeficit)} ÷ 7 = {Math.round(dailyCalorieDeficit)})</p>
              
              <p><strong>Step 5:</strong> So eat <span className="font-semibold text-red-400">{Math.round(targetDailyCalories)} calories</span> per day ({Math.round(maintenanceCalories)} - {Math.round(dailyCalorieDeficit)} = {Math.round(targetDailyCalories)})</p>
            </div>
            
            <div className="mt-4 p-3 bg-green-900/30 rounded-lg border-l-4 border-green-500">
              <h4 className="font-bold text-green-400 mb-2">💪 Exercise is BONUS!</h4>
              <p className="text-sm text-gray-300">
                Every workout burns extra calories on top of your {Math.round(maintenanceCalories)} maintenance calories. 
                This means you can either eat more food or lose weight faster than planned!
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-bold text-blue-400 mb-2">⚖️ Weight Changes = New Calculations!</h4>
              <p className="text-sm text-gray-300">
                As your weight changes, your BMR changes too. When you lose weight, you'll need fewer calories to maintain, 
                so your target calories will automatically adjust based on your current weight of {currentWeight}kg.
              </p>
            </div>
          </div>
        </div>


      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white w-16 h-16 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
      >
        <span className="text-2xl">🤖</span>
      </button>

      {/* Chat Component */}
      <ChatComponent isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Loading Overlay */}
      {isLoadingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 flex items-center gap-4 border border-gray-700">
            <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-white font-semibold">Loading your data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
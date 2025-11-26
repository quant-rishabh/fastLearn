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

  // Add state to prevent concurrent API calls
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [lastProfileLoad, setLastProfileLoad] = useState(0);

  // Load user profile from database (single source of truth)
  const loadUserProfileFromDB = async () => {
    // Prevent concurrent calls
    if (isLoadingProfile) {
      console.log('Profile already loading, skipping...');
      return false;
    }

    // Prevent too frequent calls (minimum 2 seconds between calls)
    const now = Date.now();
    if (now - lastProfileLoad < 2000) {
      console.log('Profile loaded recently, skipping...');
      return true; // Return true since we have recent data
    }

    try {
      setIsLoadingProfile(true);
      setLastProfileLoad(now);
      console.log('Loading user profile from database...');
      const response = await fetch('/api/workout/user-stats');
      
      if (response.ok) {
        const result = await response.json();
        console.log('Database response:', result);
        
        if (result.success && result.userProfile) {
          const profile = result.userProfile;
          
          setUserProfile(profile);
          setUser({ username: 'user' }); // Simple user object for now
          
          // Load ALL profile data from database
          setUserStats({
            currentWeight: profile.current_weight || 86,
            targetWeight: profile.target_weight || 68,
            height: profile.height || 174,
            age: profile.age || 25,
            weeklyWeightLoss: profile.weekly_weight_loss || 0.5
          });
          
          setCurrentWeight(profile.current_weight || 86);
          
          console.log('✅ Loaded from database:');
          console.log('- Current Weight:', profile.current_weight);
          console.log('- Target Weight:', profile.target_weight);
          console.log('- Weekly Goal:', profile.weekly_weight_loss);
          console.log('- Height:', profile.height);
          console.log('- Age:', profile.age);
          
          return true;
        } else {
          console.error('No user profile found in database');
          return false;
        }
      } else {
        console.error('Failed to fetch user profile from database');
        return false;
      }
    } catch (error) {
      console.error('Error loading user profile from database:', error);
      return false;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Check authentication on page load
  useEffect(() => {
    // Skip localStorage check for now - load directly from database
    loadUserProfileFromDB();
  }, []); // Remove router dependency to prevent multiple calls

  // Add focus listener to refresh profile data when returning to the page (with debouncing)
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    let lastFocusTime = 0;
    let wasHidden = false;
    const DEBOUNCE_DELAY = 10000; // Increased to 10 seconds minimum between refreshes

    const handleFocus = () => {
      // Only refresh if the page was actually hidden (switched tabs/apps)
      if (!wasHidden) {
        console.log('Focus event ignored (page was not hidden)');
        return;
      }

      const now = Date.now();
      if (now - lastFocusTime < DEBOUNCE_DELAY) {
        console.log('Focus event ignored (too soon after last refresh)');
        return;
      }

      console.log('Page focused after being hidden - refreshing from database...');
      lastFocusTime = now;
      wasHidden = false;
      
      // Clear any existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Debounce the API call
      debounceTimer = setTimeout(() => {
        loadUserProfileFromDB();
      }, 2000); // Wait 2 seconds before making the call
    };

    // Track visibility changes more precisely
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHidden = true;
        console.log('Page hidden - will refresh on next focus');
      } else if (wasHidden) {
        handleFocus();
      }
    };

    // Only use visibility change listener (more reliable than focus)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
    loadAnalytics();
    // User profile is loaded by loadUserProfileFromDB() in the auth useEffect
  }, []);

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

  // Save current weight to database (single source of truth)
  const handleSaveCurrentWeight = async () => {
    try {
      console.log('💾 Saving current weight to database:', currentWeight, 'kg');
      
      // Calculate BMR and other values
      const height = userStats.height || 174;
      const age = userStats.age || 25;
      const bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
      const maintenanceCalories = bmr * 1.2;
      const caloriesPerKg = 7700;
      const weeklyCalorieDeficit = userStats.weeklyWeightLoss * caloriesPerKg;
      const dailyCalorieTarget = maintenanceCalories - (weeklyCalorieDeficit / 7);
      
      // 1. Save weight to weight_logs table (for analytics with date-specific tracking)
      const weightResponse = await fetch('/api/workout/weight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: currentWeight,
          date: new Date().toISOString().split('T')[0] // Today's date
        })
      });

      if (!weightResponse.ok) {
        throw new Error('Failed to save weight to weight_logs');
      }

      // 2. Update user profile in database (for overall profile data)
      const profileResponse = await fetch('/api/workout/user-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_weight: currentWeight,
          target_weight: userStats.targetWeight,
          height: userStats.height,
          age: userStats.age,
          gender: 'male',
          weekly_weight_loss: userStats.weeklyWeightLoss,
          bmr: Math.round(bmr),
          maintenance_calories: Math.round(maintenanceCalories),
          daily_calorie_target: Math.round(dailyCalorieTarget),
          daily_protein_target: Math.round(currentWeight * 2) // 2g per kg
        })
      });
      
      if (profileResponse.ok) {
        console.log('✅ Weight saved to both weight_logs and user_profile successfully');
        
        // Refresh profile data to ensure we have the latest
        await loadUserProfileFromDB();
        
        alert(`✅ Weight saved: ${currentWeight} kg (saved to analytics & profile)`);
        return true;
      } else {
        console.error('Failed to save weight to user_profile');
        alert('⚠️ Weight saved to logs but failed to update profile');
        return false;
      }
    } catch (error) {
      console.error('Error saving current weight:', error);
      alert('❌ Error saving weight');
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
  // Balance should be simple: Target - Food (exercise is separate bonus)
  const todayRemainingToEat = (targetDailyCalories || 0) - todayCaloriesFromFood;
  
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
            food: description
          }),
        });

        const data = await response.json();
        
        // Check if AI analysis failed
        if (!response.ok) {
          throw new Error(data.error || 'AI service failed');
        }

        if (!data.calories || typeof data.calories !== 'number') {
          throw new Error('Invalid AI response - no calorie data');
        }
        
        // Enhanced feedback with breakdown
        let lookupMessage = `${description} = ${data.calories} calories`;
        if (data.protein) {
          lookupMessage += `, ${data.protein}g protein`;
        }
        if (data.breakdown && data.breakdown.length > 1) {
          const items = data.breakdown.map((item: any) => `${item.qty}${item.unit.charAt(0)} ${item.item}`).join(', ');
          lookupMessage = `Multiple items: ${items} = ${data.calories} cal, ${data.protein}g protein`;
        }
        
        lookupMessage += ' (AI analyzed)';
        setLastLookup(lookupMessage);
        
        return {
          calories: data.calories,
          protein: data.protein || 0,
          enhancedDescription: data.enhancedDescription || description,
          breakdown: data.breakdown
        };
      } catch (error) {
        console.error('❌ AI analysis failed:', error);
        setLastLookup(`❌ AI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error; // Re-throw to prevent adding invalid data
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddFood = async () => {
      if (!foodDescription.trim()) return;
      
      try {
        const foodData = await getCaloriesFromAI(foodDescription);
        
        // Use new API endpoint directly (bypassing old addActivity function)
        const response = await fetch('/api/workout/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'food',
            description: foodData.enhancedDescription,
            category: 'food',
            calories: -Math.abs(foodData.calories), // Negative for food consumption
            protein_grams: foodData.protein || 0
          })
        });

        if (response.ok) {
          const result = await response.json();
          // Refresh today's data
          await loadTodayData();
          
          // Clear input - feedback already set in getCaloriesFromAI
          setFoodDescription('');
        } else {
          console.error('Failed to save food');
          setLastLookup(`❌ Failed to save: ${foodDescription}`);
        }
      } catch (error) {
        console.error('Error in handleAddFood:', error);
        // Error message already set in getCaloriesFromAI - don't clear input so user can retry
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
              placeholder="List your food naturally..."
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-red-400 focus:ring-2 focus:ring-red-400/50 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div className="font-medium text-red-400">💡 Examples (Indian & International):</div>
            <div>• "3 roti with karela sabzi 70g, raita 100g" → Multiple items</div>
            <div>• "2 eggs, 1 slice bread, banana" → Full breakfast</div>
            <div>• "dal chawal, 3 idli, milk 200ml" → Complete meal</div>
            <div>• "1 samosa, rasgulla" → Snacks with accurate counts</div>
            <div>• "paneer 100g, chicken breast 150g" → Protein sources</div>
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
            <div className={`text-xs rounded px-2 py-2 ${
              lastLookup.includes('Multiple items') 
                ? 'text-orange-300 bg-orange-900/50 border border-orange-500/30' 
                : lastLookup.includes('❌') 
                  ? 'text-red-300 bg-red-900/50 border border-red-500/30'
                  : 'text-gray-300 bg-gray-800'
            }`}>
              <div className="flex items-start gap-1">
                <span className="text-xs opacity-70">Last:</span>
                <span className="flex-1">{lastLookup}</span>
              </div>
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
              gender: 'male' // Default - could be made configurable later
            }
          }),
        });

        const data = await response.json();
        
        // Check if response has an error but still has data (fallback scenario)
        if (!response.ok && !data.calories) {
          throw new Error(data.error || 'Failed to analyze exercise');
        }

        // Show detailed breakdown if available
        let lookupMessage = `${description} = +${data.calories} calories`;
        if (data.breakdown) {
          lookupMessage = `Multiple exercises detected: ${data.breakdown} = +${data.calories} total calories`;
        }
        
        // Add indicator if this was estimated vs AI analyzed
        if (data.enhancedDescription && data.enhancedDescription.includes('estimated')) {
          lookupMessage += ' (estimated)';
        }
        
        setLastLookup(lookupMessage);

        return {
          calories: data.calories || 0,
          category: data.category || 'general',
          enhancedDescription: data.enhancedDescription || description,
          breakdown: data.breakdown,
          proteinGrams: null // exercises don't provide protein
        };
      } catch (error) {
        console.error('Error analyzing exercise:', error);
        // Improved fallback calculation based on user weight and exercise type
        const fallbackCalories = Math.round(currentWeight * 0.5); // 0.5 cal per kg as basic estimate
        setLastLookup(`${description} = +${fallbackCalories} calories (service unavailable)`);
        
        return {
          calories: fallbackCalories,
          category: 'general',
          enhancedDescription: `${description} (+${fallbackCalories} cal estimated)`,
          proteinGrams: null
        };
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddExercise = async () => {
      if (!exerciseDescription.trim()) return;
      
      const exerciseData = await getExerciseDataFromAI(exerciseDescription);
      
      // Validate exercise data first
      if (!exerciseData.calories || exerciseData.calories <= 0) {
        setLastLookup(`❌ Invalid exercise data: No calories calculated`);
        return;
      }
      
      // Use new API endpoint directly (bypassing old addActivity function)
      try {
        console.log('🔄 Sending exercise data:', {
          type: 'exercise',
          description: exerciseData.enhancedDescription,
          category: exerciseData.category,
          calories: exerciseData.calories,
          protein_grams: null
        });

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

        if (!response.ok) {
          // Try to get error message from response
          const errorText = await response.text();
          console.error('❌ HTTP Error:', response.status, errorText);
          setLastLookup(`❌ Server error (${response.status}): ${errorText.substring(0, 50)}...`);
          return;
        }

        const result = await response.json();
        console.log('📊 API Response:', result);

        if (result.success) {
          // Refresh today's data
          await loadTodayData();
          
          // Clear input and show success
          setExerciseDescription('');
          setLastLookup(`✅ Added: ${exerciseData.enhancedDescription} (+${exerciseData.calories} cal)`);
        } else {
          const errorMsg = result.error || result.message || 'Unknown API error';
          console.error('❌ API returned error:', errorMsg);
          setLastLookup(`❌ Database error: ${errorMsg}`);
          // Don't clear input on error so user can retry
        }
      } catch (error) {
        console.error('❌ Network error saving exercise:', error);
        
        // Fallback: Save to local state if database fails
        try {
          const newActivity = {
            id: Date.now().toString(),
            type: 'exercise' as const,
            name: exerciseData.enhancedDescription,
            description: exerciseData.enhancedDescription,
            category: exerciseData.category,
            calories: exerciseData.calories,
            timestamp: new Date(),
            created_at: new Date().toISOString()
          };
          
          // Add to local state as fallback
          setDailyActivities(prev => [newActivity, ...prev]);
          setExerciseDescription('');
          setLastLookup(`⚠️ Added locally (${exerciseData.calories} cal) - Database unavailable`);
        } catch (fallbackError) {
          setLastLookup(`❌ Network error: ${error instanceof Error ? error.message : 'Connection failed'}`);
        }
      }
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
              placeholder="Describe your workout naturally..."
              value={exerciseDescription}
              onChange={(e) => setExerciseDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div className="font-medium text-green-400">💡 Examples:</div>
            <div>• "ran 3km in 20 minutes" → AI calculates pace & METs</div>
            <div>• "gym workout 60 minutes" → Mixed exercise session</div>
            <div>• "deadlifts 5 sets of 8 heavy" → Compound strength training</div>
            <div>• "HIIT workout 30 min" → High-intensity interval training</div>
            <div>• "100 pushups" → Bodyweight exercise calculation</div>
          </div>
          
          <div className="text-xs text-green-400 mb-2">
            Your weight: {currentWeight}kg (AI uses this for accurate MET-based calories)
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
            <div className={`text-xs rounded px-2 py-2 ${
              lastLookup.includes('Multiple exercises') 
                ? 'text-green-300 bg-green-900/50 border border-green-500/30' 
                : lastLookup.includes('❌') 
                  ? 'text-red-300 bg-red-900/50 border border-red-500/30'
                  : 'text-gray-300 bg-gray-800'
            }`}>
              <div className="flex items-start gap-1">
                <span className="text-xs opacity-70">Last:</span>
                <span className="flex-1">{lastLookup}</span>
              </div>
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

        {/* Comprehensive Stats Overview */}
        <div className="bg-gray-800/60 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">📊 Your Profile Stats</h2>
            <button
              onClick={async () => {
                if (isLoadingProfile) {
                  alert('⏳ Already refreshing, please wait...');
                  return;
                }
                console.log('🔄 Manual refresh clicked - loading from database...');
                const success = await loadUserProfileFromDB();
                if (success) {
                  alert(`✅ Refreshed from database! Weekly goal: ${userStats.weeklyWeightLoss} kg/week`);
                } else {
                  alert('❌ Failed to refresh from database');
                }
              }}
              disabled={isLoadingProfile}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
            >
              {isLoadingProfile ? '⏳ Loading...' : '🔄 Refresh Data'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-500/50">
              <div className="text-2xl font-bold text-purple-400">{currentWeight}</div>
              <div className="text-sm text-gray-300">kg</div>
              <div className="text-xs text-purple-300">Current Weight</div>
            </div>
            
            <div className="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-500/50">
              <div className="text-2xl font-bold text-blue-400">{userStats.targetWeight}</div>
              <div className="text-sm text-gray-300">kg</div>
              <div className="text-xs text-blue-300">Target Weight</div>
            </div>
            
            <div className="bg-yellow-900/30 rounded-lg p-3 text-center border border-yellow-500/50">
              <div className="text-2xl font-bold text-yellow-400">{userStats.weeklyWeightLoss}</div>
              <div className="text-sm text-gray-300">kg/week</div>
              <div className="text-xs text-yellow-300">Target Loss Rate</div>
            </div>
            
            <div className="bg-orange-900/30 rounded-lg p-3 text-center border border-orange-500/50">
              <div className="text-2xl font-bold text-orange-400">{Math.round(dailyCalorieDeficit)}</div>
              <div className="text-sm text-gray-300">cal/day</div>
              <div className="text-xs text-orange-300">Target Daily Deficit</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-400">
              Last updated: {new Date().toLocaleTimeString()} | 
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                Force Full Refresh
              </button>
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
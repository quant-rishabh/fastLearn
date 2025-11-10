'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import ChatComponent from '@/components/ChatComponent';
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
      
      // Update user stats from profile
      setUserStats({
        currentWeight: profile.currentWeight,
        targetWeight: profile.targetWeight,
        height: profile.height,
        age: profile.age,
        weeklyWeightLoss: profile.weeklyGoal
      });
      setCurrentWeight(profile.currentWeight);
    }
  }, [router]);

  // Daily tracking state
  const [dailyActivities, setDailyActivities] = useState<Activity[]>([]);
  const [dailyTracking, setDailyTracking] = useState<DailyTracking | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<string>('');

  // Exercise formulas
  const calculateExerciseCalories = (exercise: string, params: any, userWeight: number) => {
    switch (exercise.toLowerCase()) {
      // 1. CARDIO EXERCISES
      case 'running':
        // Accurate Formula: Weight(kg) × Distance(km) × 1.0 (standard running calorie burn)
        const runningCals = userWeight * (params.distance || 0) * 1.0;
        return Math.round(runningCals);
      
      case 'skipping':
        // Formula: Time(min) × Weight(kg) × 0.12 (12 cal/min/kg for moderate skipping)
        const skippingCals = (params.time || 0) * userWeight * 0.12;
        return Math.round(skippingCals);
      
      case 'walking':
        // Formula: Steps × Weight(kg) × 0.00004 → FIXED: Steps × Weight(kg) × 0.00004 × 10
        // Correct: 0.04 kcal per step per kg = 5000 × 86 × 0.00004 × 10 = 172 kcal
        const walkingCals = (params.steps || 0) * userWeight * 0.0004;
        return Math.round(walkingCals);

      // 2. BODYWEIGHT EXERCISES
      case 'pushups':
        // Formula: Reps × Weight(kg) × 0.0025 (0.25% of body weight per rep)
        return Math.round((params.reps || 0) * userWeight * 0.0025);
      
      case 'squats':
        // Formula: Reps × Weight(kg) × 0.003 (0.3% of body weight per rep)
        return Math.round((params.reps || 0) * userWeight * 0.003);
      
      case 'crunches':
        // Formula: Reps × Weight(kg) × 0.002 (0.2% of body weight per rep)
        return Math.round((params.reps || 0) * userWeight * 0.002);

      // 3. WEIGHT EXERCISES
      case 'bench press':
        // Formula: Weight(kg) × Reps × 0.004 (more conservative)
        return Math.round((params.weight || 0) * (params.reps || 0) * 0.004);
      
      case 'deadlifts':
        // Formula: Weight(kg) × Reps × 0.005 (compound movement)
        return Math.round((params.weight || 0) * (params.reps || 0) * 0.005);
      
      case 'squats with weight':
        // Formula: Weight(kg) × Reps × 0.0045 (compound movement)
        return Math.round((params.weight || 0) * (params.reps || 0) * 0.0045);
      
      default:
        return 0;
    }
  };

  // Food calorie database
  const getFoodCalories = (food: string, quantity: number) => {
    const foodDb: { [key: string]: number } = {
      // Per unit calories
      'banana': 89,
      'apple': 95,
      'egg': 70,
      'bread slice': 80,
      'rice cup': 205,
      'chicken breast 100g': 165,
      'milk glass': 150,
      'orange': 62,
      'potato medium': 161,
      'pasta cup': 220
    };
    
    return (foodDb[food.toLowerCase()] || 0) * quantity;
  };

  // Load data on component mount
  useEffect(() => {
    loadTodayData();
    loadUserStats();
    loadAnalytics();
  }, []);

  // Save user stats when they change
  useEffect(() => {
    if (!isLoadingData) {
      handleSaveUserStats();
    }
  }, [userStats, currentWeight]);

  const loadTodayData = async () => {
    try {
      setIsLoadingData(true);
      const response = await getTodayActivities();
      if (response.success) {
        setDailyActivities(response.activities || []);
        setDailyTracking(response.dailyTracking);
        if (response.message) {
          setSystemStatus(response.message);
        }
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
        setUserStats(prev => ({
          ...prev,
          currentWeight: response.userStats.current_weight,
          targetWeight: response.userStats.target_weight,
          weeklyWeightLoss: response.userStats.weekly_weight_loss
        }));
        setCurrentWeight(response.userStats.current_weight);
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
    setCurrentWeight(newWeight);
    try {
      await saveWeight(newWeight);
    } catch (error) {
      console.error('Error saving weight:', error);
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
    return 10 * weight + 6.25 * userStats.height - 5 * userStats.age + 5;
  };

  // Simple maintenance calculation - Sedentary lifestyle (×1.2)
  const calculateMaintenance = (bmr: number) => {
    return bmr * 1.2; // Sedentary: Office job, no exercise
  };

  // Weekly weight loss calculations
  const caloriesPerKg = 7700; // Calories needed to lose 1kg of body fat (scientifically accurate)
  const weeklyCalorieDeficit = userStats.weeklyWeightLoss * caloriesPerKg;
  const dailyCalorieDeficit = weeklyCalorieDeficit / 7;

  // Calculate total weight loss needed and timeline
  const totalWeightLoss = currentWeight - userStats.targetWeight;
  const weeksNeeded = totalWeightLoss / userStats.weeklyWeightLoss;
  const monthsNeeded = weeksNeeded / 4.33;

  // BMR and maintenance calculations
  const bmr = calculateBMR(currentWeight);
  const maintenanceCalories = calculateMaintenance(bmr);
  const targetDailyCalories = maintenanceCalories - dailyCalorieDeficit;

  // Progress calculations
  const weightLostSoFar = userStats.currentWeight - currentWeight;
  const progressPercentage = (weightLostSoFar / totalWeightLoss) * 100;

  // Calculate daily totals
  const todayCaloriesFromExercise = dailyActivities.filter(a => a.type === 'exercise').reduce((sum, a) => sum + a.calories, 0);
  const todayCaloriesFromFood = dailyActivities.filter(a => a.type === 'food').reduce((sum, a) => sum + Math.abs(a.calories), 0);
  const todayNetCalories = dailyActivities.reduce((sum, a) => sum + a.calories, 0);
  
  // Updated daily numbers
  const todayMaintenanceCalories = maintenanceCalories + todayCaloriesFromExercise;
  const todayRemainingToEat = (targetDailyCalories + todayCaloriesFromExercise) - todayCaloriesFromFood;
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
      
      await addActivity('food', foodDescription, 'AI calculated', calories, 'ai_food', null, true);
      setLastLookup(`${foodDescription} = ${calories} calories`);
      setFoodDescription('');
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

  // Quick Exercise Add Component
  const QuickExerciseAdd = ({ addActivity, calculateExerciseCalories, currentWeight }: any) => {
    const [selectedExercise, setSelectedExercise] = useState('');
    const [exerciseParams, setExerciseParams] = useState<any>({});

    const exerciseCategories = {
      cardio: [
        { name: 'running', params: ['time', 'distance'], units: ['minutes', 'km'] },
        { name: 'skipping', params: ['time'], units: ['minutes'] },
        { name: 'walking', params: ['steps'], units: ['total steps'] }
      ],
      bodyweight: [
        { name: 'pushups', params: ['reps'], units: ['reps'] },
        { name: 'squats', params: ['reps'], units: ['reps'] },
        { name: 'crunches', params: ['reps'], units: ['reps'] }
      ],
      weights: [
        { name: 'bench press', params: ['weight', 'reps'], units: ['kg', 'reps'] },
        { name: 'deadlifts', params: ['weight', 'reps'], units: ['kg', 'reps'] },
        { name: 'squats with weight', params: ['weight', 'reps'], units: ['kg', 'reps'] }
      ]
    };

    const handleAddExercise = async () => {
      if (selectedExercise) {
        const calories = calculateExerciseCalories(selectedExercise, exerciseParams, currentWeight);
        const selectedEx = [...exerciseCategories.cardio, ...exerciseCategories.bodyweight, ...exerciseCategories.weights]
          .find(ex => ex.name === selectedExercise);
        
        const details = selectedEx?.params.map((param, index) => 
          `${exerciseParams[param] || 0} ${selectedEx.units[index]}`
        ).join(', ') || '';
        
        // Determine category based on exercise grouping
        let category = 'bodyweight';
        if (exerciseCategories.cardio.some(ex => ex.name === selectedExercise)) {
          category = 'cardio';
        } else if (exerciseCategories.weights.some(ex => ex.name === selectedExercise)) {
          category = 'weights';
        }
        
        await addActivity('exercise', selectedExercise, details, calories, category, exerciseParams);
        setSelectedExercise('');
        setExerciseParams({});
      }
    };

    const selectedExerciseData = [...exerciseCategories.cardio, ...exerciseCategories.bodyweight, ...exerciseCategories.weights]
      .find(ex => ex.name === selectedExercise);

    return (
      <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/50">
        <h3 className="font-semibold text-green-400 mb-3">💪 Add Exercise (Income)</h3>
        <div className="space-y-3">
          {/* Exercise Category Selection */}
          <div>
            <select
              value={selectedExercise}
              onChange={(e) => {
                setSelectedExercise(e.target.value);
                setExerciseParams({});
              }}
              className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-green-400 focus:ring-2 focus:ring-green-400/50"
            >
              <option value="">Select exercise...</option>
              
              <optgroup label="🏃 Cardio (Weight-Based)">
                {exerciseCategories.cardio.map(exercise => (
                  <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
                ))}
              </optgroup>
              
              <optgroup label="💪 Bodyweight (Weight-Based)">
                {exerciseCategories.bodyweight.map(exercise => (
                  <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
                ))}
              </optgroup>
              
              <optgroup label="🏋️ With Weights">
                {exerciseCategories.weights.map(exercise => (
                  <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          
          {/* Dynamic Parameter Inputs */}
          {selectedExerciseData && (
            <div className="space-y-2">
              <div className="text-xs text-green-400 mb-2">
                Your weight: {currentWeight}kg (used for calculation)
              </div>
              {selectedExerciseData.params.map((param, index) => (
                <div key={param} className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step={param === 'distance' ? '0.1' : '1'}
                    placeholder={`Enter ${param}`}
                    value={exerciseParams[param] || ''}
                    onChange={(e) => setExerciseParams((prev: any) => ({
                      ...prev,
                      [param]: Number(e.target.value)
                    }))}
                    className="flex-1 border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 placeholder-gray-400"
                  />
                  <span className="text-sm text-gray-300 min-w-fit">
                    {selectedExerciseData.units[index]}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={handleAddExercise}
            disabled={!selectedExercise || !selectedExerciseData?.params.every(param => exerciseParams[param] > 0)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 disabled:bg-gray-600 transition-colors"
          >
            Add Exercise
          </button>

          {selectedExercise && (
            <div className="text-xs text-gray-400">
              {selectedExercise === 'running' && '💡 Formula: Weight × Distance (1 cal/kg/km standard)'}
              {selectedExercise === 'skipping' && '💡 Formula: Time × Weight × 0.12 (12 cal/min/kg)'}
              {selectedExercise === 'walking' && '💡 Formula: Steps × Weight × 0.0004 (0.04 cal/step/kg)'}
              {(selectedExercise === 'pushups' || selectedExercise === 'squats' || selectedExercise === 'crunches') && 
                '💡 Formula: Reps × Your Weight × Small Factor'}
              {(selectedExercise === 'bench press' || selectedExercise === 'deadlifts' || selectedExercise === 'squats with weight') && 
                '💡 Formula: Weight × Reps × Small Factor'}
            </div>
          )}
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
              <h1 className="text-4xl font-bold text-white mb-2">
                💪 Workout & Weight Loss Tracker
              </h1>
              <p className="text-gray-300">
                Science-based approach to achieve your fitness goals
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
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

          {/* User Profile Display */}
          {userProfile && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-600/40 p-3 rounded-lg border border-purple-400/30">
                <div className="text-purple-300 text-sm">Weekly Goal</div>
                <div className="text-2xl font-bold text-purple-100">{userProfile.weeklyGoal}</div>
                <div className="text-purple-300 text-xs">kg/week Goal</div>
              </div>

              <div className="bg-yellow-600/40 p-3 rounded-lg border border-yellow-400/30">
                <div className="text-yellow-300 text-sm">Time to Goal</div>
                <div className="text-2xl font-bold text-yellow-100">{userProfile.monthsToGoal}</div>
                <div className="text-yellow-300 text-xs">Months to Goal</div>
                <div className="text-yellow-300/70 text-xs">Auto-calculated</div>
              </div>

              <div className="bg-gray-600/40 p-3 rounded-lg border border-gray-400/30">
                <div className="text-gray-300 text-sm">Current Weight</div>
                <div className="text-2xl font-bold text-gray-100">{userProfile.currentWeight}</div>
                <div className="text-gray-300 text-xs">kg</div>
              </div>

              <div className="bg-green-600/40 p-3 rounded-lg border border-green-400/30">
                <div className="text-green-300 text-sm">Age</div>
                <div className="text-2xl font-bold text-green-100">{userProfile.age}</div>
                <div className="text-green-300 text-xs">Years Old</div>
              </div>
            </div>
          )}
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

        {/* Current Weight Update */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">⚖️ Weight Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold text-gray-300 min-w-fit">Current Weight:</label>
              <input
                type="number"
                value={currentWeight}
                onChange={(e) => handleWeightUpdate(Number(e.target.value))}
                className="border border-gray-600 bg-gray-700 text-white rounded-lg px-4 py-2 text-lg font-semibold w-32 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                step="0.1"
              />
              <span className="text-lg text-gray-300">kg</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold text-gray-300 min-w-fit">Target Weight:</label>
              <input
                type="number"
                value={userStats.targetWeight}
                onChange={(e) => updateTargetWeight(Number(e.target.value))}
                className="border border-red-500/50 bg-gray-700 text-white rounded-lg px-4 py-2 text-lg font-semibold w-32 focus:border-red-400 focus:ring-2 focus:ring-red-400/50"
                step="0.1"
              />
              <span className="text-lg text-gray-300">kg</span>
            </div>
          </div>
        </div>

        {/* Daily Tracker - Money Balance Style */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">💰 Today's Calorie Balance (Money Style)</h2>
          
          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-900/50 rounded-lg p-4 text-center border border-blue-500/50">
              <div className="text-3xl font-bold text-blue-400">{todayRemainingToEat}</div>
              <div className="text-sm text-gray-300">💵 Balance (Can Eat)</div>
              <div className="text-xs text-gray-400">Target: {targetDailyCalories} - Food: {todayCaloriesFromFood}</div>
            </div>
            <div className="bg-green-900/50 rounded-lg p-4 text-center border border-green-500/50">
              <div className="text-2xl font-bold text-green-400">+{todayCaloriesFromExercise}</div>
              <div className="text-sm text-gray-300">💪 Exercise Earned</div>
              <div className="text-xs text-gray-400">Bonus calories from workouts</div>
            </div>
            <div className="bg-red-900/50 rounded-lg p-4 text-center border border-red-500/50">
              <div className="text-2xl font-bold text-red-400">-{todayCaloriesFromFood}</div>
              <div className="text-sm text-gray-300">🍽️ Food Spent</div>
              <div className="text-xs text-gray-400">Calories consumed today</div>
            </div>
            <div className="bg-purple-900/50 rounded-lg p-4 text-center border border-purple-500/50">
              <div className="text-2xl font-bold text-purple-400">{todayActualDeficit}</div>
              <div className="text-sm text-gray-300">🎯 Today's Deficit</div>
              <div className="text-xs text-gray-400">Actual deficit created</div>
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <QuickFoodAdd addActivity={addActivity} />
            <QuickExerciseAdd addActivity={addActivity} calculateExerciseCalories={calculateExerciseCalories} currentWeight={currentWeight} />
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
                        {activity.type === 'food' ? '🍽️' : '💪'} {activity.name}
                      </div>
                      <div className="text-sm text-gray-300">{activity.details}</div>
                      <div className="text-xs text-gray-400">
                        {activity.timestamp ? 
                          new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          'Just now'
                        }
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${
                      activity.type === 'food' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {activity.type === 'food' ? '-' : '+'}{Math.abs(activity.calories)}
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
            <div className="text-sm text-gray-300 space-y-2">
              <p><strong>Step 1:</strong> Your body burns <span className="font-semibold text-blue-400">{Math.round(bmr)} calories</span> just to survive</p>
              <p><strong>Step 2:</strong> With sedentary lifestyle, you burn <span className="font-semibold text-green-400">{Math.round(maintenanceCalories)} calories</span> per day</p>
              <p><strong>Step 3:</strong> To lose {userStats.weeklyWeightLoss}kg per week, you need <span className="font-semibold text-orange-400">{Math.round(weeklyCalorieDeficit)} calories</span> deficit per week</p>
              <p><strong>Step 4:</strong> So eat <span className="font-semibold text-red-400">{Math.round(targetDailyCalories)} calories</span> per day ({Math.round(maintenanceCalories)} - {Math.round(dailyCalorieDeficit)} = {Math.round(targetDailyCalories)})</p>
            </div>
            
            <div className="mt-4 p-3 bg-green-900/30 rounded-lg border-l-4 border-green-500">
              <h4 className="font-bold text-green-400 mb-2">💪 Exercise is BONUS!</h4>
              <p className="text-sm text-gray-300">
                Every workout burns extra calories on top of your {Math.round(maintenanceCalories)} maintenance calories. 
                This means you can either eat more food or lose weight faster than planned!
              </p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">📊 Progress Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400">{totalWeightLoss.toFixed(1)} kg</div>
              <div className="text-sm text-gray-300">Total Weight to Lose</div>
              <div className="text-xs text-gray-400">{currentWeight}kg → {userStats.targetWeight}kg</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">{weightLostSoFar.toFixed(1)} kg</div>
              <div className="text-sm text-gray-300">Weight Lost So Far</div>
              <div className="text-xs text-gray-400">Update current weight to track</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">{progressPercentage.toFixed(1)}%</div>
              <div className="text-sm text-gray-300">Progress Completed</div>
              <div className="text-xs text-gray-400">{Math.max(0, weeksNeeded - (weightLostSoFar / userStats.weeklyWeightLoss)).toFixed(1)} weeks remaining</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>



        {/* Analytics Section */}
        {analytics && (
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">📊 7-Day Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-lg p-4 border border-blue-500/50">
                <div className="text-2xl font-bold text-blue-400">{analytics.totalDays}</div>
                <div className="text-sm text-gray-300">Days Tracked</div>
              </div>
              <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-lg p-4 border border-red-500/50">
                <div className="text-2xl font-bold text-red-400">{analytics.deficit}</div>
                <div className="text-sm text-gray-300">Total Deficit (cal)</div>
              </div>
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-lg p-4 border border-green-500/50">
                <div className="text-2xl font-bold text-green-400">{analytics.predictedWeightLoss}kg</div>
                <div className="text-sm text-gray-300">Predicted Weight Loss</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-lg p-4 border border-purple-500/50">
                <div className="text-2xl font-bold text-purple-400">{analytics.weeklyAverage}</div>
                <div className="text-sm text-gray-300">Weekly Avg Deficit</div>
              </div>
            </div>
          </div>
        )}
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
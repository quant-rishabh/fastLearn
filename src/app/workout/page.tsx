'use client';

import { useState, useEffect } from 'react';
import React from 'react';

interface UserStats {
  currentWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  weeklyWeightLoss: number; // kg per week
}

export default function WorkoutPage() {
  // Calculate age from DOB (21/03/1999)
  const calculateAge = () => {
    const birthDate = new Date('1999-03-21');
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Dynamic user stats - can be changed in real-time
  const [userStats, setUserStats] = useState<UserStats>({
    currentWeight: 86,
    targetWeight: 68,
    height: 174,
    age: calculateAge(), // calculated from DOB 21/03/1999
    weeklyWeightLoss: 0.5 // kg per week
  });

  const [currentWeight, setCurrentWeight] = useState(86);

  // Daily tracking state
  const [dailyActivities, setDailyActivities] = useState<Array<{
    id: string;
    type: 'food' | 'exercise';
    name: string;
    details: string;
    calories: number;
    timestamp: Date;
  }>>([]);

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

  // Add activity function
  const addActivity = (type: 'food' | 'exercise', name: string, details: string, calories: number) => {
    const newActivity = {
      id: Date.now().toString(),
      type,
      name,
      details,
      calories: type === 'food' ? -calories : calories, // Food = negative, Exercise = positive
      timestamp: new Date()
    };
    setDailyActivities(prev => [...prev, newActivity]);
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
      
      addActivity('food', foodDescription, 'AI calculated', calories);
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

    const handleAddExercise = () => {
      if (selectedExercise) {
        const calories = calculateExerciseCalories(selectedExercise, exerciseParams, currentWeight);
        const selectedEx = [...exerciseCategories.cardio, ...exerciseCategories.bodyweight, ...exerciseCategories.weights]
          .find(ex => ex.name === selectedExercise);
        
        const details = selectedEx?.params.map((param, index) => 
          `${exerciseParams[param] || 0} ${selectedEx.units[index]}`
        ).join(', ') || '';
        
        addActivity('exercise', selectedExercise, details, calories);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            💪 Workout & Weight Loss Tracker
          </h1>
          <p className="text-gray-300">
            Science-based approach to achieve your fitness goals
          </p>
        </div>

        {/* User Profile Card */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">👤 Your Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{userStats.age}</div>
              <div className="text-sm text-gray-300">Years Old</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{userStats.height} cm</div>
              <div className="text-sm text-gray-300">Height</div>
            </div>
            <div className="text-center">
              <input
                type="number"
                value={userStats.weeklyWeightLoss}
                onChange={(e) => updateWeeklyWeightLoss(Number(e.target.value))}
                className="text-2xl font-bold text-orange-400 bg-transparent border-b-2 border-orange-500/50 focus:border-orange-400 outline-none text-center w-20 mx-auto"
                min="0.1"
                max="2"
                step="0.1"
              />
              <div className="text-sm text-gray-300">kg/week Goal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{monthsNeeded.toFixed(1)}</div>
              <div className="text-sm text-gray-300">Months to Goal</div>
              <div className="text-xs text-gray-400">Auto-calculated</div>
            </div>
          </div>
        </div>

        {/* Current Weight Update */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">⚖️ Weight Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold text-gray-300 min-w-fit">Current Weight:</label>
              <input
                type="number"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(Number(e.target.value))}
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
                        {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${
                      activity.type === 'food' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {activity.type === 'food' ? '-' : '+'}{Math.abs(activity.calories)}
                    </div>
                    <button
                      onClick={() => setDailyActivities(prev => prev.filter(a => a.id !== activity.id))}
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

        {/* Simple Step-by-Step Explanation */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl shadow-lg p-6 mb-6 border border-indigo-500/50">
          <h2 className="text-2xl font-semibold text-white mb-4">🔗 The Simple Truth - Step by Step</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 border border-blue-500/50">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-3">1</div>
              <h3 className="font-bold text-blue-400 mb-2">Survival Calories</h3>
              <p className="text-sm text-gray-300">
                Your body burns <span className="font-bold text-blue-400">{Math.round(bmr)} calories</span> daily just to stay alive.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 border border-green-500/50">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-3">2</div>
              <h3 className="font-bold text-green-400 mb-2">Daily Activities</h3>
              <p className="text-sm text-gray-300">
                Add basic movement = <span className="font-bold text-green-400">{Math.round(maintenanceCalories)} calories</span> total per day.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 border border-orange-500/50">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mb-3">3</div>
              <h3 className="font-bold text-orange-400 mb-2">Weekly Goal</h3>
              <p className="text-sm text-gray-300">
                Need <span className="font-bold text-orange-400">{Math.round(weeklyCalorieDeficit)} calories</span> deficit weekly for {userStats.weeklyWeightLoss}kg loss.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 border border-red-500/50">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold mb-3">4</div>
              <h3 className="font-bold text-red-400 mb-2">Daily Target</h3>
              <p className="text-sm text-gray-300">
                Eat <span className="font-bold text-red-400">{Math.round(targetDailyCalories)} calories</span> per day to reach goal.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-lg border border-green-500/50">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🎯</span>
              <p className="text-sm font-semibold text-gray-300">
                <strong>Bottom Line:</strong> Eat {Math.round(targetDailyCalories)} calories daily = automatic {userStats.weeklyWeightLoss}kg/week loss!
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Focus */}

        {/* Simple Explanation */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">🧠 Understanding Your Numbers (Simple Explanation)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/30 rounded-lg border-l-4 border-blue-400">
                <h3 className="font-bold text-blue-400 mb-2">1️⃣ BMR ({Math.round(bmr)} calories)</h3>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>What it is:</strong> Calories your body burns just to stay alive (breathing, heart beating, brain working)
                </p>
                <p className="text-xs text-gray-400">
                  <strong>Goes UP when:</strong> You weigh more, you're taller, you're younger<br/>
                  <strong>Goes DOWN when:</strong> You lose weight, you get older
                </p>
              </div>

              <div className="p-4 bg-green-900/30 rounded-lg border-l-4 border-green-400">
                <h3 className="font-bold text-green-400 mb-2">2️⃣ Maintenance ({Math.round(maintenanceCalories)} calories)</h3>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>What it is:</strong> BMR + basic daily activities (sedentary office job)
                </p>
                <p className="text-xs text-gray-400">
                  <strong>Fixed at:</strong> BMR × 1.2 (sedentary lifestyle)<br/>
                  <strong>Exercise calories:</strong> Added separately when you work out
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/30 rounded-lg border-l-4 border-red-400">
                <h3 className="font-bold text-red-400 mb-2">3️⃣ Weekly Goal ({Math.round(weeklyCalorieDeficit)} calories)</h3>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>What it is:</strong> Total calories you need to "miss" each week to lose {userStats.weeklyWeightLoss}kg
                </p>
                <p className="text-xs text-gray-400">
                  <strong>Formula:</strong> {userStats.weeklyWeightLoss}kg × 7700 cal/kg = {Math.round(weeklyCalorieDeficit)} cal/week<br/>
                  <strong>Daily:</strong> {Math.round(dailyCalorieDeficit)} cal/day average
                </p>
              </div>

              <div className="p-4 bg-orange-900/30 rounded-lg border-l-4 border-orange-400">
                <h3 className="font-bold text-orange-400 mb-2">4️⃣ Target ({Math.round(targetDailyCalories)} calories)</h3>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>What it is:</strong> How much you should eat per day to lose {userStats.weeklyWeightLoss}kg per week
                </p>
                <p className="text-xs text-gray-400">
                  <strong>Goes UP when:</strong> Higher weight, slower weight loss goal<br/>
                  <strong>Goes DOWN when:</strong> Lower weight, faster weight loss goal
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/50">
            <h3 className="font-bold text-orange-400 mb-2">🔗 The Simple Truth:</h3>
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

        {/* Weekly Focus */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">🎯 Weekly Weight Loss Focus</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/50">
              <div className="text-2xl font-bold text-red-400">{Math.round(dailyCalorieDeficit)}</div>
              <div className="text-sm text-gray-300">Daily Average Deficit</div>
              <div className="text-xs text-gray-400">Eat {Math.round(dailyCalorieDeficit)} cal less per day</div>
            </div>
            <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-500/50">
              <div className="text-2xl font-bold text-orange-400">{Math.round(weeklyCalorieDeficit)}</div>
              <div className="text-sm text-gray-300">Weekly Target Deficit</div>
              <div className="text-xs text-gray-400">= {userStats.weeklyWeightLoss}kg × 7700 cal/kg</div>
            </div>
            <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/50">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(weeklyCalorieDeficit * 4.33)}</div>
              <div className="text-sm text-gray-300">Monthly Target</div>
              <div className="text-xs text-gray-400">~{Math.round(userStats.weeklyWeightLoss * 4.33 * 10)/10}kg per month</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/50">
            <h3 className="font-bold text-green-400 mb-2">🎯 The Simple Rule:</h3>
            <p className="text-sm text-gray-300">
              <strong>Week Success = {Math.round(weeklyCalorieDeficit)} calories deficit total</strong><br/>
              You can achieve this through any combination of:
            </p>
            <ul className="text-sm text-gray-300 mt-2 space-y-1">
              <li>• Eating {Math.round(dailyCalorieDeficit)} fewer calories daily</li>
              <li>• Burning extra calories through exercise</li>
              <li>• Mix of both (e.g., eat 300 less + burn 200 = 500 deficit/day)</li>
            </ul>
          </div>
        </div>

        {/* Detailed Ways to Create Deficit */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">🔥 How to Increase Your Calorie Deficit</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Method 1: Exercise More */}
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-blue-500/50">
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">💪</span>
                <h3 className="text-xl font-bold text-blue-400">Method 1: Exercise More</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-200 mb-2">How It Works:</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Your body is like a car engine. More exercise = more fuel burned. 
                    But you keep eating the same amount of fuel (food), so your body 
                    uses stored fuel (fat) to make up the difference.
                  </p>
                  
                  <h4 className="font-semibold text-gray-200 mb-2">Practical Examples:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>30 min walk:</strong> Burns ~150-200 calories</li>
                    <li>• <strong>45 min gym session:</strong> Burns ~300-400 calories</li>
                    <li>• <strong>1 hour cycling:</strong> Burns ~400-500 calories</li>
                    <li>• <strong>Swimming 30 min:</strong> Burns ~250-350 calories</li>
                    <li>• <strong>Dancing 1 hour:</strong> Burns ~200-300 calories</li>
                  </ul>
                </div>

                <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/50">
                  <h4 className="font-semibold text-blue-400 mb-1">💡 Pro Tip:</h4>
                  <p className="text-sm text-blue-300">
                    Just 30 minutes of moderate exercise daily can burn an extra 
                    1,400-2,100 calories per week! That's almost 0.3kg of fat loss.
                  </p>
                </div>
              </div>
            </div>

            {/* Method 2: Eat Less */}
            <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-xl p-6 border border-red-500/50">
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">🍽️</span>
                <h3 className="text-xl font-bold text-red-400">Method 2: Eat Less</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-200 mb-2">How It Works:</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Think of your body like a bank account. You deposit less money (food) 
                    but your expenses (daily activities) stay the same. So your body 
                    withdraws from savings (fat stores) to pay the bills.
                  </p>
                  
                  <h4 className="font-semibold text-gray-200 mb-2">Easy Food Swaps:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• <strong>Skip 1 soda:</strong> Save ~150 calories</li>
                    <li>• <strong>Half portion rice:</strong> Save ~100-150 calories</li>
                    <li>• <strong>No oil cooking:</strong> Save ~100-200 calories</li>
                    <li>• <strong>Fruit instead of dessert:</strong> Save ~200-300 calories</li>
                    <li>• <strong>Water instead of juice:</strong> Save ~100-150 calories</li>
                  </ul>
                </div>

                <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/50">
                  <h4 className="font-semibold text-red-400 mb-1">💡 Pro Tip:</h4>
                  <p className="text-sm text-red-300">
                    Small food changes add up! Cutting just 100 calories daily 
                    = 700 calories/week = 0.1kg fat loss per week.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Combination Strategy */}
          <div className="mt-6 bg-gradient-to-r from-green-900/40 to-yellow-900/40 rounded-xl p-6 border border-green-500/50">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🎯</span>
              <h3 className="text-xl font-bold text-green-400">Best Strategy: Combine Both!</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-green-400 mb-2">Easy Mode</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Eat 200 cal less daily</li>
                  <li>• Walk 30 min (150 cal)</li>
                  <li>• <strong>Total: 350 cal/day</strong></li>
                  <li>• <strong>Weekly: 2,450 cal deficit</strong></li>
                </ul>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">Medium Mode</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Eat 300 cal less daily</li>
                  <li>• Exercise 45 min (300 cal)</li>
                  <li>• <strong>Total: 600 cal/day</strong></li>
                  <li>• <strong>Weekly: 4,200 cal deficit</strong></li>
                </ul>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-2">Beast Mode</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Eat 400 cal less daily</li>
                  <li>• Exercise 1 hour (400 cal)</li>
                  <li>• <strong>Total: 800 cal/day</strong></li>
                  <li>• <strong>Weekly: 5,600 cal deficit</strong></li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/50">
              <p className="text-sm text-gray-300 text-center">
                <strong>Remember:</strong> Your current goal needs <strong>{Math.round(weeklyCalorieDeficit)} calories deficit per week</strong>. 
                Choose any combination above that gets you close to this number!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
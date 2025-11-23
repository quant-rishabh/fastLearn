'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getCurrentUser, getUserProfile } from '@/utils/auth';
import { getAnalytics } from '@/utils/workoutDatabase';
import { getWeightProgress } from '@/utils/dailyWeight';

interface AnalyticsData {
  date: string;
  currentWeight: number;
  maintenanceCalories: number;
  targetDailyDeficit: number;
  targetCalories: number; // maintenance - target deficit
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  calorieBalance: number; // targetCalories - netCalories (positive = good deficit, negative = eating too much)
  bmr: number;
}

export default function WorkoutAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // Default 30 days
  const [currentWeight, setCurrentWeight] = useState(86);
  
  // User stats for calculations
  const [userStats, setUserStats] = useState({
    targetWeight: 68,
    height: 174,
    age: 25,
    weeklyWeightLoss: 0.5
  });

  // Load user profile from database (single source of truth)
  const loadUserProfileFromDB = async () => {
    try {
      console.log('📊 Loading user profile from database for analytics...');
      const response = await fetch('/api/workout/user-stats');
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Analytics - Database response:', result);
        
        if (result.success && result.userProfile) {
          const profile = result.userProfile;
          
          setUserProfile(profile);
          setUser({ username: 'user' }); // Simple user object
          
          // Load ALL profile data from database
          setUserStats({
            targetWeight: profile.target_weight || 68,
            height: profile.height || 174,
            age: profile.age || 25,
            weeklyWeightLoss: profile.weekly_weight_loss || 0.5
          });
          
          setCurrentWeight(profile.current_weight || 86);
          
          console.log('✅ Analytics loaded from database:');
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
    }
  };

  useEffect(() => {
    // Load user profile from database first
    loadUserProfileFromDB();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, dateRange]);

  // BMR calculation using Mifflin-St Jeor equation (for males)
  const calculateBMR = (weight: number) => {
    return 10 * weight + 6.25 * userStats.height - 5 * userStats.age + 5;
  };

  // Maintenance calories (sedentary lifestyle)
  const calculateMaintenance = (bmr: number) => {
    return bmr * 1.2;
  };

  // Calculate target daily calorie deficit
  const calculateTargetDailyDeficit = () => {
    const caloriesPerKg = 7700;
    const weeklyCalorieDeficit = userStats.weeklyWeightLoss * caloriesPerKg;
    return weeklyCalorieDeficit / 7;
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch real data from the API
      const response = await fetch(`/api/workout/analytics?days=${dateRange}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.analytics) {
          console.log('✅ API Analytics data loaded:', result);
          console.log('✅ First row structure:', result.analytics[0]);
          setAnalyticsData(result.analytics);
          
          // Don't override profile data - analytics API uses old user_stats table
          // Profile data from user_profile table is the single source of truth
          console.log('📊 Analytics API userStats (ignored):', result.userStats);
          console.log('📊 Using profile data instead:', userStats);
        } else {
          console.error('❌ Invalid API response:', result);
          console.log('🔄 Falling back to mock data...');
          // Fallback to mock data if API fails
          await loadMockData();
        }
      } else {
        console.error('❌ API request failed:', response.status);
        console.log('🔄 Falling back to mock data...');
        // Fallback to mock data if API fails
        await loadMockData();
      }
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      console.log('🔄 Falling back to mock data...');
      // Fallback to mock data if API fails
      await loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback mock data function
  const loadMockData = async () => {
    console.log('📝 Generating mock data...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - dateRange);
    
    const analytics: AnalyticsData[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      const mockWeight = currentWeight + Math.random() * 2 - 1;
      const bmr = calculateBMR(mockWeight);
      const maintenance = calculateMaintenance(bmr);
      const targetDeficit = calculateTargetDailyDeficit();
      const targetCals = maintenance - targetDeficit;
      
      const mockCaloriesConsumed = 1800 + Math.random() * 600 - 300;
      const mockCaloriesBurned = Math.random() * 400;
      const netCalories = mockCaloriesConsumed - mockCaloriesBurned;
      const balance = targetCals - netCalories; // positive = good deficit, negative = eating too much
      
      analytics.push({
        date: dateStr,
        currentWeight: mockWeight,
        maintenanceCalories: maintenance,
        targetDailyDeficit: targetDeficit,
        targetCalories: targetCals,
        caloriesConsumed: mockCaloriesConsumed,
        caloriesBurned: mockCaloriesBurned,
        netCalories: netCalories,
        calorieBalance: balance,
        bmr: bmr
      });
    }
    
    console.log('📝 Mock data generated:', analytics.length, 'days');
    console.log('📝 First mock row:', analytics[0]);
    setAnalyticsData(analytics.reverse());
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin h-12 w-12 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/60 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                📊 Detailed Analytics
              </h1>
              <p className="text-gray-300">
                Comprehensive weight and calorie tracking data
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              
              <button
                onClick={() => loadAnalyticsData()}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Loading...
                  </>
                ) : (
                  <>🔄 Refresh Data</>
                )}
              </button>
              
              <button
                onClick={() => router.push('/workout')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to Tracker
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-900/50 rounded-lg p-4 text-center border border-blue-500/50">
              <div className="text-2xl font-bold text-blue-400">{currentWeight.toFixed(1)} kg</div>
              <div className="text-sm text-gray-300">Current Weight</div>
            </div>
            <div className="bg-green-900/50 rounded-lg p-4 text-center border border-green-500/50">
              <div className="text-2xl font-bold text-green-400">{calculateTargetDailyDeficit().toFixed(0)}</div>
              <div className="text-sm text-gray-300">Target Daily Deficit</div>
            </div>
            <div className="bg-purple-900/50 rounded-lg p-4 text-center border border-purple-500/50">
              <div className="text-2xl font-bold text-purple-400">{userStats.targetWeight} kg</div>
              <div className="text-sm text-gray-300">Target Weight</div>
            </div>
            <div className="bg-orange-900/50 rounded-lg p-4 text-center border border-orange-500/50">
              <div className="text-2xl font-bold text-orange-400">{userStats.weeklyWeightLoss} kg/week</div>
              <div className="text-sm text-gray-300">Target Loss Rate</div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-gray-800/60 rounded-lg p-6 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-white mb-6">📋 Daily Tracking Data</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mr-4"></div>
              <span className="text-white">Loading data...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white border-collapse">
                <thead className="bg-gray-700/80 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold text-gray-300 border-b border-gray-600 min-w-[100px]">Date</th>
                    <th className="px-3 py-3 text-center font-semibold text-blue-400 border-b border-gray-600 min-w-[80px]">Current<br/><span className="text-xs font-normal">Weight (kg)</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-pink-400 border-b border-gray-600 min-w-[80px]">Weekly Goal<br/><span className="text-xs font-normal">(kg/week)</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-indigo-400 border-b border-gray-600 min-w-[90px]">Maintenance<br/><span className="text-xs font-normal">Calories</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-green-400 border-b border-gray-600 min-w-[90px]">Target Daily<br/><span className="text-xs font-normal">Deficit</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-purple-400 border-b border-gray-600 min-w-[90px]">💵 Balance<br/><span className="text-xs font-normal">(Can Eat)</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-orange-400 border-b border-gray-600 min-w-[80px]">Food<br/><span className="text-xs font-normal">Consumed</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-cyan-400 border-b border-gray-600 min-w-[80px]">Exercise<br/><span className="text-xs font-normal">Burned</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-red-400 border-b border-gray-600 min-w-[80px]">Deficit<br/><span className="text-xs font-normal">Created</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-green-400 border-b border-gray-600 min-w-[90px]">Expected<br/><span className="text-xs font-normal">Weight (kg)</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {analyticsData.map((row, index) => (
                    <tr key={row.date} className={`${
                      index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-700/30'
                    } hover:bg-gray-600/40 transition-colors`}>
                      <td className="px-3 py-2 font-medium text-gray-300 border-r border-gray-700/50">
                        <div className="text-sm">
                          {new Date(row.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(row.date).toLocaleDateString('en-US', { 
                            weekday: 'short'
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-blue-400 font-semibold border-r border-gray-700/50">
                        {row.currentWeight.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center text-pink-400 font-semibold border-r border-gray-700/50">
                        {userStats.weeklyWeightLoss}
                      </td>
                      <td className="px-3 py-2 text-center text-indigo-400 text-xs border-r border-gray-700/50">
                        {row.maintenanceCalories.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium border-r border-gray-700/50">
                        -{row.targetDailyDeficit.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-purple-400 font-medium border-r border-gray-700/50">
                        <div className="text-sm font-semibold">
                          {(row.targetCalories - row.caloriesConsumed).toFixed(0)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-orange-400 border-r border-gray-700/50">
                        {row.caloriesConsumed.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-cyan-400 border-r border-gray-700/50">
                        {row.caloriesBurned.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold border-r border-gray-700/50">
                        {(() => {
                          const actualDeficit = row.maintenanceCalories - row.caloriesConsumed + row.caloriesBurned;
                          return (
                            <div className={`px-2 py-1 rounded text-xs ${
                              actualDeficit > 0 
                                ? 'bg-green-900/50 text-green-400' 
                                : 'bg-red-900/50 text-red-400'
                            }`}>
                              {actualDeficit > 0 ? '+' : ''}{actualDeficit.toFixed(0)}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium">
                        {(() => {
                          const actualDeficit = row.maintenanceCalories - row.caloriesConsumed + row.caloriesBurned;
                          return (row.currentWeight - (actualDeficit / 7700)).toFixed(1);
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Statistics */}
          {analyticsData.length > 0 && (
            <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">📈 Period Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.targetDailyDeficit, 0))}
                  </div>
                  <div className="text-gray-300">Total Target Deficit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.calorieBalance, 0))}
                  </div>
                  <div className="text-gray-300">Total Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.caloriesConsumed, 0))}
                  </div>
                  <div className="text-gray-300">Total Food Consumed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.caloriesBurned, 0))}
                  </div>
                  <div className="text-gray-300">Total Exercise Burned</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explanation Section */}
        <div className="bg-gray-800/60 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-semibold text-white mb-4">📚 Column Explanations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><span className="text-blue-400 font-semibold">Current Weight:</span> Your recorded weight for that day</p>
              <p><span className="text-indigo-400 font-semibold">Maintenance:</span> BMR × 1.2 (calories needed to maintain weight)</p>
              <p><span className="text-green-400 font-semibold">Target Daily Deficit:</span> Calories you should deficit to meet weekly goal</p>
              <p><span className="text-purple-400 font-semibold">💵 Balance (Can Eat):</span> Target calories - Food consumed</p>
              <p><span className="text-orange-400 font-semibold">Food Consumed:</span> Total calories eaten that day</p>
            </div>
            <div className="space-y-2">
              <p><span className="text-cyan-400 font-semibold">Exercise Burned:</span> Calories burned through exercise</p>
              <p><span className="text-red-400 font-semibold">Deficit Created:</span> Maintenance - Food + Exercise (actual calorie deficit)</p>
              <p><span className="text-green-400 font-semibold">Expected Weight:</span> Projected weight based on calorie deficit (1kg = 7700 calories)</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/50">
            <h4 className="font-bold text-orange-400 mb-2">🔍 Key Insights:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Positive Deficit (+):</strong> You're creating a deficit - good for weight loss!</li>
              <li>• <strong>Negative Deficit (-):</strong> You're eating more than target - might slow weight loss</li>
              <li>• <strong>💵 Balance Shows:</strong> How many calories you can still eat to stay on target</li>
              <li>• <strong>Expected Weight:</strong> Shows theoretical weight if the deficit continues (7700 calories = 1kg loss)</li>
              <li>• <strong>Target Daily Deficit:</strong> Based on your weekly weight loss goal (0.5kg/week = ~550 cal/day)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
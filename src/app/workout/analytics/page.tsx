'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getCurrentUser, getUserProfile } from '@/utils/auth';
import { getAnalytics } from '@/utils/workoutDatabase';
import { getWeightProgress } from '@/utils/dailyWeight';

interface AnalyticsData {
  date: string;
  currentWeight: number;
  expectedCalorieDeficit: number;
  realCalorieDeficit: number;
  theoreticalWeightFromRealDeficit: number;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  bmr: number;
  maintenanceCalories: number;
  targetCalories: number;
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
      
      // Load profile settings
      setUserStats({
        targetWeight: profile.targetWeight || 68,
        height: profile.height || 174,
        age: profile.age || 25,
        weeklyWeightLoss: profile.weeklyGoal || 0.5
      });
      
      // Load current weight
      const initialWeight = profile.currentWeight || 86;
      setCurrentWeight(initialWeight);
    }
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

  // Calculate expected daily calorie deficit
  const calculateExpectedDeficit = () => {
    const caloriesPerKg = 7700;
    const weeklyCalorieDeficit = userStats.weeklyWeightLoss * caloriesPerKg;
    return weeklyCalorieDeficit / 7;
  };

  // Calculate theoretical weight loss from actual deficit
  const calculateTheoreticalWeight = (startWeight: number, actualDeficit: number, days: number) => {
    const caloriesPerKg = 7700;
    const totalDeficit = actualDeficit * days;
    const kgLost = totalDeficit / caloriesPerKg;
    return startWeight - kgLost;
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch real data from the API
      const response = await fetch(`/api/workout/analytics?days=${dateRange}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.analytics) {
          console.log('Analytics data loaded:', result);
          setAnalyticsData(result.analytics);
          
          // Update user stats from API response
          if (result.userStats) {
            setUserStats(prev => ({
              ...prev,
              targetWeight: result.userStats.target_weight || prev.targetWeight,
              height: result.userStats.height || prev.height,
              age: result.userStats.age || prev.age,
              weeklyWeightLoss: result.userStats.weekly_weight_loss || prev.weeklyWeightLoss
            }));
            setCurrentWeight(result.userStats.current_weight || currentWeight);
          }
        } else {
          console.error('Invalid API response:', result);
          // Fallback to mock data if API fails
          await loadMockData();
        }
      } else {
        console.error('API request failed:', response.status);
        // Fallback to mock data if API fails
        await loadMockData();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Fallback to mock data if API fails
      await loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback mock data function
  const loadMockData = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - dateRange);
    
    const analytics: AnalyticsData[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      const mockWeight = currentWeight + Math.random() * 2 - 1;
      const bmr = calculateBMR(mockWeight);
      const maintenance = calculateMaintenance(bmr);
      const expectedDeficit = calculateExpectedDeficit();
      
      const mockCaloriesConsumed = 1800 + Math.random() * 600 - 300;
      const mockCaloriesBurned = Math.random() * 400;
      const netCalories = mockCaloriesConsumed - mockCaloriesBurned;
      const realDeficit = maintenance - netCalories;
      
      const theoreticalWeight = calculateTheoreticalWeight(
        currentWeight, 
        realDeficit, 
        Math.floor((endDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      );
      
      analytics.push({
        date: dateStr,
        currentWeight: mockWeight,
        expectedCalorieDeficit: expectedDeficit,
        realCalorieDeficit: realDeficit,
        theoreticalWeightFromRealDeficit: theoreticalWeight,
        caloriesConsumed: mockCaloriesConsumed,
        caloriesBurned: mockCaloriesBurned,
        netCalories: netCalories,
        bmr: bmr,
        maintenanceCalories: maintenance,
        targetCalories: maintenance - expectedDeficit
      });
    }
    
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
              <div className="text-2xl font-bold text-green-400">{calculateExpectedDeficit().toFixed(0)}</div>
              <div className="text-sm text-gray-300">Expected Daily Deficit</div>
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
                    <th className="px-3 py-3 text-center font-semibold text-blue-400 border-b border-gray-600 min-w-[80px]">Weight<br/><span className="text-xs font-normal">(kg)</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-green-400 border-b border-gray-600 min-w-[90px]">Expected<br/><span className="text-xs font-normal">Deficit</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-red-400 border-b border-gray-600 min-w-[80px]">Real<br/><span className="text-xs font-normal">Deficit</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-purple-400 border-b border-gray-600 min-w-[90px]">Theoretical<br/><span className="text-xs font-normal">Weight</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-orange-400 border-b border-gray-600 min-w-[80px]">Food<br/><span className="text-xs font-normal">Consumed</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-cyan-400 border-b border-gray-600 min-w-[80px]">Exercise<br/><span className="text-xs font-normal">Burned</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-yellow-400 border-b border-gray-600 min-w-[80px]">Net<br/><span className="text-xs font-normal">Calories</span></th>
                    <th className="px-3 py-3 text-center font-semibold text-pink-400 border-b border-gray-600 min-w-[70px]">BMR</th>
                    <th className="px-3 py-3 text-center font-semibold text-indigo-400 border-b border-gray-600 min-w-[90px]">Maintenance</th>
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
                      <td className="px-3 py-2 text-center text-green-400 font-medium border-r border-gray-700/50">
                        -{row.expectedCalorieDeficit.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold border-r border-gray-700/50">
                        <div className={`px-2 py-1 rounded text-xs ${
                          row.realCalorieDeficit > 0 
                            ? 'bg-green-900/50 text-green-400' 
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {row.realCalorieDeficit > 0 ? '-' : '+'}{Math.abs(row.realCalorieDeficit).toFixed(0)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-purple-400 font-medium border-r border-gray-700/50">
                        {row.theoreticalWeightFromRealDeficit.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center text-orange-400 border-r border-gray-700/50">
                        {row.caloriesConsumed.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-cyan-400 border-r border-gray-700/50">
                        {row.caloriesBurned.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-yellow-400 border-r border-gray-700/50">
                        {row.netCalories.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-pink-400 text-xs border-r border-gray-700/50">
                        {row.bmr.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-center text-indigo-400 text-xs">
                        {row.maintenanceCalories.toFixed(0)}
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
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.expectedCalorieDeficit, 0))}
                  </div>
                  <div className="text-gray-300">Total Expected Deficit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0))}
                  </div>
                  <div className="text-gray-300">Total Real Deficit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {(analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0) / 7700).toFixed(2)}kg
                  </div>
                  <div className="text-gray-300">Projected Weight Loss</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round(analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0) / analyticsData.length)}
                  </div>
                  <div className="text-gray-300">Avg Daily Deficit</div>
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
              <p><span className="text-blue-400 font-semibold">Weight:</span> Your recorded weight for that day</p>
              <p><span className="text-green-400 font-semibold">Expected Deficit:</span> Calories you should deficit to meet weekly goal</p>
              <p><span className="text-red-400 font-semibold">Real Deficit:</span> Actual calorie deficit achieved (maintenance - net calories)</p>
              <p><span className="text-purple-400 font-semibold">Theoretical Weight:</span> What your weight should be based on real deficit</p>
              <p><span className="text-orange-400 font-semibold">Consumed:</span> Total calories eaten that day</p>
            </div>
            <div className="space-y-2">
              <p><span className="text-cyan-400 font-semibold">Burned:</span> Calories burned through exercise</p>
              <p><span className="text-yellow-400 font-semibold">Net Calories:</span> Consumed - Burned = Net intake</p>
              <p><span className="text-pink-400 font-semibold">BMR:</span> Basal Metabolic Rate (calories to survive)</p>
              <p><span className="text-indigo-400 font-semibold">Maintenance:</span> BMR × 1.2 (sedentary lifestyle calories)</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/50">
            <h4 className="font-bold text-orange-400 mb-2">🔍 Key Insights:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Green Real Deficit:</strong> You're on track or ahead of your weight loss goal</li>
              <li>• <strong>Red Real Deficit:</strong> You're eating more than your maintenance (weight gain)</li>
              <li>• <strong>Theoretical vs Actual Weight:</strong> Shows if your calorie tracking is accurate</li>
              <li>• <strong>BMR Changes:</strong> As you lose weight, BMR decreases (need fewer calories)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
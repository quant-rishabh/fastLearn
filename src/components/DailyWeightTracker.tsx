'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  getWeightProgress, 
  updateTodaysWeight, 
  deleteTodaysWeightEntry,
  getTodayDateString,
  getWeightChartData,
  getTimeUntilMidnight,
  hasPassedMidnight,
  generateSampleWeightData,
  DailyWeightEntry
} from '@/utils/dailyWeight';

interface DailyWeightTrackerProps {
  userId: string;
  targetWeight?: number;
  onWeightUpdate?: (weight: number) => void;
  className?: string;
}

export const DailyWeightTracker: React.FC<DailyWeightTrackerProps> = ({ 
  userId, 
  targetWeight = 68,
  onWeightUpdate,
  className = ""
}) => {
  const [weight, setWeight] = useState<string>('');
  const [todaysEntry, setTodaysEntry] = useState<DailyWeightEntry | null>(null);
  const [canUpdate, setCanUpdate] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chartData, setChartData] = useState<Array<any>>([]);
  const [showChart, setShowChart] = useState<boolean>(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<{hours: number; minutes: number; seconds: number} | null>(null);
  const [isEntryLocked, setIsEntryLocked] = useState<boolean>(false);

  // Load today's weight entry and chart data on component mount
  useEffect(() => {
    loadTodaysWeight();
    loadChartData();
    
    // Update time until midnight every second
    const timer = setInterval(() => {
      setTimeUntilMidnight(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(timer);
  }, [userId]);

  // Check if entry is locked when todaysEntry changes
  useEffect(() => {
    if (todaysEntry) {
      setIsEntryLocked(hasPassedMidnight(todaysEntry.timestamp));
    } else {
      setIsEntryLocked(false);
    }
  }, [todaysEntry]);

  const loadTodaysWeight = () => {
    const progress = getWeightProgress(userId);
    setTodaysEntry(progress.todaysEntry || null);
    setCanUpdate(progress.canUpdateToday);
    
    if (progress.todaysEntry) {
      setWeight(progress.todaysEntry.weight.toString());
    } else {
      setWeight('');
    }
  };

  const loadChartData = () => {
    const data = getWeightChartData(userId, 30);
    
    // Add target weight line to all data points
    const enhancedData = data.map(item => ({
      ...item,
      target: targetWeight
    }));
    
    setChartData(enhancedData);
    setShowChart(data.length > 0);
  };

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);

    const weightValue = parseFloat(weight);
    
    // Validation
    if (isNaN(weightValue) || weightValue <= 0) {
      setMessage('Please enter a valid weight');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    if (weightValue < 20 || weightValue > 300) {
      setMessage('Weight must be between 20kg and 300kg');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    try {
      const result = updateTodaysWeight(userId, weightValue);
      
      if (result.success) {
        setMessage(result.message);
        setIsError(false);
        setTodaysEntry(result.entry || null);
        setCanUpdate(false); // Can't update again today
        
        // Reload chart data
        loadChartData();
        
        // Notify parent component with new weight
        if (onWeightUpdate) {
          onWeightUpdate(weightValue);
        }
      } else {
        setMessage(result.message);
        setIsError(true);
      }
    } catch (error) {
      setMessage('An error occurred while saving your weight');
      setIsError(true);
    }

    setIsLoading(false);
  };

  const handleDeleteEntry = () => {
    if (!todaysEntry) return;
    
    const result = deleteTodaysWeightEntry(userId);
    
    if (result.success) {
      setMessage(result.message);
      setIsError(false);
      setTodaysEntry(null);
      setCanUpdate(true);
      setWeight('');
      
      // Reload chart data
      loadChartData();
      
      // Get updated current weight after deletion
      const updatedProgress = getWeightProgress(userId);
      
      // Notify parent component with updated weight
      if (onWeightUpdate) {
        onWeightUpdate(updatedProgress.currentWeight);
      }
    } else {
      setMessage(result.message);
      setIsError(true);
    }
  };

  const handleGenerateSampleData = () => {
    const success = generateSampleWeightData(userId, 86, targetWeight, 14);
    if (success) {
      setMessage('Sample weight data generated for the last 14 days!');
      setIsError(false);
      loadChartData();
    } else {
      setMessage('Failed to generate sample data.');
      setIsError(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWeightTrend = () => {
    if (chartData.length < 2) return null;
    
    const recent = chartData.slice(-7); // Last 7 entries
    if (recent.length < 2) return null;
    
    const firstWeight = recent[0].weight;
    const lastWeight = recent[recent.length - 1].weight;
    const difference = lastWeight - firstWeight;
    
    return {
      difference: difference,
      isLosing: difference < 0,
      isGaining: difference > 0,
      weeklyRate: (difference / recent.length) * 7 // Estimate weekly rate
    };
  };

  const getProgressToTarget = () => {
    if (!todaysEntry || !targetWeight) return null;
    
    const currentWeight = todaysEntry.weight;
    const totalToLose = Math.abs(currentWeight - targetWeight);
    const remaining = Math.abs(currentWeight - targetWeight);
    const progress = totalToLose > 0 ? ((totalToLose - remaining) / totalToLose) * 100 : 100;
    
    return {
      current: currentWeight,
      target: targetWeight,
      remaining: remaining,
      progress: Math.max(0, progress)
    };
  };

  const todayDate = getTodayDateString();
  const weightTrend = getWeightTrend();
  const progressData = getProgressToTarget();

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{`Date: ${label}`}</p>
          <p className="text-blue-400 font-semibold">
            {`Weight: ${payload[0].value} kg`}
          </p>
          {payload[1] && (
            <p className="text-red-400 text-sm">
              {`Target: ${payload[1].value} kg`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">⚖️ Daily Weight Tracking</h2>
        <div className="text-sm text-gray-400">
          {formatDate(todayDate)}
        </div>
      </div>

      {/* Current Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Current Weight */}
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 p-4 rounded-lg border border-blue-500/50">
          <div className="text-blue-300 text-sm font-medium">Current Weight</div>
          <div className="text-3xl font-bold text-blue-100">
            {todaysEntry ? `${todaysEntry.weight} kg` : '--'}
          </div>
          <div className="text-blue-300/70 text-xs mt-1">
            {todaysEntry ? 'Recorded today' : 'Not recorded today'}
          </div>
        </div>

        {/* Target Weight */}
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 p-4 rounded-lg border border-green-500/50">
          <div className="text-green-300 text-sm font-medium">Target Weight</div>
          <div className="text-3xl font-bold text-green-100">{targetWeight} kg</div>
          {progressData && (
            <div className="text-green-300/70 text-xs mt-1">
              {progressData.remaining.toFixed(1)} kg to go
            </div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className={`bg-gradient-to-br p-4 rounded-lg border ${
          !weightTrend ? 'from-gray-700/50 to-gray-600/50 border-gray-500/50' :
          weightTrend.isLosing ? 'from-green-900/50 to-green-800/50 border-green-500/50' :
          weightTrend.isGaining ? 'from-red-900/50 to-red-800/50 border-red-500/50' :
          'from-yellow-900/50 to-yellow-800/50 border-yellow-500/50'
        }`}>
          <div className={`text-sm font-medium ${
            !weightTrend ? 'text-gray-300' :
            weightTrend.isLosing ? 'text-green-300' :
            weightTrend.isGaining ? 'text-red-300' :
            'text-yellow-300'
          }`}>
            7-Day Trend
          </div>
          <div className={`text-3xl font-bold ${
            !weightTrend ? 'text-gray-100' :
            weightTrend.isLosing ? 'text-green-100' :
            weightTrend.isGaining ? 'text-red-100' :
            'text-yellow-100'
          }`}>
            {weightTrend ? (
              <>
                {weightTrend.difference > 0 ? '+' : ''}
                {weightTrend.difference.toFixed(1)} kg
              </>
            ) : '--'}
          </div>
          <div className={`text-xs mt-1 ${
            !weightTrend ? 'text-gray-300/70' :
            weightTrend.isLosing ? 'text-green-300/70' :
            weightTrend.isGaining ? 'text-red-300/70' :
            'text-yellow-300/70'
          }`}>
            {weightTrend ? (
              <>
                {weightTrend.isLosing ? '📉 Losing' : 
                 weightTrend.isGaining ? '📈 Gaining' : '➡️ Stable'}
              </>
            ) : 'Need more data'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progressData && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Progress to Target</span>
            <span className="text-sm text-blue-400">{progressData.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressData.progress, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {progressData.remaining.toFixed(1)} kg remaining to reach {targetWeight} kg
          </div>
        </div>
      )}

      {/* Today's Weight Entry Status */}
      {todaysEntry ? (
        <div className={`mb-6 p-4 rounded-lg border ${
          isEntryLocked 
            ? 'bg-blue-900/30 border-blue-500/50' 
            : 'bg-green-900/30 border-green-500/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`font-semibold ${isEntryLocked ? 'text-blue-400' : 'text-green-400'}`}>
                {isEntryLocked ? '🔒 Weight Entry Locked' : '✅ Today\'s Weight Recorded'}
              </div>
              <div className={`text-2xl font-bold mt-1 ${isEntryLocked ? 'text-blue-300' : 'text-green-300'}`}>
                {todaysEntry.weight} kg
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Recorded at {new Date(todaysEntry.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              {isEntryLocked && (
                <div className="text-xs text-blue-300 mt-2">
                  Entry is locked after midnight. You can create a new entry today.
                </div>
              )}
              {!isEntryLocked && timeUntilMidnight && (
                <div className="text-xs text-yellow-300 mt-2">
                  ⏰ Locks in: {timeUntilMidnight.hours}h {timeUntilMidnight.minutes}m {timeUntilMidnight.seconds}s
                </div>
              )}
            </div>
            {!isEntryLocked && (
              <button
                onClick={handleDeleteEntry}
                className="text-red-400 hover:text-red-300 text-sm px-3 py-2 border border-red-500/50 rounded-lg hover:bg-red-900/20 transition-colors"
              >
                🗑️ Delete Today's Entry
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
          <div className="text-yellow-400 font-semibold">📝 No Weight Recorded Today</div>
          <div className="text-sm text-gray-300 mt-1">
            Record your weight once per day to track your progress. Best time is in the morning before eating.
          </div>
        </div>
      )}

      {/* Weight Input Form */}
      {(canUpdate && !isEntryLocked) && (
        <form onSubmit={handleWeightSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Weight (kg)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter your current weight"
                step="0.1"
                min="20"
                max="300"
                className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-lg font-semibold focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 placeholder-gray-400"
                disabled={isLoading}
                required
              />
              <span className="text-lg text-gray-300 font-medium">kg</span>
            </div>
            {timeUntilMidnight && !isEntryLocked && (
              <div className="text-xs text-yellow-400 mt-2">
                ⏰ You can modify this entry until midnight (in {timeUntilMidnight.hours}h {timeUntilMidnight.minutes}m {timeUntilMidnight.seconds}s)
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !weight}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving Weight...
              </div>
            ) : (
              todaysEntry ? 'Update Today\'s Weight' : 'Record Today\'s Weight'
            )}
          </button>
        </form>
      )}

      {/* Info Message for Non-Update */}
      {((canUpdate && isEntryLocked) || (!canUpdate && !todaysEntry)) && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
          <div className="text-blue-400 font-semibold">
            {isEntryLocked ? '🔒 Entry Locked Until Tomorrow' : 'ℹ️ New Day Available'}
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {isEntryLocked 
              ? 'Your weight entry is locked after midnight. You can create a new entry for today above.'
              : 'You can record your weight once per day. The entry becomes permanent after midnight (12:00 AM). Come back tomorrow for a new entry!'
            }
          </div>
          {timeUntilMidnight && !isEntryLocked && (
            <div className="text-xs text-yellow-300 mt-2">
              Next entry available in: {timeUntilMidnight.hours}h {timeUntilMidnight.minutes}m {timeUntilMidnight.seconds}s
            </div>
          )}
        </div>
      )}

      {/* Success/Error Messages */}
      {message && (
        <div className={`mb-6 p-3 rounded-lg ${
          isError 
            ? 'bg-red-900/30 border border-red-500/50 text-red-400' 
            : 'bg-green-900/30 border border-green-500/50 text-green-400'
        }`}>
          <div className="text-sm font-medium">
            {isError ? '❌' : '✅'} {message}
          </div>
        </div>
      )}

      {/* Weight Progress Chart */}
      {showChart && chartData.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Weight Progress (Last 30 Days)</h3>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Weight Area */}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#colorWeight)"
                  name="Weight (kg)"
                  connectNulls={false}
                />
                
                {/* Target Weight Line */}
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target Weight (kg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-700/50 p-3 rounded-lg text-center">
              <div className="text-gray-300 text-xs">Entries</div>
              <div className="text-white font-semibold">{chartData.length}</div>
            </div>
            {chartData.length > 0 && (
              <>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <div className="text-gray-300 text-xs">Highest</div>
                  <div className="text-white font-semibold">
                    {Math.max(...chartData.map(d => d.weight)).toFixed(1)} kg
                  </div>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <div className="text-gray-300 text-xs">Lowest</div>
                  <div className="text-white font-semibold">
                    {Math.min(...chartData.map(d => d.weight)).toFixed(1)} kg
                  </div>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                  <div className="text-gray-300 text-xs">Total Change</div>
                  <div className={`font-semibold ${
                    (chartData[chartData.length - 1]?.weight || 0) - (chartData[0]?.weight || 0) < 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {((chartData[chartData.length - 1]?.weight || 0) - (chartData[0]?.weight || 0)).toFixed(1)} kg
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!showChart && (
        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg text-center">
          <div className="text-gray-400">📊</div>
          <div className="text-sm text-gray-300 mt-2 mb-4">
            Start tracking your weight daily to see your progress chart here!
          </div>
          <button
            onClick={handleGenerateSampleData}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            🎯 Generate Sample Data (Demo)
          </button>
          <div className="text-xs text-gray-400 mt-2">
            Creates 14 days of realistic weight loss progress data for testing
          </div>
        </div>
      )}

      {/* Daily Weight Tracking Rules */}
      <div className="p-4 bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 Daily Weight Tracking Rules & Tips:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-blue-300 mb-2">📝 Rules:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Record weight once per day only</li>
              <li>• Entries become permanent after midnight</li>
              <li>• You can only modify today's weight</li>
              <li>• Weight range: 20kg - 300kg</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-green-300 mb-2">💡 Best Practices:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Weigh yourself at the same time daily</li>
              <li>• Best time: morning before eating/drinking</li>
              <li>• Use the same scale consistently</li>
              <li>• Track trends, not daily fluctuations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyWeightTracker;
'use client';

import React, { useState } from 'react';
import { generateTestData, generateTodayTestData, clearAllTestData } from '../../utils/testDataGenerator';
import { getTodayActivities, getAnalytics, getWeightHistory } from '../../utils/workoutDatabase';

export default function TestDataPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayActivities, setTodayActivities] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      console.log('🚀 Starting test data generation...');
      const result = await generateTestData(10);
      setResults(result);
      console.log('✅ Test data generated:', result);
      
      // Add a small delay before loading data
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadCurrentData();
      console.log('📊 Data loaded after generation');
    } catch (error) {
      console.error('❌ Error generating test data:', error);
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTodayData = async () => {
    setIsGenerating(true);
    try {
      await generateTodayTestData();
      await loadCurrentData();
    } catch (error) {
      console.error('Error generating today data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearData = () => {
    clearAllTestData();
    setResults(null);
    setAnalytics(null);
    setTodayActivities([]);
    setWeightHistory([]);
  };

  const loadCurrentData = async () => {
    try {
      const [activitiesResult, analyticsData, weights] = await Promise.all([
        getTodayActivities(),
        getAnalytics(),
        getWeightHistory()
      ]);
      
      // getTodayActivities returns an object with activities property
      setTodayActivities(Array.isArray(activitiesResult) ? activitiesResult : (activitiesResult?.activities || []));
      setAnalytics(analyticsData);
      setWeightHistory(Array.isArray(weights) ? weights : []);
    } catch (error) {
      console.error('Error loading current data:', error);
      // Set safe defaults on error
      setTodayActivities([]);
      setAnalytics(null);
      setWeightHistory([]);
    }
  };

  React.useEffect(() => {
    loadCurrentData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 Test Data Generator
          </h1>
          <p className="text-gray-600 mb-6">
            Generate realistic test data to see how the workout tracker works across multiple days
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={handleGenerateTestData}
              disabled={isGenerating}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isGenerating ? '⏳ Generating...' : '🎲 Generate 10 Days Data'}
            </button>

            <button
              onClick={handleGenerateTodayData}
              disabled={isGenerating}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isGenerating ? '⏳ Generating...' : '📅 Generate Today Only'}
            </button>

            <button
              onClick={handleClearData}
              disabled={isGenerating}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              🗑️ Clear All Data
            </button>
          </div>
          
          <div className="mt-4">
            <button
              onClick={() => {
                const activities = JSON.parse(localStorage.getItem('workout_activities') || '[]');
                console.log('📊 All Activities with Timestamps:');
                activities.forEach((activity: any, index: number) => {
                  console.log(`${index + 1}. ${activity.name} - ${new Date(activity.timestamp).toLocaleString()}`);
                });
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              🔍 Debug: Show All Activity Timestamps
            </button>
          </div>

          {results && (
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                📊 Generation Results
              </h3>
              {results.error ? (
                <div className="text-red-600">
                  <strong>Error:</strong> {results.error}
                </div>
              ) : (
                <div className="text-gray-700">
                  <p><strong>Total Activities:</strong> {results.totalActivities}</p>
                  <p><strong>Days Generated:</strong> {results.totalDays}</p>
                  {results.errors?.length > 0 && (
                    <div className="mt-2">
                      <strong className="text-red-600">Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {results.errors.map((error: string, index: number) => (
                          <li key={index} className="text-red-600 text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              📋 Today's Activities ({Array.isArray(todayActivities) ? todayActivities.length : 0})
            </h2>
            <div className="max-h-96 overflow-y-auto">
              {!Array.isArray(todayActivities) || todayActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No activities for today</p>
              ) : (
                <div className="space-y-2">
                  {todayActivities.map((activity, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        activity.type === 'food' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-green-50 border-l-4 border-green-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">
                            {activity.type === 'food' ? '🍽️' : '🏃‍♂️'} {activity.name}
                          </h4>
                          <p className="text-sm text-gray-600">{activity.details}</p>
                          {activity.timestamp && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <div className={`text-sm font-semibold ${
                          activity.type === 'food' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {activity.type === 'food' ? '+' : '-'}{activity.calories} cal
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              📈 Analytics Overview
            </h2>
            {analytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800">Calories In</h4>
                    <p className="text-2xl font-bold text-blue-600">{analytics.caloriesIn || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800">Calories Out</h4>
                    <p className="text-2xl font-bold text-green-600">{analytics.caloriesOut || 0}</p>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800">Net Deficit</h4>
                  <p className={`text-2xl font-bold ${
                    (analytics.deficit || 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(analytics.deficit || 0) > 0 ? '+' : ''}{analytics.deficit || 0} cal
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800">Weekly Average</h4>
                  <p className="text-lg font-bold text-yellow-600">
                    {analytics.weeklyAverage || 0} cal/day
                  </p>
                  <p className="text-sm text-yellow-700">
                    Predicted: {analytics.predictedWeightLoss || 0}kg/week
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-800">Debug Info</h4>
                  <p className="text-xs text-gray-600">
                    Food: {analytics.foodCount || 0} items, Exercise: {analytics.exerciseCount || 0} items
                  </p>
                  <p className="text-xs text-gray-600">
                    Exercise Calories: {analytics.exerciseCaloriesBurned || 0}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No analytics data available</p>
            )}
          </div>
        </div>

        {/* Weight History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            ⚖️ Weight History ({Array.isArray(weightHistory) ? weightHistory.length : 0} entries)
          </h2>
          <div className="max-h-64 overflow-y-auto">
            {!Array.isArray(weightHistory) || weightHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No weight history available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {weightHistory.slice(0, 15).map((entry, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {entry.weight} kg
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            📋 How to Test
          </h2>
          <div className="space-y-3 text-blue-700">
            <div>
              <strong>1. Generate Test Data:</strong> Click "Generate 10 Days Data" to create realistic activities across 10 days
            </div>
            <div>
              <strong>2. Check Today's View:</strong> Go to <code>/workout</code> to see today's activities and analytics
            </div>
            <div>
              <strong>3. Test Date Changes:</strong> 
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Current activities show only for today</li>
                <li>Historical data persists in local storage</li>
                <li>Analytics calculate from all historical data</li>
                <li>At midnight, today's view will reset but data remains</li>
              </ul>
            </div>
            <div>
              <strong>4. Data Persistence:</strong> All data is saved in localStorage and persists across browser sessions
            </div>
            <div>
              <strong>5. Clear and Restart:</strong> Use "Clear All Data" to start fresh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
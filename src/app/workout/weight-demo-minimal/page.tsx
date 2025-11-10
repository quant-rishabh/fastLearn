'use client';

import { useState } from 'react';

export default function SimpleWeightDemo() {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateData = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const data: any[] = [];
      const currentWeight = 86;
      const targetWeight = 68;
      const weeklyWeightLoss = 0.5;
      const totalDays = 120;
      const dailyWeightLoss = weeklyWeightLoss / 7;
      const caloriesPerKg = 7700;
      const expectedDailyCalorieDeficit = dailyWeightLoss * caloriesPerKg;

      console.log('Generating 120 data points...');

      for (let day = 0; day < totalDays; day++) {
        const date = new Date();
        date.setDate(date.getDate() - (totalDays - day - 1));
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Expected weight (linear)
        const expectedWeight = Math.max(targetWeight, currentWeight - (dailyWeightLoss * day));

        // Simulate realistic fluctuations
        const weeklyVariation = Math.sin((day / 7) * Math.PI * 2) * 0.8;
        const dailyNoise = (Math.random() - 0.5) * 1.2;
        const plateauFactor = day > 30 ? Math.sin((day - 30) / 20) * 0.5 : 0;
        
        const actualWeight = Math.max(targetWeight, expectedWeight + weeklyVariation + dailyNoise + plateauFactor);
        const roundedActualWeight = Math.round(actualWeight * 10) / 10;

        // Calorie calculations
        const actualCalorieDeficit = day === 0 ? 0 : 
          ((data[day - 1]?.actualWeight || currentWeight) - roundedActualWeight) * caloriesPerKg;

        const expectedCumulativeDeficit = expectedDailyCalorieDeficit * day;
        const actualCumulativeDeficit = day === 0 ? 0 : 
          (currentWeight - roundedActualWeight) * caloriesPerKg;

        data.push({
          day: day + 1,
          formattedDate,
          expectedWeight: Math.round(expectedWeight * 10) / 10,
          actualWeight: roundedActualWeight,
          expectedDailyCalorieDeficit: Math.round(expectedDailyCalorieDeficit),
          actualDailyCalorieDeficit: Math.round(actualCalorieDeficit),
          expectedCumulativeDeficit: Math.round(expectedCumulativeDeficit),
          actualCumulativeDeficit: Math.round(actualCumulativeDeficit),
          weightDifference: Math.round((roundedActualWeight - expectedWeight) * 10) / 10,
          deficitDifference: Math.round(actualCumulativeDeficit - expectedCumulativeDeficit)
        });
      }

      console.log('Generated', data.length, 'data points');
      console.log('First 3 points:', data.slice(0, 3));
      console.log('Last 3 points:', data.slice(-3));

      setAnalyticsData(data);
      setIsGenerating(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">
          🎯 Weight Loss Analysis - 120 Data Points
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <button
            onClick={generateData}
            disabled={isGenerating}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isGenerating 
                ? 'bg-gray-600 cursor-not-allowed text-gray-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate 120 Data Points'}
          </button>
          
          <p className="text-gray-300 mt-4">
            Data points: {analyticsData.length} | Status: {isGenerating ? 'Generating...' : 'Ready'}
          </p>
        </div>

        {analyticsData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              📊 Results ({analyticsData.length} points)
            </h2>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-900/30 p-3 rounded">
                <div className="text-blue-300 text-sm">Total Weight Loss</div>
                <div className="text-white font-bold">
                  {(analyticsData[0]?.actualWeight - analyticsData[analyticsData.length - 1]?.actualWeight).toFixed(1)} kg
                </div>
              </div>
              <div className="bg-green-900/30 p-3 rounded">
                <div className="text-green-300 text-sm">Avg Daily Deficit</div>
                <div className="text-white font-bold">
                  {Math.round(analyticsData.reduce((sum, d) => sum + Math.abs(d.actualDailyCalorieDeficit), 0) / analyticsData.length)} cal
                </div>
              </div>
              <div className="bg-purple-900/30 p-3 rounded">
                <div className="text-purple-300 text-sm">Final Weight Diff</div>
                <div className="text-white font-bold">
                  {(analyticsData[analyticsData.length - 1]?.actualWeight - analyticsData[analyticsData.length - 1]?.expectedWeight).toFixed(1)} kg
                </div>
              </div>
              <div className="bg-orange-900/30 p-3 rounded">
                <div className="text-orange-300 text-sm">Timeline</div>
                <div className="text-white font-bold">
                  {Math.round(analyticsData.length / 30)} months
                </div>
              </div>
            </div>

            {/* Data Table - First 10 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Day</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Expected Weight</th>
                    <th className="text-left p-2">Actual Weight</th>
                    <th className="text-left p-2">Expected Deficit</th>
                    <th className="text-left p-2">Actual Deficit</th>
                    <th className="text-left p-2">Cumulative Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-gray-700">
                      <td className="p-2">{row.day}</td>
                      <td className="p-2">{row.formattedDate}</td>
                      <td className="p-2 text-blue-400">{row.expectedWeight} kg</td>
                      <td className="p-2 text-green-400">{row.actualWeight} kg</td>
                      <td className="p-2 text-purple-400">{row.expectedDailyCalorieDeficit} cal</td>
                      <td className="p-2 text-orange-400">{row.actualDailyCalorieDeficit} cal</td>
                      <td className="p-2 text-red-400">{row.deficitDifference} cal</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">Showing first 10 of {analyticsData.length} data points</p>
            </div>

            {/* Raw JSON for debugging */}
            <details className="mt-6">
              <summary className="cursor-pointer text-gray-400 hover:text-white">Show raw data (first 3 points)</summary>
              <pre className="mt-2 p-4 bg-gray-900 rounded text-xs overflow-x-auto">
                {JSON.stringify(analyticsData.slice(0, 3), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
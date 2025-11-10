import React, { useState, useEffect } from 'react';
import { 
  getWeightProgress, 
  updateTodaysWeight, 
  deleteTodaysWeightEntry,
  getTodayDateString,
  DailyWeightEntry
} from '@/utils/dailyWeight';

interface DailyWeightInputProps {
  userId: string;
  onWeightUpdate?: (weight: number) => void;
}

export const DailyWeightInput: React.FC<DailyWeightInputProps> = ({ 
  userId, 
  onWeightUpdate 
}) => {
  const [weight, setWeight] = useState<string>('');
  const [todaysEntry, setTodaysEntry] = useState<DailyWeightEntry | null>(null);
  const [canUpdate, setCanUpdate] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load today's weight entry on component mount
  useEffect(() => {
    loadTodaysWeight();
  }, [userId]);

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
        
        // Notify parent component
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
      
      // Notify parent component
      if (onWeightUpdate) {
        onWeightUpdate(0);
      }
    } else {
      setMessage(result.message);
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

  const todayDate = getTodayDateString();

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-white">⚖️ Daily Weight Tracking</h2>
        <div className="text-sm text-gray-400">
          {formatDate(todayDate)}
        </div>
      </div>

      {/* Current Status */}
      {todaysEntry ? (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-400 font-semibold">✅ Today's Weight Recorded</div>
              <div className="text-3xl font-bold text-green-300 mt-1">
                {todaysEntry.weight} kg
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Recorded at {new Date(todaysEntry.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            <button
              onClick={handleDeleteEntry}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-1 border border-red-500/50 rounded-lg hover:bg-red-900/20 transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
          <div className="text-yellow-400 font-semibold">📝 No Weight Recorded Today</div>
          <div className="text-sm text-gray-300 mt-1">
            Record your weight once per day to track your progress
          </div>
        </div>
      )}

      {/* Weight Input Form */}
      {canUpdate && (
        <form onSubmit={handleWeightSubmit} className="space-y-4">
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
                className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 text-lg font-semibold focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                disabled={isLoading}
                required
              />
              <span className="text-lg text-gray-300 font-medium">kg</span>
            </div>
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

      {/* Info Message */}
      {!canUpdate && !todaysEntry && (
        <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
          <div className="text-blue-400 font-semibold">ℹ️ Weight Already Recorded</div>
          <div className="text-sm text-gray-300 mt-1">
            You can only record your weight once per day. Come back tomorrow for a new entry!
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          isError 
            ? 'bg-red-900/30 border border-red-500/50 text-red-400' 
            : 'bg-green-900/30 border border-green-500/50 text-green-400'
        }`}>
          <div className="text-sm font-medium">
            {isError ? '❌' : '✅'} {message}
          </div>
        </div>
      )}

      {/* Daily Weight Rules */}
      <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">📋 Daily Weight Tracking Rules:</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Record your weight once per day at the same time for consistency</li>
          <li>• Weight entries become permanent after midnight (12:00 AM)</li>
          <li>• You can only modify today's weight entry</li>
          <li>• Weigh yourself in the morning for best accuracy</li>
          <li>• Weight should be between 20kg and 300kg</li>
        </ul>
      </div>
    </div>
  );
};
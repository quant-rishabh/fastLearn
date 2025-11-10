'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile, getUserProfile, logoutUser, calculateAge, calculateMonthsToGoal } from '../../../utils/auth';
import { useRouter } from 'next/navigation';

export default function WorkoutSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    height: '',
    targetWeight: '',
    weeklyGoal: '0.5'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/workout/login');
      return;
    }

    setUser(currentUser);
    setFormData({
      dateOfBirth: currentUser.dateOfBirth,
      height: currentUser.height.toString(),
      targetWeight: currentUser.targetWeight.toString(),
      weeklyGoal: currentUser.weeklyGoal.toString()
    });

    // Calculate profile data
    const profileData = getUserProfile();
    setProfile(profileData);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    setFormData(newFormData);
    setMessage('');

    // Update profile preview in real-time (excluding current weight - managed on home page)
    if (newFormData.dateOfBirth && newFormData.targetWeight && newFormData.weeklyGoal) {
      const age = calculateAge(newFormData.dateOfBirth);
      // Use existing current weight for calculation since we don't manage it here
      const currentWeight = profile?.currentWeight || user?.currentWeight || 86;
      const monthsToGoal = calculateMonthsToGoal(
        currentWeight,
        parseFloat(newFormData.targetWeight),
        parseFloat(newFormData.weeklyGoal)
      );
      
      setProfile({
        ...profile,
        age,
        height: parseFloat(newFormData.height),
        targetWeight: parseFloat(newFormData.targetWeight),
        weeklyGoal: parseFloat(newFormData.weeklyGoal),
        monthsToGoal
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const updates = {
        dateOfBirth: formData.dateOfBirth,
        height: parseFloat(formData.height),
        targetWeight: parseFloat(formData.targetWeight),
        weeklyGoal: parseFloat(formData.weeklyGoal)
      };

      const result = updateUserProfile(updates);
      if (result.success) {
        setMessage('Profile updated successfully!');
        // Refresh profile data
        const updatedProfile = getUserProfile();
        setProfile(updatedProfile);
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.push('/workout/login');
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Workout Profile Settings</h1>
              <p className="text-gray-600">Welcome back, {user.username}!</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/workout')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🏃‍♂️ Back to Workout
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">⚙️ Personal Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div className={`p-3 rounded ${
                  message.includes('Error') 
                    ? 'bg-red-100 text-red-700 border border-red-400' 
                    : 'bg-green-100 text-green-700 border border-green-400'
                }`}>
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  required
                  min="100"
                  max="250"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  name="targetWeight"
                  value={formData.targetWeight}
                  onChange={handleInputChange}
                  required
                  step="0.1"
                  min="30"
                  max="300"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Goal (kg/week)
                </label>
                <select
                  name="weeklyGoal"
                  value={formData.weeklyGoal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.2">0.2 kg/week (Slow & Steady)</option>
                  <option value="0.3">0.3 kg/week (Gentle)</option>
                  <option value="0.5">0.5 kg/week (Moderate)</option>
                  <option value="0.7">0.7 kg/week (Aggressive)</option>
                  <option value="1.0">1.0 kg/week (Very Aggressive)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Profile Preview */}
          {profile && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">👤 Profile Overview</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-800">Age</h3>
                  <p className="text-2xl font-bold text-blue-600">{profile.age}</p>
                  <p className="text-sm text-blue-700">Years Old</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-green-800">Height</h3>
                  <p className="text-2xl font-bold text-green-600">{profile.height}</p>
                  <p className="text-sm text-green-700">cm Height</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-purple-800">Weekly Goal</h3>
                  <p className="text-2xl font-bold text-purple-600">{profile.weeklyGoal}</p>
                  <p className="text-sm text-purple-700">kg/week Goal</p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-800">Time to Goal</h3>
                  <p className="text-2xl font-bold text-yellow-600">{profile.monthsToGoal}</p>
                  <p className="text-sm text-yellow-700">Months to Goal</p>
                  <p className="text-xs text-yellow-600 mt-1">Auto-calculated</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">⚖️ Weight Settings</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-blue-100 p-3 rounded border-l-4 border-blue-400">
                      <p className="text-blue-600 font-medium">Current Weight:</p>
                      <p className="text-blue-800 text-xs">Managed on Home Page</p>
                      <p className="text-blue-700 text-xs">Change your weight directly on the workout page for real-time calculations</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Target Weight:</p>
                      <p className="font-bold text-gray-800">{profile.targetWeight} kg</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
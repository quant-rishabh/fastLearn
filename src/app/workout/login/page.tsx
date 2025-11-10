'use client';

import React, { useState } from 'react';
import { loginUser, registerUser, isLoggedIn } from '../../../utils/auth';
import { useRouter } from 'next/navigation';

export default function WorkoutLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    dateOfBirth: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    weeklyGoal: '0.5'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isLoggedIn()) {
      router.push('/workout');
    }
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const result = loginUser(formData.username, formData.password);
        if (result.success) {
          router.push('/workout');
        } else {
          setError(result.message);
        }
      } else {
        // Register
        if (!formData.dateOfBirth || !formData.height || !formData.currentWeight || !formData.targetWeight) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }

        const result = registerUser({
          username: formData.username,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
          height: parseFloat(formData.height),
          currentWeight: parseFloat(formData.currentWeight),
          targetWeight: parseFloat(formData.targetWeight),
          weeklyGoal: parseFloat(formData.weeklyGoal)
        });

        if (result.success) {
          // Auto-login after registration
          const loginResult = loginUser(formData.username, formData.password);
          if (loginResult.success) {
            router.push('/workout');
          } else {
            setError('Registration successful! Please log in.');
            setIsLogin(true);
          }
        } else {
          setError(result.message);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createDemoAccount = () => {
    const result = registerUser({
      username: 'demo',
      password: 'demo123',
      dateOfBirth: '1999-01-01',
      height: 174,
      currentWeight: 86,
      targetWeight: 68,
      weeklyGoal: 0.5
    });

    if (result.success || result.message === 'Username already exists') {
      // Login with demo account
      const loginResult = loginUser('demo', 'demo123');
      if (loginResult.success) {
        router.push('/workout');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🏋️‍♀️ Workout Tracker
          </h2>
          <h3 className="mt-2 text-center text-xl font-bold text-gray-800">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h3>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700">
                      Height (cm)
                    </label>
                    <input
                      id="height"
                      name="height"
                      type="number"
                      required
                      value={formData.height}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="174"
                    />
                  </div>

                  <div>
                    <label htmlFor="currentWeight" className="block text-sm font-medium text-gray-700">
                      Current Weight (kg)
                    </label>
                    <input
                      id="currentWeight"
                      name="currentWeight"
                      type="number"
                      step="0.1"
                      required
                      value={formData.currentWeight}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="86"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="targetWeight" className="block text-sm font-medium text-gray-700">
                      Target Weight (kg)
                    </label>
                    <input
                      id="targetWeight"
                      name="targetWeight"
                      type="number"
                      step="0.1"
                      required
                      value={formData.targetWeight}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="68"
                    />
                  </div>

                  <div>
                    <label htmlFor="weeklyGoal" className="block text-sm font-medium text-gray-700">
                      Weekly Goal (kg/week)
                    </label>
                    <select
                      id="weeklyGoal"
                      name="weeklyGoal"
                      value={formData.weeklyGoal}
                      onChange={(e) => setFormData({...formData, weeklyGoal: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="0.2">0.2 kg/week</option>
                      <option value="0.3">0.3 kg/week</option>
                      <option value="0.5">0.5 kg/week</option>
                      <option value="0.7">0.7 kg/week</option>
                      <option value="1.0">1.0 kg/week</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={createDemoAccount}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🚀 Try Demo Account
              </button>
            )}
          </div>
        </form>

        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Account Details:</h3>
            <p className="text-sm text-blue-600">
              Username: <code className="bg-blue-100 px-1 rounded">demo</code><br/>
              Password: <code className="bg-blue-100 px-1 rounded">demo123</code>
            </p>
            <p className="text-xs text-blue-500 mt-2">
              26 years old, 174cm, 86kg → 68kg goal, 0.5kg/week
            </p>
          </div>
        )}

        {/* Link back to main app */}
        <div className="text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Back to LearnFast App
          </a>
        </div>
      </div>
    </div>
  );
}
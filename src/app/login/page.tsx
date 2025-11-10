'use client';'use client';



import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';import { useRouter } from 'next/navigation';

import { authenticateUser, saveUser, validateCredentials, getCurrentUser } from '@/utils/authHelpers';import { authenticateUser, saveUser, validateCredentials, getCurrentUser } from '@/utils/authHelpers';



export default function LoginPage() {export default function LoginPage() {

  const [isLogin, setIsLogin] = useState(true);  const [isLogin, setIsLogin] = useState(true);

  const [username, setUsername] = useState('');  const [formData, setFormData] = useState({

  const [password, setPassword] = useState('');    username: '',

  const [confirmPassword, setConfirmPassword] = useState('');    password: '',

  const [error, setError] = useState('');    dateOfBirth: '',

  const [success, setSuccess] = useState('');    height: '',

  const [isLoading, setIsLoading] = useState(false);    currentWeight: '',

  const router = useRouter();    targetWeight: '',

    weeklyGoal: '0.5'

  useEffect(() => {  });

    // Check if user is already logged in  const [error, setError] = useState('');

    const currentUser = getCurrentUser();  const [loading, setLoading] = useState(false);

    if (currentUser) {  const router = useRouter();

      router.push('/');

    }  // Redirect if already logged in

  }, [router]);  React.useEffect(() => {

    if (isLoggedIn()) {

  const handleSubmit = async (e: React.FormEvent) => {      router.push('/workout');

    e.preventDefault();    }

    setError('');  }, [router]);

    setSuccess('');

    setIsLoading(true);  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setFormData({

    try {      ...formData,

      if (isLogin) {      [e.target.name]: e.target.value

        // Handle login    });

        if (!username || !password) {    setError('');

          setError('Please fill in all fields');  };

          return;

        }  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

        const user = authenticateUser(username, password);    setLoading(true);

        if (user) {    setError('');

          setSuccess('Login successful! Redirecting...');

          setTimeout(() => {    try {

            router.push('/');      if (isLogin) {

          }, 1000);        // Login

        } else {        const result = loginUser(formData.username, formData.password);

          setError('Invalid username or password');        if (result.success) {

        }          router.push('/workout');

      } else {        } else {

        // Handle registration          setError(result.message);

        const validation = validateCredentials(username, password);        }

        if (!validation.isValid) {      } else {

          setError(validation.message);        // Register

          return;        if (!formData.dateOfBirth || !formData.height || !formData.currentWeight || !formData.targetWeight) {

        }          setError('Please fill in all fields');

          setLoading(false);

        if (password !== confirmPassword) {          return;

          setError('Passwords do not match');        }

          return;

        }        const result = registerUser({

          username: formData.username,

        const success = saveUser({          password: formData.password,

          id: '',          dateOfBirth: formData.dateOfBirth,

          username: username.trim(),          height: parseFloat(formData.height),

          password: password,          currentWeight: parseFloat(formData.currentWeight),

          createdAt: new Date()          targetWeight: parseFloat(formData.targetWeight),

        });          weeklyGoal: parseFloat(formData.weeklyGoal)

        });

        if (success) {

          setSuccess('Registration successful! You can now log in.');        if (result.success) {

          setIsLogin(true);          // Auto-login after registration

          setUsername('');          const loginResult = loginUser(formData.username, formData.password);

          setPassword('');          if (loginResult.success) {

          setConfirmPassword('');            router.push('/workout');

        } else {          } else {

          setError('Username already exists. Please choose a different username.');            setError('Registration successful! Please log in.');

        }            setIsLogin(true);

      }          }

    } catch (error) {        } else {

      console.error('Authentication error:', error);          setError(result.message);

      setError('An unexpected error occurred. Please try again.');        }

    } finally {      }

      setIsLoading(false);    } catch (error) {

    }      setError('An unexpected error occurred');

  };    } finally {

      setLoading(false);

  const fillDemoCredentials = () => {    }

    setUsername('demo');  };

    setPassword('demo123');

    setError('');  return (

    setSuccess('');    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

  };      <div className="max-w-md w-full space-y-8">

        <div>

  return (          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">

    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">            {isLogin ? 'Sign in to your account' : 'Create your account'}

      <div className="max-w-md w-full space-y-8">          </h2>

        <div>          <p className="mt-2 text-center text-sm text-gray-600">

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">            {isLogin ? "Don't have an account? " : 'Already have an account? '}

            {isLogin ? 'Sign in to your account' : 'Create your account'}            <button

          </h2>              onClick={() => {

          <p className="mt-2 text-center text-sm text-gray-600">                setIsLogin(!isLogin);

            {isLogin ? "Don't have an account?" : "Already have an account?"}                setError('');

            <button              }}

              type="button"              className="font-medium text-blue-600 hover:text-blue-500"

              onClick={() => {            >

                setIsLogin(!isLogin);              {isLogin ? 'Sign up' : 'Sign in'}

                setError('');            </button>

                setSuccess('');          </p>

                setUsername('');        </div>

                setPassword('');

                setConfirmPassword('');        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

              }}          {error && (

              className="ml-1 font-medium text-indigo-600 hover:text-indigo-500"            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">

            >              {error}

              {isLogin ? 'Sign up' : 'Sign in'}            </div>

            </button>          )}

          </p>

        </div>          <div className="space-y-4">

            <div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>              <label htmlFor="username" className="block text-sm font-medium text-gray-700">

          <div className="rounded-md shadow-sm -space-y-px">                Username

            <div>              </label>

              <label htmlFor="username" className="sr-only">              <input

                Username                id="username"

              </label>                name="username"

              <input                type="text"

                id="username"                required

                name="username"                value={formData.username}

                type="text"                onChange={handleInputChange}

                required                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"                placeholder="Enter your username"

                placeholder="Username"              />

                value={username}            </div>

                onChange={(e) => setUsername(e.target.value)}

                disabled={isLoading}            <div>

              />              <label htmlFor="password" className="block text-sm font-medium text-gray-700">

            </div>                Password

            <div>              </label>

              <label htmlFor="password" className="sr-only">              <input

                Password                id="password"

              </label>                name="password"

              <input                type="password"

                id="password"                required

                name="password"                value={formData.password}

                type="password"                onChange={handleInputChange}

                required                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${                placeholder="Enter your password"

                  !isLogin && confirmPassword ? '' : 'rounded-b-md'              />

                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}            </div>

                placeholder="Password"

                value={password}            {!isLogin && (

                onChange={(e) => setPassword(e.target.value)}              <>

                disabled={isLoading}                <div>

              />                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">

            </div>                    Date of Birth

            {!isLogin && (                  </label>

              <div>                  <input

                <label htmlFor="confirmPassword" className="sr-only">                    id="dateOfBirth"

                  Confirm Password                    name="dateOfBirth"

                </label>                    type="date"

                <input                    required

                  id="confirmPassword"                    value={formData.dateOfBirth}

                  name="confirmPassword"                    onChange={handleInputChange}

                  type="password"                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

                  required                  />

                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"                </div>

                  placeholder="Confirm Password"

                  value={confirmPassword}                <div className="grid grid-cols-2 gap-4">

                  onChange={(e) => setConfirmPassword(e.target.value)}                  <div>

                  disabled={isLoading}                    <label htmlFor="height" className="block text-sm font-medium text-gray-700">

                />                      Height (cm)

              </div>                    </label>

            )}                    <input

          </div>                      id="height"

                      name="height"

          {error && (                      type="number"

            <div className="rounded-md bg-red-50 p-4">                      required

              <div className="text-sm text-red-800">{error}</div>                      value={formData.height}

            </div>                      onChange={handleInputChange}

          )}                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

                      placeholder="174"

          {success && (                    />

            <div className="rounded-md bg-green-50 p-4">                  </div>

              <div className="text-sm text-green-800">{success}</div>

            </div>                  <div>

          )}                    <label htmlFor="currentWeight" className="block text-sm font-medium text-gray-700">

                      Current Weight (kg)

          <div>                    </label>

            <button                    <input

              type="submit"                      id="currentWeight"

              disabled={isLoading}                      name="currentWeight"

              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"                      type="number"

            >                      step="0.1"

              {isLoading ? (                      required

                <div className="flex items-center">                      value={formData.currentWeight}

                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>                      onChange={handleInputChange}

                  {isLogin ? 'Signing in...' : 'Creating account...'}                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

                </div>                      placeholder="86"

              ) : (                    />

                isLogin ? 'Sign in' : 'Sign up'                  </div>

              )}                </div>

            </button>

          </div>                <div className="grid grid-cols-2 gap-4">

                  <div>

          {isLogin && (                    <label htmlFor="targetWeight" className="block text-sm font-medium text-gray-700">

            <div className="text-center">                      Target Weight (kg)

              <button                    </label>

                type="button"                    <input

                onClick={fillDemoCredentials}                      id="targetWeight"

                className="text-sm text-indigo-600 hover:text-indigo-500 underline"                      name="targetWeight"

                disabled={isLoading}                      type="number"

              >                      step="0.1"

                Use demo credentials (demo/demo123)                      required

              </button>                      value={formData.targetWeight}

            </div>                      onChange={handleInputChange}

          )}                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

        </form>                      placeholder="68"

                    />

        {isLogin && (                  </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">

            <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Accounts:</h3>                  <div>

            <div className="text-xs text-blue-600 space-y-1">                    <label htmlFor="weeklyGoal" className="block text-sm font-medium text-gray-700">

              <div>Username: <span className="font-mono">demo</span> | Password: <span className="font-mono">demo123</span></div>                      Weekly Goal (kg/week)

              <div>Username: <span className="font-mono">admin</span> | Password: <span className="font-mono">admin123</span></div>                    </label>

            </div>                    <select

          </div>                      id="weeklyGoal"

        )}                      name="weeklyGoal"

                      value={formData.weeklyGoal}

        {!isLogin && (                      onChange={(e) => setFormData({...formData, weeklyGoal: e.target.value})}

          <div className="mt-6 p-4 bg-yellow-50 rounded-md">                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"

            <div className="text-xs text-yellow-600">                    >

              <strong>Registration Requirements:</strong>                      <option value="0.2">0.2 kg/week</option>

              <ul className="mt-1 list-disc list-inside space-y-1">                      <option value="0.3">0.3 kg/week</option>

                <li>Username must be at least 3 characters</li>                      <option value="0.5">0.5 kg/week</option>

                <li>Password must be at least 6 characters</li>                      <option value="0.7">0.7 kg/week</option>

                <li>Username must be unique</li>                      <option value="1.0">1.0 kg/week</option>

              </ul>                    </select>

            </div>                  </div>

          </div>                </div>

        )}              </>

      </div>            )}

    </div>          </div>

  );

}          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
            </button>
          </div>
        </form>

        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Quick Demo Account:</h3>
            <p className="text-sm text-blue-600">
              Username: <code className="bg-blue-100 px-1 rounded">demo</code><br/>
              Password: <code className="bg-blue-100 px-1 rounded">demo123</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
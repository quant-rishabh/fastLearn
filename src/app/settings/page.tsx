'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Toast for feedback
function Toast({ message, show }: { message: string; show: boolean }) {
  return show ? (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
      {message}
    </div>
  ) : null;
}

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.3);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [fetchFromDb, setFetchFromDb] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [practiceCount, setPracticeCount] = useState(2);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedThreshold = localStorage.getItem('fuzzy_threshold');
    const storedShuffle = localStorage.getItem('shuffle_enabled');
    const storedAutoSpeak = localStorage.getItem('auto_speak');
    const storedFetchDb = localStorage.getItem('fetch_from_db');
    const storedTimer = localStorage.getItem('quiz_timer_seconds');
    const storedPractice = localStorage.getItem('practice_count');

    if (storedThreshold) setThreshold(parseFloat(storedThreshold));
    if (storedShuffle) setShuffleEnabled(storedShuffle === 'true');
    if (storedAutoSpeak) setAutoSpeak(storedAutoSpeak === 'true');
    if (storedFetchDb) setFetchFromDb(storedFetchDb === 'true');
    if (storedTimer) setTimerSeconds(Number(storedTimer));
    if (storedPractice) setPracticeCount(Number(storedPractice));
  }, []);

  const handleToggleDbFetch = (val: boolean) => {
    setFetchFromDb(val);
    localStorage.setItem('fetch_from_db', String(val));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('fuzzy_threshold', threshold.toString());
    localStorage.setItem('shuffle_enabled', shuffleEnabled.toString());
    localStorage.setItem('auto_speak', String(autoSpeak));
    localStorage.setItem('quiz_timer_seconds', timerSeconds.toString());
    localStorage.setItem('practice_count', practiceCount.toString());
    setToastMsg('✅ Settings saved!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleClearStorage = () => {
    if (confirm('⚠️ Are you sure you want to clear all cached data? This cannot be undone.')) {
      localStorage.clear();
      setToastMsg('🧹 LocalStorage cleared!');
      setShowToast(true);
      setTimeout(() => location.reload(), 1200);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-0 text-gray-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur shadow-md py-4 px-4 flex flex-col items-center border-b border-gray-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-purple-400 flex items-center gap-2 drop-shadow">
          <span role="img" aria-label="settings">⚙️</span> Settings
        </h1>
        <div className="flex gap-2 mt-2">
          <Link href="/">
            <button className="px-4 py-2 bg-gray-800 text-purple-200 rounded-lg shadow hover:bg-purple-800 hover:text-white transition-all text-sm font-semibold border border-purple-700">
              Home
            </button>
          </Link>
          <Link href="/admin">
            <button className="px-4 py-2 bg-gray-800 text-purple-200 rounded-lg shadow hover:bg-purple-800 hover:text-white transition-all text-sm font-semibold border border-purple-700">
              Admin Panel
            </button>
          </Link>
          <Link href="/progress">
            <button className="px-4 py-2 bg-green-800 text-green-200 rounded-lg shadow hover:bg-green-900 hover:text-white transition-all text-sm font-semibold border border-green-700">
              Progress
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto mt-6 px-2">
        {/* Settings Panel */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 shadow-sm">
          <div className="px-4 py-4">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <span role="img" aria-label="settings">⚙️</span> Quiz Settings
            </h2>
            
            <label className="block text-sm mb-1 font-medium text-purple-200">Fuzzy Match Threshold (0 = strict, 1 = lenient)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full mb-2 accent-purple-500"
            />
            <div className="text-xs text-purple-400 mb-4">Current: {threshold}</div>

            <div className="flex items-center mb-3">
              <input
                id="shuffle"
                type="checkbox"
                checked={shuffleEnabled}
                onChange={(e) => setShuffleEnabled(e.target.checked)}
                className="accent-purple-500"
              />
              <label htmlFor="shuffle" className="ml-2 text-sm text-purple-200">Shuffle Questions</label>
              <span className="ml-2 text-xs text-purple-400">{shuffleEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>

            <div className="flex items-center mb-3">
              <input
                id="autoSpeak"
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="accent-purple-500"
              />
              <label htmlFor="autoSpeak" className="ml-2 text-sm text-purple-200">Auto Speak Question on Load</label>
            </div>

            <div className="flex items-center mb-4">
              <input
                id="fetchDb"
                type="checkbox"
                checked={fetchFromDb}
                onChange={(e) => handleToggleDbFetch(e.target.checked)}
                className="accent-purple-500"
              />
              <label htmlFor="fetchDb" className="ml-2 text-sm text-purple-200">Fetch latest from DB (Overwrite cache)</label>
            </div>

            {/* Timer Setting */}
            <div className="mb-4">
              <label className="block text-sm mb-1 font-medium text-purple-200" htmlFor="timerSeconds">
                Per-Question Timer (seconds)
              </label>
              <input
                id="timerSeconds"
                type="number"
                min={5}
                max={120}
                step={1}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value))}
                className="w-full p-2 border border-gray-700 rounded-lg bg-gray-900 text-purple-100 shadow mb-1"
              />
              <div className="text-xs text-purple-400">Current: {timerSeconds} seconds</div>
            </div>
            
            {/* Spaced Repetition Setting */}
            <div className="mb-4">
              <label className="block text-sm mb-1 font-medium text-purple-200" htmlFor="practiceCount">
                Practice Each Missed Question (Spaced Repetition)
              </label>
              <input
                id="practiceCount"
                type="number"
                min={1}
                max={5}
                step={1}
                value={practiceCount}
                onChange={(e) => setPracticeCount(Number(e.target.value))}
                className="w-full p-2 border border-gray-700 rounded-lg bg-gray-900 text-purple-100 shadow mb-1"
              />
              <div className="text-xs text-purple-400">Current: {practiceCount} times</div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-2 rounded-lg font-semibold shadow hover:from-purple-800 hover:to-indigo-800 hover:scale-105 transition-all"
              >
                💾 Save Settings
              </button>
              
              <button
                onClick={handleClearStorage}
                className="w-full bg-gradient-to-r from-red-600 to-pink-500 text-white py-2 rounded-lg font-semibold shadow hover:scale-105 hover:from-red-700 hover:to-pink-600 transition-all"
              >
                🧹 Clear Local Storage
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Toast message={toastMsg} show={showToast} />
    </main>
  );
}

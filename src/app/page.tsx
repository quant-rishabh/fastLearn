'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

// Toast for feedback
function Toast({ message, show }: { message: string; show: boolean }) {
  return show ? (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
      {message}
    </div>
  ) : null;
}

interface Subject {
  id: string;
  label: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSlug, setSubjectSlug] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicName, setTopicName] = useState('');

  const [threshold, setThreshold] = useState(0.3); // default
  const [shuffleEnabled, setShuffleEnabled] = useState(false);

  const [autoSpeak, setAutoSpeak] = useState(false);
  const [fetchFromDb, setFetchFromDb] = useState(true); // default: true

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('fetch_from_db');
    if (stored) setFetchFromDb(stored === 'true');
  }, []);

  const handleToggleDbFetch = (val: boolean) => {
    setFetchFromDb(val);
    localStorage.setItem('fetch_from_db', String(val));
  };

  useEffect(() => {
    const saved = localStorage.getItem('auto_speak');
    if (saved !== null) {
      setAutoSpeak(saved === 'true');
    }
  }, []);

  useEffect(() => {
    const storedThreshold = localStorage.getItem('fuzzy_threshold');
    const storedShuffle = localStorage.getItem('shuffle_enabled');

    if (storedThreshold) setThreshold(parseFloat(storedThreshold));
    if (storedShuffle) setShuffleEnabled(storedShuffle === 'true');
  }, []);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!fetchFromDb) {
        const cached = localStorage.getItem('subjects');
        if (cached && cached !== 'undefined') {
          setSubjects(JSON.parse(cached));
          return;
        }
      }

      const { data, error } = await supabase.from('subjects').select('*');
      if (!error && data) {
        setSubjects(data);
        localStorage.setItem('subjects', JSON.stringify(data));
      }
    };
    loadSubjects();
  }, [fetchFromDb]);

  // Load topics for selected subject
  useEffect(() => {
    const fetchTopics = async () => {
      if (!subjectSlug) return;
      const subject = subjects.find((s) => s.slug === subjectSlug);
      if (!subject) return;

      const cacheKey = `topics_${subject.id}`;

      if (fetchFromDb === false) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined')  {
          setTopics(JSON.parse(cached));
          return;
        }
      }

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id);

      if (!error && data) {
        setTopics(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    };

    fetchTopics();
  }, [subjectSlug, subjects, fetchFromDb]);

  const handleSaveSettings = () => {
    localStorage.setItem('fuzzy_threshold', threshold.toString());
    localStorage.setItem('shuffle_enabled', shuffleEnabled.toString());
    localStorage.setItem('auto_speak', String(autoSpeak));
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
          <span role="img" aria-label="bolt">⚡</span> Quick Learn Quiz
        </h1>
        <Link href="/admin" className="mt-2">
          <button className="px-4 py-2 bg-gray-800 text-purple-200 rounded-lg shadow hover:bg-purple-800 hover:text-white transition-all text-sm font-semibold border border-purple-700">
            Admin Panel
          </button>
        </Link>
      </header>

      <div className="max-w-md mx-auto mt-6 px-2">
        {/* Settings Accordion */}
        <details className="mb-6 rounded-lg border border-gray-800 bg-gray-900 shadow-sm" open>
          <summary className="cursor-pointer px-4 py-3 font-semibold text-purple-300 select-none flex items-center gap-2">
            <span role="img" aria-label="settings">⚙️</span> Settings
          </summary>
          <div className="px-4 pb-4 pt-2">
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

            <button
              onClick={handleSaveSettings}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-2 rounded-lg font-semibold shadow hover:from-purple-800 hover:to-indigo-800 hover:scale-105 transition-all"
            >
              💾 Save Settings
            </button>
          </div>
        </details>

        {/* Subject Dropdown */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-purple-300">📘 Select Subject:</label>
          <select
            value={subjectSlug}
            onChange={(e) => setSubjectSlug(e.target.value)}
            className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-950 text-purple-100 shadow-sm"
          >
            <option value="" className="text-gray-400">-- Choose Subject --</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.slug} className="text-gray-900 bg-purple-100">
                {subject.label}
              </option>
            ))}
          </select>
        </div>

        {/* Topic Dropdown */}
        {topics.length > 0 && (
          <div className="mb-4">
            <label className="block mb-2 font-medium text-purple-300">📚 Select Topic:</label>
            <select
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-950 text-purple-100 shadow-sm"
            >
              <option value="" className="text-gray-400">-- Choose Topic --</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.name} className="text-gray-900 bg-purple-100">
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Quiz & Learn Buttons */}
        {subjectSlug && topicName && (
          <div className="flex flex-col gap-3 mt-4">
            <Link href={`/quiz/${subjectSlug}/${encodeURIComponent(topicName)}`}>
              <button className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all flex items-center justify-center gap-2">
                ▶️ Start Quiz
              </button>
            </Link>
            <Link href={`/learn/${subjectSlug}/${encodeURIComponent(topicName)}`}>
              <button className="w-full bg-gradient-to-r from-green-500 to-teal-400 text-gray-900 py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-green-600 hover:to-teal-500 transition-all flex items-center justify-center gap-2">
                📖 Learn
              </button>
            </Link>
            <button
              onClick={handleClearStorage}
              className="w-full bg-gradient-to-r from-red-600 to-pink-500 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-red-700 hover:to-pink-600 transition-all flex items-center justify-center gap-2 mt-2"
            >
              🧹 Clear Local Storage
            </button>
          </div>
        )}
      </div>
      <Toast message={toastMsg} show={showToast} />
    </main>
  );
}

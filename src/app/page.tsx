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
  const [fetchFromDb, setFetchFromDb] = useState(true);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-0 text-gray-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur shadow-md py-4 px-4 flex flex-col items-center border-b border-gray-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-purple-400 flex items-center gap-2 drop-shadow">
          <span role="img" aria-label="bolt">⚡</span> Quick Learn Quiz
        </h1>
        <div className="flex gap-2 mt-2">
          <Link href="/settings">
            <button className="px-4 py-2 bg-purple-800 text-purple-200 rounded-lg shadow hover:bg-purple-700 hover:text-white transition-all text-sm font-semibold border border-purple-700">
              Settings
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
        {/* Subject Dropdown */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-purple-300">📘 Select Subject:</label>
          <select
            value={subjectSlug}
            onChange={(e) => setSubjectSlug(e.target.value)}
            className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-950 text-purple-100 shadow-sm"
          >
            <option value="" className="text-gray-400">-- Choose Subject --</option>
            {[...subjects]
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((subject) => (
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
          </div>
        )}
      </div>
      <Toast message={toastMsg} show={showToast} />
    </main>
  );
}

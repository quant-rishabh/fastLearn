'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

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
      const { data, error } = await supabase.from('subjects').select('*');
      if (!error && data) {
        setSubjects(data);
      }
    };
    loadSubjects();
  }, []);

  // Load topics for selected subject
  useEffect(() => {
    const fetchTopics = async () => {
      if (!subjectSlug) return;
      const subject = subjects.find((s) => s.slug === subjectSlug);
      if (!subject) return;

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id);

      if (!error && data) {
        setTopics(data);
        setTopicName('');
      }
    };

    fetchTopics();
  }, [subjectSlug, subjects]);

  const handleSaveSettings = () => {
    localStorage.setItem('fuzzy_threshold', threshold.toString());
    localStorage.setItem('shuffle_enabled', shuffleEnabled.toString());
    localStorage.setItem('auto_speak', String(autoSpeak)); // moved here
    alert('✅ Settings saved!');
  };


  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">⚡ Quick Learn Quiz</h1>

      <Link href="/admin">
        <button className="w-full mt-4 mb-6 bg-gray-800 text-white py-2 rounded hover:bg-gray-700">
          Admin Panel
        </button>
      </Link>

      {/* Settings */}
      <div className="mb-6 border p-4 rounded bg-black-500">
        <h2 className="text-md font-semibold mb-3">⚙️ Settings</h2>

        <label className="block text-sm mb-1">
          Set Fuzzy Match Threshold (0 = strict, 1 = lenient)
        </label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full p-2 border rounded mb-4"
        />

        <div className="mb-3">
          <label className="text-sm mr-2">Shuffle Questions:</label>
          <input
            type="checkbox"
            checked={shuffleEnabled}
            onChange={(e) => setShuffleEnabled(e.target.checked)}
          />
          <span className="ml-2 text-gray-600 text-sm">{shuffleEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>

        <label className="flex items-center gap-2 mt-4">
  <input
    type="checkbox"
    checked={autoSpeak}
    onChange={(e) => setAutoSpeak(e.target.checked)}
  />
  Auto Speak Question on Load
</label>

        <button
          onClick={handleSaveSettings}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500"
        >
          Save Settings
        </button>
      </div>

      {/* Subject Dropdown */}
      <label className="block mb-2">📘 Select Subject:</label>
      <select
        value={subjectSlug}
        onChange={(e) => setSubjectSlug(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="">-- Choose Subject --</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.slug}>
            {subject.label}
          </option>
        ))}
      </select>

      {/* Topic Dropdown */}
      {topics.length > 0 && (
        <>
          <label className="block mb-2">📚 Select Topic:</label>
          <select
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">-- Choose Topic --</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.name}>
                {topic.name}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Start Quiz */}
      {subjectSlug && topicName && (
        <Link href={`/quiz/${subjectSlug}/${encodeURIComponent(topicName)}`}>
          <button className="w-full bg-black text-white py-2 rounded">
            Start Quiz
          </button>
        </Link>
      )}
    </main>
  );
}

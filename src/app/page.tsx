'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubjectMeta {
  label: string;
  filename: string;
}

export default function Home() {
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    const loadSubjects = async () => {
      const res = await fetch('/data/subjects.json');
      const data = await res.json();
      setSubjects(data);
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!subject) return;

    const fetchTopics = async () => {
      try {
        const res = await fetch(`/data/${subject}.json`);
        const data = await res.json();
        setTopics(Object.keys(data));
        setTopic('');
      } catch (err) {
        console.error('Error loading topics:', err);
        setTopics([]);
      }
    };

    fetchTopics();
  }, [subject]);

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Quick Learn Quiz</h1>

      <label className="block mb-2">Select Subject:</label>
      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="">-- Choose Subject --</option>
        {subjects.map((opt) => (
          <option key={opt.filename} value={opt.filename}>
            {opt.label}
          </option>
        ))}
      </select>

      {topics.length > 0 && (
        <>
          <label className="block mb-2">Select Topic:</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">-- Choose Topic --</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </>
      )}

      {subject && topic && (
        <Link href={`/quiz/${subject}/${encodeURIComponent(topic)}`}>
          <button className="w-full bg-black text-white py-2 rounded">
            Start Quiz
          </button>
        </Link>
      )}
    </main>
  );
}

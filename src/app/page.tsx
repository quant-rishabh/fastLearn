'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);

  const subjectOptions = [
    { label: 'Operating Systems', value: 'operating_system' },
    { label: 'Computer Networks', value: 'computer_network' },
    { label: 'Quiz', value: 'quiz' }
  ];

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
        {subjectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              <option key={t} value={t}>{t}</option>
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

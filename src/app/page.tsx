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

  // Load all subjects from Supabase
  useEffect(() => {
    const loadSubjects = async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (!error && data) {
        setSubjects(data);
      }
    };
    loadSubjects();
  }, []);

  // Load topics when a subject is selected
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

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Quick Learn Quiz</h1>

      <Link href="/admin">
  <button className="w-full mt-6 bg-gray-800 text-white py-2 rounded hover:bg-gray-700">
    Admin Panel
  </button>
</Link>

      <label className="block mb-2">Select Subject:</label>
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

      {topics.length > 0 && (
        <>
          <label className="block mb-2">Select Topic:</label>
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

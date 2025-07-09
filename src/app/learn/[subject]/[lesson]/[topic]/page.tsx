'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  question: string;
  answer: string;
  note?: string;
}

export default function LearnPage() {
  const { subject, lesson, topic } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';
      const cacheKey = `quiz_${subject}_${lesson}_${decodeURIComponent(topic as string)}`;
  
      if (!fetchFromDb) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          console.log('📦 Learn: Using cached quiz');
          setQuestions(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }
  
      // Fallback to API call
      console.log('🌐 Learn: Fetching quiz from DB');
      const res = await fetch(`/api/get-quiz?subject=${subject}&lesson=${lesson}&topic=${decodeURIComponent(topic as string)}`);
      const { questions } = await res.json();
  
      setQuestions(questions || []);
      setLoading(false);
  
      // Cache it for future
      localStorage.setItem(cacheKey, JSON.stringify(questions || []));
    };
  
    loadQuestions();
  }, [subject, lesson, topic]);
  

  if (loading) return <p className="p-4">Loading questions...</p>;

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📘 Learn Mode: {topic}</h1>
      
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium">
          {String(subject).charAt(0).toUpperCase() + String(subject).slice(1)} → {String(lesson).charAt(0).toUpperCase() + String(lesson).slice(1)} → {String(topic).charAt(0).toUpperCase() + String(topic).slice(1)}
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        <Link href="/">
          <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600">
            ← Back to Home
          </button>
        </Link>
        <Link href={`/quiz/${subject}/${lesson}/${encodeURIComponent(topic as string)}`}>
          <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600">
            Start Quiz
          </button>
        </Link>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-left border border-gray-300">
          <thead>
            <tr className="bg-gray-200 text-black">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Question</th>
              <th className="p-2 border">Answer</th>
              <th className="p-2 border">Note</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, index) => (
              <tr key={index} className="border-t">
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{q.question}</td>
                <td className="p-2 border">{q.answer}</td>
                <td className="p-2 border">{q.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

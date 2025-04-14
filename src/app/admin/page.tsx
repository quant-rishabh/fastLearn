'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

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

interface Question {
    id: string;
    question: string;
    answer: string;
    note?: string;
    image_before?: string;
    image_after?: string;
  }
  

export default function AdminPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Form state
  const [subjectLabel, setSubjectLabel] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topicName, setTopicName] = useState('');

  const [question, setQuestion] = useState('');
const [answer, setAnswer] = useState('');
const [note, setNote] = useState('');
const [imageBefore, setImageBefore] = useState<string | null>(null);
const [imageAfter, setImageAfter] = useState<string | null>(null);

const [questions, setQuestions] = useState<Question[]>([]);

const [inputMode, setInputMode] = useState<'form' | 'json'>('form');
const [bulkJson, setBulkJson] = useState('');



  // Active tab
  const [activeTab, setActiveTab] = useState<'subject' | 'topic' | 'question' | 'edit'>('subject');

  // Load subjects for dropdowns
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*');
      setSubjects(data || []);
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchTopics = async () => {
      const subject = subjects.find((s) => s.slug === selectedSubject);
      if (!subject) return;
  
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id);
  
      if (!error && data) {
        setTopics(data);
      }
    };
  
    fetchTopics();
  }, [selectedSubject, subjects]);
  
  useEffect(() => {
    const fetchTopics = async () => {
      const subject = subjects.find((s) => s.slug === selectedSubject);
      if (!subject) return;
  
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id);
  
      if (!error && data) {
        setTopics(data);
        console.log('✅ Topics fetched:', data); // 🔍 Debug
      }
    };
  
    fetchTopics();
  }, [selectedSubject, subjects]);
  
  // Handlers
  const handleAddSubject = async () => {
    if (!subjectLabel || !subjectSlug) return;

    const { error } = await supabase.from('subjects').insert({
      label: subjectLabel,
      slug: subjectSlug,
    });

    if (!error) {
      setSubjectLabel('');
      setSubjectSlug('');
      const { data } = await supabase.from('subjects').select('*');
      setSubjects(data || []);
    }
  };

  const handleBulkSubmit = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
  
      if (!Array.isArray(parsed)) {
        alert("❌ JSON must be an array of question objects.");
        return;
      }
  
      const subject = subjects.find((s) => s.slug === selectedSubject);
      const topic = topics.find((t) => t.name === topicName);
  
      if (!subject || !topic) {
        alert("❌ Select subject & topic first.");
        return;
      }
  
      const payload = parsed.map((q: any) => ({
        topic_id: topic.id,
        question: q.question || '',
        answer: q.answer || '',
        note: q.note || null,
        image_before: q.image_before || null,
        image_after: q.image_after || null
      }));
  
      const { error } = await supabase.from('questions').insert(payload);
  
      if (!error) {
        alert('✅ Bulk questions saved!');
        setBulkJson('');
      } else {
        console.error(error);
        alert('❌ Failed to save questions.');
      }
    } catch (err) {
      alert('❌ Invalid JSON format.');
    }
  };
  

  const handleSubmitQuestion = async () => {
    const res = await fetch('/api/save-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: selectedSubject,
        topic: topicName,
        question,
        answer,
        note,
        imageBefore,
        imageAfter,
      }),
    });
  
    const result = await res.json();
  
    if (result.success) {
      alert('✅ Question saved!');
      setQuestion('');
      setAnswer('');
      setNote('');
      setImageBefore(null);
      setImageAfter(null);
      setTopicName('');
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };
  

  const handleAddTopic = async () => {
    const subject = subjects.find((s) => s.slug === selectedSubject);
    if (!subject || !topicName) return;

    const { error } = await supabase.from('topics').insert({
      name: topicName,
      subject_id: subject.id,
    });

    if (!error) {
      setTopicName('');
      alert('Topic added ✅');
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file);
  
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
  
    const result = await res.json();
  
    if (result.url) {
      if (type === 'before') setImageBefore(result.url);
      else setImageAfter(result.url);
    } else {
      alert('❌ Image upload failed.');
    }
  };
  

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Admin Panel</h1>

      <Link href="/" className="inline-block mb-4">
  <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
    ← Back to Home
  </button>
</Link>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
  <button
    onClick={() => setActiveTab('subject')}
    className={`px-4 py-2 rounded border ${activeTab === 'subject' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 hover:bg-blue-100'}`}
  >
    Add Subject
  </button>
  <button
    onClick={() => setActiveTab('topic')}
    className={`px-4 py-2 rounded border ${activeTab === 'topic' ? 'bg-green-600 text-white' : 'bg-white text-gray-800 hover:bg-green-100'}`}
  >
    Add Topic
  </button>
  <button
    onClick={() => setActiveTab('question')}
    className={`px-4 py-2 rounded border ${activeTab === 'question' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-800 hover:bg-yellow-100'}`}
  >
    Add Question
  </button>
  <button
    onClick={() => setActiveTab('edit')}
    className={`px-4 py-2 rounded border ${activeTab === 'edit' ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 hover:bg-purple-100'}`}
  >
    Edit Questions
  </button>
</div>


      {/* Add Subject */}
      {activeTab === 'subject' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">➕ Add New Subject</h2>
          <input
            placeholder="Label (e.g. English)"
            value={subjectLabel}
            onChange={(e) => setSubjectLabel(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <input
            placeholder="Slug (e.g. english)"
            value={subjectSlug}
            onChange={(e) => setSubjectSlug(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button
            onClick={handleAddSubject}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Add Subject
          </button>
        </div>
      )}

      {/* Add Topic */}
      {activeTab === 'topic' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">➕ Add New Topic</h2>
          <select
            value={selectedSubject}
            onChange={(e) => {
                setSelectedSubject(e.target.value);
                setTopicName(''); // ✅ Clear previous topic
            }
                
            }
            className="w-full p-2 border rounded mb-2"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Topic Name (e.g. English Tense)"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button
            onClick={handleAddTopic}
            className="w-full bg-green-600 text-white py-2 rounded"
          >
            Add Topic
          </button>
        </div>
      )}

      {/* Add Question (Coming Next) */}
      {activeTab === 'question' && (
  <div className="mb-6">
    <h2 className="text-lg font-semibold mb-2">➕ Add Question</h2>

    {/* Subject & Topic Dropdowns (Always needed) */}
    <select
      value={selectedSubject}
      onChange={(e) => setSelectedSubject(e.target.value)}
      className="w-full p-2 border rounded mb-2"
    >
      <option value="">-- Select Subject --</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.slug}>
          {s.label}
        </option>
      ))}
    </select>

    <select
      value={topicName}
      onChange={(e) => setTopicName(e.target.value)}
      className="w-full p-2 border rounded mb-4"
    >
      <option value="">-- Select Topic --</option>
      {topics.map((t) => (
        <option key={t.id} value={t.name}>
          {t.name}
        </option>
      ))}
    </select>

    {/* Mode Toggle */}
    <div className="flex gap-2 mb-4 justify-center">
      <button
        onClick={() => setInputMode('form')}
        className={`px-4 py-1 rounded ${inputMode === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Manual Form
      </button>
      <button
        onClick={() => setInputMode('json')}
        className={`px-4 py-1 rounded ${inputMode === 'json' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
      >
        Bulk JSON Input
      </button>
    </div>

    {/* Manual Form */}
    {inputMode === 'form' && (
      <>
        <input
          placeholder="Question"
          className="w-full p-2 border rounded mb-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <input
          placeholder="Answer"
          className="w-full p-2 border rounded mb-2"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <input
          placeholder="Note (optional)"
          className="w-full p-2 border rounded mb-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Image Uploads */}
        <label className="block mb-1">Image Before (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} className="mb-2" />
        {imageBefore && <img src={imageBefore} alt="before" className="mb-2 rounded w-full max-h-40 object-contain border" />}

        <label className="block mb-1">Image After (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} className="mb-2" />
        {imageAfter && <img src={imageAfter} alt="after" className="mb-4 rounded w-full max-h-40 object-contain border" />}

        <button
          onClick={handleSubmitQuestion}
          className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-500"
        >
          Save Question
        </button>
      </>
    )}

    {/* Bulk JSON */}
    {inputMode === 'json' && (
      <>
        <textarea
          placeholder='Paste array of {"question": "...", "answer": "..."}'
          value={bulkJson}
          onChange={(e) => setBulkJson(e.target.value)}
          rows={8}
          className="w-full p-2 border rounded font-mono text-sm"
        />
        <button
          onClick={handleBulkSubmit}
          className="mt-2 w-full bg-green-700 text-white py-2 rounded hover:bg-green-600"
        >
          Save All Questions
        </button>
      </>
    )}
  </div>
)}



      {/* Edit Questions (Coming Next) */}
      {activeTab === 'edit' && (
  <div className="mb-6">
    <h2 className="text-lg font-semibold mb-2">🗂️ Manage Questions (Delete Only)</h2>

    {/* Subject Dropdown */}
    <select
      value={selectedSubject}
      onChange={(e) => {
        setSelectedSubject(e.target.value);
        setTopicName('');
        setQuestions([]);
      }}
      className="w-full p-2 border rounded mb-2"
    >
      <option value="">-- Select Subject --</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.slug}>
          {s.label}
        </option>
      ))}
    </select>

    {/* Topic Dropdown */}
    <select
      value={topicName}
      onChange={async (e) => {
        const topicValue = e.target.value;
        setTopicName(topicValue);

        const subject = subjects.find((s) => s.slug === selectedSubject);
        if (!subject) return;

        const { data: topic } = await supabase
          .from('topics')
          .select('id')
          .eq('name', topicValue)
          .eq('subject_id', subject.id)
          .single();

        if (!topic) return;

        const { data: qs } = await supabase
          .from('questions')
          .select('*')
          .eq('topic_id', topic.id);

        setQuestions(qs || []);
      }}
      className="w-full p-2 border rounded mb-4"
    >
      <option value="">-- Select Topic --</option>
      {topics.map((t) => (
        <option key={t.id} value={t.name}>
          {t.name}
        </option>
      ))}
    </select>

    {/* Questions List with Delete Button */}
    {questions.length === 0 && (
      <p className="text-gray-500 text-sm">No questions found.</p>
    )}

    {questions.map((q) => (
      <div key={q.id} className="border p-3 rounded mb-3 bg-gray-50">
        <p className="text-sm mb-1 text-gray-700">
          <strong>Q:</strong> {q.question}
        </p>
        <p className="text-sm mb-2 text-gray-700">
          <strong>Answer:</strong> {q.answer}
        </p>

        <button
          onClick={async () => {
            const confirm = window.confirm('Are you sure you want to delete this question?');
            if (!confirm) return;

            const { error } = await supabase
              .from('questions')
              .delete()
              .eq('id', q.id);

            if (!error) {
              alert('🗑️ Question deleted');
              setQuestions((prev) => prev.filter((item) => item.id !== q.id));
            } else {
              alert('❌ Delete failed');
            }
          }}
          className="w-full bg-red-600 text-white py-1 rounded text-sm"
        >
          Delete
        </button>
      </div>
    ))}
  </div>
)}


    </main>
  );
}

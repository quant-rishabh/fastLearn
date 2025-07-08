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

const [inputMode, setInputMode] = useState<'form' | 'json'>('json');
const [bulkJson, setBulkJson] = useState('');

const [message, setMessage] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

// Helper to show message
const showMessage = (msg: string, duration = 3000) => {
  setMessage(msg);
  setTimeout(() => setMessage(null), duration);
};



  // Active tab
  const [activeTab, setActiveTab] = useState<'subject' | 'topic' | 'question' | 'edit' | 'deleteTopic'>('subject');

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
        showMessage("❌ JSON must be an array of question objects.");
        return;
      }
  
      const subject = subjects.find((s) => s.slug === selectedSubject);
      const topic = topics.find((t) => t.name === topicName);
  
      if (!subject || !topic) {
        showMessage("❌ Select subject & topic first.");
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
        showMessage('✅ Bulk questions saved!');
        setBulkJson('');
      } else {
        console.error(error);
        showMessage('❌ Failed to save questions.');
      }
    } catch (err) {
      showMessage('❌ Invalid JSON format.');
    }
  };
  

  const handleSubmitQuestion = async () => {
    setLoading(true);
    const res = await fetch('/api/save-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    setLoading(false);
  
    if (result.success) {
      showMessage('✅ Question saved!');
      setQuestion('');
      setAnswer('');
      setNote('');
      setImageBefore(null);
      setImageAfter(null);
      // setTopicName(''); // Do NOT reset topic, keep it selected
    } else {
      showMessage(`❌ Error: ${result.error}`);
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
      showMessage('Topic added ✅');
      
      // Refresh topics list for the currently selected subject
      const { data: updatedTopics } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id);
      
      if (updatedTopics) {
        setTopics(updatedTopics);
      }
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
      showMessage('❌ Image upload failed.');
    }
  };
  

// Utility for handling both paste and file input for images
const handleImageInput = async (
  e: React.ClipboardEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
  type: 'before' | 'after',
  isPaste = false
) => {
  let file: File | null = null;
  if (isPaste && 'clipboardData' in e) {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          file = item.getAsFile();
          break;
        }
      }
    }
  } else if ('target' in e && (e.target as HTMLInputElement).files?.[0]) {
    file = (e.target as HTMLInputElement).files![0];
  }
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    const mockEvent = {
      target: { files: dt.files }
    } as React.ChangeEvent<HTMLInputElement>;
    await handleImageUpload(mockEvent, type);
    showMessage('📋 Image added!');
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-4 max-w-2xl mx-auto">
      {/* Notification */}
      {message && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-base font-semibold transition-all duration-300 bg-gradient-to-r from-purple-700 to-indigo-700 border border-purple-400 animate-fade-in">
          {message}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold drop-shadow text-purple-300">Admin Panel</h1>
        <Link href="/" className="inline-block">
          <button className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow transition-all">← Home</button>
        </Link>
      </div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setActiveTab('subject')}
          className={`px-5 py-2 rounded-lg font-semibold shadow border-2 transition-all duration-150 ${activeTab === 'subject' ? 'bg-blue-700 border-blue-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-blue-200 hover:bg-blue-900 hover:text-white'}`}
        >Add Subject</button>
        <button
          onClick={() => setActiveTab('topic')}
          className={`px-5 py-2 rounded-lg font-semibold shadow border-2 transition-all duration-150 ${activeTab === 'topic' ? 'bg-green-700 border-green-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-green-200 hover:bg-green-900 hover:text-white'}`}
        >Add Topic</button>
        <button
          onClick={() => setActiveTab('question')}
          className={`px-5 py-2 rounded-lg font-semibold shadow border-2 transition-all duration-150 ${activeTab === 'question' ? 'bg-yellow-700 border-yellow-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-yellow-200 hover:bg-yellow-900 hover:text-white'}`}
        >Add Question</button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-5 py-2 rounded-lg font-semibold shadow border-2 transition-all duration-150 ${activeTab === 'edit' ? 'bg-purple-700 border-purple-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-purple-200 hover:bg-purple-900 hover:text-white'}`}
        >Edit Questions</button>
        <button
          onClick={() => setActiveTab('deleteTopic')}
          className={`px-5 py-2 rounded-lg font-semibold shadow border-2 transition-all duration-150 ${activeTab === 'deleteTopic' ? 'bg-red-700 border-red-400 text-white scale-105' : 'bg-gray-900 border-gray-700 text-red-200 hover:bg-red-900 hover:text-white'}`}
        >Delete Topic</button>
      </div>


      {/* Add Subject */}
      {activeTab === 'subject' && (
        <div className="mb-6 bg-gray-950/80 border border-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-purple-200">➕ Add New Subject</h2>
          <input
            placeholder="Label (e.g. English)"
            value={subjectLabel}
            onChange={(e) => setSubjectLabel(e.target.value)}
            className="w-full p-3 border border-gray-700 rounded-lg mb-2 text-gray-100 bg-gray-900 focus:ring-2 focus:ring-purple-500 shadow"
          />
          <input
            placeholder="Slug (e.g. english)"
            value={subjectSlug}
            onChange={(e) => setSubjectSlug(e.target.value)}
            className="w-full p-3 border border-gray-700 rounded-lg mb-4 text-gray-100 bg-gray-900 focus:ring-2 focus:ring-purple-500 shadow"
          />
          <button
            onClick={handleAddSubject}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-bold shadow mb-6"
          >
            Add Subject
          </button>
          <div className="mt-2">
            <h3 className="text-base font-semibold mb-2 text-purple-300">All Subjects</h3>
            <ul className="divide-y divide-gray-800">
              {subjects.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-gray-100 font-medium">{s.label} <span className="text-xs text-gray-400">({s.slug})</span></span>
                  <button
                    className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-xs font-bold shadow transition-all"
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to delete subject '${s.label}'? This will remove all related topics and questions!`)) return;
                      // 1. Get all topics for this subject
                      const { data: topics, error: topicsError } = await supabase.from('topics').select('id').eq('subject_id', s.id);
                      if (topicsError) {
                        showMessage('❌ Failed to fetch topics');
                        return;
                      }
                      // 2. Delete all questions for each topic
                      if (topics && topics.length > 0) {
                        for (const topic of topics) {
                          await supabase.from('questions').delete().eq('topic_id', topic.id);
                        }
                        // 3. Delete all topics for this subject
                        await supabase.from('topics').delete().eq('subject_id', s.id);
                      }
                      // 4. Delete the subject itself
                      const { error } = await supabase.from('subjects').delete().eq('id', s.id);
                      if (!error) {
                        showMessage('🗑️ Subject deleted');
                        const { data } = await supabase.from('subjects').select('*');
                        setSubjects(data || []);
                      } else {
                        showMessage('❌ Delete failed');
                      }
                    }}
                  >Delete</button>
                </li>
              ))}
            </ul>
          </div>
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
        className={`px-4 py-1 rounded ${inputMode === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-500'}`}
      >
        Manual Form
      </button>
      <button
        onClick={() => setInputMode('json')}
        className={`px-4 py-1 rounded ${inputMode === 'json' ? 'bg-green-600 text-white' : 'bg-gray-500'}`}
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

        {/* Image Uploads with Clipboard Paste */}
        <label className="block mb-1">Image Before (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageInput(e, 'before', false)}
          className="mb-2"
        />
        <div
          onPaste={async (e) => await handleImageInput(e, 'before', true)}
          className="mb-2 border-2 border-dashed border-gray-400 rounded p-2 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
          tabIndex={0}
          title="Paste an image here (Ctrl+V or Cmd+V) or long-press to paste on mobile"
        >
          <span className="text-gray-500 text-sm">Paste image here (Ctrl+V or Cmd+V) or long-press to paste on mobile</span>
        </div>
        {imageBefore && (
          <div className="mb-2 flex items-center gap-2">
            <img src={imageBefore} alt="before" className="rounded w-full max-h-40 object-contain border" />
            <button
              type="button"
              onClick={() => setImageBefore(null)}
              className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              title="Remove image"
            >
              Remove
            </button>
          </div>
        )}

        <label className="block mb-1">Image After (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageInput(e, 'after', false)}
          className="mb-2"
        />
        <div
          onPaste={async (e) => await handleImageInput(e, 'after', true)}
          className="mb-2 border-2 border-dashed border-gray-400 rounded p-2 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
          tabIndex={0}
          title="Paste an image here (Ctrl+V or Cmd+V) or long-press to paste on mobile"
        >
          <span className="text-gray-500 text-sm">Paste image here (Ctrl+V or Cmd+V) or long-press to paste on mobile</span>
        </div>
        {imageAfter && (
          <div className="mb-4 flex items-center gap-2">
            <img src={imageAfter} alt="after" className="rounded w-full max-h-40 object-contain border" />
            <button
              type="button"
              onClick={() => setImageAfter(null)}
              className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              title="Remove image"
            >
              Remove
            </button>
          </div>
        )}

        <button
  onClick={handleSubmitQuestion}
  disabled={loading}
  className={`w-full py-2 rounded hover:bg-yellow-500 ${
    loading ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-600 text-white'
  }`}
>
  {loading ? 'Saving...' : 'Save Question'}
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

{activeTab === 'deleteTopic' && (
  <div className="mb-6">
    <h2 className="text-lg font-semibold mb-2 text-red-600">🗑️ Delete Topic & All Questions</h2>

    <select
      value={selectedSubject}
      onChange={(e) => {
        setSelectedSubject(e.target.value);
        setTopicName('');
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

    <button
      onClick={async () => {
        const subject = subjects.find((s) => s.slug === selectedSubject);
        const topic = topics.find((t) => t.name === topicName);

        if (!subject || !topic) {
          showMessage('❌ Select both subject and topic');
          return;
        }

        const confirmed = confirm(`Are you sure you want to delete topic "${topic.name}" and all its questions?`);
        if (!confirmed) return;

        const { error: qError } = await supabase
          .from('questions')
          .delete()
          .eq('topic_id', topic.id);

        const { error: tError } = await supabase
          .from('topics')
          .delete()
          .eq('id', topic.id);

        if (!qError && !tError) {
          showMessage('🗑️ Topic and its questions deleted');
          setTopicName('');

          const { data: updatedTopics } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', subject.id);
          setTopics(updatedTopics || []);

          localStorage.removeItem(`quiz_${selectedSubject}_${encodeURIComponent(topic.name)}`);
        } else {
          showMessage('❌ Delete failed');
          console.error({ qError, tError });
        }
      }}
      className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-500"
    >
      Delete Topic & All Questions
    </button>
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

    {questions.length > 0 && (
      <button
        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold w-full"
        onClick={async () => {
          setLoading(true);
          let hasError = false;
          for (const q of questions) {
            const { error } = await supabase
              .from('questions')
              .update({
                question: q.question,
                answer: q.answer,
                note: q.note,
                image_before: q.image_before,
                image_after: q.image_after,
              })
              .eq('id', q.id);
            if (error) hasError = true;
          }
          setLoading(false);
          if (!hasError) showMessage('✅ All changes saved');
          else showMessage('❌ Some updates failed');
        }}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save All Changes'}
      </button>
    )}
    {questions.map((q) => (
      <div key={q.id} className="border border-gray-800 bg-gray-950/80 p-6 rounded-xl shadow-lg mb-6">
        <label className="block text-xs font-semibold mb-1 text-purple-200">Question</label>
        <input
          type="text"
          value={q.question}
          onChange={e => setQuestions(questions.map(item => item.id === q.id ? { ...item, question: e.target.value } : item))}
          className="w-full p-3 border border-gray-700 rounded-lg mb-3 text-gray-100 bg-gray-900 focus:ring-2 focus:ring-purple-500 shadow"
        />
        <label className="block text-xs font-semibold mb-1 text-purple-200">Answer</label>
        <input
          type="text"
          value={q.answer}
          onChange={e => setQuestions(questions.map(item => item.id === q.id ? { ...item, answer: e.target.value } : item))}
          className="w-full p-3 border border-gray-700 rounded-lg mb-3 text-gray-100 bg-gray-900 focus:ring-2 focus:ring-purple-500 shadow"
        />
        <label className="block text-xs font-semibold mb-1 text-purple-200">Note</label>
        <input
          type="text"
          value={q.note || ''}
          onChange={e => setQuestions(questions.map(item => item.id === q.id ? { ...item, note: e.target.value } : item))}
          className="w-full p-3 border border-gray-700 rounded-lg mb-3 text-gray-100 bg-gray-900 focus:ring-2 focus:ring-purple-500 shadow"
        />
        <div className="flex gap-4 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1 text-purple-200">Image Before</label>
            {q.image_before && (
              <div className="mb-2"><img src={q.image_before} alt="before" className="max-h-24 rounded shadow border border-gray-700" /></div>
            )}
            <textarea
              placeholder="Paste image here (mobile/desktop)"
              className="w-full p-2 border border-gray-700 rounded mb-2 text-gray-100 bg-gray-900 resize-none focus:ring-2 focus:ring-purple-500 shadow"
              rows={1}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                    const result = await res.json();
                    if (result.url) setQuestions(questions.map(item => item.id === q.id ? { ...item, image_before: result.url } : item));
                    e.preventDefault();
                    break;
                  }
                }
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={async e => {
                if (!e.target.files?.[0]) return;
                const formData = new FormData();
                formData.append('file', e.target.files[0]);
                const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                const result = await res.json();
                if (result.url) setQuestions(questions.map(item => item.id === q.id ? { ...item, image_before: result.url } : item));
              }}
              className="text-gray-100 bg-gray-900"
            />
            {q.image_before && (
              <button className="text-xs text-red-400 mt-1 hover:underline" onClick={() => setQuestions(questions.map(item => item.id === q.id ? { ...item, image_before: undefined } : item))}>Remove</button>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1 text-purple-200">Image After</label>
            {q.image_after && (
              <div className="mb-2"><img src={q.image_after} alt="after" className="max-h-24 rounded shadow border border-gray-700" /></div>
            )}
            <textarea
              placeholder="Paste image here (mobile/desktop)"
              className="w-full p-2 border border-gray-700 rounded mb-2 text-gray-100 bg-gray-900 resize-none focus:ring-2 focus:ring-purple-500 shadow"
              rows={1}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                    const result = await res.json();
                    if (result.url) setQuestions(questions.map(item => item.id === q.id ? { ...item, image_after: result.url } : item));
                    e.preventDefault();
                    break;
                  }
                }
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={async e => {
                if (!e.target.files?.[0]) return;
                const formData = new FormData();
                formData.append('file', e.target.files[0]);
                const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
                const result = await res.json();
                if (result.url) setQuestions(questions.map(item => item.id === q.id ? { ...item, image_after: result.url } : item));
              }}
              className="text-gray-100 bg-gray-900"
            />
            {q.image_after && (
              <button className="text-xs text-red-400 mt-1 hover:underline" onClick={() => setQuestions(questions.map(item => item.id === q.id ? { ...item, image_after: undefined } : item))}>Remove</button>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              const confirm = window.confirm('Are you sure you want to delete this question?');
              if (!confirm) return;
              const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', q.id);
              if (!error) {
                showMessage('🗑️ Question deleted');
                setQuestions((prev) => prev.filter((item) => item.id !== q.id));
              } else {
                showMessage('❌ Delete failed');
              }
            }}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-bold shadow transition-all text-sm"
          >Delete</button>
        </div>
      </div>
    ))}
  </div>
)}


    </main>
  );
}

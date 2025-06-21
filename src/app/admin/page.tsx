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
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
  
      for (const item of clipboardItems) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) return;
  
          const formData = new FormData();
          formData.append('file', file);
  
          // Create popup container
          const container = document.createElement('div');
          container.className = 'fixed inset-0 flex items-center justify-center z-50';
          container.innerHTML = `
            <div class="bg-white text-black border shadow-xl rounded-lg p-6 max-w-sm w-full text-center">
              <p class="text-base font-semibold mb-4">Where do you want to use this image?</p>
              <div class="flex gap-4 justify-center">
                <button id="img-before" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Question Image</button>
                <button id="img-after" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Answer Image</button>
              </div>
            </div>
          `;
  
          document.body.appendChild(container);
  
          const removePopup = () => container.remove();
  
          document.getElementById('img-before')?.addEventListener('click', async () => {
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
            });
            const result = await res.json();
            if (result.url) setImageBefore(result.url);
            removePopup();
          });
  
          document.getElementById('img-after')?.addEventListener('click', async () => {
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
            });
            const result = await res.json();
            if (result.url) setImageAfter(result.url);
            removePopup();
          });
  
          break;
        }
      }
    };
  
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
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
      setTopicName('');
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
    <main className="p-4 max-w-md mx-auto">
        {message && (
  <div className="mb-4 p-2 rounded text-white bg-black text-sm text-center shadow">
    {message}
  </div>
)}
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
  <button
    onClick={() => setActiveTab('deleteTopic')}
    className={`px-4 py-2 rounded border ${activeTab === 'deleteTopic' ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 hover:bg-purple-100'}`}
  >
    Delete Topic
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
              showMessage('🗑️ Question deleted');
              setQuestions((prev) => prev.filter((item) => item.id !== q.id));
            } else {
              showMessage('❌ Delete failed');
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

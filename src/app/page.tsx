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

interface Lesson {
  id: string;
  name: string;
  subject_id: string;
}

interface Topic {
  id: string;
  name: string;
  lesson_id: string;
  isAiGenerated?: boolean;
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSlug, setSubjectSlug] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicName, setTopicName] = useState('');
  const [fetchFromDb, setFetchFromDb] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [aiTopics, setAiTopics] = useState<Topic[]>([]);
  const [previousTopics, setPreviousTopics] = useState<Topic[]>([]);
  const [selectedMode, setSelectedMode] = useState<'previous' | 'drill' | ''>('');

  useEffect(() => {
    const stored = localStorage.getItem('fetch_from_db');
    if (stored) setFetchFromDb(stored === 'true');
  }, []);

  // Load previously selected subject and lesson on component mount
  useEffect(() => {
    const savedSubject = localStorage.getItem('lastSelectedSubject');
    const savedLesson = localStorage.getItem('lastSelectedLesson');
    
    if (savedSubject) {
      setSubjectSlug(savedSubject);
    }
    if (savedLesson) {
      setSelectedLesson(savedLesson);
    }
  }, []);

  const handleToggleDbFetch = (val: boolean) => {
    setFetchFromDb(val);
    localStorage.setItem('fetch_from_db', String(val));
  };

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';

      // Cache Mode: Use cache if available, only fetch if cache is empty
      if (!fetchFromDb) {
        const cached = localStorage.getItem('subjects');
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSubjects(parsed);
              return; // Exit early, don't fetch from DB
            }
          } catch (e) {
            console.error('❌ Failed to parse cached subjects:', e);
          }
        }
      }

      // Fresh Mode: Always fetch from DB, or Cache Mode fallback
      try {
        const { data, error } = await supabase.from('subjects').select('*');
        if (!error && data) {
          setSubjects(data);
          // Always update cache when we fetch from DB
          localStorage.setItem('subjects', JSON.stringify(data));
        } else {
          console.error('Failed to fetch subjects:', error);
        }
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    };
    loadSubjects();
  }, [fetchFromDb]);

  // Load lessons for selected subject
  useEffect(() => {
    const fetchLessons = async () => {
      if (!subjectSlug) {
        setLessons([]);
        setSelectedLesson('');
        setTopics([]);
        setTopicName('');
        return;
      }
      
      const subject = subjects.find((s) => s.slug === subjectSlug);
      if (!subject) return;

      const cacheKey = `lessons_${subject.id}`;
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';

      // Cache Mode: Use cache if available, only fetch if cache is empty
      if (!fetchFromDb) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLessons(parsed);
              
              // Restore saved lesson if it exists in the loaded lessons
              const savedLesson = localStorage.getItem('lastSelectedLesson');
              if (savedLesson && parsed.some(lesson => lesson.name === savedLesson)) {
                setSelectedLesson(savedLesson);
              }
              
              return; // Exit early, don't fetch from DB
            }
          } catch (e) {
            console.error('❌ Failed to parse cached lessons:', e);
          }
        }
      }

      // Fresh Mode: Always fetch from DB, or Cache Mode fallback
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('subject_id', subject.id);

        if (!error && data) {
          setLessons(data);
          // Always update cache when we fetch from DB
          localStorage.setItem(cacheKey, JSON.stringify(data));
          
          // Restore saved lesson if it exists in the loaded lessons
          const savedLesson = localStorage.getItem('lastSelectedLesson');
          if (savedLesson && data.some(lesson => lesson.name === savedLesson)) {
            setSelectedLesson(savedLesson);
          }
        } else {
          console.error('Failed to fetch lessons:', error);
        }
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    };

    fetchLessons();
  }, [subjectSlug, subjects, fetchFromDb]);

  // Load topics for selected lesson
  useEffect(() => {
    const fetchTopics = async () => {
      if (!selectedLesson) {
        setTopics([]);
        setTopicName('');
        return;
      }
      
      const lesson = lessons.find((l) => l.name === selectedLesson);
      if (!lesson) return;

      const cacheKey = `topics_${lesson.id}`;
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';

      // Cache Mode: Use cache if available, only fetch if cache is empty
      if (!fetchFromDb) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTopics(parsed);
              return; // Exit early, don't fetch from DB
            }
          } catch (e) {
            console.error('❌ Failed to parse cached topics:', e);
          }
        }
      }

      // Fresh Mode: Always fetch from DB, or Cache Mode fallback
      try {
        const { data, error } = await supabase
          .from('topics')
          .select('*')
          .eq('lesson_id', lesson.id);

        if (!error && data) {
          setTopics(data);
          // Always update cache when we fetch from DB
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } else {
          console.error('Failed to fetch topics:', error);
        }
      } catch (error) {
        console.error('❌ Database error:', error);
      }
    };

    fetchTopics();
  }, [selectedLesson, lessons, fetchFromDb]);

  // Function to generate single AI topic and navigate directly
  const generateAndNavigateToRandomTopic = async () => {
    if (!subjectSlug || !selectedLesson) return;
    
    setIsGeneratingTopics(true);
    try {
      const response = await fetch('/api/ai-generate-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subjectSlug,
          lesson: selectedLesson,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.topics.length > 0) {
        // Pick a random topic from the generated ones
        const randomTopic = data.topics[Math.floor(Math.random() * data.topics.length)];
        
        // Store the topic content in sessionStorage for the speaking page
        if (randomTopic.content) {
          sessionStorage.setItem('currentTopicContent', randomTopic.content);
        }
        
        // Navigate directly to speaking practice with the random topic
        window.location.href = `/speaking/${subjectSlug}/${encodeURIComponent(selectedLesson)}/${encodeURIComponent(randomTopic.name)}`;
      } else {
        console.error('Failed to generate AI topics:', data.error);
        setToastMsg('❌ Failed to generate AI topics');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setIsGeneratingTopics(false);
      }
    } catch (error) {
      console.error('Error generating AI topics:', error);
      setToastMsg('❌ Error generating AI topics');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setIsGeneratingTopics(false);
    }
  };

  // Function to fetch previous sessions
  const fetchPreviousSessions = async () => {
    if (!subjectSlug || !selectedLesson) return;
    
    console.log('🔍 Fetching previous sessions with:', {
      subjectSlug,
      selectedLesson,
      encodedSubject: encodeURIComponent(subjectSlug),
      encodedLesson: encodeURIComponent(selectedLesson)
    });
    
    try {
      const url = `/api/get-previous-sessions?subject=${encodeURIComponent(subjectSlug)}&lesson=${encodeURIComponent(selectedLesson)}`;
      console.log('🌐 API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 API Response:', data);
      
      if (data.success) {
        setPreviousTopics(data.topics);
        setToastMsg(`📚 Found ${data.count} previous topics!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('Failed to fetch previous sessions:', data.error);
        setPreviousTopics([]);
      }
    } catch (error) {
      console.error('Error fetching previous sessions:', error);
      setPreviousTopics([]);
    }
  };

  // Combined topics (existing + AI generated)
  const allTopics = [...topics, ...aiTopics];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-0 text-gray-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur shadow-md py-4 px-4 flex flex-col items-center border-b border-gray-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-purple-400 flex items-center gap-2 drop-shadow">
          <span role="img" aria-label="bolt">⚡</span> Quick Learn Quiz
        </h1>
        <div className="flex gap-2 mt-2">
          <Link href="/">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-all text-sm font-semibold border border-purple-500">
              Home
            </button>
          </Link>
          <Link href="/settings">
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg shadow hover:bg-purple-700 hover:text-white transition-all text-sm font-semibold border border-gray-600">
              Settings
            </button>
          </Link>
          <Link href="/admin">
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg shadow hover:bg-purple-700 hover:text-white transition-all text-sm font-semibold border border-gray-600">
              Admin Panel
            </button>
          </Link>
          <Link href="/progress">
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg shadow hover:bg-purple-700 hover:text-white transition-all text-sm font-semibold border border-gray-600">
              Progress
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto mt-6 px-2">
        {/* External Links */}
        <div className="mb-4 text-center flex gap-3 justify-center">
          <a href="https://www.notion.so/English-Learning-21112dcedf448038b8e1f686d2c8d4c2" target="_blank" rel="noopener noreferrer">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all font-semibold border border-blue-500">
              📖 English Wiki
            </button>
          </a>
          <a href="https://gemini.google.com/app/2e7322f53102b686?hl=en-IN" target="_blank" rel="noopener noreferrer">
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition-all font-semibold border border-orange-500">
              🎯 JAM Practice
            </button>
          </a>
          <a href="https://gemini.google.com/app/eed54c4485daa4c0?hl=en-IN" target="_blank" rel="noopener noreferrer">
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-all font-semibold border border-green-500">
              🔧 Generate Json
            </button>
          </a>
        </div>

        {/* Subject Dropdown */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-purple-300">📘 Select Subject:</label>
          <select
            value={subjectSlug}
            onChange={(e) => {
              const selectedSubject = e.target.value;
              setSubjectSlug(selectedSubject);
              setSelectedLesson('');
              setTopicName('');
              setSelectedMode('');
              setAiTopics([]);
              setPreviousTopics([]);
              
              // Save to localStorage
              if (selectedSubject) {
                localStorage.setItem('lastSelectedSubject', selectedSubject);
              } else {
                localStorage.removeItem('lastSelectedSubject');
              }
              // Clear saved lesson when subject changes
              localStorage.removeItem('lastSelectedLesson');
            }}
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

        {/* Lesson Dropdown */}
        {lessons.length > 0 && (
          <div className="mb-4">
            <label className="block mb-2 font-medium text-purple-300">📝 Select Lesson:</label>
            <select
              value={selectedLesson}
              onChange={(e) => {
                const selectedLessonValue = e.target.value;
                setSelectedLesson(selectedLessonValue);
                setTopicName('');
                setSelectedMode('');
                setAiTopics([]);
                setPreviousTopics([]);
                
                // Save to localStorage
                if (selectedLessonValue) {
                  localStorage.setItem('lastSelectedLesson', selectedLessonValue);
                } else {
                  localStorage.removeItem('lastSelectedLesson');
                }
              }}
              className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-950 text-purple-100 shadow-sm"
            >
              <option value="" className="text-gray-400">-- Choose Lesson --</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.name} className="text-gray-900 bg-purple-100">
                  {lesson.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Three Mode Selection Buttons */}
        {subjectSlug && selectedLesson && !selectedMode && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-purple-300 mb-4 text-center">
              🎯 What would you like to do?
            </h3>
            <div className="grid gap-4">
              {/* Learn Something New */}
              <button
                onClick={() => {
                  generateAndNavigateToRandomTopic();
                }}
                disabled={isGeneratingTopics}
                className="w-full bg-gradient-to-r from-orange-600 to-red-500 text-white p-4 rounded-lg font-bold shadow hover:scale-105 hover:from-orange-700 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🆕</span>
                <div className="text-left">
                  <div className="text-lg">{isGeneratingTopics ? 'Getting Random Topic...' : 'Learn Something New'}</div>
                  <div className="text-sm opacity-90">Jump to a random AI topic</div>
                </div>
              </button>

              {/* Review Previous Sessions */}
              <button
                onClick={() => {
                  setSelectedMode('previous');
                  fetchPreviousSessions();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg font-bold shadow hover:scale-105 hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3"
              >
                <span className="text-2xl">📚</span>
                <div className="text-left">
                  <div className="text-lg">Review Previous Sessions</div>
                  <div className="text-sm opacity-90">Topics you've practiced before</div>
                </div>
              </button>

              {/* Practice/Drill */}
              <button
                onClick={() => setSelectedMode('drill')}
                className="w-full bg-gradient-to-r from-green-600 to-teal-500 text-white p-4 rounded-lg font-bold shadow hover:scale-105 hover:from-green-700 hover:to-teal-600 transition-all flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🎯</span>
                <div className="text-left">
                  <div className="text-lg">Practice/Drill</div>
                  <div className="text-sm opacity-90">Existing curriculum topics</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Topic Selection based on Mode */}
        {selectedMode && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="font-medium text-purple-300">
                {selectedMode === 'previous' && '📚 Previous Session Topics:'}
                {selectedMode === 'drill' && '📁 Curriculum Topics:'}
              </label>
              <button
                onClick={() => {
                  setSelectedMode('');
                  setTopicName('');
                  setAiTopics([]);
                  setPreviousTopics([]);
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-all"
              >
                ← Back
              </button>
            </div>

            <select
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-950 text-purple-100 shadow-sm"
            >
              <option value="" className="text-gray-400">-- Choose Topic --</option>

              {/* Previous Session Topics */}
              {selectedMode === 'previous' && previousTopics.map((topic) => (
                <option key={topic.id} value={topic.name} className="text-gray-900 bg-blue-100">
                  📚 {topic.name} ({(topic as any).sessionCount} sessions)
                </option>
              ))}

              {/* Curriculum Topics */}
              {selectedMode === 'drill' && topics.map((topic) => (
                <option key={topic.id} value={topic.name} className="text-gray-900 bg-green-100">
                  🎯 {topic.name}
                </option>
              ))}
            </select>

            {/* Loading/Info Messages */}
            {selectedMode === 'previous' && previousTopics.length === 0 && !isGeneratingTopics && (
              <div className="mt-2 text-center text-blue-300">
                <span>📚 No previous sessions found for this lesson.</span>
              </div>
            )}

            {selectedMode === 'drill' && topics.length === 0 && (
              <div className="mt-2 text-center text-green-300">
                <span>🎯 No curriculum topics available for this lesson.</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {subjectSlug && selectedLesson && selectedMode && topicName && (
          <div className="flex flex-col gap-3 mt-4">
            {(() => {
              if (selectedMode === 'previous') {
                // Direct link to analysis view for previous topics
                return (
                  <Link href={`/speaking/analysis/${subjectSlug}/${encodeURIComponent(selectedLesson)}/${encodeURIComponent(topicName)}`}>
                    <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
                      � View Analysis & Results
                    </button>
                  </Link>
                );
              } else {
                // Quiz & Learn for curriculum topics
                return (
                  <>
                    <Link href={`/quiz/${subjectSlug}/${encodeURIComponent(selectedLesson)}/${encodeURIComponent(topicName)}`}>
                      <button className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all flex items-center justify-center gap-2">
                        ▶️ Start Quiz
                      </button>
                    </Link>
                    <Link href={`/learn/${subjectSlug}/${encodeURIComponent(selectedLesson)}/${encodeURIComponent(topicName)}`}>
                      <button className="w-full bg-gradient-to-r from-green-500 to-teal-400 text-gray-900 py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-green-600 hover:to-teal-500 transition-all flex items-center justify-center gap-2">
                        📖 Learn
                      </button>
                    </Link>
                  </>
                );
              }
            })()}
          </div>
        )}
      </div>
      <Toast message={toastMsg} show={showToast} />
    </main>
  );
}

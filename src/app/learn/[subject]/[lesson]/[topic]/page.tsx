'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Question {
  question: string;
  answer: string;
  note?: string;
}

export default function LearnPage() {
  const { subject, lesson, topic } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [globalSpeechEnabled, setGlobalSpeechEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

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
  
  useEffect(() => {
    // Load global speech setting from localStorage
    const savedGlobalSpeech = localStorage.getItem('global_speech_enabled') === 'true';
    setGlobalSpeechEnabled(savedGlobalSpeech);
    
    // Check if speech recognition is supported
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        // Mobile-specific configurations
        recognitionRef.current.continuous = false; // Set to false for better mobile support
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;
        
        // Mobile Chrome and Safari specific settings
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          recognitionRef.current.continuous = false; // Always false on mobile
          recognitionRef.current.interimResults = false; // Disable interim results on mobile for stability
        }

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          // Update search query with final transcript or show interim results
          if (finalTranscript) {
            setSearchQuery(finalTranscript.trim());
            // On mobile, automatically restart if global speech is enabled
            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && globalSpeechEnabled) {
              setTimeout(() => {
                if (globalSpeechEnabled) {
                  try {
                    recognitionRef.current.start();
                  } catch (error) {
                    console.log('Auto-restart failed, will be handled by useEffect');
                  }
                }
              }, 100);
            }
          } else if (interimTranscript && !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // Only show interim results on desktop
            setSearchQuery(interimTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          // Handle specific mobile errors
          if (event.error === 'not-allowed') {
            alert('🎤 Microphone permission denied. Please enable microphone access in your browser settings.');
          } else if (event.error === 'no-speech') {
            console.log('No speech detected, will retry...');
          } else if (event.error === 'network') {
            console.log('Network error, speech recognition requires internet connection');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Only restart if global speech is enabled
          // The consolidated useEffect will handle restarting, so we don't need to do it here
        };
      }
    }

    // Cleanup: Stop speech recognition when component unmounts or user navigates away
    return () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Failed to stop recognition on cleanup:', error);
        }
      }
    };
  }, []);

  // Consolidated speech recognition management
  useEffect(() => {
    if (!speechSupported || !recognitionRef.current) return;

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (globalSpeechEnabled && !isListening) {
      // Start listening when global speech is enabled
      const timer = setTimeout(() => {
        // Double-check conditions before starting
        if (globalSpeechEnabled && !isListening && recognitionRef.current) {
          try {
            // Request microphone permission on mobile
            if (isMobile && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                  recognitionRef.current.start();
                })
                .catch((error) => {
                  console.error('Microphone permission denied:', error);
                  alert('🎤 Please allow microphone access to use voice input.');
                });
            } else {
              recognitionRef.current.start();
            }
          } catch (error) {
            // If it's already started, just update the state
            if (error instanceof Error && error.message.includes('already started')) {
              setIsListening(true);
            } else {
              console.error('Failed to start recognition:', error);
              // On mobile, show user-friendly message
              if (isMobile) {
                console.log('Speech recognition failed on mobile. This might be due to browser limitations.');
              }
            }
          }
        }
      }, isMobile ? 500 : 100); // Longer delay for mobile
      
      return () => clearTimeout(timer);
    } else if (!globalSpeechEnabled && isListening) {
      // Stop listening when global speech is disabled
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
      setIsListening(false);
    }
  }, [globalSpeechEnabled, speechSupported, isListening]);

  const toggleGlobalSpeech = () => {
    const newValue = !globalSpeechEnabled;
    
    if (!newValue && isListening) {
      // If turning off and currently listening, stop immediately
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
      setIsListening(false);
    }
    
    setGlobalSpeechEnabled(newValue);
    localStorage.setItem('global_speech_enabled', newValue.toString());
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      // User manually stopping - set flag first, then stop
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    } else {
      // User manually starting
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  };

  // Filter questions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredQuestions(questions);
    } else {
      const filtered = questions.filter(q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.note && q.note.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredQuestions(filtered);
    }
  }, [searchQuery, questions]);

  if (loading) return <p className="p-4">Loading questions...</p>;

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📘 Learn Mode: {decodeURIComponent(topic as string)}</h1>
      
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium">
          {String(subject).charAt(0).toUpperCase() + String(subject).slice(1)} → {String(lesson).charAt(0).toUpperCase() + String(lesson).slice(1)} → {String(decodeURIComponent(topic as string)).charAt(0).toUpperCase() + String(decodeURIComponent(topic as string)).slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between w-full gap-2 mb-6">
        <Link href="/">
          <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600">
            ← Back to Home
          </button>
        </Link>
        
        <div className="flex gap-2">
          <Link href={`/quiz/${subject}/${lesson}/${encodeURIComponent(topic as string)}`}>
            <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600">
              Start Quiz
            </button>
          </Link>
          
          {/* Global Speech Toggle */}
          {speechSupported && (
            <button
              onClick={toggleGlobalSpeech}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
                globalSpeechEnabled
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={globalSpeechEnabled ? 'Disable global speech recognition' : 'Enable global speech recognition'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              <span className="hidden sm:inline">{globalSpeechEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Global Speech Status */}
      {globalSpeechEnabled && isListening && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-700 text-green-200 px-3 py-1 rounded-full text-sm">
            <span className="animate-pulse">●</span>
            Global Speech Recognition Active
          </div>
        </div>
      )}

      {/* Search and Voice Input */}
      <div className="mb-6">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search questions, answers, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {speechSupported && (
            <button
              onClick={toggleListening}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice search'}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </button>
          )}
        </div>
        
        {isListening && (
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            <span className="animate-pulse">●</span>
            Listening... Click the microphone again to stop
          </p>
        )}
        
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            {filteredQuestions.length} result{filteredQuestions.length !== 1 ? 's' : ''} found for "{searchQuery}"
          </p>
        )}
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
            {filteredQuestions.map((q, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="p-2 border">{questions.indexOf(q) + 1}</td>
                <td className="p-2 border">{q.question}</td>
                <td className="p-2 border">{q.answer}</td>
                <td className="p-2 border">{q.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredQuestions.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500">
            <p>No results found for "{searchQuery}"</p>
            <p className="text-sm mt-2">Try different keywords or clear the search</p>
          </div>
        )}
      </div>
    </main>
  );
}

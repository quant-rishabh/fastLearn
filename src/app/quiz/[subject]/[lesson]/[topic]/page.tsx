'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { isFuzzyMatchArray } from '@/utils/fuzzyMatch';
import Link from 'next/link';
import { useRef } from 'react';
import { supabase } from '@/utils/supabase';

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
  image_before?: string;
  image_after?: string;
}


export default function QuizPage() {
  const { subject, lesson, topic } = useParams();
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // Initialize to -1 to prevent premature TTS
  const [userAnswers, setUserAnswers] = useState<string[]>([]); // New: array of answers
  const [inputValue, setInputValue] = useState(''); // New: input for current answer
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const transcriptRef = useRef('');   // final‑confirmed words only
  const [wrongAnswers, setWrongAnswers] = useState<
    {
      question: string;
      correct: string;
      user: string;
      note?: string;
      normalizedCorrect?: string;
      normalizedUser?: string;
    }[]
  >([]);
  
  // Track indices of questions not yet answered correctly
  const [remainingQuestions, setRemainingQuestions] = useState<number[]>([]);
  
  // Add state for subject label
  const [subjectLabel, setSubjectLabel] = useState<string>('');

  // Mobile detection - calculate once to prevent repeated checks
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Speech recognition states - Whisper only (hold-to-speak)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micReady, setMicReady] = useState(false); // Track if mic is pre-acquired
  const finishedRef = useRef<boolean>(false);
  
  // OpenAI Whisper STT refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep finishedRef in sync with finished state
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  // Fetch subject label
  useEffect(() => {
    const fetchSubjectLabel = async () => {
      if (!subject) return;
      
      const { data, error } = await supabase
        .from('subjects')
        .select('label')
        .eq('slug', subject)
        .single();
      
      if (data && !error) {
        setSubjectLabel(data.label);
      }
    };
    
    fetchSubjectLabel();
  }, [subject]);

  // On questions load, initialize remainingQuestions with all indices, shuffled (no repetition at start)
useEffect(() => {
  if (questions.length > 0) {
    const indices = Array.from({ length: questions.length }, (_, i) => i);
    const shuffleEnabled = localStorage.getItem('shuffle_enabled') === 'true';
    const initialOrder = shuffleEnabled ? shuffleArray(indices) : indices;
    setRemainingQuestions(initialOrder);
    setCurrentIndex(initialOrder[0]);
    setSessionQuestionNumber(1); // Reset session question number
    setFinished(false);
  }
}, [questions.length]);


  // Helper to shuffle an array
  function shuffleArray<T>(array: T[]): T[] {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  
  useEffect(() => {
    const loadQuiz = async () => {
      const cacheKey = `quiz_${subject}_${lesson}_${decodeURIComponent(topic as string)}`;
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';
  
      // Cache Mode (fetchFromDb = false): Use cache if available, only fetch if cache is empty
      if (!fetchFromDb) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('📦 Using cached quiz data');
              setQuestions(parsed);
              return; // Exit early, don't fetch from DB
            } else {
              console.warn('⚠️ Cached quiz is empty or invalid, fetching from DB');
            }
          } catch (e) {
            console.error('❌ Failed to parse cached quiz, fetching from DB:', e);
          }
        } else {
          console.log('📭 No cache found, fetching from DB');
        }
      } else {
        console.log('🔄 Fresh mode enabled, fetching from DB');
      }
  
      // Fresh Mode (fetchFromDb = true): Always fetch from DB, always update cache
      // OR Cache Mode fallback: Fetch from DB if cache was empty/invalid
      try {
        const res = await fetch(`/api/get-quiz?subject=${subject}&lesson=${lesson}&topic=${decodeURIComponent(topic as string)}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const { questions } = await res.json();
  
        if (!questions || !Array.isArray(questions)) {
          throw new Error('Invalid questions data received from API');
        }
  
        const shuffleEnabled = localStorage.getItem('shuffle_enabled') === 'true';
        const finalQuestions = shuffleEnabled ? questions.sort(() => Math.random() - 0.5) : questions;
  
        setQuestions(finalQuestions);
        
        // Always update cache when we fetch from DB
        localStorage.setItem(cacheKey, JSON.stringify(finalQuestions));
        console.log('💾 Quiz data cached');
      } catch (error) {
        console.error('❌ Failed to fetch quiz from DB:', error);
        
        // Fallback: try to use any cached data if DB fetch fails
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('🆘 Using cached data as fallback due to DB error');
              setQuestions(parsed);
              return;
            }
          } catch (e) {
            console.error('❌ Cached data is also invalid:', e);
          }
        }
        
        // If all fails, show error
        alert('❌ Failed to load quiz. Please check your connection and try again.');
      }
    };
  
    loadQuiz();
  }, [subject, lesson, topic]);

  // Function to pre-acquire microphone (keeps it warm for instant recording)
  const initializeMicrophone = async () => {
    if (streamRef.current) {
      console.log('🎤 Microphone already initialized');
      return true;
    }
    
    try {
      console.log('🎤 Pre-acquiring microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicReady(true);
      console.log('🎤 Microphone ready for instant recording!');
      return true;
    } catch (error) {
      console.error('🎤 Failed to acquire microphone:', error);
      return false;
    }
  };

  // Release microphone stream
  const releaseMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setMicReady(false);
      console.log('🎤 Microphone released');
    }
  };

  // Speech recognition setup - Whisper only (hold-to-speak)
  useEffect(() => {
    // Check if MediaRecorder is supported (for OpenAI Whisper STT)
    const hasMediaDevices = typeof window !== 'undefined' && 
      typeof navigator !== 'undefined' && 
      'mediaDevices' in navigator && 
      typeof navigator.mediaDevices?.getUserMedia === 'function';
    
    if (hasMediaDevices) {
      setSpeechSupported(true);
      console.log('🎤 Whisper STT: MediaRecorder supported (hold-to-speak)');
      // Pre-acquire microphone for instant recording
      initializeMicrophone();
    } else {
      console.log('MediaRecorder not supported. User agent:', navigator.userAgent);
      setSpeechSupported(false);
    }

    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      releaseMicrophone();
    };
  }, []);

  // Function to transcribe audio with OpenAI Whisper
  const transcribeWithWhisper = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      console.log('🎤 Empty audio blob, skipping transcription');
      return '';
    }
    
    setIsTranscribing(true);
    console.log('🎤 Sending audio to Whisper, size:', audioBlob.size);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const res = await fetch('/api/stt-openai', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        console.error('🎤 Whisper API error:', res.status);
        return '';
      }
      
      const data = await res.json();
      console.log('🎤 Whisper transcript:', data.transcript);
      
      return data.transcript || '';
    } catch (error) {
      console.error('🎤 Whisper transcription error:', error);
      return '';
    } finally {
      setIsTranscribing(false);
    }
  };

  // Hold-to-speak: Start recording on press (instant if mic is pre-acquired)
  const startHoldToSpeak = async () => {
    if (isListening || isTranscribing) return;
    
    // Vibrate on press (Android only, iOS ignores silently)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    try {
      console.log('🎤 Hold-to-speak: Starting recording...');
      
      // If mic not ready, acquire it now (first time only)
      if (!streamRef.current) {
        console.log('🎤 Mic not ready, acquiring now...');
        const success = await initializeMicrophone();
        if (!success) {
          alert('🎤 Microphone permission denied. Please enable microphone access.');
          return;
        }
      }
      
      // Create MediaRecorder with pre-acquired stream (instant!)
      const mediaRecorder = new MediaRecorder(streamRef.current!, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording immediately
      mediaRecorder.start(100); // Capture in 100ms chunks for fast response
      setIsListening(true);
      console.log('🎤 Recording started instantly - speak now!');
      
    } catch (error) {
      console.error('🎤 Failed to start recording:', error);
      // Stream might be stale, try to re-acquire
      releaseMicrophone();
      alert('🎤 Microphone error. Please try again.');
    }
  };

  // Hold-to-speak: Stop recording on release and transcribe (keeps mic warm)
  const stopHoldToSpeak = async () => {
    if (!isListening) return;
    
    // Vibrate on release (Android only, iOS ignores silently)
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    
    console.log('🎤 Hold-to-speak: Stopping and transcribing...');
    setIsListening(false);
    
    // Stop MediaRecorder (but keep stream alive for next recording!)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Wait a bit for final chunks
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get and transcribe audio
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    console.log('🎤 Audio blob size:', audioBlob.size);
    
    if (audioBlob.size > 0) {
      const transcript = await transcribeWithWhisper(audioBlob);
      
      if (transcript && transcript.trim()) {
        // Append to existing text
        setInputValue(prev => {
          const newValue = prev ? `${prev} ${transcript}`.trim() : transcript;
          transcriptRef.current = newValue;
          return newValue;
        });
        console.log('🎤 Transcript appended:', transcript);
      }
    }
    
    // Clear chunks (but keep stream alive for instant next recording!)
    audioChunksRef.current = [];
    // NOTE: We do NOT stop the stream here - it stays warm for the next recording
  };

  // Function to handle navigation and cleanup
  const handleNavigateHome = () => {
    if (isListening) {
      stopHoldToSpeak();
    }
    // Release microphone when leaving the page
    releaseMicrophone();
  };

const spokenIndexRef = useRef<number | null>(null);
const spokenAnswerIndexRef = useRef<number | null>(null);

useEffect(() => {
  const speakSetting = localStorage.getItem('auto_speak');

  if (
    speakSetting === 'true' &&
    questions?.length > 0 &&
    currentIndex >= 0 && // Only speak if we have a valid index
    questions[currentIndex]?.question &&
    spokenIndexRef.current !== currentIndex
  ) {
    playGoogleTTS(questions[currentIndex].question);
    spokenIndexRef.current = currentIndex;
  }
}, [currentIndex, questions]);

// Auto-speak answer after submission
useEffect(() => {
  const speakAnswerSetting = localStorage.getItem('auto_speak_answer');

  if (
    speakAnswerSetting === 'true' &&
    hasSubmitted &&
    questions?.length > 0 &&
    currentIndex >= 0 &&
    questions[currentIndex]?.answer &&
    spokenAnswerIndexRef.current !== currentIndex
  ) {
    // Speak the answer (replace @ with "and" for multi-answers)
    const answerText = questions[currentIndex].answer.replace(/@/g, ' and ');
    playGoogleTTS(answerText);
    spokenAnswerIndexRef.current = currentIndex;
  }
}, [hasSubmitted, currentIndex, questions]);


  // Add this function to clear both input and speech buffer
const clearInputAndSpeech = () => {
  setInputValue('');
  setSpeechTranscript('');
  transcriptRef.current = '';          // Reset running transcript
  audioChunksRef.current = [];         // Clear audio chunks for Whisper
};

  const handleAddAnswer = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !userAnswers.includes(trimmed.toLowerCase())) {
      const newAnswers = [...userAnswers, trimmed.toLowerCase()];
      setUserAnswers(newAnswers);
      setInputValue('');
      
      // Check if this answer is wrong for multi-answer questions
      if (totalExpected > 1) {
        const isCurrentAnswerCorrect = isAnswerCorrect(trimmed.toLowerCase());
        if (!isCurrentAnswerCorrect) {
          // If any answer is wrong in multi-answer, submit immediately to show feedback
          setTimeout(() => {
            handleSubmit(newAnswers);
          }, 0);
          return;
        }
      }
      
      // For single answer questions, submit immediately after adding
      if (totalExpected === 1) {
        setTimeout(() => {
          handleSubmit(newAnswers);
        }, 0);
      }
      // For multi-answer questions, auto-submit if this is the last answer needed
      else if (newAnswers.length === totalExpected) {
        setTimeout(() => {
          handleSubmit(newAnswers);
        }, 0);
      }
    }
  };


  // Helper to remove punctuation for matching
  function normalizeText(text: string) {
    return text.replace(/[.,\/#!$%\^&*;:{}=\-_`~()?"'’]/g, '').replace(/\s{2,}/g, ' ').trim().toLowerCase();
  }

  // Function to check if an individual answer is correct (ignoring punctuation)
  const isAnswerCorrect = (answer: string) => {
    const correctAnswer = questions[currentIndex]?.answer || '';
    const expectedAnswers = correctAnswer
      .split('@')
      .map((a) => normalizeText(a))
      .filter(Boolean);
    const savedThreshold = Number(localStorage.getItem('fuzzy_threshold') || '0.4');
    return expectedAnswers.some(expected => 
      isFuzzyMatchArray([normalizeText(answer)], [expected], savedThreshold)
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInputValue(e.target.value);
  transcriptRef.current = e.target.value;        // <-- NEW
};

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      
      if (totalExpected === 1) {
        // For single answer, submit directly
        const answer = inputValue.trim().toLowerCase();
        setUserAnswers([answer]);
        handleSubmit([answer]);
      } else {
        // For multi-answer, check if current answer is wrong first
        const trimmed = inputValue.trim().toLowerCase();
        const isCurrentAnswerCorrect = isAnswerCorrect(trimmed);
        
        if (!isCurrentAnswerCorrect) {
          // If answer is wrong, add it and submit immediately
          const newAnswers = [...userAnswers, trimmed];
          setUserAnswers(newAnswers);
          setInputValue(''); // Clear input field
          setTimeout(() => {
            handleSubmit(newAnswers);
          }, 0);
        } else {
          // If answer is correct, use normal add logic (which already clears input)
          handleAddAnswer();
        }
      }
    }
  };

  const handleRemoveAnswer = (idx: number) => {
    setUserAnswers(userAnswers.filter((_, i) => i !== idx));
  };

  // Modified handleNext for adaptive flow
  const handleNext = () => {
  setTimerActive(false);
  setUserAnswers([]);
  setHasSubmitted(false);
  setIsCorrect(null);
  setSessionQuestionNumber((prev) => prev + 1);

  // Clear both input and speech buffer
  clearInputAndSpeech();

  // Stop any ongoing recording
  if (isListening) {
    stopHoldToSpeak();
  }

  if (remainingQuestions.length === 0) {
    setFinished(true);
    return;
  }

  setCurrentIndex(remainingQuestions[0]);

  setTimeout(() => {
    inputRef.current?.focus();
  }, 100);
};


  // Modified handleSubmit for adaptive flow (ignoring punctuation)
  const handleSubmit = async (overrideAnswers?: string[]) => {
    setTimerActive(false);
    
    // With hold-to-speak, transcription happens on release, so inputValue already has the text
    let finalAnswers = overrideAnswers || userAnswers;
    
    // If no answers but there's text in input, use that
    if (finalAnswers.length === 0 && inputValue.trim()) {
      finalAnswers = [inputValue.trim().toLowerCase()];
      setUserAnswers(finalAnswers);
    }
    
    const correctAnswer = questions[currentIndex]?.answer;
    const expectedAnswers = correctAnswer
      .split('@')
      .map((a) => normalizeText(a))
      .filter(Boolean);
    const totalExpected = expectedAnswers.length;
    const answersToCheck = finalAnswers.map(a => normalizeText(a));

    if (answersToCheck.length === 0) {
      alert("⚠️ Please enter at least one answer.");
      return;
    }

    const savedThreshold = Number(localStorage.getItem('fuzzy_threshold') || '0.4');
    const isMatch = isFuzzyMatchArray(answersToCheck, expectedAnswers, savedThreshold);
    setIsCorrect(isMatch);
    setHasSubmitted(true);

    // Clear input and speech buffer after submit
    clearInputAndSpeech();

    if (isMatch) {
      setScore((prev) => prev + 1);
      setRemainingQuestions((prev) => {
        const idx = prev.indexOf(currentIndex);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });
    } else {
      // Show both original and normalized answers in feedback
      setWrongAnswers((prev) => [
        ...prev,
        {
          question: questions[currentIndex].question,
          correct: questions[currentIndex].answer,
          user: (overrideAnswers || userAnswers).join(', '),
          note: questions[currentIndex].note || '',
          normalizedCorrect: correctAnswer
            .split('@')
            .map((a) => normalizeText(a))
            .join(' | '),
          normalizedUser: (overrideAnswers || userAnswers)
            .map(a => normalizeText(a))
            .join(' | '),
        },
      ]);
      const practiceCount = Number(localStorage.getItem('practice_count') || '2');
      setRemainingQuestions((prev) => {
        const toAdd = Array(practiceCount).fill(currentIndex);
        const shuffleEnabled = localStorage.getItem('shuffle_enabled') === 'true';
        const next = [...prev, ...toAdd];
        return shuffleEnabled ? shuffleArray(next) : next;
      });
    }
  };

  // Add this function to play audio from OpenAI TTS
  async function playOpenAITTS(text: string, voice = 'alloy') {
    console.log('🔊 playOpenAITTS called with text:', text, 'voice:', voice);
    try {
      const res = await fetch('/api/tts-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      console.log('🔊 API response status:', res.status, res.statusText);
      if (!res.ok) {
        console.error('🔊 Failed to fetch audio, status:', res.status);
        alert('Failed to fetch audio');
        return;
      }
      const data = await res.json();
      console.log('🔊 API response data:', data);
      if (data.audioContent) {
        console.log('🔊 Audio content received, length:', data.audioContent.length);
        const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        audio.play().then(() => {
          console.log('🔊 Audio playing successfully');
        }).catch((err) => {
          console.error('🔊 Audio play error:', err);
        });
      } else {
        console.warn('🔊 No audioContent in response');
      }
    } catch (error) {
      console.error('🔊 playOpenAITTS error:', error);
    }
  }

  // Alias for backward compatibility
  const playGoogleTTS = playOpenAITTS;

  const [timerSeconds, setTimerSeconds] = useState(20); // default timer value
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionQuestionNumber, setSessionQuestionNumber] = useState<number>(1); // Sequential question number for session
  const [canAdvance, setCanAdvance] = useState(false); // NEW: controls Enter for next

  // Load timer setting from localStorage
  useEffect(() => {
    const storedTimer = localStorage.getItem('quiz_timer_seconds');
    setTimerSeconds(storedTimer ? Number(storedTimer) : 20);
  }, []);

  // Start timer when question changes
  useEffect(() => {
    if (questions.length > 0 && !finished && !hasSubmitted) {
      setTimeLeft(timerSeconds);
      setTimerActive(true);
    }
  }, [currentIndex, questions.length, finished, hasSubmitted, timerSeconds]);

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || timeLeft === null) return;
    if (hasSubmitted) return; // Prevent timer from firing after submit
    if (timeLeft <= 0) {
      setTimerActive(false);
      
      // Stop any ongoing recording
      if (isListening) {
        stopHoldToSpeak();
      }
      
      // If user has typed/spoken something, submit it
      if (userAnswers.length > 0 || inputValue.trim()) {
        const finalAnswers = userAnswers.length > 0 ? userAnswers : [inputValue.trim().toLowerCase()];
        handleSubmit(finalAnswers);
      } else {
        // No answer at all
        setHasSubmitted(true);
        setIsCorrect(false);
        setWrongAnswers((prev) => [
          ...prev,
          {
            question: questions[currentIndex].question,
            correct: questions[currentIndex].answer,
            user: '[No answer]',
            note: questions[currentIndex].note || '',
          },
        ]);
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timerActive, timeLeft, hasSubmitted]);

  // When a new question is loaded or user starts answering, disable advancing
  useEffect(() => {
    setCanAdvance(false);
  }, [currentIndex, hasSubmitted]);

  // Clear input value when question changes to prevent old values from showing
  useEffect(() => {
  if (currentIndex >= 0) {
    clearInputAndSpeech(); // Use the new clear function
  }
}, [currentIndex]);

  // When feedback is shown, enable advancing
  useEffect(() => {
    if (hasSubmitted) {
      setCanAdvance(true);
    }
  }, [hasSubmitted]);

  // Keyboard shortcut: Press Enter to go to next question after feedback, only if input is not focused and canAdvance is true
  useEffect(() => {
    if (!canAdvance) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        e.key === 'Enter' &&
        active &&
        active.tagName !== 'INPUT' &&
        active.tagName !== 'TEXTAREA'
      ) {
        setCanAdvance(false); // Prevent double advance
        setTimerActive(false);
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAdvance]);

  // Update mastery count when quiz finishes - MUST BE BEFORE ANY EARLY RETURNS
  useEffect(() => {
    if (!finished) return;

    const updateMastery = async () => {
      const subj = String(subject);
      const les = String(lesson);
      const top = String(topic);

      try {
        const response = await fetch('/api/update-mastery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subj,
            lesson: les,
            topic: decodeURIComponent(top),
            increment: 1,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Failed to update mastery:', result);
        } else {
          console.log('✅ Mastery updated successfully:', result);
        }
      } catch (error) {
        console.error('Failed to update mastery in database:', error);
      }
    };

    updateMastery();
  }, [finished, subject, lesson, topic]);

  if (!Array.isArray(questions) || questions.length === 0 || currentIndex < 0)  {
    return <p className="p-4">Loading quiz...</p>;
  }

  // Calculate total expected answers for current question
  const correctAnswer = questions[currentIndex]?.answer || '';
  const expectedAnswers = correctAnswer
    .split('@')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  const totalExpected = expectedAnswers.length;

  if (finished) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-2 sm:p-4 max-w-md mx-auto text-center overflow-hidden pt-4">
        <div className="w-full max-w-md flex flex-col items-center">
          <Link 
            href="/" 
            className="text-purple-400 underline text-sm mb-4 inline-block hover:text-purple-200 transition-colors"
            onClick={handleNavigateHome}
          >
            ← Back to Home
          </Link>
          <h2 className="text-2xl font-bold mb-4 text-purple-300 drop-shadow">Quiz Finished 🎉</h2>
          <p className="mb-4">You got <span className="font-bold text-green-400">{score}</span> out of <span className="font-bold text-purple-200">{questions.length}</span> correct.</p>

          {wrongAnswers.length > 0 && (
            <div className="mt-6 text-left max-h-[40vh] overflow-y-auto w-full pr-2">
              <h3 className="text-lg font-semibold mb-2 text-red-300">❌ Questions You Got Wrong:</h3>
              {wrongAnswers.map((item, idx) => (
                <div key={idx} className="mb-4 p-3 bg-red-900/70 border border-red-700 text-red-100 rounded shadow">
                  <div className="mb-2 flex items-start gap-2">
                    <p className="flex-1"><strong>Q:</strong> {item.question}</p>
                    <button
                      onClick={() => playGoogleTTS(item.question)}
                      className="text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1 flex-shrink-0"
                      title="Listen to question"
                    >
                      🔊
                    </button>
                  </div>
                  <p className="mb-2"><strong>Your Answer:</strong> <span className="text-yellow-200">{item.user}</span></p>
                  <div className="mb-2 p-3 bg-green-900/50 border border-green-600 rounded-lg">
                    <p className="text-lg font-bold text-green-300 mb-1">✅ Correct Answer:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-semibold text-green-200 tracking-wide flex-1">{item.correct}</p>
                      <button
                        onClick={() => playGoogleTTS(item.correct.replace(/@/g, ' and '))}
                        className="text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1 flex-shrink-0"
                        title="Listen to answer"
                      >
                        🔊
                      </button>
                    </div>
                    {item.normalizedCorrect && (
                      <p className="text-xs text-green-300 mt-2">Normalized: <span className="font-mono">{item.normalizedCorrect}</span></p>
                    )}
                  </div>
                  {item.normalizedUser && (
                    <div className="mb-2 p-2 bg-gray-800 border border-yellow-700 rounded-lg">
                      <p className="text-xs text-yellow-200">Your Normalized Answer: <span className="font-mono">{item.normalizedUser}</span></p>
                    </div>
                  )}
                  {item.note && (
                    <div className="bg-gray-800 border border-yellow-700 rounded p-2">
                      <div className="flex items-center gap-2">
                        <strong>Note:</strong>
                        <button
                          onClick={() => playGoogleTTS(item.note!)}
                          className="text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
                          title="Listen to note"
                        >
                          🔊
                        </button>
                      </div>
                      <div className="text-blue-200 whitespace-pre-line mt-1">{item.note}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-2 sm:p-4 max-w-md mx-auto overflow-hidden pt-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
          <Link 
            href="/" 
            className="text-purple-400 underline text-sm hover:text-purple-200 transition-colors"
            onClick={handleNavigateHome}
          >
            ← Back to Home
          </Link>
        </div>

        {/* Breadcrumb */}
        <div className="mb-4 text-center">
          <span className="text-sm text-gray-400">
            {subjectLabel || String(subject).charAt(0).toUpperCase() + String(subject).slice(1)} → {decodeURIComponent(String(lesson))} → {decodeURIComponent(String(topic))}
          </span>
        </div>

        {/* Questions Remaining */}
        <div className="mb-4 text-center">
          <span className="text-2xl font-extrabold text-pink-400 drop-shadow-sm">Questions Remaining: {remainingQuestions.length}</span>
        </div>

        <div className="bg-gray-950/80 border border-gray-800 rounded-xl shadow-lg p-4 mb-4 w-full flex flex-col">
          <h2 className="text-lg font-bold mb-2 text-purple-200 drop-shadow">Question {sessionQuestionNumber}</h2>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-400">Question {sessionQuestionNumber} of {questions.length}</p>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg transition-all duration-300 transform ${
              timeLeft !== null && timeLeft <= 5 
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse scale-110 border-2 border-red-400' 
                : 'bg-green-600 text-white shadow-lg shadow-green-500/30'
            }`}>
              <span className="text-xl">⏰</span>
              <span className="font-mono text-xl tracking-wider">
                {timeLeft !== null ? timeLeft : timerSeconds}s
              </span>
              {timeLeft !== null && timeLeft <= 5 && (
                <span className="text-yellow-300 animate-bounce text-sm">HURRY!</span>
              )}
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <p className="flex-1 text-gray-100 text-base">{questions[currentIndex].question}</p>
            <button
              onClick={() => playGoogleTTS(questions[currentIndex].question)}
              className="text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
              title="Listen to question"
            >
              🔊
            </button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-purple-300 font-semibold">
              Expected: {questions[currentIndex].answer.split('@').length}
            </p>
            {questions[currentIndex].answer.split('@').length > 1 && (
              <span className="bg-orange-700 text-orange-200 px-2 py-1 rounded-full text-xs font-bold border border-orange-500">
                MULTI-ANSWER
              </span>
            )}
          </div>

          {/* Move Next button here for mobile ease */}
          {hasSubmitted && (
            <button
              onClick={() => {
                setTimerActive(false); // Stop timer on next
                handleNext();
              }}
              className="mb-4 w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all"
            >
              {remainingQuestions.length === 0 ? 'Finish Quiz' : 'Next'}
            </button>
          )}

          {!hasSubmitted && (
            <div className="min-h-[120px]"> {/* Fixed height container to prevent bouncing */}
              <div className="flex flex-wrap gap-2 mb-2">
                {userAnswers.map((ans, idx) => {
                  const isCorrect = isAnswerCorrect(ans);
                  return (
                    <span 
                      key={idx} 
                      className={`px-3 py-1 rounded-full flex items-center gap-1 text-white ${
                        isCorrect 
                          ? 'bg-green-700 border border-green-500' 
                          : 'bg-red-700 border border-red-500'
                      }`}
                    >
                      {isCorrect ? '✅' : '❌'} {ans}
                      <button
                        type="button"
                        className="ml-1 text-xs text-white hover:text-gray-200"
                        onClick={() => handleRemoveAnswer(idx)}
                        aria-label="Remove answer"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      transcriptRef.current = e.target.value;
                    }}
                    onKeyDown={(e) => {
                      if (totalExpected === 1 && e.key === 'Enter' && inputValue.trim()) {
                        e.preventDefault();
                        setUserAnswers([inputValue.trim().toLowerCase()]);
                        handleSubmit([inputValue.trim().toLowerCase()]);
                      } else {
                        handleInputKeyDown(e);
                      }
                    }}
                    placeholder={`Type or hold mic to speak...`}
                    className={`flex-1 p-3 border rounded-lg bg-gray-900 text-gray-100 focus:ring-2 focus:ring-purple-500 shadow resize-none min-h-[80px] text-base leading-relaxed ${
                      isListening ? 'border-red-500 border-2' : 'border-gray-700'
                    }`}
                    rows={3}
                  />
                  {/* Hold-to-Speak Mic Button */}
                  {speechSupported && (
                    <button
                      onMouseDown={startHoldToSpeak}
                      onMouseUp={stopHoldToSpeak}
                      onMouseLeave={() => { if (isListening) stopHoldToSpeak(); }}
                      onTouchStart={(e) => { e.preventDefault(); startHoldToSpeak(); }}
                      onTouchEnd={(e) => { e.preventDefault(); stopHoldToSpeak(); }}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={isTranscribing}
                      className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 select-none ${
                        isTranscribing
                          ? 'bg-yellow-600 text-white cursor-wait'
                          : isListening
                            ? 'bg-red-600 text-white shadow-lg scale-110 animate-pulse'
                            : 'bg-purple-700 text-white hover:bg-purple-600 active:bg-red-600'
                      }`}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                      title={isTranscribing ? 'Transcribing...' : isListening ? 'Release to stop' : 'Hold to speak'}
                    >
                      {isTranscribing ? (
                        <span className="animate-spin text-xl">⏳</span>
                      ) : isListening ? (
                        <span className="text-2xl">🔴</span>
                      ) : (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {/* Recording indicator */}
                {isListening && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span>🎤 Recording... Release to transcribe</span>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex items-center gap-2 text-xs text-yellow-400">
                    <span className="animate-spin">⏳</span>
                    <span>Transcribing with Whisper...</span>
                  </div>
                )}
                {/* Show Add button only if multiple answers and not last answer */}
                {totalExpected > 1 && userAnswers.length < totalExpected - 1 && (
                  <button
                    type="button"
                    onClick={handleAddAnswer}
                    className="self-start bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-bold shadow"
                  >
                    Add
                  </button>
                )}
              </div>
              
              {/* Show Submit button if single answer or last answer for multi-answer */}
              {((totalExpected === 1) || (totalExpected > 1 && userAnswers.length === totalExpected - 1)) && (
                <>
                  <button
                    onClick={() => {
                      setTimerActive(false); // Stop timer on submit
                      if (totalExpected === 1) {
                        // For single answer, submit directly with inputValue
                        if (inputValue.trim()) {
                          setUserAnswers([inputValue.trim().toLowerCase()]);
                          handleSubmit([inputValue.trim().toLowerCase()]);
                        } else {
                          setUserAnswers([]);
                          handleSubmit([]);
                        }
                      } else {
                        handleAddAnswer();
                        setTimeout(() => handleSubmit(), 0);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all mb-4"
                  >
                    Submit
                  </button>
                  {/* Move image_before here, below the Submit button */}
                  {questions[currentIndex].image_before && (
                    <div className="mt-4 w-full">
                      <img
                        src={questions[currentIndex].image_before}
                        alt="Question Visual"
                        className="w-full h-48 object-contain rounded-lg cursor-pointer bg-gray-900 border border-gray-700"
                        onClick={() => window.open(questions[currentIndex].image_before, '_blank')}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {hasSubmitted && (
            <>
              <div className={`mt-4 p-3 rounded text-sm ${isCorrect ? 'bg-green-900/70 border border-green-700 text-green-200' : 'bg-red-900/70 border border-red-700 text-red-200'} shadow`}>
                {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
                <div className="mt-2 p-3 bg-green-900/50 border border-green-600 rounded-lg">
                  <p className="text-xl font-semibold text-green-200 tracking-wide">{questions[currentIndex].answer}</p>
                  <button
                    onClick={() => playGoogleTTS(questions[currentIndex].answer)}
                    className="mt-2 text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
                    title="Listen to answer"
                  >
                    🔊
                  </button>
                </div>
                <div className="mt-1">
                  <strong>Your Answer:</strong> <span className="text-yellow-200">{userAnswers.join(', ')}</span>
                </div>
                {questions[currentIndex].note && (
                  <div className="mt-2 bg-gray-800 border border-yellow-700 rounded p-2 text-yellow-200">
                    <div className="flex items-start gap-2">
                      <strong>Note:</strong>
                      <button
                        onClick={() => playGoogleTTS(questions[currentIndex].note!)}
                        className="text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
                        title="Listen to note"
                      >
                        🔊
                      </button>
                    </div>
                    <div className="mt-1 whitespace-pre-line">
                      {questions[currentIndex].note}
                    </div>
                  </div>
                )}
              </div>

              {questions[currentIndex].image_after && hasSubmitted && (
                <div className="mt-4 w-full">
                  <img
                    src={questions[currentIndex].image_after}
                    alt="Answer Visual"
                    className="w-full h-48 object-contain rounded-lg cursor-pointer bg-gray-900 border border-gray-700"
                    onClick={() => window.open(questions[currentIndex].image_after, '_blank')}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

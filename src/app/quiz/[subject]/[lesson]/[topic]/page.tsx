'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { isFuzzyMatchArray } from '@/utils/fuzzyMatch';
import Link from 'next/link';
import { useRef } from 'react';


interface Question {
  question: string;
  answer: string;
  note?: string;
  image_before?: string;
  image_after?: string;
}


export default function QuizPage() {
  const { subject, lesson, topic } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // Initialize to -1 to prevent premature TTS
  const [userAnswers, setUserAnswers] = useState<string[]>([]); // New: array of answers
  const [inputValue, setInputValue] = useState(''); // New: input for current answer
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<
  { question: string; correct: string; user: string; note?: string }[]
>([]);
  
  // Track indices of questions not yet answered correctly
  const [remainingQuestions, setRemainingQuestions] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // On questions load, initialize remainingQuestions with all indices, shuffled (no repetition at start)
  useEffect(() => {
    if (questions.length > 0) {
      const indices = Array.from({ length: questions.length }, (_, i) => i);
      const shuffled = shuffleArray(indices);
      setRemainingQuestions(shuffled);
      setCurrentIndex(shuffled[0]); // Set to first in shuffled, not 0
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

const spokenIndexRef = useRef<number | null>(null);

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

  // Function to check if an individual answer is correct
  const isAnswerCorrect = (answer: string) => {
    const correctAnswer = questions[currentIndex]?.answer || '';
    const expectedAnswers = correctAnswer
      .split('@')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    const savedThreshold = Number(localStorage.getItem('fuzzy_threshold') || '0.4');
    return expectedAnswers.some(expected => 
      isFuzzyMatchArray([answer], [expected], savedThreshold)
    );
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          setInputValue('');
          setTimeout(() => {
            handleSubmit(newAnswers);
          }, 0);
        } else {
          // If answer is correct, use normal add logic
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
    setTimerActive(false); // Stop timer on next
    setUserAnswers([]);
    setInputValue('');
    setHasSubmitted(false);
    setIsCorrect(null);
    setSessionQuestionNumber((prev) => prev + 1); // Increment session question number
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // If no more questions, finish
    if (remainingQuestions.length === 0) {
      setFinished(true);
      return;
    }

    // Just pick the next question in the current order (no shuffle here)
    setCurrentIndex(remainingQuestions[0]);
  };

  // Modified handleSubmit for adaptive flow
  const handleSubmit = (overrideAnswers?: string[]) => {
    setTimerActive(false); // Stop timer on submit
    const correctAnswer = questions[currentIndex]?.answer;
    const expectedAnswers = correctAnswer
      .split('@')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    const totalExpected = expectedAnswers.length;
    const answersToCheck = overrideAnswers || userAnswers;
    if (answersToCheck.length === 0) {
      alert("⚠️ Please enter at least one answer.");
      return;
    }
    const savedThreshold = Number(localStorage.getItem('fuzzy_threshold') || '0.4');
    const isMatch = isFuzzyMatchArray(answersToCheck, expectedAnswers, savedThreshold);
    setIsCorrect(isMatch);
    setHasSubmitted(true);
    if (isMatch) {
      setScore((prev) => prev + 1);
      // Remove only one instance of this question from remainingQuestions
      setRemainingQuestions((prev) => {
        const idx = prev.indexOf(currentIndex);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });
    } else {
      setWrongAnswers((prev) => [
        ...prev,
        {
          question: questions[currentIndex].question,
          correct: questions[currentIndex].answer,
          user: answersToCheck.join(', '),
          note: questions[currentIndex].note || '',
        },
      ]);
      // Add this question index back to remainingQuestions practice_count times
      const practiceCount = Number(localStorage.getItem('practice_count') || '2');
      setRemainingQuestions((prev) => {
        const toAdd = Array(practiceCount).fill(currentIndex);
        const next = [...prev, ...toAdd];
        return shuffleArray(next);
      });
    }
  };

  // Add this function to play audio from Google TTS
  async function playGoogleTTS(text: string, lang = 'en-GB') {
    const res = await fetch('/api/tts-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) {
      alert('Failed to fetch audio');
      return;
    }
    const data = await res.json();
    if (data.audioContent) {
      const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
      audio.play();
    }
  }

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
      setHasSubmitted(true);
      setIsCorrect(false);
      setWrongAnswers((prev) => [
        ...prev,
        {
          question: questions[currentIndex].question,
          correct: questions[currentIndex].answer,
          user: userAnswers.join(', ') || '[No answer]',
          note: questions[currentIndex].note || '',
        },
      ]);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timerActive, timeLeft, hasSubmitted]);

  // When a new question is loaded or user starts answering, disable advancing
  useEffect(() => {
    setCanAdvance(false);
  }, [currentIndex, hasSubmitted]);

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
          <Link href="/" className="text-purple-400 underline text-sm mb-4 inline-block hover:text-purple-200 transition-colors">
            ← Back to Home
          </Link>
          <h2 className="text-2xl font-bold mb-4 text-purple-300 drop-shadow">Quiz Finished 🎉</h2>
          <p className="mb-4">You got <span className="font-bold text-green-400">{score}</span> out of <span className="font-bold text-purple-200">{questions.length}</span> correct.</p>

          {wrongAnswers.length > 0 && (
            <div className="mt-6 text-left max-h-[40vh] overflow-y-auto w-full pr-2">
              <h3 className="text-lg font-semibold mb-2 text-red-300">❌ Questions You Got Wrong:</h3>
              {wrongAnswers.map((item, idx) => (
                <div key={idx} className="mb-4 p-3 bg-red-900/70 border border-red-700 text-red-100 rounded shadow">
                  <p><strong>Q:</strong> {item.question}</p>
                  <p><strong>Your Answer:</strong> <span className="text-yellow-200">{item.user}</span></p>
                  <p><strong>Correct Answer:</strong> <span className="text-green-300">{item.correct}</span></p>
                  {item.note && (
                    <div>
                      <div><strong>Note:</strong></div>
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
        <Link href="/" className="text-purple-400 underline text-sm mb-4 inline-block hover:text-purple-200 transition-colors">
          ← Back to Home
        </Link>

        {/* Breadcrumb */}
        <div className="mb-4 text-center">
          <span className="text-sm text-gray-400">
            {String(subject).charAt(0).toUpperCase() + String(subject).slice(1)} → {String(lesson).charAt(0).toUpperCase() + String(lesson).slice(1)} → {String(topic).charAt(0).toUpperCase() + String(topic).slice(1)}
          </span>
        </div>

        {/* Questions Remaining */}
        <div className="mb-4 text-center">
          <span className="text-2xl font-extrabold text-pink-400 drop-shadow-sm">Questions Remaining: {remainingQuestions.length}</span>
        </div>

        {/* BIG TIMER - intense, prominent, animated */}
        <div className="flex justify-center mb-4">
          <div
            className={`relative flex items-center justify-center w-24 h-24 rounded-full shadow-lg border-4 transition-colors duration-300
          ${timeLeft !== null && timeLeft <= 5 ? 'border-red-600 bg-red-900 animate-pulse' : 'border-purple-700 bg-gray-900'}
            `}
          >
            <span
          className={`text-3xl font-extrabold font-mono select-none drop-shadow-lg
            ${timeLeft !== null && timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-200'}
          `}
          style={{ letterSpacing: '0.05em' }}
            >
          {timeLeft !== null ? timeLeft : timerSeconds}
            </span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 tracking-wider">SECONDS</span>
          </div>
        </div>

        <div className="bg-gray-950/80 border border-gray-800 rounded-xl shadow-lg p-4 mb-4 w-full flex flex-col">
          <h2 className="text-lg font-bold mb-2 text-purple-200 drop-shadow">Question {sessionQuestionNumber}</h2>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-400">Question {sessionQuestionNumber} of {questions.length}</p>
            <span className={`text-sm font-mono px-2 py-1 rounded ${timeLeft !== null && timeLeft <= 5 ? 'bg-red-700 text-white' : 'bg-gray-800 text-purple-200'}`}>⏰ {timeLeft !== null ? timeLeft : timerSeconds}s</span>
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

          {!hasSubmitted && (
            <>
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
              <div className="flex gap-2 mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (totalExpected === 1 && e.key === 'Enter' && inputValue.trim()) {
                      e.preventDefault();
                      setUserAnswers([inputValue.trim().toLowerCase()]);
                      handleSubmit([inputValue.trim().toLowerCase()]);
                    } else {
                      handleInputKeyDown(e);
                    }
                  }}
                  placeholder={`Type answer${totalExpected > 1 ? ' and press Enter/Add' : ''}`}
                  className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-100 focus:ring-2 focus:ring-purple-500 shadow"
                />
                {/* Show Add button only if multiple answers and not last answer */}
                {totalExpected > 1 && userAnswers.length < totalExpected - 1 && (
                  <button
                    type="button"
                    onClick={handleAddAnswer}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-bold shadow"
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
            </>
          )}

          {hasSubmitted && (
            <>
              <div className={`mt-4 p-3 rounded text-sm ${isCorrect ? 'bg-green-900/70 border border-green-700 text-green-200' : 'bg-red-900/70 border border-red-700 text-red-200'} shadow`}>
                {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}
                <div className="mt-2 bg-gray-900 border border-gray-700 rounded p-2 flex items-center gap-2 text-purple-100">
                  <strong>Correct Answer:</strong> <span className="text-green-300">{questions[currentIndex].answer}</span>
                  <button
                    onClick={() => playGoogleTTS(questions[currentIndex].answer)}
                    className="ml-2 text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
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

              <button
                onClick={() => {
                  setTimerActive(false); // Stop timer on next
                  handleNext();
                }}
                className="mt-4 w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all"
              >
                {remainingQuestions.length === 0 ? 'Finish Quiz' : 'Next'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

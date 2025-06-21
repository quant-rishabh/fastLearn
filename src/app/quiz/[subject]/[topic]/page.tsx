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
  const { subject, topic } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<
  { question: string; correct: string; user: string; note?: string }[]
>([]);
  


  const inputRef = useRef<HTMLInputElement>(null);





  function shuffleArray<T>(array: T[]): T[] {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  
  useEffect(() => {
    const loadQuiz = async () => {
      const cacheKey = `quiz_${subject}_${decodeURIComponent(topic as string)}`;
      const fetchFromDb = localStorage.getItem('fetch_from_db') === 'true';
  
      if (!fetchFromDb) {
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== 'undefined') {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setQuestions(parsed);
              return;
            } else {
              console.warn('⚠️ Cached quiz is not an array, ignoring.');
            }
          } catch (e) {
            console.error('❌ Failed to parse cached quiz:', e);
          }
        }
      }
  
      // fallback to DB/API
      const res = await fetch(`/api/get-quiz?subject=${subject}&topic=${decodeURIComponent(topic as string)}`);
      const { questions } = await res.json();
  
      const shuffleEnabled = localStorage.getItem('shuffle_enabled') === 'true';
      const finalQuestions = shuffleEnabled ? questions.sort(() => Math.random() - 0.5) : questions;
  
      setQuestions(finalQuestions);
      localStorage.setItem(cacheKey, JSON.stringify(finalQuestions || []));
    };
  
    loadQuiz();
  }, [subject, topic]);  

const spokenIndexRef = useRef<number | null>(null);

useEffect(() => {
  const speakSetting = localStorage.getItem('auto_speak');

  if (
    speakSetting === 'true' &&
    questions?.length > 0 &&
    questions[currentIndex]?.question &&
    spokenIndexRef.current !== currentIndex
  ) {
    playGoogleTTS(questions[currentIndex].question);
    spokenIndexRef.current = currentIndex;
  }
}, [currentIndex, questions]);


  const handleSubmit = () => {
    const correctAnswer = questions[currentIndex]?.answer;
  
    const userInputs = userAnswer
    .split('@')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  
  const expectedAnswers = correctAnswer
    .split('@')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  
    if (userInputs.length === 0) {
      alert("⚠️ Please enter your answer.");
      return;
    }
    const savedThreshold = Number(localStorage.getItem('fuzzy_threshold') || '0.4');
    const isMatch = isFuzzyMatchArray(userInputs, expectedAnswers, savedThreshold);

setIsCorrect(isMatch);
setHasSubmitted(true);

if (isMatch) {
  setScore((prev) => prev + 1);
} else {
    setWrongAnswers((prev) => [
        ...prev,
        {
          question: questions[currentIndex].question,
          correct: questions[currentIndex].answer,
          user: userAnswer.trim(),
          note: questions[currentIndex].note || '',
        },
      ]);
      
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

  
  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer('');
      setHasSubmitted(false);
      setIsCorrect(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setFinished(true);
    }
  };

  if (!Array.isArray(questions) || questions.length === 0)  {
    return <p className="p-4">Loading quiz...</p>;
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-4 max-w-md mx-auto text-center">
        <Link href="/" className="text-purple-400 underline text-sm mb-4 inline-block hover:text-purple-200 transition-colors">
          ← Back to Home
        </Link>
        <h2 className="text-2xl font-bold mb-4 text-purple-300 drop-shadow">Quiz Finished 🎉</h2>
        <p className="mb-4">You got <span className="font-bold text-green-400">{score}</span> out of <span className="font-bold text-purple-200">{questions.length}</span> correct.</p>

        {wrongAnswers.length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="text-lg font-semibold mb-2 text-red-300">❌ Questions You Got Wrong:</h3>
            {wrongAnswers.map((item, idx) => (
              <div key={idx} className="mb-4 p-3 bg-red-900/70 border border-red-700 text-red-100 rounded shadow">
                <p><strong>Q:</strong> {item.question}</p>
                <p><strong>Your Answer:</strong> <span className="text-yellow-200">{item.user}</span></p>
                <p><strong>Correct Answer:</strong> <span className="text-green-300">{item.correct}</span></p>
                {item.note && (
                  <p><strong>Note:</strong> <span className="text-blue-200">{item.note}</span></p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-4 max-w-md mx-auto">
      <Link href="/" className="text-purple-400 underline text-sm mb-4 inline-block hover:text-purple-200 transition-colors">
        ← Back to Home
      </Link>

      {questions[currentIndex].image_before && !hasSubmitted && (
        <div className="mb-4">
          <img
            src={questions[currentIndex].image_before}
            alt="Question Visual"
            className="w-full h-auto max-h-[40vh] object-contain border border-gray-700 rounded shadow cursor-pointer bg-gray-950"
            onClick={() => window.open(questions[currentIndex].image_before, '_blank')}
          />
          <p className="text-xs text-center text-gray-400 mt-1">Click to open full image</p>
        </div>
      )}

      <div className="bg-gray-950/80 border border-gray-800 rounded-xl shadow-lg p-4 mb-4">
        <h2 className="text-lg font-bold mb-2 text-purple-200 drop-shadow">Question {currentIndex + 1}</h2>
        <p className="text-xs text-gray-400 mb-2">Question {currentIndex + 1} of {questions.length}</p>
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
        <p className="text-xs text-gray-500 mb-4">
          (Total answer expected comma separated: {questions[currentIndex].answer.split('@').length})
        </p>

        {!hasSubmitted && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type all answers, separated by @"
              className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-100 mb-4 focus:ring-2 focus:ring-purple-500 shadow"
            />
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all"
            >
              Submit
            </button>
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
                <strong>Your Answer:</strong> <span className="text-yellow-200">{userAnswer.trim()}</span>
              </div>
              {questions[currentIndex].note && (
                <div className="mt-2 bg-gray-800 border border-yellow-700 rounded p-2 flex items-center gap-2 text-yellow-200">
                  <strong>Note:</strong> {questions[currentIndex].note}
                  <button
                    onClick={() => playGoogleTTS(questions[currentIndex].note!)}
                    className="ml-2 text-purple-400 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
                    title="Listen to note"
                  >
                    🔊
                  </button>
                </div>
              )}
            </div>

            {questions[currentIndex].image_after && hasSubmitted && (
              <div className="mt-4">
                <img
                  src={questions[currentIndex].image_after}
                  alt="Answer Visual"
                  className="w-full h-auto max-h-[40vh] object-contain border border-gray-700 rounded shadow cursor-pointer bg-gray-950"
                  onClick={() => window.open(questions[currentIndex].image_after, '_blank')}
                />
                <p className="text-xs text-center text-gray-400 mt-1">Click to open full image</p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="mt-4 w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-3 rounded-lg font-bold shadow hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all"
            >
              {currentIndex + 1 === questions.length ? 'Finish Quiz' : 'Next'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

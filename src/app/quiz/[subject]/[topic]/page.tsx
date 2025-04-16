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
  const [fuzzyThreshold, setFuzzyThreshold] = useState(80); // default 80%

  const inputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    const loadQuiz = async () => {
        const res = await fetch(`/api/get-quiz?subject=${subject}&topic=${decodeURIComponent(topic as string)}`);
        const { questions } = await res.json();
        setQuestions(questions || []);
    };
    loadQuiz();
  }, [subject, topic]);

  const handleSubmit = () => {
    const correctAnswer = questions[currentIndex]?.answer;
  
    const expectedAnswers = correctAnswer
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
  
    const userInputs = userAnswer
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
  
    if (userInputs.length === 0) {
      alert("⚠️ Please enter your answer.");
      return;
    }
  
    const isMatch = isFuzzyMatchArray(userInputs, expectedAnswers, 0.4); // fixed threshold
  
    setIsCorrect(isMatch);
    setHasSubmitted(true);
    if (isMatch) {
      setScore((prev) => prev + 1);
    }
  };
  
  
  
  
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

  if (!questions.length) {
    return <p className="p-4">Loading quiz...</p>;
  }

  if (finished) {
    return (
      <main className="p-4 max-w-md mx-auto text-center">
        <Link href="/" className="text-blue-600 underline text-sm mb-4 inline-block">
  ← Back to Home
</Link>
        <h2 className="text-2xl font-bold mb-4">Quiz Finished 🎉</h2>
        <p>You got {score} out of {questions.length} correct.</p>
      </main>
    );
  }

  return (
    <main className="p-4 max-w-md mx-auto">
        <Link href="/" className="text-blue-600 underline text-sm mb-4 inline-block">
  ← Back to Home
</Link>


{questions[currentIndex].image_before && !hasSubmitted && (
  <img
    src={questions[currentIndex].image_before}
    alt="Question Visual"
    className="mb-4 rounded w-full max-h-48 object-contain border"
  />
)}

<h2 className="text-lg font-semibold mb-2">Question {currentIndex + 1}</h2>
<p className="text-sm text-gray-600 mb-4">
  Question {currentIndex + 1} of {questions.length}
</p>
<p className="mb-2">{questions[currentIndex].question}</p>

{/* Show expected count of answers */}
{(
  <p className="text-sm text-gray-600 mb-4">
    (Total answer expected comma seperated: {questions[currentIndex].answer.split(',').length})
  </p>
)}


      {!hasSubmitted && (
        <>
         <input
  ref={inputRef}
  type="text"
  value={userAnswer}
  onChange={(e) => setUserAnswer(e.target.value)}
  placeholder="Type all answers, separated by commas"
  className="w-full p-2 border rounded mb-4"
/>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Submit
          </button>
        </>
      )}

{hasSubmitted && (
  <>
    <div
      className={`mt-4 p-3 rounded text-sm `}
    >
      {isCorrect ? '✅ Correct!' : '❌ Incorrect.'}

      <div className="mt-2">
        <strong>Correct Answer:</strong> {questions[currentIndex].answer}
      </div>

      <div className="mt-1">
        <strong>Your Answer:</strong> {userAnswer.trim()}
      </div>

      {questions[currentIndex].note && (
        <div className="mt-2">
          <strong>Note:</strong> {questions[currentIndex].note}
        </div>
      )}
    </div>

    {questions[currentIndex].image_after && (
  <img
    src={questions[currentIndex].image_after}
    alt="Explanation Visual"
    className="mt-4 rounded w-full max-h-48 object-contain border"
  />
)}

    <button
      onClick={handleNext}
      className="mt-4 w-full bg-gray-800 text-white py-2 rounded"
    >
      {currentIndex + 1 === questions.length ? 'Finish Quiz' : 'Next'}
    </button>
  </>
)}


    </main>
  );
}

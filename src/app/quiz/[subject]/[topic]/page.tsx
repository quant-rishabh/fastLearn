'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { isFuzzyMatch } from '@/utils/fuzzyMatch';
import Link from 'next/link';

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
    const threshold = fuzzyThreshold;
  
    const answers = userAnswer
      .split(',')
      .map((a) => a.trim().toLowerCase());
  
    const expectedAnswers = correctAnswer
      .split(',')
      .map((a) => a.trim().toLowerCase());
  
    let allMatched = true;
  
    for (const answer of answers) {
      let matched = false;
  
      for (const expected of expectedAnswers) {
        if (isFuzzyMatch(answer, expected, threshold)) {
          matched = true;
          break;
        }
      }
  
      if (!matched) {
        allMatched = false;
        break;
      }
    }
  
    const sameLength = answers.length === expectedAnswers.length;
    const isMatch = allMatched && sameLength;
  
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

<div className="mb-4">
  <label className="block text-sm font-medium mb-1">
    Fuzzy Match Threshold: {fuzzyThreshold}%
  </label>
  <input
    type="range"
    min={50}
    max={100}
    step={1}
    value={fuzzyThreshold}
    onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
    className="w-full"
  />
</div>


{questions[currentIndex].image_before && !hasSubmitted && (
  <img
    src={questions[currentIndex].image_before}
    alt="Question Visual"
    className="mb-4 rounded w-full max-h-48 object-contain border"
  />
)}

      <h2 className="text-lg font-semibold mb-4">Question {currentIndex + 1}</h2>
      <p className="mb-4">{questions[currentIndex].question}</p>

      {!hasSubmitted && (
        <>
          <input
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

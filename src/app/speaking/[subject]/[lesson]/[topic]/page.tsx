'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeakingSession {
  subject: string;
  lesson: string;
  topic: string;
  speechText: string;
  aiFeedback: any;
  createdAt: string;
}

export default function SpeakingPage() {
  const { subject, lesson, topic } = useParams();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setSpeechText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = () => {
    if (recognitionRef.current) {
      setHasStarted(true);
      setIsRecording(true);
      setIsPaused(false);
      setSpeechText('');
      setRecordingTime(0);
      recognitionRef.current.start();
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current && isRecording) {
      setIsPaused(true);
      recognitionRef.current.stop();
    }
  };

  const resumeRecording = () => {
    if (recognitionRef.current && isPaused) {
      setIsPaused(false);
      recognitionRef.current.start();
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      setIsRecording(false);
      setIsPaused(false);
      recognitionRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Automatically analyze with AI and navigate to feedback page
      if (speechText.trim()) {
        await analyzeWithAI();
        // Navigate to speaking history page after a brief delay
        setTimeout(() => {
          router.push('/speaking/history');
        }, 1000);
      }
    }
  };

  const analyzeWithAI = async () => {
    if (!speechText.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai-analyze-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject,
          lesson: lesson,
          topic: topic,
          speechText: speechText,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAiFeedback(data.analysis);
        // Save to database
        await saveToDatabase(data.analysis);
        return true;
      } else {
        console.error('AI analysis failed:', data.error);
        alert('Failed to analyze speech. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error analyzing speech:', error);
      alert('Error analyzing speech. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToDatabase = async (analysis: any) => {
    try {
      const response = await fetch('/api/save-speaking-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject,
          lesson: lesson,
          topic: topic,
          speechText: speechText,
          aiFeedback: analysis,
          duration: recordingTime,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save speaking session');
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-4 text-gray-100">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all">
              ← Back to Home
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-purple-400">🎤 Speaking Practice</h1>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-300 mb-2">
            <span className="font-semibold text-purple-300">Subject:</span> {decodeURIComponent(subject as string)}
          </p>
          <p className="text-gray-300 mb-2">
            <span className="font-semibold text-purple-300">Lesson:</span> {decodeURIComponent(lesson as string)}
          </p>
          <p className="text-gray-300">
            <span className="font-semibold text-purple-300">Topic:</span> {decodeURIComponent(topic as string)}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-600/30 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-blue-300 mb-2">📝 Instructions</h2>
          <p className="text-blue-100">
            Speak about the topic for 1-2 minutes. Share your thoughts, experiences, or opinions. 
            The AI will analyze your speech and provide vocabulary suggestions and speaking tips.
          </p>
        </div>

        {/* Recording Controls */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="text-center mb-4">
            <div className="text-3xl font-mono text-orange-400 mb-2">
              {formatTime(recordingTime)}
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              {isRecording && !isPaused && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              <span className="text-gray-300">
                {isRecording && !isPaused ? 'Recording...' : 
                 isPaused ? 'Paused' : 
                 hasStarted ? 'Stopped' : 'Ready to record'}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            {!isRecording && !isPaused ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                🎤 Start Recording
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    onClick={pauseRecording}
                    className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-all"
                  >
                    ⏸️ Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                  >
                    ▶️ Resume
                  </button>
                )}
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Speech Text Display */}
        {speechText && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-purple-300 mb-3">📝 Your Speech (Live Transcript)</h3>
            <div className="bg-gray-900 p-4 rounded border max-h-40 overflow-y-auto">
              <p className="text-gray-100 leading-relaxed">{speechText}</p>
            </div>
            
            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-purple-300">
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                  <span>🤖 Analyzing your speech and preparing feedback...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Feedback */}
        {aiFeedback && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-300 mb-4">✨ Analysis Complete!</h3>
            <div className="bg-green-900/20 border border-green-600/30 p-4 rounded">
              <p className="text-green-100 mb-4">
                Your speech has been analyzed and saved! Redirecting to detailed feedback...
              </p>
              <div className="flex items-center justify-center gap-2 text-green-300">
                <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin"></div>
                <span>Navigating to feedback page...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
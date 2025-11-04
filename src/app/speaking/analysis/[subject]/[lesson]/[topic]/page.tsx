'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

interface SpeakingSession {
  id: number;
  subject: string;
  lesson: string;
  topic: string;
  speech_text: string;
  ai_feedback: {
    formatted_feedback: string;
    metadata?: any;
  };
  overall_score: number;
  duration_seconds: number;
  word_count: number;
  topic_content?: string;
  created_at: string;
}

export default function SpeakingAnalysisPage() {
  const { subject, lesson, topic } = useParams();
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchSession();
  }, [subject, lesson, topic]);

  const fetchSession = async () => {
    try {
      const decodedSubject = decodeURIComponent(subject as string);
      const decodedLesson = decodeURIComponent(lesson as string);
      const decodedTopic = decodeURIComponent(topic as string);

      console.log('Fetching session for:', { decodedSubject, decodedLesson, decodedTopic });

      const { data, error } = await supabase
        .from('speaking_sessions')
        .select('*')
        .eq('subject', decodedSubject)
        .eq('lesson', decodedLesson)
        .eq('topic', decodedTopic)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load session data');
      } else if (data && data.length > 0) {
        setSession(data[0]);
      } else {
        setError('No session found for this topic');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while loading the session');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Simple markdown renderer for topic content
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-orange-300 mb-4">{trimmedLine.substring(2)}</h1>;
      } else if (trimmedLine.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-orange-200 mb-3 mt-4">{trimmedLine.substring(3)}</h2>;
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        return <p key={index} className="text-orange-100 mb-2 ml-4">{trimmedLine}</p>;
      } else if (trimmedLine.length > 0) {
        return <p key={index} className="text-orange-100 mb-2">{trimmedLine}</p>;
      } else {
        return <br key={index} />;
      }
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-4 text-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-300">Loading session analysis...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-4 text-gray-100">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <Link href="/">
              <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all">
                ← Back to Home
              </button>
            </Link>
          </header>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Session Not Found</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-4 text-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all">
                ← Back to Home
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-purple-400">📊 Speaking Analysis</h1>
            <Link href="/speaking/history">
              <button className="px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-all">
                📚 All Sessions
              </button>
            </Link>
          </div>
        </header>

        {/* Topic Card */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-600/30 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-300 mb-2">{decodeURIComponent(session.topic)}</h2>
          <p className="text-gray-300">{session.subject} • {decodeURIComponent(session.lesson)}</p>
          <p className="text-sm text-gray-400 mt-2">
            Session from {new Date(session.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center p-4 bg-gray-900 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(session.overall_score)} mb-1`}>
              {session.overall_score}
            </div>
            <div className="text-sm text-gray-400">Score out of 100</div>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-lg">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {formatDuration(session.duration_seconds)}
            </div>
            <div className="text-sm text-gray-400">Speaking Duration</div>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-lg">
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {session.word_count}
            </div>
            <div className="text-sm text-gray-400">Words Spoken</div>
          </div>
        </div>

        {/* Topic Content (Guiding Questions) */}
        {session.topic_content && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-orange-300 mb-3">🎯 Topic Guidance:</h3>
            <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg">
              <div className="text-orange-100">
                {renderMarkdown(session.topic_content)}
              </div>
            </div>
          </div>
        )}

        {/* Your Speech */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">🎤 What You Said:</h3>
          <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
            <p className="text-blue-100 leading-relaxed italic">"{session.speech_text}"</p>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-green-300 mb-3">🤖 AI Feedback & Analysis:</h3>
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6">
            <div className="text-gray-100 leading-relaxed space-y-4">
              {session.ai_feedback.formatted_feedback.split('\n').map((line: string, index: number) => {
                // Handle headers (###)
                if (line.startsWith('### ')) {
                  return (
                    <h4 key={index} className="text-xl font-bold text-yellow-300 mt-6 mb-3">
                      {line.replace('### ', '')}
                    </h4>
                  );
                }
                
                // Handle subheaders (##)
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={index} className="text-2xl font-bold text-purple-300 mt-8 mb-4">
                      {line.replace('## ', '')}
                    </h3>
                  );
                }
                
                // Handle bold text (**text**)
                if (line.includes('**')) {
                  const parts = line.split('**');
                  return (
                    <p key={index} className="mb-2">
                      {parts.map((part, partIndex) => 
                        partIndex % 2 === 1 ? (
                          <strong key={partIndex} className="font-bold text-blue-300">{part}</strong>
                        ) : (
                          <span key={partIndex}>{part}</span>
                        )
                      )}
                    </p>
                  );
                }
                
                // Handle bullet points (-)
                if (line.trim().startsWith('- ')) {
                  return (
                    <div key={index} className="ml-4 mb-2 flex">
                      <span className="text-green-400 mr-2">•</span>
                      <span>{line.replace(/^- /, '')}</span>
                    </div>
                  );
                }
                
                // Handle empty lines
                if (line.trim() === '') {
                  return <div key={index} className="h-4"></div>;
                }
                
                // Regular text
                return <p key={index} className="mb-2">{line}</p>;
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Link href={`/speaking/${encodeURIComponent(session.subject)}/${encodeURIComponent(session.lesson)}/${encodeURIComponent(session.topic)}`}>
            <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-bold shadow hover:scale-105 hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
              🔄 Practice This Topic Again
            </button>
          </Link>
          <Link href="/speaking/history">
            <button className="flex-1 bg-gradient-to-r from-gray-600 to-gray-500 text-white py-3 px-6 rounded-lg font-bold shadow hover:scale-105 hover:from-gray-700 hover:to-gray-600 transition-all flex items-center justify-center gap-2">
              📚 View All Sessions
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
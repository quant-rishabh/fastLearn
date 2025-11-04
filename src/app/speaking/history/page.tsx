'use client';

import { useEffect, useState } from 'react';
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

export default function SpeakingHistoryPage() {
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SpeakingSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('speaking_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-300 mt-4">Loading your speaking history...</p>
          </div>
        </div>
      </main>
    );
  }

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
          <h1 className="text-2xl font-bold text-purple-400">📚 Speaking History</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎤</div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No Speaking Sessions Yet</h2>
            <p className="text-gray-400 mb-6">Start practicing to see your progress here!</p>
            <Link href="/">
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all">
                Start Speaking Practice
              </button>
            </Link>
          </div>
        ) : selectedSession ? (
          // Show ONLY the detailed view when a session is selected
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 p-8 rounded-lg">
              {/* Header with back button */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-purple-400 mb-2">📝 Session Details</h1>
                  <p className="text-gray-400">{formatDate(selectedSession.created_at)}</p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                >
                  ← Back to Sessions
                </button>
              </div>

              {/* Topic Card */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-600/30 rounded-lg">
                <h2 className="text-xl font-semibold text-purple-300 mb-2">{decodeURIComponent(selectedSession.topic)}</h2>
                <p className="text-gray-300">{selectedSession.subject} • {decodeURIComponent(selectedSession.lesson)}</p>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-900 rounded-lg">
                  <div className={`text-3xl font-bold ${getScoreColor(selectedSession.overall_score)} mb-1`}>
                    {selectedSession.overall_score}
                  </div>
                  <div className="text-sm text-gray-400">Score out of 100</div>
                </div>
                <div className="text-center p-4 bg-gray-900 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400 mb-1">
                    {formatDuration(selectedSession.duration_seconds)}
                  </div>
                  <div className="text-sm text-gray-400">Speaking Duration</div>
                </div>
                <div className="text-center p-4 bg-gray-900 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {selectedSession.word_count}
                  </div>
                  <div className="text-sm text-gray-400">Words Spoken</div>
                </div>
              </div>

              {/* Topic Content (Guiding Questions) */}
              {selectedSession.topic_content && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-orange-300 mb-3">🎯 Topic Guidance:</h3>
                  <div className="bg-orange-900/20 border border-orange-600/30 p-4 rounded-lg">
                    <div className="text-orange-100">
                      {renderMarkdown(selectedSession.topic_content)}
                    </div>
                  </div>
                </div>
              )}

              {/* Your Speech */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🎤 What You Said:</h3>
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <p className="text-blue-100 leading-relaxed italic">"{selectedSession.speech_text}"</p>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-green-300 mb-3">🤖 AI Feedback & Analysis:</h3>
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-6">
                  <div className="text-gray-100 leading-relaxed space-y-4">
                    {selectedSession.ai_feedback.formatted_feedback.split('\n').map((line: string, index: number) => {
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
                        return <div key={index} className="h-2"></div>;
                      }
                      
                      // Handle regular paragraphs
                      return (
                        <p key={index} className="mb-2 leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Link href={`/speaking/${selectedSession.subject}/${encodeURIComponent(selectedSession.lesson)}/${encodeURIComponent(selectedSession.topic)}`}>
                  <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2">
                    🔄 Practice This Topic Again
                  </button>
                </Link>
                <Link href="/">
                  <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2">
                    🏠 Back to Home
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // Show sessions list when no session is selected
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">Your Sessions ({sessions.length})</h2>
            
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-gray-800 p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-700 border-2 border-transparent hover:border-purple-500"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-purple-300">{decodeURIComponent(session.topic)}</h3>
                    <p className="text-sm text-gray-400">{session.subject} • {decodeURIComponent(session.lesson)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(session.overall_score)}`}>
                      {session.overall_score}/100
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDuration(session.duration_seconds)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{session.word_count} words</span>
                  <span>{formatDate(session.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
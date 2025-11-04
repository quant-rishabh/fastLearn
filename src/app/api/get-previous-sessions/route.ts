import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const lesson = searchParams.get('lesson');

    console.log('🔍 Previous Sessions API called with:', {
      subject,
      lesson,
      decodedSubject: subject ? decodeURIComponent(subject) : null,
      decodedLesson: lesson ? decodeURIComponent(lesson) : null
    });

    if (!subject || !lesson) {
      return NextResponse.json(
        { error: 'Subject and lesson are required' },
        { status: 400 }
      );
    }

    // Fetch unique topics from speaking sessions for this subject/lesson
    // Try exact match with decoded values first
    const decodedSubject = decodeURIComponent(subject);
    const decodedLesson = decodeURIComponent(lesson);
    
    const { data, error } = await supabase
      .from('speaking_sessions')
      .select('topic, created_at, duration_seconds, word_count, overall_score, subject, lesson')
      .eq('subject', decodedSubject)
      .eq('lesson', decodedLesson)
      .order('created_at', { ascending: false });

    console.log('🗃️ Database query result (decoded):', {
      error,
      dataCount: data?.length || 0,
      firstFewRecords: data?.slice(0, 3)
    });

    // If no match with decoded values, try with encoded values (for existing data)
    let finalData = data;
    if (!data || data.length === 0) {
      console.log('🔍 No match with decoded values, trying encoded values...');
      
      const { data: encodedData, error: encodedError } = await supabase
        .from('speaking_sessions')
        .select('topic, created_at, duration_seconds, word_count, overall_score, subject, lesson')
        .eq('subject', subject) // Keep original encoded
        .eq('lesson', lesson)   // Keep original encoded
        .order('created_at', { ascending: false });
        
      console.log('�️ Database query result (encoded):', {
        error: encodedError,
        dataCount: encodedData?.length || 0,
        firstFewRecords: encodedData?.slice(0, 3)
      });
      
      finalData = encodedData;
    }

    // Also get all unique subject/lesson combinations for debugging
    const { data: allSessions, error: debugError } = await supabase
      .from('speaking_sessions')
      .select('subject, lesson')
      .limit(10);

    console.log('🔍 All subject/lesson combinations in database:', allSessions);

    if (error) {
      console.error('Error fetching previous sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch previous sessions' },
        { status: 500 }
      );
    }

    // Group by topic and get the latest session for each topic
    const topicMap = new Map();
    finalData?.forEach(session => {
      if (!topicMap.has(session.topic)) {
        topicMap.set(session.topic, {
          id: `prev-${session.topic.replace(/\s+/g, '-').toLowerCase()}`,
          name: session.topic,
          lesson_id: 'previous-session',
          isPreviousSession: true,
          lastPracticed: session.created_at,
          sessionCount: 1,
          avgDuration: session.duration_seconds,
          avgWordCount: session.word_count,
          avgScore: session.overall_score || 0
        });
      } else {
        // Update session count and averages
        const existing = topicMap.get(session.topic);
        existing.sessionCount += 1;
        existing.avgDuration = Math.round((existing.avgDuration + session.duration_seconds) / 2);
        existing.avgWordCount = Math.round((existing.avgWordCount + session.word_count) / 2);
        existing.avgScore = Math.round((existing.avgScore + (session.overall_score || 0)) / 2);
      }
    });

    const previousTopics = Array.from(topicMap.values());

    return NextResponse.json({
      success: true,
      topics: previousTopics,
      count: previousTopics.length
    });

  } catch (error) {
    console.error('Error in get-previous-sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const lesson = searchParams.get('lesson');
    const topic = searchParams.get('topic');

    console.log('Get topic content request:', { subject, lesson, topic });

    if (!subject || !lesson || !topic) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Decode the parameters
    const decodedSubject = decodeURIComponent(subject);
    const decodedLesson = decodeURIComponent(lesson);
    const decodedTopic = decodeURIComponent(topic);

    console.log('Decoded parameters:', { 
      decodedSubject, 
      decodedLesson, 
      decodedTopic 
    });

    // Query for the most recent session with this exact topic to get the original content
    const { data: sessions, error } = await supabase
      .from('speaking_sessions')
      .select('topic_content')
      .eq('subject', decodedSubject)
      .eq('lesson', decodedLesson)
      .eq('topic', decodedTopic)
      .not('topic_content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database error'
      }, { status: 500 });
    }

    console.log('Found sessions:', sessions);

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found with topic content');
      return NextResponse.json({
        success: false,
        error: 'No topic content found'
      }, { status: 404 });
    }

    const topicContent = sessions[0].topic_content;
    console.log('Returning topic content:', topicContent);

    return NextResponse.json({
      success: true,
      topicContent
    });

  } catch (error) {
    console.error('Error in get-topic-content:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
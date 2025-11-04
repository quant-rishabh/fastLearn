import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { subject, lesson, topic, speechText, aiFeedback, duration, topicContent } = await request.json();

    if (!subject || !lesson || !topic || !speechText || !aiFeedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save speaking session to database
    const { data, error } = await supabase
      .from('speaking_sessions')
      .insert([
        {
          subject: subject,
          lesson: lesson,
          topic: topic,
          speech_text: speechText,
          ai_feedback: aiFeedback,
          duration_seconds: duration || 0,
          word_count: speechText.split(' ').length,
          overall_score: aiFeedback.overall_score || 0,
          topic_content: topicContent || null, // Store the guiding questions
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save speaking session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: data[0]?.id,
      message: 'Speaking session saved successfully'
    });

  } catch (error) {
    console.error('Error saving speaking session:', error);
    return NextResponse.json(
      { error: 'Failed to save speaking session' },
      { status: 500 }
    );
  }
}
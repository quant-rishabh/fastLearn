import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const lesson = searchParams.get('lesson');
    const topic = searchParams.get('topic');

    if (!subject || !lesson || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, lesson, topic' },
        { status: 400 }
      );
    }

    // First, get subject ID from slug
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('slug', subject)
      .single();

    if (subjectError || !subjectData) {
      console.error('Subject not found:', subject, subjectError);
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Get lesson ID from name + subject
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('name', lesson)
      .eq('subject_id', subjectData.id)
      .single();

    if (lessonError || !lessonData) {
      console.error('Lesson not found:', lesson, lessonError);
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Get the topic with mastery count
    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('id, name, mastery_count, last_mastered, updated_at')
      .eq('name', topic)
      .eq('lesson_id', lessonData.id)
      .single();

    if (topicError) {
      console.error('Error fetching topic mastery:', topicError);
      return NextResponse.json(
        { error: 'Failed to fetch topic mastery' },
        { status: 500 }
      );
    }

    if (!topicData) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      topic: topicData
    });

  } catch (error) {
    console.error('Error fetching topic mastery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

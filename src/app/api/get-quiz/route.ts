import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectSlug = searchParams.get('subject');
  const lessonSlug = searchParams.get('lesson');
  const topicName = searchParams.get('topic');

  if (!subjectSlug || !lessonSlug || !topicName) {
    return NextResponse.json({ error: 'Missing subject, lesson, or topic' }, { status: 400 });
  }

  // Get subject ID from slug
  const { data: subjectData, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', subjectSlug)
    .single();

  if (subjectError || !subjectData) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  // Get lesson ID from name + subject
  const { data: lessonData, error: lessonError } = await supabase
    .from('lessons')
    .select('id')
    .eq('name', lessonSlug)
    .eq('subject_id', subjectData.id)
    .single();

  if (lessonError || !lessonData) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Get topic ID from name + lesson
  const { data: topicData, error: topicError } = await supabase
    .from('topics')
    .select('id')
    .eq('name', topicName)
    .eq('lesson_id', lessonData.id)
    .single();

  if (topicError || !topicData) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Get questions
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('topic_id', topicData.id);

  if (questionsError) {
    return NextResponse.json({ error: 'Error fetching questions' }, { status: 500 });
  }

  return NextResponse.json({ questions });
  ;
}

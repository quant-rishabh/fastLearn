import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectSlug = searchParams.get('subject');
  const topicName = searchParams.get('topic');

  if (!subjectSlug || !topicName) {
    return NextResponse.json({ error: 'Missing subject or topic' }, { status: 400 });
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

  // Get topic ID from name + subject
  const { data: topicData, error: topicError } = await supabase
    .from('topics')
    .select('id')
    .eq('name', topicName)
    .eq('subject_id', subjectData.id)
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

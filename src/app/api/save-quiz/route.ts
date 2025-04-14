import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    subject,      // slug
    topic,        // name
    question,
    answer,
    note,
    imageBefore,
    imageAfter,
  } = body;

  if (!subject || !topic || !question || !answer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Step 1: Get subject_id from slug
  const { data: subjectData, error: subjectError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', subject)
    .single();

  if (subjectError || !subjectData) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  // Step 2: Get topic_id using subject_id + topic name
  const { data: topicData, error: topicError } = await supabase
    .from('topics')
    .select('id')
    .eq('name', topic)
    .eq('subject_id', subjectData.id)
    .single();

  if (topicError || !topicData) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Step 3: Insert question
  const { error: insertError } = await supabase.from('questions').insert({
    topic_id: topicData.id,
    question,
    answer,
    note: note || null,
    image_before: imageBefore || null,
    image_after: imageAfter || null,
  });

  if (insertError) {
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

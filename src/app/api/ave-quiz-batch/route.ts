import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const { subject, lesson, topic, questions } = await req.json();

  if (!subject || !lesson || !topic || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
  }

  // Upsert subject
  let { data: subjectData } = await supabase
    .from('subjects').select('id').eq('slug', subject).single();
  if (!subjectData) {
    const { data, error } = await supabase
      .from('subjects').insert({ slug: subject, label: subject.charAt(0).toUpperCase() + subject.slice(1) })
      .select('id').single();
    if (error) return NextResponse.json({ error: 'Failed to create subject: ' + error.message }, { status: 500, headers: corsHeaders });
    subjectData = data;
  }

  // Upsert lesson
  let { data: lessonData } = await supabase
    .from('lessons').select('id').eq('name', lesson).eq('subject_id', subjectData.id).single();
  if (!lessonData) {
    const { data, error } = await supabase
      .from('lessons').insert({ name: lesson, subject_id: subjectData.id })
      .select('id').single();
    if (error) return NextResponse.json({ error: 'Failed to create lesson: ' + error.message }, { status: 500, headers: corsHeaders });
    lessonData = data;
  }

  // Upsert topic
  let { data: topicData } = await supabase
    .from('topics').select('id').eq('name', topic).eq('lesson_id', lessonData.id).single();
  if (!topicData) {
    const { data, error } = await supabase
      .from('topics').insert({ name: topic, lesson_id: lessonData.id })
      .select('id').single();
    if (error) return NextResponse.json({ error: 'Failed to create topic: ' + error.message }, { status: 500, headers: corsHeaders });
    topicData = data;
  }

  // Insert all questions
  let added = 0;
  const errors: string[] = [];
  for (const q of questions) {
    if (!q.question || !q.answer) continue;
    const { error } = await supabase.from('questions').insert({
      topic_id: topicData.id,
      question: q.question,
      answer: q.answer,
      note: q.note || null,
    });
    if (error) errors.push(error.message);
    else added++;
  }

  return NextResponse.json(
    { success: true, added, total: questions.length, errors: errors.length ? errors : undefined },
    { headers: corsHeaders }
  );
}

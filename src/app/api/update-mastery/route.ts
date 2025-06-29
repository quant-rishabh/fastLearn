import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const { subject, topic, increment } = await request.json();
    
    console.log('📊 Update mastery request:', { subject, topic, increment });

    if (!subject || !topic || !increment) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, topic, increment' },
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

    // Get the topic with current mastery count
    const { data: currentData, error: fetchError } = await supabase
      .from('topics')
      .select('id, mastery_count')
      .eq('name', topic)
      .eq('subject_id', subjectData.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current mastery count:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current mastery count' },
        { status: 500 }
      );
    }

    if (!currentData) {
      console.warn(`Topic not found: ${subject}/${topic}`);
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Update the mastery count
    const newMasteryCount = (currentData.mastery_count || 0) + increment;
    
    const { data, error } = await supabase
      .from('topics')
      .update({ 
        mastery_count: newMasteryCount,
        last_mastered: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentData.id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update mastery count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      updated: data[0],
      message: `Mastery count incremented by ${increment}` 
    });

  } catch (error) {
    console.error('Error updating mastery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

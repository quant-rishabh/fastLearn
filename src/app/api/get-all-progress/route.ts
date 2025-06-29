import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Fetch all topics with their mastery counts and subject information
    const { data, error } = await supabase
      .from('topics')
      .select(`
        name,
        mastery_count,
        last_mastered,
        subjects (
          label,
          slug
        )
      `)
      .order('mastery_count', { ascending: false });

    if (error) {
      console.error('Error fetching progress data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress data' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedData = data.map((topic: any) => ({
      topic_name: topic.name,
      mastery_count: topic.mastery_count || 0,
      last_mastered: topic.last_mastered,
      subject_label: topic.subjects?.label || 'Unknown Subject',
      subject_slug: topic.subjects?.slug || 'unknown'
    }));

    return NextResponse.json({ 
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching progress data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

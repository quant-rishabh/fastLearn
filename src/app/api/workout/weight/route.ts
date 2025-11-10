import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Save weight entry (single-user optimized)
export async function POST(request: NextRequest) {
  try {
    const { 
      weight,
      date = new Date().toISOString().split('T')[0]
    } = await request.json();

    if (!weight) {
      return NextResponse.json({ error: 'Weight is required' }, { status: 400 });
    }

    // Log weight in weight_logs table
    const { data: weightEntry, error: logError } = await supabase
      .from('weight_logs')
      .upsert({
        date: date,
        weight: weight
      }, {
        onConflict: 'date'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error saving weight log:', logError);
      return NextResponse.json({ error: 'Failed to save weight' }, { status: 500 });
    }

    // Update current_weight in user_profile if it's today's weight
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const { error: profileError } = await supabase
        .from('user_profile')
        .update({ current_weight: weight })
        .eq('id', (await supabase.from('user_profile').select('id').single()).data?.id);

      if (profileError) {
        console.error('Error updating profile weight:', profileError);
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ weightEntry, success: true });

  } catch (error) {
    console.error('Error in save weight API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get weight history (single-user optimized)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '30'; // Last 30 days by default

    // Calculate date range
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: weightHistory, error } = await supabase
      .from('weight_logs')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching weight history:', error);
      return NextResponse.json({ error: 'Failed to fetch weight history' }, { status: 500 });
    }

    return NextResponse.json({
      weightHistory: weightHistory || [],
      success: true
    });

  } catch (error) {
    console.error('Error in get weight history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
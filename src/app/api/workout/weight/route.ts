import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Save weight entry
export async function POST(request: NextRequest) {
  try {
    const { 
      userId,
      weight,
      date = new Date().toISOString().split('T')[0],
      notes
    } = await request.json();

    const { data: weightEntry, error } = await supabase
      .from('weight_history')
      .upsert({
        user_id: userId,
        weight: weight,
        date: date,
        notes: notes
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving weight:', error);
      return NextResponse.json({ error: 'Failed to save weight' }, { status: 500 });
    }

    return NextResponse.json({ weightEntry, success: true });

  } catch (error) {
    console.error('Error in save weight API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get weight history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = searchParams.get('days') || '30'; // Last 30 days by default

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: weightHistory, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
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
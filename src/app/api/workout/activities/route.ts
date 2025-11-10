import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Save activity (food or exercise) - NEW SCHEMA
export async function POST(request: NextRequest) {
  try {
    const { 
      type,           // 'food' or 'exercise'
      description,    // AI-analyzed description with calories
      category,       // AI-determined category
      calories,       // AI-calculated calories (always positive)
      protein_grams,  // For food items only
      date = new Date().toISOString().split('T')[0]
    } = await request.json();

    // Validate required fields
    if (!type || !description || !category || !calories) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, description, category, calories' 
      }, { status: 400 });
    }

    // Insert the activity using new optimized schema
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        date,
        type,
        description,
        category, 
        calories: Math.abs(calories), // Ensure positive
        protein_grams: type === 'food' ? protein_grams : null
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error saving activity:', activityError);
      return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 });
    }

    // Get updated daily totals using optimized function (single query!)
    const { data: todayData, error: fetchError } = await supabase
      .rpc('get_today_complete_data');

    if (fetchError) {
      console.error('Error fetching updated data:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated data' }, { status: 500 });
    }

    return NextResponse.json({ 
      activity, 
      todayData: todayData,
      success: true 
    });

  } catch (error) {
    console.error('Error in save-activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get activities for a specific date - NEW OPTIMIZED SCHEMA
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (date === 'today') {
      // Use super-optimized single query for today's data
      const { data: todayData, error } = await supabase
        .rpc('get_today_complete_data');
      
      if (error) {
        console.error('Error fetching today data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
      }

      return NextResponse.json({
        todayData: todayData,
        success: true
      });
    } else {
      // Get specific date data
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
      }

      // Get daily totals for that specific date
      const { data: dailyTotals, error: totalsError } = await supabase
        .from('daily_totals')
        .select('*')
        .eq('date', date)
        .single();

      return NextResponse.json({
        activities: activities || [],
        dailyTotals: dailyTotals || null,
        success: true
      });
    }

  } catch (error) {
    console.error('Error in get activities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete activity - OPTIMIZED
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID required' }, { status: 400 });
    }

    // Delete the activity
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }

    // Return updated today's data in one query
    const { data: todayData, error: fetchError } = await supabase
      .rpc('get_today_complete_data');

    if (fetchError) {
      console.error('Error fetching updated data:', fetchError);
      // Don't fail the delete, just return success
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ 
      success: true, 
      todayData: todayData 
    });

  } catch (error) {
    console.error('Error in delete activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
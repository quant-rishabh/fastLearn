import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Save activity (food or exercise)
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      type, 
      name, 
      details, 
      calories, 
      category, 
      parameters,
      aiCalculated = false,
      date = new Date().toISOString().split('T')[0],
      bmr,
      maintenance,
      targetCalories
    } = await request.json();

    // Get or create daily tracking record
    const { data: trackingData, error: trackingError } = await supabase
      .rpc('get_or_create_daily_tracking', {
        p_user_id: userId,
        p_date: date,
        p_bmr: bmr,
        p_maintenance: maintenance,
        p_target: targetCalories
      });

    if (trackingError) {
      console.error('Error creating daily tracking:', trackingError);
      return NextResponse.json({ error: 'Failed to create daily tracking' }, { status: 500 });
    }

    const dailyTrackingId = trackingData;

    // Insert the activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        daily_tracking_id: dailyTrackingId,
        type: type,
        name: name,
        details: details,
        calories: calories,
        category: category,
        parameters: parameters,
        ai_calculated: aiCalculated
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error saving activity:', activityError);
      return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 });
    }

    // Get updated daily tracking with totals
    const { data: updatedTracking, error: fetchError } = await supabase
      .from('daily_tracking')
      .select('*')
      .eq('id', dailyTrackingId)
      .single();

    return NextResponse.json({ 
      activity, 
      dailyTracking: updatedTracking,
      success: true 
    });

  } catch (error) {
    console.error('Error in save-activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get activities for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get daily tracking and activities
    const { data: dailyTracking, error: trackingError } = await supabase
      .from('daily_tracking')
      .select(`
        *,
        activities (
          id,
          type,
          name,
          details,
          calories,
          category,
          parameters,
          ai_calculated,
          timestamp
        )
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (trackingError && trackingError.code !== 'PGRST116') {
      console.error('Error fetching daily tracking:', trackingError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // If no tracking record exists, return empty state
    if (!dailyTracking) {
      return NextResponse.json({
        dailyTracking: null,
        activities: [],
        success: true
      });
    }

    return NextResponse.json({
      dailyTracking,
      activities: dailyTracking.activities || [],
      success: true
    });

  } catch (error) {
    console.error('Error in get activities API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Get analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = searchParams.get('days') || '7'; // Last 7 days by default

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get daily tracking data
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (dailyError) {
      console.error('Error fetching daily data:', dailyError);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Get activities breakdown
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('type, category, calories, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate);

    if (activitiesError) {
      console.error('Error fetching activities data:', activitiesError);
    }

    // Calculate analytics
    const totalDeficit = dailyData.reduce((sum, day) => sum + (day.deficit_created || 0), 0);
    const avgDeficit = dailyData.length > 0 ? totalDeficit / dailyData.length : 0;
    const expectedWeightLoss = totalDeficit / 7700; // kg

    const totalCaloriesIn = dailyData.reduce((sum, day) => sum + (day.total_calories_in || 0), 0);
    const totalCaloriesOut = dailyData.reduce((sum, day) => sum + (day.total_calories_out || 0), 0);

    // Activities breakdown
    const activitiesByType = activitiesData?.reduce((acc, activity) => {
      if (!acc[activity.type]) acc[activity.type] = 0;
      acc[activity.type] += activity.calories;
      return acc;
    }, {} as Record<string, number>) || {};

    const exerciseByCategory = activitiesData?.filter(a => a.type === 'exercise').reduce((acc, activity) => {
      const cat = activity.category || 'other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += activity.calories;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      analytics: {
        totalDays: dailyData.length,
        totalDeficit,
        avgDeficit,
        expectedWeightLoss,
        totalCaloriesIn,
        totalCaloriesOut,
        activitiesByType,
        exerciseByCategory
      },
      dailyData: dailyData || [],
      success: true
    });

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
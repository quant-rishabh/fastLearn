import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Get analytics data (single-user optimized with new schema)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7'; // Last 7 days by default

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get daily totals for the date range (using optimized view)
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_totals')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (dailyError) {
      console.error('Error fetching daily data:', dailyError);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Get activities breakdown for the period
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('type, category, calories, date, created_at')
      .gte('date', startDate);

    if (activitiesError) {
      console.error('Error fetching activities data:', activitiesError);
    }

    // Get weight history for the period
    const { data: weightData, error: weightError } = await supabase
      .from('weight_logs')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (weightError && weightError.code !== 'PGRST116') {
      console.error('Error fetching weight data:', weightError);
    }

    // Calculate analytics from daily totals
    const totalDeficit = dailyData?.reduce((sum, day) => {
      const deficit = (day.calorie_target || 0) - (day.net_calories || 0);
      return sum + Math.max(0, deficit); // Only count positive deficits
    }, 0) || 0;

    const avgDeficit = dailyData && dailyData.length > 0 ? totalDeficit / dailyData.length : 0;
    const expectedWeightLoss = totalDeficit / 7700; // kg (7700 cal per kg)

    const totalCaloriesIn = dailyData?.reduce((sum, day) => sum + (day.calories_consumed || 0), 0) || 0;
    const totalCaloriesOut = dailyData?.reduce((sum, day) => sum + (day.calories_burned_exercise || 0), 0) || 0;

    // Activities breakdown by type
    const activitiesByType = activitiesData?.reduce((acc, activity) => {
      if (!acc[activity.type]) acc[activity.type] = 0;
      acc[activity.type] += activity.calories;
      return acc;
    }, {} as Record<string, number>) || {};

    // Exercise breakdown by category
    const exerciseByCategory = activitiesData?.filter(a => a.type === 'exercise').reduce((acc, activity) => {
      const cat = activity.category || 'other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += activity.calories;
      return acc;
    }, {} as Record<string, number>) || {};

    // Weight progress
    const weightProgress = weightData && weightData.length > 0 ? {
      startWeight: weightData[0].weight,
      currentWeight: weightData[weightData.length - 1].weight,
      weightLoss: weightData[0].weight - weightData[weightData.length - 1].weight
    } : null;

    return NextResponse.json({
      analytics: {
        totalDays: dailyData?.length || 0,
        totalDeficit,
        avgDeficit,
        expectedWeightLoss,
        totalCaloriesIn,
        totalCaloriesOut,
        activitiesByType,
        exerciseByCategory,
        weightProgress
      },
      dailyData: dailyData || [],
      weightHistory: weightData || [],
      success: true
    });

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
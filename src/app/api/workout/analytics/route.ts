import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Get detailed analytics data for tabular display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get activities data for the date range
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('date, type, calories, created_at')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    // Get daily totals if available
    const { data: dailyTotals, error: totalsError } = await supabase
      .from('daily_totals')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    // Get weight entries
    const { data: weightEntries, error: weightError } = await supabase
      .from('weight_entries')
      .select('date, weight')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    // Get user stats
    const { data: userStats, error: userStatsError } = await supabase
      .from('user_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Process the data day by day
    const analyticsData: any[] = [];
    const activitiesByDate: { [date: string]: any[] } = {};
    const weightByDate: { [date: string]: number } = {};
    const totalsByDate: { [date: string]: any } = {};

    // Group activities by date
    activities?.forEach((activity: any) => {
      if (!activitiesByDate[activity.date]) {
        activitiesByDate[activity.date] = [];
      }
      activitiesByDate[activity.date].push(activity);
    });

    // Group weight entries by date
    weightEntries?.forEach((entry: any) => {
      weightByDate[entry.date] = entry.weight;
    });

    // Group daily totals by date
    dailyTotals?.forEach((total: any) => {
      totalsByDate[total.date] = total;
    });

    // Default user stats for calculations
    const stats = {
      current_weight: userStats?.current_weight || 86,
      target_weight: userStats?.target_weight || 68,
      height: userStats?.height || 174,
      age: userStats?.age || 25,
      weekly_weight_loss: userStats?.weekly_weight_loss || 0.5,
      bmr: userStats?.bmr || 2000,
      maintenance_calories: userStats?.maintenance_calories || 2400,
      target_daily_calories: userStats?.target_daily_calories || 1900
    };

    // Calculate BMR function
    const calculateBMR = (weight: number) => {
      return 10 * weight + 6.25 * stats.height - 5 * stats.age + 5;
    };

    let lastKnownWeight = stats.current_weight;

    // Generate daily data
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayActivities = activitiesByDate[dateStr] || [];
      
      // Calculate calories for the day
      let caloriesConsumed = 0;
      let caloriesBurned = 0;
      
      // Use daily totals if available, otherwise calculate from activities
      if (totalsByDate[dateStr]) {
        caloriesConsumed = totalsByDate[dateStr].calories_consumed || 0;
        caloriesBurned = totalsByDate[dateStr].calories_burned_exercise || 0;
      } else {
        // Fallback: calculate from activities
        dayActivities.forEach((activity: any) => {
          if (activity.type === 'food') {
            caloriesConsumed += Math.abs(activity.calories);
          } else if (activity.type === 'exercise') {
            caloriesBurned += Math.abs(activity.calories);
          }
        });
      }

      // Get weight for this day (or use last known weight)
      const currentWeight = weightByDate[dateStr] || lastKnownWeight;
      if (weightByDate[dateStr]) {
        lastKnownWeight = weightByDate[dateStr];
      }
      
      // Calculate metabolic values based on actual weight
      const bmr = calculateBMR(currentWeight);
      const maintenanceCalories = bmr * 1.2;
      
      // Calculate deficits
      const caloriesPerKg = 7700;
      const weeklyCalorieDeficit = stats.weekly_weight_loss * caloriesPerKg;
      const expectedCalorieDeficit = weeklyCalorieDeficit / 7;
      const targetCalories = maintenanceCalories - expectedCalorieDeficit;
      
      const netCalories = caloriesConsumed - caloriesBurned;
      const realCalorieDeficit = maintenanceCalories - netCalories;
      
      // Calculate theoretical weight from cumulative real deficit
      const daysSinceStart = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const cumulativeDeficit = realCalorieDeficit * (daysSinceStart + 1);
      const theoreticalWeightLoss = cumulativeDeficit / caloriesPerKg;
      const theoreticalWeight = Math.max(0, stats.current_weight - theoreticalWeightLoss);

      analyticsData.push({
        date: dateStr,
        currentWeight: currentWeight,
        expectedCalorieDeficit: expectedCalorieDeficit,
        realCalorieDeficit: realCalorieDeficit,
        theoreticalWeightFromRealDeficit: theoreticalWeight,
        caloriesConsumed: caloriesConsumed,
        caloriesBurned: caloriesBurned,
        netCalories: netCalories,
        bmr: bmr,
        maintenanceCalories: maintenanceCalories,
        targetCalories: targetCalories,
        activitiesCount: dayActivities.length
      });
    }

    return NextResponse.json({
      success: true,
      analytics: analyticsData.reverse(), // Most recent first
      userStats: stats,
      summary: {
        totalDays: analyticsData.length,
        avgRealDeficit: analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0) / analyticsData.length,
        totalExpectedDeficit: analyticsData.reduce((sum, day) => sum + day.expectedCalorieDeficit, 0),
        totalRealDeficit: analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0),
        projectedWeightLoss: analyticsData.reduce((sum, day) => sum + day.realCalorieDeficit, 0) / 7700
      }
    });

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
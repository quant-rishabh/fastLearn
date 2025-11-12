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
      .from('weight_logs')
      .select('date, weight')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    // Get user profile (single source of truth)
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profile')
      .select('*')
      .single();

    if (userProfileError) {
      console.error('Error fetching user profile for analytics:', userProfileError);
    } else {
      console.log('✅ Analytics API loaded user profile:', {
        weekly_weight_loss: userProfile?.weekly_weight_loss,
        current_weight: userProfile?.current_weight,
        target_weight: userProfile?.target_weight
      });
    }

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

    // Default user stats for calculations from user_profile (single source of truth)
    const stats = {
      current_weight: userProfile?.current_weight || 86,
      target_weight: userProfile?.target_weight || 68,
      height: userProfile?.height || 174,
      age: userProfile?.age || 25,
      weekly_weight_loss: userProfile?.weekly_weight_loss || 0.5,
      bmr: userProfile?.bmr || 2000,
      maintenance_calories: userProfile?.maintenance_calories || 2400,
      target_daily_calories: userProfile?.daily_calorie_target || 1900
    };

    // Calculate BMR function
    const calculateBMR = (weight: number) => {
      return 10 * weight + 6.25 * stats.height - 5 * stats.age + 5;
    };

    // Initialize weight tracking with the oldest recorded weight or profile current weight
    let lastKnownWeight = stats.current_weight;
    
    // Find the earliest weight entry to use as starting point
    const allWeightDates = Object.keys(weightByDate).sort();
    if (allWeightDates.length > 0) {
      const earliestWeight = weightByDate[allWeightDates[0]];
      if (earliestWeight) {
        lastKnownWeight = earliestWeight;
      }
    }

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

      // Get weight for this specific date
      let currentWeight = lastKnownWeight; // Default to last known weight
      
      // If there's a recorded weight for this specific date, use it
      if (weightByDate[dateStr]) {
        currentWeight = weightByDate[dateStr];
        lastKnownWeight = currentWeight; // Update last known weight for future dates
      }
      // If no weight recorded for this date, use lastKnownWeight (carry forward)
      
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

      // Calculate calorie balance (targetCalories - netCalories)
      // Positive = good deficit, negative = eating too much
      const calorieBalance = targetCalories - netCalories;

      analyticsData.push({
        date: dateStr,
        currentWeight: currentWeight,
        maintenanceCalories: maintenanceCalories,
        targetDailyDeficit: expectedCalorieDeficit,
        targetCalories: targetCalories,
        caloriesConsumed: caloriesConsumed,
        caloriesBurned: caloriesBurned,
        netCalories: netCalories,
        calorieBalance: calorieBalance,
        bmr: bmr,
        activitiesCount: dayActivities.length
      });
    }

    return NextResponse.json({
      success: true,
      analytics: analyticsData.reverse(), // Most recent first
      userStats: stats,
      summary: {
        totalDays: analyticsData.length,
        avgBalance: analyticsData.reduce((sum, day) => sum + day.calorieBalance, 0) / analyticsData.length,
        totalTargetDeficit: analyticsData.reduce((sum, day) => sum + day.targetDailyDeficit, 0),
        totalBalance: analyticsData.reduce((sum, day) => sum + day.calorieBalance, 0),
        totalFoodConsumed: analyticsData.reduce((sum, day) => sum + day.caloriesConsumed, 0),
        totalExerciseBurned: analyticsData.reduce((sum, day) => sum + day.caloriesBurned, 0)
      }
    });

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
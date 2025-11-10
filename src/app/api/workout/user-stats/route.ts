import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Save or update user stats
export async function POST(request: NextRequest) {
  try {
    const { 
      userId,
      currentWeight,
      targetWeight,
      height,
      age,
      weeklyWeightLoss,
      bmr,
      maintenanceCalories,
      targetDailyCalories,
      date = new Date().toISOString().split('T')[0]
    } = await request.json();

    // Insert user stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        current_weight: currentWeight,
        target_weight: targetWeight,
        weekly_weight_loss: weeklyWeightLoss,
        bmr: bmr,
        maintenance_calories: maintenanceCalories,
        target_daily_calories: targetDailyCalories,
        date: date
      })
      .select()
      .single();

    if (statsError) {
      console.error('Error saving user stats:', statsError);
      return NextResponse.json({ error: 'Failed to save user stats' }, { status: 500 });
    }

    // Also update user basic info
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        height: height,
        age: age,
        updated_at: new Date().toISOString()
      });

    if (userError) {
      console.error('Error updating user info:', userError);
    }

    return NextResponse.json({ userStats, success: true });

  } catch (error) {
    console.error('Error in save user stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get latest user stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get latest user stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
    }

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user info:', userError);
    }

    return NextResponse.json({
      userStats: userStats || null,
      user: user || null,
      success: true
    });

  } catch (error) {
    console.error('Error in get user stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
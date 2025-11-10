import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// Update user profile (single-user optimized schema)
export async function POST(request: NextRequest) {
  try {
    const { 
      current_weight,
      target_weight,
      height,
      age,
      gender,
      weekly_weight_loss,
      bmr,               // Backend calculated
      maintenance_calories,  // Backend calculated
      daily_calorie_target,  // Backend calculated  
      daily_protein_target   // Backend calculated
    } = await request.json();

    // Update the single user profile with backend-calculated values
    const { data: userProfile, error: updateError } = await supabase
      .from('user_profile')
      .update({
        current_weight,
        target_weight,
        height,
        age,
        gender,
        weekly_weight_loss,
        bmr,
        maintenance_calories,
        daily_calorie_target,
        daily_protein_target
      })
      .eq('id', (await supabase.from('user_profile').select('id').single()).data?.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Also log weight if provided
    if (current_weight) {
      const today = new Date().toISOString().split('T')[0];
      const { error: weightError } = await supabase
        .from('weight_logs')
        .upsert({
          date: today,
          weight: current_weight
        });

      if (weightError) {
        console.error('Error logging weight:', weightError);
        // Don't fail the whole request for weight log error
      }
    }

    return NextResponse.json({ userProfile, success: true });

  } catch (error) {
    console.error('Error in update user profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user profile (single-user optimized)  
export async function GET(request: NextRequest) {
  try {
    // Get the single user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get recent weight log
    const { data: recentWeight, error: weightError } = await supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Don't fail if no weight logs exist yet
    if (weightError && weightError.code !== 'PGRST116') {
      console.error('Error fetching weight logs:', weightError);
    }

    return NextResponse.json({
      userProfile,
      recentWeight: recentWeight || null,
      success: true
    });

  } catch (error) {
    console.error('Error in get user profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Send chat message and get AI response
export async function POST(request: NextRequest) {
  try {
    const { 
      userId,
      message,
      messageType = 'general' // 'general', 'workout', 'nutrition', 'progress'
    } = await request.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and user ID required' }, { status: 400 });
    }

    // Get user profile and today's data from new optimized schema
    const { data: userProfile, error: userError } = await supabase
      .from('user_profile')
      .select('*')
      .single();

    // Get today's complete data using optimized function
    const { data: todayData, error: todayError } = await supabase
      .rpc('get_today_complete_data');

    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Create context for AI using new optimized schema
    let context = `You are a fitness and nutrition coach assistant. Help the user with their workout and weight loss journey.`;
    
    if (userProfile) {
      context += `\n\nUser Profile:
- Current Weight: ${userProfile.current_weight}kg
- Target Weight: ${userProfile.target_weight}kg
- Weekly Goal: ${userProfile.weekly_weight_loss}kg/week
- BMR: ${userProfile.bmr} calories
- Daily Target: ${userProfile.daily_calorie_target} calories`;
    }

    if (todayData) {
      const today = todayData.today_totals;
      if (today) {
        context += `\n\nToday's Progress:
- Calories Consumed: ${today.calories_consumed}
- Exercise Calories: ${today.calories_burned_exercise}
- Remaining Balance: ${today.remaining_balance}
- Protein Eaten: ${today.total_protein}g`;
      }
    }

    if (recentActivities && recentActivities.length > 0) {
      context += `\n\nRecent Activities (last week):`;
      recentActivities.forEach((activity: any) => {
        context += `\n- ${activity.type}: ${activity.description} (${activity.calories} cal)`;
      });
    }

    context += `\n\nPlease provide helpful, encouraging, and accurate fitness/nutrition advice. Keep responses concise but informative.

IMPORTANT: When the user asks about "calories left" or "remaining calories", tell them they have ${todayData?.today_totals?.remaining_balance || 0} calories left to eat today.

Answer questions about calories, workouts, nutrition, and progress tracking.`;

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: context
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now.";
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Save chat message to database (single-user schema)
    const { data: chatMessage, error: chatError } = await supabase
      .from('chat_messages')
      .insert({
        message: message,
        response: aiResponse,
        message_type: messageType,
        ai_model: 'gpt-3.5-turbo',
        tokens_used: tokensUsed
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error saving chat message:', chatError);
      // Still return the response even if we can't save it
    }

    return NextResponse.json({
      message: aiResponse,
      chatId: chatMessage?.id,
      tokensUsed,
      success: true
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

// Get chat history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data: chatHistory, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }

    return NextResponse.json({
      chatHistory: chatHistory?.reverse() || [], // Reverse to show oldest first
      success: true
    });

  } catch (error) {
    console.error('Error in chat history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
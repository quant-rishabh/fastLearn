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

    // Get user context for personalized responses
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentTracking } = await supabase
      .from('daily_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(7);

    // Create context for AI
    let context = `You are a fitness and nutrition coach assistant. Help the user with their workout and weight loss journey.`;
    
    if (userStats) {
      context += `\n\nUser Stats:
- Current Weight: ${userStats.current_weight}kg
- Target Weight: ${userStats.target_weight}kg
- Weekly Goal: ${userStats.weekly_weight_loss}kg/week
- BMR: ${userStats.bmr} calories
- Daily Target: ${userStats.target_daily_calories} calories`;
    }

    if (recentActivities && recentActivities.length > 0) {
      context += `\n\nRecent Activities (last 7 days):`;
      recentActivities.forEach(activity => {
        context += `\n- ${activity.type}: ${activity.name} (${activity.calories} cal) on ${new Date(activity.created_at).toLocaleDateString()}`;
      });
    }

    if (recentTracking && recentTracking.length > 0) {
      context += `\n\nRecent Progress (last 7 days):`;
      recentTracking.forEach(day => {
        context += `\n- ${day.date}: Calories in: ${day.total_calories_in}, Out: ${day.total_calories_out}, Deficit: ${day.deficit_created}`;
      });
    }

    context += `\n\nPlease provide helpful, encouraging, and accurate fitness/nutrition advice based on this information. Keep responses concise but informative.`;

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

    // Save chat message to database
    const { data: chatMessage, error: chatError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
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
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: chatHistory, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
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
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

// GET — returns today's calorie summary (for iPhone Shortcut to show before asking food input)
export async function GET() {
  try {
    const { data: todayData, error } = await supabase.rpc('get_today_complete_data');

    if (error || !todayData) {
      return NextResponse.json({ error: 'Could not fetch today\'s data' }, { status: 500 });
    }

    const totals = todayData.today_totals;
    const consumed = totals?.calories_consumed ?? 0;
    const remaining = totals?.remaining_balance ?? 0;
    const target = totals?.daily_target ?? 0;
    const burned = totals?.calories_burned_exercise ?? 0;

    return NextResponse.json({
      success: true,
      consumed,
      remaining,
      target,
      burned,
      message: `📊 Today: ${consumed} cal eaten · ${burned} cal burned · ${remaining} cal remaining`,
    });
  } catch (error) {
    console.error('Error in quick-log GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Quick-log endpoint — designed for iPhone Shortcuts
// POST { "food": "2 rotis and dal" }
// Returns a plain-text friendly response
export async function POST(request: NextRequest) {
  try {
    const { food } = await request.json();

    if (!food || typeof food !== 'string' || food.trim().length === 0) {
      return NextResponse.json({ error: 'food field is required' }, { status: 400 });
    }

    const foodText = food.trim();

    // Step 1: Analyze calories via OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const prompt = `You are a nutrition database. Analyze this food and return ONLY valid JSON.

Food: "${foodText}"

Use USDA/standard values. For Indian foods use accurate regional values.
If quantity is not mentioned, assume a standard single serving.
Never hallucinate — use conservative realistic values.

Return ONLY this JSON (no markdown, no explanation):
{"calories": 200, "protein": 5.0, "category": "meal", "description": "2 rotis with dal (200 cal, 5g protein)"}

category must be one of: meal, snack, drink, fruit, dessert`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content?.trim() || '';

    // Strip markdown code blocks if present
    const jsonText = rawContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let analyzed: { calories: number; protein: number; category: string; description: string };
    try {
      analyzed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response, try again' }, { status: 500 });
    }

    const calories = Math.round(Math.abs(analyzed.calories));
    const protein = Math.abs(analyzed.protein || 0);
    const category = analyzed.category || 'meal';
    const description = analyzed.description || foodText;

    // Step 2: Save to activities table
    const today = new Date().toISOString().split('T')[0];
    const { error: saveError } = await supabase
      .from('activities')
      .insert({
        date: today,
        type: 'food',
        description,
        category,
        calories,
        protein_grams: protein,
      });

    if (saveError) {
      console.error('Error saving activity:', saveError);
      return NextResponse.json({ error: 'AI analyzed food but failed to save' }, { status: 500 });
    }

    // Step 3: Get updated daily totals
    const { data: todayData } = await supabase.rpc('get_today_complete_data');
    const remaining = todayData?.today_totals?.remaining_balance ?? null;

    return NextResponse.json({
      success: true,
      logged: description,
      calories,
      protein: `${protein}g`,
      remaining_calories: remaining,
      message: remaining !== null
        ? `✅ Logged! ${calories} cal · ${protein}g protein · ${remaining} cal remaining today`
        : `✅ Logged! ${calories} cal · ${protein}g protein`,
    });

  } catch (error) {
    console.error('Error in quick-log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

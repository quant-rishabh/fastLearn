import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { food } = await request.json();

    if (!food) {
      return NextResponse.json({ error: 'Food description is required' }, { status: 400 });
    }

    console.log('🍽️ Processing food analysis for:', food);
    console.log('🔑 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
    
    // Log first few characters of API key for debugging (safely)
    if (process.env.OPENAI_API_KEY) {
      console.log('🔑 API Key starts with:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
    }

    // Optimized AI Prompt - let AI handle everything
    const prompt = `You are a nutrition expert. Analyze this food and return ONLY valid JSON.

Food: "${food}"

Calculate accurate calories and protein for Indian and international foods.
For quantities like "1 chai", "150ml juice", use realistic portions.

Return only this JSON format:
{"calories": 65, "protein": 2.5, "enhancedDescription": "1 chai (65 cal, 2.5g protein)", "breakdown": [{"item": "chai", "qty": 1, "unit": "cup", "calories": 65, "protein": 2.5}]}

Be accurate - chai is ~65 cal, not 100. Pomegranate juice 150ml is ~85 cal. Uttapam is ~150 cal.`;

    // Only use AI - no fallbacks
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ No OpenAI API key configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    console.log('🤖 Calling OpenAI API...');
    const result = await getAIFoodAnalysis(prompt);
    console.log('✅ AI analysis successful:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in ai-get-calories:', error);
    return NextResponse.json({ 
      error: 'AI analysis failed. Please try again or check your food description.' 
    }, { status: 500 });
  }
}



// OpenAI API call - AI handles everything
async function getAIFoodAnalysis(prompt: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No AI response content');
    }
    
    console.log('AI response:', content);
    
    try {
      // Extract JSON from markdown code blocks if present
      let jsonString = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonString = match[1];
        }
      } else if (content.includes('```')) {
        const match = content.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonString = match[1];
        }
      }
      
      const parsed = JSON.parse(jsonString);
      
      // Validate required fields
      if (typeof parsed.calories !== 'number' || typeof parsed.protein !== 'number') {
        throw new Error('Invalid response format: missing calories or protein');
      }
      
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error(`Invalid JSON response from AI: ${parseError}`);
    }
  } catch (error) {
    console.error('getAIFoodAnalysis error:', error);
    throw error;
  }
}
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { food } = await request.json();

    if (!food) {
      return NextResponse.json({ error: 'Food description is required' }, { status: 400 });
    }

    console.log('Processing food analysis for:', food);
    console.log('OpenAI API Key available:', !!process.env.OPENAI_API_KEY);

    // Optimized AI Prompt - let AI handle everything
    const prompt = `Nutritionist. Calculate calories and protein for this food.

Food: "${food}"

Rules:
1. Parse all items with quantities (3 roti, 70g sabzi, 200ml milk)
2. Use standard nutrition values for Indian & international foods
3. Sum total calories and protein
4. Create breakdown for each item

JSON only:
{"calories": <total>, "protein": <total>, "enhancedDescription": "<summary>", "breakdown": [{"item": "<name>", "qty": <number>, "unit": "<g|ml|piece>", "calories": <number>, "protein": <number>}]}`;

    // Try AI first, fallback if needed
    let result;
    
    if (process.env.OPENAI_API_KEY) {
      try {
        result = await getAIFoodAnalysis(prompt);
        console.log('AI analysis successful');
      } catch (error) {
        console.error('AI analysis failed:', error);
        result = createFallbackResponse(food);
      }
    } else {
      console.log('No OpenAI API key, using fallback');
      result = createFallbackResponse(food);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in ai-get-calories:', error);
    return NextResponse.json(createFallbackResponse('unknown food'), { status: 200 });
  }
}

// Create a simple fallback response
function createFallbackResponse(food: string) {
  // Basic estimation based on food description
  let calories = 100;
  let protein = 3;
  
  const foodLower = food.toLowerCase();
  
  // Simple heuristics for common foods
  if (foodLower.includes('rice') || foodLower.includes('chawal')) calories = 130;
  else if (foodLower.includes('roti') || foodLower.includes('chapati')) calories = 80;
  else if (foodLower.includes('dal')) calories = 180;
  else if (foodLower.includes('chicken')) { calories = 165; protein = 25; }
  else if (foodLower.includes('egg')) { calories = 70; protein = 6; }
  else if (foodLower.includes('milk')) { calories = 70; protein = 3; }
  else if (foodLower.includes('banana')) calories = 90;
  
  // Look for numbers to estimate quantity
  const numbers = food.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const qty = parseInt(numbers[0]);
    if (qty > 1 && qty < 10) {
      calories *= qty;
      protein *= qty;
    }
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    enhancedDescription: `${food} (≈${Math.round(calories)} cal, ${Math.round(protein * 10) / 10}g protein - estimated)`,
    breakdown: [
      {
        item: food,
        qty: 1,
        unit: 'serving',
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10
      }
    ]
  };
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
      const parsed = JSON.parse(content);
      
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
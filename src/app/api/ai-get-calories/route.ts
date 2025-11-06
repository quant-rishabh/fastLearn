import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let requestData: { food: string; quantity: number } = { food: 'Unknown food', quantity: 1 };
  
  try {
    requestData = await request.json();
    const { food, quantity } = requestData;

    if (!food) {
      return NextResponse.json({ error: 'Food name is required' }, { status: 400 });
    }

    // Prepare the prompt for AI
    const prompt = `You are an Indian nutrition expert familiar with both Indian and international foods. Calculate the approximate calories for the following food description written in natural language.

Food Description: "${food}"

The user has written this in plain English. Parse the quantity and food type from their description. Include Indian foods and international foods. Examples:
- "2 eggs" = 2 eggs = ~140 calories total
- "1 roti" = 1 roti = ~80 calories  
- "1 slice pizza" = 1 pizza slice = ~285 calories
- "medium apple" = 1 medium apple = ~95 calories
- "cup of rice" = 1 cup rice = ~205 calories
- "large banana" = 1 large banana = ~105 calories
- "chicken breast 100g" = 100g chicken breast = ~165 calories
- "1 dosa" = 1 dosa = ~133 calories
- "1 paratha" = 1 paratha = ~126 calories
- "bowl dal" = 1 bowl dal = ~180 calories

Please respond with ONLY a JSON object in this exact format:
{
  "calories": <total calories for the description>,
  "food": "<cleaned up food name>",
  "description": "<what you understood from the input>",
  "parsed_quantity": "<quantity you detected>",
  "parsed_food": "<food type you detected>"
}

Be accurate with common Indian and international foods. Calculate the TOTAL calories for whatever quantity was mentioned in the description.`;

    // Make API call to OpenAI or your preferred AI service
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    // Parse the AI response
    let calorieData;
    try {
      calorieData = JSON.parse(aiContent);
    } catch (parseError) {
      // Fallback: extract number from text if JSON parsing fails
      const calorieMatch = aiContent.match(/(\d+)/);
      const estimatedCalories = calorieMatch ? parseInt(calorieMatch[1]) * (quantity || 1) : (quantity || 1) * 100;
      
      calorieData = {
        calories: estimatedCalories,
        food: food,
        quantity: quantity || 1,
        per_unit: estimatedCalories / (quantity || 1),
        description: `Estimated calories for ${food}`
      };
    }

    return NextResponse.json(calorieData);

  } catch (error) {
    console.error('Error getting calories from AI:', error);
    
    // Use the stored request data for fallback
    const fallbackCalories = (requestData.quantity || 1) * 100; // 100 calories per serving as fallback
    
    return NextResponse.json({
      calories: fallbackCalories,
      food: requestData.food || 'Unknown food',
      quantity: requestData.quantity || 1,
      per_unit: 100,
      description: 'Fallback estimate (AI unavailable)',
      error: 'AI service temporarily unavailable'
    });
  }
}
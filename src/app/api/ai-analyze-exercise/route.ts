import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { exercise, userWeight, userProfile } = await request.json();

    if (!exercise || !userWeight) {
      return NextResponse.json(
        { error: 'Exercise description and user weight are required' },
        { status: 400 }
      );
    }

    console.log('Processing exercise analysis for:', exercise);
    console.log('User weight:', userWeight, 'kg');
    console.log('OpenAI API Key available:', !!process.env.OPENAI_API_KEY);

    // Optimized AI Prompt for complex workouts
    const prompt = `Calculate total calories burned. User: ${userWeight}kg, ${userProfile?.height || 175}cm, ${userProfile?.age || 25}y.

Workout: "${exercise}"

Use MET values. For strength training with sets/reps/weight, estimate 5-8 METs and duration. For cardio, use distance/pace. Sum all exercises.

Return JSON:
{"calories": <total_number>, "category": "<cardio|strength|mixed>", "enhancedDescription": "<brief_summary>", "breakdown": "<exercise_details>"}`;

    // Try AI first, fallback if needed
    let result;
    
    if (process.env.OPENAI_API_KEY) {
      try {
        result = await getAIAnalysis(prompt);
        console.log('AI analysis successful');
      } catch (error) {
        console.error('AI analysis failed:', error);
        result = createExerciseFallback(exercise, userWeight);
      }
    } else {
      console.log('No OpenAI API key, using fallback');
      result = createExerciseFallback(exercise, userWeight);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in ai-analyze-exercise:', error);
    return NextResponse.json(createExerciseFallback('unknown exercise', 70), { status: 200 });
  }
}

// Create a simple fallback response for exercises
function createExerciseFallback(exercise: string, userWeight: number) {
  const exerciseLower = exercise.toLowerCase();
  let calories = 50;
  let category = 'general';
  let timeEstimate = 30; // default 30 minutes
  
  // Extract numbers for duration/distance
  const numbers = exercise.match(/\d+/g)?.map(Number) || [];
  
  // Basic heuristics for common exercises
  if (exerciseLower.includes('run') || exerciseLower.includes('jog')) {
    category = 'cardio';
    if (exerciseLower.includes('km')) {
      const distance = numbers.find(n => n <= 20) || 5; // assume 5km if unclear
      calories = Math.round(userWeight * distance * 1.0); // rough estimate: 1 cal per kg per km
    } else {
      const minutes = numbers.find(n => n <= 120) || 30;
      timeEstimate = minutes;
      calories = Math.round(userWeight * minutes * 0.12); // rough running calorie rate
    }
  }
  else if (exerciseLower.includes('walk')) {
    category = 'cardio';
    const minutes = numbers.find(n => n <= 120) || 30;
    timeEstimate = minutes;
    calories = Math.round(userWeight * minutes * 0.05); // walking rate
  }
  else if (exerciseLower.includes('cycle') || exerciseLower.includes('bike')) {
    category = 'cardio';
    const minutes = numbers.find(n => n <= 120) || 30;
    timeEstimate = minutes;
    calories = Math.round(userWeight * minutes * 0.08); // cycling rate
  }
  else if (exerciseLower.includes('pushup') || exerciseLower.includes('push up')) {
    category = 'push';
    const reps = numbers.find(n => n > 0) || 20;
    calories = Math.round(reps * userWeight * 0.004); // rough pushup estimate
  }
  else if (exerciseLower.includes('pullup') || exerciseLower.includes('pull up')) {
    category = 'pull';
    const reps = numbers.find(n => n > 0) || 10;
    calories = Math.round(reps * userWeight * 0.006); // rough pullup estimate
  }
  else if (exerciseLower.includes('squat')) {
    category = 'legs';
    const reps = numbers.find(n => n > 0) || 20;
    calories = Math.round(reps * userWeight * 0.005); // rough squat estimate
  }
  else if (exerciseLower.includes('gym') || exerciseLower.includes('workout')) {
    category = 'mixed';
    const minutes = numbers.find(n => n > 20 && n <= 120) || 60;
    timeEstimate = minutes;
    calories = Math.round(userWeight * minutes * 0.08); // general workout rate
  }
  else if (exerciseLower.includes('hiit')) {
    category = 'mixed';
    const minutes = numbers.find(n => n <= 60) || 20;
    timeEstimate = minutes;
    calories = Math.round(userWeight * minutes * 0.15); // high intensity rate
  }
  else {
    // Generic exercise
    const minutes = numbers.find(n => n > 5 && n <= 120) || 30;
    timeEstimate = minutes;
    calories = Math.round(userWeight * minutes * 0.06); // moderate activity
  }

  // Ensure minimum calories
  calories = Math.max(calories, 10);

  return {
    calories: calories,
    category: category,
    enhancedDescription: `${exercise} (+${calories} cal - estimated)`,
    breakdown: undefined
  };
}

// OpenAI API call - AI handles everything
async function getAIAnalysis(prompt: string) {
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
        max_tokens: 500,
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
      if (typeof parsed.calories !== 'number' || typeof parsed.category !== 'string') {
        throw new Error('Invalid response format: missing calories or category');
      }
      
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error(`Invalid JSON response from AI: ${parseError}`);
    }
  } catch (error) {
    console.error('getAIAnalysis error:', error);
    throw error;
  }
}
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

    // AI Prompt for exercise analysis
    const prompt = `
You are a fitness expert AI. Analyze the following exercise description and provide accurate calorie burn estimation.

User Profile:
- Weight: ${userWeight} kg
- Height: ${userProfile?.height || 175} cm  
- Age: ${userProfile?.age || 25} years
- Gender: ${userProfile?.gender || 'male'}

Exercise Description: "${exercise}"

Based on this information, provide a JSON response with:
1. calories: Total calories burned (positive integer)
2. category: Exercise category (cardio, push, pull, legs, core, or general)
3. enhancedDescription: A clear, detailed description of what was done

Guidelines:
- Use scientific METs (Metabolic Equivalent Tasks) when possible
- Consider user's weight for accurate calorie calculation  
- For strength training: estimate based on intensity, sets, reps if mentioned
- For cardio: use time, distance, intensity if provided
- Categories: cardio (running, cycling), push (chest, shoulders, triceps), pull (back, biceps), legs (quads, glutes, calves), core (abs, back), general (mixed/unclear)

Example responses:
- "bench press 3 sets heavy" → ~250-300 calories, category: "push"
- "ran 5km moderate pace" → ~350-400 calories, category: "cardio"  
- "100 pushups" → ~180-220 calories, category: "push"
- "deadlifts 5 sets" → ~300-350 calories, category: "pull"

Respond only with valid JSON:
{
  "calories": number,
  "category": "string", 
  "enhancedDescription": "string"
}
`;

    // For now, I'll create a simple rule-based system since we don't have OpenAI API setup
    // In production, you would call OpenAI API here
    const result = analyzeExerciseLocally(exercise, userWeight);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in ai-analyze-exercise:', error);
    return NextResponse.json(
      { error: 'Failed to analyze exercise' },
      { status: 500 }
    );
  }
}

// Local exercise analysis (replace with OpenAI API in production)
function analyzeExerciseLocally(exercise: string, userWeight: number) {
  const exerciseLower = exercise.toLowerCase();
  
  // Extract numbers from the description
  const numbers = exercise.match(/\d+/g)?.map(Number) || [];
  
  let calories = 0;
  let category = 'general';
  let enhancedDescription = exercise;

  // Cardio exercises
  if (exerciseLower.includes('run') || exerciseLower.includes('jog')) {
    category = 'cardio';
    if (exerciseLower.includes('km') || exerciseLower.includes('kilometer')) {
      const distance = numbers.find(n => n <= 50) || 5; // assume 5km if unclear
      calories = Math.round(userWeight * distance * 1.0); // 1 cal per kg per km
      enhancedDescription = `Running ${distance}km (+${calories} cal)`;
    } else {
      const minutes = numbers.find(n => n <= 120) || 30; // assume 30 min if unclear
      calories = Math.round(userWeight * minutes * 0.12); // 0.12 cal per kg per minute
      enhancedDescription = `Running ${minutes} minutes (+${calories} cal)`;
    }
  }
  
  // Strength training - Push exercises
  else if (exerciseLower.includes('bench press') || exerciseLower.includes('push up') || 
           exerciseLower.includes('pushup') || exerciseLower.includes('shoulder press')) {
    category = 'push';
    
    if (exerciseLower.includes('bench press')) {
      const sets = numbers.find(n => n <= 10) || 3;
      const reps = numbers.find(n => n > 5 && n <= 20) || 12;
      const weight = numbers.find(n => n > 20) || userWeight * 0.7; // assume 70% bodyweight if no weight given
      calories = Math.round(sets * reps * weight * 0.004);
      enhancedDescription = `Bench press ${sets} sets x ${reps} reps (+${calories} cal)`;
    } else if (exerciseLower.includes('pushup') || exerciseLower.includes('push up')) {
      const totalReps = numbers.find(n => n > 0) || 20;
      calories = Math.round(totalReps * userWeight * 0.0025);
      enhancedDescription = `${totalReps} pushups (+${calories} cal)`;
    } else {
      calories = Math.round(userWeight * 2.5); // general push exercise
      enhancedDescription = `Push workout (+${calories} cal)`;
    }
  }
  
  // Pull exercises
  else if (exerciseLower.includes('deadlift') || exerciseLower.includes('pull up') || 
           exerciseLower.includes('pullup') || exerciseLower.includes('row')) {
    category = 'pull';
    
    if (exerciseLower.includes('deadlift')) {
      const sets = numbers.find(n => n <= 10) || 3;
      const reps = numbers.find(n => n > 3 && n <= 15) || 8;
      const weight = numbers.find(n => n > 20) || userWeight * 1.2; // assume 120% bodyweight
      calories = Math.round(sets * reps * weight * 0.005);
      enhancedDescription = `Deadlifts ${sets} sets x ${reps} reps (+${calories} cal)`;
    } else if (exerciseLower.includes('pull up') || exerciseLower.includes('pullup')) {
      const totalReps = numbers.find(n => n > 0) || 10;
      calories = Math.round(totalReps * userWeight * 0.004);
      enhancedDescription = `${totalReps} pull-ups (+${calories} cal)`;
    } else {
      calories = Math.round(userWeight * 3.0); // general pull exercise
      enhancedDescription = `Pull workout (+${calories} cal)`;
    }
  }
  
  // Leg exercises
  else if (exerciseLower.includes('squat') || exerciseLower.includes('lunge') || 
           exerciseLower.includes('leg')) {
    category = 'legs';
    
    if (exerciseLower.includes('squat')) {
      const totalReps = numbers.find(n => n > 0) || 20;
      if (numbers.find(n => n > 20)) { // weighted squats
        const weight = numbers.find(n => n > 20) || userWeight * 0.5;
        const sets = numbers.find(n => n <= 10) || 3;
        const reps = numbers.find(n => n > 3 && n <= 20) || 12;
        calories = Math.round(sets * reps * weight * 0.0045);
        enhancedDescription = `Weighted squats ${sets}x${reps} (+${calories} cal)`;
      } else { // bodyweight squats
        calories = Math.round(totalReps * userWeight * 0.003);
        enhancedDescription = `${totalReps} bodyweight squats (+${calories} cal)`;
      }
    } else {
      calories = Math.round(userWeight * 2.8); // general leg exercise
      enhancedDescription = `Leg workout (+${calories} cal)`;
    }
  }
  
  // Walking
  else if (exerciseLower.includes('walk')) {
    category = 'cardio';
    if (exerciseLower.includes('steps')) {
      const steps = numbers.find(n => n > 100) || 5000;
      calories = Math.round(steps * userWeight * 0.0004);
      enhancedDescription = `Walking ${steps} steps (+${calories} cal)`;
    } else {
      const minutes = numbers.find(n => n <= 120) || 30;
      calories = Math.round(userWeight * minutes * 0.05); // 0.05 cal per kg per minute walking
      enhancedDescription = `Walking ${minutes} minutes (+${calories} cal)`;
    }
  }
  
  // Generic workout if no specific exercise detected
  else {
    const intensity = exerciseLower.includes('intense') || exerciseLower.includes('heavy') ? 1.5 : 1.0;
    const duration = numbers.find(n => n <= 120) || 30; // assume 30 min workout
    calories = Math.round(userWeight * duration * 0.08 * intensity); // general workout formula
    enhancedDescription = `Workout session (+${calories} cal)`;
  }

  return {
    calories: Math.max(calories, 10), // minimum 10 calories
    category,
    enhancedDescription
  };
}
// Test script to verify exercise AI analysis is working
const testExercise = async () => {
  const testInput = "run 1 km in 10 min";
  
  console.log(`Testing exercise input: "${testInput}"`);
  
  try {
    const response = await fetch('http://localhost:3000/api/ai-analyze-exercise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        exercise: testInput,
        userWeight: 70, // Example weight in kg
        userProfile: {
          weight: 70,
          height: 175,
          age: 30,
          gender: 'male'
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Exercise analysis successful:', data);
      console.log(`Calories: ${data.calories}`);
      console.log(`Category: ${data.category}`);
      console.log(`Enhanced Description: ${data.enhancedDescription}`);
      if (data.breakdown) {
        console.log(`Breakdown: ${data.breakdown}`);
      }
    } else {
      console.log('❌ Exercise analysis failed:', data);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testExercise();
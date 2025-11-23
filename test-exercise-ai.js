// Test script for the enhanced exercise AI analysis

const testExercises = [
  {
    input: "ran 3km in 20 minutes",
    userWeight: 70,
    expected: "Should calculate based on 6.67 min/km pace (moderate-fast) using MET 11.8"
  },
  {
    input: "gym workout for 60 minutes",
    userWeight: 75,
    expected: "Should use mixed workout MET value for 1 hour"
  },
  {
    input: "100 pushups",
    userWeight: 80,
    expected: "Should calculate based on 3.8 MET for bodyweight exercises"
  },
  {
    input: "deadlifts 5 sets of 8 reps heavy",
    userWeight: 85,
    expected: "Should use 6.5 MET for heavy compound movements"
  },
  {
    input: "HIIT workout 30 minutes",
    userWeight: 70,
    expected: "Should use 12.0 MET for high-intensity interval training"
  }
];

async function testExerciseAPI() {
  console.log("🏋️‍♂️ Testing Enhanced Exercise AI Analysis\n");

  for (const test of testExercises) {
    console.log(`\n📝 Input: "${test.input}"`);
    console.log(`👤 User Weight: ${test.userWeight}kg`);
    console.log(`🎯 Expected: ${test.expected}`);

    try {
      const response = await fetch('http://localhost:3000/api/ai-analyze-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: test.input,
          userWeight: test.userWeight,
          userProfile: { height: 175, age: 25, gender: 'male' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Result: ${result.calories} calories`);
        console.log(`📂 Category: ${result.category}`);
        console.log(`📋 Description: ${result.enhancedDescription}`);
        if (result.breakdown) {
          console.log(`📊 Breakdown: ${result.breakdown}`);
        }
      } else {
        console.log(`❌ API Error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
  }
}

// Only run if called directly
if (require.main === module) {
  testExerciseAPI().catch(console.error);
}

module.exports = { testExerciseAPI };
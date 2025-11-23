// Test script for enhanced food AI analysis

const testFoods = [
  {
    input: "3 roti with karela sabzi 70g, raita 100g, 1 banana",
    expected: "Should parse multiple Indian foods with quantities and provide breakdown"
  },
  {
    input: "dal chawal, 3 idli, milk 200ml",
    expected: "Should handle mixed Indian meal with rice, lentils, and dairy"
  },
  {
    input: "2 eggs, 1 slice bread, medium banana",
    expected: "Should calculate international breakfast items"
  },
  {
    input: "paneer 100g, chicken breast 150g",
    expected: "Should handle protein sources with weights"
  },
  {
    input: "samosa and rasgulla",
    expected: "Should recognize Indian snacks and sweets"
  },
  {
    input: "pizza slice and coke",
    expected: "Should handle international fast food"
  }
];

async function testFoodAPI() {
  console.log("🍽️ Testing Enhanced Food AI Analysis\n");

  for (const test of testFoods) {
    console.log(`\n📝 Input: "${test.input}"`);
    console.log(`🎯 Expected: ${test.expected}`);

    try {
      const response = await fetch('http://localhost:3000/api/ai-get-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food: test.input
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Result: ${result.calories} calories, ${result.protein}g protein`);
        console.log(`📋 Description: ${result.enhancedDescription}`);
        
        if (result.breakdown && result.breakdown.length > 0) {
          console.log(`📊 Breakdown:`);
          result.breakdown.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.item}: ${item.qty}${item.unit} = ${item.calories}cal, ${item.protein}g protein`);
          });
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
  testFoodAPI().catch(console.error);
}

module.exports = { testFoodAPI };
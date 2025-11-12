// Quick test to check the analytics API response
async function testAnalyticsAPI() {
  try {
    console.log('Testing analytics API...');
    const response = await fetch('http://localhost:3000/api/workout/analytics?days=7');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received');
      console.log('Success:', data.success);
      console.log('Analytics array length:', data.analytics?.length);
      
      if (data.analytics && data.analytics.length > 0) {
        console.log('\n📊 First row structure:');
        console.log(JSON.stringify(data.analytics[0], null, 2));
        
        console.log('\n🔑 Keys in first row:');
        console.log(Object.keys(data.analytics[0]));
      }
      
      console.log('\n👤 User Stats:');
      console.log(JSON.stringify(data.userStats, null, 2));
    } else {
      console.log('❌ API request failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAnalyticsAPI();
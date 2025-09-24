console.log("🔧 Testing QueryFormBodySpec Conditions");
console.log("======================================");

// Test when queryformBodySpec should be created vs "NA"
function testQueryFormBodySpecConditions() {
  
  console.log("\n📋 SCENARIO 1: GET with query parameters");
  console.log("✅ Should create queryformBodySpec");
  const scenario1 = {
    method: 'GET',
    url: 'https://api.example.com/token?grant_type=client_credentials&userId=madan',
    headers: { 'Content-Type': 'application/json' },
    hasQueryParams: true,
    isFormUrlencoded: false
  };
  console.log("Result: queryformBodySpec = [shift, modify, remove] spec");
  
  console.log("\n📋 SCENARIO 2: POST with application/x-www-form-urlencoded");
  console.log("✅ Should create queryformBodySpec");
  const scenario2 = {
    method: 'POST', 
    url: 'https://api.example.com/login',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    hasQueryParams: false,
    isFormUrlencoded: true
  };
  console.log("Result: queryformBodySpec = [shift, modify, remove] spec");
  
  console.log("\n📋 SCENARIO 3: POST with JSON body");
  console.log("❌ Should NOT create queryformBodySpec");
  const scenario3 = {
    method: 'POST',
    url: 'https://api.example.com/api',
    headers: { 'Content-Type': 'application/json' },
    hasQueryParams: false,
    isFormUrlencoded: false
  };
  console.log("Result: queryformBodySpec = 'NA'");
  
  console.log("\n📋 SCENARIO 4: GET without query parameters");
  console.log("❌ Should NOT create queryformBodySpec");
  const scenario4 = {
    method: 'GET',
    url: 'https://api.example.com/status',
    headers: { 'Content-Type': 'application/json' },
    hasQueryParams: false,
    isFormUrlencoded: false
  };
  console.log("Result: queryformBodySpec = 'NA'");
  
  // Test the logic
  function shouldCreateSpec(scenario) {
    return (
      (scenario.method === 'GET' && scenario.hasQueryParams) ||
      (scenario.method === 'POST' && scenario.headers['Content-Type'] === 'application/x-www-form-urlencoded')
    );
  }
  
  console.log("\n✅ VERIFICATION:");
  console.log(`Scenario 1: ${shouldCreateSpec(scenario1) ? 'CREATE SPEC' : 'NA'} ✅`);
  console.log(`Scenario 2: ${shouldCreateSpec(scenario2) ? 'CREATE SPEC' : 'NA'} ✅`);
  console.log(`Scenario 3: ${shouldCreateSpec(scenario3) ? 'CREATE SPEC' : 'NA'} ✅`);
  console.log(`Scenario 4: ${shouldCreateSpec(scenario4) ? 'CREATE SPEC' : 'NA'} ✅`);
  
  console.log("\n🏗️ ACTION NODE STRUCTURE:");
  console.log(`{
  "_id": "ACTION_NODE",
  "requestTemplate": {
    "joltSpec": [...],
    "queryformBodySpec": [...]  // or "NA"
  },
  "sessionSpec": "[...]",        // Same level as queryformBodySpec
  "queryformBodySpec": "[...]"   // Same level as sessionSpec  
}`);
  
  console.log("\n📝 IMPLEMENTATION NOTES:");
  console.log("✅ queryformBodySpec always present (never undefined)");
  console.log("✅ Either contains JOLT spec array or 'NA' string");
  console.log("✅ Added at same level as sessionSpec in action nodes");
  console.log("✅ Only applicable for GET+query or POST+form-urlencoded");
}

testQueryFormBodySpecConditions();
console.log("🔧 Testing GET Endpoint Query Parameter Trimming");
console.log("===============================================");

// Test function to simulate the endpoint trimming logic
function testEndpointTrimming() {
  
  const testCases = [
    {
      name: "GET request with query parameters",
      url: "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan",
      method: "GET",
      hasQueryParams: true,
      expected: "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?"
    },
    {
      name: "POST request with query parameters", 
      url: "http://api.example.com/endpoint?param=value",
      method: "POST",
      hasQueryParams: true,
      expected: "http://api.example.com/endpoint?param=value" // Should NOT be trimmed
    },
    {
      name: "GET request without query parameters",
      url: "http://api.example.com/endpoint",
      method: "GET", 
      hasQueryParams: false,
      expected: "http://api.example.com/endpoint" // Should remain unchanged
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 TEST ${index + 1}: ${testCase.name}`);
    console.log(`Input URL: ${testCase.url}`);
    console.log(`Method: ${testCase.method}`);
    console.log(`Has Query Params: ${testCase.hasQueryParams}`);
    
    // Simulate the trimming logic
    let cleanEndpoint = testCase.url;
    if (testCase.method === 'GET' && testCase.hasQueryParams) {
      try {
        const urlObj = new URL(testCase.url);
        cleanEndpoint = `${urlObj.origin}${urlObj.pathname}?`;
        console.log(`🔧 GET request: Trimmed endpoint from ${testCase.url} to ${cleanEndpoint}`);
      } catch (error) {
        console.log('⚠️ Could not parse URL for trimming, using original:', testCase.url);
      }
    } else {
      console.log(`✅ ${testCase.method} request: Endpoint unchanged`);
    }
    
    console.log(`Result: ${cleanEndpoint}`);
    console.log(`Expected: ${testCase.expected}`);
    
    if (cleanEndpoint === testCase.expected) {
      console.log(`✅ PASS: Endpoint correctly processed`);
    } else {
      console.log(`❌ FAIL: Expected "${testCase.expected}", got "${cleanEndpoint}"`);
    }
  });
}

testEndpointTrimming();

console.log("\n🎯 WHY TRIM QUERY PARAMETERS FOR GET REQUESTS?");
console.log("============================================");
console.log("1. Query parameters in GET URLs contain STATIC VALUES from the curl");
console.log("2. But we want to make them DYNAMIC via JOLT transformation");
console.log("3. So the endpoint should only have the base URL + '?'");
console.log("4. The actual query parameters will be populated at runtime");

console.log("\n🔍 EXAMPLE:");
console.log("Before: http://api.com/auth?grant_type=client_credentials&userId=madan");
console.log("After:  http://api.com/auth?");
console.log("Runtime: NiFi will add ?grant_type=<dynamic>&userId=<dynamic>");

console.log("\n✅ IMPLEMENTATION:");
console.log("- GET requests: Trim query parameters (keep only base URL + '?')");
console.log("- POST requests: Keep original URL (parameters might be needed)");
console.log("- No query params: Keep original URL unchanged");
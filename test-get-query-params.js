console.log("🔍 Testing GET Requests with Query Parameters");
console.log("============================================");

// Test different GET request scenarios
function testGetRequestScenarios() {
  
  const testCases = [
    {
      name: "GET with query parameters",
      curl: `curl --location --request GET 'http://api.example.com/users?status=active&limit=10' \\
--header 'Authorization: Bearer token'`,
      templateData: {
        target: {
          method: "GET",
          url: "http://api.example.com/users?status=active&limit=10",
          headers: {
            "Authorization": "Bearer token"
          }
        }
      },
      requestMapping: [
        {
          category: 'query',
          path: 'status',
          value: 'active'
        },
        {
          category: 'query', 
          path: 'limit',
          value: '10'
        }
      ]
    },
    {
      name: "GET with dynamic query parameters (from user input)",
      curl: `curl --location --request GET 'http://api.example.com/balance?msisdn={{MSISDN}}&accountType={{ACCOUNT_TYPE}}' \\
--header 'Authorization: Bearer token'`,
      templateData: {
        target: {
          method: "GET",
          url: "http://api.example.com/balance",
          headers: {
            "Authorization": "Bearer token"
          }
        }
      },
      requestMapping: [
        {
          category: 'query',
          path: 'msisdn',
          mappingType: 'dynamic',
          storeAttribute: 'MSISDN'
        },
        {
          category: 'query',
          path: 'accountType', 
          mappingType: 'dynamic',
          storeAttribute: 'ACCOUNT_TYPE'
        }
      ]
    },
    {
      name: "GET without query parameters",
      curl: `curl --location --request GET 'http://api.example.com/status' \\
--header 'Authorization: Bearer token'`,
      templateData: {
        target: {
          method: "GET",
          url: "http://api.example.com/status",
          headers: {
            "Authorization": "Bearer token"
          }
        }
      },
      requestMapping: []
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n📋 TEST ${index + 1}: ${testCase.name}`);
    console.log("Curl command:", testCase.curl);
    
    // Apply the queryformBodySpec logic
    const method = testCase.templateData?.target?.method || 'GET';
    const headers = testCase.templateData?.target?.headers || {};
    const requestMapping = testCase.requestMapping;
    
    console.log("\n🔍 ANALYSIS:");
    console.log("Method:", method);
    console.log("Headers:", Object.keys(headers));
    console.log("Query parameters:", requestMapping.filter(f => f.category === 'query').map(f => `${f.path}=${f.value || 'variable'}`));
    
    // Check for form-urlencoded with case-insensitive header matching
    const contentType = Object.keys(headers).find(key => 
      key.toLowerCase() === 'content-type'
    );
    const isFormUrlencoded = contentType && headers[contentType] && 
      headers[contentType].includes('application/x-www-form-urlencoded');
    
    const hasQuery = requestMapping.some(f => f.category === 'query');
    
    console.log("Has query fields:", hasQuery);
    console.log("Is form-urlencoded:", isFormUrlencoded);
    
    const needsQueryFormBodySpec = (
      (method === 'GET' && hasQuery) ||
      (method === 'POST' && isFormUrlencoded)
    );
    
    console.log("🎯 RESULT:");
    console.log("Should create queryformBodySpec:", needsQueryFormBodySpec);
    console.log("Status:", needsQueryFormBodySpec ? "✅ CREATE SPEC" : "❌ NA");
    
    if (needsQueryFormBodySpec && method === 'GET') {
      console.log("\n📄 QueryformBodySpec would contain:");
      const queryFields = requestMapping.filter(f => f.category === 'query');
      queryFields.forEach(field => {
        console.log(`  ├─ ${field.path}: ${field.value || field.storeAttribute || 'variable'}`);
      });
      
      console.log("\n🔧 JOLT pattern for query string concatenation:");
      const queryParts = [];
      queryFields.forEach((field, index) => {
        if (index > 0) queryParts.push("'&'");
        queryParts.push(`'${field.path}='`);
        queryParts.push(`@(1,${field.path})`);
      });
      console.log(`  formBody: =concat(${queryParts.join(',')})`);
      console.log(`  Example result: "${queryFields.map(f => `${f.path}=${f.value || f.storeAttribute}`).join('&')}"`);
    }
  });
}

testGetRequestScenarios();

console.log("\n💡 KEY INSIGHTS FOR GET REQUESTS:");
console.log("✅ GET requests with query parameters DO get queryformBodySpec");
console.log("✅ Same JOLT pattern as POST form-urlencoded (query string concatenation)");
console.log("✅ Useful for GET requests that need dynamic query parameters from user input");
console.log("✅ Helps build query strings like: ?msisdn=1234567890&accountType=savings");
console.log("❌ GET requests without query parameters get 'NA' (as expected)");
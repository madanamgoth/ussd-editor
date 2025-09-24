console.log("🔧 Testing Improved Header Checking");
console.log("==================================");

// Test different header case scenarios
function testHeaderChecking() {
  
  const testCases = [
    {
      name: "POST with correct Content-Type",
      templateData: {
        target: {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      },
      requestMapping: [
        { category: 'body', isUrlencoded: true, path: 'username' }
      ],
      expected: true
    },
    {
      name: "POST with lowercase content-type",
      templateData: {
        target: {
          method: "POST", 
          headers: {
            "content-type": "application/x-www-form-urlencoded"
          }
        }
      },
      requestMapping: [
        { category: 'body', isUrlencoded: true, path: 'username' }
      ],
      expected: true
    },
    {
      name: "POST with JSON content-type",
      templateData: {
        target: {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        }
      },
      requestMapping: [
        { category: 'body', path: 'username' }
      ],
      expected: false
    },
    {
      name: "GET with query parameters",
      templateData: {
        target: {
          method: "GET",
          headers: {
            "Authorization": "Bearer token"
          }
        }
      },
      requestMapping: [
        { category: 'query', path: 'grant_type' }
      ],
      expected: true
    },
    {
      name: "GET without query parameters",
      templateData: {
        target: {
          method: "GET",
          headers: {}
        }
      },
      requestMapping: [
        { category: 'body', path: 'username' }
      ],
      expected: false
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 TEST ${index + 1}: ${testCase.name}`);
    
    const method = testCase.templateData?.target?.method || 'GET';
    const headers = testCase.templateData?.target?.headers || {};
    const requestMapping = testCase.requestMapping;
    
    console.log("Method:", method);
    console.log("Headers:", headers);
    console.log("Request mapping categories:", requestMapping.map(f => f.category));
    
    // Apply the improved header checking logic
    const contentType = Object.keys(headers).find(key => 
      key.toLowerCase() === 'content-type'
    );
    const isFormUrlencoded = contentType && headers[contentType] === 'application/x-www-form-urlencoded';
    
    console.log("Content-Type key found:", contentType);
    console.log("Is form-urlencoded:", isFormUrlencoded);
    console.log("Has query fields:", requestMapping.some(f => f.category === 'query'));
    
    const needsQueryFormBodySpec = (
      (method === 'GET' && requestMapping.some(f => f.category === 'query')) ||
      (method === 'POST' && isFormUrlencoded)
    );
    
    console.log("Result:", needsQueryFormBodySpec ? "CREATE SPEC" : "NA");
    console.log("Expected:", testCase.expected ? "CREATE SPEC" : "NA");
    console.log(needsQueryFormBodySpec === testCase.expected ? "✅ PASS" : "❌ FAIL");
  });
}

testHeaderChecking();

console.log("\n🔧 IMPROVEMENTS MADE:");
console.log("✅ Case-insensitive header key matching");
console.log("✅ Debug logging to see actual header values");
console.log("✅ Explicit form-urlencoded content type checking");
console.log("✅ Clear separation of GET vs POST conditions");
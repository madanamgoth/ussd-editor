console.log("🚀 End-to-End QueryformBodySpec Test");
console.log("=====================================");

// Simulate the exact conditions where user reported "NA"
function testE2EScenario() {
  
  console.log("\n📋 Testing POST with form-urlencoded (user's reported case)");
  
  // Simulate templateData similar to what would be created from curl
  const templateData = {
    target: {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Bearer token"
      },
      url: "https://api.example.com/auth"
    }
  };
  
  // Simulate requestMapping from --data-urlencode parameters
  const requestMapping = [
    { 
      category: 'body', 
      path: 'username', 
      isUrlencoded: true,
      value: 'testuser' 
    },
    { 
      category: 'body', 
      path: 'password', 
      isUrlencoded: true,
      value: 'secret123' 
    },
    { 
      category: 'body', 
      path: 'grant_type', 
      isUrlencoded: true,
      value: 'password' 
    }
  ];
  
  console.log("Template data:", JSON.stringify(templateData, null, 2));
  console.log("Request mapping:", requestMapping.map(f => `${f.path} (${f.category}, urlencoded: ${f.isUrlencoded})`));
  
  // Apply the EXACT logic from TemplateCreator.jsx
  const method = templateData?.target?.method || 'GET';
  const headers = templateData?.target?.headers || {};
  
  console.log("\n🔍 DEBUGGING STEP BY STEP:");
  console.log('Method =', method);
  console.log('Headers =', headers);
  console.log('Content-Type header direct =', headers['Content-Type']);
  
  // Check for form-urlencoded with case-insensitive header matching
  const contentType = Object.keys(headers).find(key => 
    key.toLowerCase() === 'content-type'
  );
  const isFormUrlencoded = contentType && headers[contentType] === 'application/x-www-form-urlencoded';
  
  console.log('ContentType key found =', contentType);
  console.log('IsFormUrlencoded =', isFormUrlencoded);
  console.log('Has query fields =', requestMapping.some(f => f.category === 'query'));
  console.log('Has urlencoded body fields =', requestMapping.some(f => f.category === 'body' && f.isUrlencoded));
  
  const needsQueryFormBodySpec = (
    (method === 'GET' && requestMapping.some(f => f.category === 'query')) ||
    (method === 'POST' && isFormUrlencoded)
  );
  
  console.log('\n⚡ FINAL RESULT:');
  console.log('NeedsQueryFormBodySpec =', needsQueryFormBodySpec);
  console.log('QueryformBodySpec would be:', needsQueryFormBodySpec ? 'CREATED' : 'NA');
  
  if (needsQueryFormBodySpec) {
    // Show what the spec would look like
    const formFields = requestMapping.filter(f => 
      f.category === 'query' || (f.category === 'body' && f.isUrlencoded)
    );
    
    console.log('\n📄 QueryformBodySpec would contain:');
    formFields.forEach(field => {
      console.log(`  - ${field.path}: ${field.value || 'variable'}`);
    });
  }
  
  return needsQueryFormBodySpec;
}

const result = testE2EScenario();

console.log("\n🎯 EXPECTED: true (should create queryformBodySpec)");
console.log("🎯 ACTUAL:", result);
console.log(result === true ? "✅ SUCCESS" : "❌ FAILED");

// Test edge cases that might cause issues
console.log("\n🔧 Testing Edge Cases:");

// Case with different header casing
console.log("\n1. Testing lowercase content-type header:");
const lowercaseHeaders = { "content-type": "application/x-www-form-urlencoded" };
const contentTypeKey = Object.keys(lowercaseHeaders).find(key => 
  key.toLowerCase() === 'content-type'
);
console.log("Found key:", contentTypeKey, "-> Value:", lowercaseHeaders[contentTypeKey]);
console.log("Match check:", lowercaseHeaders[contentTypeKey] === 'application/x-www-form-urlencoded');

// Case with extra whitespace or charset
console.log("\n2. Testing content-type with charset:");
const charsetHeaders = { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" };
const hasFormType = Object.values(charsetHeaders).some(value => 
  value && value.includes('application/x-www-form-urlencoded')
);
console.log("Headers:", charsetHeaders);
console.log("Contains form-urlencoded:", hasFormType);
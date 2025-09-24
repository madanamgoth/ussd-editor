console.log("🔧 Testing Content-Type with Charset");
console.log("====================================");

// Test the enhanced header checking with charset parameters
function testCharsetHandling() {
  
  const testCases = [
    {
      name: "Content-Type with charset",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      expected: true
    },
    {
      name: "Content-Type with boundary (multipart)",
      headers: {
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary"
      },
      expected: false
    },
    {
      name: "Content-Type exact match",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      expected: true
    },
    {
      name: "JSON content type",
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      expected: false
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 TEST ${index + 1}: ${testCase.name}`);
    console.log("Headers:", testCase.headers);
    
    // Apply the enhanced logic
    const contentType = Object.keys(testCase.headers).find(key => 
      key.toLowerCase() === 'content-type'
    );
    const isFormUrlencoded = contentType && testCase.headers[contentType] && 
      testCase.headers[contentType].includes('application/x-www-form-urlencoded');
    
    console.log("Content-Type key:", contentType);
    console.log("Content-Type value:", contentType ? testCase.headers[contentType] : 'N/A');
    console.log("Includes form-urlencoded:", isFormUrlencoded);
    console.log("Expected:", testCase.expected);
    console.log(isFormUrlencoded === testCase.expected ? "✅ PASS" : "❌ FAIL");
  });
}

testCharsetHandling();

console.log("\n🎯 Key Improvement:");
console.log("✅ Using .includes() instead of === for Content-Type matching");
console.log("✅ Handles charset parameters and other Content-Type modifiers");
console.log("✅ More robust detection of form-urlencoded requests");
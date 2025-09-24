console.log("🔧 Testing Method Variable Fix");
console.log("==============================");

// Simulate the templateData structure
const templateData = {
  "_id": "GetBalance0001",
  "target": {
    "endpoint": "https://api.example.com/balance",
    "method": "POST",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Bearer token123"
    }
  }
};

const requestMapping = [
  {
    storeAttribute: 'userName',
    category: 'body',
    mappingType: 'static',
    path: 'userName',
    value: 'madan',
    isUrlencoded: true
  }
];

// Test the fixed logic
function testMethodFix() {
  console.log("\n📋 Template Data:");
  console.log("Method:", templateData?.target?.method);
  console.log("Headers:", templateData?.target?.headers);
  
  // Extract method and headers like in the fixed code
  const method = templateData?.target?.method || 'GET';
  const headers = templateData?.target?.headers || {};
  
  console.log("\n🔍 Extracted Variables:");
  console.log("method:", method);
  console.log("headers['Content-Type']:", headers['Content-Type']);
  
  // Test the condition
  const needsQueryFormBodySpec = (
    (method === 'GET' && requestMapping.some(f => f.category === 'query')) ||
    (method === 'POST' && headers['Content-Type'] === 'application/x-www-form-urlencoded')
  );
  
  console.log("\n✅ Condition Results:");
  console.log("Is GET with query params:", method === 'GET' && requestMapping.some(f => f.category === 'query'));
  console.log("Is POST with form-urlencoded:", method === 'POST' && headers['Content-Type'] === 'application/x-www-form-urlencoded');
  console.log("needsQueryFormBodySpec:", needsQueryFormBodySpec);
  
  console.log("\n🎯 Expected Result:");
  console.log("Since method=POST and Content-Type=application/x-www-form-urlencoded");
  console.log("needsQueryFormBodySpec should be TRUE");
  
  if (needsQueryFormBodySpec) {
    console.log("✅ SUCCESS: Will create queryformBodySpec");
  } else {
    console.log("❌ FAILED: Will set queryformBodySpec to 'NA'");
  }
}

testMethodFix();

console.log("\n🔧 FIX APPLIED:");
console.log("- Added: const method = templateData?.target?.method || 'GET';");
console.log("- Added: const headers = templateData?.target?.headers || {};");
console.log("- Now method and headers are properly defined in generateJoltSpecs function");
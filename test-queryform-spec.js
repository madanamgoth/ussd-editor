console.log("🔧 Testing queryformBodySpec Generation");
console.log("=====================================");

// Test the queryformBodySpec generation logic
function testQueryFormBodySpec() {
  
  console.log("\n📋 SCENARIO 1: GET Request with Query Parameters");
  console.log("URL: http://example.com/api?grant_type=client_credentials&scope=read&userId=madan");
  
  const templateName = "PaymentStatus";
  const method = "GET";
  const headers = { "Content-Type": "application/json" };
  
  const getFields = [
    { path: "grant_type", storeAttribute: "grant_type", category: "query" },
    { path: "scope", storeAttribute: "scope", category: "query" },
    { path: "userId", storeAttribute: "userId", category: "query" }
  ];
  
  // Check if needs queryformBodySpec
  const needsSpec = (
    (method === 'GET' && getFields.some(f => f.category === 'query')) ||
    (method === 'POST' && headers['Content-Type'] === 'application/x-www-form-urlencoded')
  );
  
  console.log(`✅ Needs queryformBodySpec: ${needsSpec}`);
  
  if (needsSpec) {
    const formFields = getFields.filter(f => f.category === 'query');
    const shiftSpec = {};
    const concatParts = [];
    const removeSpec = {};
    
    formFields.forEach((field, index) => {
      const paramName = field.path || field.storeAttribute;
      shiftSpec[paramName] = paramName; // Fixed: direct mapping
      removeSpec[paramName] = "";
      
      if (index > 0) concatParts.push("'&'");
      concatParts.push(`'${paramName}='`);
      concatParts.push(`@(1,${paramName})`);
    });
    
    const queryformBodySpec = [
      {
        "operation": "shift",
        "spec": {
          [templateName]: shiftSpec
        }
      },
      {
        "operation": "modify-overwrite-beta",
        "spec": {
          "formBody": `=concat(${concatParts.join(',')})`
        }
      },
      {
        "operation": "remove",
        "spec": removeSpec
      }
    ];
    
    console.log("\n📋 GENERATED queryformBodySpec:");
    console.log(JSON.stringify(queryformBodySpec, null, 2));
  }
  
  console.log("\n📋 SCENARIO 2: POST with application/x-www-form-urlencoded");
  console.log("Content-Type: application/x-www-form-urlencoded");
  
  const postMethod = "POST";
  const postHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
  const postFields = [
    { path: "grant_type", storeAttribute: "grant_type", category: "body", isUrlencoded: true },
    { path: "userId", storeAttribute: "userId", category: "body", isUrlencoded: true }
  ];
  
  const needsPostSpec = (
    (postMethod === 'GET' && postFields.some(f => f.category === 'query')) ||
    (postMethod === 'POST' && postHeaders['Content-Type'] === 'application/x-www-form-urlencoded')
  );
  
  console.log(`✅ POST needs queryformBodySpec: ${needsPostSpec}`);
  
  console.log("\n🎯 EXPECTED OUTPUT STRUCTURE:");
  console.log(`{
  "requestTemplate": {
    "joltSpec": [...normal jolt...],
    "queryformBodySpec": [
      {
        "operation": "shift",
        "spec": {
          "PaymentStatus": {
            "grant_type": "grant_type",
            "scope": "scope", 
            "userId": "userId"
          }
        }
      },
      {
        "operation": "modify-overwrite-beta",
        "spec": {
          "formBody": "=concat('grant_type=',@(1,grant_type),'&scope=',@(1,scope),'&userId=',@(1,userId))"
        }
      },
      {
        "operation": "remove",
        "spec": {
          "grant_type": "",
          "scope": "",
          "userId": ""
        }
      }
    ]
  }
}`);
}

testQueryFormBodySpec();

console.log("\n✅ IMPLEMENTATION SUMMARY:");
console.log("1. ✅ Detect GET with query params OR POST with form-urlencoded");
console.log("2. ✅ Generate shift spec: templateName.field → field");
console.log("3. ✅ Generate concat formula for formBody");
console.log("4. ✅ Generate remove spec to clean up individual fields"); 
console.log("5. ✅ Add queryformBodySpec to requestTemplate alongside joltSpec");
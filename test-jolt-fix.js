console.log("🔧 Testing JOLT Fix for PASSWORD → userId mapping");
console.log("====================================================");

// Simulate the corrected JOLT generation logic
function generateCorrectJolt(fields, templateName = "Template") {
  const shiftSpec = {};
  const defaultSpec = {};
  
  fields.forEach(field => {
    console.log(`🔍 Processing field:`, field);
    
    if (field.mappingType === 'dynamic' && field.storeAttribute) {
      if (field.category === 'query') {
        // Source: field.storeAttribute (user selection like "PASSWORD")
        // Target: Template.field.path (original param name like "userId")
        const wrappedTarget = `${templateName}.${field.path || field.storeAttribute}`;
        shiftSpec[field.storeAttribute] = wrappedTarget;
        console.log(`✅ Query param (dynamic): ${field.storeAttribute} → ${wrappedTarget} (original param: ${field.path})`);
      }
    } else if (field.mappingType === 'static' && field.category !== 'header') {
      if (field.category === 'query') {
        // For static fields, set the value directly using original param name
        const wrappedTarget = `${templateName}.${field.path || field.storeAttribute}`;
        if (!defaultSpec[templateName]) defaultSpec[templateName] = {};
        defaultSpec[templateName][field.path || field.storeAttribute] = field.staticValue || field.value;
        console.log(`✅ Query param (static): ${wrappedTarget} = ${field.staticValue || field.value} (original param: ${field.path})`);
      }
    }
  });
  
  const result = [];
  if (Object.keys(shiftSpec).length > 0) {
    result.push({
      operation: "shift",
      spec: shiftSpec
    });
  }
  if (Object.keys(defaultSpec).length > 0) {
    result.push({
      operation: "default",
      spec: defaultSpec
    });
  }
  
  return result;
}

// Test case: GET request with mixed static and dynamic parameters
console.log("\n🧪 TEST CASE: GET ?grant_type=client_credentials&userId=madan");
console.log("- grant_type → static (always client_credentials)");
console.log("- userId → dynamic (user selects PASSWORD variable)");

const testFields = [
  {
    path: "grant_type",           // Original parameter name from URL
    storeAttribute: "grant_type", // Same as path for static fields
    category: "query",
    mappingType: "static",
    value: "client_credentials",
    staticValue: "client_credentials"
  },
  {
    path: "userId",               // Original parameter name from URL
    storeAttribute: "PASSWORD",   // User's selection from dropdown
    category: "query", 
    mappingType: "dynamic",
    value: "madan"
  }
];

console.log("\n📋 Input fields:");
testFields.forEach((field, i) => {
  console.log(`${i + 1}. ${field.path} (${field.mappingType}) → storeAttribute: ${field.storeAttribute}`);
});

const generatedJolt = generateCorrectJolt(testFields);

console.log("\n📋 GENERATED JOLT:");
console.log(JSON.stringify(generatedJolt, null, 2));

console.log("\n🎯 EXPECTED OUTPUT:");
console.log(`{
  "joltSpec": [
    {
      "operation": "shift",
      "spec": {
        "PASSWORD": "Template.userId"
      }
    },
    {
      "operation": "default",
      "spec": {
        "Template": {
          "grant_type": "client_credentials"
        }
      }
    }
  ]
}`);

console.log("\n✅ VERIFICATION:");
const shiftOp = generatedJolt.find(op => op.operation === "shift");
const defaultOp = generatedJolt.find(op => op.operation === "default");

if (shiftOp && shiftOp.spec.PASSWORD === "Template.userId") {
  console.log("✅ Shift operation correct: PASSWORD → Template.userId");
} else {
  console.log("❌ Shift operation incorrect:", shiftOp?.spec);
}

if (defaultOp && defaultOp.spec.Template?.grant_type === "client_credentials") {
  console.log("✅ Default operation correct: Template.grant_type = client_credentials");
} else {
  console.log("❌ Default operation incorrect:", defaultOp?.spec);
}
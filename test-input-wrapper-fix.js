console.log("🔧 Testing Input Wrapper Fix for Dynamic Fields");
console.log("==============================================");

// Test the corrected JOLT generation with input wrapper
function testInputWrapperFix() {
  
  console.log("\n📋 SCENARIO: GET Request with Dynamic Field");
  console.log("URL: http://localhost:1080/VALIDATESUB?grant_type=client_credentials&userType=SUB");
  console.log("- grant_type → DYNAMIC (user selects PASSWORD session variable)");
  console.log("- userType → STATIC (always 'SUB')");
  
  const testFields = [
    {
      path: "grant_type",           // Original parameter from URL
      storeAttribute: "PASSWORD",   // User selected PASSWORD from session variables
      category: "query",
      mappingType: "dynamic",
      value: "client_credentials"
    },
    {
      path: "userType",
      storeAttribute: "userType", 
      category: "query",
      mappingType: "static",
      value: "SUB",
      staticValue: "SUB"
    }
  ];
  
  // Simulate the corrected JOLT generation
  const templateName = "VALIDATESUB";
  const shiftSpec = {};
  const defaultSpec = {};
  
  testFields.forEach(field => {
    console.log(`\n🔍 Processing field:`, {
      path: field.path,
      storeAttribute: field.storeAttribute,
      mappingType: field.mappingType,
      category: field.category
    });
    
    if (field.mappingType === 'dynamic' && field.storeAttribute) {
      // ALL dynamic fields should use input wrapper
      if (!shiftSpec.input) shiftSpec.input = {};
      
      if (field.category === 'query') {
        const wrappedTarget = `${templateName}.${field.path || field.storeAttribute}`;
        shiftSpec.input[field.storeAttribute] = wrappedTarget;
        console.log(`✅ Query param (dynamic with input): input.${field.storeAttribute} → ${wrappedTarget}`);
      }
    } else if (field.mappingType === 'static' && field.category !== 'header') {
      if (field.category === 'query') {
        if (!defaultSpec[templateName]) defaultSpec[templateName] = {};
        defaultSpec[templateName][field.path || field.storeAttribute] = field.staticValue || field.value;
        console.log(`✅ Query param (static): ${templateName}.${field.path} = ${field.staticValue || field.value}`);
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
  
  console.log("\n📋 GENERATED JOLT:");
  console.log(JSON.stringify(result, null, 2));
  
  console.log("\n🎯 EXPECTED RESULT:");
  console.log(`{
  "requestTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {
          "input": {
            "PASSWORD": "VALIDATESUB.grant_type"
          }
        }
      },
      {
        "operation": "default",
        "spec": {
          "VALIDATESUB": {
            "userType": "SUB"
          }
        }
      }
    ]
  }
}`);
  
  console.log("\n✅ VERIFICATION:");
  const shiftOp = result.find(op => op.operation === "shift");
  const defaultOp = result.find(op => op.operation === "default");
  
  if (shiftOp?.spec?.input?.PASSWORD === "VALIDATESUB.grant_type") {
    console.log("✅ Shift correct: input.PASSWORD → VALIDATESUB.grant_type");
  } else {
    console.log("❌ Shift incorrect:", shiftOp?.spec);
  }
  
  if (defaultOp?.spec?.VALIDATESUB?.userType === "SUB") {
    console.log("✅ Default correct: VALIDATESUB.userType = SUB");  
  } else {
    console.log("❌ Default incorrect:", defaultOp?.spec);
  }
}

testInputWrapperFix();

console.log("\n🎉 KEY INSIGHT:");
console.log("Dynamic fields represent SESSION VARIABLES that will be provided at runtime");
console.log("Therefore, they should ALWAYS be wrapped in 'input' in shift operations");
console.log("This allows the JOLT processor to map: input.PASSWORD → VALIDATESUB.grant_type");

console.log("\n🔧 FIXED LOGIC:");
console.log("✅ Dynamic fields → input.sessionVariable → Template.targetField");
console.log("✅ Static fields → Template.field = staticValue (in default operation)");
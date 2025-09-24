console.log("🔧 Testing Fixed JOLT Generation");
console.log("==================================");

// Test the corrected JOLT generation logic
function generateFixedJolt(fields, templateName = "PaymentStatus") {
  const shiftSpec = {};
  const defaultSpec = {};
  
  console.log(`🏷️ Template name: ${templateName}`);
  console.log(`📝 Processing ${fields.length} fields:`);
  
  fields.forEach((field, index) => {
    console.log(`\n🔍 Field ${index + 1}:`, {
      path: field.path,
      storeAttribute: field.storeAttribute,
      category: field.category,
      mappingType: field.mappingType,
      value: field.value,
      staticValue: field.staticValue
    });
    
    if (field.mappingType === 'dynamic' && field.storeAttribute) {
      if (field.category === 'query') {
        // Dynamic query param: source = storeAttribute, target = Template.path
        const wrappedTarget = `${templateName}.${field.path || field.storeAttribute}`;
        shiftSpec[field.storeAttribute] = wrappedTarget;
        console.log(`✅ Query param (dynamic): ${field.storeAttribute} → ${wrappedTarget}`);
      }
    } else if (field.mappingType === 'static' && field.category !== 'header') {
      if (field.category === 'query') {
        // Static query param: set fixed value using original parameter name
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
  
  return result;
}

// Test case with corrected field structure (no .query prefix)
console.log("\n🧪 TEST: GET ?grant_type=client_credentials&userId=madan");
console.log("- grant_type → STATIC (client_credentials)");
console.log("- userId → DYNAMIC (user selects PASSWORD)");

const testFields = [
  {
    path: "grant_type",           // ✅ No "query." prefix
    storeAttribute: "grant_type",
    category: "query",
    mappingType: "static",        // ✅ User selected static
    value: "client_credentials",
    staticValue: "client_credentials"
  },
  {
    path: "userId",               // ✅ No "query." prefix
    storeAttribute: "PASSWORD",   // ✅ User selected PASSWORD from dropdown
    category: "query", 
    mappingType: "dynamic",       // ✅ User selected dynamic
    value: "madan"
  }
];

const generatedJolt = generateFixedJolt(testFields);

console.log("\n📋 GENERATED JOLT:");
console.log(JSON.stringify(generatedJolt, null, 2));

console.log("\n🎯 EXPECTED RESULT:");
console.log(`{
  "requestTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {
          "PASSWORD": "PaymentStatus.userId"
        }
      },
      {
        "operation": "default",
        "spec": {
          "PaymentStatus": {
            "grant_type": "client_credentials"
          }
        }
      }
    ]
  }
}`);

console.log("\n✅ VERIFICATION:");
const shiftOp = generatedJolt.find(op => op.operation === "shift");
const defaultOp = generatedJolt.find(op => op.operation === "default");

if (shiftOp?.spec?.PASSWORD === "PaymentStatus.userId") {
  console.log("✅ Shift correct: PASSWORD → PaymentStatus.userId");
} else {
  console.log("❌ Shift incorrect:", shiftOp?.spec);
}

if (defaultOp?.spec?.PaymentStatus?.grant_type === "client_credentials") {
  console.log("✅ Default correct: PaymentStatus.grant_type = client_credentials");
} else {
  console.log("❌ Default incorrect:", defaultOp?.spec);
}

console.log("\n🎉 FIXES APPLIED:");
console.log("1. ✅ Removed 'query.' prefix from field paths");
console.log("2. ✅ Respect user's static vs dynamic choice (no forced correction)");
console.log("3. ✅ Static fields go to default operation");
console.log("4. ✅ Dynamic fields go to shift operation");
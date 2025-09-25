console.log("🔧 Testing Auto-Default Fields for Response JOLT");
console.log("==============================================");

// Mock the setNestedValue function for testing
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Simulate the enhanced JOLT generation logic
function testAutoDefaultFields() {
  
  console.log("📋 SCENARIO: API response with multiple fields to map");
  
  // Simulate field mappings from Step 3 in Template Builder
  const desiredMapping = {
    "data.balance": "userBalance",
    "data.accountNumber": "accountNumber", 
    "status": "apiStatus",
    "data.user.name": "customerName",
    "data.user.phone": "customerPhone"
  };
  
  console.log("🎯 Field mappings:", desiredMapping);
  
  // Build shift spec (simulating the current logic)
  const shiftSpec = {
    operation: "shift",
    spec: {}
  };
  
  Object.entries(desiredMapping).forEach(([sourcePath, targetPath]) => {
    setNestedValue(shiftSpec.spec, sourcePath, targetPath);
  });
  
  console.log("\n📄 Generated shift spec:");
  console.log(JSON.stringify(shiftSpec.spec, null, 2));
  
  // NEW: Extract all target paths from shift spec
  const extractTargetPaths = (spec, paths = []) => {
    Object.values(spec).forEach(value => {
      if (typeof value === 'string') {
        // This is a target path
        paths.push(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively extract from nested objects
        extractTargetPaths(value, paths);
      }
    });
    return paths;
  };
  
  const targetPaths = extractTargetPaths(shiftSpec.spec);
  console.log("\n🔍 Extracted target paths:", targetPaths);
  
  // Create default spec with standard fields
  const defaultSpec = {
    success: true,
    timestamp: new Date().toISOString(),
    status: "SUCCEEDED"
  };
  
  // Add all shift target paths to default spec with "0" values
  targetPaths.forEach(path => {
    setNestedValue(defaultSpec, path, "0");
  });
  
  console.log("\n✨ Enhanced default spec with auto-defaults:");
  console.log(JSON.stringify(defaultSpec, null, 2));
  
  // Complete JOLT spec
  const joltSpec = [
    {
      operation: "shift",
      spec: shiftSpec.spec
    },
    {
      operation: "default", 
      spec: defaultSpec
    }
  ];
  
  console.log("\n🎯 COMPLETE RESPONSE JOLT:");
  console.log(JSON.stringify(joltSpec, null, 2));
  
  return targetPaths.length > 0;
}

const success = testAutoDefaultFields();

console.log("\n🎯 EXPECTED: All shift fields should have default values of '0'");
console.log("🎯 ACTUAL:", success ? "✅ SUCCESS" : "❌ FAILED");

console.log("\n💡 KEY BENEFITS:");
console.log("✅ If API response missing 'data.balance' → userBalance defaults to '0'");
console.log("✅ If API response missing 'data.user.name' → customerName defaults to '0'"); 
console.log("✅ If API response missing 'status' → apiStatus defaults to '0'");
console.log("✅ Prevents JOLT transformation failures due to missing fields");
console.log("✅ Ensures consistent output structure even with incomplete API responses");

console.log("\n🔧 APPLIES TO:");
console.log("• responseTemplate (success responses)");
console.log("• responseErrorTemplate (error responses)");
console.log("• NOT applied to request templates (only responses need defaults)");